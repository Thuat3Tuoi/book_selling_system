import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
// import { AuthProvider } from "@/context/AuthContext";
// import { CartProvider } from "@/context/CartContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bookSerif = Lora({
  variable: "--font-book-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hiệu Sách Thuật",
  description: "Hệ thống bán sách trực tuyến — đồ án CCNLTHD",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} ${bookSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">

            <Navbar />
            <main className="flex flex-1 flex-col">{children}</main>
            <Footer />

      </body>
    </html>
  );
}
