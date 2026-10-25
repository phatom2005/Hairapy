import { useEffect, useState } from "react";
import { Button } from "../ui";

export default function ConfirmDialog({
  open,
  title = "Xác nhận hành động",
  message = "Bạn có chắc chắn muốn thực hiện hành động này không?",
  confirmText = "Xác nhận",
  cancelText = "Huỷ",
  danger = false,
  requireReason = false,
  reasonPlaceholder = "Nhập lý do thực hiện...",
  onConfirm,
  onCancel,
  loading = false,
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && open && !loading) {
        setReason("");
        onCancel?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;

  const handleCancel = () => {
    setReason("");
    onCancel?.();
  };

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) return;
    const finalReason = reason.trim();
    setReason("");
    onConfirm?.(requireReason ? finalReason : undefined);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        onClick={!loading ? handleCancel : undefined}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
      />

      {/* Dialog Box */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-line bg-canvas p-6 shadow-2xl transition-all">
        <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
        <div className="mt-2 text-sm text-mauve leading-relaxed">{message}</div>

        {requireReason && (
          <div className="mt-4">
            <label className="block text-xs font-semibold text-ink mb-1.5">
              Lý do <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              disabled={loading}
              className="w-full resize-none rounded-2xl border border-line bg-white p-3 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-hidden disabled:bg-line/20"
            />
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            className="text-xs"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={loading || (requireReason && !reason.trim())}
            className={`text-xs ${
              danger
                ? "bg-red-600 hover:bg-red-700 text-white border-transparent"
                : ""
            }`}
          >
            {loading ? "Đang xử lý..." : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
