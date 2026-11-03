"use client";

import Image from "next/image";
import { useState } from "react";
import Icon from "@/components/Icon";

interface CoverBook {
  title: string;
  author?: string;
  coverImageUrl?: string;
}

function CoverImage({
  book,
  className = "",
  priority = false,
}: {
  book: CoverBook;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const source = book.coverImageUrl || null;
  return (
    <div
      role="img"
      aria-label={`Bìa sách ${book.title}`}
      className={`book-shadow relative isolate block aspect-[2/3] ${className}`}
    >
      <div
        aria-hidden="true"
        className={`absolute inset-0 flex flex-col justify-between overflow-hidden rounded-r-md border-l-8 border-black/10 bg-brand p-3 text-white transition-opacity sm:p-5 ${loaded && !failed ? "opacity-0" : "opacity-100"}`}
      >
        <Icon name="book" className="size-6 shrink-0 opacity-60" />
        <span className="line-clamp-4 font-serif text-sm leading-snug sm:text-lg">
          {book.title}
        </span>
        <span className="mt-2 line-clamp-2 text-[8px] tracking-wider opacity-65 sm:text-[10px]">
          {book.author ?? "Book Store"}
        </span>
      </div>
      {source && !failed && (
        <Image
          src={source}
          alt=""
          width={280}
          height={420}
          unoptimized
          preload={priority}
          onLoad={(event) => {
            if (event.currentTarget.naturalWidth < 10) setFailed(true);
            else setLoaded(true);
          }}
          onError={() => setFailed(true)}
          className={`relative h-full w-full rounded-r-sm object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}

export default function BookCover(props: {
  book: CoverBook;
  className?: string;
  priority?: boolean;
}) {
  return <CoverImage key={props.book.coverImageUrl ?? "no-cover"} {...props} />;
}
