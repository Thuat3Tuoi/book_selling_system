"use client";

import Link from "next/link";
import { useState } from "react";
import type { Book } from "@/lib/types";
import Image from "next/image";
import { formatPrice } from "@/lib/format";
import { useCartStore } from "@/stores/cart.store";

enum AddToCartStatus {
  IDLE = "idle",
  LOADING = "loading",
  DONE = "done",
  ERROR = "error",
}

export default function BookCard({ book }: { book: Book }) {
  const [status, setStatus] = useState<AddToCartStatus>(AddToCartStatus.IDLE);

  const outOfStock = book.stockQuantity <= 0;
  const addToCart = useCartStore((state) => state.addToCart);

  const handleAdd = async () => {
    setStatus(AddToCartStatus.LOADING);
    try {
      await addToCart(book.id, 1);
      setStatus(AddToCartStatus.DONE);
    } catch {
      setStatus(AddToCartStatus.ERROR);
    }
  };


  return (
    <div className="flex flex-col overflow-hidden rounded-sm border border-[#E4DCC8] bg-white">
      <Link href={`/products/${book.id}`} className="block">
        <div className="flex aspect-[3/4] items-center justify-center bg-[#EFE9DA] px-4 text-center">
          {book.coverImageUrl ? (
            <Image
              width={200}
              height={300}
              src={book.coverImageUrl}
              alt={`Bìa sách ${book.title}`}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span className="font-serif text-sm leading-snug text-[#1F2321]/50">
              Không có bìa sách
            </span>
          )}
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
            onClick={handleAdd}
            disabled={outOfStock || status === AddToCartStatus.LOADING}
            className="rounded-full bg-[#2F4B3C] px-3 py-1.5 text-xs font-medium text-[#FAF6EE] transition-colors hover:bg-[#26392E] disabled:cursor-not-allowed disabled:bg-[#1F2321]/20"
          >
            {outOfStock
              ? "Hết hàng"
              : status === AddToCartStatus.LOADING
                ? "Đang thêm..."
                : status === AddToCartStatus.DONE
                  ? "Đã thêm ✓"
                  : "Thêm vào giỏ"}
          </button>
        </div>
        {status === AddToCartStatus.ERROR && (
          <p className="text-xs text-red-600">Có lỗi, thử lại nhé.</p>
        )}
      </div>
    </div>
  );
}
