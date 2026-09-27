"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();

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
            {totalItems > 0 && (
              <span className="absolute -right-3 -top-2 rounded-full bg-[#C99A3B] px-1.5 py-0.5 text-[10px] font-medium text-white">
                {totalItems}
              </span>
            )}
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
