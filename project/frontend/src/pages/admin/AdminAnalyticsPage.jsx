import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { People, Crown1, TrendUp, Activity } from "iconsax-reactjs";
import api from "../../lib/api";

// Màu chart — hardcode hex giống AdminDashboardPage
const C = {
  brand: "#1039da",
  magenta: "#b1008d",
  pink: "#ff57cf",
  lime: "#9fc93c",
  muted: "#89707d",
  amber: "#f5a524",
};

const nf = new Intl.NumberFormat("vi-VN");
const PROVIDER_LABEL = { LOCAL: "Email / mật khẩu", GOOGLE: "Google", FACEBOOK: "Facebook" };
const DAY_OPTIONS = [
  { label: "7 ngày", value: 7 },
  { label: "30 ngày", value: 30 },
  { label: "90 ngày", value: 90 },
];

function Panel({ title, subtitle, children, className = "" }) {
  return (
    <section className={`rounded-3xl border border-line bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4">
        <h3 className="text-sm font-bold text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Kpi({ label, value, hint, Icon, tone }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted">{label}</p>
        <span
          className="flex size-9 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${tone}1a`, color: tone }}
        >
          <Icon size={18} variant="Bulk" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="flex h-48 items-center justify-center rounded-2xl bg-canvas px-4 text-center text-xs text-muted">
      {text}
    </div>
  );
}

// Biểu đồ tròn + chú thích (dùng cho gói / nguồn đăng nhập)
function DonutWithLegend({ data }) {
  const total = data.reduce((s, x) => s + x.value, 0);
  if (total === 0) return <Empty text="Chưa có dữ liệu" />;
  return (
    <div className="flex items-center gap-4">
      <div className="h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => nf.format(v)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-2 text-xs">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-mauve">{d.name}</span>
            <b className="text-ink">
              {nf.format(d.value)} ({Math.round((d.value * 100) / total)}%)
            </b>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Top kiểu tóc dạng danh sách có thanh tỷ lệ
function TopList({ items, color, emptyText }) {
  if (!items?.length) return <Empty text={emptyText} />;
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <ol className="space-y-3">
      {items.map((h, idx) => (
        <li key={h.id} className="flex items-center gap-3">
          <span className="w-5 text-center text-xs font-bold text-muted">{idx + 1}</span>
          <img
            src={h.imageUrl}
            alt={h.name}
            loading="lazy"
            className="size-10 shrink-0 rounded-xl bg-canvas object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-ink">
                {h.name}
                {h.premiumOnly && <span className="ml-1.5 text-[10px] font-bold text-magenta">PREMIUM</span>}
              </p>
              <b className="text-sm text-ink">{nf.format(h.count)}</b>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-canvas">
              <div className="h-full rounded-full" style={{ width: `${(h.count / max) * 100}%`, backgroundColor: color }} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState(30);

  const users = useQuery({
    queryKey: ["admin-analytics-users"],
    queryFn: async () => (await api.get("/admin/analytics/users")).data,
  });
  const styles = useQuery({
    queryKey: ["admin-analytics-hairstyles", days],
    queryFn: async () => (await api.get("/admin/analytics/hairstyles", { params: { days, limit: 10 } })).data,
    placeholderData: (prev) => prev,
  });

  const u = users.data;
  const s = styles.data;

  const tierData = u
    ? [
        { name: "Miễn phí", value: u.freeUsers, color: C.muted },
        { name: "Gói Tuần (PRO)", value: u.proUsers, color: C.brand },
        { name: "Gói Tháng (PREMIUM)", value: u.premiumUsers, color: C.magenta },
      ]
    : [];
  const providerColors = { LOCAL: C.brand, GOOGLE: C.amber, FACEBOOK: C.pink };
  const providerData = (u?.byProvider ?? []).map((p) => ({
    name: PROVIDER_LABEL[p.name] ?? p.name,
    value: p.count,
    color: providerColors[p.name] ?? C.muted,
  }));

  const trackingSince = s?.triedTrackingSince
    ? new Date(s.triedTrackingSince).toLocaleDateString("vi-VN")
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Phân tích</h1>
        <p className="text-sm text-muted">Cơ cấu người dùng và kiểu tóc được ưa chuộng.</p>
      </div>

      {/* ===== Người dùng ===== */}
      <h2 className="text-sm font-bold uppercase tracking-wide text-mauve">Người dùng</h2>
      {users.isLoading ? (
        <div className="h-32 animate-pulse rounded-3xl bg-line" />
      ) : users.error || !u ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600">
          Không thể tải phân tích người dùng.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Tổng người dùng" value={nf.format(u.totalUsers)} Icon={People} tone={C.brand} />
            <Kpi
              label="Đang có gói trả phí"
              value={nf.format(u.proUsers + u.premiumUsers)}
              hint={`${nf.format(u.proUsers)} Tuần · ${nf.format(u.premiumUsers)} Tháng`}
              Icon={Crown1}
              tone={C.magenta}
            />
            <Kpi
              label="Tỷ lệ chuyển đổi"
              value={`${u.conversionRatePercent}%`}
              hint={`${nf.format(u.payingUsersEver)} user từng trả tiền / tổng user`}
              Icon={TrendUp}
              tone={C.lime}
            />
            <Kpi
              label="Rời bỏ 30 ngày qua"
              value={nf.format(u.churnedLast30Days)}
              hint="Gói hết hạn và không gia hạn"
              Icon={Activity}
              tone={C.amber}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Phân bố theo gói" subtitle="Free = tổng user trừ user đang có gói trả phí">
              <DonutWithLegend data={tierData} />
            </Panel>
            <Panel title="Nguồn đăng nhập" subtitle="Cách người dùng tạo tài khoản">
              <DonutWithLegend data={providerData} />
            </Panel>
          </div>
        </>
      )}

      {/* ===== Kiểu tóc ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-mauve">Kiểu tóc</h2>
        <div className="flex gap-1 rounded-xl bg-white p-1 shadow-sm">
          {DAY_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setDays(o.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                days === o.value ? "bg-brand text-white" : "text-mauve hover:bg-canvas"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      {styles.isLoading ? (
        <div className="h-64 animate-pulse rounded-3xl bg-line" />
      ) : styles.error || !s ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600">
          Không thể tải phân tích kiểu tóc.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel
            title="Được thử AI nhiều nhất"
            subtitle={
              trackingSince
                ? `Số liệu ${days} ngày gần nhất, chỉ tính từ ${trackingSince} (ngày bắt đầu ghi nhận)`
                : "Chưa có lượt thử nào được ghi nhận"
            }
          >
            <TopList items={s.topTried} color={C.brand} emptyText="Chưa có dữ liệu lượt thử trong khoảng này" />
          </Panel>
          <Panel title="Được lưu yêu thích nhiều nhất" subtitle="Tính trên toàn bộ thời gian">
            <TopList items={s.topSaved} color={C.magenta} emptyText="Chưa có kiểu tóc nào được lưu yêu thích" />
          </Panel>
        </div>
      )}
    </div>
  );
}
