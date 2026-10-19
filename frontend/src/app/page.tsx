import { api } from "@/lib/api";
import type { ApiResponse, Book } from "@/lib/types";
import BookCard from "@/components/BookCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  let books: Book[] = [];
  let loadError = false;

  try {
    const response = await api.get<ApiResponse<Book[]>>("/books");
    books = response.data.data;
  } catch {
    loadError = true;
  }

  return (
    <div className="flex flex-1 flex-col">
      <section className="border-b border-[#E4DCC8] bg-[#FAF6EE]">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h1 className="max-w-lg font-serif text-4xl font-medium leading-tight text-[#1F2321]">
            Đọc sách mỗi ngày, giao tận cửa mỗi tuần.
          </h1>
          <p className="mt-4 max-w-md text-[#1F2321]/70">
            Chọn từ kho sách đang có sẵn, thêm vào giỏ và đặt hàng chỉ trong
            vài bước.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="font-serif text-2xl font-medium text-[#1F2321]">
            Sách đang có
          </h2>
          <span className="text-sm text-[#1F2321]/50">
            {books.length} cuốn
          </span>
        </div>

        {loadError && (
          <p className="rounded-sm border border-[#E4DCC8] bg-white p-4 text-sm text-[#1F2321]/70">
            Không tải được danh sách sách. Kiểm tra backend có đang chạy ở
            đúng địa chỉ <code>NEXT_PUBLIC_API_URL</code> không.
          </p>
        )}

        {!loadError && books.length === 0 && (
          <p className="rounded-sm border border-[#E4DCC8] bg-white p-4 text-sm text-[#1F2321]/70">
            Chưa có sách nào trong kho.
          </p>
        )}

        {books.length > 0 && (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
