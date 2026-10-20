
import { create } from "zustand";
import { api } from "@/lib/api";
import type { ApiResponse, OrderStatus } from "@/lib/types";
import axios from "axios";

export interface OrderItem {
  id: number;
  bookId: number;
  quantity: number;
  unitPrice: number | string;
  totalPrice: number | string;
  book?: {
    id: number;
    title: string;
  };
}

export interface Order {
  id: number;
  totalAmount: number | string;
  status: OrderStatus;
  shippingAddress: string;
  createdAt: string;
  orderItems: OrderItem[];
}

export interface CreateOrderItemRequest {
  bookId: number;
  quantity: number;
}

interface OrderState {
  orders: Order[];
  loading: boolean;
  creating: boolean;

  getOrders: () => Promise<void>;
  createOrder: (
    shippingAddress: string,
    orderItems: CreateOrderItemRequest[],
  ) => Promise<Order>;
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  loading: false,
  creating: false,

  // Lấy danh sách đơn hàng
  getOrders: async () => {
    set({ loading: true });

    try {
      const response = await api.get<ApiResponse<Order[]>>("/orders");

      set({
        orders: response.data.data,
      });
    } finally {
      set({ loading: false });
    }
  },

  // Tạo đơn hàng
  createOrder: async (shippingAddress, orderItems) => {
    set({ creating: true });

    try {
      const response = await api.post<ApiResponse<Order>>("/orders", {
        shippingAddress,
        orderItems,
      });

      set((state) => ({
        orders: [response.data.data, ...state.orders],
      }));

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Backend response:",
          JSON.stringify(error.response?.data, null, 2),
        );
      } else {
        console.error("Unexpected error:", error);
      }

      throw error;
    } finally {
      set({ creating: false });
    }
  },
}));

