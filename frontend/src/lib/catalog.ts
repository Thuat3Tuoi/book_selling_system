import { api } from "@/lib/api";
import type { ApiResponse } from "@/lib/types";

export async function getBookCategories(): Promise<string[]> {
  const response = await api.get<ApiResponse<string[]>>("/books/categories", {
    timeout: 8000,
  });
  return response.data.data;
}

export function categoryHref(category: string) {
  return `/products?category=${encodeURIComponent(category)}`;
}
