"use client";

import { useState } from "react";

import type { Book } from "@/lib/types";

export default function AddToCartBox({ book }: { book: Book }) {
  const [quantity, setQuantity] = useState(1);

  const outOfStock = book.stockQuantity <= 0;
  const maxQuantity = Math.min(book.stockQuantity, 20);

  if (outOfStock) {
    return (
      <p className="rounded-sm border border-[#E4DCC8] bg-white px-4 py-3 text-sm text-[#1F2321]/60">
        Sách tạm hết hàng.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Quantity */}
      <div className="flex items-center rounded-full border border-[#E4DCC8]">
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          className="px-3 py-2 text-[#1F2321] hover:text-[#2F4B3C]"
          aria-label="Giảm số lượng"
        >
          −
        </button>

        <span className="w-8 text-center text-sm">
          {quantity}
        </span>

        <button
          type="button"
          onClick={() =>
            setQuantity((q) => Math.min(maxQuantity, q + 1))
          }
          className="px-3 py-2 text-[#1F2321] hover:text-[#2F4B3C]"
          aria-label="Tăng số lượng"
        >
          +
        </button>
      </div>

      {/* Add to cart */}
      <button
        type="button"
        className="rounded-full bg-[#2F4B3C] px-6 py-2.5 text-sm font-medium text-[#FAF6EE] transition-colors hover:bg-[#26392E]"
      >
        Thêm vào giỏ
      </button>
    </div>
  );
}

