"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/stores/auth.store";
import { notify } from "@/stores/notification.store";
import { errorMessage } from "@/lib/errors";
import AuthShell from "@/components/AuthShell";
import Icon from "@/components/Icon";

const schema = z.object({
  firstName: z.string().trim().min(1, "Bạn điền tên nhé."),
  lastName: z.string().trim().min(1, "Bạn điền họ nhé."),
  email: z.string().trim().email("Địa chỉ email chưa hợp lệ."),
  password: z.string().min(6, "Mật khẩu cần ít nhất 6 ký tự."),
  phoneNumber: z.string().trim().optional(),
  address: z.string().trim().optional(),
});
type RegisterData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const registerUser = useAuthStore((state) => state.register);
  const loading = useAuthStore((state) => state.loading);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterData>({ resolver: zodResolver(schema) });

  async function submit(data: RegisterData) {
    setError("");
    try {
      await registerUser({
        ...data,
        phoneNumber: data.phoneNumber || undefined,
        address: data.address || undefined,
      });
      notify.success("Tạo tài khoản thành công. Bạn có thể đăng nhập ngay.");
      router.push("/login?registered=1");
    } catch (error) {
      const message = errorMessage(
        error,
        "Chưa thể tạo tài khoản. Bạn thử lại sau một chút nhé.",
      );
      setError(message);
      notify.error(message);
    }
  }

  return (
    <AuthShell register>
      <p className="eyebrow mb-3">Một hành trình mới bắt đầu</p>
      <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">
        Ghé vào, bạn nhé.
      </h1>
      <p className="mt-3 text-sm leading-7 text-muted">
        Tạo một góc riêng cho những cuốn sách của bạn.
      </p>
      <form
        onSubmit={handleSubmit(submit)}
        noValidate
        className="mt-7 space-y-4"
      >
        {error && (
          <p role="alert" className="notice-error">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-4">
          {(
            [
              {
                name: "lastName",
                label: "Họ",
                autoComplete: "family-name",
                placeholder: "Nguyễn",
              },
              {
                name: "firstName",
                label: "Tên",
                autoComplete: "given-name",
                placeholder: "An",
              },
            ] as const
          ).map((field) => (
            <label key={field.name} className="field-label">
              {field.label}
              <input
                {...register(field.name)}
                autoComplete={field.autoComplete}
                placeholder={field.placeholder}
                aria-invalid={Boolean(errors[field.name])}
                aria-describedby={
                  errors[field.name] ? `${field.name}-error` : undefined
                }
                className="field"
              />
              {errors[field.name] && (
                <span
                  id={`${field.name}-error`}
                  className="text-xs font-normal text-red-600"
                >
                  {errors[field.name]?.message}
                </span>
              )}
            </label>
          ))}
        </div>
        <label className="field-label">
          Địa chỉ email
          <input
            type="email"
            autoComplete="email"
            placeholder="ban@vidu.com"
            {...register("email")}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "register-email-error" : undefined}
            className="field"
          />
          {errors.email && (
            <span
              id="register-email-error"
              className="text-xs font-normal text-red-600"
            >
              {errors.email.message}
            </span>
          )}
        </label>
        <label className="field-label">
          Mật khẩu
          <div className="relative">
            <input
              type={visible ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Ít nhất 6 ký tự"
              {...register("password")}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? "register-password-error" : undefined
              }
              className="field pr-12"
            />
            <button
              type="button"
              onClick={() => setVisible(!visible)}
              aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              aria-pressed={visible}
              className="absolute top-1 right-1 flex size-10 items-center justify-center rounded-lg text-muted hover:text-brand"
            >
              <Icon name="eye" className="size-4.5" />
            </button>
          </div>
          {errors.password && (
            <span
              id="register-password-error"
              className="text-xs font-normal text-red-600"
            >
              {errors.password.message}
            </span>
          )}
        </label>
        <label className="field-label">
          <span>
            Số điện thoại{" "}
            <span className="font-normal text-muted">(không bắt buộc)</span>
          </span>
          <input
            type="tel"
            autoComplete="tel"
            placeholder="Số điện thoại của bạn"
            {...register("phoneNumber")}
            className="field"
          />
        </label>
        <label className="field-label">
          <span>
            Địa chỉ{" "}
            <span className="font-normal text-muted">(không bắt buộc)</span>
          </span>
          <input
            autoComplete="street-address"
            placeholder="Địa chỉ nhận sách"
            {...register("address")}
            className="field"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="button-primary mt-2 w-full"
        >
          {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
          <Icon name="arrow" className="ml-auto size-4" />
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Đã là bạn đọc?{" "}
        <Link
          href="/login"
          className="font-semibold text-brand underline-offset-4 hover:underline"
        >
          Đăng nhập
        </Link>
      </p>
    </AuthShell>
  );
}
