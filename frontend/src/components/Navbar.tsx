"use client";

import Link from "next/link";
import { useAuthStore } from "@/stores/auth.store";

export default function Navbar() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <header className="border-b border-[#E4DCC8] bg-[#FAF6EE]">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-serif text-xl font-semibold tracking-tight text-[#1F2321]"
        >
          Hiệu Sách Thuật
        </Link>

        <nav className="flex items-center gap-6 text-sm text-[#1F2321]">
          <Link href="/products" className="hover:text-[#2F4B3C]">
            Sách
          </Link>

          <Link href="/orders" className="relative hover:text-[#2F4B3C]">
            Giỏ hàng
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-[#1F2321]/70">
                Xin chào, {user.firstName} {user.lastName}
              </span>

              <button
                onClick={logout}
                className="rounded-full border border-[#1F2321]/20 px-3 py-1.5 hover:bg-[#1F2321]/5"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="rounded-full border border-[#1F2321]/20 px-3 py-1.5 hover:bg-[#1F2321]/5"
              >
                Đăng nhập
              </Link>

              <Link
                href="/register"
                className="rounded-full bg-[#2F4B3C] px-3 py-1.5 text-[#FAF6EE] hover:bg-[#26392E]"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
