import Link from "next/link";
import { api } from "@/lib/api";
import type { ApiResponse, Book } from "@/lib/types";
import BookCard from "@/components/BookCard";
import BookCover from "@/components/BookCover";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import { categoryHref, getBookCategories } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [booksResult, categoriesResult] = await Promise.allSettled([
    api.get<ApiResponse<Book[]>>("/books", {
      params: { limit: 8 },
      timeout: 8000,
    }),
    getBookCategories(),
  ]);
  const books =
    booksResult.status === "fulfilled" ? booksResult.value.data.data : [];
  const categories =
    categoriesResult.status === "fulfilled" ? categoriesResult.value : [];
  const loadError = booksResult.status === "rejected";
  const heroBooks = books.slice(0, 3);
  const topicIcons = ["book", "leaf", "sparkles", "package"] as const;
  const topics = categories.slice(0, 4).map((label, index) => ({
    label,
    subtitle: "Khám phá tủ sách",
    icon: topicIcons[index % topicIcons.length],
  }));
  return (
    <>
      <section className="overflow-hidden border-b border-line bg-[#f1f0e7]">
        <div className="page-shell grid items-center gap-4 pt-12 pb-8 lg:min-h-[590px] lg:grid-cols-[1.08fr_1fr] lg:gap-8 lg:py-16">
          <div className="animate-enter relative z-10 max-w-xl">
            <p className="eyebrow mb-6 flex items-center gap-3">
              <span className="h-px w-8 bg-brand/50" />
              Chào mừng đến Book Store
            </p>
            <h1 className="font-serif text-[clamp(2.45rem,4.5vw,3.8rem)] leading-[1.16] tracking-[-0.045em]">
              Mở một trang sách,
              <br />
              mở thêm một
              <br className="hidden lg:block" />{" "}
              <em className="font-normal text-brand">thế giới.</em>
            </h1>
            <p className="mt-6 max-w-[380px] text-sm leading-7 text-muted sm:text-base sm:leading-8">
              Có những hành trình bắt đầu từ một trang giấy. Tìm cuốn sách tiếp
              theo, dành một khoảng lặng cho chính mình.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Link href="/products" className="button-primary">
                Khám phá tủ sách
                <Icon name="arrow" className="ml-3 size-4" />
              </Link>
              <a
                href="#tu-sach"
                className="border-b border-brand/30 pb-1 text-sm font-medium text-brand transition hover:border-brand"
              >
                Dạo một vòng
              </a>
            </div>
            <div className="mt-9 flex items-center gap-3 text-xs text-muted">
              <span className="flex size-8 items-center justify-center rounded-full border border-brand/15">
                <Icon name="book" className="size-4 text-brand" />
              </span>
              Những trang sách nhỏ. Những đổi thay lớn.
            </div>
          </div>
          <div
            className="relative mx-auto h-[340px] w-full max-w-[520px] sm:h-[420px] lg:h-[470px]"
            aria-label="Một vài cuốn sách trong tủ sách"
          >
            <div className="absolute top-[8%] left-[8%] h-[82%] w-[88%] rounded-[50%_50%_42%_48%] bg-[#e0e5d5]" />
            <div className="absolute top-[3%] right-[3%] size-24 rounded-full border border-brand/10 sm:size-32" />
            <div className="absolute bottom-[1%] left-[6%] h-6 w-[85%] rounded-[50%] bg-brand/10 blur-xl" />
            {heroBooks.length > 0 ? (
              heroBooks.map((book, i) => (
                <Link
                  href={`/products/${book.id}`}
                  key={`${book.id}-${i}`}
                  className={`absolute block transition-transform duration-500 hover:-translate-y-3 ${i === 0 ? "top-[16%] left-[3%] z-10 h-[62%] w-[37%] -rotate-12" : i === 1 ? "top-[8%] left-[32%] z-20 h-[72%] w-[40%] rotate-3" : "top-[26%] right-[-2%] z-30 h-[58%] w-[34%] rotate-12"}`}
                >
                  <BookCover book={book} priority className="h-full w-full" />
                </Link>
              ))
            ) : (
              <div className="absolute top-[18%] left-[26%] w-[46%] -rotate-6">
                <div
                  className="flex aspect-[2/3] items-center justify-center rounded-2xl border border-brand/15 bg-sage text-brand/50"
                  aria-hidden="true"
                >
                  <Icon name="book" className="size-20" />
                </div>
              </div>
            )}
            <div className="absolute top-[3%] left-[1%] z-30 flex -rotate-6 items-center gap-2 rounded-full bg-[#fbfaf6] px-4 py-2.5 text-[11px] font-medium text-brand shadow-sm">
              <Icon name="sparkles" className="size-4 text-gold" />
              Cho một ngày nhiều cảm hứng
            </div>
            <div className="absolute right-[3%] bottom-[5%] z-30 flex items-center gap-3 rounded-xl border border-white/60 bg-white/95 px-4 py-3 shadow-[0_8px_35px_#283b3310]">
              <span className="flex size-9 items-center justify-center rounded-full bg-sage text-brand">
                <Icon name="leaf" className="size-4" />
              </span>
              <span className="text-[11px] leading-5">
                <span className="block font-semibold text-ink">
                  Một chút thời gian cho bạn
                </span>
                <span className="text-muted">Bắt đầu từ một chương sách.</span>
              </span>
            </div>
          </div>
        </div>
      </section>
      {topics.length > 0 && (
        <section
          className="page-shell py-10 lg:py-12"
          aria-label="Khám phá theo thể loại"
        >
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
            {topics.map((topic) => (
              <Link
                href={categoryHref(topic.label)}
                key={topic.label}
                className="group flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-4 transition hover:-translate-y-1 hover:border-brand/25 hover:shadow-sm sm:gap-4 sm:px-5"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sage/80 text-brand transition group-hover:bg-brand group-hover:text-white">
                  <Icon name={topic.icon} />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold sm:text-sm">
                    {topic.label}
                  </span>
                  <span className="mt-1 hidden text-[11px] text-muted sm:block">
                    {topic.subtitle}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section id="tu-sach" className="page-shell pt-4 pb-14 lg:pb-20">
        <div className="mb-8 flex items-end justify-between gap-5">
          <div>
            <p className="eyebrow mb-3">Có gì trên tủ sách?</p>
            <h2 className="font-serif text-3xl tracking-tight sm:text-4xl">
              Những cuốn sách chờ bạn
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Một câu chuyện mới, một ý tưởng hay, một người bạn đồng hành.
            </p>
          </div>
          <Link
            href="/products"
            className="hidden shrink-0 items-center gap-3 border-b border-brand/30 pb-2 text-xs font-medium text-brand sm:flex"
          >
            Xem tất cả sách
            <Icon name="arrow" className="size-4" />
          </Link>
        </div>
        {loadError ? (
          <EmptyState
            title="Tủ sách đang nghỉ một chút"
            description="Chúng mình chưa tải được sách. Bạn hãy thử mở lại tủ sách sau một lát nhé."
            href="/products"
            action="Mở tủ sách"
          />
        ) : books.length === 0 ? (
          <EmptyState
            title="Những trang sách mới sắp đến"
            description="Tủ sách đang được bổ sung. Hẹn bạn quay lại để chọn cuốn sách yêu thích."
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-7 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-7">
            {books.slice(0, 8).map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
        <Link
          href="/products"
          className="button-secondary mt-6 w-full sm:hidden"
        >
          Xem tất cả sách
          <Icon name="arrow" className="size-4" />
        </Link>
      </section>
      <section className="page-shell pb-16 lg:pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-brand px-7 py-10 text-white sm:px-12 sm:py-14">
          <div className="pointer-events-none absolute -top-16 -right-10 size-80 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute top-2 -right-24 size-80 rounded-full border border-white/10" />
          <div className="relative flex flex-col justify-between gap-7 md:flex-row md:items-center">
            <div>
              <p className="mb-4 text-[10px] font-medium tracking-[0.2em] text-[#c4d4b8] uppercase">
                Dành cho những tâm hồn tò mò
              </p>
              <h2 className="font-serif text-3xl leading-snug tracking-tight sm:text-4xl">
                Bạn không cần đi thật xa
                <br />
                để thấy một thế giới khác.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-white/65">
                Đôi khi, tất cả những gì bạn cần là một cuốn sách hay.
              </p>
            </div>
            <Link
              href="/products"
              className="inline-flex w-fit items-center gap-5 rounded-xl bg-[#f1f0e7] px-6 py-4 text-sm font-medium text-brand transition hover:bg-white"
            >
              Tìm cuốn sách của bạn
              <Icon name="arrow" className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
