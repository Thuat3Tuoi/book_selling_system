import { OrderStatus } from "@/lib/types";

export function formatPrice(price: string | number): string {
  const value = typeof price === "string" ? Number(price) : price;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(Number.isFinite(value) ? value : 0);
}

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: "Đang chờ xử lý",
  [OrderStatus.CONFIRMED]: "Đã xác nhận",
  [OrderStatus.SHIPPING]: "Đang giao",
  [OrderStatus.COMPLETED]: "Hoàn tất",
  [OrderStatus.CANCELLED]: "Đã hủy",
};

export function formatOrderStatus(status: OrderStatus): string {
  return ORDER_STATUS_LABEL[status];
}
