"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";
  const { loginWithToken } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { accessToken } = await api.login(email, password);
      await loginWithToken(accessToken);
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Đăng nhập thất bại, thử lại."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-[#FAF6EE] px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-2xl font-medium text-[#1F2321]">
          Đăng nhập
        </h1>
        <p className="mt-1 text-sm text-[#1F2321]/60">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="text-[#2F4B3C] hover:underline">
            Đăng ký
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          {justRegistered && (
            <p className="rounded-sm border border-[#2F4B3C]/30 bg-[#2F4B3C]/5 px-3 py-2 text-sm text-[#2F4B3C]">
              Tạo tài khoản thành công, đăng nhập để tiếp tục.
            </p>
          )}
          <label className="flex flex-col gap-1.5 text-sm text-[#1F2321]">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-sm border border-[#E4DCC8] bg-white px-3 py-2 outline-none focus:border-[#2F4B3C]"
              placeholder="ban@vidu.com"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm text-[#1F2321]">
            Mật khẩu
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-sm border border-[#E4DCC8] bg-white px-3 py-2 outline-none focus:border-[#2F4B3C]"
              placeholder="••••••"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-full bg-[#2F4B3C] px-4 py-2.5 text-sm font-medium text-[#FAF6EE] transition-colors hover:bg-[#26392E] disabled:opacity-60"
          >
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}
