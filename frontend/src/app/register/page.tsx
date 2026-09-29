"use client";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useAuthStore } from "@/stores/auth.store";

import Link from "next/link";

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, "Tên không được để trống"),
  lastName: z.string().trim().min(1, "Họ không được để trống"),
  email: z.string().trim().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  phoneNumber: z.string().trim().optional(),
  address: z.string().trim().optional(),
});

export type RegisterData = z.infer<typeof registerSchema>;



export default function RegisterPage() {
  const router = useRouter();

  const registerUser = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.loading);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      phoneNumber: "",
      address: "",
    },
  });

  const onSubmit = async (data: RegisterData) => {
    try {
      await registerUser(data);

      // Đăng ký thành công
      router.push("/login");
    } catch {
      // Error đã được Zustand lưu
    }
  };

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

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-8 flex flex-col gap-4"
        >
          {/* Họ + Tên */}
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1.5 text-sm">
              Họ
              <input
                {...register("lastName")}
                className="rounded-sm border border-[#E4DCC8] bg-white px-3 py-2 outline-none focus:border-[#2F4B3C]"
              />
              {errors.lastName && (
                <span className="text-xs text-red-600">
                  {errors.lastName.message}
                </span>
              )}
            </label>

            <label className="flex flex-1 flex-col gap-1.5 text-sm">
              Tên
              <input
                {...register("firstName")}
                className="rounded-sm border border-[#E4DCC8] bg-white px-3 py-2 outline-none focus:border-[#2F4B3C]"
              />
              {errors.firstName && (
                <span className="text-xs text-red-600">
                  {errors.firstName.message}
                </span>
              )}
            </label>
          </div>

          {/* Email */}
          <label className="flex flex-col gap-1.5 text-sm">
            Email
            <input
              type="email"
              {...register("email")}
              placeholder="ban@vidu.com"
              className="rounded-sm border border-[#E4DCC8] bg-white px-3 py-2 outline-none focus:border-[#2F4B3C]"
            />
            {errors.email && (
              <span className="text-xs text-red-600">
                {errors.email.message}
              </span>
            )}
          </label>

          {/* Password */}
          <label className="flex flex-col gap-1.5 text-sm">
            Mật khẩu
            <input
              type="password"
              {...register("password")}
              placeholder="Ít nhất 6 ký tự"
              className="rounded-sm border border-[#E4DCC8] bg-white px-3 py-2 outline-none focus:border-[#2F4B3C]"
            />
            {errors.password && (
              <span className="text-xs text-red-600">
                {errors.password.message}
              </span>
            )}
          </label>

          {/* Phone */}
          <label className="flex flex-col gap-1.5 text-sm">
            Số điện thoại (không bắt buộc)
            <input
              {...register("phoneNumber")}
              className="rounded-sm border border-[#E4DCC8] bg-white px-3 py-2 outline-none focus:border-[#2F4B3C]"
            />
          </label>

          {/* Address */}
          <label className="flex flex-col gap-1.5 text-sm">
            Địa chỉ (không bắt buộc)
            <input
              {...register("address")}
              className="rounded-sm border border-[#E4DCC8] bg-white px-3 py-2 outline-none focus:border-[#2F4B3C]"
            />
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 rounded-full bg-[#2F4B3C] px-4 py-2.5 text-sm font-medium text-[#FAF6EE] transition-colors hover:bg-[#26392E] disabled:opacity-60"
          >
            {isLoading ? "Đang tạo..." : "Tạo tài khoản"}
          </button>
        </form>
      </div>
    </div>
  );
}
