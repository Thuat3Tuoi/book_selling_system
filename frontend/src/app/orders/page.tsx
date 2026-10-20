"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { formatOrderStatus, formatPrice } from "@/lib/format";
import { useCartStore } from "@/stores/cart.store";
import { useOrderStore } from "@/stores/order.store";

export default function OrdersPage() {
  const {
    cart,
    loading: cartLoading,
    getCart,
    updateQuantity,
    removeFromCart,
  } = useCartStore();

const {
  orders,
  loading: orderLoading,
  creating,
  getOrders,
  createOrder,
} = useOrderStore();

  const [address, setAddress] = useState("");

  useEffect(() => {
    getCart();
    getOrders();
  }, [getCart, getOrders]);

  // Nếu cart chưa load hoặc chưa có dữ liệu thì dùng []
  const items = cart?.cartItems ?? [];

  
  const total = items.reduce(
    (sum, item) => sum + Number(item.book.price) * item.quantity,
    0,
  );

  const handleDecrease = (itemId: number, quantity: number) => {
    if (quantity <= 1) {
      return;
    }

    updateQuantity(itemId, quantity - 1);
  };

  const handleIncrease = (
    itemId: number,
    quantity: number,
    stockQuantity: number,
  ) => {
    if (quantity >= stockQuantity) {
      return;
    }

    updateQuantity(itemId, quantity + 1);
  };

  const handleOrder = async () => {
    if (items.length === 0) {
      alert("Giỏ hàng đang trống.");
      return;
    }

    if (address.trim().length < 10) {
      alert("Vui lòng nhập địa chỉ giao hàng ít nhất 10 ký tự.");
      return;
    }
    
    try {
      await createOrder(
        address.trim(),
        items.map((item) => ({
          bookId: item.book.id,
          quantity: item.quantity,
        })),
      );

      // Backend đã xóa cartItems trong database.
      // Gọi lại API để đồng bộ giỏ hàng và đơn hàng.
      await Promise.all([getCart(), getOrders()]);

      setAddress("");
      alert("Đặt hàng thành công!");
    } catch (error) {
      console.error("Create order failed:", error);
      alert("Đặt hàng thất bại. Vui lòng thử lại.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      {" "}
      <h1 className="mb-6 font-serif text-3xl font-medium text-[#1F2321]">
        Giỏ hàng{" "}
      </h1>
      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        {/* Cart items */}
        <div className="flex flex-col divide-y divide-[#E4DCC8] border-y border-[#E4DCC8]">
          {cartLoading ? (
            <div className="py-10 text-center">
              <p className="text-[#1F2321]/60">Đang tải giỏ hàng...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-[#1F2321]/60">Giỏ hàng đang trống.</p>

              <Link
                href="/products"
                className="mt-4 inline-block text-sm text-[#2F4B3C] hover:underline"
              >
                Tiếp tục mua sách →
              </Link>
            </div>
          ) : (
            items.map((item) => {
              const { book, quantity } = item;

              return (
                <div key={item.id} className="flex items-center gap-4 py-4">
                  {/* Book image placeholder */}
                  <div className="flex h-16 w-12 flex-none items-center justify-center bg-[#EFE9DA] text-center text-[10px] text-[#1F2321]/60">
                    Sách
                  </div>

                  {/* Book information */}
                  <div className="flex-1">
                    <Link
                      href={`/products/${book.id}`}
                      className="font-medium text-[#1F2321] hover:text-[#2F4B3C]"
                    >
                      {book.title}
                    </Link>

                    <p className="text-sm text-[#1F2321]/60">
                      {formatPrice(book.price)}
                    </p>
                  </div>

                  {/* Quantity */}
                  <div className="flex items-center rounded-full border border-[#E4DCC8]">
                    <button
                      type="button"
                      onClick={() => handleDecrease(item.id, quantity)}
                      disabled={quantity <= 1}
                      className="px-3 py-1.5 text-[#1F2321] hover:text-[#2F4B3C] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      −
                    </button>

                    <span className="w-8 text-center text-sm">{quantity}</span>

                    <button
                      type="button"
                      onClick={() =>
                        handleIncrease(item.id, quantity, book.stockQuantity)
                      }
                      disabled={quantity >= book.stockQuantity}
                      className="px-3 py-1.5 text-[#1F2321] hover:text-[#2F4B3C] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    className="text-sm text-[#1F2321]/50 hover:text-red-600"
                  >
                    Xoá
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Checkout */}
        <div className="flex h-fit flex-col gap-4 rounded-sm border border-[#E4DCC8] bg-white p-5">
          <div className="flex items-center justify-between text-[#1F2321]">
            <span>Tổng cộng</span>

            <span className="text-lg font-medium text-[#2F4B3C]">
              {formatPrice(total)}
            </span>
          </div>

          <label className="flex flex-col gap-1.5 text-sm text-[#1F2321]">
            Địa chỉ giao hàng
            <textarea
              rows={3}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              className="resize-none rounded-sm border border-[#E4DCC8] px-3 py-2 outline-none focus:border-[#2F4B3C]"
              placeholder="Số nhà, đường, phường/xã, quận/huyện..."
            />
          </label>

          <button
            type="button"
            onClick={handleOrder}
            disabled={items.length === 0 || cartLoading || creating}
            className="rounded-full bg-[#2F4B3C] px-4 py-2.5 text-sm font-medium text-[#FAF6EE] transition-colors hover:bg-[#26392E] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? "Đang đặt hàng..." : "Đặt hàng"}
          </button>
        </div>
      </div>
      {/* Orders */}
      <h2 className="mb-4 mt-14 font-serif text-2xl font-medium text-[#1F2321]">
        Đơn hàng của bạn
      </h2>
      {orderLoading ? (
        <p className="text-sm text-[#1F2321]/60">Đang tải đơn hàng...</p>
      ) : orders.length === 0 ? (
        <div className="rounded-sm border border-[#E4DCC8] bg-white p-8 text-center">
          <p className="text-[#1F2321]/60">Bạn chưa có đơn hàng nào.</p>

          <Link
            href="/products"
            className="mt-3 inline-block text-sm text-[#2F4B3C] hover:underline"
          >
            Mua sách ngay →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-sm border border-[#E4DCC8] bg-white p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-[#1F2321]">
                  Đơn #{order.id}
                </span>

                <span className="rounded-full bg-[#EFE9DA] px-3 py-1 text-xs text-[#1F2321]/70">
                  {formatOrderStatus(order.status)}
                </span>
              </div>

              <p className="mt-1 text-sm text-[#1F2321]/60">
                {order.shippingAddress}
              </p>

              <div className="mt-3 flex flex-col gap-1">
                {order.orderItems?.map((item) => (
                  <p key={item.id} className="text-sm text-[#1F2321]/70">
                    {item.book?.title} × {item.quantity}
                  </p>
                ))}
              </div>

              <p className="mt-2 font-medium text-[#2F4B3C]">
                {formatPrice(order.totalAmount)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
