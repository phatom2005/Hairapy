import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Magicpen,
  Refresh2,
  TrendUp,
  TrendDown,
  Warning2,
  ArrowRight,
  Shop,
  Scan,
  Gallery,
  Money,
  People,
} from "iconsax-reactjs";
import api from "../../lib/api";

const nf = new Intl.NumberFormat("vi-VN");
const formatVND = (n) => `${nf.format(n ?? 0)} ₫`;

export default function WeeklyInsightPanel() {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);

  const {
    data: digest,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin-weekly-digest"],
    queryFn: async () => {
      const res = await api.get("/admin/insights/weekly");
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      await api.post("/admin/insights/weekly/refresh");
      await refetch();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Chưa thể làm mới lúc này. Vui lòng thử lại sau.";
      setRefreshError(msg);
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-line bg-white p-5 shadow-sm animate-pulse">
        <div className="h-5 w-40 bg-canvas rounded-full mb-3" />
        <div className="h-16 bg-canvas rounded-2xl mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="h-14 bg-canvas rounded-xl" />
          <div className="h-14 bg-canvas rounded-xl" />
          <div className="h-14 bg-canvas rounded-xl" />
          <div className="h-14 bg-canvas rounded-xl" />
        </div>
      </div>
    );
  }

  if (!digest) return null;

  return (
    <section className="rounded-3xl border border-line bg-gradient-to-br from-white via-white to-primary/5 p-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Magicpen size={18} variant="Bulk" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-ink">Insight tuần này</h2>
              <span className="rounded-full border border-line bg-canvas px-2.5 py-0.5 text-[11px] font-semibold text-muted">
                {digest.period}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  digest.aiGenerated
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-surface text-mauve border border-line"
                }`}
              >
                {digest.aiGenerated ? "Tóm tắt do AI tạo" : "Tóm tắt vận hành"}
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              So sánh 7 ngày gần nhất với 7 ngày trước đó
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-sm transition hover:bg-canvas disabled:opacity-50"
          >
            <Refresh2
              size={14}
              className={refreshing ? "animate-spin text-primary" : "text-muted"}
            />
            {refreshing ? "Đang tạo..." : "Tạo lại ngay"}
          </button>
          <Link
            to="/admin/ga"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline ml-1"
          >
            Chi tiết GA4 & Phễu
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {refreshError && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
          {refreshError}
        </div>
      )}

      {/* Summary Box */}
      <div className="rounded-2xl border border-line/80 bg-canvas/60 p-4 mb-4">
        <p className="text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">
          Đánh giá tổng quan
        </p>
        <p className="text-xs leading-relaxed text-ink whitespace-pre-line">
          {digest.aiSummary}
        </p>
      </div>

      {/* Anomaly Alerts */}
      {digest.anomalies && digest.anomalies.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-muted mb-2">
            Biến động đáng chú ý (&ge; 20%):
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {digest.anomalies.map((a, idx) => {
              const isUp = a.direction === "UP";
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 rounded-xl border p-2.5 text-xs ${
                    isUp
                      ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                      : "border-red-200 bg-red-50/70 text-red-900"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isUp ? (
                      <TrendUp size={16} className="text-emerald-600" />
                    ) : (
                      <Warning2 size={16} className="text-red-600" />
                    )}
                  </div>
                  <div>
                    <span className="font-semibold">{a.metric}:</span>{" "}
                    <span>{a.note}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <MetricCard
          label="Người dùng"
          current={digest.users.lastWeek}
          prev={digest.users.prevWeek}
          change={digest.users.changePercent}
          anomaly={digest.users.anomaly}
          Icon={People}
        />
        <MetricCard
          label="Quét mặt"
          current={digest.scans.lastWeek}
          prev={digest.scans.prevWeek}
          change={digest.scans.changePercent}
          anomaly={digest.scans.anomaly}
          Icon={Scan}
        />
        <MetricCard
          label="Thử tóc AI"
          current={digest.swaps.lastWeek}
          prev={digest.swaps.prevWeek}
          change={digest.swaps.changePercent}
          anomaly={digest.swaps.anomaly}
          Icon={Gallery}
        />
        <MetricCard
          label="Lưu yêu thích"
          current={digest.saves.lastWeek}
          prev={digest.saves.prevWeek}
          change={digest.saves.changePercent}
          anomaly={digest.saves.anomaly}
          Icon={Magicpen}
        />
        <MetricCard
          label="Đặt lịch salon"
          current={digest.bookings.lastWeek}
          prev={digest.bookings.prevWeek}
          change={digest.bookings.changePercent}
          anomaly={digest.bookings.anomaly}
          Icon={Shop}
        />
        <MetricCard
          label="Doanh thu"
          current={formatVND(digest.revenue.totalLastWeek)}
          prev={formatVND(digest.revenue.totalPrevWeek)}
          change={digest.revenue.changePercent}
          anomaly={digest.revenue.anomaly}
          Icon={Money}
        />
      </div>
    </section>
  );
}

function MetricCard({ label, current, prev, change, anomaly, Icon }) {
  const isUp = anomaly === "UP";
  const isDown = anomaly === "DOWN";

  return (
    <div className="rounded-2xl border border-line/60 bg-white p-3 shadow-xs">
      <div className="flex items-center justify-between text-muted mb-1">
        <span className="text-[11px] font-medium">{label}</span>
        {Icon && <Icon size={14} className="opacity-70" />}
      </div>
      <p className="text-base font-bold text-ink truncate">{current}</p>
      <div className="flex items-center justify-between gap-1 mt-1 text-[10px]">
        <span className="text-muted truncate">Tuần trước: {prev}</span>
        <span
          className={`font-semibold shrink-0 flex items-center gap-0.5 ${
            isUp
              ? "text-emerald-600"
              : isDown
              ? "text-red-600"
              : "text-muted"
          }`}
        >
          {isUp ? (
            <TrendUp size={10} />
          ) : isDown ? (
            <TrendDown size={10} />
          ) : null}
          {change > 0 ? `+${change}%` : `${change}%`}
        </span>
      </div>
    </div>
  );
}
