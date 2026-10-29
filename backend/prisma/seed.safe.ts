import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcrypt";
import { OrderStatus, Prisma, PrismaClient } from "../src/generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD;
const money = (value: number | string) => new Prisma.Decimal(value);
const date = (value: string) => new Date(value);
const coverUrl = (isbn: string) => `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;

async function main() {
    if (process.env.DEMO_SEED_ENABLED !== "true") {
        console.log("Demo seed disabled");
        return;
    }
    if (process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test") {
        throw new Error("Demo seed is allowed only in development or test");
    }
    console.log("🌱 Bắt đầu tạo dữ liệu mẫu...");
    if (!DEFAULT_PASSWORD) {
        throw new Error("DEFAULT_PASSWORD khong ton tai trong moi truong");
    }

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    await prisma.$transaction(
        async (tx) => {
            // Use stable natural keys and create only missing demo records.
            // Never reset IDs, passwords, stock, orders, or other existing data.
            const adminRole = await tx.role.upsert({
                where: { roleName: "ADMIN" }, update: {},
                create: { roleName: "ADMIN", status: true },
            });
            const customerRole = await tx.role.upsert({
                where: { roleName: "CUSTOMER" }, update: {},
                create: { roleName: "CUSTOMER", status: true },
            });
            const staffRole = await tx.role.upsert({
                where: { roleName: "STAFF" }, update: {},
                create: { roleName: "STAFF", status: true },
            });

            const users = await Promise.all([
                tx.user.upsert({
                    where: { email: "admin@bookstore.example.com" }, update: {}, create: {
                        firstName: "An",
                        lastName: "Nguyễn",
                        email: "admin@bookstore.example.com",
                        passwordHash,
                        phoneNumber: "0901000001",
                        address: "273 An Dương Vương, Phường Chợ Quán, TP. Hồ Chí Minh",
                        roleId: adminRole.id,
                        status: true,
                        createdAt: date("2026-01-05T01:00:00.000Z"),
                    },
                }),
                tx.user.upsert({
                    where: { email: "staff@bookstore.example.com" }, update: {}, create: {
                        firstName: "Linh",
                        lastName: "Phạm",
                        email: "staff@bookstore.example.com",
                        passwordHash,
                        phoneNumber: "0901000002",
                        address: "18 Cộng Hòa, Phường Bảy Hiền, TP. Hồ Chí Minh",
                        roleId: staffRole.id,
                        status: true,
                        createdAt: date("2026-01-08T02:30:00.000Z"),
                    },
                }),
                tx.user.upsert({
                    where: { email: "minh.tran@example.com" }, update: {}, create: {
                        firstName: "Minh",
                        lastName: "Trần",
                        email: "minh.tran@example.com",
                        passwordHash,
                        phoneNumber: "0912000001",
                        address: "42 Nguyễn Thị Minh Khai, Phường Sài Gòn, TP. Hồ Chí Minh",
                        roleId: customerRole.id,
                        status: true,
                        createdAt: date("2026-02-12T03:15:00.000Z"),
                    },
                }),
                tx.user.upsert({
                    where: { email: "thao.le@example.com" }, update: {}, create: {
                        firstName: "Thảo",
                        lastName: "Lê",
                        email: "thao.le@example.com",
                        passwordHash,
                        phoneNumber: "0938000002",
                        address: "125 Lê Lợi, Phường Sài Gòn, TP. Hồ Chí Minh",
                        roleId: customerRole.id,
                        status: true,
                        createdAt: date("2026-03-20T08:45:00.000Z"),
                    },
                }),
                tx.user.upsert({
                    where: { email: "hoang.vo@example.com" }, update: {}, create: {
                        firstName: "Hoàng",
                        lastName: "Võ",
                        email: "hoang.vo@example.com",
                        passwordHash,
                        phoneNumber: "0975000003",
                        address: "76 Bạch Đằng, Phường Gia Định, TP. Hồ Chí Minh",
                        roleId: customerRole.id,
                        status: true,
                        createdAt: date("2026-04-18T06:20:00.000Z"),
                    },
                }),
                tx.user.upsert({
                    where: { email: "mai.do@example.com" }, update: {}, create: {
                        firstName: "Mai",
                        lastName: "Đỗ",
                        email: "mai.do@example.com",
                        passwordHash,
                        phoneNumber: "0986000004",
                        address: "31 Võ Văn Tần, Phường Xuân Hòa, TP. Hồ Chí Minh",
                        roleId: customerRole.id,
                        status: true,
                        createdAt: date("2026-05-06T09:10:00.000Z"),
                    },
                }),
            ]);

            const userByEmail = new Map(users.map((user) => [user.email, user]));

            const bookData = [
                {
                    title: "How to Win Friends & Influence People",
                    isbn: "9780671027032",
                    description:
                        "Tác phẩm kinh điển của Dale Carnegie về giao tiếp, thấu hiểu con người và xây dựng những mối quan hệ bền vững.",
                    author: "Dale Carnegie",
                    category: "Kỹ năng sống",
                    price: 179_000,
                    stockQuantity: 42,
                },
                {
                    title: "The Alchemist",
                    isbn: "9780062315007",
                    description:
                        "Tiểu thuyết kể về hành trình theo đuổi ước mơ của Santiago và thông điệp sống có mục đích của Paulo Coelho.",
                    author: "Paulo Coelho",
                    category: "Văn học",
                    price: 189_000,
                    stockQuantity: 35,
                },
                {
                    title: "Clean Code: A Handbook of Agile Software Craftsmanship",
                    isbn: "9780132350884",
                    description:
                        "Hướng dẫn thực hành viết mã rõ ràng, dễ kiểm thử và dễ bảo trì dành cho lập trình viên phần mềm.",
                    author: "Robert C. Martin",
                    category: "Công nghệ thông tin",
                    price: 599_000,
                    stockQuantity: 18,
                },
                {
                    title: "Atomic Habits",
                    isbn: "9780735211292",
                    description:
                        "James Clear trình bày một hệ thống thực tế để hình thành thói quen tốt thông qua những thay đổi nhỏ và bền vững.",
                    author: "James Clear",
                    category: "Phát triển bản thân",
                    price: 219_000,
                    stockQuantity: 46,
                },
                {
                    title: "The Pragmatic Programmer: 20th Anniversary Edition",
                    isbn: "9780135957059",
                    description:
                        "Những nguyên tắc và kinh nghiệm thực tiễn giúp lập trình viên phát triển phần mềm linh hoạt, đáng tin cậy và dễ bảo trì.",
                    author: "David Thomas, Andrew Hunt",
                    category: "Công nghệ thông tin",
                    price: 650_000,
                    stockQuantity: 14,
                },
                {
                    title: "Sapiens: A Brief History of Humankind",
                    isbn: "9780062316097",
                    description:
                        "Yuval Noah Harari khái quát lịch sử loài người từ thời săn bắt hái lượm đến xã hội hiện đại.",
                    author: "Yuval Noah Harari",
                    category: "Lịch sử",
                    price: 299_000,
                    stockQuantity: 27,
                },
                {
                    title: "Norwegian Wood",
                    isbn: "9780375704024",
                    description:
                        "Một câu chuyện sâu lắng của Haruki Murakami về tình yêu, mất mát và hành trình trưởng thành.",
                    author: "Haruki Murakami",
                    category: "Văn học",
                    price: 225_000,
                    stockQuantity: 21,
                },
                {
                    title: "The Little Prince",
                    isbn: "9780156012195",
                    description:
                        "Câu chuyện giàu chất thơ về tình bạn, trách nhiệm và cách nhìn thế giới bằng trái tim.",
                    author: "Antoine de Saint-Exupéry",
                    category: "Thiếu nhi",
                    price: 129_000,
                    stockQuantity: 55,
                },
                {
                    title: "Design Patterns: Elements of Reusable Object-Oriented Software",
                    isbn: "9780201633610",
                    description:
                        "Tài liệu nền tảng giới thiệu các mẫu thiết kế hướng đối tượng có khả năng tái sử dụng trong phát triển phần mềm.",
                    author: "Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides",
                    category: "Công nghệ thông tin",
                    price: 749_000,
                    stockQuantity: 9,
                },
                {
                    title: "Ikigai: The Japanese Secret to a Long and Happy Life",
                    isbn: "9780143130727",
                    description:
                        "Khám phá triết lý ikigai của Nhật Bản để tìm ý nghĩa, niềm vui và sự cân bằng trong cuộc sống hằng ngày.",
                    author: "Héctor García, Francesc Miralles",
                    category: "Phát triển bản thân",
                    price: 199_000,
                    stockQuantity: 31,
                },
                {
                    title: "Thinking, Fast and Slow",
                    isbn: "9780374533557",
                    description:
                        "Daniel Kahneman trình bày hai hệ thống tư duy và những thiên kiến ảnh hưởng đến phán đoán, quyết định của con người.",
                    author: "Daniel Kahneman",
                    category: "Tâm lý học",
                    price: 239_000,
                    stockQuantity: 24,
                },
                {
                    title: "1984",
                    isbn: "9780451524935",
                    description:
                        "Tiểu thuyết phản địa đàng kinh điển của George Orwell về quyền lực, giám sát và sự thao túng sự thật.",
                    author: "George Orwell",
                    category: "Văn học",
                    price: 149_000,
                    stockQuantity: 38,
                },
                {
                    title: "To Kill a Mockingbird",
                    isbn: "9780061120084",
                    description:
                        "Harper Lee kể về công lý, định kiến và lòng trắc ẩn qua góc nhìn của cô bé Scout ở miền Nam nước Mỹ.",
                    author: "Harper Lee",
                    category: "Văn học",
                    price: 169_000,
                    stockQuantity: 29,
                },
                {
                    title: "The Great Gatsby",
                    isbn: "9780743273565",
                    description:
                        "F. Scott Fitzgerald khắc họa giấc mơ Mỹ, tình yêu và sự đổ vỡ trong thập niên 1920.",
                    author: "F. Scott Fitzgerald",
                    category: "Văn học",
                    price: 139_000,
                    stockQuantity: 33,
                },
                {
                    title: "Introduction to Algorithms",
                    isbn: "9780262033848",
                    description:
                        "Giáo trình toàn diện về thuật toán và cấu trúc dữ liệu, được dùng rộng rãi trong đào tạo công nghệ thông tin.",
                    author: "Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein",
                    category: "Công nghệ thông tin",
                    price: 890_000,
                    stockQuantity: 7,
                },
                {
                    title: "Refactoring: Improving the Design of Existing Code",
                    isbn: "9780134757599",
                    description:
                        "Martin Fowler giới thiệu các kỹ thuật tái cấu trúc mã nguồn để cải thiện thiết kế mà không thay đổi hành vi.",
                    author: "Martin Fowler",
                    category: "Công nghệ thông tin",
                    price: 699_000,
                    stockQuantity: 12,
                },
                {
                    title: "Educated: A Memoir",
                    isbn: "9780399590504",
                    description:
                        "Hồi ký của Tara Westover về hành trình từ gia đình sống biệt lập đến con đường học vấn và tự khám phá bản thân.",
                    author: "Tara Westover",
                    category: "Hồi ký",
                    price: 259_000,
                    stockQuantity: 19,
                },
                {
                    title: "The Hobbit",
                    isbn: "9780547928227",
                    description:
                        "Cuộc phiêu lưu của Bilbo Baggins trong thế giới Trung Địa do J.R.R. Tolkien sáng tạo.",
                    author: "J.R.R. Tolkien",
                    category: "Văn học",
                    price: 209_000,
                    stockQuantity: 26,
                },
                {
                    title: "Rich Dad Poor Dad",
                    isbn: "9781612680194",
                    description:
                        "Robert T. Kiyosaki chia sẻ quan điểm về tiền bạc, đầu tư và tư duy tài chính cá nhân.",
                    author: "Robert T. Kiyosaki",
                    category: "Kinh tế",
                    price: 189_000,
                    stockQuantity: 44,
                },
                {
                    title: "Deep Work: Rules for Focused Success in a Distracted World",
                    isbn: "9781455586691",
                    description:
                        "Cal Newport trình bày các nguyên tắc tập trung sâu để làm việc hiệu quả trong môi trường nhiều xao nhãng.",
                    author: "Cal Newport",
                    category: "Phát triển bản thân",
                    price: 229_000,
                    stockQuantity: 22,
                },
            ];

            const books = [];
            for (const [index, book] of bookData.entries()) {
                books.push(
                    await tx.book.upsert({
                        where: { isbn: book.isbn }, update: {}, create: {
                            ...book,
                            price: money(book.price),
                            coverImageUrl: coverUrl(book.isbn),
                            status: "ACTIVE",
                            createdAt: date(
                                `2026-01-${String(index + 10).padStart(2, "0")}T02:00:00.000Z`
                            ),
                        },
                    })
                );
            }

            const bookByIsbn = new Map(books.map((book) => [book.isbn, book]));
            const getUser = (email: string) => {
                const user = userByEmail.get(email);
                if (!user) throw new Error(`Không tìm thấy user seed: ${email}`);
                return user;
            };
            const getBook = (isbn: string) => {
                const book = bookByIsbn.get(isbn);
                if (!book) throw new Error(`Không tìm thấy sách seed có ISBN: ${isbn}`);
                return book;
            };

            const carts = await Promise.all(
                [
                    "minh.tran@example.com",
                    "thao.le@example.com",
                    "hoang.vo@example.com",
                    "mai.do@example.com",
                ].map((email) => tx.cart.upsert({
                    where: { userId: getUser(email).id }, update: {},
                    create: { userId: getUser(email).id },
                }))
            );

            for (const item of [
                    { cartId: carts[0].id, bookId: getBook("9780735211292").id, quantity: 1 },
                    { cartId: carts[0].id, bookId: getBook("9780156012195").id, quantity: 2 },
                    { cartId: carts[1].id, bookId: getBook("9780132350884").id, quantity: 1 },
                    { cartId: carts[2].id, bookId: getBook("9780062316097").id, quantity: 1 },
                    { cartId: carts[2].id, bookId: getBook("9780143130727").id, quantity: 1 },
                    { cartId: carts[3].id, bookId: getBook("9780375704024").id, quantity: 1 },
                ]) {
                await tx.cartItem.upsert({
                    where: { cartId_bookId: { cartId: item.cartId, bookId: item.bookId } },
                    update: {}, create: item,
                });
            }

            const orderData = [
                {
                    userEmail: "minh.tran@example.com",
                    shippingAddress: "42 Nguyễn Thị Minh Khai, Phường Sài Gòn, TP. Hồ Chí Minh",
                    status: OrderStatus.COMPLETED,
                    createdAt: "2026-07-12T03:25:00.000Z",
                    items: [
                        { isbn: "9780671027032", quantity: 2 },
                        { isbn: "9780062315007", quantity: 1 },
                    ],
                },
                {
                    userEmail: "thao.le@example.com",
                    shippingAddress: "125 Lê Lợi, Phường Sài Gòn, TP. Hồ Chí Minh",
                    status: OrderStatus.SHIPPING,
                    createdAt: "2026-09-22T08:10:00.000Z",
                    items: [
                        { isbn: "9780735211292", quantity: 1 },
                        { isbn: "9780062316097", quantity: 1 },
                    ],
                },
                {
                    userEmail: "hoang.vo@example.com",
                    shippingAddress: "76 Bạch Đằng, Phường Gia Định, TP. Hồ Chí Minh",
                    status: OrderStatus.CONFIRMED,
                    createdAt: "2026-09-23T04:40:00.000Z",
                    items: [
                        { isbn: "9780132350884", quantity: 1 },
                        { isbn: "9780135957059", quantity: 1 },
                    ],
                },
                {
                    userEmail: "mai.do@example.com",
                    shippingAddress: "31 Võ Văn Tần, Phường Xuân Hòa, TP. Hồ Chí Minh",
                    status: OrderStatus.PENDING,
                    createdAt: "2026-09-25T02:15:00.000Z",
                    items: [
                        { isbn: "9780156012195", quantity: 2 },
                        { isbn: "9780143130727", quantity: 1 },
                    ],
                },
                {
                    userEmail: "minh.tran@example.com",
                    shippingAddress: "42 Nguyễn Thị Minh Khai, Phường Sài Gòn, TP. Hồ Chí Minh",
                    status: OrderStatus.CANCELLED,
                    createdAt: "2026-09-15T09:30:00.000Z",
                    items: [
                        { isbn: "9780375704024", quantity: 1 },
                        { isbn: "9780201633610", quantity: 1 },
                    ],
                },
            ];

            const orders = [];
            for (const orderSeed of orderData) {
                const existingOrder = await tx.order.findFirst({
                    where: {
                        userId: getUser(orderSeed.userEmail).id,
                        createdAt: date(orderSeed.createdAt),
                    },
                });
                if (existingOrder) {
                    orders.push(existingOrder);
                    continue;
                }
                const items = orderSeed.items.map((item) => {
                    const book = getBook(item.isbn);
                    return {
                        bookId: book.id,
                        unitPrice: book.price,
                        quantity: item.quantity,
                        totalPrice: book.price.mul(item.quantity),
                    };
                });
                const totalAmount = items.reduce(
                    (total, item) => total.plus(item.totalPrice),
                    money(0)
                );

                const order = await tx.order.create({
                    data: {
                        userId: getUser(orderSeed.userEmail).id,
                        totalAmount,
                        shippingAddress: orderSeed.shippingAddress,
                        status: orderSeed.status,
                        createdAt: date(orderSeed.createdAt),
                    },
                });

                await tx.orderItem.createMany({
                    data: items.map((item) => ({ ...item, orderId: order.id })),
                });
                orders.push(order);
            }

            for (const notification of [
                    {
                        notifyType: "ORDER_COMPLETED",
                        userId: getUser("minh.tran@example.com").id,
                        message: `Đơn hàng #${orders[0].id} đã được giao thành công. Cảm ơn bạn đã mua hàng!`,
                        status: false,
                        createdAt: date("2026-07-15T09:00:00.000Z"),
                    },
                    {
                        notifyType: "ORDER_SHIPPING",
                        userId: getUser("thao.le@example.com").id,
                        message: `Đơn hàng #${orders[1].id} đang được giao đến địa chỉ của bạn.`,
                        status: true,
                        createdAt: date("2026-09-24T02:00:00.000Z"),
                    },
                    {
                        notifyType: "ORDER_CONFIRMED",
                        userId: getUser("hoang.vo@example.com").id,
                        message: `Đơn hàng #${orders[2].id} đã được xác nhận và đang chờ đóng gói.`,
                        status: true,
                        createdAt: date("2026-09-23T05:00:00.000Z"),
                    },
                    {
                        notifyType: "ORDER_CREATED",
                        userId: getUser("mai.do@example.com").id,
                        message: `Đơn hàng #${orders[3].id} đã được tạo và đang chờ xác nhận.`,
                        status: true,
                        createdAt: date("2026-09-25T02:16:00.000Z"),
                    },
                    {
                        notifyType: "ORDER_CANCELLED",
                        userId: getUser("minh.tran@example.com").id,
                        message: `Đơn hàng #${orders[4].id} đã được hủy theo yêu cầu.`,
                        status: false,
                        createdAt: date("2026-09-15T10:10:00.000Z"),
                    },
                    {
                        notifyType: "SYSTEM",
                        userId: getUser("thao.le@example.com").id,
                        message:
                            "Chào mừng bạn đến với Book Store. Chúc bạn tìm được cuốn sách yêu thích!",
                        status: false,
                        createdAt: date("2026-03-20T08:46:00.000Z"),
                    },
                ]) {
                const eventId = `demo:${notification.notifyType}:${notification.createdAt.toISOString()}`;
                await tx.notification.upsert({
                    where: { eventId }, update: {},
                    create: { ...notification, eventId },
                });
            }
        },
        { maxWait: 10_000, timeout: 30_000 }
    );

    console.log("✅ Tạo dữ liệu mẫu thành công.");
    console.log("   Admin: admin@bookstore.example.com");
    console.log("   Staff: staff@bookstore.example.com");
    console.log("   Customer: minh.tran@example.com");
}

main()
    .catch((error: unknown) => {
        const reason = error instanceof Error && error.message === "Demo seed is allowed only in development or test"
            ? error.message
            : "check demo configuration and database readiness; details suppressed";
        console.error("Demo seed failed:", reason);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });