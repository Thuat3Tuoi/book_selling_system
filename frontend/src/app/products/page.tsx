"use client";

import { useEffect } from "react";

import ProductsGrid from "@/components/ProductsGrid";
import { useBookStore } from "@/stores/product.store";


export default function ProductsPage() {
  const {
    books,
    getBooks,
  } = useBookStore();

  useEffect(() => {
    getBooks();
  }, [getBooks]);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <h1 className="mb-6 font-serif text-3xl font-medium text-[#1F2321]">
        Tất cả sách
      </h1>

        <ProductsGrid books={books} />
    </div>
  );
}
