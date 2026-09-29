import { api } from "@/lib/api";
import { Book } from "@/lib/types";
import { create } from "zustand";


interface BookState {
  books: Book[];
  loading: boolean;

  getBooks: () => Promise<void>;
}

export const useBookStore = create<BookState>((set) => ({
  books: [],
  loading: false,

  getBooks: async () => {
    try {
      set({ loading: true });

      const response = await api.get("/books");

      set({
        books: response.data,
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
}));
