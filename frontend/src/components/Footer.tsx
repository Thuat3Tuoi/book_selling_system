"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import { categoryHref } from "@/lib/catalog";
import { useBookCategories } from "@/stores/category.store";

export default function Footer() {
  const { categories } = useBookCategories();
  return (
    <footer className="mt-auto border-t border-line bg-[#f0f0e9]">
      <div className="page-shell grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr] lg:py-16">
        <div>
          <Link href="/" className="flex items-center gap-3">
            <Icon name="book" className="size-7 text-brand" />
            <span className="font-serif text-2xl font-semibold">
              Book Store<span className="text-gold">.</span>
            </span>
          </Link>
          <p className="mt-5 max-w-xs text-sm leading-7 text-muted">
            Một nơi để tìm thấy cuốn sách bạn cần,
            <br />
            và cả những cuốn bạn chưa biết mình sẽ yêu.
          </p>
        </div>
        <div>
          <h2 className="mb-5 text-xs font-semibold tracking-widest uppercase">
            Dạo quanh hiệu sách
          </h2>
          <div className="flex flex-col items-start gap-3.5 text-sm text-muted">
            <Link href="/products" className="hover:text-brand">
              Tất cả sách
            </Link>
            {categories.slice(0, 3).map((category) => (
              <Link
                key={category}
                href={categoryHref(category)}
                className="hover:text-brand"
              >
                {category}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-5 text-xs font-semibold tracking-widest uppercase">
            Góc của bạn
          </h2>
          <div className="flex flex-col items-start gap-3.5 text-sm text-muted">
            <Link href="/orders" className="hover:text-brand">
              Giỏ hàng & đơn hàng
            </Link>
            <Link href="/login" className="hover:text-brand">
              Đăng nhập
            </Link>
            <Link href="/register" className="hover:text-brand">
              Trở thành bạn đọc
            </Link>
          </div>
        </div>
      </div>
      <div className="page-shell flex flex-col justify-between gap-3 border-t border-ink/10 py-5 text-[11px] text-muted sm:flex-row">
        <p>
          © {new Date().getFullYear()} Book Store. Được làm từ tình yêu với
          sách.
        </p>
        <p className="flex items-center gap-2">
          <Icon name="leaf" className="size-3.5 text-brand" />
          Đọc chậm, nghĩ sâu, sống phong phú.
        </p>
      </div>
    </footer>
  );
}
