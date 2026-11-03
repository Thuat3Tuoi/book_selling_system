"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatOrderStatus, formatPrice } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import { useHydrated } from "@/lib/use-hydrated";
import { useAuthStore } from "@/stores/auth.store";
import { useCartStore } from "@/stores/cart.store";
import { useOrderStore } from "@/stores/order.store";
import { notify } from "@/stores/notification.store";
import { OrderStatus } from "@/lib/types";
import Icon from "@/components/Icon";
import BookCover from "@/components/BookCover";
import EmptyState from "@/components/EmptyState";

const statusColors: Record<OrderStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800",
  CONFIRMED: "bg-sky-50 text-sky-700",
  SHIPPING: "bg-indigo-50 text-indigo-700",
  COMPLETED: "bg-sage text-brand",
  CANCELLED: "bg-red-50 text-red-700",
};

function LoadingCart() {
  return (
    <div
      className="page-shell animate-pulse py-12"
      aria-label="Đang tải giỏ hàng"
    >
      <div className="mb-8 h-10 w-64 rounded-lg bg-line" />
      <div className="grid gap-8 lg:grid-cols-[1fr_350px]">
        <div className="h-80 rounded-2xl bg-paper" />
        <div className="h-80 rounded-2xl bg-paper" />
      </div>
    </div>
  );
}

function AuthenticatedOrders({ defaultAddress }: { defaultAddress: string }) {
  const router = useRouter();
  const { cart, getCart, updateQuantity, removeFromCart, clearCart } =
    useCartStore();
  const { orders, creating, getOrders, createOrder } = useOrderStore();
  const [address, setAddress] = useState(defaultAddress);
  const [initializing, setInitializing] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [pendingItem, setPendingItem] = useState<number | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState("");
  const [addressError, setAddressError] = useState("");
  const placingOrder = creating || redirecting;

  useEffect(() => {
    let active = true;
    Promise.all([getCart(), getOrders()])
      .then(() => {
        if (active) setInitializing(false);
      })
      .catch(() => {
        if (active) {
          setLoadFailed(true);
          setInitializing(false);
        }
      });
    return () => {
      active = false;
    };
  }, [getCart, getOrders, retry]);

  const items = cart?.cartItems ?? [];
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce(
    (sum, item) => sum + Number(item.book.price) * item.quantity,
    0,
  );

  async function cartAction(
    id: number,
    action: () => Promise<void>,
    successMessage: string,
  ) {
    if (pendingItem !== null || placingOrder) return;
    setPendingItem(id);
    setError("");
    try {
      await action();
      notify.success(successMessage);
    } catch (error) {
      const message = errorMessage(
        error,
        "Chưa thể cập nhật giỏ hàng. Bạn thử lại nhé.",
      );
      setError(message);
      notify.error(message);
    } finally {
      setPendingItem(null);
    }
  }

  async function placeOrder() {
    if (!items.length || placingOrder || pendingItem !== null) return;
    if (address.trim().length < 10) {
      const message = "Bạn điền địa chỉ nhận sách đầy đủ, ít nhất 10 ký tự nhé.";
      setAddressError(message);
      notify.error(message);
      return;
    }
    setAddressError("");
    setError("");
    try {
      const order = await createOrder(
        address.trim(),
        items.map((item) => ({
          bookId: item.book.id,
          quantity: item.quantity,
        })),
      );
      setRedirecting(true);
      clearCart();
      notify.success(`Đặt hàng thành công! Mã đơn hàng của bạn là #${order.id}.`);
      router.replace(`/orders/${order.id}/success`);
    } catch (error) {
      const message = errorMessage(
        error,
        "Chưa thể đặt hàng. Bạn kiểm tra lại giỏ sách rồi thử nhé.",
      );
      setError(message);
      notify.error(message);
    }
  }

  if (initializing) return <LoadingCart />;
  if (loadFailed)
    return (
      <div className="page-shell py-14">
        <EmptyState
          icon="bag"
          title="Chưa thể mở giỏ sách"
          description="Kết nối có thể đang gián đoạn hoặc phiên đăng nhập đã hết hạn. Bạn hãy thử lại hoặc đăng nhập lại nhé."
          href="/login?next=%2Forders"
          action="Đăng nhập lại"
        />
        <div className="mt-4 text-center">
          <button
            className="button-secondary"
            onClick={() => {
              setInitializing(true);
              setLoadFailed(false);
              setRetry(retry + 1);
            }}
          >
            Thử tải lại
          </button>
        </div>
      </div>
    );

  return (
    <div className="page-shell pt-8 pb-16 lg:pb-20">
      <div className="mb-8 flex items-center gap-2 text-xs text-muted">
        <Link href="/" className="hover:text-brand">
          Trang chủ
        </Link>
        <span>/</span>
        <span className="text-brand">Góc của bạn</span>
      </div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">Những cuốn sách sắp về nhà</p>
          <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">
            Giỏ sách của bạn<span className="text-gold">.</span>
          </h1>
          <p className="mt-3 text-sm text-muted">
            {count
              ? `${count} cuốn sách, thêm một chút cảm hứng cho mỗi ngày.`
              : "Chọn một cuốn sách, bắt đầu một hành trình mới."}
          </p>
        </div>
        <a
          href="#order-history"
          className="flex items-center gap-2 text-xs font-medium text-brand"
        >
          Đơn hàng của tôi
          <Icon name="arrow" className="size-4" />
        </a>
      </div>
      {error && (
        <p className="notice-error mb-6" role="alert">
          {error}
        </p>
      )}
      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_350px] lg:gap-9">
        <div>
          {items.length === 0 ? (
            <EmptyState
              icon="bag"
              title="Giỏ sách đang chờ bạn"
              description="Có một cuốn sách dành riêng cho những ngày bạn muốn khám phá điều gì đó mới. Cùng tìm nhé?"
              href="/products"
              action="Dạo quanh tủ sách"
            />
          ) : (
            <div className="divide-y divide-line rounded-2xl border border-line bg-white px-5 sm:px-6">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="relative flex gap-4 py-6 sm:gap-6"
                >
                  <Link
                    href={`/products/${item.book.id}`}
                    className="flex h-28 w-20 shrink-0 items-center justify-center rounded-lg bg-paper p-2.5"
                  >
                    <BookCover book={item.book} className="h-full max-w-full" />
                  </Link>
                  <div className="min-w-0 flex-1 pr-6">
                    <Link
                      href={`/products/${item.book.id}`}
                      className="line-clamp-2 font-serif text-base leading-6 font-medium hover:text-brand sm:text-lg"
                    >
                      {item.book.title}
                    </Link>
                    {item.book.author && (
                      <p className="mt-1 truncate text-xs text-muted">
                        {item.book.author}
                      </p>
                    )}
                    <p className="mt-2 text-sm font-medium text-brand">
                      {formatPrice(item.book.price)}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center rounded-lg border border-line">
                        <button
                          aria-label={`Giảm số lượng ${item.book.title}`}
                          onClick={() =>
                            cartAction(
                              item.id,
                              () => updateQuantity(item.id, item.quantity - 1),
                              `Đã cập nhật “${item.book.title}” thành ${item.quantity - 1} cuốn.`,
                            )
                          }
                          disabled={
                            item.quantity <= 1 ||
                            pendingItem !== null ||
                            placingOrder
                          }
                          className="icon-button size-8! rounded-lg!"
                        >
                          <Icon name="minus" className="size-3.5" />
                        </button>
                        <span className="w-7 text-center text-xs font-medium">
                          {item.quantity}
                        </span>
                        <button
                          aria-label={`Tăng số lượng ${item.book.title}`}
                          onClick={() =>
                            cartAction(
                              item.id,
                              () => updateQuantity(item.id, item.quantity + 1),
                              `Đã cập nhật “${item.book.title}” thành ${item.quantity + 1} cuốn.`,
                            )
                          }
                          disabled={
                            item.quantity >= item.book.stockQuantity ||
                            pendingItem !== null ||
                            placingOrder
                          }
                          className="icon-button size-8! rounded-lg!"
                        >
                          <Icon name="plus" className="size-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-ink">
                        {formatPrice(Number(item.book.price) * item.quantity)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      cartAction(
                        item.id,
                        () => removeFromCart(item.id),
                        `Đã xóa “${item.book.title}” khỏi giỏ hàng.`,
                      )
                    }
                    disabled={pendingItem !== null || placingOrder}
                    aria-label={`Xóa ${item.book.title} khỏi giỏ hàng`}
                    className="absolute top-5 right-0 flex size-7 items-center justify-center rounded-lg text-muted/70 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                  >
                    <Icon name="trash" className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <Link
            href="/products"
            className="mt-6 inline-flex items-center gap-2 text-xs font-medium text-brand"
          >
            <Icon name="back" className="size-4" />
            Tiếp tục khám phá sách
          </Link>
        </div>
        <aside className="rounded-2xl border border-line bg-white p-6 lg:sticky lg:top-28">
          <h2 className="font-serif text-2xl">Mang sách về nhà</h2>
          <p className="mt-2 text-xs leading-6 text-muted">
            Thêm địa chỉ, kiểm tra giỏ sách và hoàn tất đặt hàng.
          </p>
          <div className="my-5 flex items-center justify-between border-y border-line py-4 text-sm">
            <span className="text-muted">
              Tạm tính <span className="text-xs">({count} cuốn)</span>
            </span>
            <span className="font-medium">{formatPrice(total)}</span>
          </div>
          <label className="field-label">
            Địa chỉ nhận sách
            <textarea
              rows={3}
              autoComplete="street-address"
              value={address}
              disabled={placingOrder}
              onChange={(event) => {
                setAddress(event.target.value);
                setAddressError("");
              }}
              aria-invalid={Boolean(addressError)}
              aria-describedby={addressError ? "shipping-error" : undefined}
              placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố..."
              className="field resize-y font-normal"
            />
            {addressError && (
              <span
                id="shipping-error"
                className="text-xs font-normal leading-5 text-red-600"
              >
                {addressError}
              </span>
            )}
          </label>
          <div className="mt-6 flex items-center justify-between">
            <span className="text-sm font-medium">Tổng đơn hàng</span>
            <span className="text-2xl font-semibold tracking-tight text-brand">
              {formatPrice(total)}
            </span>
          </div>
          <button
            onClick={placeOrder}
            disabled={!items.length || placingOrder || pendingItem !== null}
            className="button-primary mt-5 w-full"
          >
            {placingOrder ? "Đang đặt hàng..." : "Đặt hàng"}
            <Icon name="arrow" className="ml-auto size-4" />
          </button>
          <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-muted">
            <Icon
              name="shield"
              className="mt-0.5 size-3.5 shrink-0 text-brand"
            />
            Thông tin đơn hàng sẽ được lưu trong tài khoản của bạn.
          </p>
        </aside>
      </div>
      <section id="order-history" className="mt-16 border-t border-line pt-10">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-3">Những hành trình của sách</p>
            <h2 className="font-serif text-3xl tracking-tight">
              Đơn hàng của bạn
            </h2>
          </div>
          <span className="rounded-full bg-sage px-3 py-1.5 text-xs font-medium text-brand">
            {orders.length} đơn hàng
          </span>
        </div>
        {!orders.length ? (
          <EmptyState
            icon="package"
            title="Chưa có hành trình nào bắt đầu"
            description="Đơn hàng đầu tiên sẽ xuất hiện tại đây sau khi bạn đặt sách."
            href="/products"
            action="Tìm một cuốn sách hay"
          />
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <details
                key={order.id}
                className="group rounded-2xl border border-line bg-white"
              >
                <summary className="flex list-none flex-wrap items-center justify-between gap-4 p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-paper text-brand">
                      <Icon name="package" className="size-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">
                        Đơn hàng #{order.id}
                      </span>
                      <span className="mt-1 block text-xs text-muted">
                        {order.createdAt &&
                        !Number.isNaN(Date.parse(order.createdAt))
                          ? new Intl.DateTimeFormat("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            }).format(new Date(order.createdAt))
                          : "Đơn hàng của bạn"}{" "}
                        ·{" "}
                        {order.orderItems?.reduce(
                          (sum, item) => sum + item.quantity,
                          0,
                        ) ?? 0}{" "}
                        cuốn sách
                      </span>
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-3 sm:gap-6">
                    <span
                      className={`rounded-full px-3 py-1.5 text-[10px] font-medium ${statusColors[order.status] ?? "bg-paper text-ink"}`}
                    >
                      {formatOrderStatus(order.status)}
                    </span>
                    <span className="text-sm font-semibold text-brand">
                      {formatPrice(order.totalAmount)}
                    </span>
                    <Icon
                      name="chevron"
                      className="size-4 text-muted transition group-open:rotate-180"
                    />
                  </span>
                </summary>
                <div className="mx-5 border-t border-line py-5 sm:mx-6">
                  <p className="mb-4 text-xs leading-6 text-muted">
                    <span className="font-medium text-ink">Địa chỉ nhận: </span>
                    {order.shippingAddress}
                  </p>
                  <div className="space-y-3">
                    {order.orderItems?.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between gap-4 text-sm"
                      >
                        <Link
                          href={`/products/${item.bookId}`}
                          className="text-muted hover:text-brand"
                        >
                          {item.book?.title ?? `Sách #${item.bookId}`}{" "}
                          <span className="ml-1 text-xs">
                            × {item.quantity}
                          </span>
                        </Link>
                        <span className="shrink-0 text-ink">
                          {formatPrice(item.totalPrice)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function OrdersPage() {
  const hydrated = useHydrated();
  const { accessToken, user } = useAuthStore();
  if (!hydrated) return <LoadingCart />;
  if (!accessToken)
    return (
      <div className="page-shell py-14 lg:py-20">
        <EmptyState
          icon="bag"
          title="Một góc riêng cho giỏ sách của bạn"
          description="Đăng nhập để chọn sách, lưu giỏ hàng và theo dõi những đơn hàng của mình."
          href="/login?next=%2Forders"
          action="Đăng nhập để tiếp tục"
        />
        <p className="mt-6 text-center text-sm text-muted">
          Chưa có tài khoản?{" "}
          <Link
            href="/register"
            className="font-medium text-brand hover:underline"
          >
            Ghé vào đăng ký nhé.
          </Link>
        </p>
      </div>
    );
  return (
    <AuthenticatedOrders
      key={accessToken}
      defaultAddress={user?.address ?? ""}
    />
  );
}
