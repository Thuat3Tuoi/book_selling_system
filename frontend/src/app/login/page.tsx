"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useAuthStore } from "@/stores/auth.store";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Email không hợp lệ"),

  password: z
    .string()
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

type LoginData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);

  const justRegistered = searchParams.get("registered") === "1";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginData) => {
    try {
      await login(data);

      router.push("/");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center bg-[#FAF6EE] px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-2xl font-medium text-[#1F2321]">
          Đăng nhập
        </h1>

        <p className="mt-1 text-sm text-[#1F2321]/60">
          Chưa có tài khoản?{" "}
          <Link
            href="/register"
            className="text-[#2F4B3C] hover:underline"
          >
            Đăng ký
          </Link>
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-8 flex flex-col gap-4"
        >
          {justRegistered && (
            <p className="rounded-sm border border-[#2F4B3C]/30 bg-[#2F4B3C]/5 px-3 py-2 text-sm text-[#2F4B3C]">
              Tạo tài khoản thành công, đăng nhập để tiếp tục.
            </p>
          )}

          {/* Email */}
          <label className="flex flex-col gap-1.5 text-sm text-[#1F2321]">
            Email

            <input
              type="email"
              {...register("email")}
              className="rounded-sm border border-[#E4DCC8] bg-white px-3 py-2 outline-none focus:border-[#2F4B3C]"
              placeholder="ban@vidu.com"
            />

            {errors.email && (
              <span className="text-xs text-red-600">
                {errors.email.message}
              </span>
            )}
          </label>

          {/* Password */}
          <label className="flex flex-col gap-1.5 text-sm text-[#1F2321]">
            Mật khẩu

            <input
              type="password"
              {...register("password")}
              className="rounded-sm border border-[#E4DCC8] bg-white px-3 py-2 outline-none focus:border-[#2F4B3C]"
              placeholder="••••••"
            />

            {errors.password && (
              <span className="text-xs text-red-600">
                {errors.password.message}
              </span>
            )}
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-full bg-[#2F4B3C] px-4 py-2.5 text-sm font-medium text-[#FAF6EE] transition-colors hover:bg-[#26392E] disabled:opacity-60"
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}

