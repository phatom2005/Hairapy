import { useState } from "react";
import useAuthStore from "../store/useAuthStore";
import api from "../lib/api";
import { trackEvent } from "../lib/analytics";
import { Button } from "./ui";

// Các lý do báo cáo — khớp enum AiReportReason ở backend
const REASONS = [
  { value: "INAPPROPRIATE", label: "Nội dung phản cảm / không phù hợp" },
  { value: "DISTORTED", label: "Ảnh bị méo, lỗi hoặc sai lệch" },
  { value: "PRIVACY", label: "Vi phạm quyền riêng tư" },
  { value: "OTHER", label: "Lý do khác" },
];

/**
 * Nút báo cáo ảnh do AI tạo ra (chính sách Google Play về nội dung AI).
 * Thu gọn thành một dòng chữ nhỏ, bấm vào mới mở form chọn lý do.
 */
export default function AiReportButton({ imageUrl, hairstyleId, feature = "HAIR_SWAP" }) {
  const token = useAuthStore((state) => state.token);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  if (!token) return null;

  if (sent) {
    return (
      <p className="text-center text-xs font-semibold text-emerald-600">
        Đã gửi báo cáo. Cảm ơn bạn, chúng mình sẽ xem xét sớm nhất.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-auto block text-xs font-semibold text-muted underline-offset-2 hover:text-ink hover:underline">
        Báo cáo ảnh này
      </button>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason || loading) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      await api.post("/reports", {
        reason,
        comment: comment.trim() || null,
        imageUrl: imageUrl || null,
        hairstyleId: hairstyleId || null,
        feature,
      });
      setSent(true);
      trackEvent("ai_report_submit", { reason, feature });
    } catch (err) {
      setErrorMessage(
        err.response?.status === 429
          ? err.response.data?.error || "Bạn đã gửi quá nhiều báo cáo hôm nay."
          : "Không gửi được, thử lại sau.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-line bg-canvas p-4">
      <div>
        <h4 className="text-sm font-bold text-ink">Báo cáo ảnh do AI tạo ra</h4>
        <p className="mt-0.5 text-xs text-muted">Cho chúng mình biết ảnh này có vấn đề gì nhé.</p>
      </div>

      <div className="space-y-1.5">
        {REASONS.map((r) => (
          <label key={r.value} className="flex cursor-pointer items-center gap-2 text-xs text-ink">
            <input
              type="radio"
              name="ai-report-reason"
              value={r.value}
              checked={reason === r.value}
              onChange={() => setReason(r.value)}
              className="accent-brand"
            />
            {r.label}
          </label>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, 500))}
        placeholder="Mô tả thêm (không bắt buộc)..."
        rows={2}
        maxLength={500}
        className="w-full resize-none rounded-xl border border-line bg-white p-3 text-xs text-ink outline-none transition placeholder:text-muted focus:border-brand"
      />

      {errorMessage && <p className="text-xs font-semibold text-red-500">{errorMessage}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={!reason || loading} className="rounded-xl px-4 py-2 text-xs font-bold">
          {loading ? "Đang gửi..." : "Gửi báo cáo"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpen(false)}
          className="rounded-xl px-4 py-2 text-xs font-bold">
          Huỷ
        </Button>
      </div>
    </form>
  );
}
