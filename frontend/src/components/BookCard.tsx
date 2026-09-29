"use client";

import Link from "next/link";
import { useState } from "react";
import type { Book } from "@/lib/types";
import { formatPrice } from "@/lib/format";

export default function BookCard({ book }: { book: Book }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );

  const outOfStock = book.stockQuantity <= 0;


  return (
    <div className="flex flex-col overflow-hidden rounded-sm border border-[#E4DCC8] bg-white">
      <Link href={`/products/${book.id}`} className="block">
        <div className="flex aspect-[3/4] items-center justify-center bg-[#EFE9DA] px-4 text-center">
          <span className="font-serif text-sm leading-snug text-[#1F2321]/70">
            {book.title}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link href={`/products/${book.id}`}>
          <h3 className="font-serif text-base font-medium leading-snug text-[#1F2321] hover:text-[#2F4B3C]">
            {book.title}
          </h3>
        </Link>
        {book.author && (
          <p className="text-sm text-[#1F2321]/60">{book.author}</p>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-medium text-[#2F4B3C]">
            {formatPrice(book.price)}
          </span>
          <button
            // onClick={handleAdd}
            disabled={outOfStock || status === "loading"}
            className="rounded-full bg-[#2F4B3C] px-3 py-1.5 text-xs font-medium text-[#FAF6EE] transition-colors hover:bg-[#26392E] disabled:cursor-not-allowed disabled:bg-[#1F2321]/20"
          >
            {outOfStock
              ? "Hết hàng"
              : status === "loading"
                ? "Đang thêm..."
                : status === "done"
                  ? "Đã thêm ✓"
                  : "Thêm vào giỏ"}
          </button>
        </div>
        {status === "error" && (
          <p className="text-xs text-red-600">Có lỗi, thử lại nhé.</p>
        )}
      </div>
    </div>
  );
}
