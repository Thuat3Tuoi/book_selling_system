import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service.js";

import type { Cart, CartItem } from "../generated/prisma/client.js";

import type { AddToCartDto } from "./dtos/cart-add-request.dto.js";

import { UpdateCartItemDto } from "./dtos/cart-update-request.dto.js";

import { RedisService } from "../redis/redis.service.js";
import { BookStatus } from "../generated/prisma/enums.js";

@Injectable()
export class CartsService {
    private readonly CACHE_TTL = 300; // 5 phút

    constructor(
        private readonly prismaService: PrismaService,
        private readonly redis: RedisService
    ) {}

    // =========================
    // GET CART
    // =========================

    getCartById = async (userId: number): Promise<Cart> => {
        const cacheKey = `cart:user:${userId}`;
        
        // 1. Kiểm tra Redis
        const cachedCart = await this.redis.get<Cart>(cacheKey);

        if (cachedCart) {
            return cachedCart;
        }

        // 2. Cache miss -> lấy DB
        let cart = await this.prismaService.cart.findUnique({
            where: { userId },
            include: {
                cartItems: {
                    include: {
                        book: true,
                    },
                },
            },
        });

        // 3. Nếu chưa có cart -> tạo
        if (!cart) {
            cart = await this.prismaService.cart.create({
                data: { userId },
                include: {
                    cartItems: {
                        include: {
                            book: true,
                        },
                    },
                },
            });
        }

        // 4. Lưu Redis
        await this.redis.set(cacheKey, cart, this.CACHE_TTL);

        return cart;
    };

    // =========================
    // ADD TO CART
    // =========================

    addToCart = async (userId: number, addToCartDto: AddToCartDto): Promise<CartItem> => {
        const cart = await this.getCartById(userId);

        const book = await this.prismaService.book.findUnique({
            where: { id: addToCartDto.bookId },
        });

        if (!book || book.status !== BookStatus.ACTIVE) {
            throw new NotFoundException("Không tìm thấy sách hoặc sách không còn hoạt động");
        }

        
        const existingItem = await this.prismaService.cartItem.findUnique({
            where: {
                cartId_bookId: {
                    cartId: cart.id,
                    bookId: addToCartDto.bookId,
                },
            },
        });
        
        const newQuantity = (existingItem?.quantity ?? 0) + addToCartDto.quantity;

        if (newQuantity > book.stockQuantity) {
            throw new BadRequestException(`Chỉ còn ${book.stockQuantity} cuốn trong kho`);
        }

        let cartItem: CartItem;

        if (existingItem) {
            cartItem = await this.prismaService.cartItem.update({
                where: {
                    id: existingItem.id,
                },
                data: {
                    quantity: existingItem.quantity + addToCartDto.quantity,
                },
            });
        } else {
            cartItem = await this.prismaService.cartItem.create({
                data: {
                    cartId: cart.id,
                    bookId: addToCartDto.bookId,
                    quantity: addToCartDto.quantity,
                },
            });
        }

        // DB thay đổi -> xóa cache
        await this.redis.delete(`cart:user:${userId}`);

        return cartItem;
    };

    // =========================
    // HELPER: chỉ lấy cart item thuộc giỏ của userId
    // =========================

    private findOwnedCartItem = async (userId: number, cartItemId: number) => {
        const cartItem = await this.prismaService.cartItem.findFirst({
            where: {
                id: cartItemId,
                cart: { userId },
            },
            include: { book: true },
        });

        // Trả 404 (không phải 403) để không lộ việc mục giỏ của người khác có tồn tại
        if (!cartItem) {
            throw new NotFoundException("Cart item not found");
        }

        return cartItem;
    };

    // =========================
    // UPDATE QUANTITY
    // =========================

    updateCartItemQuantity = async (
        userId: number,
        cartItemId: number,
        updateCartItemDto: UpdateCartItemDto
    ): Promise<CartItem> => {
        const cartItem = await this.findOwnedCartItem(userId, cartItemId);

        if (updateCartItemDto.quantity > cartItem.book.stockQuantity) {
            throw new BadRequestException(`Chỉ còn ${cartItem.book.stockQuantity} cuốn trong kho`);
        }

        const updatedCartItem = await this.prismaService.cartItem.update({
            where: {
                id: cartItemId,
            },
            data: {
                quantity: updateCartItemDto.quantity,
            },
        });
        await this.redis.delete(`cart:user:${userId}`);
        return updatedCartItem;
    };

    // =========================
    // REMOVE ITEM
    // =========================

    removeCartItem = async (userId: number, cartItemId: number): Promise<CartItem> => {
        await this.findOwnedCartItem(userId, cartItemId);

        const deletedCartItem = await this.prismaService.cartItem.delete({
            where: {
                id: cartItemId,
            },
        });
        await this.redis.delete(`cart:user:${userId}`);
        return deletedCartItem;
    };
}
