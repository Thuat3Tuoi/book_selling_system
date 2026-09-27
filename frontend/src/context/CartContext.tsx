"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import type { Cart } from "@/lib/types";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface CartContextValue {
  cart: Cart | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  addToCart: (bookId: number, quantity?: number) => Promise<void>;
  updateQuantity: (cartItemId: number, quantity: number) => Promise<void>;
  removeItem: (cartItemId: number) => Promise<void>;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setCart(null);
      return;
    }
    setIsLoading(true);
    try {
      const data = await api.getCart(user.id);
      setCart(data);
    } catch {
      setCart(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function addToCart(bookId: number, quantity = 1) {
    if (!user) throw new Error("Cần đăng nhập để thêm vào giỏ hàng");
    await api.addToCart(user.id, bookId, quantity);
    await refresh();
  }

  async function updateQuantity(cartItemId: number, quantity: number) {
    if (quantity <= 0) {
      await api.removeCartItem(cartItemId);
    } else {
      await api.updateCartItem(cartItemId, quantity);
    }
    await refresh();
  }

  async function removeItem(cartItemId: number) {
    await api.removeCartItem(cartItemId);
    await refresh();
  }

  const totalItems =
    cart?.cartItems.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const totalPrice =
    cart?.cartItems.reduce(
      (sum, item) => sum + item.quantity * Number(item.book.price),
      0
    ) ?? 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading,
        refresh,
        addToCart,
        updateQuantity,
        removeItem,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart phải dùng bên trong CartProvider");
  return ctx;
}
