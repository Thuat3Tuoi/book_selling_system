import { create } from "zustand";
import { api } from "@/lib/api";

export interface CartItem {
  id: number;
  quantity: number;
  book: {
    id: number;
    title: string;
    price: number;
    stockQuantity: number;
  };
}

interface Cart {
  id: number;
  items: CartItem[];
  totalAmount: number;
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

      const response = await api.get<Cart>("/carts");

      set({
        cart: response.data,
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


    const response = await api.post("/carts/items", data);

    const cartResponse = await api.get<Cart>("/carts");

    set({
      cart: cartResponse.data,
    });
  },

  updateQuantity: async (itemId, quantity) => {
    await api.patch(`/carts/items/${itemId}`, {
      quantity,
    });

    const response = await api.get<Cart>("/carts");

    set({
      cart: response.data,
    });
  },

  removeFromCart: async (itemId) => {
    await api.delete(`/carts/items/${itemId}`);

    const response = await api.get<Cart>("/carts");

    set({
      cart: response.data,
    });
  },

  clearCart: () => {
    set({
      cart: null,
    });
  },
}));
