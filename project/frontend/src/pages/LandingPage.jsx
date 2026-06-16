import { LOGO_WHITE, TRENDS } from "../lib/figmaAssets";
import { Button, Card, Badge, Section, SectionHeading, DragScroll } from "../components/ui";
import PillNav from "../components/layout/PillNav";
import Footer from "../components/layout/Footer";
import { ArrowRight, ScanIcon, CameraIcon, StarIcon, CheckIcon } from "../components/icons";
import {
  ShuffleText,
  AnimatedContent,
  SpotlightCard,
  GlareHover,
  BorderGlow,
  MarqueeText,
} from "../components/animated";

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
    <div className="border-y border-divider/30 bg-ink py-6 text-white">
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
        {FEATURES.map((f, i) => (
          <AnimatedContent key={f.title} delay={i * 0.1}>
            <SpotlightCard spotlightColor={f.spotlight} className="rounded-2xl">
              <Card>
                <span className={`mb-4 flex size-14 items-center justify-center rounded-2xl ${f.iconBg} ${f.iconColor}`}>
                  <f.icon size={26} />
                </span>
                <h3 className="mb-2 text-2xl font-bold text-ink">{f.title}</h3>
                <p className="leading-relaxed text-mauve">{f.desc}</p>
              </Card>
            </SpotlightCard>
          </AnimatedContent>
        ))}
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

function PremiumUpsell() {
  return (
    <section id="premium" className="bg-transparent px-4 py-16 sm:px-16">
      <AnimatedContent y={60}>
        {/* GlareHover: vệt sáng lướt khi hover → cảm giác "premium card" thật */}
        <GlareHover className="mx-auto max-w-[1200px] rounded-[40px]">
          <div className="relative overflow-hidden rounded-[40px] bg-[#2f3131] p-10 sm:p-20">
            <div className="pointer-events-none absolute inset-[-10%] bg-pink/20 blur-[60px]" />
            <div className="relative flex flex-col items-center gap-8 text-center">
              <Badge variant="premium">PHIÊN BẢN GIỚI HẠN</Badge>
              <h2 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                Nâng Cấp Trải Nghiệm Premium
              </h2>
              <p className="max-w-2xl text-lg leading-7 text-[#e2e2e2]">
                Mở khóa tất cả các bộ lọc AI độc quyền, nhận tư vấn 1-1 không giới hạn và
                nhận ưu đãi đặc biệt tại các salon đối tác hàng đầu.
              </p>
              <div className="flex flex-col items-center gap-8 pt-4 sm:flex-row sm:gap-12">
                <ul className="flex flex-col gap-2 text-left">
                  {PERKS.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-base text-white">
                      <CheckIcon size={20} className="text-lime" /> {p}
                    </li>
                  ))}
                </ul>
                {/* BorderGlow cho CTA Premium → match brand "live" */}
                <BorderGlow rounded="rounded-full" thickness={3} duration={3500}>
                  <Button to="/pricing" variant="pink" className="px-12 py-5 text-2xl">
                    Go Premium Now
                  </Button>
                </BorderGlow>
              </div>
            </div>
          </div>
        </GlareHover>
      </AnimatedContent>
    </section>
  );
}
