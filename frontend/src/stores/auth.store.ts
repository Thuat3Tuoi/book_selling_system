import { api } from "@/lib/api";
import { create } from "zustand";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  roleId: number;
}

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  address?: string;
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  loading: boolean;

  register: (data: RegisterData) => Promise<void>;
  login: (data: LoginData) => Promise<void>;
  refreshToken: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  loading: false,

  register: async (data) => {
    try {
      set({ loading: true });

      await api.post("/auth/register", data);

      set({ loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  login: async (data) => {
    try {
      set({ loading: true });

      const response = await api.post("/auth/login", data);

      set({
        accessToken: response.data.accessToken,
        user: response.data.user,
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  refreshToken: async () => {
    try {
      const response = await api.post("/auth/refresh-token");

      set({
        accessToken: response.data.accessToken,
      });
    } catch (error) {
      set({
        accessToken: null,
        user: null,
      });

      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      set({
        accessToken: null,
        user: null,
      });
    }
  },
}));
