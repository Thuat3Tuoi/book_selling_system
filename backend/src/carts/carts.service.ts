import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import type { Cart, CartItem } from "../generated/prisma/client.js";
import type { AddToCartDto } from "./dtos/cart-add-request.dto.js";
import { UpdateCartItemDto } from "./dtos/cart-update-request.dto.js";
import { NotFoundError } from "rxjs";

@Injectable()
export class CartsService {
    constructor(private prismaService: PrismaService) {}

    getCartById = async (userId: number): Promise<Cart> => {
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

        return cart;
    };

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

        if (existingItem) {
            return this.prismaService.cartItem.update({
                where: { id: existingItem.id },
                data: {
                    quantity: existingItem.quantity + addToCartDto.quantity,
                },
            });
        }

        return this.prismaService.cartItem.create({
            data: {
                cartId: cart.id,
                bookId: addToCartDto.bookId,
                quantity: addToCartDto.quantity,
            },
        });
    };

    updateCartItemQuantity = async (
        cartItemId: number,
        updateCartItemDto: UpdateCartItemDto
    ): Promise<CartItem> => {
        const cartItem = await this.prismaService.cartItem.findUnique({
            where: { id: cartItemId },
        });

        if (!cartItem) {
            throw new NotFoundException("Cart item not found");
        }

        return this.prismaService.cartItem.update({
            where: { id: cartItemId },
            data: {
                quantity: updateCartItemDto.quantity,
            },
        });
    };

    removeCartItem = async (cartItemId: number): Promise<CartItem> => {
        const cartItem = await this.prismaService.cartItem.findUnique({
            where: { id: cartItemId },
        });

        if (!cartItem) {
            throw new NotFoundException("Cart item not found");
        }

        return this.prismaService.cartItem.delete({
            where: { id: cartItemId },
        });
    };
}
