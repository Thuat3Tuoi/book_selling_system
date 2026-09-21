import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaPg({
    connectionString,
});

const prisma = new PrismaClient({
    adapter,
});

async function main() {
    console.log("🌱 Start seeding...");

    // ============================
    // CLEAR DATA
    // ============================

    await prisma.notification.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.book.deleteMany();
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();

    // ============================
    // ROLE
    // ============================

    const adminRole = await prisma.role.create({
        data: {
            roleName: "ADMIN",
            status: true,
        },
    });

    const customerRole = await prisma.role.create({
        data: {
            roleName: "CUSTOMER",
            status: true,
        },
    });

    const staffRole = await prisma.role.create({
        data: {
            roleName: "STAFF",
            status: true,
        },
    });

    // ============================
    // USER
    // ============================

    const passwordHash = "$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.u9M8IuKi";

    const admin = await prisma.user.create({
        data: {
            passwordHash,
            firstName: "Nguyen",
            lastName: "Admin",
            email: "admin@example.com",
            phoneNumber: "0901234567",
            address: "Ha Noi",
            roleId: adminRole.id,
            status: true,
        },
    });

    const user1 = await prisma.user.create({
        data: {
            passwordHash,
            firstName: "Nguyen",
            lastName: "Van A",
            email: "user1@example.com",
            phoneNumber: "0912345678",
            address: "123 Nguyen Trai, Ha Noi",
            roleId: customerRole.id,
            status: true,
        },
    });

    const user2 = await prisma.user.create({
        data: {
            passwordHash,
            firstName: "Tran",
            lastName: "Thi B",
            email: "user2@example.com",
            phoneNumber: "0987654321",
            address: "456 Le Loi, TP Ho Chi Minh",
            roleId: customerRole.id,
            status: true,
        },
    });

    // ============================
    // BOOK
    // ============================

    const book1 = await prisma.book.create({
        data: {
            title: "Dac Nhan Tam",
            isbn: "9786040000001",
            description: "Sach ve ky nang giao tiep va ung xu trong cuoc song.",
            author: "Dale Carnegie",
            category: "Ky nang song",
            price: 120000,
            stockQuantity: 100,
            coverImageUrl: "https://placehold.co/400x600?text=Dac+Nhan+Tam",
        },
    });

    const book2 = await prisma.book.create({
        data: {
            title: "Nha Gia Kim",
            isbn: "9786040000002",
            description: "Tieu thuyet ke ve hanh trinh theo duoi uoc mo.",
            author: "Paulo Coelho",
            category: "Tieu thuyet",
            price: 89000,
            stockQuantity: 80,
            coverImageUrl: "https://placehold.co/400x600?text=Nha+Gia+Kim",
        },
    });

    const book3 = await prisma.book.create({
        data: {
            title: "Clean Code",
            isbn: "9786040000003",
            description: "Sach huong dan viet ma nguon sach va de bao tri.",
            author: "Robert C. Martin",
            category: "Lap trinh",
            price: 350000,
            stockQuantity: 50,
            coverImageUrl: "https://placehold.co/400x600?text=Clean+Code",
        },
    });

    const book4 = await prisma.book.create({
        data: {
            title: "Atomic Habits",
            isbn: "9786040000004",
            description: "Sach ve cach xay dung va duy tri thoi quen tot.",
            author: "James Clear",
            category: "Phat trien ban than",
            price: 180000,
            stockQuantity: 120,
            coverImageUrl: "https://placehold.co/400x600?text=Atomic+Habits",
        },
    });

    const book5 = await prisma.book.create({
        data: {
            title: "The Pragmatic Programmer",
            isbn: "9786040000005",
            description: "Sach chia se kinh nghiem va phuong phap phat trien phan mem.",
            author: "Andrew Hunt, David Thomas",
            category: "Lap trinh",
            price: 420000,
            stockQuantity: 40,
            coverImageUrl: "https://placehold.co/400x600?text=Pragmatic+Programmer",
        },
    });

    // ============================
    // CART
    // ============================

    const cart1 = await prisma.cart.create({
        data: {
            userId: user1.id,
        },
    });

    const cart2 = await prisma.cart.create({
        data: {
            userId: user2.id,
        },
    });

    // ============================
    // CART ITEM
    // ============================

    await prisma.cartItem.createMany({
        data: [
            {
                cartId: cart1.id,
                bookId: book3.id,
                quantity: 1,
            },
            {
                cartId: cart1.id,
                bookId: book4.id,
                quantity: 2,
            },
            {
                cartId: cart2.id,
                bookId: book1.id,
                quantity: 1,
            },
        ],
    });

    // ============================
    // ORDER
    // ============================

    const order1 = await prisma.order.create({
        data: {
            userId: user1.id,
            totalAmount: 329000,
            shippingAddress: "123 Nguyen Trai, Ha Noi",
            status: "COMPLETED",
        },
    });

    const order2 = await prisma.order.create({
        data: {
            userId: user2.id,
            totalAmount: 530000,
            shippingAddress: "456 Le Loi, TP Ho Chi Minh",
            status: "PENDING",
        },
    });

    // ============================
    // ORDER ITEM
    // ============================

    await prisma.orderItem.createMany({
        data: [
            {
                orderId: order1.id,
                bookId: book1.id,
                unitPrice: 120000,
                quantity: 2,
                totalPrice: 240000,
            },
            {
                orderId: order1.id,
                bookId: book2.id,
                unitPrice: 89000,
                quantity: 1,
                totalPrice: 89000,
            },
            {
                orderId: order2.id,
                bookId: book3.id,
                unitPrice: 350000,
                quantity: 1,
                totalPrice: 350000,
            },
            {
                orderId: order2.id,
                bookId: book4.id,
                unitPrice: 180000,
                quantity: 1,
                totalPrice: 180000,
            },
        ],
    });

    // ============================
    // NOTIFICATION
    // ============================

    await prisma.notification.createMany({
        data: [
            {
                notifyType: "ORDER",
                userId: user1.id,
                message: "Don hang cua ban da duoc giao thanh cong.",
                status: true,
            },
            {
                notifyType: "ORDER",
                userId: user2.id,
                message: "Don hang cua ban da duoc tao thanh cong.",
                status: true,
            },
            {
                notifyType: "SYSTEM",
                userId: user1.id,
                message: "Chao mung ban den voi he thong ban sach.",
                status: true,
            },
        ],
    });

    console.log("✅ Seeding completed!");
}

main()
    .catch((error) => {
        console.error("❌ Seeding failed:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
