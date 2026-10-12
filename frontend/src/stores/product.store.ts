import { api } from "@/lib/api";
import type { Book } from "@/lib/types";
import { create } from "zustand";

interface BooksMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SearchMeta {
  totalHits: number;
  processingTimeMs: number;
  page: number;
  limit: number;
}

interface BookState {
  books: Book[];
  meta: BooksMeta | null;
  selectedBook: Book | null;
  loading: boolean;

  searchResults: Book[] | null;
  searchMeta: SearchMeta | null;
  searchLoading: boolean;

  getBooks: (page?: number, limit?: number) => Promise<void>;
  getBook: (id: number) => Promise<void>;
  clearSelectedBook: () => void;

  searchBooks: (q: string, page?: number, limit?: number) => Promise<void>;
  clearSearch: () => void;
}

export const useBookStore = create<BookState>((set) => ({
  books: [],
  selectedBook: null,
  meta: null,
  loading: false,

  searchResults: null,
  searchMeta: null,
  searchLoading: false,

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

  searchBooks: async (q: string, page = 1, limit = 20) => {
    try {
      set({ searchLoading: true });
      const response = await api.get<{
        hits: Book[];
        totalHits: number;
        processingTimeMs: number;
        page: number;
        limit: number;
      }>("/search/books", {
        params: { q, page, limit },
      });

      set({
        searchResults: response.data.hits,
        searchMeta: {
          totalHits: response.data.totalHits,
          processingTimeMs: response.data.processingTimeMs,
          page: response.data.page,
          limit: response.data.limit,
        },
        searchLoading: false,
      });
    } catch (error) {
      set({ searchLoading: false });
      throw error;
    }
  },

  clearSearch: () => {
    set({
      searchResults: null,
      searchMeta: null,
      searchLoading: false,
    });
  },
}));
