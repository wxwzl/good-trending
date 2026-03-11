/**
 * 全局 Toast 通知系统
 * 用于显示全局错误消息（如 429 限流）
 */

export type ToastType = "error" | "warning" | "info" | "success";

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

type ToastListener = (options: ToastOptions) => void;

let listener: ToastListener | null = null;

/**
 * 注册 toast 监听器
 * 在 ToastProvider 组件中调用
 */
export function onToast(callback: ToastListener) {
  listener = callback;
  return () => {
    listener = null;
  };
}

/**
 * 显示 toast 通知
 */
export function showToast(options: ToastOptions) {
  if (listener) {
    listener(options);
  } else {
    // 如果没有监听器，降级到 console
    console.log(`[${options.type?.toUpperCase() || "INFO"}]`, options.message);
  }
}

/**
 * 显示错误 toast
 */
export function showError(message: string, duration?: number) {
  showToast({ message, type: "error", duration });
}

/**
 * 显示警告 toast
 */
export function showWarning(message: string, duration?: number) {
  showToast({ message, type: "warning", duration });
}

/**
 * 显示成功 toast
 */
export function showSuccess(message: string, duration?: number) {
  showToast({ message, type: "success", duration });
}
