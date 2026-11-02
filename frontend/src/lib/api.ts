import axios from "axios";
import { useAuthStore } from "@/stores/auth.store";
import { browserApiUrl } from "@/lib/api-url";

export const api = axios.create({
  baseURL:
    typeof window === "undefined"
      ? (process.env.INTERNAL_API_URL ??
        process.env.NEXT_PUBLIC_API_URL ??
        "http://localhost:3001")
      : browserApiUrl(
          process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
          window.location.origin,
        ),
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
