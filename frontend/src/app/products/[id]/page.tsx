import { notFound } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import AddToCartBox from "@/components/AddToCartBox";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bookId = Number(id);

  if (!Number.isFinite(bookId)) {
    notFound();
  }

  let book;
  try {
    book = await api.getBook(bookId);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <Link
        href="/products"
        className="text-sm text-[#1F2321]/60 hover:text-[#2F4B3C]"
      >
        ← Quay lại danh sách sách
      </Link>

      <div className="mt-6 grid gap-10 sm:grid-cols-[280px_1fr]">
        <div className="flex aspect-[3/4] items-center justify-center rounded-sm bg-[#EFE9DA] px-6 text-center">
          <span className="font-serif text-lg leading-snug text-[#1F2321]/70">
            {book.title}
          </span>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <h1 className="font-serif text-3xl font-medium text-[#1F2321]">
              {book.title}
            </h1>
            {book.author && (
              <p className="mt-1 text-[#1F2321]/60">{book.author}</p>
            )}
          </div>

          <p className="text-2xl font-medium text-[#2F4B3C]">
            {formatPrice(book.price)}
          </p>

          <p className="text-sm text-[#1F2321]/60">
            {book.stockQuantity > 0
              ? `Còn ${book.stockQuantity} cuốn trong kho`
              : "Hết hàng"}
          </p>

          <AddToCartBox book={book} />

          {book.description && (
            <div className="mt-4 border-t border-[#E4DCC8] pt-4">
              <h2 className="mb-2 font-serif text-lg font-medium text-[#1F2321]">
                Giới thiệu
              </h2>
              <p className="whitespace-pre-line text-[#1F2321]/80">
                {book.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
