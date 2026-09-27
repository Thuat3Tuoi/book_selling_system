"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phoneNumber: "",
    address: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        phoneNumber: form.phoneNumber || undefined,
        address: form.address || undefined,
      });
      router.push("/login?registered=1");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Đăng ký thất bại, thử lại."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-[#FAF6EE] px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-2xl font-medium text-[#1F2321]">
          Tạo tài khoản
        </h1>
        <p className="mt-1 text-sm text-[#1F2321]/60">
          Đã có tài khoản?{" "}
          <Link href="/login" className="text-[#2F4B3C] hover:underline">
            Đăng nhập
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1.5 text-sm text-[#1F2321]">
              Họ
              <input
                required
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                className="rounded-sm border border-[#E4DCC8] bg-white px-3 py-2 outline-none focus:border-[#2F4B3C]"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1.5 text-sm text-[#1F2321]">
              Tên
              <input
                required
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                className="rounded-sm border border-[#E4DCC8] bg-white px-3 py-2 outline-none focus:border-[#2F4B3C]"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-sm text-[#1F2321]">
            Email
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="rounded-sm border border-[#E4DCC8] bg-white px-3 py-2 outline-none focus:border-[#2F4B3C]"
              placeholder="ban@vidu.com"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm text-[#1F2321]">
            Mật khẩu
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className="rounded-sm border border-[#E4DCC8] bg-white px-3 py-2 outline-none focus:border-[#2F4B3C]"
              placeholder="Ít nhất 6 ký tự"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm text-[#1F2321]">
            Số điện thoại (không bắt buộc)
            <input
              value={form.phoneNumber}
              onChange={(e) => update("phoneNumber", e.target.value)}
              className="rounded-sm border border-[#E4DCC8] bg-white px-3 py-2 outline-none focus:border-[#2F4B3C]"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm text-[#1F2321]">
            Địa chỉ (không bắt buộc)
            <input
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              className="rounded-sm border border-[#E4DCC8] bg-white px-3 py-2 outline-none focus:border-[#2F4B3C]"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-full bg-[#2F4B3C] px-4 py-2.5 text-sm font-medium text-[#FAF6EE] transition-colors hover:bg-[#26392E] disabled:opacity-60"
          >
            {isSubmitting ? "Đang tạo..." : "Tạo tài khoản"}
          </button>
        </form>
      </div>
    </div>
  );
}
