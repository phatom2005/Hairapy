import { useState } from "react";
import { Link } from "react-router-dom";
import { List, Stat } from "./GaWidgets";
import { CHANNEL_LABEL, PERIODS, fmtDuration, nf, toRows, useGaData } from "./gaUtils";

/**
 * Tóm tắt Google Analytics trên dashboard: vài chỉ số chính + nguồn MXH + kênh.
 * Chi tiết đầy đủ nằm ở trang /admin/ga.
 */
export default function GaPanel() {
  const [days, setDays] = useState(30);
  const { data, isLoading, error, refreshing, refresh } = useGaData(days);
  const o = data?.overview || {};

  const social = (data?.social || []).map((r) => ({
    label: r.platform,
    value: r.sessions,
    note: `· ${nf.format(r.users)} người`,
    color: "#e0457b",
  }));
  const channels = toRows(data?.channels, { labelMap: CHANNEL_LABEL, noteMetric: 1 }).slice(0, 4);

  return (
    <section className="rounded-3xl border border-line bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-ink">Google Analytics (GA4)</h3>
          <p className="mt-0.5 text-xs text-muted">Tóm tắt truy cập web và nguồn từ mạng xã hội</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-line p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setDays(p.value)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  days === p.value ? "bg-ink text-white" : "text-mauve hover:text-ink"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing || isLoading}
            className="rounded-xl border border-line px-3 py-1.5 text-xs font-semibold text-mauve transition hover:text-ink disabled:opacity-50"
          >
            {refreshing ? "Đang tải..." : "Làm mới"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-line" />
      ) : error || !data ? (
        <p className="rounded-xl bg-canvas px-3 py-2 text-xs font-semibold text-muted">Không tải được dữ liệu GA4.</p>
      ) : data.error ? (
        <p className="rounded-xl bg-canvas px-3 py-2 text-xs font-semibold text-muted">{data.error}</p>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Người dùng" value={nf.format(o.activeUsers || 0)} hint={`${nf.format(o.newUsers || 0)} mới`} />
            <Stat label="Phiên truy cập" value={nf.format(o.sessions || 0)} hint={`${nf.format(o.screenPageViews || 0)} lượt xem trang`} />
            <Stat label="Tương tác" value={`${Math.round((o.engagementRate || 0) * 100)}%`} hint={`TB ${fmtDuration(o.averageSessionDuration)} / phiên`} />
            <Stat label="Sự kiện chính" value={nf.format(o.keyEvents || 0)} hint="đăng ký, quét, mua gói…" />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <List title="Mạng xã hội (số phiên)" rows={social} empty="Chưa có lượt truy cập từ MXH. Hãy dùng link có UTM khi đăng bài." />
            <List title="Kênh truy cập (số phiên)" rows={channels} empty="Chưa có dữ liệu." />
          </div>
          <Link to="/admin/ga" className="self-start text-xs font-semibold text-primary hover:underline">
            Xem báo cáo chi tiết →
          </Link>
        </div>
      )}
    </section>
  );
}
