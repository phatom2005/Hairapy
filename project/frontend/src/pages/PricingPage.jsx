import { Button, Card, Badge } from "../components/ui";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { CheckIcon } from "../components/icons";
import { AnimatedContent, GlareHover, BorderGlow } from "../components/animated";
import useAuthStore from "../store/useAuthStore";

const PLANS = [
  {
    name: "Cơ bản", tagline: "Bắt đầu hành trình của bạn",
    price: "0đ", period: "/ vĩnh viễn", highlight: false,
    cta: "Dùng bản miễn phí", to: "/register", variant: "outline",
    features: [
      { text: "1 lần quét AI mỗi ngày", on: true },
      { text: "5 lần thử kiểu tóc mỗi ngày", on: true },
      { text: "Phân tích chuyên sâu", on: false },
      { text: "Ưu đãi Salon", on: false },
    ],
  },
  {
    name: "Tuần", tagline: "Trải nghiệm nhanh",
    price: "29.000vnđ", period: "/ tuần", highlight: false,
    cta: "Mua gói Tuần", to: "/checkout?plan=PRO", variant: "outline",
    features: [
      { text: "5 lần quét AI mỗi ngày", on: true },
      { text: "20 lần thử kiểu tóc mỗi ngày", on: true },
      { text: "Ảnh HD không watermark", on: true },
      { text: "Tư vấn 1:1 cùng Stylist", on: false },
    ],
  },
  {
    name: "Tháng", tagline: "Trải nghiệm không giới hạn",
    price: "79.000vnđ", period: "/ tháng", highlight: true,
    cta: "Nâng cấp ngay", to: "/checkout?plan=PREMIUM", variant: "pink",
    features: [
      { text: "5 lần quét AI mỗi ngày", on: true },
      { text: "20 lần thử kiểu tóc mỗi ngày", on: true },
      { text: "Ảnh HD không watermark", on: true },
      { text: "Tư vấn 1:1 cùng Stylist", on: true },
    ],
  },
];

export default function PricingPage() {
  const { user } = useAuthStore();

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
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
          {PLANS.map((p, i) => (
            <AnimatedContent key={p.name} delay={i * 0.15}>
              {p.highlight ? (
                /* Premium card: halo phát sáng phía sau + viền glow xoay quanh card +
                   nhô cao hơn Free trên desktop để nổi bật hẳn */
                <div className="relative h-full md:-translate-y-3">
                  <div className="pointer-events-none absolute inset-[-8%] -z-10 rounded-[40px] bg-pink/25 blur-[50px]" />
                  <BorderGlow rounded="rounded-3xl" thickness={2} className="block h-full w-full">
                    <GlareHover className="h-full rounded-3xl">
                      <PlanCard plan={p} premium user={user} />
                    </GlareHover>
                  </BorderGlow>
                </div>
              ) : (
                <PlanCard plan={p} user={user} />
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
function PlanCard({ plan: p, premium = false, user }) {
  const getCtaState = () => {
    if (!user) {
      return { cta: p.cta, to: p.to, disabled: false };
    }
    if (user.role === "ADMIN") {
      return { cta: "Trang quản trị", to: "/admin", disabled: false };
    }
    if (p.name === "Cơ bản") {
      if (user.role === "USER") {
        return { cta: "Đang áp dụng", to: null, disabled: true };
      }
      return { cta: "Gói cơ bản", to: null, disabled: true };
    }
    if (p.name === "Tuần") {
      if (user.role === "PREMIUM") {
        return { cta: "Đang dùng Premium", to: null, disabled: true };
      }
      return { cta: p.cta, to: p.to, disabled: false };
    }
    if (p.name === "Premium") {
      if (user.role === "PREMIUM") {
        return { cta: "Đang áp dụng", to: null, disabled: true };
      }
      return { cta: p.cta, to: p.to, disabled: false };
    }
    return { cta: p.cta, to: p.to, disabled: false };
  };

  const { cta, to, disabled } = getCtaState();

  return (
    <Card className="relative flex h-full flex-col gap-6">
      {p.highlight && (
        <Badge variant="hot" className="absolute top-4 right-4 shadow">Bán chạy nhất</Badge>
      )}

      <div>
        <h3 className="font-display text-xl font-bold text-ink">{p.name}</h3>
        <p className="text-sm text-muted">{p.tagline}</p>
      </div>

      <div>
        <div className="flex items-end gap-1">
          <span className={`text-4xl font-extrabold ${premium ? "text-magenta" : "text-ink"}`}>{p.price}</span>
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
          <Button to={to} variant={p.variant} disabled={disabled} className="w-full">{cta}</Button>
        </BorderGlow>
      ) : (
        <Button to={to} variant={p.variant} disabled={disabled} className="mt-auto w-full">{cta}</Button>
      )}
    </Card>
  );
}
