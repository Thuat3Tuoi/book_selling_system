"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { useAuthStore } from "@/stores/auth.store";
import { notify } from "@/stores/notification.store";
import { errorMessage } from "@/lib/errors";
import AuthShell from "@/components/AuthShell";
import Icon from "@/components/Icon";

const schema = z.object({
  email: z.string().trim().email("Bạn nhập một địa chỉ email hợp lệ nhé."),
  password: z.string().min(6, "Mật khẩu cần ít nhất 6 ký tự."),
});
type LoginData = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login, loading } = useAuthStore();
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginData>({ resolver: zodResolver(schema) });

  async function submit(data: LoginData) {
    setError("");
    try {
      await login(data);
      notify.success("Đăng nhập thành công. Chào mừng bạn trở lại!");
      const requested = params.get("next");
      const target =
        requested &&
        (requested === "/orders" ||
          /^\/products\/\d+$/.test(requested) ||
          /^\/orders\/[1-9]\d*\/success$/.test(requested))
          ? requested
          : "/";
      router.push(target);
    } catch (error) {
      const message =
        axios.isAxiosError(error) && error.response?.status === 401
          ? "Email hoặc mật khẩu chưa đúng. Bạn kiểm tra lại nhé."
          : errorMessage(
              error,
              "Chưa thể đăng nhập. Bạn hãy thử lại sau một chút.",
            );
      setError(message);
      notify.error(message);
    }
  }

  return (
    <AuthShell>
      <p className="eyebrow mb-3">Rất vui được gặp lại bạn</p>
      <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">
        Chào bạn đọc.
      </h1>
      <p className="mt-3 text-sm leading-7 text-muted">
        Đăng nhập để tiếp tục câu chuyện của bạn.
      </p>
      <form
        onSubmit={handleSubmit(submit)}
        noValidate
        className="mt-8 space-y-5"
      >
        {params.get("registered") === "1" && (
          <p role="status" className="notice-success">
            Tài khoản đã sẵn sàng. Đăng nhập để khám phá tủ sách nhé!
          </p>
        )}
        {error && (
          <p role="alert" className="notice-error">
            {error}
          </p>
        )}
        <label className="field-label">
          Địa chỉ email
          <div className="relative">
            <Icon
              name="mail"
              className="pointer-events-none absolute top-3.5 left-3.5 size-4.5 text-muted"
            />
            <input
              type="email"
              autoComplete="email"
              placeholder="ban@vidu.com"
              {...register("email")}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              className="field pl-10"
            />
          </div>
          {errors.email && (
            <span
              id="login-email-error"
              className="text-xs font-normal text-red-600"
            >
              {errors.email.message}
            </span>
          )}
        </label>
        <label className="field-label">
          Mật khẩu
          <div className="relative">
            <Icon
              name="lock"
              className="pointer-events-none absolute top-3.5 left-3.5 size-4.5 text-muted"
            />
            <input
              type={visible ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Nhập mật khẩu của bạn"
              {...register("password")}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? "login-password-error" : undefined
              }
              className="field pr-12 pl-10"
            />
            <button
              type="button"
              aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              aria-pressed={visible}
              onClick={() => setVisible(!visible)}
              className="absolute top-1 right-1 flex size-10 items-center justify-center rounded-lg text-muted hover:text-brand"
            >
              <Icon name="eye" className="size-4.5" />
            </button>
          </div>
          {errors.password && (
            <span
              id="login-password-error"
              className="text-xs font-normal text-red-600"
            >
              {errors.password.message}
            </span>
          )}
        </label>
        <button
          type="submit"
          disabled={loading}
          className="button-primary mt-2 w-full"
        >
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          <Icon name="arrow" className="ml-auto size-4" />
        </button>
      </form>
      <p className="mt-7 text-center text-sm text-muted">
        Mới ghé hiệu sách?{" "}
        <Link
          href="/register"
          className="font-semibold text-brand underline-offset-4 hover:underline"
        >
          Tạo tài khoản
        </Link>
      </p>
      <div className="mt-8 flex items-center justify-center gap-2 border-t border-line pt-6 text-[11px] text-muted">
        <Icon name="book" className="size-4 text-brand" />
        Một cuốn sách hay luôn là một khởi đầu tốt.
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="page-shell py-12">
          <div className="h-96 animate-pulse rounded-3xl bg-paper" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
