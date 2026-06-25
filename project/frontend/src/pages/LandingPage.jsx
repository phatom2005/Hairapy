import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import useAuthStore from "../store/useAuthStore";
import {
  AnimatedContent,
  BorderGlow,
  GlareHover,
  MarqueeText,
  ShuffleText,
  SpotlightCard,
} from "../components/animated";
import { ArrowRight, CameraIcon, CheckIcon, ScanIcon, StarIcon } from "../components/icons";
import Footer from "../components/layout/Footer";
import PillNav from "../components/layout/PillNav";
import { Badge, Button, Card, DragScroll, Section, SectionHeading } from "../components/ui";
import { LOGO_WHITE, TRENDS } from "../lib/figmaAssets";

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
          <div className="relative">
            <div className="absolute -inset-4 rounded-[40px] bg-pink/20 blur-[20px]" />
            <div className="relative flex aspect-square w-full flex-col items-center justify-center gap-6 overflow-hidden rounded-[40px] bg-gradient-to-br from-pink to-brand shadow-2xl">
              <div className="pointer-events-none absolute -left-10 -top-10 size-48 rounded-full bg-white/15" />
              <div className="pointer-events-none absolute -bottom-12 -right-8 size-56 rounded-full bg-white/10" />
              <img src={LOGO_WHITE} alt="Hairapy" className="relative w-4/5 max-w-[440px] drop-shadow-lg" />
            </div>
            <div className="absolute -bottom-6 -left-6 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-xl">
              <span className="flex size-10 items-center justify-center rounded-full bg-lime">
                <StarIcon size={20} className="text-ink" />
              </span>
              <div>
                <p className="text-xs font-bold tracking-wide text-mauve">Độ chính xác</p>
                <p className="text-base font-bold text-primary">99.8% AI Scan</p>
              </div>
            </div>
          </div>
        </AnimatedContent>
      </div>
    </section>
  );
}

/* ---------- Marquee Strip dưới hero ---------- */
function MarqueeStrip() {
  const ITEMS = [
    "Scan • Style • Smile",
    "AI Scan 99.8%",
    "1000+ kiểu tóc",
    "Sản xuất tại Việt Nam",
    "Thử tóc AR thời gian thực",
    "Salon Premium giảm 30%",
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
    desc: "Phân tích tỉ lệ khuôn mặt, cấu trúc xương và chất tóc để đưa ra gợi ý kiểu tóc tối ưu nhất cho bạn.",
    spotlight: "rgba(255, 87, 207, 0.18)" },
  { icon: CameraIcon, iconBg: "bg-[#8093ff]/10", iconColor: "text-[#8093ff]", title: "Thử tóc ảo",
    desc: "Trải nghiệm hàng ngàn kiểu tóc và màu sắc thời thượng ngay lập tức thông qua camera AR thực tế ảo.",
    spotlight: "rgba(128, 147, 255, 0.2)" },
  { icon: StarIcon, iconBg: "bg-lime", iconColor: "text-ink", title: "Gợi ý chuyên gia",
    desc: "Kết nối với các chuyên gia tạo mẫu tóc hàng đầu để nhận tư vấn chuyên sâu về cách chăm sóc và tạo kiểu.",
    spotlight: "rgba(208, 238, 136, 0.25)" },
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
                  <Card className="h-full flex flex-col justify-between">
                    <div>
                      <span className={`mb-4 flex size-14 items-center justify-center rounded-2xl ${FEATURES[1].iconBg} ${FEATURES[1].iconColor}`}>
                        <CameraIconComp size={26} />
                      </span>
                      <h3 className="mb-2 text-2xl font-bold text-ink">{FEATURES[1].title}</h3>
                      <p className="leading-relaxed text-mauve">{FEATURES[1].desc}</p>
                    </div>
                    <div className="mt-6 flex items-center gap-2 text-xs font-bold text-brand uppercase tracking-wider">
                      <span className="flex h-2 w-2 rounded-full bg-brand animate-pulse" />
                      AR Trial Ready
                    </div>
                  </Card>
                </SpotlightCard>
              </Link>
            );
          })()}
        </AnimatedContent>

        {/* Card 3 (Gợi ý chuyên gia) - Rộng 3 cột */}
        <AnimatedContent delay={0.3} className="md:col-span-3">
          {(() => {
            const StarIconComp = FEATURES[2].icon;
            return (
              <SpotlightCard spotlightColor={FEATURES[2].spotlight} className="rounded-3xl hover:-translate-y-1.5 transition-all duration-300">
                <Card className="flex flex-col md:flex-row gap-6 md:gap-12 items-start md:items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <span className={`flex size-14 items-center justify-center rounded-2xl ${FEATURES[2].iconBg} ${FEATURES[2].iconColor}`}>
                        <StarIconComp size={26} />
                      </span>
                      <h3 className="text-2xl font-bold text-ink">{FEATURES[2].title}</h3>
                    </div>
                    <p className="leading-relaxed text-mauve max-w-2xl">{FEATURES[2].desc}</p>
                  </div>
                  <Button to="/salons" variant="outline" className="w-full md:w-auto shrink-0 border-primary text-primary hover:bg-primary/5">
                    Tìm Salon gần nhất
                  </Button>
                </Card>
              </SpotlightCard>
            );
          })()}
        </AnimatedContent>
      </div>
    </Section>
  );
}

/* ---------- Trends ---------- */
function Trends() {
  return (
    <Section id="trends" className="overflow-hidden bg-transparent">
      <AnimatedContent>
        <SectionHeading center={false}
          title="Xu Hướng Tóc 2026"
          subtitle="Cập nhật những mẫu tóc được ưa chuộng nhất bởi AI."
          action={
            <a href="#" className="flex shrink-0 items-center gap-2 font-bold text-primary">
              Xem tất cả <ArrowRight />
            </a>
          } />
      </AnimatedContent>

      {/* 1 hàng ngang - kéo chuột / vuốt để xem thêm (không bọc AnimatedContent từng card để khỏi giật) */}
      <DragScroll>
        {TRENDS.map((t) => (
          <Card key={t.name} padded={false} className="w-[280px] shrink-0 p-3 shadow-lg">
            <div className="relative overflow-hidden rounded-[20px]">
              <img src={t.img} alt={t.name} draggable={false} className="pointer-events-none h-[320px] w-full object-cover" />
              {t.badge && (
                <Badge variant={t.badge === "Hot" ? "hot" : "new"} className="absolute left-4 top-4 shadow">
                  {t.badge}
                </Badge>
              )}
            </div>
            <h4 className="mt-4 px-2 text-lg font-bold text-ink">{t.name}</h4>
            <p className="px-2 pb-2 text-sm font-semibold text-mauve">{t.desc}</p>
          </Card>
        ))}
      </DragScroll>
    </Section>
  );
}

/* ---------- Premium Upsell ---------- */
const PERKS = ["Kiểu tóc Premium mỗi tuần", "Không quảng cáo", "Mã giảm giá Salon 30%"];

const PLANS = [
  { name: "Cơ bản", price: "0đ", period: "/ vĩnh viễn", label: "GÓI MIỄN PHÍ", to: "/register", desc: "1 lần quét AI & 5 lần thử kiểu tóc mỗi ngày." },
  { name: "Tuần", price: "59k", period: "/ tuần", label: "TRẢI NGHIỆM NHANH", to: "/checkout?plan=PRO", desc: "5 lần quét AI & 20 lần thử tóc mỗi ngày, ảnh HD không logo." },
  { name: "Premium", price: "199k", period: "/ tháng", label: "ƯU ĐÃI LỚN NHẤT", to: "/checkout?plan=PREMIUM", desc: "Ảnh HD không watermark & tư vấn 1:1 trực tiếp cùng Stylist." },
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

  const getPlanCta = (plan) => {
    if (!user) {
      return { text: "Đăng ký ngay", to: plan.to, disabled: false };
    }
    if (user.role === "ADMIN") {
      return { text: "Trang quản trị", to: "/admin", disabled: false };
    }
    if (plan.name === "Cơ bản") {
      if (user.role === "USER") return { text: "Đang áp dụng", to: null, disabled: true };
      return { text: "Gói cơ bản", to: null, disabled: true };
    }
    if (plan.name === "Tuần") {
      if (user.role === "PREMIUM") return { text: "Đang dùng Premium", to: null, disabled: true };
      return { text: "Đăng ký ngay", to: plan.to, disabled: false };
    }
    if (plan.name === "Premium") {
      if (user.role === "PREMIUM") return { text: "Đang áp dụng", to: null, disabled: true };
      return { text: "Đăng ký ngay", to: plan.to, disabled: false };
    }
    return { text: "Đăng ký ngay", to: plan.to, disabled: false };
  };

  const { text: ctaText, to: ctaTo, disabled: ctaDisabled } = getPlanCta(PLANS[activeIdx]);

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
                Mở khóa tất cả các bộ lọc AI độc quyền, nhận tư vấn 1-1 không giới hạn và
                nhận ưu đãi đặc biệt tại các salon đối tác hàng đầu.
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
