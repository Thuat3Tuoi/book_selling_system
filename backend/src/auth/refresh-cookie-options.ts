import type { CookieOptions } from "express";

export function cookieOptions(nodeEnv = process.env.NODE_ENV): CookieOptions {
    return {
        httpOnly: true,
        secure: nodeEnv === "production",
        sameSite: nodeEnv === "production" ? "none" : "lax",
        path: "/auth",
    };
}

export const refreshCookieOptions = cookieOptions();
