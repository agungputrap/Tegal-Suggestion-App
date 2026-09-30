import { useEffect, useRef } from "react";
import { BTN_DANGER, BTN_PRIMARY, BTN_SECONDARY, CARD } from "./ui";

/*
 * Dialog & toast kecil pengganti confirm()/alert() native (tier 2 #36,
 * lanjutan tier 0 — tombol OK/Cancel Inggris & blokir jadi jelek di mobile).
 * Bahasa Indonesia santai; fokus & keyboard ditangani sama seperti
 * PlaceModal (Escape, fokus awal, restore).
 */

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Ya, lanjut",
  cancelLabel = "Batal",
  danger = true,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      trigger?.focus?.();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    // z-[1100] di atas PlaceModal (z-50) & bottom nav (z-40)
    <div
      className="fixed inset-0 z-[1100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className={`${CARD} p-5 rounded-2xl max-w-sm w-full shadow-2xl space-y-3`}
      >
        <p className="text-sm font-bold text-slate-900 dark:text-white">
          {title}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{message}</p>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button className={BTN_SECONDARY} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            className={
              danger
                ? BTN_DANGER
                : BTN_PRIMARY
            }
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Toast sederhana — dikelola pemanggil (set pesan, auto-hide via setTimeout).
export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[1100] bg-slate-900/95 dark:bg-slate-800/95 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg"
    >
      {message}
    </div>
  );
}
