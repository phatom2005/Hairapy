import { PROFILE_IMG, TRENDS } from "../lib/figmaAssets";
import { Button, Card, Badge, Section, SectionHeading } from "../components/ui";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { ArrowRight } from "../components/icons";
import { AnimatedContent, SpotlightCard } from "../components/animated";
import useAuthStore from "../store/useAuthStore";

const METRICS = [
  { label: "Dáng mặt", value: "Oval" },
  { label: "Chất tóc", value: "Lượn sóng" },
  { label: "Lượt quét AI", value: "12" },
];
const RECS = [
  { name: "Modern Quiff", desc: "Kiểu tóc năng động", match: 98, img: TRENDS[1].img },
  { name: "Textured Fade", desc: "Phù hợp khuôn mặt Oval", match: 95, img: TRENDS[5].img },
  { name: "Slick Back", desc: "Phong cách lịch lãm", match: 92, img: TRENDS[3].img },
];
const SAVED = [
  { name: "Side Part Classic", date: "15/05/2026", img: TRENDS[6].img },
  { name: "Modern French Crop", date: "02/06/2026", img: TRENDS[4].img },
];

export default function ProfilePage() {
  const { user } = useAuthStore();
  const userName = user?.fullName || (user?.email ? user.email.split("@")[0] : "Người dùng");
  const userRole = user?.role === "ADMIN" ? "Admin" : (user?.role === "PREMIUM" ? "Premium" : "Thành viên");

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
              {METRICS.map((m) => (
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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {RECS.map((r, idx) => (
            <AnimatedContent key={r.name} delay={idx * 0.1}>
              <SpotlightCard className="rounded-2xl">
                <Card padded={false} className="overflow-hidden">
              <div className="relative">
                <img src={r.img} alt={r.name} className="h-56 w-full object-cover" />
                <Badge variant="new" className="absolute left-3 top-3 shadow">{r.match}% phù hợp</Badge>
              </div>
              <div className="p-4">
                <h4 className="font-bold text-ink">{r.name}</h4>
                <p className="text-sm text-mauve">{r.desc}</p>
              </div>
                </Card>
              </SpotlightCard>
            </AnimatedContent>
          ))}
        </div>
      </Section>

      {/* Phong cách của tôi */}
      <Section className="bg-transparent">
        <SectionHeading center={false} title="Phong cách của tôi" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SAVED.map((sv, idx) => (
            <AnimatedContent key={sv.name} delay={idx * 0.1}>
              <SpotlightCard className="rounded-2xl">
                <Card padded={false} className="overflow-hidden">
                <img src={sv.img} alt={sv.name} className="h-48 w-full object-cover" />
                <div className="p-4">
                  <h4 className="font-bold text-ink">{sv.name}</h4>
                  <p className="text-xs text-muted">Lưu ngày: {sv.date}</p>
                <div className="mt-3 flex gap-2">
                  <Button to="/results" size="sm" variant="outline" className="flex-1 px-2 py-2 text-xs">Xem lại kết quả</Button>
                  <Button to="/swap" size="sm" className="flex-1 px-2 py-2 text-xs">Thử lại ngay</Button>
                  </div>
                </div>
                </Card>
              </SpotlightCard>
            </AnimatedContent>
          ))}

          {/* Empty state thêm mới */}
          <Card className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-divider bg-transparent text-center">
            <p className="font-bold text-ink">Thêm phong cách mới</p>
            <p className="text-sm text-mauve">Khám phá thêm nhiều kiểu tóc từ bộ sưu tập của chúng tôi</p>
            <Button to="/catalog" variant="outline" size="sm">Khám phá Catalog</Button>
          </Card>
        </div>
      </Section>

      <Footer />
    </div>
  );
}
