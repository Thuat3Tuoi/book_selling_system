import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { CartsService } from "./carts.service.js";
import { AddToCartDto } from "./dtos/cart-add-request.dto.js";
import { UpdateCartItemDto } from "./dtos/cart-update-request.dto.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";
import { ApiBearerAuth } from "@nestjs/swagger";



@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller("carts")
export class CartsController {
    constructor(private readonly cartsService: CartsService) {}

    @Get()
    getCartById(@Req() req: any) {
        const userId = (req.user as any).id;

        return this.cartsService.getCartById(userId);
    }

    @Post("items")
    addToCart(@Req() req: any, @Body() addToCartDto: AddToCartDto) {
        const userId = (req.user as any).id;
        return this.cartsService.addToCart(userId, addToCartDto);
    }

    @Patch("items/:cartItemId")
    updateCartItem(
        @Req() req: any,
        @Param("cartItemId", ParseIntPipe) cartItemId: number,
        @Body() dto: UpdateCartItemDto
    ) {
        return this.cartsService.updateCartItemQuantity(req.user.id, cartItemId, dto);
    }

    @Delete("items/:cartItemId")
    removeCartItem(@Req() req:any, @Param("cartItemId", ParseIntPipe) cartItemId: number) {
        return this.cartsService.removeCartItem(req.user.id, cartItemId);
    }
}
