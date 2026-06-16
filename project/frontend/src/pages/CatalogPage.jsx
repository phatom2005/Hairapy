import { useState } from "react";
import { TRENDS } from "../lib/figmaAssets";
import { Button, Card, Badge, Input } from "../components/ui";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { AnimatedContent, SpotlightCard } from "../components/animated";

// Dữ liệu mock catalog (sau nối API GET /api/hairstyles)
const ITEMS = [
  { name: "Wolf Cut Pastel", tag: "Thịnh hành", face: "Trái xoan", length: "Vừa", desc: "Sự kết hợp hoàn hảo giữa nét phá cách và dịu dàng.", img: TRENDS[0].img },
  { name: "Modern Fade", tag: "Kinh điển", face: "Vuông", length: "Ngắn", desc: "Gọn gàng, nam tính và vô cùng lịch lãm.", img: TRENDS[1].img },
  { name: "Sunset Curls", tag: "Bán chạy", face: "Tròn", length: "Dài", desc: "Quyến rũ với những lọn tóc xoăn bồng bềnh.", img: TRENDS[2].img },
  { name: "French Chic Bob", tag: "Mới", face: "Dài", length: "Ngắn", desc: "Vẻ đẹp tối giản, thanh lịch vượt thời gian.", img: TRENDS[3].img },
  { name: "Surf Shag", tag: "Viral", face: "Tròn", length: "Vừa", desc: "Phong cách tự do, phóng khoáng như nắng hè.", img: TRENDS[4].img },
  { name: "Sleek Quiff", tag: "Thanh lịch", face: "Trái xoan", length: "Ngắn", desc: "Sự lựa chọn hàng đầu cho quý ông công sở.", img: TRENDS[5].img },
];

const FILTERS = {
  "Khuôn mặt": ["Tròn", "Vuông", "Trái xoan", "Dài"],
  "Xu hướng": ["Hot Trend", "Mới nhất", "Kinh điển"],
  "Độ dài": ["Ngắn", "Vừa", "Dài"],
};

export default function CatalogPage() {
  const [face, setFace] = useState(null);   // lọc theo khuôn mặt (demo)
  const [q, setQ] = useState("");

  const items = ITEMS.filter(
    (i) =>
      (!face || i.face === face) &&
      (!q || i.name.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero + search */}
      <section className="bg-transparent px-6 py-16 sm:px-16">
        <div className="mx-auto max-w-[1200px] text-center">
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Bộ Sưu Tập Kiểu Tóc</h1>
          <p className="mx-auto mt-3 max-w-2xl text-mauve">
            Khám phá hàng ngàn kiểu tóc được tuyển chọn bởi AI, phù hợp với mọi khuôn mặt và phong cách cá nhân của bạn.
          </p>
          <div className="mx-auto mt-6 max-w-xl">
            <Input placeholder="Tìm kiếm kiểu tóc, phong cách..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
      </section>

      {/* Body: filter + grid */}
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-6 py-12 sm:px-16 lg:grid-cols-[260px_1fr]">
        {/* Sidebar filter */}
        <aside className="flex flex-col gap-6">
          {Object.entries(FILTERS).map(([group, opts]) => (
            <Card key={group} className="p-5">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink">{group}</h3>
              <div className="flex flex-wrap gap-2">
                {opts.map((o) => {
                  const active = group === "Khuôn mặt" && face === o;
                  return (
                    <button key={o}
                      onClick={() => group === "Khuôn mặt" && setFace(active ? null : o)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${
                        active ? "border-primary bg-primary text-white" : "border-line text-mauve hover:border-primary"}`}>
                      {o}
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}

          {/* Promo */}
          <Card className="bg-gradient-to-br from-pink/10 to-primary/10">
            <h3 className="text-lg font-bold text-ink">Thử tóc với AI?</h3>
            <p className="mt-1 text-sm text-mauve">Tải ảnh của bạn để xem kiểu tóc mới ngay lập tức.</p>
            <Button to="/scan" size="sm" className="mt-4 w-full">Bắt đầu phân tích</Button>
          </Card>
        </aside>

        {/* Grid */}
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-ink">Tất cả kiểu tóc</h2>
            <label className="flex items-center gap-2 text-sm text-mauve">
              Sắp xếp:
              <select className="rounded-full border border-line bg-white px-3 py-1.5 font-semibold text-ink outline-none">
                <option>Phổ biến nhất</option>
                <option>Mới nhất</option>
                <option>A → Z</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((i, idx) => (
              <AnimatedContent key={i.name} delay={idx * 0.05}>
                <SpotlightCard className="rounded-2xl">
                  <Card padded={false} className="overflow-hidden">
                <div className="relative">
                  <img src={i.img} alt={i.name} className="h-60 w-full object-cover" />
                  <Badge variant={["Mới","Bán chạy"].includes(i.tag) ? "new" : "hot"} className="absolute left-3 top-3 shadow">{i.tag}</Badge>
                  <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-mauve">{i.face}</span>
                </div>
                <div className="p-4">
                  <h4 className="text-lg font-bold text-ink">{i.name}</h4>
                  <p className="mt-1 text-sm text-mauve">{i.desc}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted">Độ dài: {i.length}</span>
                    <Button to="/results" size="sm" variant="outline" className="px-4 py-2 text-xs">Chi tiết</Button>
                  </div>
                </div>
                  </Card>
                </SpotlightCard>
              </AnimatedContent>
            ))}
          </div>

          {items.length === 0 && (
            <p className="py-16 text-center text-mauve">Không tìm thấy kiểu tóc phù hợp.</p>
          )}

          {/* Pagination */}
          <div className="mt-10 flex items-center justify-center gap-2">
            {["1", "2", "3", "...", "12"].map((p, idx) => (
              <button key={idx}
                className={`flex size-10 items-center justify-center rounded-full text-sm font-semibold transition ${
                  p === "1" ? "bg-primary text-white" : "text-mauve hover:bg-white"}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
