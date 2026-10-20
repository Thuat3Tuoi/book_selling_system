import type { Book, Cart, CartItem } from "../../generated/prisma/client.js";
import { BookResponseDto } from "../../books/dtos/book-response.dto.js";

export class CartItemResponseDto {
    readonly id: number;
    readonly cartId: number;
    readonly bookId: number;
    readonly quantity: number;
    readonly book?: BookResponseDto;

    constructor(item: CartItem & { book?: Book }) {
        this.id = item.id;
        this.cartId = item.cartId;
        this.bookId = item.bookId;
        this.quantity = item.quantity;
        if (item.book) this.book = new BookResponseDto(item.book);
    }
}

export class CartResponseDto {
    readonly id: number;
    readonly userId: number;
    readonly cartItems: CartItemResponseDto[];

    constructor(cart: Cart & { cartItems?: (CartItem & { book?: Book })[] }) {
        this.id = cart.id;
        this.userId = cart.userId;
        this.cartItems = (cart.cartItems ?? []).map((item) => new CartItemResponseDto(item));
    }
}
