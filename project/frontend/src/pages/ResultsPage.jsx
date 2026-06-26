import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatedContent, BorderGlow, GlareHover, SpotlightCard } from "../components/animated";
import { ArrowRight, CheckIcon, StarIcon } from "../components/icons";
import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import { Badge, Button, Card, Section, SectionHeading } from "../components/ui";
import api from "../lib/api";
import { useScanStore } from "../store/useScanStore";
import useAuthStore from "../store/useAuthStore";

// Bản đồ dịch dáng mặt sang tiếng Việt
const FACE_SHAPE_TRANSLATION = {
  Oval: "Trái xoan (Oval)",
  Round: "Tròn (Round)",
  Square: "Vuông (Square)",
  Heart: "Trái tim (Heart)",
  Oblong: "Dài/Thuôn (Oblong)",
  Diamond: "Kim cương (Diamond)",
};

const FACE_SHAPE_MAP = {
  Oval: "Trái xoan",
  Round: "Tròn",
  Square: "Vuông",
  Heart: "Trái tim",
  Oblong: "Dài",
  Diamond: "Kim cương",
};

const BASE = import.meta.env.VITE_API_URL || "/api";

// Lý do lựa chọn kiểu tóc dựa theo dáng mặt
const REASONS_MAP = {
  Oval: [
    { title: "Tôn vinh sự cân bằng tự nhiên", desc: "AI đã nhận diện được xương gò má đối xứng của bạn. Các kiểu tóc layer sẽ giúp làm nổi bật sự hài hòa tự nhiên và thanh tú của dáng mặt Oval." },
    { title: "Làm nổi bật đường nét thanh tú", desc: "Đường hàm thon gọn và trán cân đối là ưu điểm lớn. Các kiểu tóc ngắn hoặc vén sau tai sẽ tôn vinh cấu trúc xương lý tưởng này." }
  ],
  Round: [
    { title: "Kéo dài tỷ lệ gương mặt", desc: "Gương mặt tròn có chiều rộng gần bằng chiều dài. Các kiểu tóc dài tỉa tầng hoặc bob lệch sẽ tạo cảm giác gương mặt thon thả và dài hơn." },
    { title: "Tạo độ phồng phần đỉnh đầu", desc: "Phần đỉnh đầu được sấy phồng giúp dịch chuyển trọng tâm thị giác của người đối diện lên trên, làm gương mặt trông thanh thoát hơn." }
  ],
  Square: [
    { title: "Làm mềm các góc cạnh", desc: "Gương mặt vuông có phần hàm sắc sảo. Sóng nước mềm mại hoặc wolf cut tỉa tầng sẽ che bớt góc hàm và tạo độ nữ tính, mềm mại." },
    { title: "Tránh các đường cắt ngang thô", desc: "Các đường layer so le mềm mại ôm sát gương mặt sẽ giúp phá vỡ các khối vuông góc cạnh một cách khéo léo và tự nhiên." }
  ],
  Heart: [
    { title: "Cân bằng nửa dưới gương mặt", desc: "Gương mặt hình tim có trán rộng và cằm nhọn. Các lọn tóc xoăn nhẹ ở phần đuôi giúp bù đắp chiều ngang cho phần cằm hẹp." },
    { title: "Giảm độ rộng vùng trán thái dương", desc: "Mái thưa hoặc mái bay rủ nhẹ sang hai bên sẽ che bớt phần thái dương rộng, tạo tỷ lệ cân đối hơn cho phần trên khuôn mặt." }
  ],
  Oblong: [
    { title: "Mở rộng chiều ngang gương mặt", desc: "Khuôn mặt thuôn dài cần các kiểu tóc xoăn nhẹ hoặc sóng lơi bồng bềnh để tạo cảm giác đầy đặn hơn về chiều rộng." },
    { title: "Rút ngắn chiều dài bằng mái che", desc: "Mái bằng hoặc mái bay che bớt phần trán cao sẽ giúp rút ngắn chiều dài thị giác một cách đáng kể." }
  ],
  Diamond: [
    { title: "Làm dịu phần gò má nhô cao", desc: "Dáng mặt kim cương có gò má rộng và trán, cằm hẹp. Các kiểu tóc bob tỉa tầng ôm nhẹ sẽ che bớt độ rộng vùng gò má." },
    { title: "Tạo độ phồng vùng thái dương", desc: "Độ phồng ở phần thái dương và chân tóc quanh cằm giúp cân đối khoảng cách so với phần gò má rộng nhất." }
  ]
};

export default function ResultsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hairstyleId = searchParams.get("hairstyleId");
  const queryClient = useQueryClient();

  // Lấy kết quả phân tích, ảnh preview, giới tính và hàm set kiểu tóc từ Zustand store
  const { analysisResult, previewUrl, setSelectedHairstyle, gender } = useScanStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!analysisResult) {
      // Bảo toàn hairstyleId khi redirect qua scan
      if (hairstyleId) {
        navigate(`/scan?hairstyleId=${hairstyleId}`);
      } else {
        navigate("/scan");
      }
    }
  }, [analysisResult, navigate, hairstyleId]);

  // Fetch kiểu tóc được chọn từ catalog nếu có
  const { data: chosenHairstyle = null } = useQuery({
    queryKey: ["hairstyle-chosen", hairstyleId],
    queryFn: async () => {
      if (!hairstyleId) return null;
      const { data } = await api.get(`/hairstyles/${hairstyleId}`);
      return data;
    },
    enabled: !!hairstyleId,
  });

  const faceShape = analysisResult?.faceShape;
  const metrics = analysisResult?.metrics;

  const faceShapeVi = FACE_SHAPE_MAP[faceShape] || "Trái xoan";

  // Fetch kiểu tóc gợi ý từ API dựa theo hình dáng khuôn mặt + giới tính
  const { data: recommendations = [], isLoading: recsLoading } = useQuery({
    queryKey: ["hairstyles", faceShapeVi, gender],
    queryFn: async () => {
      const params = { faceShape: faceShapeVi };
      if (gender) params.gender = gender;
      const { data } = await api.get("/hairstyles", { params });
      return data;
    },
    enabled: !!faceShape,
  });

  // Query lấy kiểu tóc đã lưu (đồng bộ key chung)
  const { data: savedStyles = [] } = useQuery({
    queryKey: ["profile-saved-styles"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) return [];
      const { data } = await axios.get(`${BASE}/profile/saved-styles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    }
  });

  const savedIds = new Set(savedStyles.map(s => s.id));

  const handleToggleSave = async (e, hairstyleId) => {
    e.stopPropagation();
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { state: { from: `/results` } });
      return;
    }

    try {
      const isSaved = savedIds.has(hairstyleId);
      const headers = { Authorization: `Bearer ${token}` };
      if (isSaved) {
        await axios.delete(`${BASE}/profile/saved-styles`, {
          params: { hairstyleId },
          headers
        });
      } else {
        await axios.post(`${BASE}/profile/saved-styles`, null, {
          params: { hairstyleId },
          headers
        });
      }
      queryClient.invalidateQueries({ queryKey: ["profile-saved-styles"] });
    } catch (err) {
      console.error("Lỗi khi thay đổi trạng thái yêu thích:", err);
    }
  };

  if (!analysisResult) {
    return null;
  }

  const faceShapeText = FACE_SHAPE_TRANSLATION[faceShape] || faceShape;
  const BIOMETRICS = [
    { label: "Hình dáng khuôn mặt", value: faceShapeText },
    { label: "Tỷ lệ rộng/dài", value: metrics?.widthToLength ? `${(metrics.widthToLength * 100).toFixed(0)}%` : "N/A" },
    { label: "Tỷ lệ trán/hàm", value: metrics?.foreheadToJaw ? metrics.foreheadToJaw.toFixed(2) : "N/A" },
    { label: "Tỷ lệ hàm/gò má", value: metrics?.jawToCheek ? metrics.jawToCheek.toFixed(2) : "N/A" },
  ];

  const symmetryScore = Math.min(99, Math.round(90 + (metrics?.widthToLength ? (1 - Math.abs(0.75 - metrics.widthToLength)) * 10 : 5)));
  const styleScore = Math.round(85 + (metrics?.foreheadToJaw ? Math.min(14, metrics.foreheadToJaw * 10) : 10));

  const SCORES = [
    { label: "Điểm cân đối", value: symmetryScore },
    { label: "Độ hợp phong cách", value: styleScore },
  ];

  const reasons = REASONS_MAP[faceShape] || REASONS_MAP.Oval;

  const handleTryStyle = (hairstyle) => {
    if (hairstyle.premiumOnly && (!user || (user.role !== "PREMIUM" && user.role !== "ADMIN" && user.role !== "TESTER"))) {
      navigate("/pricing");
      return;
    }
    setSelectedHairstyle({
      id: hairstyle.id,
      name: hairstyle.name,
      imageUrl: hairstyle.imageUrl,
      ailabHairType: hairstyle.ailabHairType,
      ailabProStyle: hairstyle.ailabProStyle,
    });
    navigate(`/swap?hairstyleId=${hairstyle.id}`);
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <Section className="bg-transparent">
        <div className="mb-12 flex flex-col items-center gap-3 text-center">
          <Badge variant="new" className="uppercase tracking-wider text-[#3a4d00]">AI phân tích trực tiếp</Badge>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Phân tích kết quả của bạn</h1>
          <p className="text-base text-mauve">Dựa trên trí tuệ nhân tạo, chúng tôi đã tạo ra hồ sơ tóc cá nhân hóa cho bạn.</p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.4fr]">
          <Card className="flex flex-col gap-6">
            <h3 className="text-xl font-bold text-ink">Hồ sơ khuôn mặt</h3>
            <img
              src={previewUrl}
              alt="Khuôn mặt người dùng"
              className="aspect-square w-full rounded-2xl object-cover border border-line"
            />

            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">Chỉ số sinh trắc học</p>
              <dl className="grid grid-cols-2 gap-3">
                {BIOMETRICS.map((b) => (
                  <div key={b.label} className="rounded-xl bg-canvas p-3">
                    <dt className="text-xs text-muted">{b.label}</dt>
                    <dd className="text-base font-bold text-ink">{b.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">Điểm chuẩn</p>
              <div className="flex flex-col gap-3">
                {SCORES.map((s) => (
                  <div key={s.label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-mauve">{s.label}</span>
                      <span className="font-bold text-magenta">{s.value}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-line">
                      <div className="h-2 rounded-full bg-magenta" style={{ width: `${s.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="flex items-center gap-2 text-xs text-muted">
              <CheckIcon size={14} className="text-lime" /> Dữ liệu được xác thực bởi <b className="text-mauve">Hairapy AI v4.2</b>
            </p>
          </Card>

          <div className="flex flex-col gap-6">
            {chosenHairstyle && (
              <AnimatedContent delay={0}>
                <div className="mb-6 rounded-2xl bg-canvas p-4 border border-primary/20 shadow-sm">
                  <p className="mb-3 text-sm font-bold text-mauve">Kiểu tóc bạn chọn từ bộ sưu tập:</p>
                  <SpotlightCard className="rounded-2xl">
                    <Card padded={false} className="overflow-hidden">
                      <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <img
                          src={chosenHairstyle.imageUrl}
                          alt={chosenHairstyle.name}
                          className="h-32 w-32 rounded-xl object-cover shrink-0"
                          onError={(e) => { e.target.src = `https://placehold.co/300x300?text=${encodeURIComponent(chosenHairstyle.name)}`; }}
                        />
                        <div className="flex flex-1 flex-col justify-between w-full">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-ink text-base">{chosenHairstyle.name}</h4>
                              {chosenHairstyle.premiumOnly && (
                                <Badge variant="premium">PRO</Badge>
                              )}
                            </div>
                            <p className="text-xs text-mauve line-clamp-2">{chosenHairstyle.description}</p>
                            <p className="text-[11px] font-semibold text-muted">
                              Độ dài: {chosenHairstyle.hairLength} | Phù hợp: {chosenHairstyle.gender || "Unisex"}
                            </p>
                          </div>
                          <div className="mt-3 flex justify-end">
                            <Button onClick={() => handleTryStyle(chosenHairstyle)} size="sm" className="px-4 py-2 text-xs">
                              Thử kiểu này ngay
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </SpotlightCard>
                </div>
              </AnimatedContent>
            )}

            <SectionHeading
              center={false}
              title={`Kiểu tóc dành cho gương mặt ${(FACE_SHAPE_TRANSLATION[faceShape] || "").split(" (")[0]}`}
              subtitle="Đề xuất hàng đầu phù hợp nhất với cấu trúc xương của bạn."
              action={<a href="/catalog" className="flex shrink-0 items-center gap-2 font-bold text-primary">Xem tất cả <ArrowRight /></a>}
            />

            {recsLoading ? (
              <div className="grid grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <Card key={idx} padded={false} className="animate-pulse overflow-hidden">
                    <div className="h-56 w-full bg-line" />
                    <div className="flex items-center justify-between p-4">
                      <div className="h-4 w-1/2 rounded bg-line" />
                      <div className="h-8 w-20 rounded bg-line animate-pulse" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : recommendations.length === 0 ? (
              <Card className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-lg font-semibold text-ink">Không tìm thấy kiểu tóc phù hợp trong danh mục.</p>
                <p className="mt-1 text-sm text-mauve">Vui lòng quay lại hoặc khám phá tất cả kiểu tóc.</p>
                <Button to="/catalog" className="mt-4">Khám phá Catalog</Button>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                {recommendations.map((r, idx) => {
                  const match = Math.max(80, 98 - idx * 3);
                  return (
                    <AnimatedContent key={r.id || r.name} delay={idx * 0.1}>
                      <SpotlightCard className="rounded-2xl">
                        <Card padded={false} className="overflow-hidden">
                          <div className="relative">
                            <img
                              src={r.imageUrl}
                              alt={r.name}
                              className="h-56 w-full object-cover"
                              onError={(e) => { e.target.src = `https://placehold.co/600x400?text=${encodeURIComponent(r.name)}`; }}
                            />
                            <Badge variant="new" className="absolute left-3 top-3 shadow">{match}% phù hợp</Badge>
                            {r.premiumOnly && (
                              <Badge variant="premium" className="absolute right-3 top-3 shadow">PRO</Badge>
                            )}

                            {/* Nút lưu yêu thích */}
                            <button
                              onClick={(e) => handleToggleSave(e, r.id)}
                              className="absolute left-3 bottom-3 flex size-8 items-center justify-center rounded-full bg-white/90 text-ink shadow-md hover:bg-white hover:text-primary transition"
                              title={savedIds.has(r.id) ? "Bỏ lưu" : "Lưu kiểu tóc"}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill={savedIds.has(r.id) ? "#FF57CF" : "none"}
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="#FF57CF"
                                className="size-4"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                              </svg>
                            </button>
                          </div>
                          <div className="p-4 space-y-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-ink truncate mr-2" title={r.name}>{r.name}</h4>
                              <Button onClick={() => handleTryStyle(r)} size="sm" className="px-4 py-2 text-xs shrink-0">Thử ngay</Button>
                            </div>
                            <p className="text-xs font-semibold text-muted">Phù hợp: {r.gender || "Unisex"}</p>
                          </div>
                        </Card>
                      </SpotlightCard>
                    </AnimatedContent>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Section>

      <Section className="bg-transparent">
        <SectionHeading title="Tại sao các kiểu tóc này lại phù hợp?" />
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {reasons.map((r, idx) => (
            <AnimatedContent key={r.title} delay={idx * 0.15}>
              <SpotlightCard className="rounded-2xl">
                <Card>
                  <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-pink/10 text-pink">
                    <StarIcon size={22} />
                  </span>
                  <h3 className="mb-2 text-xl font-bold text-ink">{r.title}</h3>
                  <p className="leading-relaxed text-mauve">{r.desc}</p>
                </Card>
              </SpotlightCard>
            </AnimatedContent>
          ))}
        </div>
      </Section>

      <section className="bg-transparent px-4 py-16 sm:px-16">
        <AnimatedContent y={60}>
          <GlareHover className="mx-auto max-w-[1200px] rounded-[40px]">
            <div className="relative flex flex-col items-center gap-6 overflow-hidden rounded-[40px] bg-[#2f3131] p-12 text-center sm:p-16">
              <div className="pointer-events-none absolute inset-[-10%] bg-pink/20 blur-[60px]" />
              <h2 className="relative font-display text-3xl font-extrabold text-white sm:text-4xl">Muốn thử tất cả các kiểu tóc bằng AR?</h2>
              <p className="relative max-w-xl text-[#e2e2e2]">
                Sử dụng công nghệ thực tế ảo tăng cường để thấy chính mình trong hàng trăm kiểu tóc khác nhau trước khi ra tiệm.
              </p>
              <div className="relative">
                <BorderGlow rounded="rounded-full" thickness={2}>
                  <Button to="/pricing" variant="pink">Nâng cấp Premium ngay</Button>
                </BorderGlow>
              </div>
            </div>
          </GlareHover>
        </AnimatedContent>
      </section>

      <Footer />
    </div>
  );
}
