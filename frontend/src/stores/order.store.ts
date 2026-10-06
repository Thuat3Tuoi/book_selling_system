import { create } from "zustand";
import { api } from "@/lib/api";

export interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  book: {
    id: number;
    title: string;
  };
}

export interface Order {
  id: number;
  totalAmount: number;
  status: string;
  address: string;
  createdAt: string;
  items: OrderItem[];
}

interface OrderState {
  orders: Order[];
  loading: boolean;

  getOrders: () => Promise<void>;
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  loading: false,

  getOrders: async () => {
    try {
      set({ loading: true });

      const response = await api.get<Order[]>("/orders");

      set({
        orders: response.data,
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
}));
