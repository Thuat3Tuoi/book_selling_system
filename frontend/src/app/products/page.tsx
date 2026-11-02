import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import ProductsGrid from "@/components/ProductsGrid";
import Icon from "@/components/Icon";

export const metadata: Metadata = { title: "Khám phá tủ sách" };

export default function ProductsPage() {
  return (
    <div className="page-shell pt-8 pb-16 lg:pt-10 lg:pb-20">
      <div className="mb-8 flex items-center gap-2 text-xs text-muted">
        <Link href="/" className="hover:text-brand">
          Trang chủ
        </Link>
        <span>/</span>
        <span className="text-brand">Tủ sách</span>
      </div>
      <div className="mb-10 flex items-end justify-between gap-5 border-b border-line pb-8">
        <div>
          <p className="eyebrow mb-3">Mỗi cuốn sách, một cuộc gặp gỡ</p>
          <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">
            Tìm một cuốn sách hay.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted">
            Từ những câu chuyện chạm đến trái tim đến những ý tưởng mở rộng tâm
            trí. Cuốn sách dành cho bạn đang ở đây.
          </p>
        </div>
        <span className="hidden size-20 items-center justify-center rounded-full border border-brand/15 text-brand sm:flex">
          <Icon name="book" className="size-8" />
        </span>
      </div>
      <Suspense
        fallback={
          <div
            className="h-96 animate-pulse rounded-2xl bg-paper"
            aria-label="Đang tải tủ sách"
          />
        }
      >
        <ProductsGrid />
      </Suspense>
    </div>
  );
}
