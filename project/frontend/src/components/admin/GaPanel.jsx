import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";

const nf = new Intl.NumberFormat("vi-VN");
const PERIODS = [
  { value: 7, label: "7 ngày" },
  { value: 30, label: "30 ngày" },
  { value: 90, label: "90 ngày" },
];

// Tên sự kiện GA4 → nhãn tiếng Việt, theo thứ tự phễu sử dụng
const EVENT_LABEL = {
  page_view: "Lượt xem trang",
  sign_up: "Đăng ký",
  login: "Đăng nhập",
  face_scan: "Quét khuôn mặt",
  view_hairstyle: "Xem kiểu tóc",
  select_hair_color: "Chọn màu tóc",
  hair_swap: "Thử kiểu tóc",
  download_result: "Tải ảnh kết quả",
  save_favorite: "Lưu yêu thích",
  view_plans: "Xem bảng giá",
  begin_checkout: "Bắt đầu thanh toán",
  purchase: "Mua gói",
  paywall_view: "Bị chặn vì Premium",
  quota_exceeded: "Hết lượt",
  scan_error: "Lỗi quét",
  swap_error: "Lỗi thử tóc",
  ai_report_submit: "Báo cáo nội dung AI",
  feedback_submit: "Gửi đánh giá",
};

// Phễu sử dụng chính (lấy từ số lần sự kiện)
const FUNNEL = ["sign_up", "face_scan", "hair_swap", "begin_checkout", "purchase"];

const CHANNEL_LABEL = {
  "Organic Social": "MXH (tự nhiên)",
  "Paid Social": "MXH (quảng cáo)",
  "Direct": "Truy cập trực tiếp",
  "Organic Search": "Tìm kiếm Google",
  "Referral": "Từ website khác",
  "Unassigned": "Chưa phân loại",
  "Email": "Email",
};

const fmtDuration = (sec) => {
  const s = Math.round(sec || 0);
  return `${Math.floor(s / 60)}p ${String(s % 60).padStart(2, "0")}s`;
};

function Bar({ value, max, color = "#6d3fd6" }) {
  const w = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-canvas">
      <div className="h-full rounded-full" style={{ width: `${w}%`, backgroundColor: color }} />
    </div>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-2xl bg-canvas px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-ink">{value}</p>
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

function List({ title, rows, empty }) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-mauve">{title}</p>
      {rows.length === 0 ? (
        <p className="rounded-xl bg-canvas px-3 py-2 text-xs font-semibold text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {rows.map((r) => (
            <li key={r.label} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="min-w-0 truncate font-semibold text-ink">{r.label}</span>
                <span className="shrink-0 font-bold text-ink">
                  {nf.format(r.value)}
                  {r.note && <span className="ml-1 font-normal text-muted">{r.note}</span>}
                </span>
              </div>
              <Bar value={r.value} max={max} color={r.color} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Số liệu Google Analytics 4 (qua GA4 Data API, backend cache 10 phút).
 * Không cấu hình hoặc lỗi thì chỉ báo trong widget, không ảnh hưởng phần còn lại của dashboard.
 */
export default function GaPanel() {
  const queryClient = useQueryClient();
  const [days, setDays] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-ga", days],
    queryFn: async () => (await api.get("/admin/ga", { params: { days } })).data,
    staleTime: 5 * 60_000,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await api.get("/admin/ga", { params: { days, refresh: true } });
      queryClient.setQueryData(["admin-ga", days], res.data);
    } catch (err) {
      console.error("Không làm mới được GA4:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const o = data?.overview || {};
  const eventCount = (name) => data?.events?.find((r) => r.dims[0] === name)?.metrics[0] ?? 0;

  const channels = (data?.channels || []).map((r) => ({
    label: CHANNEL_LABEL[r.dims[0]] || r.dims[0],
    value: r.metrics[0],
    note: `· ${nf.format(r.metrics[1])} người`,
  }));
  const social = (data?.social || []).map((r) => ({
    label: r.platform,
    value: r.sessions,
    note: `· ${nf.format(r.users)} người`,
    color: "#e0457b",
  }));
  const sources = (data?.sources || []).slice(0, 8).map((r) => ({
    label: r.dims[0],
    value: r.metrics[0],
    note: r.metrics[2] ? `· ${nf.format(r.metrics[2])} sự kiện chính` : "",
  }));
  const funnel = FUNNEL.map((name) => ({ label: EVENT_LABEL[name], value: eventCount(name), color: "#2f9e5e" }));
  const otherEvents = (data?.events || [])
    .filter((r) => !FUNNEL.includes(r.dims[0]))
    .map((r) => ({ label: EVENT_LABEL[r.dims[0]] || r.dims[0], value: r.metrics[0], color: "#8e949b" }));

  return (
    <section className="rounded-3xl border border-line bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-ink">Google Analytics (GA4)</h3>
          <p className="mt-0.5 text-xs text-muted">Nguồn truy cập, mạng xã hội và hành vi người dùng trên web</p>
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
            onClick={handleRefresh}
            disabled={refreshing || isLoading}
            className="rounded-xl border border-line px-3 py-1.5 text-xs font-semibold text-mauve transition hover:text-ink disabled:opacity-50"
          >
            {refreshing ? "Đang tải..." : "Làm mới"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-line" />
      ) : error || !data ? (
        <p className="rounded-xl bg-canvas px-3 py-2 text-xs font-semibold text-muted">Không tải được dữ liệu GA4.</p>
      ) : data.error ? (
        <p className="rounded-xl bg-canvas px-3 py-2 text-xs font-semibold text-muted">{data.error}</p>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Người dùng" value={nf.format(o.activeUsers || 0)} hint={`${nf.format(o.newUsers || 0)} mới`} />
            <Stat label="Phiên truy cập" value={nf.format(o.sessions || 0)} hint={`${nf.format(o.screenPageViews || 0)} lượt xem trang`} />
            <Stat label="Tương tác" value={`${Math.round((o.engagementRate || 0) * 100)}%`} hint={`TB ${fmtDuration(o.averageSessionDuration)} / phiên`} />
            <Stat label="Sự kiện chính" value={nf.format(o.keyEvents || 0)} hint="đăng ký, quét, mua gói…" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <List title="Mạng xã hội (số phiên)" rows={social} empty="Chưa có lượt truy cập từ MXH. Hãy dùng link có UTM khi đăng bài." />
            <List title="Kênh truy cập (số phiên)" rows={channels} empty="Chưa có dữ liệu." />
            <List title="Nguồn / phương tiện chi tiết" rows={sources} empty="Chưa có dữ liệu." />
            <List title="Phễu sử dụng (số lần)" rows={funnel} empty="Chưa có dữ liệu." />
          </div>

          <List title="Sự kiện khác (số lần)" rows={otherEvents} empty="Chưa có dữ liệu." />
          <p className="text-[11px] text-muted">
            Số liệu GA4 thường trễ vài giờ và thấp hơn thực tế một chút do trình chặn quảng cáo. Truy cập của Admin/Tester được gắn nhãn nội bộ; nhớ bật bộ lọc dữ liệu nội bộ trong GA4.
          </p>
        </div>
      )}
    </section>
  );
}
