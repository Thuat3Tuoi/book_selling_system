import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { CartsService } from './carts.service.js';
import type { AddToCartDto } from './dtos/cart-add-request.dto.js';
import type { UpdateCartItemDto } from './dtos/cart-update-request.dto.js';

@Controller('carts')
export class CartsController {
    constructor(private readonly cartsService: CartsService) {}

    @Get()
    getCartById(@Param("userId", ParseIntPipe) userId: number) {
        return this.cartsService.getCartById(userId);
    }

    @Post(":userId/items")
    addToCart(
        @Param("userId", ParseIntPipe) userId: number,
        @Body() addToCartDto: AddToCartDto
    ) {
        return this.cartsService.addToCart(userId, addToCartDto);
    }

    @Patch("items/:itemId")
    updateCartItemQuantity(
        @Param("itemId", ParseIntPipe) itemId: number,
        @Body() updateCartItemDto: UpdateCartItemDto
    ) {
        return this.cartsService.updateCartItemQuantity(itemId, updateCartItemDto);
    }

    @Delete("items/:itemId")
    removeCartItem(@Param("itemId", ParseIntPipe) itemId: number) {
        return this.cartsService.removeCartItem(itemId);
    }

}
