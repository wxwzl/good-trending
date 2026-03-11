"use client";

import { useEffect, useState } from "react";
import { onToast, type ToastType } from "@/lib/toast";
import { useTranslations } from "next-intl";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export function ToastProvider() {
  const t = useTranslations();
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsubscribe = onToast(({ message, type = "info", duration = 5000 }) => {
      const id = Math.random().toString(36).substring(7);
      const toast: Toast = { id, message, type };

      setToasts((prev) => [...prev, toast]);

      // 自动移除
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    });

    return unsubscribe;
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-lg border px-4 py-3 shadow-lg ${
            toast.type === "error"
              ? "border-destructive/50 bg-destructive text-destructive-foreground"
              : toast.type === "warning"
                ? "border-yellow-500/50 bg-yellow-500 text-white"
                : toast.type === "success"
                  ? "border-green-500/50 bg-green-500 text-white"
                  : "border-border bg-background text-foreground"
          }`}
          role="alert"
        >
          <div className="flex items-center gap-2">
            {/* Icon */}
            {toast.type === "error" && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="8" y2="12" />
                <line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
            )}
            {toast.type === "warning" && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" x2="12" y1="9" y2="13" />
                <line x1="12" x2="12.01" y1="17" y2="17" />
              </svg>
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
