"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import type { User } from "@/lib/types";
import { api, decodeAccessToken } from "@/lib/api";

interface AuthContextValue {
  user: User | null;
  isReady: boolean;
  loginWithToken: (accessToken: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        // ignore corrupted value
      }
    }
    setIsReady(true);
  }, []);

  async function loginWithToken(accessToken: string) {
    localStorage.setItem("accessToken", accessToken);

    const decoded = decodeAccessToken(accessToken);
    let nextUser: User;

    try {
      // Giờ backend đã có GET /user/me (xem backend-patch-user-me.zip)
      nextUser = await api.getMe();
    } catch {
      // Fallback nếu chưa deploy patch backend: chỉ có email từ token
      nextUser = {
        id: decoded?.sub ?? 0,
        email: decoded?.email ?? "",
        firstName: decoded?.email?.split("@")[0] ?? "Người dùng",
        lastName: "",
      };
    }

    localStorage.setItem("user", JSON.stringify(nextUser));
    setUser(nextUser);
  }

  function logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isReady, loginWithToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải dùng bên trong AuthProvider");
  return ctx;
}
