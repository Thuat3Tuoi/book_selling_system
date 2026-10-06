"use client";

import { useEffect, useState } from "react";

import ProductsGrid from "@/components/ProductsGrid";
import { useBookStore } from "@/stores/product.store";

export default function ProductsPage() {
  const { books, meta, getBooks } = useBookStore();

  const [page, setPage] = useState(1);

  const limit = 4;

  useEffect(() => {
    getBooks(page, limit);
  }, [page, getBooks]);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <h1 className="mb-6 font-serif text-3xl font-medium text-[#1F2321]">
        Tất cả sách
      </h1>

      <ProductsGrid books={books} />

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2">
          {/* Previous */}
          <button
            onClick={() => setPage((prev) => prev - 1)}
            disabled={page === 1}
            className="rounded border border-[#E4DCC8] px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Trước
          </button>

          {/* Page numbers */}
          {Array.from({ length: meta.totalPages }, (_, index) => index + 1).map(
            (pageNumber) => (
              <button
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                className={`rounded border px-4 py-2 ${
                  page === pageNumber
                    ? "border-[#2F4B3C] bg-[#2F4B3C] text-white"
                    : "border-[#E4DCC8] text-[#1F2321]"
                }`}
              >
                {pageNumber}
              </button>
            ),
          )}

          {/* Next */}
          <button
            onClick={() => setPage((prev) => prev + 1)}
            disabled={page === meta.totalPages}
            className="rounded border border-[#E4DCC8] px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
}
