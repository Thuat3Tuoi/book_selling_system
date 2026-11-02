"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { ApiResponse, Book } from "@/lib/types";
import { useBookCategories } from "@/stores/category.store";
import BookCard from "@/components/BookCard";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";

const LIMIT = 12;
interface Result {
  books: Book[];
  total: number;
  loading: boolean;
  error: boolean;
}
interface SearchData {
  hits: Book[];
  totalHits: number;
}

function Catalog({
  initialCategory,
  initialQuery,
}: {
  initialCategory: string;
  initialQuery: string;
}) {
  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
    loadCategories,
  } = useBookCategories();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState("default");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<Result>({
    books: [],
    total: 0,
    loading: true,
    error: false,
  });
  const usesSearch = Boolean(query.trim() || category || sort !== "default");

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      async () => {
        setResult((previous) => ({ ...previous, loading: true, error: false }));
        try {
          if (usesSearch) {
            const response = await api.get<ApiResponse<SearchData>>(
              "/search/books",
              {
                signal: controller.signal,
                timeout: 12000,
                params: {
                  q: query.trim(),
                  category: category || undefined,
                  sort: sort === "default" ? undefined : sort,
                  page,
                  limit: LIMIT,
                },
              },
            );
            if (!controller.signal.aborted)
              setResult({
                books: response.data.data.hits,
                total: response.data.data.totalHits,
                loading: false,
                error: false,
              });
          } else {
            const response = await api.get<
              ApiResponse<Book[], { total: number }>
            >("/books", {
              signal: controller.signal,
              timeout: 12000,
              params: { page, limit: LIMIT },
            });
            if (!controller.signal.aborted)
              setResult({
                books: response.data.data,
                total: response.data.meta?.total ?? response.data.data.length,
                loading: false,
                error: false,
              });
          }
        } catch {
          if (!controller.signal.aborted)
            setResult({ books: [], total: 0, loading: false, error: true });
        }
      },
      query.trim() ? 300 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, category, sort, page, retry, usesSearch]);

  const totalPages = Math.ceil(result.total / LIMIT);
  const firstPage = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pageNumbers = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) => firstPage + index,
  );

  function resetFilters() {
    setQuery("");
    setCategory("");
    setSort("default");
    setPage(1);
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[195px_minmax(0,1fr)] lg:gap-10">
      <aside className="min-w-0">
        <h2 className="mb-4 text-[11px] font-semibold tracking-[0.15em] uppercase">
          Khám phá thể loại
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-3 lg:flex-col lg:overflow-visible">
          {["", ...categories].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setCategory(value);
                setPage(1);
              }}
              aria-pressed={category === value}
              className={`flex shrink-0 items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-xs transition lg:text-[13px] ${category === value ? "bg-brand font-medium text-white" : "bg-white text-muted hover:bg-sage hover:text-brand lg:bg-transparent"}`}
            >
              <span>{value || "Tất cả sách"}</span>
              {category === value && (
                <span className="size-1.5 shrink-0 rounded-full bg-white/75" />
              )}
            </button>
          ))}
        </div>
        {categoriesLoading && (
          <p className="mt-2 text-xs text-muted" role="status">
            Đang tải thể loại...
          </p>
        )}
        {categoriesError && (
          <div className="mt-2 text-xs text-muted">
            <p role="alert">Chưa thể tải thể loại.</p>
            <button
              type="button"
              onClick={() => void loadCategories()}
              className="mt-2 text-brand underline"
            >
              Thử lại
            </button>
          </div>
        )}
        <div className="mt-8 hidden rounded-2xl bg-sage/80 p-5 lg:block">
          <Icon name="leaf" className="mb-4 size-6 text-brand" />
          <p className="font-serif text-lg leading-7">
            Một trang sách.
            <br />
            Một khoảng bình yên.
          </p>
          <p className="mt-3 text-xs leading-6 text-muted">
            Không cần vội. Cứ chọn cuốn sách khiến bạn muốn dừng lại.
          </p>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Icon
              name="search"
              className="pointer-events-none absolute top-3.5 left-4 size-4.5 text-muted"
            />
            <input
              type="search"
              aria-label="Tìm tên sách, tác giả hoặc ISBN"
              placeholder="Tìm tên sách, tác giả, ISBN..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              className="field pl-11"
            />
          </div>
          <select
            aria-label="Sắp xếp sách"
            value={sort}
            onChange={(event) => {
              setSort(event.target.value);
              setPage(1);
            }}
            className="field w-full sm:w-48"
          >
            <option value="default">
              {usesSearch ? "Phù hợp nhất" : "Mới trên tủ sách"}
            </option>
            <option value="price:asc">Giá: thấp đến cao</option>
            <option value="price:desc">Giá: cao đến thấp</option>
          </select>
        </div>
        <div
          className="mb-7 flex min-h-7 flex-wrap items-center justify-between gap-3 text-xs text-muted"
          aria-live="polite"
        >
          <span>
            {result.loading ? (
              "Đang tìm những cuốn sách dành cho bạn..."
            ) : result.error ? (
              "Chưa thể mở tủ sách"
            ) : (
              <>
                <span className="font-semibold text-ink">{result.total}</span>{" "}
                cuốn sách
                {category ? ` trong ${category}` : " đang chờ bạn khám phá"}
              </>
            )}
          </span>
          {(query || category || sort !== "default") && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1.5 text-brand hover:underline"
            >
              <Icon name="close" className="size-3.5" />
              Xóa bộ lọc
            </button>
          )}
        </div>
        <div aria-busy={result.loading}>
          {result.loading ? (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="animate-pulse" aria-hidden="true">
                  <div className="mb-5 aspect-[1/1.12] rounded-2xl bg-paper" />
                  <div className="mb-3 h-3 w-1/3 rounded bg-line" />
                  <div className="mb-3 h-5 w-4/5 rounded bg-line" />
                  <div className="h-3 w-1/2 rounded bg-line" />
                </div>
              ))}
            </div>
          ) : result.error ? (
            <>
              <EmptyState
                icon="search"
                title="Chưa thể tải tủ sách"
                description="Kết nối có thể đang gián đoạn. Bạn hãy thử lại sau một chút nhé."
              />
              <div className="mt-4 text-center">
                <button
                  className="button-secondary"
                  onClick={() => setRetry(retry + 1)}
                >
                  Thử lại
                </button>
              </div>
            </>
          ) : result.books.length === 0 ? (
            <>
              <EmptyState
                icon="search"
                title="Chưa tìm thấy cuốn sách phù hợp"
                description="Thử một từ khóa ngắn hơn, một tác giả khác hoặc khám phá thêm thể loại mới."
              />
              <div className="mt-4 text-center">
                <button onClick={resetFilters} className="button-secondary">
                  Xem tất cả sách
                </button>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-7 md:grid-cols-3 lg:gap-x-7">
              {result.books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </div>
        {!result.loading && totalPages > 1 && (
          <nav
            aria-label="Phân trang sách"
            className="mt-10 flex flex-wrap items-center justify-center gap-2 border-t border-line pt-7"
          >
            <button
              type="button"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              aria-label="Trang trước"
              className="icon-button border border-line"
            >
              <Icon name="back" className="size-4" />
            </button>
            {pageNumbers.map((number) => (
              <button
                key={number}
                type="button"
                onClick={() => setPage(number)}
                aria-label={`Trang ${number}`}
                aria-current={page === number ? "page" : undefined}
                className={`flex size-10 items-center justify-center rounded-full text-sm transition ${page === number ? "bg-brand text-white" : "hover:bg-sage"}`}
              >
                {number}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              aria-label="Trang sau"
              className="icon-button border border-line"
            >
              <Icon name="arrow" className="size-4" />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}

export default function ProductsGrid() {
  const params = useSearchParams();
  const category = params.get("category") ?? "";
  const query = params.get("q") ?? "";
  return (
    <Catalog
      key={`${category}:${query}`}
      initialCategory={category}
      initialQuery={query}
    />
  );
}
