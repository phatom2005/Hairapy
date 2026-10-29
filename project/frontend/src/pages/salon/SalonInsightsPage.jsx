import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TrendUp,
  Flash,
  Location,
  Clock,
  Danger,
  Add,
  TickCircle,
  Eye,
  Calendar,
  DirectInbox,
} from "iconsax-reactjs";
import { Card, Button, Badge } from "../../components/ui";
import api from "../../lib/api";

export default function SalonInsightsPage() {
  const queryClient = useQueryClient();
  const [addingId, setAddingId] = useState(null);
  const [actionMsg, setActionMsg] = useState(null);

  // 1. Fetch dữ liệu insights
  const {
    data: insights,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["salon-owner-insights"],
    queryFn: async () => {
      const res = await api.get("/salon-owner/insights");
      return res.data;
    },
    staleTime: 60_000,
    retry: false,
  });

  // 2. Fetch danh sách kiểu tóc hiện tại của salon để bổ sung kiểu mới
  const { data: currentHairstyles = [] } = useQuery({
    queryKey: ["salon-owner-hairstyles"],
    queryFn: async () => {
      const res = await api.get("/salon-owner/hairstyles");
      return res.data;
    },
    staleTime: 60_000,
  });

  // 3. Mutation thêm kiểu tóc vào salon
  const addHairstyleMutation = useMutation({
    mutationFn: async (styleId) => {
      // Tập hợp các kiểu tóc hiện đang nhận làm
      const payload = currentHairstyles
        .filter((h) => h.offered)
        .map((h) => ({
          hairstyleId: h.id,
          price: h.price,
        }));
      // Thêm kiểu tóc mới
      payload.push({ hairstyleId: styleId, price: null });
      const res = await api.put("/salon-owner/hairstyles", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salon-owner-hairstyles"] });
      queryClient.invalidateQueries({ queryKey: ["salon-owner-insights"] });
      queryClient.invalidateQueries({ queryKey: ["salon-owner-stats"] });
      setActionMsg("Đã thêm thành công vào danh mục kiểu tóc nhận làm!");
      setTimeout(() => setActionMsg(null), 4000);
      setAddingId(null);
    },
    onError: (err) => {
      const msg = err.response?.data?.error || "Không thể thêm kiểu tóc. Vui lòng thử lại.";
      setActionMsg(msg);
      setTimeout(() => setActionMsg(null), 4000);
      setAddingId(null);
    },
  });

  const handleAddStyle = (styleId) => {
    setAddingId(styleId);
    addHairstyleMutation.mutate(styleId);
  };

  // Trạng thái kiểm tra gói đối tác hết hạn
  const isExpired = error?.response?.data?.partnerExpired;

  if (isExpired) {
    return (
      <Card className="p-8 sm:p-12 text-center border-2 border-amber-500/30 bg-amber-500/5 rounded-3xl">
        <div className="mx-auto size-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4">
          <Danger size={32} />
        </div>
        <h2 className="font-display text-xl font-bold text-ink">Gói đối tác của bạn đã hết hạn</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-mauve">
          Báo cáo xu hướng khu vực là tính năng chuyên biệt dành cho Salon Đối tác. Vui lòng gia hạn gói đối tác để tiếp tục xem số liệu phân tích và tối ưu kinh doanh.
        </p>
        <div className="mt-6">
          <Button to="/for-salons#dang-ky" className="px-6 py-2.5 text-xs font-bold">
            Gia hạn gói đối tác
          </Button>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-line/20 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-line/20 rounded-2xl" />
          <div className="h-64 bg-line/20 rounded-2xl" />
        </div>
        <div className="h-48 bg-line/20 rounded-2xl" />
      </div>
    );
  }

  if (isError || !insights) {
    return (
      <Card className="p-8 text-center text-mauve border border-line">
        <p className="text-sm">Không thể tải thông tin xu hướng khu vực.</p>
        <p className="text-xs text-muted mt-1">Vui lòng thử lại sau.</p>
      </Card>
    );
  }

  const {
    city,
    district,
    topTriedInCity = [],
    topRequestedInDistrict = [],
    missingHotStyles = [],
    peakHours = [],
    funnel = { impression: 0, click: 0, bookingSubmit: 0, confirmed: 0, completed: 0 },
  } = insights;

  // Tính max peak hours để vẽ biểu đồ
  const maxHourCount = Math.max(1, ...peakHours.map((h) => h.count));

  // Các bước phễu
  const funnelSteps = [
    { label: "Lượt hiển thị", count: funnel.impression, icon: Eye, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Lượt xem tiệm", count: funnel.click, icon: DirectInbox, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { label: "Yêu cầu đặt lịch", count: funnel.bookingSubmit, icon: Calendar, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Đã xác nhận", count: funnel.confirmed, icon: Clock, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Hoàn thành", count: funnel.completed, icon: TickCircle, color: "text-pink", bg: "bg-pink/10" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl flex items-center gap-2.5">
            <TrendUp size={28} className="text-pink" />
            Xu Hướng Khu Vực
          </h1>
          <p className="text-xs sm:text-sm text-mauve mt-1 flex items-center gap-1.5">
            <Location size={16} className="text-primary" />
            Khu vực: <span className="font-semibold text-ink">{district ? `${district}, ` : ""}{city}</span> (Dữ liệu 30 ngày qua)
          </p>
        </div>
        {actionMsg && (
          <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <TickCircle size={16} className="text-emerald-600" />
            {actionMsg}
          </div>
        )}
      </div>

      {/* Section 1: Phễu chuyển đổi salon */}
      <Card className="p-6 border border-line bg-white shadow-sm rounded-2xl">
        <h2 className="font-display text-base font-bold text-ink mb-1">
          Phễu chuyển đổi của salon
        </h2>
        <p className="text-xs text-mauve mb-6">
          Hành trình từ lúc khách hàng thấy salon trong gợi ý &quot;Cắt kiểu này ở đâu?&quot; tới lúc hoàn thành lịch cắt.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {funnelSteps.map((step, idx) => {
            const Icon = step.icon;
            const prevCount = idx > 0 ? funnelSteps[idx - 1].count : null;
            const convRate = step.count != null && prevCount && prevCount > 0
              ? Math.round((step.count / prevCount) * 100)
              : null;

            return (
              <div
                key={step.label}
                className="relative flex flex-col justify-between rounded-xl border border-line/60 bg-canvas/40 p-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`size-8 rounded-lg ${step.bg} ${step.color} flex items-center justify-center`}>
                      <Icon size={18} />
                    </span>
                    {convRate !== null && (
                      <span className="text-[10px] font-bold text-mauve">
                        {convRate}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-mauve">{step.label}</p>
                </div>
                <p className="font-display text-2xl font-black text-ink mt-2">
                  {/* null = chưa có dữ liệu (lượt hiển thị cần GA) */}
                  {step.count == null ? "—" : step.count.toLocaleString("vi-VN")}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Section 2: Kiểu hot chưa nhận làm (Cơ hội kinh doanh) */}
      {missingHotStyles.length > 0 && (
        <Card className="p-6 border-2 border-pink/30 bg-pink/[0.02] shadow-sm rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div>
              <h2 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <Flash size={20} className="text-amber-500" variant="Bold" />
                Kiểu đang hot bạn chưa nhận làm ({missingHotStyles.length})
              </h2>
              <p className="text-xs text-mauve mt-0.5">
                Các kiểu tóc này đang có nhiều lượt thử tại {city}. Thêm vào danh mục để thu hút thêm khách hàng đặt lịch.
              </p>
            </div>
          </div>

          <div className="divide-y divide-line/40">
            {missingHotStyles.map((item) => (
              <div key={item.hairstyleId} className="flex items-center justify-between py-3 gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="size-14 rounded-xl object-cover shrink-0 border border-line"
                    onError={(e) => {
                      e.target.src = `https://placehold.co/100x100?text=${encodeURIComponent(item.name)}`;
                    }}
                  />
                  <div>
                    <h3 className="font-bold text-ink text-sm">{item.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {item.growthPct > 0 && (
                        <Badge variant="new" className="text-[10px] px-1.5 py-0.2 font-bold">
                          ↑{item.growthPct}%
                        </Badge>
                      )}
                      <span className="text-[11px] text-mauve">Điểm hot: {item.score}</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => handleAddStyle(item.hairstyleId)}
                  disabled={addingId === item.hairstyleId || addHairstyleMutation.isPending}
                  size="sm"
                  className="shrink-0 text-xs gap-1.5"
                >
                  <Add size={16} />
                  {addingId === item.hairstyleId ? "Đang thêm..." : "Thêm vào kiểu nhận làm"}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Grid 2 cột: Top kiểu tóc thành phố + Top yêu cầu cùng quận */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top kiểu thử nhiều ở Thành phố */}
        <Card className="p-6 border border-line bg-white shadow-sm rounded-2xl">
          <h2 className="font-display text-base font-bold text-ink mb-1">
            Top 10 kiểu tóc được thử nhiều tại {city}
          </h2>
          <p className="text-xs text-mauve mb-4">
            Dựa trên số lượt thử tóc thực tế của người dùng Hairapy trong 30 ngày qua.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line text-mauve uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="pb-2.5">Hạng</th>
                  <th className="pb-2.5">Kiểu tóc</th>
                  <th className="pb-2.5 text-right">Tăng trưởng</th>
                  <th className="pb-2.5 text-right">Lượt thử</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/30">
                {topTriedInCity.map((st, idx) => (
                  <tr key={st.hairstyleId} className="hover:bg-canvas/50">
                    <td className="py-2.5 font-bold text-mauve">#{idx + 1}</td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={st.imageUrl}
                          alt={st.name}
                          className="size-9 rounded-lg object-cover shrink-0 border border-line"
                          onError={(e) => {
                            e.target.src = `https://placehold.co/60x60?text=${encodeURIComponent(st.name)}`;
                          }}
                        />
                        <span className="font-semibold text-ink line-clamp-1">{st.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-right font-bold text-primary">
                      {st.growthPct > 0 ? `↑${st.growthPct}%` : "—"}
                    </td>
                    <td className="py-2.5 text-right font-medium text-ink">
                      {st.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Top yêu cầu đặt lịch cùng quận */}
        <Card className="p-6 border border-line bg-white shadow-sm rounded-2xl">
          <h2 className="font-display text-base font-bold text-ink mb-1">
            Khách hay đặt kiểu nào tại {district || "khu vực"}?
          </h2>
          <p className="text-xs text-mauve mb-4">
            Thống kê tổng hợp ẩn danh từ các yêu cầu đặt lịch gửi tới các salon cùng quận trong 30 ngày qua.
          </p>

          {topRequestedInDistrict.length === 0 ? (
            <div className="py-12 text-center text-mauve text-xs">
              Chưa có đủ dữ liệu yêu cầu đặt lịch trong quận này 30 ngày qua.
            </div>
          ) : (
            <div className="space-y-3">
              {topRequestedInDistrict.map((item, idx) => (
                <div key={item.hairstyleName} className="flex items-center justify-between text-xs py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="size-5 rounded-full bg-canvas border border-line text-[10px] font-bold text-mauve flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-ink">{item.hairstyleName}</span>
                  </div>
                  <span className="font-bold text-primary">{item.count} yêu cầu</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Section 4: Giờ cao điểm khách thử tóc */}
      <Card className="p-6 border border-line bg-white shadow-sm rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-base font-bold text-ink flex items-center gap-2">
              <Clock size={20} className="text-primary" />
              Khung giờ khách hay tìm kiểu tóc
            </h2>
            <p className="text-xs text-mauve mt-0.5">
              Phân bố số lượt thử tóc theo từng khung giờ trong ngày (30 ngày qua). Giúp tiệm bố trí thợ tư vấn vào giờ cao điểm.
            </p>
          </div>
        </div>

        {/* Biểu đồ cột tự vẽ bằng CSS div */}
        <div className="pt-8 pb-4">
          <div className="flex items-end gap-1 sm:gap-2 h-44 w-full border-b border-line px-2">
            {peakHours.map((h) => {
              const heightPct = Math.max(4, Math.round((h.count / maxHourCount) * 100));
              const isPeak = h.count === maxHourCount && maxHourCount > 0;

              return (
                <div
                  key={h.hour}
                  className="group relative flex-1 flex flex-col items-center justify-end h-full"
                >
                  {/* Tooltip khi hover */}
                  <div className="pointer-events-none absolute -top-8 z-10 hidden rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-bold text-white shadow group-hover:block whitespace-nowrap">
                    {h.hour}h: {h.count} lượt
                  </div>

                  {/* Cột */}
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t transition-all duration-300 ${
                      isPeak
                        ? "bg-gradient-to-t from-pink to-brand shadow-sm"
                        : "bg-primary/20 hover:bg-primary/40"
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Nhãn trục X các mốc giờ */}
          <div className="flex justify-between text-[10px] text-mauve px-2 pt-2">
            <span>0h</span>
            <span>3h</span>
            <span>6h</span>
            <span>9h</span>
            <span>12h</span>
            <span>15h</span>
            <span>18h</span>
            <span>21h</span>
            <span>23h</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
