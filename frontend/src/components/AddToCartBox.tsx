"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Book } from "@/lib/types";
import { useCartStore } from "@/stores/cart.store";
import { useAuthStore } from "@/stores/auth.store";
import { notify } from "@/stores/notification.store";
import { errorMessage } from "@/lib/errors";
import Icon from "@/components/Icon";

export default function AddToCartBox({ book }: { book: Book }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const addToCart = useCartStore((state) => state.addToCart);
  const stock = book.stockQuantity ?? 0;

  async function add() {
    if (!useAuthStore.getState().accessToken) {
      notify.info("Bạn đăng nhập để thêm sách vào giỏ hàng nhé.");
      router.push(`/login?next=${encodeURIComponent(`/products/${book.id}`)}`);
      return;
    }
    setStatus("loading");
    try {
      await addToCart(book.id, quantity);
      setStatus("done");
      setMessage(`Đã thêm ${quantity} cuốn sách vào giỏ hàng.`);
      notify.success(`Đã thêm ${quantity} cuốn “${book.title}” vào giỏ hàng.`);
    } catch (error) {
      const message = errorMessage(error, "Chưa thể thêm sách. Bạn thử lại nhé.");
      setStatus("error");
      setMessage(message);
      notify.error(message);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <div className="flex h-12 items-center rounded-xl border border-line bg-white">
          <button
            type="button"
            aria-label="Giảm số lượng"
            onClick={() => {
              setQuantity(quantity - 1);
              setStatus("idle");
            }}
            disabled={quantity <= 1 || status === "loading" || stock <= 0}
            className="icon-button"
          >
            <Icon name="minus" className="size-4" />
          </button>
          <output
            aria-label="Số lượng sách"
            className="w-8 text-center text-sm font-medium"
          >
            {quantity}
          </output>
          <button
            type="button"
            aria-label="Tăng số lượng"
            onClick={() => {
              setQuantity(quantity + 1);
              setStatus("idle");
            }}
            disabled={quantity >= stock || status === "loading" || stock <= 0}
            className="icon-button"
          >
            <Icon name="plus" className="size-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={add}
          disabled={stock <= 0 || status === "loading"}
          className="button-primary flex-1"
        >
          <Icon name={status === "done" ? "check" : "bag"} className="size-4" />
          {stock <= 0
            ? "Tạm hết hàng"
            : status === "loading"
              ? "Đang thêm..."
              : status === "done"
                ? "Thêm một cuốn nữa"
                : "Thêm vào giỏ hàng"}
        </button>
      </div>
      {(status === "done" || status === "error") && (
        <div
          role={status === "error" ? "alert" : "status"}
          className={`mt-4 ${status === "error" ? "notice-error" : "notice-success"}`}
        >
          {message}
          {status === "done" && (
            <Link
              href="/orders"
              className="mt-1 flex items-center gap-2 font-medium underline underline-offset-4"
            >
              Xem giỏ hàng
              <Icon name="arrow" className="size-3.5" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
