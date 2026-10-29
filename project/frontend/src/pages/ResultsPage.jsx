import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MagicStar } from "iconsax-reactjs";
import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { AnimatedContent, BorderGlow, GlareHover, SpotlightCard } from "../components/animated";
import { ArrowRight, CheckIcon, StarIcon } from "../components/icons";
import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import { Badge, Button, Card, Section, SectionHeading } from "../components/ui";
import api from "../lib/api";
import { trackEvent, setUserProps } from "../lib/analytics";
import { useScanStore, useHasHydrated } from "../store/useScanStore";
import useAuthStore from "../store/useAuthStore";
import FeedbackWidget from "../components/FeedbackWidget";
import PremiumGateModal from "../components/PremiumGateModal";
import AiStylistPanel from "../components/AiStylistPanel";
import SalonMatchSheet from "../components/SalonMatchSheet";
import { COLOR_BY_VALUE, swatchBg } from "../lib/hairColors";

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

function HairstyleRecCard({ group, idx, savedIds, handleToggleSave, handleTryStyle, onFindSalon }) {
  const [selectedVariant, setSelectedVariant] = useState(group.base);
  const r = selectedVariant || group.base;

  return (
    <AnimatedContent key={group.base.id || group.base.name} delay={idx * 0.1}>
      <SpotlightCard className="rounded-2xl">
        <Card padded={false} className="h-full w-full overflow-hidden">
          <div className="relative">
            <img
              src={r.imageUrl}
              alt={r.name}
              draggable={false}
              className="pointer-events-none h-56 w-full object-cover"
              onError={(e) => {
                e.target.src = `https://placehold.co/600x400?text=${encodeURIComponent(r.name)}`;
              }}
            />
            {idx < 3 && (
              <Badge variant="new" className="absolute left-3 top-3 shadow">
                Gợi ý #{idx + 1}
              </Badge>
            )}
            {r.premiumOnly && (
              <Badge variant="premium" className="absolute right-3 top-3 shadow">
                Trả phí
              </Badge>
            )}
            {r.sampleByAi && (
              <div className="absolute left-3 bottom-3 rounded-full bg-ink/75 px-2 py-0.5 text-[9px] font-semibold text-white backdrop-blur-md shadow">
                <span className="inline-flex items-center gap-0.5"><MagicStar size={10} variant="Bold" /> AI</span>
              </div>
            )}

            {/* Nút lưu yêu thích */}
            <button
              type="button"
              onClick={(e) => handleToggleSave(e, r.id)}
              className="absolute right-3 bottom-3 flex size-8 items-center justify-center rounded-full bg-white/90 text-ink shadow-md hover:bg-white hover:text-primary transition"
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
                />
              </svg>
            </button>
          </div>

          {/* Chấm màu biến thể nếu có */}
          {group.variants.length > 1 && (
            <div className="flex items-center gap-1.5 px-4 pt-2">
              {group.variants.map((v) => {
                const isSel = v.id === r.id;
                const colorObj = v.ailabColor ? COLOR_BY_VALUE[v.ailabColor] : null;
                const tones = colorObj?.tones || ["#3a2c23", "#231812", "#0f0a07"];
                const label = colorObj?.label || (v.baseStyleId ? "Biến thể" : "Màu gốc");
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariant(v)}
                    title={label}
                    className={`size-3.5 rounded-full transition-transform ${
                      isSel ? "ring-2 ring-pink ring-offset-1 scale-125" : "hover:scale-110 opacity-70 hover:opacity-100"
                    }`}
                    style={{ background: swatchBg(tones) }}
                  />
                );
              })}
            </div>
          )}

          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-ink truncate mr-2" title={r.name}>
                {r.name}
              </h4>
              <Button onClick={() => handleTryStyle(r)} size="sm" className="px-4 py-2 text-xs shrink-0">
                Thử ngay
              </Button>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-divider/20">
              <span className="font-semibold text-muted">Phù hợp: {r.gender || "Unisex"}</span>
              <button
                type="button"
                onClick={() => onFindSalon?.(r)}
                className="text-pink hover:text-pink-hover font-bold inline-flex items-center gap-1 transition cursor-pointer"
              >
                <span>Salon làm kiểu này</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </Card>
      </SpotlightCard>
    </AnimatedContent>
  );
}

export default function ResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const hairstyleId = searchParams.get("hairstyleId");
  const queryClient = useQueryClient();

  // Lấy kết quả phân tích, ảnh preview, giới tính và hàm set kiểu tóc từ Zustand store
  const hasHydrated = useHasHydrated();
  const {
    analysisResult,
    previewUrl,
    setSelectedHairstyle,
    gender,
    setGender,
    overrideFaceShape,
  } = useScanStore();
  const { user } = useAuthStore();

  const [showShapePicker, setShowShapePicker] = useState(false);
  const [showBiometrics, setShowBiometrics] = useState(false);
  const [gateStyle, setGateStyle] = useState(null);
  const [matchingStyle, setMatchingStyle] = useState(null);
  const [showMatchSheet, setShowMatchSheet] = useState(false);

  const handleFindSalon = (style) => {
    trackEvent("salon_match_open", { hairstyle_id: style?.id, source: "results_page" });
    setMatchingStyle(style);
    setShowMatchSheet(true);
  };

  const notSaved = location.state?.notSaved;

  useEffect(() => {
    if (!hasHydrated) return;
    if (!analysisResult) {
      // Bảo toàn hairstyleId khi redirect qua scan
      if (hairstyleId) {
        navigate(`/scan?hairstyleId=${hairstyleId}`);
      } else {
        navigate("/scan");
      }
    }
  }, [hasHydrated, analysisResult, navigate, hairstyleId]);

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

  const groupedRecommendations = useMemo(() => {
    const groups = new Map();
    for (const item of recommendations) {
      const baseId = item.baseStyleId || item.id;
      if (!groups.has(baseId)) groups.set(baseId, []);
      groups.get(baseId).push(item);
    }
    const list = [];
    for (const variants of groups.values()) {
      variants.sort((a, b) => {
        if (!a.baseStyleId && b.baseStyleId) return -1;
        if (a.baseStyleId && !b.baseStyleId) return 1;
        return a.id - b.id;
      });
      const base = variants.find((v) => !v.baseStyleId) || variants[0];
      list.push({ base, variants });
    }
    return list;
  }, [recommendations]);

  // Query lấy kiểu tóc đã lưu (đồng bộ key chung)
  const { data: savedStyles = [] } = useQuery({
    queryKey: ["profile-saved-styles"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) return [];
      const { data } = await api.get("/profile/saved-styles");
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

    const previousSaved = queryClient.getQueryData(["profile-saved-styles"]) || [];
    const isSaved = previousSaved.some(s => s.id === hairstyleId);

    queryClient.setQueryData(["profile-saved-styles"], (old = []) => {
      if (isSaved) {
        return old.filter(s => s.id !== hairstyleId);
      } else {
        const found = recommendations.find(s => s.id === hairstyleId);
        return found ? [...old, found] : old;
      }
    });

    try {
      if (isSaved) {
        await api.delete(`/profile/saved-styles/${hairstyleId}`);
      } else {
        await api.post(`/profile/saved-styles/${hairstyleId}`);
      }
    } catch (err) {
      console.error("Lỗi khi lưu/bỏ lưu kiểu tóc:", err);
      queryClient.setQueryData(["profile-saved-styles"], previousSaved);
    }
  };

  if (!hasHydrated || !analysisResult) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="size-8 animate-spin rounded-full border-4 border-pink border-t-transparent" />
      </div>
    );
  }

  const faceShapeText = FACE_SHAPE_TRANSLATION[faceShape] || faceShape;
  const BIOMETRICS = [
    { label: "Hình dáng khuôn mặt", value: faceShapeText },
    { label: "Tỷ lệ rộng/dài", value: metrics?.widthToLength ? `${(metrics.widthToLength * 100).toFixed(0)}%` : "N/A" },
    { label: "Tỷ lệ trán/hàm", value: metrics?.foreheadToJaw ? metrics.foreheadToJaw.toFixed(2) : "N/A" },
    { label: "Tỷ lệ hàm/gò má", value: metrics?.jawToCheek ? metrics.jawToCheek.toFixed(2) : "N/A" },
  ];

  const reasons = REASONS_MAP[faceShape] || REASONS_MAP.Oval;

  const handleTryStyle = (hairstyle) => {
    const isPaidUser = user?.plan && user.plan !== "FREE";
    if (hairstyle.premiumOnly && !isPaidUser) {
      setGateStyle(hairstyle);
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
        {/* Banner khi không lưu vào lịch sử do hết quota 5 lần/ngày */}
        {notSaved && (
          <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs font-medium text-amber-500 text-center max-w-2xl mx-auto">
            Kết quả lần này không được lưu vào lịch sử vì bạn đã dùng hết 5 lượt lưu hôm nay.
          </div>
        )}

        <div className="mb-12 flex flex-col items-center gap-3 text-center">
          <Badge variant="new" className="uppercase tracking-wider text-[#3a4d00]">Gợi ý từ AI</Badge>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Kết quả gợi ý kiểu tóc</h1>
          <p className="text-base text-mauve">Dựa trên tỉ lệ khuôn mặt từ ảnh của bạn, Hairapy gợi ý các phong cách phù hợp.</p>
        </div>

        <div className={`grid grid-cols-1 gap-8 lg:grid-cols-[minmax(300px,380px)_1fr] lg:items-start`}>
          {/* Cột trái: hồ sơ khuôn mặt (ghim khi cuộn) */}
          <Card className="flex flex-col gap-6 lg:sticky lg:top-24">
            <h3 className="text-xl font-bold text-ink">Hồ sơ khuôn mặt</h3>
            <img
              src={previewUrl}
              alt="Khuôn mặt người dùng"
              className="aspect-[3/4] max-h-[340px] w-full rounded-2xl object-contain bg-canvas border border-line"
            />

            {/* Thông tin dáng mặt + cho phép người dùng tự đổi */}
            <div className="flex flex-col gap-2 rounded-2xl bg-canvas p-4 border border-line/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Dáng mặt</span>
                {analysisResult?.userOverridden && (
                  <Badge variant="outline" className="text-2xs text-brand border-brand/30">
                    Bạn đã tự chọn
                  </Badge>
                )}
              </div>
              <div className="text-lg font-bold text-ink">
                Dáng mặt gợi ý: <span className="text-pink">{faceShapeVi}</span>
                {analysisResult?.alternativeShape && (
                  <span className="text-sm font-semibold text-mauve ml-1.5">
                    · cũng có nét {FACE_SHAPE_MAP[analysisResult.alternativeShape] || analysisResult.alternativeShape}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Đây là gợi ý tham khảo dựa trên tỉ lệ khuôn mặt trong ảnh.
              </p>

              <button
                type="button"
                onClick={() => setShowShapePicker(!showShapePicker)}
                className="mt-1 text-xs font-bold text-primary hover:underline text-left cursor-pointer"
              >
                {showShapePicker ? "▲ Thu gọn chọn dáng mặt" : "Không đúng? Chọn dáng mặt khác"}
              </button>

              {showShapePicker && (
                <div className="mt-2 flex flex-wrap gap-2 pt-2 border-t border-divider/20">
                  {Object.entries(FACE_SHAPE_MAP).map(([code, name]) => {
                    const isSelected = faceShape === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => {
                          overrideFaceShape(code);
                          setUserProps({ face_shape: code });
                          trackEvent("face_shape_override", { from: faceShape, to: code });
                        }}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                          isSelected
                            ? "bg-pink text-white shadow-sm"
                            : "border border-line bg-white text-mauve hover:border-pink/40"
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Số đo tham khảo - mặc định thu gọn */}
            <div className="border-t border-line/50 pt-4">
              <button
                type="button"
                onClick={() => setShowBiometrics(!showBiometrics)}
                className="flex items-center justify-between w-full text-xs font-bold uppercase tracking-widest text-muted hover:text-ink cursor-pointer"
              >
                <span>Số đo tham khảo</span>
                <span className="text-xs lowercase font-normal">{showBiometrics ? "Thu gọn ▲" : "Xem chi tiết đo đạc ▼"}</span>
              </button>

              {showBiometrics && (
                <dl className="grid grid-cols-2 gap-3 mt-3">
                  {BIOMETRICS.map((b) => (
                    <div key={b.label} className="rounded-xl bg-canvas p-3">
                      <dt className="text-xs text-muted">{b.label}</dt>
                      <dd className="text-base font-bold text-ink">{b.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>

            <p className="flex items-start gap-2 text-[11px] text-muted leading-relaxed">
              <CheckIcon size={13} className="text-lime shrink-0 mt-0.5" />
              <span>
                Phân tích bởi <b className="text-mauve font-semibold">MediaPipe Face Landmarker</b> ngay trên máy của bạn
              </span>
            </p>
          </Card>

          {/* Cột phải: kiểu đã chọn + gợi ý kiểu tóc + AI Stylist */}
          <div className="flex min-w-0 flex-col gap-6">
            {chosenHairstyle && (
              <div className="flex flex-col gap-6">
                <AnimatedContent delay={0}>
                  <div className="rounded-2xl bg-canvas p-4 border border-primary/20 shadow-sm">
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
                                  <Badge variant="premium">Trả phí</Badge>
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
              </div>
            )}

            {/* Tiêu đề + thanh công cụ: lọc giới tính bên trái, "Xem tất cả" bên phải cùng 1 hàng */}
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                  Kiểu tóc dành cho gương mặt {faceShapeVi}
                </h2>
                <p className="mt-1 text-sm text-mauve">Gợi ý theo dáng mặt của bạn — lọc nhanh theo Nam / Nữ.</p>
              </div>
              <div className="flex items-center justify-between gap-3">
              <div className="flex gap-1 bg-canvas p-1 rounded-full border border-line w-fit">
                {[
                  { label: "Tất cả", value: null },
                  { label: "Nam", value: "Nam" },
                  { label: "Nữ", value: "Nữ" },
                ].map((t) => {
                  const isActive = (gender || null) === t.value;
                  return (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => {
                        setGender(t.value);
                        setUserProps({ gender_pref: t.value || "Tất cả" });
                      }}
                      className={`rounded-full px-4 py-1.5 text-xs font-bold transition cursor-pointer ${
                        isActive ? "bg-pink text-white shadow-sm" : "text-mauve hover:text-ink"
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
                <Link
                  to={gender ? `/catalog?gender=${encodeURIComponent(gender)}` : "/catalog"}
                  className="flex shrink-0 items-center gap-1.5 text-sm font-bold text-primary hover:underline"
                >
                  Xem tất cả <ArrowRight />
                </Link>
              </div>
            </div>

            {recsLoading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <Card key={idx} padded={false} className="w-full animate-pulse overflow-hidden">
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
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {groupedRecommendations.map((group, idx) => (
                  <HairstyleRecCard
                    key={group.base.id || group.base.name}
                    group={group}
                    idx={idx}
                    savedIds={savedIds}
                    handleToggleSave={handleToggleSave}
                    handleTryStyle={handleTryStyle}
                    onFindSalon={handleFindSalon}
                  />
                ))}

                {/* Card cuối danh sách: dẫn tới catalog */}
                <Card padded={false} className="w-full h-full min-h-[200px] overflow-hidden flex flex-col justify-center items-center p-6 text-center border-2 border-dashed border-divider bg-canvas/40">
                  <p className="text-sm font-bold text-ink mb-1">Không thích các gợi ý này?</p>
                  <p className="text-xs text-mauve mb-4">Khám phá toàn bộ kiểu tóc phù hợp với mọi phong cách.</p>
                  <Button
                    to={gender ? `/catalog?gender=${encodeURIComponent(gender)}` : "/catalog"}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    Xem toàn bộ kho kiểu tóc
                  </Button>
                </Card>
              </div>
            )}

            {/* AI Stylist ở cuối cột phải */}
            <AiStylistPanel hairstyleId={hairstyleId ? Number(hairstyleId) : null} defaultOpen={false} />
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

      <section className="mx-auto max-w-[1200px] px-4 py-6 sm:px-16">
        <FeedbackWidget feature="FACE_SCAN" />
      </section>

      <section className="bg-transparent px-4 py-16 sm:px-16">
        <AnimatedContent y={60}>
          <GlareHover className="mx-auto max-w-[1200px] rounded-[40px]">
            <div className="relative flex flex-col items-center gap-6 overflow-hidden rounded-[40px] bg-[#2f3131] p-12 text-center sm:p-16">
              <div className="pointer-events-none absolute inset-[-10%] bg-pink/20 blur-[60px]" />
              <h2 className="relative font-display text-3xl font-extrabold text-white sm:text-4xl">Muốn thử tất cả các kiểu tóc bằng AI?</h2>
              <p className="relative max-w-xl text-[#e2e2e2]">
                Sử dụng công nghệ trí tuệ nhân tạo để thấy chính mình trong hàng chục kiểu tóc khác nhau trước khi ra tiệm.
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

      <PremiumGateModal
        isOpen={!!gateStyle}
        onClose={() => setGateStyle(null)}
        style={gateStyle}
      />

      <SalonMatchSheet
        isOpen={showMatchSheet}
        onClose={() => {
          setShowMatchSheet(false);
          setMatchingStyle(null);
        }}
        hairstyle={matchingStyle}
        tryOnImageUrl={null}
      />
    </div>
  );
}
