import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button, Card, Badge, Input } from "../components/ui";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { AnimatedContent, SpotlightCard } from "../components/animated";

const FILTERS = {
  "Giới tính": ["Nam", "Nữ"],
  "Khuôn mặt": ["Tròn", "Vuông", "Trái xoan", "Dài"],
  "Xu hướng": ["Hot Trend", "Mới nhất", "Kinh điển"],
  "Độ dài": ["Ngắn", "Vừa", "Dài"],
};

const BASE = import.meta.env.VITE_API_URL || "/api";

function useHairstyles({ faceShape, search, gender }) {
  return useQuery({
    queryKey: ["hairstyles", faceShape, search, gender],
    queryFn: async () => {
      const params = {};
      if (faceShape) params.faceShape = faceShape;
      if (search) params.search = search;
      if (gender) params.gender = gender;
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const { data } = await axios.get(`${BASE}/hairstyles`, { params, headers });
      return data;
    },
  });
}

export default function CatalogPage() {
  const navigate = useNavigate();
  const [face, setFace] = useState(null);
  const [genderFilter, setGenderFilter] = useState(null);
  const [q, setQ] = useState("");

  const handleDetail = (hairstyleId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { state: { from: `/catalog` } });
      return;
    }
    navigate(`/results?hairstyleId=${hairstyleId}`);
  };

  const { data: items = [], isLoading, isError } = useHairstyles({
    faceShape: face,
    search: q,
    gender: genderFilter,
  });

  return (
    <div className="min-h-screen">
      <Navbar />

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

      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-6 py-12 sm:px-16 lg:grid-cols-[260px_1fr]">
        <aside className="flex flex-col gap-6">
          {Object.entries(FILTERS).map(([group, opts]) => (
            <Card key={group} className="p-5">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink">{group}</h3>
              <div className="flex flex-wrap gap-2">
                {opts.map((o) => {
                  const active =
                    (group === "Khuôn mặt" && face === o) ||
                    (group === "Giới tính" && genderFilter === o);
                  return (
                    <button key={o}
                      onClick={() => {
                        if (group === "Khuôn mặt") setFace(active ? null : o);
                        if (group === "Giới tính") setGenderFilter(active ? null : o);
                      }}
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${
                        active ? "border-primary bg-primary text-white" : "border-line text-mauve hover:border-primary"}`}>
                      {o}
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}

          <Card className="bg-gradient-to-br from-pink/10 to-primary/10">
            <h3 className="text-lg font-bold text-ink">Thử tóc với AI?</h3>
            <p className="mt-1 text-sm text-mauve">Tải ảnh của bạn để xem kiểu tóc mới ngay lập tức.</p>
            <Button to="/scan" size="sm" className="mt-4 w-full">Bắt đầu phân tích</Button>
          </Card>
        </aside>

        <div>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-ink">Tất cả kiểu tóc</h2>
            <span className="text-sm text-mauve">{isLoading ? "Đang tải..." : `${items.length} kiểu tóc`}</span>
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} padded={false} className="animate-pulse overflow-hidden">
                  <div className="h-60 w-full bg-line" />
                  <div className="space-y-2 p-4">
                    <div className="h-5 w-3/4 rounded bg-line" />
                    <div className="h-4 w-full rounded bg-line" />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-lg font-semibold text-ink">Không thể tải danh sách kiểu tóc.</p>
              <p className="mt-1 text-sm text-mauve">Vui lòng kiểm tra kết nối hoặc thử lại sau.</p>
              <Button to="/login" size="sm" className="mt-4">Đăng nhập lại</Button>
            </div>
          )}

          {!isLoading && !isError && (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((i, idx) => (
                  <AnimatedContent key={i.id} delay={idx * 0.05}>
                    <SpotlightCard className="rounded-2xl">
                      <Card padded={false} className="overflow-hidden">
                        <div className="relative">
                          <img
                            src={i.imageUrl}
                            alt={i.name}
                            className="h-60 w-full object-cover"
                            onError={(e) => { e.target.src = `https://placehold.co/600x400?text=${encodeURIComponent(i.name)}`; }}
                          />
                          {i.tag && (
                            <Badge variant={["Mới", "Bán chạy"].includes(i.tag) ? "new" : "hot"} className="absolute left-3 top-3 shadow">
                              {i.tag}
                            </Badge>
                          )}
                          {i.premiumOnly && (
                            <Badge variant="premium" className="absolute right-3 top-3 shadow">PREMIUM</Badge>
                          )}
                          {i.faceShape && (
                            <span className="absolute right-3 bottom-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-mauve">
                              {i.faceShape}
                            </span>
                          )}
                        </div>
                        <div className="p-4">
                          <h4 className="text-lg font-bold text-ink">{i.name}</h4>
                          <p className="mt-1 text-sm text-mauve">{i.description}</p>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted">Độ dài: {i.hairLength}</span>
                            <Button
                              onClick={() => handleDetail(i.id)}
                              size="sm"
                              variant="outline"
                              className="px-4 py-2 text-xs"
                            >
                              Chi tiết
                            </Button>
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
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
