# AI Disclosure — Nhật ký làm việc cùng AI

**Người thực hiện:** Viet
**Nhiệm vụ:** Task #4 (DTO & Pipe validation), Task #5 (Meilisearch), Task #6 (Kiểm thử).

## 1. Tóm tắt việc dùng AI

- **Công cụ:** Claude (claude.ai).
- **AI làm gì:** đọc code, review, chỉ ra lỗi, đề xuất phương án thiết kế, viết code sửa lỗi, viết test, giải thích log lỗi.
- **AI không làm gì:** không truy cập CSDL, file `.env` thật hay Google Drive của nhóm; không push code lên Git. Mọi thay đổi được đưa cho em dưới dạng code hoặc file patch để em tự áp dụng, xem lại và commit.
- **Dữ liệu gửi cho AI:** file code, log lỗi và file mẫu `.env.example`. Không gửi `.env` thật.
- **Kiểm chứng:** em tự chạy `npm run test` và `npm run test:e2e` trên máy local (Windows, Vitest v4.1.11); ngoài ra các test mới được chạy thử trên code chưa sửa để chắc chúng bắt được lỗi thật (mục 3.4).
- **Trách nhiệm:** em đã đọc, kiểm tra và chịu trách nhiệm về toàn bộ code đưa lên Git, kể cả phần AI viết.

Khi gặp link hoặc nguồn AI không đọc được, nó báo rõ là không đọc được chứ không đoán nội dung.

## 2. Cách làm việc

1. Em mô tả yêu cầu và đưa code cần xử lý.
2. AI chỉ ra chỗ chưa ổn và đưa phương án. Với chỗ có nhiều cách làm, AI phân tích ưu nhược điểm để em chọn.
3. AI đưa code hoặc test, em đọc và đưa vào dự án.
4. Chạy test. Nếu lỗi thì gửi log cho AI để tìm nguyên nhân và sửa.
5. Lặp lại tới khi test đạt.

## 3. Nhật ký theo hạng mục

### 3.1 DTO và Pipe validation (Task #4)

**Em hỏi AI:** `main.ts`, `CreateUserDto`, `LoginDto` đã dùng validation đúng chưa; cách test DTO và Pipe với dữ liệu hợp lệ, thiếu trường, sai kiểu.

**AI chỉ ra và viết giúp:**
- `main.ts` chưa bật `ValidationPipe`, nên các decorator trong DTO không có tác dụng.
- `LoginDto` bị copy nhầm nội dung `phoneNumber`/`address` và chưa gắn vào `AuthController`.
- `CreateUserDto` thiếu `@IsString()` ở `firstName`, nên giá trị `12345` vẫn lọt qua.
- Guard chạy trước Pipe: route `/auth/login` thiếu field sẽ trả `401` từ Guard, chưa tới Pipe để ra `400`.
- Viết test: `create-user.dto.spec.ts`, `login.dto.spec.ts`, `test/auth.e2e-spec.ts`.
- Khi đọc module Orders, AI phát hiện 2 lỗi: gán nhầm `book.id = orderItem.bookId` thay vì so sánh `==` trong `orders.service.ts`, và thiếu `ParseIntPipe` ở `@Param("id")` trong controller.

**Quá trình:** e2e auth từng lỗi `ETIMEDOUT` do kết nối Supabase, chỉnh connection string xong thì đạt 10/13 rồi 11/13. Hai test còn lại lỗi do login trả `201` thay vì `200`; AI giải thích NestJS mặc định trả `201` cho POST, em thêm `@HttpCode(200)`. Lần chạy cuối (mục 4) đạt toàn bộ.

### 3.2 Meilisearch (Task #5)

**Em hỏi AI:** cần những file nào để làm tìm kiếm; so sánh đồng bộ trực tiếp với qua RabbitMQ; viết module search kèm test.

**AI chỉ ra và viết giúp:**
- Dự án chưa có `docker-compose.yml` và thư mục `src/search/`.
- Phân tích hai cách đồng bộ: A (gọi trực tiếp, đơn giản) và B (qua RabbitMQ, tách rời hơn nhưng phức tạp hơn).
- Viết trọn `src/search/*` (service, controller, module, DTO, script reindex, 2 file test), sửa `books.service.ts` và cấu hình liên quan.
- Bọc đồng bộ Meilisearch bằng `try/catch` để Meilisearch lỗi thì thêm/sửa/xóa sách trên Postgres vẫn chạy.

**Quá trình:** script `npm run search:reindex` ban đầu lỗi DI ở `OrdersService` vì nạp cả `AppModule`; AI sửa để chỉ nạp `PrismaModule` và `SearchModule`.

### 3.3 Sách và Giỏ hàng

**Em hỏi AI:** đối chiếu code sách và giỏ hàng với yêu cầu, tìm lỗi, sửa lỗi và viết test.

**Lỗi AI tìm ra:**
- `updateCartItemQuantity` và `removeCartItem` nhận `userId` nhưng không kiểm tra mục giỏ có thuộc user đó, nên user này sửa/xóa được giỏ của user khác.
- `addToCart` không kiểm tra sách có tồn tại, còn `ACTIVE`, đủ tồn kho; id sách sai gây lỗi khóa ngoại (500).
- `books.controller.ts` và `orders.controller.ts` dùng `import type` cho DTO, làm mất metadata runtime nên `ValidationPipe` có thể không validate.
- `reduceBookStock` trừ kho không điều kiện, có thể làm tồn kho âm.
- Sửa sách sang `INACTIVE` vẫn đưa vào chỉ mục Meilisearch; tham số `category` ghép thẳng vào chuỗi filter.
- DTO sách cho phép giá âm và tồn kho không nguyên.

**Đã sửa:**
- Đổi `import type` thành `import` cho DTO trong hai controller.
- Giỏ hàng: sửa/xóa chỉ áp dụng cho giỏ của chính user (không thuộc thì trả 404); thêm vào giỏ kiểm tra sách tồn tại, `ACTIVE`, đủ tồn kho; số lượng cập nhật phải là số nguyên.
- Trừ kho dùng `updateMany` với điều kiện `stockQuantity >= quantity`, hết hàng thì báo lỗi; xóa cache `book:{id}`.
- Sách chuyển `INACTIVE` được gỡ khỏi chỉ mục; `category` được escape trước khi vào filter.
- DTO sách: `price >= 0`, `stockQuantity` là số nguyên, `status` chỉ nhận `ACTIVE` hoặc `INACTIVE`.

### 3.4 Kiểm thử (Task #6)

AI viết lại `books.service.spec.ts`, `carts.service.spec.ts`, `carts.controller.spec.ts` và thêm `book.dto.spec.ts`, `cart.dto.spec.ts`. Các spec trước đó chỉ có một test "should be defined". Spec controller giỏ hàng cũ còn lỗi gõ `canActive`, đã sửa thành `canActivate`.

Nội dung chính: tạo, danh sách có phân trang, lấy theo id (cache hit/miss, không tìm thấy, `INACTIVE`), sửa, xóa mềm, trừ kho, lọc tồn kho thấp, Meilisearch lỗi không làm hỏng request; giỏ hàng gồm xem, thêm (sách không tồn tại, `INACTIVE`, vượt tồn kho, cộng dồn), sửa, xóa, kiểm tra chủ sở hữu, xóa cache; DTO gồm hợp lệ, thiếu trường, sai kiểu, ngoài miền cho phép.

**Kiểm chứng test có bắt được lỗi thật:** chạy các test mới trên code trước khi sửa thì 11 test thất bại (trừ kho, kiểm tra chủ giỏ, sách `INACTIVE` trong chỉ mục, kiểm tra sách và tồn kho khi thêm vào giỏ); sau khi sửa thì đạt hết.

## 4. Kết quả chạy test

Chạy ngày 19/10/2026 trên máy local (Windows), Vitest v4.1.11, tại thư mục `backend`.

### 4.1 Unit test (`npm run test`)

**21/21 file đạt, 157/157 test đạt** (thời gian chạy 10,62 giây).

| Nhóm | File | Số test |
|---|---|---|
| Sách | `books.service.spec.ts` | 16 |
| | `books.controller.spec.ts` | 7 |
| | `books/dtos/book.dto.spec.ts` | 30 |
| Giỏ hàng | `carts.service.spec.ts` | 15 |
| | `carts.controller.spec.ts` | 5 |
| | `carts/dtos/cart.dto.spec.ts` | 14 |
| Đơn hàng | `orders.service.spec.ts` | 10 |
| | `orders.controller.spec.ts` | 6 |
| | `orders/dtos/order.dto.spec.ts` | 10 |
| | `order-items.controller.spec.ts` | 1 |
| | `order-items.service.spec.ts` | 1 |
| Tìm kiếm | `search.service.spec.ts` | 7 |
| | `search.controller.spec.ts` | 3 |
| Người dùng và xác thực | `user/dto/create-user.dto.spec.ts` | 16 |
| | `auth/dto/login.dto.spec.ts` | 6 |
| Khác | `common/response-envelope.spec.ts` | 4 |
| | `cron-job.service.spec.ts` | 2 |
| | `cron-job.controller.spec.ts` | 1 |
| | `notifications.service.spec.ts` | 1 |
| | `notifications.controller.spec.ts` | 1 |
| | `app.controller.spec.ts` | 1 |

Riêng sách và giỏ hàng: **6 file, 87 test, đạt hết**.


### 4.2 E2E (`npm run test:e2e`)

**2/2 file đạt, 13/13 test đạt** (thời gian chạy 9,54 giây): `app.e2e-spec.ts` (1 test) và `auth.e2e-spec.ts` (12 test), gồm đăng ký thành công (`201`) và đăng nhập thành công trả `accessToken` (`200`).

Các dòng `ERROR [LoggingInterceptor] ... FAILED POST /auth/register ... status=409/400` và `/auth/login ... status=400` trong log là chủ ý: đó là các test kiểm tra trường hợp sai (email trùng, thiếu trường, sai kiểu) và test vẫn đạt khi nhận đúng mã lỗi mong đợi.

### 4.3 CI

Workflow `Backend CI` (`.github/workflows/backend-ci.yml`) chạy trên push và pull request theo thứ tự: `npm ci`, `npm run prisma:generate`, `npm run lint`, `npm run build`, `npm test`. Bước test đã được thêm vào CI.

## 5. Những lần AI làm sai nhưng đã được phát hiện

| # | AI làm sai / hiểu nhầm | Phát hiện bằng cách nào | Cách xử lý |
|---|---|---|---|
| 1 | Cho rằng dự án dùng Jest nên đưa lệnh `npx jest` | Chạy báo lỗi; xem `package.json` thấy dùng Vitest | Yêu cầu AI viết lại bằng Vitest (`npm run test`) |
| 2 | Đặt file unit test trong thư mục `test/` | Spec của các module khác nằm cạnh code trong `src/` | Chuyển về `src/user/dto/` và `src/auth/dto/` |
| 3 | Test login dùng user seed sẵn mà không kiểm tra có trong DB | Chạy test bị `401` | Viết hàm tạo user tạm ở `beforeAll` và dọn ở `afterAll` |

## 6. Bổ sung cho lượt audit rubric ngày 19/10/2026

AI hỗ trợ đọc mã nguồn và rubric, lập [bảng đối chiếu 23 tiêu chí](evidence/rubric-audit-20261019.md), sửa validation phân trang, refresh token, CORS, cron, đồng bộ search, seed mẫu, Docker Compose, Swagger và tài liệu. AI cũng hỗ trợ tạo unit/API test, cập nhật Prisma lên bản vá và loại bỏ dependency dev không dùng. Nhóm cần tự review các thay đổi trước khi commit hoặc nộp.

Kiểm chứng trong lượt này: `npm ci`, Prisma generate/validate, backend lint/build, 185/185 test, frontend build, Compose config và `npm audit` đều đạt. Coverage ở mốc 185 test: 77,72% statements, 66,05% branches; công cụ chỉ tính file được import. **Không chạy E2E với database, migration, seed hay Docker runtime trong lượt audit này** vì Docker daemon không kết nối được và không có database thử nghiệm tách biệt. Kết quả E2E ở mục 4.2 là ghi nhận lịch sử của một lượt chạy khác, không được xem là bằng chứng cho working tree hiện tại.

## 7. Lượt tiếp nối kiểm chứng runtime ngày 19/10/2026

Codex tiếp tục hỗ trợ sửa lockfile Docker, DI guard, retry outbox, cache Redis, CSRF cho cookie, schema phản hồi Swagger, test luồng mua hàng và kiểm chứng trong Compose project tách biệt. AI đã chạy migration/seed và tạo dữ liệu benchmark **chỉ trên database thử nghiệm `bookaudit` mới**, không truy cập database đang chạy của dự án. Kết quả trực tiếp: 187/187 unit/API test, 15/15 E2E, Docker health, EXPLAIN ANALYZE và các phép thử broker/Redis/search trong [báo cáo runtime](evidence/runtime-verification-20261019.md). Nhóm vẫn cần review thay đổi và xác nhận mức sử dụng AI thực tế trước khi nộp.

