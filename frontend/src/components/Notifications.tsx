"use client";

import { useEffect, useState } from "react";
import {
  type Notification,
  useNotificationStore,
} from "@/stores/notification.store";
import Icon from "@/components/Icon";

function NotificationCard({ notification }: { notification: Notification }) {
  const dismiss = useNotificationStore((state) => state.dismiss);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const { id, type, message } = notification;

  useEffect(() => {
    if (hovered || focused) return;
    const timer = setTimeout(() => dismiss(id), type === "error" ? 8000 : 5000);
    return () => clearTimeout(timer);
  }, [id, type, dismiss, hovered, focused]);

  const colors = {
    success: "border-brand/20 bg-sage text-brand",
    error: "border-red-200 bg-red-50 text-red-700",
    info: "border-sky-200 bg-sky-50 text-sky-800",
  };
  const icons = { success: "check", error: "alert", info: "info" } as const;

  return (
    <div
      className={`animate-enter pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-lg ${colors[type]}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <Icon name={icons[type]} className="mt-0.5 size-5 shrink-0" />
      <p
        role={type === "error" ? "alert" : "status"}
        aria-atomic="true"
        className="min-w-0 flex-1 text-sm leading-6 break-words"
      >
        {message}
      </p>
      <button
        type="button"
        onClick={() => dismiss(id)}
        aria-label="Đóng thông báo"
        className="-m-1 flex size-8 shrink-0 items-center justify-center rounded-full transition hover:bg-black/5"
      >
        <Icon name="close" className="size-4" />
      </button>
    </div>
  );
}

export default function Notifications() {
  const notifications = useNotificationStore((state) => state.notifications);

  return (
    <section
      aria-label="Thông báo"
      className="pointer-events-none fixed top-4 right-4 left-4 z-[60] flex flex-col gap-3 sm:left-auto sm:w-96"
    >
      {notifications.map((notification) => (
        <NotificationCard key={notification.id} notification={notification} />
      ))}
    </section>
  );
}
