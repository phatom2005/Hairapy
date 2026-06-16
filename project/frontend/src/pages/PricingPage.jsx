import { Button, Card, Badge } from "../components/ui";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { CheckIcon } from "../components/icons";
import { AnimatedContent, GlareHover, BorderGlow } from "../components/animated";

const PLANS = [
  {
    name: "Cơ bản", tagline: "Bắt đầu hành trình của bạn",
    price: "0đ", period: "/ vĩnh viễn", highlight: false,
    cta: "Dùng bản miễn phí", to: "/register", variant: "outline",
    features: [
      { text: "3 lần quét mỗi tháng", on: true },
      { text: "Gợi ý kiểu tóc cơ bản", on: true },
      { text: "Phân tích chuyên sâu", on: false },
      { text: "Ưu đãi Salon", on: false },
    ],
  },
  {
    name: "Premium", tagline: "Trải nghiệm không giới hạn",
    price: "199.000đ", period: "/ tháng", highlight: true,
    note: "Hoặc 1.490.000đ / năm (Tiết kiệm 37%)",
    cta: "Nâng cấp ngay", to: "/register", variant: "pink",
    features: [
      { text: "Quét AI không giới hạn", on: true },
      { text: "Phân tích hình dáng & màu sắc", on: true },
      { text: "Đặc quyền giảm giá 30% tại Salon", on: true },
      { text: "Tư vấn 1:1 cùng Stylist", on: true },
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-transparent px-6 py-20 text-center sm:px-16">
        <AnimatedContent>
          <div className="relative mx-auto max-w-2xl">
            <Badge variant="premium" className="mb-4">HAIRAPY ĐỘC QUYỀN</Badge>
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
              Nâng cấp trải nghiệm Premium
            </h1>
            <p className="mx-auto mt-3 text-mauve">
              Khai phá tiềm năng thực sự của mái tóc với trí tuệ nhân tạo chuyên sâu và đặc quyền từ các Salon hàng đầu.
            </p>
          </div>
        </AnimatedContent>
      </section>

      {/* Pricing cards */}
      <section className="px-6 py-16 sm:px-16">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
          {PLANS.map((p, i) => (
            <AnimatedContent key={p.name} delay={i * 0.15}>
              {p.highlight ? (
                /* Premium card: GlareHover sweep + BorderGlow CTA */
                <GlareHover className="rounded-3xl">
                  <PlanCard plan={p} premium />
                </GlareHover>
              ) : (
                <PlanCard plan={p} />
              )}
            </AnimatedContent>
          ))}
        </div>
      </section>

      {/* CTA cuối */}
      <section className="bg-transparent px-4 pb-20 sm:px-16">
        <AnimatedContent y={60}>
          <GlareHover className="mx-auto max-w-[1200px] rounded-[40px]">
            <div className="relative flex flex-col items-center gap-6 overflow-hidden rounded-[40px] bg-[#2f3131] p-12 text-center sm:p-16">
              <div className="pointer-events-none absolute inset-[-10%] bg-pink/20 blur-[60px]" />
              <h2 className="relative font-display text-3xl font-extrabold text-white sm:text-4xl">
                Sẵn sàng để thay đổi diện mạo?
              </h2>
              <p className="relative max-w-xl text-[#e2e2e2]">
                Hàng ngàn người đã tìm thấy kiểu tóc chân ái cùng Hairapy Premium. Còn bạn thì sao?
              </p>
              <div className="relative">
                <BorderGlow rounded="rounded-full" thickness={2}>
                  <Button to="/register" variant="pink">Bắt đầu ngay hôm nay</Button>
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

/* Tách card ra để re-use trong cả GlareHover wrapper và standalone */
function PlanCard({ plan: p, premium = false }) {
  return (
    <Card className={`relative flex h-full flex-col gap-6 ${p.highlight ? "ring-2 ring-pink" : ""}`}>
      {p.highlight && (
        <Badge variant="hot" className="absolute -top-3 right-6">Bán chạy nhất</Badge>
      )}

      <div>
        <h3 className="font-display text-xl font-bold text-ink">{p.name}</h3>
        <p className="text-sm text-muted">{p.tagline}</p>
      </div>

      <div>
        <div className="flex items-end gap-1">
          <span className="text-4xl font-extrabold text-ink">{p.price}</span>
          <span className="pb-1 text-sm text-muted">{p.period}</span>
        </div>
        {p.note && <p className="mt-1 text-xs font-semibold text-magenta">{p.note}</p>}
      </div>

      <ul className="flex flex-col gap-3">
        {p.features.map((f) => (
          <li key={f.text} className={`flex items-center gap-2 text-sm ${f.on ? "text-mauve" : "text-muted/50 line-through"}`}>
            <CheckIcon size={18} className={f.on ? "text-lime" : "text-muted/40"} />
            {f.text}
          </li>
        ))}
      </ul>

      {premium ? (
        <BorderGlow rounded="rounded-full" thickness={2} className="mt-auto w-full block">
          <Button to={p.to} variant={p.variant} className="w-full">{p.cta}</Button>
        </BorderGlow>
      ) : (
        <Button to={p.to} variant={p.variant} className="mt-auto w-full">{p.cta}</Button>
      )}
    </Card>
  );
}
