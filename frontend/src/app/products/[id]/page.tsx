"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { formatPrice } from "@/lib/format";
import { useBookStore } from "@/stores/product.store";
import { useCartStore } from "@/stores/cart.store";
import Image from "next/image";

export default function ProductDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const { selectedBook, loading, getBook } = useBookStore();
  const { addToCart } = useCartStore();

  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (Number.isInteger(id)) {
      getBook(id);
    }
  }, [id, getBook]);

  // Giảm số lượng
  const handleDecrease = () => {
    setQuantity((current) => Math.max(1, current - 1));
  };

  // Tăng số lượng
  const handleIncrease = () => {
    if (!selectedBook) return;

    setQuantity((current) => Math.min(selectedBook.stockQuantity, current + 1));
  };

  // Thêm vào giỏ hàng
  const handleAddToCart = async () => {
    if (!selectedBook) return;

    try {
      setAdding(true);
      setMessage("");

      // POST /cart/items
      await addToCart(selectedBook.id, quantity);

      setMessage(
        `Đã thêm ${quantity} cuốn "${selectedBook.title}" vào giỏ hàng.`,
      );
    } catch (error) {
      console.error("Không thể thêm sách vào giỏ hàng:", error);

      setMessage("Không thể thêm sách vào giỏ hàng.");
    } finally {
      setAdding(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <p className="text-[#1F2321]/60">Đang tải thông tin sách...</p>
      </div>
    );
  }

  // Không tìm thấy sách
  if (!selectedBook) {
    return (
      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <Link
          href="/products"
          className="text-sm text-[#1F2321]/60 hover:text-[#2F4B3C]"
        >
          ← Quay lại danh sách sách
        </Link>

        <p className="mt-6 text-[#1F2321]/60">Không tìm thấy sách.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      {/* Back */}
      <Link
        href="/products"
        className="text-sm text-[#1F2321]/60 hover:text-[#2F4B3C]"
      >
        ← Quay lại danh sách sách
      </Link>

      {/* Product detail */}
      <div className="mt-6 grid gap-10 sm:grid-cols-[280px_1fr]">
        {/* Book cover */}
        <div className="flex aspect-[3/4] items-center justify-center rounded-sm bg-[#EFE9DA] px-6 text-center">
          {/* <span className="font-serif text-lg leading-snug text-[#1F2321]/70"> */}
          <Image
                        width={200}
                        height={300}
                        src={selectedBook.coverImageUrl}
                        alt={`Bìa sách ${selectedBook.title}`}
                        className="max-h-full max-w-full object-contain"
                      />
          {/* </span> */}
        </div>

        {/* Information */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="font-serif text-3xl font-medium text-[#1F2321]">
              {selectedBook.title}
            </h1>

            <p className="mt-1 text-[#1F2321]/60">{selectedBook.author}</p>
          </div>

          {/* Price */}
          <p className="text-2xl font-medium text-[#2F4B3C]">
            {formatPrice(selectedBook.price)}
          </p>

          {/* Stock */}
          <p className="text-sm text-[#1F2321]/60">
            {selectedBook.stockQuantity > 0
              ? `Còn ${selectedBook.stockQuantity} cuốn trong kho`
              : "Hết hàng"}
          </p>

          {/* Quantity + Add to cart */}
          <div className="mt-2 flex items-center gap-3">
            {/* Quantity */}
            <div className="flex items-center border border-[#E4DCC8]">
              <button
                type="button"
                onClick={handleDecrease}
                disabled={quantity <= 1 || adding}
                className="px-4 py-2 text-[#1F2321]/60 hover:bg-[#EFE9DA] disabled:cursor-not-allowed disabled:opacity-40"
              >
                −
              </button>

              <span className="min-w-10 text-center">{quantity}</span>

              <button
                type="button"
                onClick={handleIncrease}
                disabled={quantity >= selectedBook.stockQuantity || adding}
                className="px-4 py-2 text-[#1F2321]/60 hover:bg-[#EFE9DA] disabled:cursor-not-allowed disabled:opacity-40"
              >
                +
              </button>
            </div>

            {/* Add to cart */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={selectedBook.stockQuantity <= 0 || adding}
              className="rounded-sm bg-[#2F4B3C] px-6 py-2.5 text-sm text-white hover:bg-[#243c30] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {adding ? "Đang thêm..." : "Thêm vào giỏ hàng"}
            </button>
          </div>

          {/* Message */}
          {message && (
            <div className="flex items-center justify-between rounded-sm bg-[#EFE9DA] px-4 py-3 text-sm text-[#2F4B3C]">
              <span>{message}</span>

              <Link href="/orders" className="font-medium hover:underline">
                Xem giỏ hàng →
              </Link>
            </div>
          )}

          {/* Description */}
          <div className="mt-4 border-t border-[#E4DCC8] pt-4">
            <h2 className="mb-2 font-serif text-lg font-medium text-[#1F2321]">
              Giới thiệu
            </h2>

            <p className="whitespace-pre-line text-[#1F2321]/80">
              {selectedBook.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
