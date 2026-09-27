import type {
  Book,
  Cart,
  CartItem,
  CreateOrderPayload,
  LoginResponse,
  Order,
  RegisterPayload,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    let message = `Lỗi ${res.status}`;
    try {
      const data = await res.json();
      message = data.message ?? message;
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// JWT payload chỉ có { sub, email, role } (auth.service.ts) — không có firstName/lastName,
// và user.module.ts hiện chưa có controller nào để lấy full profile theo id.
// -> Tạm thời chỉ hiển thị được email sau khi login, trừ khi bạn thêm GET /user/me ở backend.
export function decodeAccessToken(
  token: string
): { sub: number; email: string; role?: number } | null {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export const api = {
  // ----- Auth (auth.controller.ts) -----
  login: (email: string, password: string) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (payload: RegisterPayload) =>
    request<{ message: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getMe: () => request<import("./types").User>("/user/me"),

  // ----- Books (books.controller.ts) -----
  getBooks: () => request<Book[]>("/books"),

  // ⚠️ backend hiện bug: getBookById dùng @Get() không có ":id" trong path
  // nên route thật sự KHÔNG nhận id. Cần sửa thành @Get(":id") ở books.controller.ts.
  // Frontend gọi đúng chuẩn REST, sẽ chạy được ngay khi bạn fix.
  getBook: (id: number) => request<Book>(`/books/${id}`),

  // ----- Cart (carts.controller.ts) -----
  // ⚠️ backend hiện bug: getCartById dùng @Get() nhưng đọc @Param("userId"),
  // trong khi path không có ":userId". Cần sửa thành @Get(":userId").
  getCart: (userId: number) => request<Cart>(`/carts/${userId}`),

  addToCart: (userId: number, bookId: number, quantity: number) =>
    request<CartItem>(`/carts/${userId}/items`, {
      method: "POST",
      body: JSON.stringify({ bookId, quantity }),
    }),

  updateCartItem: (cartItemId: number, quantity: number) =>
    request<CartItem>(`/carts/items/${cartItemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    }),

  removeCartItem: (cartItemId: number) =>
    request<CartItem>(`/carts/items/${cartItemId}`, {
      method: "DELETE",
    }),

  // ----- Orders (orders.controller.ts) -----
  createOrder: (payload: CreateOrderPayload) =>
    request<Order>("/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // getOrders trả TẤT CẢ đơn hàng (backend chưa lọc theo user) — frontend sẽ lọc lại theo userId.
  getOrders: () => request<Order[]>("/orders"),

  getOrder: (id: number) => request<Order>(`/orders/${id}`),
};
