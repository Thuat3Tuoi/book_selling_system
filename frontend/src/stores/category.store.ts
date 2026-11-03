"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { getBookCategories } from "@/lib/catalog";

interface CategoryState {
  categories: string[];
  loading: boolean;
  error: boolean;
  loadCategories: () => Promise<void>;
}

let pending: Promise<void> | null = null;
const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  loading: true,
  error: false,
  loadCategories: () => {
    if (pending) return pending;
    set({ loading: true, error: false });
    pending = getBookCategories()
      .then((categories) => {
        set({ categories, loading: false, error: false });
      })
      .catch(() => {
        set({ categories: [], loading: false, error: true });
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  },
}));

export function useBookCategories() {
  const state = useCategoryStore();
  const loadCategories = state.loadCategories;
  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);
  return state;
}
