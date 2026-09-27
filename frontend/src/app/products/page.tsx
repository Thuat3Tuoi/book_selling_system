import { api } from "@/lib/api";
import type { Book } from "@/lib/types";
import ProductsGrid from "@/components/ProductsGrid";

export default async function ProductsPage() {
  let books: Book[] = [];
  let loadError = false;

  try {
    books = await api.getBooks();
  } catch {
    loadError = true;
  }

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <h1 className="mb-6 font-serif text-3xl font-medium text-[#1F2321]">
        Tất cả sách
      </h1>

      {loadError ? (
        <p className="rounded-sm border border-[#E4DCC8] bg-white p-4 text-sm text-[#1F2321]/70">
          Không tải được danh sách sách. Kiểm tra backend có đang chạy không.
        </p>
      ) : (
        <ProductsGrid books={books} />
      )}
    </div>
  );
}
