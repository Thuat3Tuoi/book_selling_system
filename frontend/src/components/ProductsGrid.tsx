"use client";

import { useMemo, useState } from "react";
import type { Book } from "@/lib/types";
import BookCard from "@/components/BookCard";

export default function ProductsGrid({ books }: { books: Book[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return books;
    return books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        (b.author ?? "").toLowerCase().includes(q)
    );
  }, [books, query]);

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Tìm theo tên sách hoặc tác giả..."
        className="mb-6 w-full max-w-sm rounded-sm border border-[#E4DCC8] bg-white px-3 py-2 text-sm outline-none focus:border-[#2F4B3C]"
      />

      {filtered.length === 0 ? (
        <p className="rounded-sm border border-[#E4DCC8] bg-white p-4 text-sm text-[#1F2321]/70">
          Không tìm thấy sách phù hợp.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
