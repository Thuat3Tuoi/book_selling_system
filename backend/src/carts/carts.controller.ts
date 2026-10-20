import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { CartsService } from "./carts.service.js";
import { AddToCartDto } from "./dtos/cart-add-request.dto.js";
import { UpdateCartItemDto } from "./dtos/cart-update-request.dto.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";
import { CartItemResponseDto, CartResponseDto } from "./dtos/cart-response.dto.js";



@UseGuards(JwtAuthGuard)
@Controller("carts")
export class CartsController {
    constructor(private readonly cartsService: CartsService) {}

    @Get()
    async getCartById(@Req() req: any) {
        const userId = (req.user as any).id;

        return new CartResponseDto(await this.cartsService.getCartById(userId));
    }

    @Post("items")
    async addToCart(@Req() req: any, @Body() addToCartDto: AddToCartDto) {
        const userId = (req.user as any).id;
        return new CartItemResponseDto(await this.cartsService.addToCart(userId, addToCartDto));
    }

    @Patch("items/:cartItemId")
    async updateCartItem(
        @Req() req: any,
        @Param("cartItemId", ParseIntPipe) cartItemId: number,
        @Body() dto: UpdateCartItemDto
    ) {
        return new CartItemResponseDto(await this.cartsService.updateCartItemQuantity(req.user.id, cartItemId, dto));
    }

    @Delete("items/:cartItemId")
    async removeCartItem(@Req() req:any, @Param("cartItemId", ParseIntPipe) cartItemId: number) {
        return new CartItemResponseDto(await this.cartsService.removeCartItem(req.user.id, cartItemId));
    }
}
