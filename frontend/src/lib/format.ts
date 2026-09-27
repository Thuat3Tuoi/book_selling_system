export function formatPrice(price: string | number): string {
  const value = typeof price === "string" ? Number(price) : price;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(Number.isFinite(value) ? value : 0);
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: "Đang chờ xử lý",
  PAID: "Đã thanh toán",
  SHIPPING: "Đang giao",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
};

export function formatOrderStatus(status: string): string {
  return ORDER_STATUS_LABEL[status] ?? status;
}
