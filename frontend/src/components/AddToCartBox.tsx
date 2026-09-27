"use client";

import { useState } from "react";
import type { Book } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

export default function AddToCartBox({ book }: { book: Book }) {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );

  const outOfStock = book.stockQuantity <= 0;
  const maxQuantity = Math.min(book.stockQuantity, 20);

  async function handleAdd() {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setStatus("loading");
    try {
      await addToCart(book.id, quantity);
      setStatus("done");
      setTimeout(() => setStatus("idle"), 1500);
    } catch {
      setStatus("error");
    }
  }

  if (outOfStock) {
    return (
      <p className="rounded-sm border border-[#E4DCC8] bg-white px-4 py-3 text-sm text-[#1F2321]/60">
        Sách tạm hết hàng.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex items-center rounded-full border border-[#E4DCC8]">
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          className="px-3 py-2 text-[#1F2321] hover:text-[#2F4B3C]"
          aria-label="Giảm số lượng"
        >
          −
        </button>
        <span className="w-8 text-center text-sm">{quantity}</span>
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
          className="px-3 py-2 text-[#1F2321] hover:text-[#2F4B3C]"
          aria-label="Tăng số lượng"
        >
          +
        </button>
      </div>

      <button
        onClick={handleAdd}
        disabled={status === "loading"}
        className="rounded-full bg-[#2F4B3C] px-6 py-2.5 text-sm font-medium text-[#FAF6EE] transition-colors hover:bg-[#26392E] disabled:opacity-60"
      >
        {status === "loading"
          ? "Đang thêm..."
          : status === "done"
            ? "Đã thêm vào giỏ ✓"
            : "Thêm vào giỏ"}
      </button>

      {status === "error" && (
        <p className="text-xs text-red-600">
          Có lỗi khi thêm vào giỏ, thử lại nhé.
        </p>
      )}
    </div>
  );
}
