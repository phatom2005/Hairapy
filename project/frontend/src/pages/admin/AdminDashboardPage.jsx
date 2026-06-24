import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api";
import { Card, Badge } from "../../components/ui";
import { CameraIcon, ScanIcon, UserIcon, CrownIcon } from "../../components/icons";

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState("30d");

  // Fetch dữ liệu thống kê từ API sử dụng useQuery để tự động quản lý loading state
  const { data: stats, isLoading: loading, error: queryError } = useQuery({
    queryKey: ["admin-stats", period],
    queryFn: async () => {
      const { data } = await api.get(`/admin/dashboard/stats`, { params: { period } });
      return data;
    },
  });

  const error = queryError ? "Không thể tải thông tin thống kê." : null;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-2xl border border-red-200 text-center font-semibold">
        {error}
      </div>
    );
  }

  const PERIODS = [
    { label: "7 ngày", value: "7d" },
    { label: "30 ngày", value: "30d" },
    { label: "3 tháng", value: "90d" },
    { label: "1 năm", value: "1y" },
  ];

  // Chuẩn bị dữ liệu cho biểu đồ sử dụng hệ thống
  const dailyData = stats?.dailyUsage || [];
  const maxCount = Math.max(...dailyData.map((d) => d.count), 5);

  // Chuẩn bị dữ liệu cho biểu đồ đăng ký mới
  const regData = stats?.registrationTrend || [];
  const maxRegCount = Math.max(...regData.map((d) => d.count), 5);

  // Hàm định dạng ngày/tháng dựa trên độ chi tiết granularity
  const formatDateLabel = (dateStr) => {
    if (!dateStr) return "";
    const granularity = stats?.granularity || "day";
    if (granularity === "day") {
      const parts = dateStr.split("-");
      if (parts.length >= 3) {
        return `${parts[2]}/${parts[1]}`; // dd/MM
      }
    } else if (granularity === "month") {
      const parts = dateStr.split("-");
      if (parts.length >= 2) {
        return `${parts[1]}/${parts[0]}`; // MM/YYYY
      }
    }
    return dateStr;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="font-display text-3xl font-bold text-ink">Tổng quan hệ thống</h2>
        <p className="text-sm text-mauve">Cập nhật lúc: {new Date().toLocaleDateString("vi-VN")}</p>
      </div>

      {/* Grid 4 Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <Card className="flex items-center gap-5 border border-divider/10">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <UserIcon size={28} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Người dùng</p>
            <h3 className="text-3xl font-extrabold text-ink mt-0.5">{stats?.totalUsers}</h3>
          </div>
        </Card>

        {/* AI Scans Today */}
        <Card className="flex items-center gap-5 border border-divider/10">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-pink/10 text-pink">
            <CameraIcon size={28} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Quét hôm nay</p>
            <h3 className="text-3xl font-extrabold text-ink mt-0.5">{stats?.scansToday}</h3>
          </div>
        </Card>

        {/* Swaps Today */}
        <Card className="flex items-center gap-5 border border-divider/10">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-lime/20 text-[#6a8b0d]">
            <ScanIcon size={28} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Thử tóc hôm nay</p>
            <h3 className="text-3xl font-extrabold text-ink mt-0.5">{stats?.swapsToday}</h3>
          </div>
        </Card>

        {/* Active Premium */}
        <Card className="flex items-center gap-5 border border-divider/10">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-600">
            <CrownIcon size={28} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Gói Premium Active</p>
            <h3 className="text-3xl font-extrabold text-ink mt-0.5">{stats?.activeSubscriptions}</h3>
          </div>
        </Card>
      </div>

      {/* Period Filter Pill Selector */}
      <div className="flex justify-start gap-2 bg-canvas p-1 rounded-full border border-divider/10 max-w-max">
        {PERIODS.map((p) => {
          const isActive = period === p.value;
          return (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                isActive ? "bg-white text-ink shadow border border-divider/5" : "text-muted hover:text-ink"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Activity Chart */}
      <Card className="border border-divider/10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-ink text-lg">Hoạt động hệ thống</h4>
            <p className="text-xs text-muted">
              Tổng lượt quét & thử kiểu tóc trong {PERIODS.find((p) => p.value === period)?.label.toLowerCase() || period} qua
            </p>
          </div>
          <Badge variant="new">{PERIODS.find((p) => p.value === period)?.label || period}</Badge>
        </div>

        {dailyData.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted">
            Chưa có lịch sử hoạt động ghi nhận
          </div>
        ) : (
          <div className="space-y-4">
            {/* Chart Area */}
            <div className="flex h-56 items-end gap-1.5 border-b border-l border-line pb-2 pt-6 px-4">
              {dailyData.map((d, idx) => {
                const heightPercent = (d.count / maxCount) * 100;
                return (
                  <div
                    key={idx}
                    className="flex-1 bg-brand rounded-t-md hover:bg-pink transition-all duration-300 relative group"
                    style={{ height: `${Math.max(heightPercent, 2)}%` }}
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-ink text-white text-[10px] font-bold px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg whitespace-nowrap pointer-events-none z-10">
                      {formatDateLabel(d.date)}: {d.count} lượt
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-axis Labels */}
            <div className="flex justify-between text-[10px] font-bold text-muted px-4">
              <span>{formatDateLabel(dailyData[0]?.date)}</span>
              <span>{formatDateLabel(dailyData[Math.floor(dailyData.length / 2)]?.date)}</span>
              <span>{formatDateLabel(dailyData[dailyData.length - 1]?.date)}</span>
            </div>
          </div>
        )}
      </Card>

      {/* User Registration Trend Chart */}
      <Card className="border border-divider/10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-ink text-lg">Đăng ký người dùng mới</h4>
            <p className="text-xs text-muted">
              Số lượng tài khoản đăng ký mới trong {PERIODS.find((p) => p.value === period)?.label.toLowerCase() || period} qua
            </p>
          </div>
          <Badge variant="new">Tài khoản mới</Badge>
        </div>

        {regData.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted">
            Chưa có lượt đăng ký nào ghi nhận
          </div>
        ) : (
          <div className="space-y-4">
            {/* Chart Area */}
            <div className="flex h-56 items-end gap-1.5 border-b border-l border-line pb-2 pt-6 px-4">
              {regData.map((d, idx) => {
                const heightPercent = (d.count / maxRegCount) * 100;
                return (
                  <div
                    key={idx}
                    className="flex-1 bg-lime rounded-t-md hover:bg-brand transition-all duration-300 relative group"
                    style={{ height: `${Math.max(heightPercent, 2)}%` }}
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-ink text-white text-[10px] font-bold px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg whitespace-nowrap pointer-events-none z-10">
                      {formatDateLabel(d.date)}: {d.count} tài khoản
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-axis Labels */}
            <div className="flex justify-between text-[10px] font-bold text-muted px-4">
              <span>{formatDateLabel(regData[0]?.date)}</span>
              <span>{formatDateLabel(regData[Math.floor(regData.length / 2)]?.date)}</span>
              <span>{formatDateLabel(regData[regData.length - 1]?.date)}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Summary Box */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="bg-canvas border border-divider/20 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Tổng lượt Quét AI</p>
          <p className="text-2xl font-black text-magenta mt-1">{stats?.totalScans} lượt</p>
        </Card>
        <Card className="bg-canvas border border-divider/20 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Tổng lượt Thử kiểu tóc</p>
          <p className="text-2xl font-black text-brand mt-1">{stats?.totalSwaps} lượt</p>
        </Card>
        <Card className="bg-canvas border border-divider/20 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Số lượng Quản trị viên</p>
          <p className="text-2xl font-black text-ink mt-1">{stats?.totalAdmins} Admin</p>
        </Card>
      </div>
    </div>
  );
}
