"use client";

import Link from "next/link";

export default function OrdersPage() {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <h1 className="mb-6 font-serif text-3xl font-medium text-[#1F2321]">
        Giỏ hàng
      </h1>

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        {/* Cart items */}
        <div className="flex flex-col divide-y divide-[#E4DCC8] border-y border-[#E4DCC8]">
          {/* Item 1 */}
          <div className="flex items-center gap-4 py-4">
            <div className="flex h-16 w-12 flex-none items-center justify-center bg-[#EFE9DA] text-center text-[10px] text-[#1F2321]/60">
              Sách
            </div>

            <div className="flex-1">
              <p className="font-medium text-[#1F2321]">
                Clean Code
              </p>

              <p className="text-sm text-[#1F2321]/60">
                250.000 ₫
              </p>
            </div>

            <div className="flex items-center rounded-full border border-[#E4DCC8]">
              <button
                className="px-3 py-1.5 text-[#1F2321] hover:text-[#2F4B3C]"
                aria-label="Giảm số lượng"
              >
                −
              </button>

              <span className="w-8 text-center text-sm">
                1
              </span>

              <button
                className="px-3 py-1.5 text-[#1F2321] hover:text-[#2F4B3C]"
                aria-label="Tăng số lượng"
              >
                +
              </button>
            </div>

            <button className="text-sm text-[#1F2321]/50 hover:text-red-600">
              Xoá
            </button>
          </div>

          {/* Item 2 */}
          <div className="flex items-center gap-4 py-4">
            <div className="flex h-16 w-12 flex-none items-center justify-center bg-[#EFE9DA] text-center text-[10px] text-[#1F2321]/60">
              Sách
            </div>

            <div className="flex-1">
              <p className="font-medium text-[#1F2321]">
                Design Patterns
              </p>

              <p className="text-sm text-[#1F2321]/60">
                320.000 ₫
              </p>
            </div>

            <div className="flex items-center rounded-full border border-[#E4DCC8]">
              <button
                className="px-3 py-1.5 text-[#1F2321] hover:text-[#2F4B3C]"
                aria-label="Giảm số lượng"
              >
                −
              </button>

              <span className="w-8 text-center text-sm">
                2
              </span>

              <button
                className="px-3 py-1.5 text-[#1F2321] hover:text-[#2F4B3C]"
                aria-label="Tăng số lượng"
              >
                +
              </button>
            </div>

            <button className="text-sm text-[#1F2321]/50 hover:text-red-600">
              Xoá
            </button>
          </div>
        </div>

        {/* Checkout */}
        <div className="flex h-fit flex-col gap-4 rounded-sm border border-[#E4DCC8] bg-white p-5">
          <div className="flex items-center justify-between text-[#1F2321]">
            <span>Tổng cộng</span>

            <span className="text-lg font-medium text-[#2F4B3C]">
              890.000 ₫
            </span>
          </div>

          <label className="flex flex-col gap-1.5 text-sm text-[#1F2321]">
            Địa chỉ giao hàng

            <textarea
              rows={3}
              className="resize-none rounded-sm border border-[#E4DCC8] px-3 py-2 outline-none focus:border-[#2F4B3C]"
              placeholder="Số nhà, đường, phường/xã, quận/huyện..."
            />
          </label>

          <button
            type="button"
            className="rounded-full bg-[#2F4B3C] px-4 py-2.5 text-sm font-medium text-[#FAF6EE] transition-colors hover:bg-[#26392E]"
          >
            Đặt hàng
          </button>
        </div>
      </div>

      {/* Orders */}
      <h2 className="mb-4 mt-14 font-serif text-2xl font-medium text-[#1F2321]">
        Đơn hàng của bạn
      </h2>

      <div className="flex flex-col gap-3">
        {/* Order 1 */}
        <div className="rounded-sm border border-[#E4DCC8] bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-[#1F2321]">
              Đơn #1001
            </span>

            <span className="rounded-full bg-[#EFE9DA] px-3 py-1 text-xs text-[#1F2321]/70">
              Đang xử lý
            </span>
          </div>

          <p className="mt-1 text-sm text-[#1F2321]/60">
            123 Nguyễn Văn A, Quận 1, TP.HCM
          </p>

          <p className="mt-2 font-medium text-[#2F4B3C]">
            890.000 ₫
          </p>
        </div>

        {/* Order 2 */}
        <div className="rounded-sm border border-[#E4DCC8] bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-[#1F2321]">
              Đơn #1000
            </span>

            <span className="rounded-full bg-[#EFE9DA] px-3 py-1 text-xs text-[#1F2321]/70">
              Đã giao
            </span>
          </div>

          <p className="mt-1 text-sm text-[#1F2321]/60">
            456 Lê Lợi, Quận 3, TP.HCM
          </p>

          <p className="mt-2 font-medium text-[#2F4B3C]">
            450.000 ₫
          </p>
        </div>
      </div>
    </div>
  );
}