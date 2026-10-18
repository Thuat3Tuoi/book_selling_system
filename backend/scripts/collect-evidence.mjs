// Thu thập minh chứng chạy thật cho: (1) tìm kiếm Meilisearch + thời gian phản hồi,
// (2) thao tác giỏ hàng. Ghi kết quả vào docs/evidence/.
//
// Yêu cầu: backend đang chạy, đã seed DB, Meilisearch đã có dữ liệu (npm run search:reindex).
// Chạy:    npm run evidence
// Biến môi trường (tùy chọn):
//   EVIDENCE_BASE_URL   mặc định http://localhost:<PORT hoặc BACKEND_PORT trong .env, nếu không có thì 3001>
//   EVIDENCE_EMAIL      nếu đặt cùng EVIDENCE_PASSWORD thì dùng tài khoản có sẵn;
//                       nếu không, script tự đăng ký một tài khoản thử nghiệm qua POST /auth/register
//   EVIDENCE_PASSWORD   mật khẩu của tài khoản có sẵn
//   EVIDENCE_QUERIES    các từ khóa tìm kiếm, ngăn cách bằng dấu phẩy (mặc định: book,clean,code)
//   EVIDENCE_CATEGORY   thêm một lần tìm có lọc theo category (tùy chọn)
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";

const PORT = process.env.PORT ?? process.env.BACKEND_PORT ?? 3001;
const BASE = (process.env.EVIDENCE_BASE_URL ?? `http://localhost:${PORT}`).replace(/\/$/, "");
const QUERIES = (process.env.EVIDENCE_QUERIES ?? "book,clean,code").split(",").map((s) => s.trim()).filter(Boolean);
const CATEGORY = process.env.EVIDENCE_CATEGORY;
const REPEAT = 3;
const OUT = new URL("../docs/evidence/", import.meta.url);

const unwrap = (body) => (body && typeof body === "object" && "data" in body ? body.data : body);

async function call(method, path, { token, json } = {}) {
    const started = performance.now();
    const res = await fetch(BASE + path, {
        method,
        headers: {
            ...(json ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: json ? JSON.stringify(json) : undefined,
    });
    const roundTripMs = Math.round((performance.now() - started) * 10) / 10;
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    return { status: res.status, roundTripMs, body };
}

const fence = (obj) => "```json\n" + JSON.stringify(obj, null, 2) + "\n```";
const now = new Date().toISOString();
const header = (title) => `# ${title}\n\n- Thời điểm chạy: ${now}\n- Máy chủ: ${BASE}\n- Tài khoản: ${EMAIL}\n\n`;

// ---------- Tài khoản và đăng nhập ----------
// Không dùng Prisma trực tiếp: dự án dùng Prisma 7 với client sinh ra dạng TypeScript,
// nên script .mjs không nạp được. Đăng ký qua API cũng là một minh chứng cho luồng auth.
let EMAIL = process.env.EVIDENCE_EMAIL;
let PASSWORD = process.env.EVIDENCE_PASSWORD;
if (!EMAIL || !PASSWORD) {
    EMAIL = `evidence.tester.${Date.now()}@example.com`;
    PASSWORD = "Password123@";
    const reg = await call("POST", "/auth/register", {
        json: { firstName: "Evidence", lastName: "Tester", email: EMAIL, password: PASSWORD },
    });
    if (reg.status >= 300) {
        console.error("Đăng ký tài khoản thử nghiệm thất bại:", reg.status, JSON.stringify(reg.body));
        process.exit(1);
    }
    console.log(`Đã đăng ký tài khoản thử nghiệm: ${EMAIL}`);
}

const login = await call("POST", "/auth/login", { json: { email: EMAIL, password: PASSWORD } });
const token = unwrap(login.body)?.accessToken;
if (login.status >= 300 || !token) {
    console.error("Đăng nhập thất bại:", login.status, JSON.stringify(login.body));
    process.exit(1);
}

// ---------- 1. Tìm kiếm Meilisearch ----------
const searchCases = QUERIES.map((q) => ({ label: `q="${q}"`, path: `/search/books?q=${encodeURIComponent(q)}&limit=5` }));
if (CATEGORY) {
    searchCases.push({ label: `q="" + category="${CATEGORY}"`, path: `/search/books?category=${encodeURIComponent(CATEGORY)}&limit=5` });
}

let searchMd = header("Minh chứng tìm kiếm Meilisearch");
searchMd += `Mỗi truy vấn chạy ${REPEAT} lần. \`processingTimeMs\` do Meilisearch trả về; \`Round-trip\` là tổng thời gian gọi API (client đo).\n\n`;
searchMd += "| Truy vấn | Lần | HTTP | totalHits | processingTimeMs | Round-trip (ms) |\n|---|---|---|---|---|---|\n";
const samples = [];
for (const c of searchCases) {
    for (let i = 1; i <= REPEAT; i++) {
        const r = await call("GET", c.path);
        const d = unwrap(r.body);
        searchMd += `| ${c.label} | ${i} | ${r.status} | ${d?.totalHits ?? "-"} | ${d?.processingTimeMs ?? "-"} | ${r.roundTripMs} |\n`;
        if (i === 1) samples.push({ request: `GET ${c.path}`, status: r.status, response: r.body });
    }
}
searchMd += "\n## Phản hồi mẫu (lần đầu của mỗi truy vấn)\n\n";
for (const s of samples) searchMd += `### ${s.request}\n\nHTTP ${s.status}\n\n${fence(s.response)}\n\n`;

// ---------- 2. Giỏ hàng ----------
const steps = [];
const step = async (name, method, path, json, tok = token) => {
    const r = await call(method, path, { token: tok, json });
    steps.push({ name, request: `${method} ${path}`, requestBody: json, status: r.status, response: r.body });
    return r;
};

await step("Xem giỏ ban đầu", "GET", "/carts");
const list = await call("GET", "/books?page=1&limit=20", { token });
const books = unwrap(list.body);
const arr = Array.isArray(books) ? books : books?.items ?? books?.data ?? [];
const book = arr.find((b) => b.status === "ACTIVE" && b.stockQuantity >= 3);
if (!book) {
    console.error("Không tìm thấy sách ACTIVE còn ít nhất 3 tồn kho để thử giỏ hàng.");
    process.exit(1);
}

const added = await step(`Thêm sách id=${book.id} (số lượng 1)`, "POST", "/carts/items", { bookId: book.id, quantity: 1 });
let cartItemId = unwrap(added.body)?.id;
if (!cartItemId) {
    const cart = unwrap((await call("GET", "/carts", { token })).body);
    cartItemId = (cart?.items ?? cart?.cartItems ?? []).find((i) => i.bookId === book.id)?.id;
}
await step("Xem giỏ sau khi thêm", "GET", "/carts");
if (cartItemId) {
    await step(`Đổi số lượng mục ${cartItemId} thành 2`, "PATCH", `/carts/items/${cartItemId}`, { quantity: 2 });
    await step("Xem giỏ sau khi đổi số lượng", "GET", "/carts");
}
await step("Thêm sách không tồn tại (mong đợi lỗi)", "POST", "/carts/items", { bookId: 999999, quantity: 1 });
await step("Thêm số lượng vượt tồn kho (mong đợi lỗi)", "POST", "/carts/items", { bookId: book.id, quantity: book.stockQuantity + 1000 });
await step("Gửi số lượng sai kiểu (mong đợi 400)", "POST", "/carts/items", { bookId: book.id, quantity: "abc" });
await step("Sửa mục giỏ không tồn tại hoặc không thuộc user (mong đợi 404)", "PATCH", "/carts/items/999999", { quantity: 1 });
if (cartItemId) {
    await step(`Xóa mục ${cartItemId}`, "DELETE", `/carts/items/${cartItemId}`);
    await step("Xem giỏ sau khi xóa", "GET", "/carts");
}

let cartMd = header("Minh chứng thao tác giỏ hàng");
cartMd += "| # | Thao tác | HTTP |\n|---|---|---|\n";
steps.forEach((s, i) => (cartMd += `| ${i + 1} | ${s.name} | ${s.status} |\n`));
cartMd += "\n## Chi tiết\n\n";
steps.forEach((s, i) => {
    cartMd += `### ${i + 1}. ${s.name}\n\n\`${s.request}\` → HTTP ${s.status}\n\n`;
    if (s.requestBody) cartMd += `Body gửi lên:\n\n${fence(s.requestBody)}\n\n`;
    cartMd += `Phản hồi:\n\n${fence(s.response)}\n\n`;
});

await mkdir(OUT, { recursive: true });
await writeFile(new URL("search-meilisearch.md", OUT), searchMd);
await writeFile(new URL("cart-operations.md", OUT), cartMd);
console.log("Đã ghi backend/docs/evidence/search-meilisearch.md và cart-operations.md");
