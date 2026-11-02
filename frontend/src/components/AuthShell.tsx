import type { ReactNode } from "react";
import Icon from "@/components/Icon";

export default function AuthShell({
  children,
  register = false,
}: {
  children: ReactNode;
  register?: boolean;
}) {
  return (
    <div className="page-shell py-8 sm:py-12">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-line bg-white lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-brand p-10 text-white lg:flex">
          <div className="pointer-events-none absolute -top-16 -right-24 size-80 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-40 -left-20 size-96 rounded-full border border-white/10" />
          <div className="relative">
            <span className="mb-10 inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-[10px] tracking-widest text-white/80 uppercase">
              <Icon name="leaf" className="size-3" />
              Góc nhỏ của bạn đọc
            </span>
            <h2 className="font-serif text-4xl leading-[1.3] tracking-tight">
              {register ? (
                <>
                  Một tài khoản nhỏ.
                  <br />
                  Cả một thế giới
                  <br />
                  <em className="font-normal text-[#d4ddbd]">rộng mở.</em>
                </>
              ) : (
                <>
                  Thêm một trang sách.
                  <br />
                  Thêm một chút
                  <br />
                  <em className="font-normal text-[#d4ddbd]">bình yên.</em>
                </>
              )}
            </h2>
            <p className="mt-5 text-sm leading-7 text-white/60">
              Lưu những cuốn sách bạn yêu, theo dõi những chuyến đi nhỏ của
              chúng đến với bạn.
            </p>
          </div>
          <div className="relative mx-auto mt-10 mb-5 flex h-52 w-44 rotate-[-9deg] flex-col justify-between rounded-r-lg border-l-8 border-black/15 bg-[#ddd4b4] p-5 text-brand shadow-[15px_20px_30px_#102d2650]">
            <span className="text-[8px] tracking-[0.25em]">Book Store</span>
            <span className="font-serif text-2xl leading-tight">
              Những trang sách
              <br />
              <em>dành cho bạn.</em>
            </span>
            <Icon name="book" className="size-9 opacity-65" />
          </div>
          <p className="relative mt-9 text-[10px] tracking-wider text-white/45">
            MỘT NƠI CHỐN CHO NHỮNG TÂM HỒN TÒ MÒ.
          </p>
        </aside>
        <div className="flex items-center px-6 py-9 sm:px-12 sm:py-12">
          <div className="mx-auto w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
