import { useEffect, useState, useCallback } from "react";
import api from "../../lib/api";
import { Card, Button } from "../../components/ui";

export default function AdminUsagePage() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchUsageHistory = useCallback(() => {
    setLoading(true);
    api
      .get("/admin/usage", { params: { page, size: 50 } })
      .then((res) => {
        setLogs(res.data.content || []);
        setTotalPages(res.data.totalPages || 1);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [page]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchUsageHistory();
      }
    });
    return () => {
      active = false;
    };
  }, [fetchUsageHistory]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return (
      date.toLocaleDateString("vi-VN") +
      " " +
      date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    );
  };

  const renderFeatureBadge = (feature) => {
    if (feature === "FACE_SCAN") {
      return (
        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
          Quét khuôn mặt AI
        </span>
      );
    }
    if (feature === "HAIR_SWAP") {
      return (
        <span className="inline-flex items-center rounded-full bg-pink/10 px-3 py-1 text-xs font-bold text-magenta border border-pink/20">
          Thử kiểu tóc AI
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-gray-50 px-3 py-1 text-xs font-bold text-gray-700 border border-gray-200">
        {feature}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display text-3xl font-bold text-ink">Nhật ký sử dụng tính năng</h2>
        <p className="text-sm text-mauve">Chi tiết lịch sử thao tác của các tài khoản trên hệ thống</p>
      </div>

      {/* Logs Table */}
      <Card className="overflow-hidden border border-divider/10" padded={false}>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="size-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-muted">
            Chưa có ghi nhận hoạt động sử dụng nào
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas text-xs font-bold uppercase tracking-wider text-muted">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">User ID</th>
                  <th className="px-6 py-4">Email người dùng</th>
                  <th className="px-6 py-4">Tính năng hoạt động</th>
                  <th className="px-6 py-4">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-canvas/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-ink">{log.id}</td>
                    <td className="px-6 py-4 font-semibold text-muted">#{log.userId}</td>
                    <td className="px-6 py-4 text-ink font-medium">{log.userEmail || "Tài khoản ẩn danh / Xóa"}</td>
                    <td className="px-6 py-4">{renderFeatureBadge(log.feature)}</td>
                    <td className="px-6 py-4 text-muted">{formatDate(log.usedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-xs font-semibold text-muted">
            Trang {page + 1} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="px-4 py-2 rounded-xl text-xs"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              Trước
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="px-4 py-2 rounded-xl text-xs"
              disabled={page === totalPages - 1 || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
