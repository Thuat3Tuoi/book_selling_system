"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Book } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { useCartStore } from "@/stores/cart.store";
import { useAuthStore } from "@/stores/auth.store";
import { notify } from "@/stores/notification.store";
import { errorMessage } from "@/lib/errors";
import BookCover from "@/components/BookCover";
import Icon from "@/components/Icon";

export default function BookCard({ book }: { book: Book }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const addToCart = useCartStore((state) => state.addToCart);
  const outOfStock = book.stockQuantity === 0;

  async function handleAdd() {
    if (!useAuthStore.getState().accessToken) {
      notify.info("Bạn đăng nhập để thêm sách vào giỏ hàng nhé.");
      router.push(`/login?next=${encodeURIComponent(`/products/${book.id}`)}`);
      return;
    }
    setStatus("loading");
    try {
      await addToCart(book.id, 1);
      setStatus("done");
      notify.success(`Đã thêm “${book.title}” vào giỏ hàng.`);
    } catch (error) {
      setStatus("error");
      notify.error(errorMessage(error, "Chưa thể thêm sách. Bạn thử lại nhé."));
    }
  }

  return (
    <article className="group flex min-w-0 flex-col">
      <Link
        href={`/products/${book.id}`}
        aria-label={`Xem sách ${book.title}`}
        className="relative mb-5 flex aspect-[1/1.12] items-center justify-center overflow-hidden rounded-2xl bg-paper p-7 transition-colors group-hover:bg-[#e9eddf] sm:p-9"
      >
        {outOfStock && (
          <span className="absolute top-3 left-3 z-10 rounded-full bg-white/90 px-3 py-1 text-[10px] font-medium text-muted">
            Tạm hết hàng
          </span>
        )}
        <BookCover
          book={book}
          className="h-full max-w-[84%] rounded-r-sm transition-transform duration-500 group-hover:-translate-y-2 group-hover:rotate-2"
        />
        <span className="absolute right-3 bottom-3 flex size-8 items-center justify-center rounded-full bg-white text-brand opacity-0 transition group-hover:opacity-100">
          <Icon name="arrow" className="size-4" />
        </span>
      </Link>
      <p className="mb-2 truncate text-[10px] font-medium tracking-[0.12em] text-gold uppercase">
        {book.category ?? "Tủ sách chọn lọc"}
      </p>
      <Link
        href={`/products/${book.id}`}
        className="transition hover:text-brand"
      >
        <h3 className="line-clamp-2 min-h-12 font-serif text-base leading-6 font-medium sm:text-lg">
          {book.title}
        </h3>
      </Link>
      <p className="mt-2 truncate text-xs text-muted sm:text-sm">
        {book.author ?? "Tác giả đang cập nhật"}
      </p>
      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <span className="text-sm font-semibold text-brand sm:text-base">
          {formatPrice(book.price)}
        </span>
        <button
          type="button"
          onClick={handleAdd}
          disabled={outOfStock || status === "loading"}
          aria-label={
            status === "done"
              ? `Đã thêm ${book.title}`
              : `Thêm ${book.title} vào giỏ`
          }
          className={`flex size-9 shrink-0 items-center justify-center rounded-full border transition disabled:opacity-40 ${status === "done" ? "border-brand bg-brand text-white" : "border-line bg-white text-brand hover:border-brand hover:bg-brand hover:text-white"}`}
        >
          <Icon
            name={status === "done" ? "check" : "plus"}
            className={`size-4 ${status === "loading" ? "animate-pulse" : ""}`}
          />
        </button>
      </div>
      <span
        role="status"
        className={`mt-2 text-xs ${status === "error" ? "text-red-600" : "text-brand"}`}
      >
        {status === "error"
          ? "Chưa thể thêm sách. Hãy thử lại."
          : status === "done"
            ? "Đã thêm vào giỏ hàng"
            : " "}
      </span>
    </article>
  );
}
