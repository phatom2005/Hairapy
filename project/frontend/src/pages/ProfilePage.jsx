import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Calendar, Location, Call, Clock } from "iconsax-reactjs";
import { AnimatedContent, SpotlightCard } from "../components/animated";
import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import { Badge, Button, Card, Section, SectionHeading } from "../components/ui";
import api from "../lib/api";
import UserAvatar from "../components/ui/UserAvatar";
import useAuthStore from "../store/useAuthStore";
import { useScanStore } from "../store/useScanStore";
import PremiumGateModal from "../components/PremiumGateModal";
import { PLAN_LABEL } from "../lib/plans";

// Bản đồ dịch dáng mặt sang tiếng Việt (đồng bộ với ResultsPage.jsx)
const FACE_SHAPE_MAP = {
  Oval: "Trái xoan",
  Round: "Tròn",
  Square: "Vuông",
  Heart: "Trái tim",
  Oblong: "Dài",
  Diamond: "Kim cương",
};

const TABS = [
  { key: "overview", label: "Tổng quan" },
  { key: "history", label: "Lịch sử quét" },
  { key: "swaps", label: "Ảnh đã thử tóc" },
  { key: "saved", label: "Yêu thích" },
  { key: "bookings", label: "Lịch hẹn Salon" },
];

export default function ProfilePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { setSelectedHairstyle, hydrateFromHistory } = useScanStore();

  const tabParam = searchParams.get("tab");
  const activeTab = ["overview", "history", "swaps", "saved", "bookings"].includes(tabParam)
    ? tabParam
    : "overview";

  const setActiveTab = (tab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    });
  };

  const [gateStyle, setGateStyle] = useState(null);

  const userName = user?.fullName || (user?.email ? user.email.split("@")[0] : "Người dùng");
  const userRole = user?.role === "ADMIN" ? "Admin" : (user?.role === "PREMIUM" ? "Premium" : "Thành viên");

  // Truy vấn lịch sử quét từ API
  const { data: scanData } = useQuery({
    queryKey: ["profile-scans"],
    queryFn: async () => {
      const { data } = await api.get("/profile/scans");
      return data;
    },
  });

  // Truy vấn kiểu tóc yêu thích từ API
  const { data: savedStyles = [], isLoading: savedLoading } = useQuery({
    queryKey: ["profile-saved-styles"],
    queryFn: async () => {
      const { data } = await api.get("/profile/saved-styles");
      return data;
    },
  });

  const scans = scanData?.scans || [];

  // Lịch sử ảnh đã thử tóc (giữ 30 ngày, tối đa 20 ảnh)
  const { data: swapData, isLoading: swapsLoading } = useQuery({
    queryKey: ["profile-swaps"],
    queryFn: async () => (await api.get("/profile/swaps")).data,
  });
  const swaps = swapData?.swaps || [];

  const handleDeleteSwap = async (id) => {
    if (!window.confirm("Xoá ảnh này khỏi lịch sử? Hành động không thể hoàn tác.")) return;
    try {
      await api.delete(`/profile/swaps/${id}`);
      queryClient.invalidateQueries({ queryKey: ["profile-swaps"] });
    } catch {
      window.alert("Không xoá được ảnh. Vui lòng thử lại.");
    }
  };

  // Lịch sử yêu cầu đặt lịch salon
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["profile-bookings"],
    queryFn: async () => {
      const res = await api.get("/bookings/my");
      return res.data || [];
    },
    enabled: !!user,
  });

  const handleCancelBooking = async (bId) => {
    if (!window.confirm("Bạn có chắc chắn muốn huỷ yêu cầu đặt lịch này không?")) return;
    try {
      await api.put(`/bookings/${bId}/cancel`);
      queryClient.invalidateQueries({ queryKey: ["profile-bookings"] });
    } catch (err) {
      window.alert(err.response?.data?.error || "Không thể huỷ lịch hẹn. Vui lòng thử lại.");
    }
  };

  // Cloudinary: chèn fl_attachment để trình duyệt tải xuống thay vì mở tab mới
  const downloadUrl = (url) => (url || "").replace("/upload/", "/upload/fl_attachment/");
  const latestScan = scans[0];
  const latestFaceShape = latestScan?.faceShape || null;
  const latestFaceShapeVi = latestFaceShape ? (FACE_SHAPE_MAP[latestFaceShape] || latestFaceShape) : "Chưa quét";

  // Lấy các đề xuất kiểu tóc thực tế dựa trên dáng mặt gần nhất của người dùng
  const { data: recommendations = [], isLoading: recsLoading } = useQuery({
    queryKey: ["profile-recs", latestFaceShape],
    queryFn: async () => {
      const { data } = await api.get("/hairstyles", { params: { faceShape: latestFaceShape } });
      return data;
    },
    enabled: !!latestFaceShape,
  });



  const handleTryStyle = (style) => {
    const isPaidUser = user?.plan && user.plan !== "FREE";
    if (style.premiumOnly && !isPaidUser) {
      setGateStyle(style);
      return;
    }
    setSelectedHairstyle({
      id: style.id,
      name: style.name,
      imageUrl: style.imageUrl,
      ailabHairType: style.ailabHairType,
      ailabProStyle: style.ailabProStyle
    });
    navigate(`/swap?hairstyleId=${style.id}`);
  };

  // Hàm hủy lưu kiểu tóc yêu thích
  const handleUnsave = async (hairstyleId) => {
    try {
      await api.delete("/profile/saved-styles", {
        params: { hairstyleId }
      });
      queryClient.invalidateQueries({ queryKey: ["profile-saved-styles"] });
    } catch (err) {
      console.error("Lỗi khi hủy lưu kiểu tóc:", err);
    }
  };

  const formatScanDate = (isoString) => {
    if (!isoString) return "";
    try {
      return new Date(isoString).toLocaleDateString("vi-VN");
    } catch {
      return "";
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} - ${d.toLocaleDateString("vi-VN")}`;
    } catch {
      return "";
    }
  };

  const BOOKING_STATUS_CONFIG = {
    PENDING: { label: "Chờ salon xác nhận", badge: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
    CONFIRMED: { label: "Đã xác nhận", badge: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
    REJECTED: { label: "Salon từ chối", badge: "bg-rose-500/15 text-rose-500 border-rose-500/30" },
    COMPLETED: { label: "Đã hoàn thành", badge: "bg-purple-500/15 text-purple-500 border-purple-500/30" },
    NO_SHOW: { label: "Vắng mặt", badge: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" },
    CANCELLED: { label: "Đã huỷ", badge: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" },
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Header hồ sơ */}
      <section className="bg-transparent px-6 py-12 sm:px-16">
        <AnimatedContent>
          <div className="mx-auto max-w-[1100px] rounded-3xl border border-line bg-canvas p-6 sm:p-8">
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <div className="relative shrink-0">
                <UserAvatar name={userName} email={user?.email} plan={user?.plan} size="lg"
                  className="shadow-lg" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-col items-center gap-2 sm:flex-row">
                  <h1 className="font-display text-3xl font-bold text-ink">{userName}</h1>
                  <Badge variant={user?.role === "ADMIN" ? "new" : "premium"}>{userRole}</Badge>
                </div>
                <p className="mt-1 text-sm text-mauve">{user?.email}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Button to="/settings" variant="outline">Sửa hồ sơ</Button>
                <Button to="/scan">Quét AI mới</Button>
                {user?.role === "ADMIN" && (
                  <Button to="/admin" variant="pink">Dashboard quản trị</Button>
                )}
              </div>
            </div>

            {(() => {
              const userPlan = user?.plan || "FREE";
              const planLabel = PLAN_LABEL[userPlan] || "Miễn phí";
              let planSubtitle = "";
              let isExpiringSoon = false;
              if (user?.planEndDate && userPlan !== "FREE") {
                const end = new Date(user.planEndDate);
                const now = new Date();
                const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
                const formattedEnd = end.toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                });
                planSubtitle = `đến ${formattedEnd}`;
                if (diffDays <= 3) {
                  isExpiringSoon = true;
                }
              }

              return (
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-line bg-white p-4">
                    <p className="text-xs text-muted">Dáng mặt gần nhất</p>
                    <p className="mt-1 text-lg font-bold text-ink">{latestFaceShapeVi}</p>
                  </div>
                  <div className="rounded-2xl border border-line bg-white p-4">
                    <p className="text-xs text-muted">Tổng lượt quét</p>
                    <p className="mt-1 text-lg font-bold text-ink">{scanData?.totalScans?.toString() || "0"}</p>
                  </div>
                  <div className="rounded-2xl border border-line bg-white p-4">
                    <p className="text-xs text-muted">Kiểu tóc đã lưu</p>
                    <p className="mt-1 text-lg font-bold text-ink">{savedStyles.length.toString()}</p>
                  </div>
                  <div className="rounded-2xl border border-line bg-white p-4 flex flex-col justify-between">
                    <div>
                      <p className="text-xs text-muted">Gói hiện tại</p>
                      <p className="mt-1 text-lg font-bold text-ink">
                        {planLabel} {planSubtitle && <span className="text-xs font-normal text-mauve">({planSubtitle})</span>}
                      </p>
                    </div>
                    {isExpiringSoon && (
                      <div className="mt-2 flex items-center justify-between pt-1 border-t border-divider/10">
                        <span className="text-[11px] font-bold text-amber-500">Sắp hết hạn</span>
                        <Link
                          to={`/checkout?plan=${userPlan}`}
                          className="text-xs font-bold text-primary hover:underline"
                        >
                          Gia hạn →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </AnimatedContent>
      </section>

      {/* Thanh tab */}
      <div className="mx-auto max-w-[1100px] px-6 sm:px-16">
        <div className="flex gap-2 border-b border-line">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-3 text-sm font-bold transition-colors ${
                activeTab === t.key
                  ? "border-b-2 border-primary text-primary"
                  : "border-b-2 border-transparent text-mauve hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Tổng quan */}
      {activeTab === "overview" && (
        <AnimatedContent key="overview">
          <Section className="bg-transparent">
            <SectionHeading center={false} title="Đề xuất cho bạn"
              action={<Link to="/catalog" className="flex shrink-0 items-center gap-2 font-bold text-primary">Xem tất cả →</Link>} />

            {recsLoading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                {[1, 2, 3].map((n) => (
                  <Card key={n} padded={false} className="animate-pulse overflow-hidden h-72 bg-line/10" />
                ))}
              </div>
            ) : recommendations.length === 0 ? (
              <Card className="flex flex-col items-center justify-center p-10 text-center border border-divider/10 bg-white">
                <p className="font-bold text-ink">Chưa có đề xuất kiểu tóc</p>
                <p className="text-sm text-mauve max-w-md mt-1">
                  Hãy thực hiện quét phân tích khuôn mặt bằng AI để nhận ngay các gợi ý kiểu tóc phù hợp nhất với bạn.
                </p>
                <Button to="/scan" size="sm" className="mt-4">Bắt đầu quét AI</Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                {recommendations.slice(0, 3).map((r, idx) => (
                  <AnimatedContent key={r.id} delay={idx * 0.1}>
                    <SpotlightCard className="rounded-2xl">
                      <Card padded={false} className="overflow-hidden">
                        <div className="relative">
                          <img src={r.imageUrl} alt={r.name} className="h-56 w-full object-cover"
                            onError={(e) => { e.target.src = `https://placehold.co/600x400?text=${encodeURIComponent(r.name)}`; }} />
                          {r.premiumOnly && (
                            <Badge variant="premium" className="absolute right-3 top-3 shadow">Trả phí</Badge>
                          )}
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-ink">{r.name}</h4>
                          <p className="text-sm text-mauve line-clamp-2 mt-1">{r.description}</p>
                          <div className="mt-4 flex gap-2">
                            <Button
                              onClick={() => handleTryStyle(r)}
                              disabled={r.active === false}
                              size="sm"
                              className="w-full text-xs"
                            >
                              {r.active === false ? "Ngừng hỗ trợ" : "Thử ngay"}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </SpotlightCard>
                  </AnimatedContent>
                ))}
              </div>
            )}
          </Section>
        </AnimatedContent>
      )}

      {/* Tab: Lịch sử quét — MỚI, dữ liệu đã có sẵn từ API nhưng trước đây chưa hiển thị đầy đủ */}
      {activeTab === "history" && (
        <AnimatedContent key="history">
          <Section className="bg-transparent">
            <SectionHeading center={false} title={`${scans.length} lượt quét gần đây`} />

            {scans.length === 0 ? (
              <Card className="flex flex-col items-center justify-center p-10 text-center border border-divider/10 bg-white">
                <p className="font-bold text-ink">Chưa có lượt quét nào</p>
                <p className="text-sm text-mauve max-w-md mt-1">Lịch sử quét khuôn mặt của bạn sẽ hiện ở đây sau khi bạn dùng tính năng Quét AI.</p>
                <Button to="/scan" size="sm" className="mt-4">Bắt đầu quét AI</Button>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {scans.map((s, idx) => (
                  <AnimatedContent key={s.id} delay={Math.min(idx * 0.05, 0.5)}>
                    <Card padded={false} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden p-3.5">
                      <div className="flex items-center gap-4">
                        <img src={s.imageUrl} alt={`Quét ngày ${formatScanDate(s.createdAt)}`}
                          className="size-14 shrink-0 rounded-xl object-cover"
                          onError={(e) => { e.target.src = "https://placehold.co/100x100?text=Scan"; }} />
                        <div>
                          <p className="font-bold text-ink">Dáng mặt: {FACE_SHAPE_MAP[s.faceShape] || s.faceShape}</p>
                          <p className="text-xs text-muted mt-0.5">Chất tóc: {s.hairType || "Chưa xác định"} · {formatScanDate(s.createdAt)}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await hydrateFromHistory(s);
                          navigate("/swap");
                        }}
                        className="text-xs shrink-0 self-end sm:self-center"
                      >
                        Dùng ảnh này để thử tóc
                      </Button>
                    </Card>
                  </AnimatedContent>
                ))}
              </div>
            )}
          </Section>
        </AnimatedContent>
      )}

      {/* Tab: Ảnh đã thử tóc */}
      {activeTab === "swaps" && (
        <AnimatedContent key="swaps">
          <Section className="bg-transparent">
            <SectionHeading center={false} title={`${swaps.length} ảnh đã thử tóc`} />
            <p className="-mt-2 mb-4 text-xs text-muted">
              Ảnh được lưu 30 ngày và tối đa {swapData?.maxItems ?? 20} ảnh gần nhất. Hãy tải về nếu bạn muốn giữ lâu hơn.
            </p>

            {swapsLoading ? (
              <p className="text-sm text-muted">Đang tải...</p>
            ) : swaps.length === 0 ? (
              <Card className="flex flex-col items-center justify-center p-10 text-center border border-divider/10 bg-white">
                <p className="font-bold text-ink">Chưa có ảnh thử tóc nào</p>
                <p className="text-sm text-mauve max-w-md mt-1">Ảnh kết quả sau khi bạn thử kiểu tóc bằng AI sẽ xuất hiện ở đây.</p>
                <Button to="/swap" size="sm" className="mt-4">Thử kiểu tóc ngay</Button>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {swaps.map((sw) => (
                  <Card key={sw.id} padded={false} className="overflow-hidden">
                    <img src={sw.imageUrl} alt={sw.hairstyleName || "Ảnh thử tóc"} loading="lazy"
                      className="aspect-[3/4] w-full object-cover"
                      onError={(e) => { e.target.src = "https://placehold.co/300x400?text=Anh"; }} />
                    <div className="p-3">
                      <p className="truncate text-sm font-bold text-ink">{sw.hairstyleName || "Kiểu tóc"}</p>
                      <p className="text-xs text-muted">{formatScanDate(sw.createdAt)}</p>
                      <div className="mt-2 flex gap-2">
                        <a href={downloadUrl(sw.imageUrl)} download
                          className="flex-1 rounded-full bg-primary px-3 py-1.5 text-center text-xs font-semibold text-white">
                          Tải về
                        </a>
                        <button type="button" onClick={() => handleDeleteSwap(sw.id)}
                          className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-mauve hover:bg-canvas">
                          Xoá
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Section>
        </AnimatedContent>
      )}

      {/* Tab: Yêu thích */}
      {activeTab === "saved" && (
        <AnimatedContent key="saved">
          <Section className="bg-transparent">
            <SectionHeading center={false} title="Phong cách của tôi" />

            {savedLoading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                {[1, 2].map((n) => (
                  <Card key={n} padded={false} className="animate-pulse overflow-hidden h-72 bg-line/10" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {savedStyles.map((sv, idx) => (
                  <AnimatedContent key={sv.id} delay={idx * 0.1}>
                    <SpotlightCard className="rounded-2xl">
                      <Card padded={false} className="overflow-hidden">
                        <div className="relative">
                          <img src={sv.imageUrl} alt={sv.name} className="h-48 w-full object-cover"
                            onError={(e) => { e.target.src = `https://placehold.co/300x300?text=${encodeURIComponent(sv.name)}`; }} />

                          {/* Nút hủy lưu yêu thích nhanh hình trái tim */}
                          <button
                            onClick={() => handleUnsave(sv.id)}
                            className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-white/95 text-pink shadow hover:bg-white transition"
                            title="Bỏ lưu khỏi yêu thích"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="#FF57CF"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="#FF57CF"
                              className="size-4"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                            </svg>
                          </button>
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-ink">{sv.name}</h4>
                          <p className="text-xs text-muted mt-1">Độ dài: {sv.hairLength} | Dáng mặt: {sv.faceShape}</p>
                          <div className="mt-3 flex gap-2">
                            <Button to={`/results?hairstyleId=${sv.id}`} size="sm" variant="outline" className="flex-1 px-2 py-2 text-xs">Xem chi tiết</Button>
                            <Button
                              onClick={() => handleTryStyle(sv)}
                              disabled={sv.active === false}
                              size="sm"
                              className="flex-1 px-2 py-2 text-xs"
                            >
                              {sv.active === false ? "Ngừng hỗ trợ" : "Thử lại ngay"}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </SpotlightCard>
                  </AnimatedContent>
                ))}

                {/* Nút thêm mới luôn xuất hiện cuối */}
                <Card className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-divider bg-transparent text-center p-6 h-[280px]">
                  <p className="font-bold text-ink">Thêm phong cách mới</p>
                  <p className="text-sm text-mauve">Khám phá thêm nhiều kiểu tóc từ bộ sưu tập của chúng tôi</p>
                  <Button to="/catalog" variant="outline" size="sm">Khám phá Catalog</Button>
                </Card>
              </div>
            )}
          </Section>
        </AnimatedContent>
      )}

      {/* Tab: Lịch hẹn salon */}
      {activeTab === "bookings" && (
        <AnimatedContent key="bookings">
          <Section className="bg-transparent">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <SectionHeading center={false} title="Lịch hẹn tại Salon" />
                <p className="text-xs text-mauve mt-1">Theo dõi các yêu cầu đặt lịch làm tóc của bạn tại salon đối tác.</p>
              </div>
              <Button to="/salons" variant="pink" size="sm" className="text-xs shrink-0">
                Tìm salon đặt lịch mới →
              </Button>
            </div>

            {bookingsLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[1, 2].map((n) => (
                  <Card key={n} padded={false} className="animate-pulse h-48 bg-line/10" />
                ))}
              </div>
            ) : bookings.length === 0 ? (
              <Card className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-divider bg-transparent text-center p-12">
                <Calendar size={40} className="text-muted" />
                <p className="font-bold text-ink">Chưa có lịch hẹn nào</p>
                <p className="text-sm text-mauve max-w-sm">
                  Thử các kiểu tóc mới trên Hairapy và đặt lịch với các salon đối tác uy tín gần bạn.
                </p>
                <Button to="/salons" variant="outline" size="sm" className="mt-2">
                  Khám phá danh sách Salon
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {bookings.map((b) => {
                  const cfg = BOOKING_STATUS_CONFIG[b.status] || {
                    label: b.status,
                    badge: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
                  };
                  const canCancel = (b.status === "PENDING" || b.status === "CONFIRMED") && new Date(b.preferredTime) > new Date();

                  return (
                    <Card key={b.id} padded={false} className="p-5 border border-line bg-white shadow-xs rounded-2xl flex flex-col justify-between gap-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Link to={`/salons/${b.salonId}`} className="font-bold text-base text-ink hover:text-pink transition-colors">
                              {b.salonName}
                            </Link>
                            <p className="text-xs text-mauve flex items-center gap-1 mt-0.5">
                              <Location size={14} className="shrink-0 text-muted" /> {b.salonAddress}
                            </p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                        </div>

                        {/* Kiểu tóc & ảnh */}
                        {(b.hairstyleName || b.tryOnImageUrl) && (
                          <div className="p-2.5 rounded-xl bg-canvas flex items-center gap-3 border border-line/60">
                            {b.tryOnImageUrl ? (
                              <img src={b.tryOnImageUrl} alt="Ảnh thử" className="w-12 h-12 rounded-lg object-cover shrink-0 border border-line" />
                            ) : null}
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold text-muted">Kiểu tóc mong muốn</p>
                              <p className="text-sm font-bold text-ink truncate">{b.hairstyleName || "Theo ảnh thử tóc"}</p>
                              {b.faceShape && <p className="text-[10px] text-mauve">Dáng mặt: {b.faceShape}</p>}
                            </div>
                          </div>
                        )}

                        <div className="space-y-1 text-xs text-mauve">
                          <p className="flex items-center gap-1.5 font-semibold text-ink">
                            <Clock size={14} className="text-pink" />
                            <span>Thời gian hẹn: {formatDateTime(b.preferredTime)}</span>
                          </p>
                          {b.salonPhone && (
                            <p className="flex items-center gap-1.5">
                              <Call size={14} className="text-muted" />
                              <span>SĐT salon: <a href={`tel:${b.salonPhone}`} className="text-ink font-semibold hover:underline">{b.salonPhone}</a></span>
                            </p>
                          )}
                          {b.note && (
                            <p className="text-muted text-[11px] italic bg-canvas/60 p-2 rounded-lg">
                              Ghi chú của bạn: &quot;{b.note}&quot;
                            </p>
                          )}
                          {b.salonNote && (
                            <p className="text-pink text-[11px] bg-pink/10 p-2 rounded-lg border border-pink/20">
                              Phản hồi từ salon: &quot;{b.salonNote}&quot;
                            </p>
                          )}
                        </div>
                      </div>

                      {canCancel && (
                        <div className="pt-2 border-t border-divider/10 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleCancelBooking(b.id)}
                            className="text-xs text-rose-500 hover:text-rose-600 font-semibold px-3 py-1.5 rounded-lg border border-rose-500/20 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            Huỷ yêu cầu
                          </button>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </Section>
        </AnimatedContent>
      )}

      <Footer />

      <PremiumGateModal
        isOpen={!!gateStyle}
        onClose={() => setGateStyle(null)}
        style={gateStyle}
      />
    </div>
  );
}
