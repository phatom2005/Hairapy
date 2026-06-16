import { useNavigate } from "react-router-dom";
import { SCAN_PORTRAIT, TRENDS } from "../lib/figmaAssets";
import { Button, Card, Badge, Section, SectionHeading } from "../components/ui";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { ArrowRight, CheckIcon, StarIcon } from "../components/icons";
import { AnimatedContent, SpotlightCard, GlareHover, BorderGlow } from "../components/animated";

// Chỉ số sinh trắc học (mock — sau nối API kết quả scan)
const BIOMETRICS = [
  { label: "Hình dáng khuôn mặt", value: "Oval" },
  { label: "Chất tóc", value: "Wavy" },
  { label: "Tông da", value: "Warm" },
  { label: "Mật độ tóc", value: "Medium" },
];
const SCORES = [
  { label: "Điểm cân đối", value: 94 },
  { label: "Độ hợp phong cách", value: 88 },
];
const RECS = [
  { name: "Layered Bob", match: 98, img: TRENDS[3].img },
  { name: "Textured Pixie", match: 95, img: TRENDS[5].img },
  { name: "Soft Beach Waves", match: 92, img: TRENDS[2].img },
  { name: "Modern Wolf Cut", match: 89, img: TRENDS[0].img },
];
const REASONS = [
  { title: "Tạo sự cân bằng", desc: "AI đã nhận diện được xương gò má cao của bạn. Các kiểu tóc layer sẽ giúp làm mềm các góc cạnh, tạo ra sự hài hòa tổng thể cho gương mặt Oval." },
  { title: "Làm nổi bật đường nét", desc: "Đường hàm sắc sảo (sleek jawline) của bạn là một ưu điểm lớn. Chúng tôi đề xuất các kiểu tóc ngắn hoặc vén sau tai để tôn vinh cấu trúc xương này." },
];

export default function ResultsPage() {
  const navigate = useNavigate();
  const tryStyle = () => navigate("/swap");

  return (
    <div className="min-h-screen">
      <Navbar />

      <Section className="bg-transparent">
        {/* Header */}
        <div className="mb-12 flex flex-col items-center gap-3 text-center">
          <Badge variant="new" className="uppercase tracking-wider text-[#3a4d00]">AI phân tích trực tiếp</Badge>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Phân tích kết quả của bạn</h1>
          <p className="text-base text-mauve">Dựa trên trí tuệ nhân tạo, chúng tôi đã tạo ra hồ sơ tóc cá nhân hóa cho bạn.</p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.4fr]">
          {/* Hồ sơ khuôn mặt */}
          <Card className="flex flex-col gap-6">
            <h3 className="text-xl font-bold text-ink">Hồ sơ khuôn mặt</h3>
            <img src={SCAN_PORTRAIT} alt="Khuôn mặt" className="aspect-square w-full rounded-2xl object-cover" />

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

          {/* Đề xuất */}
          <div className="flex flex-col gap-6">
            <SectionHeading center={false}
              title="Kiểu tóc dành riêng cho bạn"
              subtitle="4 đề xuất hàng đầu phù hợp với cấu trúc xương của bạn."
              action={<a href="#" className="flex shrink-0 items-center gap-2 font-bold text-primary">Xem tất cả <ArrowRight /></a>} />

            <div className="grid grid-cols-2 gap-6">
              {RECS.map((r, idx) => (
                <AnimatedContent key={r.name} delay={idx * 0.1}>
                  <SpotlightCard className="rounded-2xl">
                    <Card padded={false} className="overflow-hidden">
                  <div className="relative">
                    <img src={r.img} alt={r.name} className="h-56 w-full object-cover" />
                    <Badge variant="new" className="absolute left-3 top-3 shadow">{r.match}% phù hợp</Badge>
                  </div>
                    <div className="flex items-center justify-between p-4">
                      <h4 className="font-bold text-ink">{r.name}</h4>
                      <Button onClick={tryStyle} size="sm" className="px-4 py-2 text-xs">Thử ngay</Button>
                    </div>
                    </Card>
                  </SpotlightCard>
                </AnimatedContent>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Tại sao phù hợp */}
      <Section className="bg-transparent">
        <SectionHeading title="Tại sao các kiểu tóc này lại phù hợp?" />
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {REASONS.map((r, idx) => (
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

      {/* CTA AR */}
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
