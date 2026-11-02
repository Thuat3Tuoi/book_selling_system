"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { ApiResponse, Book } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { categoryHref } from "@/lib/catalog";
import BookCover from "@/components/BookCover";
import AddToCartBox from "@/components/AddToCartBox";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";

function BookDetail({ id }: { id: number }) {
  const [result, setResult] = useState<{ book: Book | null; loading: boolean }>(
    { book: null, loading: true },
  );
  useEffect(() => {
    if (!Number.isInteger(id) || id <= 0) return;
    const controller = new AbortController();
    api
      .get<ApiResponse<Book>>(`/books/${id}`, {
        signal: controller.signal,
        timeout: 12000,
      })
      .then((response) => {
        if (!controller.signal.aborted)
          setResult({ book: response.data.data, loading: false });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setResult({ book: null, loading: false });
      });
    return () => controller.abort();
  }, [id]);
  if (!Number.isInteger(id) || id <= 0 || (!result.loading && !result.book))
    return (
      <div className="page-shell py-16">
        <EmptyState
          title="Không tìm thấy cuốn sách này"
          description="Sách có thể đang được cập nhật hoặc đã ngừng bán. Bạn thử ghé những ngăn sách khác nhé."
          href="/products"
          action="Quay lại tủ sách"
        />
      </div>
    );
  if (result.loading || !result.book)
    return (
      <div
        className="page-shell grid animate-pulse gap-10 py-12 md:grid-cols-2"
        aria-label="Đang tải thông tin sách"
      >
        <div className="aspect-square rounded-3xl bg-paper" />
        <div className="space-y-6 pt-6">
          <div className="h-4 w-1/3 rounded bg-line" />
          <div className="h-12 w-full rounded bg-line" />
          <div className="h-12 w-3/4 rounded bg-line" />
          <div className="h-8 w-1/3 rounded bg-line" />
        </div>
      </div>
    );
  const book = result.book;
  const stock = book.stockQuantity ?? 0;
  return (
    <div className="page-shell pt-8 pb-16 lg:pb-20">
      <nav
        aria-label="Đường dẫn"
        className="mb-8 flex items-center gap-2 overflow-hidden text-xs text-muted"
      >
        <Link href="/" className="shrink-0 hover:text-brand">
          Trang chủ
        </Link>
        <span>/</span>
        <Link href="/products" className="shrink-0 hover:text-brand">
          Tủ sách
        </Link>
        <span>/</span>
        <span className="truncate text-brand">{book.title}</span>
      </nav>
      <div className="grid gap-9 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
        <div className="relative flex aspect-[1/1.08] items-center justify-center overflow-hidden rounded-3xl bg-paper p-12 sm:p-16">
          <div className="absolute size-[75%] rounded-full bg-[#e4e8db]" />
          <BookCover
            book={book}
            priority
            className="relative z-10 h-full max-w-[80%] -rotate-3 transition-transform duration-500 hover:rotate-0"
          />
          <span className="absolute right-5 bottom-5 z-20 flex items-center gap-2 rounded-full bg-white/85 px-3 py-2 text-[10px] text-brand">
            <Icon name="book" className="size-3.5" />
            Một thế giới trong từng trang sách
          </span>
        </div>
        <div className="self-center">
          <Link
            href={book.category ? categoryHref(book.category) : "/products"}
            className="mb-5 inline-block rounded-full bg-sage px-3.5 py-1.5 text-[11px] font-medium text-brand"
          >
            {book.category ?? "Tủ sách chọn lọc"}
          </Link>
          <h1 className="font-serif text-3xl leading-[1.3] tracking-tight sm:text-4xl">
            {book.title}
          </h1>
          <p className="mt-4 text-sm text-muted">
            Một cuốn sách của{" "}
            <span className="font-medium text-ink">
              {book.author ?? "tác giả đang cập nhật"}
            </span>
          </p>
          <div className="my-7 flex flex-wrap items-center justify-between gap-4 border-y border-line py-6">
            <span className="text-3xl font-semibold tracking-tight text-brand">
              {formatPrice(book.price)}
            </span>
            <span
              className={`flex items-center gap-2 text-xs ${stock > 0 ? "text-brand" : "text-muted"}`}
            >
              <span
                className={`size-1.5 rounded-full ${stock > 0 ? "bg-brand" : "bg-muted"}`}
              />
              {stock > 0 ? `Sẵn sàng trên tủ · ${stock} cuốn` : "Tạm hết hàng"}
            </span>
          </div>
          <p className="mb-4 text-xs font-medium text-muted">
            Số lượng bạn muốn mang về
          </p>
          <AddToCartBox key={book.id} book={book} />
          <div className="mt-7 grid grid-cols-2 gap-4 border-t border-line pt-6 text-xs text-muted">
            <span className="flex items-center gap-2">
              <Icon name="package" className="size-4 text-brand" />
              Đặt hàng trực tuyến
            </span>
            <span className="flex items-center gap-2">
              <Icon name="shield" className="size-4 text-brand" />
              Theo dõi trong tài khoản
            </span>
          </div>
          {book.isbn && (
            <p className="mt-5 text-[11px] tracking-wide text-muted">
              ISBN: {book.isbn}
            </p>
          )}
        </div>
      </div>
      <div className="mt-12 grid gap-8 border-t border-line pt-10 lg:mt-16 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
        <div>
          <p className="eyebrow mb-3">Lật mở những trang đầu</p>
          <h2 className="mb-5 font-serif text-2xl">Về cuốn sách này</h2>
          <p className="whitespace-pre-line text-sm leading-8 text-muted">
            {book.description ||
              "Nội dung giới thiệu đang được bổ sung. Hãy khám phá cuốn sách qua tên tác giả và thể loại yêu thích của bạn."}
          </p>
        </div>
        <div className="rounded-2xl bg-sage/70 p-7">
          <Icon name="leaf" className="mb-4 size-6 text-brand" />
          <p className="font-serif text-2xl leading-relaxed text-brand">
            Đọc một cuốn sách,
            <br />
            gặp một phiên bản mới của mình.
          </p>
          <Link
            href="/products"
            className="mt-5 flex items-center gap-3 text-xs font-medium text-brand"
          >
            Khám phá thêm những cuốn sách khác
            <Icon name="arrow" className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  return <BookDetail key={params.id} id={id} />;
}
