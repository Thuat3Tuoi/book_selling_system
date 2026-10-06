import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service.js";

import type { Cart, CartItem } from "../generated/prisma/client.js";

import type { AddToCartDto } from "./dtos/cart-add-request.dto.js";

import { UpdateCartItemDto } from "./dtos/cart-update-request.dto.js";

import { RedisService } from "../redis/redis.service.js";

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

        const existingItem = await this.prismaService.cartItem.findUnique({
            where: {
                cartId_bookId: {
                    cartId: cart.id,
                    bookId: addToCartDto.bookId,
                },
            },
        });

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
    // UPDATE QUANTITY
    // =========================

    updateCartItemQuantity = async (
        userId: number,
        cartItemId: number,
        updateCartItemDto: UpdateCartItemDto
    ): Promise<CartItem> => {
        const cartItem = await this.prismaService.cartItem.findUnique({
            where: {
                id: cartItemId,
            },
        });

        if (!cartItem) {
            throw new NotFoundException("Cart item not found");
        }

        const updatedCartItem = await this.prismaService.cartItem.update({
            where: {
                id: cartItemId,
            },
            data: {
                quantity: updateCartItemDto.quantity,
            },
        });

        // DB thay đổi -> xóa cache
        await this.redis.delete(`cart:user:${userId}`);

        return updatedCartItem;
    };

    // =========================
    // REMOVE ITEM
    // =========================

    removeCartItem = async (userId: number, cartItemId: number): Promise<CartItem> => {
        const cartItem = await this.prismaService.cartItem.findUnique({
            where: {
                id: cartItemId,
            },
        });

        if (!cartItem) {
            throw new NotFoundException("Cart item not found");
        }

        const deletedCartItem = await this.prismaService.cartItem.delete({
            where: {
                id: cartItemId,
            },
        });

        // DB thay đổi -> xóa cache
        await this.redis.delete(`cart:user:${userId}`);

        return deletedCartItem;
    };
}
