import { useEffect, useState, useCallback } from "react";
import api from "../../lib/api";
import { Card, Button } from "../../components/ui";

// Ngày hôm nay theo giờ Việt Nam, dạng yyyy-MM-dd (khớp tham số date của API)
const todayVn = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());

const nf = new Intl.NumberFormat("vi-VN");

const TABS = [
  { key: "summary", label: "Theo người dùng" },
  { key: "logs", label: "Nhật ký chi tiết" },
];

/** Phase 6.2 — Lượt dùng gom theo người dùng trong 1 ngày (giờ VN). */
function UsageSummary() {
  const [date, setDate] = useState(todayVn);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setLoading(true);
      setError("");
      api
        .get("/admin/usage/summary", { params: { date } })
        .then((res) => active && setData(res.data))
        .catch((err) => active && setError(err.response?.data?.error || "Không tải được thống kê."))
        .finally(() => active && setLoading(false));
    });
    return () => {
      active = false;
    };
  }, [date]);

  const formatTime = (s) =>
    s ? new Date(s).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "—";
  const totals = data?.totals || {};
  const rows = data?.rows || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wider text-muted">
          Ngày (giờ VN)
          <input
            type="date"
            value={date}
            max={todayVn()}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="rounded-2xl border-2 border-line bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-ink outline-none focus:border-brand"
          />
        </label>
        {date !== todayVn() && (
          <Button size="sm" variant="outline" className="rounded-xl px-3 py-2 text-xs" onClick={() => setDate(todayVn())}>
            Về hôm nay
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Người dùng hoạt động", data?.activeUsers],
          ["Quét khuôn mặt", totals.faceScan],
          ["Thử kiểu tóc", totals.hairSwap],
          ["AI Stylist", totals.aiStylist],
        ].map(([label, v]) => (
          <Card key={label} className="border border-divider/10 p-4">
            <p className="text-xs font-semibold text-muted">{label}</p>
            <p className="mt-1 text-2xl font-bold text-ink">{loading ? "…" : nf.format(v ?? 0)}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden border border-divider/10" padded={false}>
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="size-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          </div>
        ) : error ? (
          <div className="flex h-48 items-center justify-center text-sm text-red-600">{error}</div>
        ) : rows.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted">Không có lượt sử dụng nào trong ngày này</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas text-xs font-bold uppercase tracking-wider text-muted">
                  <th className="px-5 py-3">Người dùng</th>
                  <th className="px-5 py-3 text-right">Quét mặt</th>
                  <th className="px-5 py-3 text-right">Thử tóc</th>
                  <th className="px-5 py-3 text-right">AI Stylist</th>
                  <th className="px-5 py-3 text-right">Tổng</th>
                  <th className="px-5 py-3 text-right">Lần cuối</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.userId} className="transition-colors hover:bg-canvas/50">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-ink">{r.userName || "—"}</div>
                      <div className="text-xs text-mauve">{r.userEmail || `#${r.userId}`}</div>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-ink">{r.faceScan || "—"}</td>
                    <td className="px-5 py-3 text-right font-semibold text-ink">{r.hairSwap || "—"}</td>
                    <td className="px-5 py-3 text-right font-semibold text-ink">{r.aiStylist || "—"}</td>
                    <td className="px-5 py-3 text-right font-bold text-brand">{r.total}</td>
                    <td className="px-5 py-3 text-right text-xs text-muted">{formatTime(r.lastUsedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function AdminUsagePage() {
  const [tab, setTab] = useState("summary");
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchUsageHistory = useCallback(() => {
    setLoading(true);
    api
      .get("/admin/usage", { params: { page, size: 50, sort: "usedAt,desc" } })
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
    if (tab !== "logs") return undefined;
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchUsageHistory();
      }
    });
    return () => {
      active = false;
    };
  }, [fetchUsageHistory, tab]);

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
    if (feature === "AI_STYLIST") {
      return (
        <span className="inline-flex items-center rounded-full bg-lime/20 px-3 py-1 text-xs font-bold text-[#6a8b0d] border border-lime/30">
          AI Stylist
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

      <div className="inline-flex rounded-2xl border border-line bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              tab === t.key ? "bg-ink text-white" : "text-mauve hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "summary" && <UsageSummary />}

      {tab === "logs" && (
      <>

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
      </>
      )}
    </div>
  );
}
