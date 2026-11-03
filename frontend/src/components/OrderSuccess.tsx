"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import axios from "axios";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { formatOrderStatus, formatPrice } from "@/lib/format";
import type { ApiResponse } from "@/lib/types";
import { useHydrated } from "@/lib/use-hydrated";
import { useAuthStore } from "@/stores/auth.store";
import type { Order } from "@/stores/order.store";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";

function LoadingOrder() {
  return (
    <div className="page-shell py-14" role="status">
      <p className="mb-6 text-center text-sm text-muted">Đang tải đơn hàng...</p>
      <div className="mx-auto h-96 max-w-3xl animate-pulse rounded-3xl bg-paper" />
    </div>
  );
}

function OrderConfirmation({ orderId }: { orderId: number }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api
      .get<ApiResponse<Order>>(`/orders/${orderId}`, {
        signal: controller.signal,
        timeout: 12000,
      })
      .then((response) => {
        if (!controller.signal.aborted) {
          setOrder(response.data.data);
          setLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          axios.isAxiosError(error) && error.response?.status === 404
            ? "Không tìm thấy đơn hàng hoặc bạn không có quyền xem đơn hàng này."
            : errorMessage(error, "Chưa thể tải đơn hàng. Bạn thử tải lại nhé."),
        );
        setLoading(false);
      });
    return () => controller.abort();
  }, [orderId, retry]);

  if (loading) return <LoadingOrder />;
  if (error || !order)
    return (
      <div className="page-shell py-14">
        <EmptyState
          icon="package"
          title="Chưa thể hiển thị đơn hàng"
          description={error}
          href="/orders#order-history"
          action="Xem đơn hàng của tôi"
        />
        <div className="mt-4 text-center">
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              setError("");
              setLoading(true);
              setRetry((value) => value + 1);
            }}
          >
            Thử tải lại
          </button>
        </div>
      </div>
    );

  const count = order.orderItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="page-shell py-12 lg:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <span className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-sage text-brand">
            <Icon name="check" className="size-10" />
          </span>
          <p className="eyebrow mb-3">Cảm ơn bạn đã chọn Book Store</p>
          <h1 className="font-serif text-3xl tracking-tight sm:text-5xl">
            Đặt hàng thành công<span className="text-gold">!</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-muted">
            Đơn hàng <strong className="text-brand">#{order.id}</strong> đã được
            ghi nhận. Bạn có thể theo dõi quá trình xử lý trong mục đơn hàng của
            mình.
          </p>
        </div>

        <section
          aria-labelledby="order-details-title"
          className="mt-9 overflow-hidden rounded-2xl border border-line bg-white"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-sage/40 p-5 sm:p-7">
            <div>
              <h2 id="order-details-title" className="font-serif text-xl">
                Đơn hàng #{order.id}
              </h2>
              <p className="mt-1 text-xs text-muted">
                {count} cuốn sách
                {order.createdAt && !Number.isNaN(Date.parse(order.createdAt))
                  ? ` · ${new Intl.DateTimeFormat("vi-VN", {
                      dateStyle: "short",
                      timeZone: "Asia/Ho_Chi_Minh",
                    }).format(new Date(order.createdAt))}`
                  : ""}
              </p>
            </div>
            <span className="rounded-full border border-line bg-white px-3 py-2 text-xs font-medium text-brand">
              {formatOrderStatus(order.status)}
            </span>
          </div>

          <div className="p-5 sm:p-7">
            <div className="mb-6 flex gap-3 rounded-xl bg-paper/60 p-4">
              <Icon name="package" className="mt-0.5 size-5 shrink-0 text-brand" />
              <div>
                <h3 className="text-sm font-medium">Địa chỉ nhận sách</h3>
                <p className="mt-1 text-sm leading-6 break-words whitespace-pre-line text-muted">
                  {order.shippingAddress}
                </p>
              </div>
            </div>

            <ul className="divide-y divide-line">
              {order.orderItems.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <Link
                      href={`/products/${item.bookId}`}
                      className="font-serif text-base break-words hover:text-brand"
                    >
                      {item.book?.title ?? `Sách #${item.bookId}`}
                    </Link>
                    <p className="mt-1 text-xs text-muted">
                      {formatPrice(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium">
                    {formatPrice(item.totalPrice)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
              <span className="text-sm font-medium">Tổng đơn hàng</span>
              <span className="text-2xl font-semibold text-brand">
                {formatPrice(order.totalAmount)}
              </span>
            </div>
          </div>
        </section>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/orders#order-history" className="button-primary">
            <Icon name="package" className="size-4" />
            Xem đơn hàng của tôi
          </Link>
          <Link href="/products" className="button-secondary">
            Tiếp tục mua sách
            <Icon name="arrow" className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccess({ orderId }: { orderId: number }) {
  const hydrated = useHydrated();
  const accessToken = useAuthStore((state) => state.accessToken);

  if (!hydrated) return <LoadingOrder />;
  if (!accessToken)
    return (
      <div className="page-shell py-14">
        <EmptyState
          icon="lock"
          title="Đăng nhập để xem đơn hàng"
          description="Thông tin đơn hàng được lưu trong tài khoản đã đặt sách."
          href={`/login?next=${encodeURIComponent(`/orders/${orderId}/success`)}`}
          action="Đăng nhập để tiếp tục"
        />
      </div>
    );

  return <OrderConfirmation key={`${accessToken}:${orderId}`} orderId={orderId} />;
}
