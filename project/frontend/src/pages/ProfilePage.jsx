import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AnimatedContent, SpotlightCard } from "../components/animated";
import { ArrowRight } from "../components/icons";
import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import { Badge, Button, Card, Section, SectionHeading } from "../components/ui";
import api from "../lib/api";
import { PROFILE_IMG } from "../lib/figmaAssets";
import useAuthStore from "../store/useAuthStore";
import { useScanStore } from "../store/useScanStore";

export default function ProfilePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setSelectedHairstyle } = useScanStore();
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

  const latestScan = scanData?.scans?.[0];
  const latestFaceShape = latestScan?.faceShape || null;
  const latestHairType = latestScan?.hairType || "Chưa xác định";

  // Lấy các đề xuất kiểu tóc thực tế dựa trên dáng mặt gần nhất của người dùng
  const { data: recommendations = [], isLoading: recsLoading } = useQuery({
    queryKey: ["profile-recs", latestFaceShape],
    queryFn: async () => {
      const { data } = await api.get("/hairstyles", { params: { faceShape: latestFaceShape } });
      return data;
    },
    enabled: !!latestFaceShape,
  });

  const displayMetrics = [
    { label: "Dáng mặt gần nhất", value: latestFaceShape || "Chưa quét" },
    { label: "Chất tóc", value: latestHairType },
    { label: "Lượt quét AI", value: scanData?.totalScans?.toString() || "0" },
  ];

  const handleTryStyle = (style) => {
    if (style.premiumOnly && (!user || (user.role !== "PREMIUM" && user.role !== "ADMIN" && user.role !== "TESTER"))) {
      navigate("/pricing");
      return;
    }
    setSelectedHairstyle({
      id: style.id,
      name: style.name,
      imageUrl: style.imageUrl,
      ailabHairType: style.ailabHairType,
      ailabProStyle: style.ailabProStyle
    });
    navigate("/swap");
  };

  // Hàm hủy lưu kiểu tóc yêu thích
  const handleUnsave = async (hairstyleId) => {
    try {
      await api.delete("/profile/saved-styles", {
        params: { hairstyleId }
      });
      // Vô hiệu hóa cache để tự động đồng bộ và load lại dữ liệu trên trang
      queryClient.invalidateQueries({ queryKey: ["profile-saved-styles"] });
    } catch (err) {
      console.error("Lỗi khi hủy lưu kiểu tóc:", err);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Header hồ sơ */}
      <section className="bg-transparent px-6 py-12 sm:px-16">
        <div className="mx-auto flex max-w-[1100px] flex-col items-center gap-6 sm:flex-row sm:items-center">
          <img src={PROFILE_IMG} alt={userName}
            className="size-28 rounded-full border-4 border-white object-cover shadow-lg" />
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col items-center gap-2 sm:flex-row">
              <h1 className="font-display text-3xl font-bold text-ink">{userName}</h1>
              <Badge variant={user?.role === "ADMIN" ? "new" : "premium"}>{userRole}</Badge>
            </div>
            <p className="mt-1 text-sm text-mauve">{user?.email}</p>
            <div className="mt-4 flex justify-center gap-8 sm:justify-start">
              {displayMetrics.map((m) => (
                <div key={m.label}>
                  <p className="text-2xl font-bold text-magenta">{m.value}</p>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Button to="/scan">Quét AI mới</Button>
            <Button to="/settings" variant="outline">Sửa hồ sơ</Button>
            {user?.role === "ADMIN" && (
              <Button to="/admin" variant="pink">Dashboard quản trị</Button>
            )}
          </div>
        </div>
      </section>

      {/* Đề xuất */}
      <Section className="bg-transparent">
        <SectionHeading center={false} title="Đề xuất cho bạn"
          action={<a href="/catalog" className="flex shrink-0 items-center gap-2 font-bold text-primary">Xem tất cả <ArrowRight /></a>} />
        
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
                      <Badge variant="new" className="absolute left-3 top-3 shadow">
                        {98 - idx * 3}% phù hợp
                      </Badge>
                      {r.premiumOnly && (
                        <Badge variant="premium" className="absolute right-3 top-3 shadow">PREMIUM</Badge>
                      )}
                    </div>
                    <div className="p-4">
                      <h4 className="font-bold text-ink">{r.name}</h4>
                      <p className="text-sm text-mauve line-clamp-2 mt-1">{r.description}</p>
                      <div className="mt-4 flex gap-2">
                        <Button onClick={() => handleTryStyle(r)} size="sm" className="w-full text-xs">Thử ngay</Button>
                      </div>
                    </div>
                  </Card>
                </SpotlightCard>
              </AnimatedContent>
            ))}
          </div>
        )}
      </Section>

      {/* Phong cách của tôi */}
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
                        <Button onClick={() => handleTryStyle(sv)} size="sm" className="flex-1 px-2 py-2 text-xs">Thử lại ngay</Button>
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

      <Footer />
    </div>
  );
}
