import { useEffect, useState, useCallback } from "react";
import api from "../../lib/api";
import { Card, Button } from "../../components/ui";

export default function AdminFeedbackPage() {
  const [feedbackList, setFeedbackList] = useState([]);
  const [ratingFilter, setRatingFilter] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "—";
    const pad = (n) => String(n).padStart(2, "0");
    const d = pad(date.getDate());
    const m = pad(date.getMonth() + 1);
    const y = date.getFullYear();
    const h = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${d}/${m}/${y} ${h}:${min}`;
  };

  const fetchFeedback = useCallback(() => {
    setLoading(true);
    const params = {
      page,
      size: 10,
      rating: ratingFilter ? Number(ratingFilter) : undefined,
    };
    api
      .get("/admin/feedback", { params })
      .then((res) => {
        setFeedbackList(res.data.content || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalElements(res.data.totalElements || 0);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Lỗi tải danh sách đánh giá:", err);
        setLoading(false);
      });
  }, [page, ratingFilter]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchFeedback();
      }
    });
    return () => {
      active = false;
    };
  }, [fetchFeedback]);

  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-1 text-amber-400">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= rating ? "text-amber-500 font-bold" : "text-gray-300"}>
            ★
          </span>
        ))}
        <span className="ml-1 text-xs font-bold text-ink">{rating} / 5</span>
      </div>
    );
  };

  const renderFeatureBadge = (feature) => {
    switch (feature) {
      case "FACE_SCAN":
        return (
          <span className="inline-flex items-center rounded-full bg-pink/10 px-2.5 py-0.5 text-xs font-bold text-magenta border border-pink/20">
            Quét khuôn mặt
          </span>
        );
      case "HAIR_SWAP":
        return (
          <span className="inline-flex items-center rounded-full bg-lime/20 px-2.5 py-0.5 text-xs font-bold text-[#6a8b0d] border border-lime/30">
            Thử kiểu tóc
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-canvas px-2.5 py-0.5 text-xs font-semibold text-mauve border border-divider/20">
            {feature || "Hệ thống"}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold text-ink">Đánh giá người dùng</h2>
          <p className="text-sm text-mauve">Phản hồi và số sao đánh giá sau khi sử dụng tính năng AI</p>
        </div>

        {/* Lọc theo số sao */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">Lọc số sao:</span>
          <select
            value={ratingFilter}
            onChange={(e) => {
              setRatingFilter(e.target.value);
              setPage(0);
            }}
            className="rounded-2xl border-2 border-line bg-white py-2 px-3 text-sm font-semibold text-ink outline-none transition focus:border-brand"
          >
            <option value="">Tất cả đánh giá</option>
            <option value="5">5 sao (Rất hài lòng)</option>
            <option value="4">4 sao (Hài lòng)</option>
            <option value="3">3 sao (Bình thường)</option>
            <option value="2">2 sao (Chưa hài lòng)</option>
            <option value="1">1 sao (Tệ)</option>
          </select>
        </div>
      </div>

      {/* Bảng danh sách đánh giá */}
      <Card className="overflow-hidden border border-divider/10" padded={false}>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="size-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          </div>
        ) : feedbackList.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-muted">
            Không tìm thấy đánh giá nào
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas text-xs font-bold uppercase tracking-wider text-muted">
                  <th className="px-5 py-4">Thời gian</th>
                  <th className="px-5 py-4">Người dùng</th>
                  <th className="px-5 py-4">Đánh giá</th>
                  <th className="px-5 py-4">Tính năng</th>
                  <th className="px-5 py-4">Nhận xét</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {feedbackList.map((fb) => (
                  <tr key={fb.id} className="hover:bg-canvas/50 transition-colors">
                    <td className="px-5 py-4 text-xs text-muted whitespace-nowrap">
                      {formatDateTime(fb.createdAt)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-semibold text-ink">{fb.userName || "Ẩn danh"}</div>
                      <div className="text-xs text-mauve">{fb.userEmail || "—"}</div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {renderStars(fb.rating)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {renderFeatureBadge(fb.feature)}
                    </td>
                    <td className="px-5 py-4 max-w-md">
                      <p className={`text-sm ${fb.comment ? "text-ink" : "text-muted italic"}`}>
                        {fb.comment ? fb.comment : "(không có nhận xét)"}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Phân trang */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs font-semibold text-muted">
            Trang {page + 1} / {totalPages} (Tổng: {totalElements} đánh giá)
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="px-4 py-2 rounded-xl text-xs font-bold"
              disabled={page === 0}
              onClick={() => setPage((prev) => Math.max(0, prev - 1))}
            >
              Trang trước
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="px-4 py-2 rounded-xl text-xs font-bold"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
            >
              Trang sau
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
