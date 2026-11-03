import type { Metadata } from "next";
import { Geist, Lora } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Notifications from "@/components/Notifications";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const lora = Lora({
  variable: "--font-book-serif",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: {
    default: "Book Store — Một góc nhỏ cho người yêu sách",
    template: "%s | Book Store",
  },
  description:
    "Khám phá những cuốn sách về văn học, cuộc sống và tri thức. Tìm cuốn sách tiếp theo của bạn tại Book Store.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${geist.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#main-content"
          className="sr-only fixed top-3 left-3 z-50 rounded-lg bg-brand px-4 py-3 text-sm text-white focus:not-sr-only"
        >
          Đi tới nội dung chính
        </a>
        <Navbar />
        <main id="main-content" className="flex flex-1 flex-col">
          {children}
        </main>
        <Footer />
        <Notifications />
      </body>
    </html>
  );
}
