import { useState, useEffect, useRef } from "react";
import { AI_STYLIST_ENABLED } from "../lib/features";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import useAuthStore from "../store/useAuthStore";
import { trackEvent } from "../lib/analytics";
import { Scan, MagicStar, CalendarTick, ArrowRight as IconsaxArrowRight, Flash } from "iconsax-reactjs";
import {
  AnimatedContent,
  BorderGlow,
  DitherVeil,
  FaceMeshPattern,
  GlareHover,
  MarqueeText,
  ShuffleText,
  SpotlightCard,
} from "../components/animated";
import { ArrowRight, CameraIcon, CheckIcon, ScanIcon, StarIcon } from "../components/icons";
import Footer from "../components/layout/Footer";
import PillNav from "../components/layout/PillNav";
import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";
import { useScanStore } from "../store/useScanStore";
import { Badge, Button, Card, DragScroll, Section, SectionHeading } from "../components/ui";
import HairapyLogoMark from "../components/animated/HairapyLogoMark";
import { PLANS, getPlanCta } from "../lib/plans";
import PremiumGateModal from "../components/PremiumGateModal";

export default function LandingPage() {
  return (
    // Outer wrapper transparent → Aurora bleed-through từ App level
    <div className="min-h-screen">
      <PillNav />
      <Hero />
      <MarqueeStrip />
      <Features />
      <Trends />
      <PremiumUpsell />
      <Footer />
    </div>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  return (
    <section className="relative overflow-hidden bg-transparent px-6 py-24 sm:px-10 sm:py-32">
      {/* DitherVeil làm nền cho cả Hero, đặt giữa (căn theo section, không lệch
          trái/phải như mấy bản thử trước). Giờ phần "ink" trong chính component
          đã tự trong suốt (xem DitherVeil.jsx: alpha dựa theo độ giống uInk) nên
          không cần opacity/mask thủ công nữa — nó tự hoà vào nền SoftAurora phía
          sau, chỉ có chấm sáng/rim/ảnh mặt là hiện rõ. */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <DitherVeil className="h-full w-full" wander />
      </div>

      <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 sm:px-16 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <h1 className="font-display text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            {/* Shuffle 3 từ stagger rồi settle, gradient pink→brand áp lên */}
            <span className="bg-gradient-to-br from-pink to-brand bg-clip-text text-transparent">
              <ShuffleText
                words={["Scan.", "Style.", "Smile."]}
                duration={1000}
                stagger={260}
              />
            </span>
            <br />
            <span className="text-ink">Tóc đẹp AI lo.</span>
          </h1>

          <AnimatedContent delay={0.5} y={20}>
            <p className="max-w-lg text-lg leading-7 text-mauve">
              Khám phá diện mạo mới hoàn hảo với công nghệ phân tích khuôn mặt AI hàng đầu.
              Đơn giản, nhanh chóng và dành riêng cho bạn.
            </p>
          </AnimatedContent>

          <AnimatedContent delay={0.7} y={20}>
            <div className="flex flex-wrap gap-4 pt-4">
              {/* CTA chính có viền glow xoay → thu hút mắt */}
              <BorderGlow rounded="rounded-full" thickness={2}>
                <Button to="/scan" size="lg" className="shadow-xl">Phân tích ngay</Button>
              </BorderGlow>
              <Button href="#trends" variant="outline" size="lg">Xem mẫu thử</Button>
            </div>
          </AnimatedContent>
        </div>

        <AnimatedContent delay={0.3} y={50}>
          <HeroLogoCard />
        </AnimatedContent>
      </div>
    </section>
  );
}

/* ---------- Card logo Hero: tilt 3D theo chuột + float/wobble liên tục ---------- */
// Tilt: dùng ref + mousemove chỉnh CSS var trực tiếp (giống pattern SpotlightCard.jsx
// trong project — không setState nên không re-render mỗi lần rê chuột, mượt hơn).
// Float/wobble: dùng motion (đã có sẵn framer-motion) animate lặp vô hạn, độc lập
// với tilt — chạy được cả trên mobile (không hover được) nên logo luôn "sống".
function HeroLogoCard() {
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    // Toạ độ chuột quy về [-0.5, 0.5] theo tâm card để tính góc nghiêng
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    const MAX_TILT = 16; // độ nghiêng tối đa (deg) — xiên rõ hơn nhưng vẫn tinh tế
    card.style.setProperty("--tilt-x", `${(-py * MAX_TILT).toFixed(2)}deg`);
    card.style.setProperty("--tilt-y", `${(px * MAX_TILT).toFixed(2)}deg`);
    // Nhô nhẹ ra khi hover (translateZ) để tăng cảm giác nổi khối, không chỉ xoay phẳng
    card.style.setProperty("--tilt-z", "24px");
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty("--tilt-x", "0deg");
    card.style.setProperty("--tilt-y", "0deg");
    card.style.setProperty("--tilt-z", "0px");
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative [perspective:1000px]"
    >
      <div className="absolute -inset-4 rounded-[40px] bg-pink/20 blur-[20px]" />

      <div
        className="relative flex aspect-square w-full flex-col items-center justify-center gap-6 overflow-hidden rounded-[40px] border border-white/25 bg-gradient-to-br from-pink to-brand shadow-2xl transition-transform duration-200 ease-out [transform-style:preserve-3d]"
        style={{
          transform:
            "rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg)) translateZ(var(--tilt-z, 0px)) scale3d(1, 1, 1)",
        }}
      >
        {/* Lưới Face Mesh động phía sau logo — gợi liên tưởng trực tiếp đến
            tính năng phân tích khuôn mặt lõi của app (xem FaceMeshPattern.jsx) */}
        <FaceMeshPattern className="opacity-70" />

        {/* 2 vòng tròn trang trí trôi lệch pha nhau — cảm giác nền "sống", không đứng im */}
        <motion.div
          className="pointer-events-none absolute -left-10 -top-10 size-48 rounded-full bg-white/15"
          animate={{ x: [0, 10, 0], y: [0, 14, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute -bottom-12 -right-8 size-56 rounded-full bg-white/10"
          animate={{ x: [0, -12, 0], y: [0, -8, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />

        {/* Logo SVG động: icon + chữ tách lớp, tự animate độc lập (xem HairapyLogoMark.jsx) */}
        <HairapyLogoMark
          variant="white"
          className="relative w-4/5 max-w-[440px] drop-shadow-lg"
        />
      </div>

      {/* Badge nổi bồng bềnh lệch pha với logo, dạng glassmorphism (kính mờ):
          nền trắng bán trong suốt + backdrop-blur để thấy mờ mờ gradient phía
          sau, viền trắng mờ + shadow nhẹ tạo cảm giác "tấm kính nổi" thay vì
          card đặc như trước. */}
      <motion.div
        className="absolute -bottom-6 -left-6 flex items-center gap-3 rounded-2xl border border-white/50 bg-white/25 p-4 shadow-lg backdrop-blur-xl backdrop-saturate-150"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-lime/90">
          <StarIcon size={20} className="text-ink" />
        </span>
        <div>
          <p className="text-xs font-bold tracking-wide text-white drop-shadow-sm">Gợi ý thông minh</p>
          <p className="text-base font-bold text-white drop-shadow-sm">Theo dáng mặt</p>
        </div>
      </motion.div>
    </div>
  );
}

/* ---------- Marquee Strip dưới hero ---------- */
function MarqueeStrip() {
  const ITEMS = [
    "Scan • Style • Smile",
    "Gợi ý theo dáng mặt",
    "Thử tóc bằng AI",
    "Catalog đa dạng",
    "Sản xuất tại Việt Nam",
    ...(AI_STYLIST_ENABLED ? ["Tư vấn AI Stylist"] : []),
  ];
  return (
    <div className="border-y border-divider/30 bg-lime py-6 text-brand">
      <MarqueeText items={ITEMS} duration={35} textClassName="text-sm font-bold uppercase tracking-[0.2em]" />
    </div>
  );
}

/* ---------- Features ---------- */
const FEATURES = [
  { icon: ScanIcon, iconBg: "bg-pink/10", iconColor: "text-pink", title: "Quét AI",
    desc: "Đo đạc tỉ lệ khuôn mặt từ ảnh chân dung để đưa ra gợi ý kiểu tóc phù hợp nhất với cấu trúc riêng của bạn.",
    spotlight: "rgba(255, 87, 207, 0.18)" },
  { icon: CameraIcon, iconBg: "bg-[#8093ff]/10", iconColor: "text-[#8093ff]", title: "Thử tóc AI",
    desc: "Trải nghiệm trực quan nhiều kiểu tóc và màu sắc thời thượng ngay trên ảnh chân dung với công nghệ AI.",
    spotlight: "rgba(128, 147, 255, 0.2)" },
];

function Features() {
  return (
    <Section id="features" className="bg-transparent">
      <AnimatedContent>
        <SectionHeading title="Tính Năng Đột Phá"
          subtitle={`Công nghệ AI giúp bạn tìm thấy "phiên bản tốt nhất" của chính mình.`} />
      </AnimatedContent>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Card 1 (Quét AI) - Rộng 2 cột, nằm ngang */}
        <AnimatedContent delay={0.1} className="md:col-span-2">
          {(() => {
            const ScanIconComp = FEATURES[0].icon;
            return (
              <Link to="/scan" className="block h-full">
                <SpotlightCard spotlightColor={FEATURES[0].spotlight} className="h-full rounded-3xl hover:-translate-y-1.5 transition-all duration-300">
                  <Card className="h-full flex flex-col justify-between md:flex-row gap-8 items-center relative">
                    <div className="flex-1 flex flex-col justify-center">
                      <span className={`mb-4 flex size-14 items-center justify-center rounded-2xl ${FEATURES[0].iconBg} ${FEATURES[0].iconColor}`}>
                        <ScanIconComp size={26} />
                      </span>
                      <h3 className="mb-2 text-2xl font-bold text-ink">{FEATURES[0].title}</h3>
                      <p className="leading-relaxed text-mauve max-w-md">{FEATURES[0].desc}</p>
                    </div>
                    {/* Góc quét giả lập sử dụng màu sắc pink nguyên bản */}
                    <div className="w-full md:w-48 h-32 md:h-40 flex items-center justify-center rounded-2xl bg-pink/5 border border-divider/20 relative overflow-hidden shrink-0">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-24 h-24 rounded-full border border-pink/20 animate-ping absolute duration-1000" />
                        <div className="w-16 h-16 rounded-full border-2 border-brand/20 flex items-center justify-center bg-white shadow-sm">
                          <ScanIconComp size={26} className="text-brand animate-pulse" />
                        </div>
                      </div>
                      {/* Chấm landmark mờ quanh icon giữa gợi ý đo đạc khuôn mặt */}
                      <span className="absolute top-6 left-12 size-1 rounded-full bg-pink/30" />
                      <span className="absolute top-6 right-12 size-1 rounded-full bg-pink/30" />
                      <span className="absolute top-1/2 left-8 size-1 rounded-full bg-pink/30" />
                      <span className="absolute top-1/2 right-8 size-1 rounded-full bg-pink/30" />
                      <span className="absolute bottom-8 left-11 size-1 rounded-full bg-pink/30" />
                      <span className="absolute bottom-8 right-11 size-1 rounded-full bg-pink/30" />
                      <span className="absolute bottom-5 left-1/2 -translate-x-1/2 size-1 rounded-full bg-pink/30" />

                      <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-pink/30" />
                      <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-pink/30" />
                      <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-pink/30" />
                      <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-pink/30" />
                    </div>
                  </Card>
                </SpotlightCard>
              </Link>
            );
          })()}
        </AnimatedContent>

        {/* Card 2 (Thử tóc ảo) - Rộng 1 cột */}
        <AnimatedContent delay={0.2} className="md:col-span-1">
          {(() => {
            const CameraIconComp = FEATURES[1].icon;
            return (
              <Link to="/catalog" className="block h-full">
                <SpotlightCard spotlightColor={FEATURES[1].spotlight} className="h-full rounded-3xl hover:-translate-y-1.5 transition-all duration-300">
                  <Card className="h-full flex flex-col justify-between relative">
                    {AI_STYLIST_ENABLED && (
                      <span className="absolute top-4 right-4 rounded-full bg-lime/20 border border-lime/40 px-2.5 py-0.5 text-[11px] font-bold text-brand">
                        Mới: AI Stylist
                      </span>
                    )}
                    <div>
                      <span className={`mb-4 flex size-14 items-center justify-center rounded-2xl ${FEATURES[1].iconBg} ${FEATURES[1].iconColor}`}>
                        <CameraIconComp size={26} />
                      </span>
                      <h3 className="mb-2 text-2xl font-bold text-ink">{FEATURES[1].title}</h3>
                      <p className="leading-relaxed text-mauve">{FEATURES[1].desc}</p>
                    </div>
                    <div className="mt-6 flex items-center gap-2 text-xs font-bold text-brand uppercase tracking-wider">
                      <span className="flex h-2 w-2 rounded-full bg-brand animate-pulse" />
                      Dùng thử miễn phí
                    </div>
                  </Card>
                </SpotlightCard>
              </Link>
            );
          })()}
        </AnimatedContent>

        {/* Card 3 (Điểm nhấn đặt lịch salon) - Rộng full (3 cột) */}
        <AnimatedContent delay={0.3} className="md:col-span-3">
          <SpotlightCard
            spotlightColor="rgba(255, 255, 255, 0.2)"
            className="rounded-3xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden"
          >
            <div className="rounded-3xl bg-gradient-to-r from-magenta to-brand p-6 sm:p-8 text-white shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 lg:gap-8">
              {/* Trái: Tiêu đề + mô tả */}
              <div className="flex-1 max-w-xl">
                <h3 className="mb-2 text-2xl font-bold text-white">
                  Ưng kiểu nào – đặt lịch salon ngay
                </h3>
                <p className="leading-relaxed text-white/80 text-sm sm:text-base">
                  Thử tóc AI xong, gửi luôn ảnh cho salon đối tác gần bạn – không cần tả kiểu bằng lời.
                </p>
              </div>

              {/* Giữa: Mini-flow 3 bước nằm ngang (xuống dọc trên mobile khi card xếp dọc) */}
              <div className="flex items-center justify-center gap-2 sm:gap-3 py-1 self-center lg:self-auto shrink-0">
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <div className="size-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                    <Scan size={18} />
                  </div>
                  <span className="text-xs font-medium text-white/90">Quét</span>
                </div>

                <IconsaxArrowRight size={16} className="text-white/60 shrink-0 -mt-5" />

                <div className="flex flex-col items-center gap-1.5 text-center">
                  <div className="size-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                    <MagicStar size={18} />
                  </div>
                  <span className="text-xs font-medium text-white/90">Thử</span>
                </div>

                <IconsaxArrowRight size={16} className="text-white/60 shrink-0 -mt-5" />

                <div className="flex flex-col items-center gap-1.5 text-center">
                  <div className="size-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                    <CalendarTick size={18} />
                  </div>
                  <span className="text-xs font-medium text-white/90">Đặt lịch</span>
                </div>
              </div>

              {/* Phải: CTA button + link đối tác */}
              <div className="flex flex-col items-start lg:items-end gap-2 shrink-0 w-full lg:w-auto">
                <Link
                  to="/salons"
                  onClick={() => trackEvent("landing_salon_cta_click")}
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-white font-bold text-brand shadow-sm hover:bg-white/95 transition-all text-sm w-full lg:w-auto text-center"
                >
                  Tìm salon gần bạn
                </Link>
                <Link
                  to="/for-salons"
                  className="text-xs text-white/70 hover:text-white transition-colors underline-offset-2 hover:underline self-start lg:self-end"
                >
                  Bạn là chủ salon? Trở thành đối tác →
                </Link>
              </div>
            </div>
          </SpotlightCard>
        </AnimatedContent>
      </div>
    </Section>
  );
}

/* ---------- Trends ---------- */
function Trends() {
  const navigate = useNavigate();
  const setSelectedHairstyle = useScanStore((state) => state.setSelectedHairstyle);
  const user = useAuthStore((state) => state.user);

  // Lấy danh sách kiểu tóc đang hot tuần này từ API insights (fallback về catalog nếu trống)
  const { data: trendingStyles = [] } = useQuery({
    queryKey: ["insights-trending"],
    queryFn: async () => {
      try {
        const { data } = await api.get("/insights/trending", { params: { limit: 8 } });
        return data;
      } catch {
        return [];
      }
    },
  });

  const [gateStyle, setGateStyle] = useState(null);

  const handleTryStyle = (hairstyle) => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { state: { from: "/" } });
      return;
    }
    const isPaidUser = user?.plan && user.plan !== "FREE";
    if (hairstyle.premiumOnly && !isPaidUser) {
      setGateStyle(hairstyle);
      return;
    }
    const targetId = hairstyle.hairstyleId || hairstyle.id;
    setSelectedHairstyle({
      id: targetId,
      name: hairstyle.name,
      imageUrl: hairstyle.imageUrl,
    });
    navigate(`/scan?hairstyleId=${targetId}`);
  };

  // Không có kiểu tóc nào đang hot -> ẩn cả section thay vì hiện rỗng
  if (!trendingStyles || trendingStyles.length === 0) {
    return null;
  }

  return (
    <Section id="trends" className="overflow-hidden bg-transparent">
      <AnimatedContent>
        <SectionHeading center={false}
          title={
            <span className="inline-flex items-center gap-2">
              <Flash size="26" className="text-amber-500" variant="Bold" />
              Đang hot tuần này
            </span>
          }
          subtitle="Dựa trên lượt xem, lưu và thử tóc trên Hairapy 7 ngày qua."
          action={
            <Link to="/catalog" className="flex shrink-0 items-center gap-2 font-bold text-primary">
              Xem tất cả <ArrowRight />
            </Link>
          } />
      </AnimatedContent>

      {/* 1 hàng ngang - kéo chuột / vuốt để xem thêm */}
      <DragScroll>
        {trendingStyles.map((t) => (
          <Card key={t.hairstyleId || t.id} padded={false} className="w-[280px] shrink-0 p-3 shadow-lg">
            <div className="relative overflow-hidden rounded-[20px]">
              <img src={t.imageUrl} alt={t.name} draggable={false} className="pointer-events-none h-[320px] w-full object-cover"
                onError={(e) => { e.target.src = `https://placehold.co/280x320?text=${encodeURIComponent(t.name)}`; }} />
              {t.growthPct > 0 && (
                <Badge variant="new" className="absolute left-4 top-4 shadow font-bold">
                  ↑{t.growthPct}%
                </Badge>
              )}
              {t.premiumOnly && (
                <Badge variant="premium" className="absolute right-4 top-4 shadow">Trả phí</Badge>
              )}
            </div>
            <h4 className="mt-4 px-2 text-lg font-bold text-ink">{t.name}</h4>
            <div className="px-2 pb-2 pt-3">
              <Button onClick={() => handleTryStyle(t)} size="sm" className="w-full text-xs">Thử ngay</Button>
            </div>
          </Card>
        ))}
      </DragScroll>

      <PremiumGateModal
        isOpen={!!gateStyle}
        onClose={() => setGateStyle(null)}
        style={gateStyle}
      />
    </Section>
  );
}

/* ---------- Premium Upsell ---------- */
const PERKS = [
  "Kiểu tóc độc quyền",
  "Ảnh HD không logo, không watermark",
  AI_STYLIST_ENABLED ? "Tư vấn kiểu tóc với AI Stylist" : "Kiểu tóc độc quyền theo xu hướng",
];

function PremiumUpsell() {
  const { user } = useAuthStore();
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % PLANS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const { text: ctaText, to: ctaTo, disabled: ctaDisabled } = getPlanCta(PLANS[activeIdx], user);

  return (
    <section id="premium" className="bg-transparent px-4 py-16 sm:px-16">
      <AnimatedContent y={60}>
        {/* GlareHover: vệt sáng lướt khi hover → cảm giác "premium card" thật */}
        <GlareHover className="mx-auto max-w-[1200px] rounded-[40px]">
          <div className="relative overflow-hidden rounded-[40px] bg-[#2f3131] p-8 sm:p-16 flex flex-col lg:flex-row gap-12 items-center justify-between">
            <div className="pointer-events-none absolute inset-[-10%] bg-pink/20 blur-[60px]" />
            
            <div className="relative flex-1 flex flex-col gap-6 items-start text-left">
              <Badge variant="premium">PHIÊN BẢN GIỚI HẠN</Badge>
              <h2 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                Nâng Cấp Trải Nghiệm Premium
              </h2>
              <p className="max-w-2xl text-lg leading-relaxed text-[#e2e2e2]">
                {AI_STYLIST_ENABLED
                  ? "Mở khóa tất cả các bộ lọc AI độc quyền, nhận tư vấn kiểu tóc cùng AI Stylist và xuất ảnh HD không logo, không watermark."
                  : "Mở khóa tất cả các kiểu tóc độc quyền, thêm lượt thử mỗi ngày và xuất ảnh HD không logo, không watermark."}
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 w-full">
                {PERKS.map((p) => (
                  <li key={p} className="flex items-center gap-3 text-base text-white">
                    <CheckIcon size={20} className="text-lime" /> {p}
                  </li>
                ))}
              </ul>
            </div>

            {/* Khối giá & CTA kính mờ trượt tự động bên phải */}
            <div className="relative w-full lg:w-[320px] shrink-0 bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-[30px] shadow-2xl h-[300px] flex flex-col justify-between overflow-hidden">
              <div className="absolute inset-0 bg-pink/5 opacity-40 pointer-events-none" />
              
              <motion.div
                key={activeIdx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex flex-col items-center text-center h-full justify-between relative z-10"
              >
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold text-pink uppercase tracking-[0.2em] bg-pink/15 px-2.5 py-0.5 rounded-full">
                    {PLANS[activeIdx].label}
                  </span>
                  <h3 className="text-xl font-bold text-white mt-3">{PLANS[activeIdx].name}</h3>
                  <div className="flex items-end gap-1 mt-2">
                    <span className="text-4xl font-black text-white">{PLANS[activeIdx].price}</span>
                    <span className="text-sm font-semibold text-[#e2e2e2] pb-1">{PLANS[activeIdx].period}</span>
                  </div>
                  <p className="text-xs text-[#e2e2e2] mt-3 px-2 line-clamp-2 leading-relaxed min-h-[32px]">
                    {PLANS[activeIdx].desc}
                  </p>
                </div>
                
                {/* BorderGlow cho CTA Premium */}
                <BorderGlow rounded="rounded-full" thickness={2} duration={3500} className="w-full mt-4">
                  <Button to={ctaTo} variant="pink" disabled={ctaDisabled} className="w-full text-xs font-bold py-2.5 px-6">
                    {ctaText}
                  </Button>
                </BorderGlow>
              </motion.div>
              
              {/* Chỉ báo Dots bên dưới slider */}
              <div className="flex justify-center gap-1.5 mt-3 relative z-10">
                {PLANS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIdx(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === activeIdx ? "bg-pink w-3" : "bg-white/35"}`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </GlareHover>
      </AnimatedContent>
    </section>
  );
}
