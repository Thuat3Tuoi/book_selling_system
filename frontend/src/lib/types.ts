// Các type dưới đây bám theo field trong service backend (Prisma).
// Một vài field (vd: coverUrl, author) chưa thấy trong DTO/service được cung cấp
// nên để optional — chỉnh lại nếu schema Book thật khác.

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string | null;
  address?: string | null;
}

export interface ApiResponse<T, M = never> {
  success: true;
  data: T;
  meta?: M;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    statusCode: number;
    message: string;
    details?: string[];
  };
}

export enum BookStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export interface Book {
  id: number;
  title: string;
  author?: string;
  description?: string;
  price: string; // Prisma.Decimal -> JSON string, vd "120000"
  stockQuantity: number;
  coverImageUrl?: string;
  status: BookStatus;
}

export enum OrderStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  SHIPPING = "SHIPPING",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export interface OrderItem {
  id: number;
  bookId: number;
  unitPrice: string;
  quantity: number;
  totalPrice: string;
}

export interface Order {
  id: number;
  userId: number;
  totalAmount: string;
  shippingAddress: string;
  status: OrderStatus;
  orderItems: OrderItem[];
  createdAt?: string;
}

// Payload gửi lên khi tạo đơn — khớp OrderCreaterRequest ở backend
export interface CreateOrderPayload {
  userId: number;
  shippingAddress: string;
  orderItems: { bookId: number; quantity: number }[];
}

// login() backend chỉ trả accessToken (không có user) — payload JWT có sub/email/role
export interface LoginResponse {
  accessToken: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  address?: string;
}

export interface CartItem {
  id: number;
  cartId: number;
  bookId: number;
  quantity: number;
  book: Book;
}

export interface Cart {
  id: number;
  userId: number;
  cartItems: CartItem[];
}
