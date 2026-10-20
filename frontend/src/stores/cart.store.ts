import { create } from "zustand";
import { api } from "@/lib/api";
import type { ApiResponse } from "@/lib/types";

export interface CartItem {
  id: number;
  quantity: number;
  book: {
    id: number;
    title: string;
    price: number | string;
    stockQuantity: number;
  };
}

interface Cart {
  id: number;
  userId: number;
  cartItems: CartItem[];
}

interface CartState {
  cart: Cart | null;
  loading: boolean;

  getCart: () => Promise<void>;
  addToCart: (bookId: number, quantity: number) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeFromCart: (itemId: number) => Promise<void>;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  cart: null,
  loading: false,

  getCart: async () => {
    try {
      set({ loading: true });

      const response = await api.get<ApiResponse<Cart>>("/carts");

      set({
        cart: response.data.data,
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  addToCart: async (bookId, quantity) => {


    const data = {
      bookId,
      quantity,
    };


    await api.post("/carts/items", data);

    const cartResponse = await api.get<ApiResponse<Cart>>("/carts");

    set({
      cart: cartResponse.data.data,
    });
  },

  updateQuantity: async (itemId, quantity) => {
    await api.patch(`/carts/items/${itemId}`, {
      quantity,
    });

    const response = await api.get<ApiResponse<Cart>>("/carts");

    set({
      cart: response.data.data,
    });
  },

  removeFromCart: async (itemId) => {
    await api.delete(`/carts/items/${itemId}`);

    const response = await api.get<ApiResponse<Cart>>("/carts");

    set({
      cart: response.data.data,
    });
  },

  clearCart: () => {
    set({
      cart: null,
    });
  },
}));
