import { api } from "@/lib/api";
import type { Book } from "@/lib/types";
import { create } from "zustand";

interface BooksMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
interface BookState {
  books: Book[];
  meta: BooksMeta | null;
  selectedBook: Book | null;
  loading: boolean;

  getBooks: (page?: number, limit?: number) => Promise<void>;
  getBook: (id: number) => Promise<void>;
  clearSelectedBook: () => void;
}

export const useBookStore = create<BookState>((set) => ({
  books: [],
  selectedBook: null,
  meta: null,
  loading: false,

  // Lấy danh sách sách
  getBooks: async (page = 1, limit = 5) => {
    try {
      set({ loading: true });

      const response = await api.get<{
        data: Book[];
        meta: BooksMeta;
      }>("/books", {
        params: {
          page,
          limit,
        },
      });

      set({
        books: response.data.data,
        meta: response.data.meta,
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  // Lấy chi tiết 1 sách
  getBook: async (id: number) => {
    try {
      set({
        loading: true,
        selectedBook: null,
      });

      const response = await api.get<Book>(`/books/${id}`);

      set({
        selectedBook: response.data,
        loading: false,
      });
    } catch (error) {
      set({
        loading: false,
        selectedBook: null,
      });

      throw error;
    }
  },

  clearSelectedBook: () => {
    set({
      selectedBook: null,
    });
  },
}));
