import { useEffect, useState, useCallback } from "react";
import api from "../../lib/api";
import { Card, Button } from "../../components/ui";

const REASON_LABELS = {
  INAPPROPRIATE: "Phản cảm / không phù hợp",
  DISTORTED: "Ảnh méo, lỗi",
  PRIVACY: "Quyền riêng tư",
  OTHER: "Khác",
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function AdminAiReportsPage() {
  const [reports, setReports] = useState([]);
  const [statusFilter, setStatusFilter] = useState("NEW");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(() => {
    setLoading(true);
    api
      .get("/admin/ai-reports", { params: { page, size: 10, status: statusFilter || undefined } })
      .then((res) => {
        setReports(res.data.content || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalElements(res.data.totalElements || 0);
      })
      .catch((err) => console.error("Lỗi tải báo cáo nội dung AI:", err))
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) fetchReports();
    });
    return () => {
      active = false;
    };
  }, [fetchReports]);

  const handleResolve = async (id) => {
    try {
      await api.post(`/admin/ai-reports/${id}/resolve`);
      fetchReports();
    } catch (err) {
      console.error("Không đánh dấu được báo cáo:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold text-ink">Báo cáo nội dung AI</h2>
          <p className="text-sm text-mauve">Ảnh thử tóc do AI tạo ra bị người dùng báo cáo</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">Trạng thái:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="rounded-2xl border-2 border-line bg-white py-2 px-3 text-sm font-semibold text-ink outline-none transition focus:border-brand">
            <option value="NEW">Chưa xử lý</option>
            <option value="RESOLVED">Đã xử lý</option>
            <option value="">Tất cả</option>
          </select>
        </div>
      </div>

      <Card className="overflow-hidden border border-divider/10" padded={false}>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="size-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          </div>
        ) : reports.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted">Không có báo cáo nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-5 py-3">Thời gian</th>
                  <th className="px-5 py-3">Người dùng</th>
                  <th className="px-5 py-3">Lý do</th>
                  <th className="px-5 py-3">Mô tả</th>
                  <th className="px-5 py-3">Ảnh</th>
                  <th className="px-5 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {reports.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-canvas/50">
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">{formatDateTime(r.createdAt)}</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="font-semibold text-ink">{r.userName || "Ẩn danh"}</div>
                      <div className="text-xs text-mauve">{r.userEmail || "—"}</div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-ink">
                      {REASON_LABELS[r.reason] || r.reason}
                    </td>
                    <td className="max-w-xs px-5 py-4">
                      <p className={`text-sm ${r.comment ? "text-ink" : "italic text-muted"}`}>
                        {r.comment || "(không có mô tả)"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      {r.imageUrl ? (
                        <a href={r.imageUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-brand hover:underline">
                          Xem ảnh
                        </a>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      {r.status === "NEW" ? (
                        <Button size="sm" variant="outline" className="rounded-xl px-3 py-1.5 text-xs font-bold" onClick={() => handleResolve(r.id)}>
                          Đánh dấu đã xử lý
                        </Button>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600">Đã xử lý</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs font-semibold text-muted">
            Trang {page + 1} / {totalPages} (Tổng: {totalElements} báo cáo)
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="rounded-xl px-4 py-2 text-xs font-bold" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              Trang trước
            </Button>
            <Button size="sm" variant="outline" className="rounded-xl px-4 py-2 text-xs font-bold" disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
              Trang sau
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
