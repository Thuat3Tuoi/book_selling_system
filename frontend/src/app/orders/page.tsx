"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { api } from "@/lib/api";
import { formatPrice, formatOrderStatus } from "@/lib/format";
import type { Order } from "@/lib/types";

export default function OrdersPage() {
  const { user, isReady } = useAuth();
  const { cart, isLoading, updateQuantity, removeItem, totalPrice, refresh } =
    useCart();

  const [address, setAddress] = useState(user?.address ?? "");
  const [isPlacing, setIsPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [placeSuccess, setPlaceSuccess] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(false);

  useEffect(() => {
    if (!user) return;
    setOrdersLoading(true);
    api
      .getOrders()
      .then((all) => setOrders(all.filter((o) => o.userId === user.id)))
      .catch(() => setOrdersError(true))
      .finally(() => setOrdersLoading(false));
  }, [user, placeSuccess]);

  async function handleCheckout(e: FormEvent) {
    e.preventDefault();
    if (!user || !cart || cart.cartItems.length === 0) return;

    setIsPlacing(true);
    setPlaceError(null);
    setPlaceSuccess(false);
    try {
      await api.createOrder({
        userId: user.id,
        shippingAddress: address,
        orderItems: cart.cartItems.map((item) => ({
          bookId: item.bookId,
          quantity: item.quantity,
        })),
      });

      // Backend chưa tự xoá giỏ hàng sau khi đặt — xoá thủ công từng dòng.
      for (const item of cart.cartItems) {
        await removeItem(item.id);
      }
      await refresh();
      setPlaceSuccess(true);
    } catch (err) {
      setPlaceError(
        err instanceof Error ? err.message : "Đặt hàng thất bại, thử lại."
      );
    } finally {
      setIsPlacing(false);
    }
  }

  if (isReady && !user) {
    return (
      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-16 text-center">
        <p className="text-[#1F2321]/70">
          Bạn cần đăng nhập để xem giỏ hàng và đặt sách.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-full bg-[#2F4B3C] px-5 py-2.5 text-sm font-medium text-[#FAF6EE] hover:bg-[#26392E]"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <h1 className="mb-6 font-serif text-3xl font-medium text-[#1F2321]">
        Giỏ hàng
      </h1>

      {isLoading && (
        <p className="text-sm text-[#1F2321]/60">Đang tải giỏ hàng...</p>
      )}

      {!isLoading && (!cart || cart.cartItems.length === 0) && (
        <p className="rounded-sm border border-[#E4DCC8] bg-white p-4 text-sm text-[#1F2321]/70">
          Giỏ hàng đang trống.{" "}
          <Link href="/products" className="text-[#2F4B3C] hover:underline">
            Xem sách
          </Link>
        </p>
      )}

      {!isLoading && cart && cart.cartItems.length > 0 && (
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col divide-y divide-[#E4DCC8] border-y border-[#E4DCC8]">
            {cart.cartItems.map((item) => (
              <div key={item.id} className="flex items-center gap-4 py-4">
                <div className="flex h-16 w-12 flex-none items-center justify-center bg-[#EFE9DA] text-center text-[10px] text-[#1F2321]/60">
                  {item.book.title}
                </div>

                <div className="flex-1">
                  <p className="font-medium text-[#1F2321]">
                    {item.book.title}
                  </p>
                  <p className="text-sm text-[#1F2321]/60">
                    {formatPrice(item.book.price)}
                  </p>
                </div>

                <div className="flex items-center rounded-full border border-[#E4DCC8]">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="px-3 py-1.5 text-[#1F2321] hover:text-[#2F4B3C]"
                    aria-label="Giảm số lượng"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="px-3 py-1.5 text-[#1F2321] hover:text-[#2F4B3C]"
                    aria-label="Tăng số lượng"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => removeItem(item.id)}
                  className="text-sm text-[#1F2321]/50 hover:text-red-600"
                >
                  Xoá
                </button>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleCheckout}
            className="flex h-fit flex-col gap-4 rounded-sm border border-[#E4DCC8] bg-white p-5"
          >
            <div className="flex items-center justify-between text-[#1F2321]">
              <span>Tổng cộng</span>
              <span className="text-lg font-medium text-[#2F4B3C]">
                {formatPrice(totalPrice)}
              </span>
            </div>

            <label className="flex flex-col gap-1.5 text-sm text-[#1F2321]">
              Địa chỉ giao hàng
              <textarea
                required
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="resize-none rounded-sm border border-[#E4DCC8] px-3 py-2 outline-none focus:border-[#2F4B3C]"
                placeholder="Số nhà, đường, phường/xã, quận/huyện..."
              />
            </label>

            {placeError && (
              <p className="text-sm text-red-600">{placeError}</p>
            )}
            {placeSuccess && (
              <p className="text-sm text-[#2F4B3C]">
                Đặt hàng thành công! Xem bên dưới.
              </p>
            )}

            <button
              type="submit"
              disabled={isPlacing}
              className="rounded-full bg-[#2F4B3C] px-4 py-2.5 text-sm font-medium text-[#FAF6EE] transition-colors hover:bg-[#26392E] disabled:opacity-60"
            >
              {isPlacing ? "Đang đặt hàng..." : "Đặt hàng"}
            </button>
          </form>
        </div>
      )}

      <h2 className="mb-4 mt-14 font-serif text-2xl font-medium text-[#1F2321]">
        Đơn hàng của bạn
      </h2>

      {ordersLoading && (
        <p className="text-sm text-[#1F2321]/60">Đang tải đơn hàng...</p>
      )}
      {ordersError && (
        <p className="text-sm text-[#1F2321]/60">
          Không tải được lịch sử đơn hàng.
        </p>
      )}
      {!ordersLoading && !ordersError && orders.length === 0 && (
        <p className="text-sm text-[#1F2321]/60">Bạn chưa có đơn hàng nào.</p>
      )}

      {orders.length > 0 && (
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
