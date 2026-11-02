"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useCartStore } from "@/stores/cart.store";
import { notify } from "@/stores/notification.store";
import { useHydrated } from "@/lib/use-hydrated";
import Icon from "@/components/Icon";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const { user, accessToken, logout } = useAuthStore();
  const { cart, getCart, clearCart } = useCartStore();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const authenticated = hydrated && Boolean(accessToken);
  const count = authenticated
    ? (cart?.cartItems ?? []).reduce((total, item) => total + item.quantity, 0)
    : 0;

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      clearCart();
      return;
    }
    if (pathname !== "/orders") void getCart().catch(() => {});
  }, [hydrated, accessToken, pathname, getCart, clearCart]);

  async function handleLogout() {
    setSigningOut(true);
    try {
      await logout();
      notify.success("Bạn đã đăng xuất.");
    } catch {
      notify.info(
        "Bạn đã đăng xuất trên thiết bị này. Kết nối đến máy chủ đang gián đoạn.",
      );
    } finally {
      clearCart();
      setSigningOut(false);
      setOpen(false);
      router.push("/");
    }
  }

  const links = [
    { href: "/", label: "Trang chủ" },
    { href: "/products", label: "Khám phá sách" },
    { href: "/orders", label: "Đơn hàng của tôi" },
  ];
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <div className="border-b border-line bg-paper/70">
        <div className="page-shell flex min-h-8 items-center justify-center gap-2 text-[10px] tracking-wide text-brand sm:justify-between sm:text-[11px]">
          <span className="flex items-center gap-2">
            <Icon name="leaf" className="size-3" />
            Một cuốn sách hay, một thế giới mới.
          </span>
          <span className="hidden sm:block">
            Chậm lại một chút. Đọc thêm một trang.
          </span>
        </div>
      </div>
      <header className="sticky top-0 z-40 border-b border-line bg-background/95 backdrop-blur-xl">
        <div className="page-shell flex h-20 items-center justify-between gap-4">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            aria-label="Book Store — Trang chủ"
            className="flex shrink-0 items-center gap-3"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand text-white">
              <Icon name="book" className="size-6" />
            </span>
            <span>
              <span className="block font-serif text-lg leading-6 font-semibold tracking-tight sm:text-xl">
                Book Store<span className="text-gold">.</span>
              </span>
              <span className="hidden text-[9px] tracking-[0.2em] text-muted uppercase sm:block">
                Một góc nhỏ cho người yêu sách
              </span>
            </span>
          </Link>
          <nav
            aria-label="Điều hướng chính"
            className="hidden items-center gap-1 lg:flex"
          >
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={active(href) ? "page" : undefined}
                className={`rounded-lg px-4 py-2.5 text-[13px] font-medium transition ${active(href) ? "bg-sage text-brand" : "text-muted hover:text-brand"}`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1 sm:gap-3">
            <Link
              href="/products"
              aria-label="Tìm kiếm sách"
              className="icon-button hidden sm:flex"
            >
              <Icon name="search" />
            </Link>
            <Link
              href="/orders"
              aria-label={`Giỏ hàng${count ? `, ${count} cuốn sách` : ""}`}
              className="icon-button relative"
            >
              <Icon name="bag" />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex min-w-4.5 items-center justify-center rounded-full bg-brand px-1 text-[9px] leading-4.5 font-semibold text-white">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
            <span className="mx-1 hidden h-6 w-px bg-line sm:block" />
            {authenticated ? (
              <div className="hidden items-center gap-2 sm:flex">
                <span className="flex size-8 items-center justify-center rounded-full bg-sage text-xs font-semibold text-brand">
                  {user?.firstName?.charAt(0) ?? "B"}
                </span>
                <span className="max-w-24 truncate text-xs font-medium">
                  {user?.firstName ?? "Bạn đọc"}
                </span>
                <button
                  onClick={handleLogout}
                  disabled={signingOut}
                  aria-label="Đăng xuất"
                  className="icon-button"
                >
                  <Icon name="logout" className="size-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden items-center gap-2 text-xs font-medium text-brand sm:inline-flex"
              >
                <Icon name="user" className="size-4" />
                Đăng nhập
              </Link>
            )}
            <button
              type="button"
              aria-label={open ? "Đóng menu" : "Mở menu"}
              aria-expanded={open}
              aria-controls="mobile-navigation"
              onClick={() => setOpen(!open)}
              className="icon-button lg:hidden"
            >
              <Icon name={open ? "close" : "menu"} />
            </button>
          </div>
        </div>
        {open && (
          <nav
            id="mobile-navigation"
            aria-label="Điều hướng trên điện thoại"
            className="border-t border-line bg-background px-5 py-4 lg:hidden"
          >
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active(href) ? "page" : undefined}
                className={`block rounded-xl px-4 py-3 text-sm ${active(href) ? "bg-sage font-medium text-brand" : "text-muted"}`}
              >
                {label}
              </Link>
            ))}
            <div className="mt-3 border-t border-line pt-3">
              {authenticated ? (
                <button
                  onClick={handleLogout}
                  disabled={signingOut}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-brand"
                >
                  <Icon name="logout" className="size-4" />
                  Đăng xuất
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="button-secondary"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className="button-primary"
                  >
                    Đăng ký
                  </Link>
                </div>
              )}
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
