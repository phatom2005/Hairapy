import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Money,
  People,
  Crown1,
  Scan,
  Gallery,
  Star1,
  TrendUp,
  ReceiptText,
} from "iconsax-reactjs";
import api from "../../lib/api";

// Màu dùng cho chart — hardcode hex vì Tailwind 4 có thể bỏ CSS var không dùng
const C = {
  brand: "#1039da",
  primary: "#2a4ae8",
  magenta: "#b1008d",
  pink: "#ff57cf",
  lime: "#d0ee88",
  ink: "#1a1a1a",
  muted: "#89707d",
  line: "#e8e8e8",
  amber: "#f5a524",
  red: "#e5484d",
};

const PERIODS = [
  { label: "7 ngày", value: "7d" },
  { label: "30 ngày", value: "30d" },
  { label: "3 tháng", value: "90d" },
  { label: "1 năm", value: "1y" },
];

const nf = new Intl.NumberFormat("vi-VN");
const formatVND = (n) => `${nf.format(n ?? 0)} ₫`;
// Rút gọn số tiền cho trục Y (1,2tr / 350k)
const compactVND = (n) =>
  n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}tr` : n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`;

// "2026-03-15" → 15/03, "2026-03" → 03/2026
function formatDateLabel(date, granularity) {
  if (!date) return "";
  const [y, m, d] = String(date).slice(0, 10).split("-");
  if (granularity === "month") return `${m}/${y}`;
  return d ? `${d}/${m}` : `${m}/${y}`;
}

const STATUS_LABEL = { PAID: "Đã thanh toán", PENDING: "Chờ", CANCELLED: "Đã huỷ" };
const STATUS_STYLE = {
  PAID: "bg-emerald-50 text-emerald-700",
  PENDING: "bg-amber-50 text-amber-700",
  CANCELLED: "bg-red-50 text-red-600",
};

/* ---------- Thành phần nhỏ ---------- */

function Panel({ title, subtitle, right, children, className = "" }) {
  return (
    <section className={`rounded-3xl border border-line bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
        {right}
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

function ChartTooltip({ active, payload, label, formatter, granularity }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-ink">{formatDateLabel(label, granularity)}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-1.5 text-mauve">
          <span className="size-2 rounded-full" style={{ backgroundColor: p.color || p.stroke }} />
          {p.name}: <b className="text-ink">{formatter ? formatter(p.value) : nf.format(p.value)}</b>
        </p>
      ))}
    </div>
  );
}

function Empty({ text = "Chưa có dữ liệu trong khoảng thời gian này" }) {
  return (
    <div className="flex h-56 items-center justify-center rounded-2xl bg-canvas text-xs text-muted">
      {text}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 w-64 rounded-xl bg-line" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-3xl bg-line" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="h-80 rounded-3xl bg-line xl:col-span-2" />
        <div className="h-80 rounded-3xl bg-line" />
      </div>
    </div>
  );
}

/* ---------- Trang chính ---------- */

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState("30d");

  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-stats", period],
    queryFn: async () => (await api.get("/admin/dashboard/stats", { params: { period } })).data,
    placeholderData: (prev) => prev, // giữ dữ liệu cũ khi đổi kỳ, tránh nháy skeleton
  });

  // Giao dịch gần đây (5 dòng) — lỗi thì chỉ ẩn widget, không chặn cả trang
  const { data: recent } = useQuery({
    queryKey: ["admin-recent-payments"],
    queryFn: async () => (await api.get("/admin/payments", { params: { size: 5, page: 0 } })).data,
    staleTime: 30_000,
  });
  const recentPayments = recent?.content ?? (Array.isArray(recent) ? recent : []);

  if (isLoading) return <Skeleton />;

  if (error || !stats) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center font-semibold text-red-600">
        Không thể tải thông tin thống kê.
      </div>
    );
  }

  const g = stats.granularity;
  const revenue = stats.revenueTrend ?? [];
  const usage = stats.dailyUsage ?? [];
  const regs = stats.registrationTrend ?? [];
  const dist = stats.ratingDistribution ?? [0, 0, 0, 0, 0];
  const ratingMax = Math.max(1, ...dist);

  const txData = [
    { name: "Đã thanh toán", value: stats.paidTransactions ?? 0, color: C.brand },
    { name: "Chờ", value: stats.pendingTransactions ?? 0, color: C.amber },
    { name: "Đã huỷ", value: stats.cancelledTransactions ?? 0, color: C.red },
  ];
  const txTotal = txData.reduce((s, x) => s + x.value, 0);

  const xAxisProps = {
    dataKey: "date",
    tickFormatter: (d) => formatDateLabel(d, g),
    tick: { fontSize: 11, fill: C.muted },
    axisLine: false,
    tickLine: false,
    minTickGap: 24,
  };

  return (
    <div className="space-y-5">
      {/* Tiêu đề + chọn kỳ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Tổng quan</h1>
          <p className="text-xs text-muted">Số liệu kinh doanh và sử dụng của Hairapy</p>
        </div>
        <div className="inline-flex rounded-2xl border border-line bg-white p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                period === p.value ? "bg-ink text-white" : "text-mauve hover:text-ink"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Doanh thu trong kỳ"
          value={formatVND(stats.revenueInPeriod)}
          hint={`Tổng: ${formatVND(stats.totalRevenue)} · ${stats.paidTransactionsInPeriod ?? 0} giao dịch`}
          Icon={Money}
          tone={C.brand}
        />
        <Kpi
          label="Người dùng"
          value={nf.format(stats.totalUsers ?? 0)}
          hint={`${stats.totalAdmins ?? 0} admin`}
          Icon={People}
          tone={C.magenta}
        />
        <Kpi
          label="Gói Premium đang hoạt động"
          value={nf.format(stats.activeSubscriptions ?? 0)}
          Icon={Crown1}
          tone={C.amber}
        />
        <Kpi
          label="Lượt dùng AI"
          value={nf.format((stats.totalScans ?? 0) + (stats.totalSwaps ?? 0))}
          hint={`Hôm nay: ${stats.scansToday ?? 0} scan · ${stats.swapsToday ?? 0} thử tóc`}
          Icon={Scan}
          tone={C.primary}
        />
      </div>

      {/* Doanh thu + đánh giá */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Doanh thu"
          subtitle={`${formatVND(stats.revenueInPeriod)} trong kỳ`}
          right={<TrendUp size={18} variant="Bulk" color={C.brand} />}
        >
          {revenue.length === 0 ? (
            <Empty />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenue} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.brand} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={C.brand} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={C.line} strokeDasharray="3 3" />
                  <XAxis {...xAxisProps} />
                  <YAxis
                    width={44}
                    tickFormatter={compactVND}
                    tick={{ fontSize: 11, fill: C.muted }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={<ChartTooltip formatter={formatVND} granularity={g} />}
                    cursor={{ stroke: C.line }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Doanh thu"
                    stroke={C.brand}
                    strokeWidth={2.5}
                    fill="url(#gRevenue)"
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel
          title="Đánh giá"
          subtitle={`${stats.ratingCount ?? 0} lượt đánh giá`}
          right={<Star1 size={18} variant="Bulk" color={C.amber} />}
        >
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-ink">
              {(stats.ratingAverage ?? 0).toFixed(1)}
            </span>
            <span className="pb-1 text-xs text-muted">/ 5</span>
          </div>
          <div className="mt-4 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const v = dist[star - 1] ?? 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-mauve">{star}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-canvas">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(v / ratingMax) * 100}%`, backgroundColor: C.amber }}
                    />
                  </div>
                  <span className="w-8 text-right text-muted">{v}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* Sử dụng + đăng ký */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Lượt sử dụng AI"
          subtitle="Scan + thử kiểu tóc theo thời gian"
          right={<Gallery size={18} variant="Bulk" color={C.magenta} />}
        >
          {usage.length === 0 ? (
            <Empty />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usage} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={C.line} strokeDasharray="3 3" />
                  <XAxis {...xAxisProps} />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: C.muted }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={<ChartTooltip granularity={g} />}
                    cursor={{ fill: "#00000008" }}
                  />
                  <Bar dataKey="count" name="Lượt dùng" fill={C.magenta} radius={[6, 6, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel
          title="Đăng ký mới"
          subtitle="Người dùng mới theo thời gian"
          right={<People size={18} variant="Bulk" color={C.primary} />}
        >
          {regs.length === 0 ? (
            <Empty />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={regs} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={C.line} strokeDasharray="3 3" />
                  <XAxis {...xAxisProps} />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: C.muted }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={<ChartTooltip granularity={g} />}
                    cursor={{ stroke: C.line }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Đăng ký"
                    stroke={C.primary}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      {/* Giao dịch */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="Trạng thái giao dịch"
          subtitle={`${txTotal} giao dịch`}
          right={<ReceiptText size={18} variant="Bulk" color={C.brand} />}
        >
          {txTotal === 0 ? (
            <Empty text="Chưa có giao dịch" />
          ) : (
            <>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={txData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={70}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {txData.map((x) => (
                        <Cell key={x.name} fill={x.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1.5">
                {txData.map((x) => (
                  <li key={x.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-mauve">
                      <span className="size-2.5 rounded-sm" style={{ backgroundColor: x.color }} />
                      {x.name}
                    </span>
                    <b className="text-ink">{x.value}</b>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>

        <Panel title="Giao dịch gần đây" subtitle="5 giao dịch mới nhất" className="lg:col-span-2">
          {recentPayments.length === 0 ? (
            <Empty text="Chưa có giao dịch nào" />
          ) : (
            <ul className="divide-y divide-line">
              {recentPayments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {p.userName || p.userEmail}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {p.plan} · {p.createdAt ? new Date(p.createdAt).toLocaleString("vi-VN") : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-bold text-ink">{formatVND(p.amount)}</span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        STATUS_STYLE[p.status] ?? "bg-canvas text-mauve"
                      }`}
                    >
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
