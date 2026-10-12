
"use client";

import { useEffect, useState } from "react";
import type { Book } from "@/lib/types";
import BookCard from "@/components/BookCard";
import { useBookStore } from "@/stores/product.store";


export default function ProductsGrid({
  books,
}: {
  books: Book[];
}) {
  const [query, setQuery] = useState("");

  const {
    searchResults,
    searchMeta,
    searchLoading,
    searchBooks,
    clearSearch,
  } = useBookStore();

  useEffect(() => {
    const q = query.trim();

    if (!q) {
      clearSearch();
      return;
    }

    const timer = setTimeout(() => {
      searchBooks(q, 1, 10).catch((error) => {
        console.error("Lỗi tìm kiếm sách:", error);
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchBooks, clearSearch]);

  // null nghĩa là chưa tìm kiếm, dùng danh sách thông thường
  const displayedBooks = searchResults ?? books;

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Tìm theo tên sách hoặc tác giả..."
        className="mb-6 w-full max-w-sm rounded-sm border border-[#E4DCC8] bg-white px-3 py-2 text-sm outline-none focus:border-[#2F4B3C]"
      />

      {searchLoading && (
        <p className="mb-4 text-sm text-[#1F2321]/70">
          Đang tìm kiếm sách...
        </p>
      )}

      {!searchLoading && searchResults !== null && (
        <p className="mb-4 text-sm text-[#1F2321]/70">
          Tìm thấy {searchMeta?.totalHits ?? 0} kết quả
          {searchMeta && (
            <> trong {searchMeta.processingTimeMs} ms</>
          )}
        </p>
      )}

      {displayedBooks.length === 0 ? (
        <p className="rounded-sm border border-[#E4DCC8] bg-white p-4 text-sm text-[#1F2321]/70">
          Không tìm thấy sách phù hợp.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {displayedBooks.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}

