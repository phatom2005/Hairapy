import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatedContent } from "../components/animated";
import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import { Badge, Button, Card } from "../components/ui";
import api from "../lib/api";
import { useScanStore } from "../store/useScanStore";

const GENDER_OPTS = ["Nam", "Nữ", "Unisex"];
const FACE_OPTS = ["Tròn", "Vuông", "Trái xoan", "Dài", "Trái tim", "Kim cương"];
const LENGTH_OPTS = ["Ngắn", "Vừa", "Dài"];
const TREND_OPTS = [
  { value: "hot-trend", label: "Thịnh hành", api: "Thịnh hành" },
  { value: "moi", label: "Mới", api: "Mới" },
  { value: "kinh-dien", label: "Kinh điển", api: "Kinh điển" },
];
const SORT_OPTS = [
  { value: "popular", label: "Phổ biến" },
  { value: "newest", label: "Mới nhất" },
  { value: "a-z", label: "Tên A → Z" },
  { value: "z-a", label: "Tên Z → A" },
];
const PAGE_SIZES = [12, 24, 36];

// ─── Data hook ────────────────────────────────────────────────────────────────
function useHairstyles({ faceShape, search, gender, hairLength, tag }) {
  return useQuery({
    queryKey: ["hairstyles", faceShape, search, gender, hairLength, tag],
    queryFn: async () => {
      const params = {};
      if (faceShape) params.faceShape = faceShape;
      if (search) params.search = search;
      if (gender) params.gender = gender;
      if (hairLength) params.hairLength = hairLength;
      if (tag) params.tag = tag;
      const { data } = await api.get("/hairstyles", { params });
      return data;
    },
    staleTime: 60_000,
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function FilterSelect({ label, options, value, onChange }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value || null)}
        className={`h-9 cursor-pointer appearance-none rounded-full border pl-3 pr-8 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${
          value
            ? "border-primary bg-primary text-white"
            : "border-line bg-surface text-ink hover:border-primary/50"
        }`}
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={typeof o === "string" ? o : o.value} value={typeof o === "string" ? o : o.value}>
            {typeof o === "string" ? o : o.label}
          </option>
        ))}
      </select>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`pointer-events-none absolute right-2.5 top-1/2 size-3 -translate-y-1/2 ${value ? "text-white" : "text-mauve"}`}
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

function SkeletonCard() {
  return (
    <Card padded={false} className="animate-pulse overflow-hidden rounded-2xl">
      <div className="aspect-[4/5] w-full bg-line" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-3/4 rounded-full bg-line" />
        <div className="h-3 w-1/2 rounded-full bg-line" />
        <div className="mt-3 h-8 w-full rounded-xl bg-line" />
      </div>
    </Card>
  );
}

function EmptyState({ hasFilters, onClear }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-primary/10 text-4xl">
        ✂️
      </div>
      <h3 className="text-xl font-bold text-ink">Không tìm thấy kiểu tóc</h3>
      <p className="mt-2 max-w-xs text-sm text-mauve">
        {hasFilters
          ? "Thử điều chỉnh bộ lọc để xem thêm kiểu tóc phù hợp với bạn."
          : "Hiện chưa có kiểu tóc nào trong danh mục."}
      </p>
      {hasFilters && (
        <Button onClick={onClear} size="sm" className="mt-5">
          Xóa bộ lọc
        </Button>
      )}
    </div>
  );
}

function Pagination({ page, totalPages, onPageChange }) {
  const pages = useMemo(() => {
    const range = [];
    const delta = 2;
    const left = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);
    range.push(1);
    if (left > 2) range.push("...");
    for (let i = left; i <= right; i++) range.push(i);
    if (right < totalPages - 1) range.push("...");
    if (totalPages > 1) range.push(totalPages);
    return range;
  }, [page, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="flex h-9 items-center gap-1 rounded-full border border-line px-3 text-sm font-medium text-mauve transition hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40"
      >
        ‹ Trước
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-1 text-mauve select-none">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition ${
              p === page
                ? "border-primary bg-primary text-white shadow-sm"
                : "border-line text-mauve hover:border-primary hover:text-primary"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="flex h-9 items-center gap-1 rounded-full border border-line px-3 text-sm font-medium text-mauve transition hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40"
      >
        Sau ›
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CatalogPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get("q") || "";
  const genderFilter = searchParams.get("gender") || "";
  const face = searchParams.get("face") || "";
  const lengthFilter = searchParams.get("length") || "";
  const tagFilter = searchParams.get("trend") || "";
  const sortBy = searchParams.get("sort") || "popular";
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = PAGE_SIZES.includes(Number(searchParams.get("size")))
    ? Number(searchParams.get("size"))
    : 12;

  const hasFilters = !!(q || genderFilter || face || lengthFilter || tagFilter);

  const setParam = useCallback(
    (key, value, resetPage = true) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        if (resetPage) next.set("page", "1");
        return next;
      });
    },
    [setSearchParams]
  );

  const clearFilters = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      ["q", "gender", "face", "length", "trend"].forEach((k) => next.delete(k));
      next.set("page", "1");
      return next;
    });
  }, [setSearchParams]);

  const trendApiValue = TREND_OPTS.find((t) => t.value === tagFilter)?.api || null;

  const { data: items = [], isLoading, isError } = useHairstyles({
    faceShape: face || null,
    search: q || null,
    gender: genderFilter || null,
    hairLength: lengthFilter || null,
    tag: trendApiValue,
  });

  const sorted = useMemo(() => {
    const copy = [...items];
    switch (sortBy) {
      case "newest": return copy.sort((a, b) => b.id - a.id);
      case "a-z":    return copy.sort((a, b) => a.name.localeCompare(b.name, "vi"));
      case "z-a":    return copy.sort((a, b) => b.name.localeCompare(a.name, "vi"));
      default:       return copy;
    }
  }, [items, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const startItem = sorted.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, sorted.length);

  const { data: savedStyles = [] } = useQuery({
    queryKey: ["profile-saved-styles"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) return []; // giữ guard này — tránh gọi API thừa khi chưa đăng nhập
      const { data } = await api.get("/profile/saved-styles");
      return data;
    },
  });
  const savedIds = new Set(savedStyles.map((s) => s.id));

  const setSelectedHairstyle = useScanStore((state) => state.setSelectedHairstyle);
  const previewUrl = useScanStore((state) => state.previewUrl);

  const handleDetail = (hairstyle) => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { state: { from: "/catalog" } });
      return;
    }
    setSelectedHairstyle({
      id: hairstyle.id,
      name: hairstyle.name,
      imageUrl: hairstyle.imageUrl,
      ailabHairType: hairstyle.ailabHairType,
      ailabProStyle: hairstyle.ailabProStyle,
    });
    if (previewUrl) {
      navigate(`/results?hairstyleId=${hairstyle.id}`);
    } else {
      navigate(`/scan?hairstyleId=${hairstyle.id}`);
    }
  };

  const handleToggleSave = async (e, hairstyleId) => {
    e.stopPropagation();
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { state: { from: "/catalog" } });
      return;
    }
    try {
      const isSaved = savedIds.has(hairstyleId);
      if (isSaved) {
        await api.delete("/profile/saved-styles", { params: { hairstyleId } });
      } else {
        await api.post("/profile/saved-styles", null, { params: { hairstyleId } });
      }
      queryClient.invalidateQueries({ queryKey: ["profile-saved-styles"] });
    } catch (err) {
      console.error("Loi khi thay doi trang thai yeu thich:", err);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="bg-transparent px-6 pb-10 pt-16 sm:px-16">
        <div className="mx-auto max-w-[1200px] text-center">
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
            Bộ Sưu Tập Kiểu Tóc
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-mauve">
            Khám phá hàng ngàn kiểu tóc được tuyển chọn bởi AI, phù hợp với mọi khuôn mặt và phong cách cá nhân của bạn.
          </p>
        </div>
      </section>

      {/* Sticky Filter Bar */}
      <div className="sticky top-16 z-40 border-b border-line/40 bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto max-w-[1200px] px-6 py-3 sm:px-16">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <input
                type="text"
                placeholder="Tìm kiểu tóc..."
                value={q}
                onChange={(e) => setParam("q", e.target.value)}
                className="h-9 w-full rounded-full border border-ink/30 bg-surface pl-4 pr-8 text-sm text-ink placeholder-mauve transition hover:border-ink/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {q && (
                <button
                  onClick={() => setParam("q", "")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mauve hover:text-ink"
                >
                  ×
                </button>
              )}
            </div>

            <FilterSelect label="Giới tính" options={GENDER_OPTS} value={genderFilter} onChange={(v) => setParam("gender", v)} />
            <FilterSelect label="Khuôn mặt" options={FACE_OPTS} value={face} onChange={(v) => setParam("face", v)} />
            <FilterSelect label="Độ dài" options={LENGTH_OPTS} value={lengthFilter} onChange={(v) => setParam("length", v)} />
            <FilterSelect
              label="Xu hướng"
              options={TREND_OPTS.map((t) => ({ value: t.value, label: t.label }))}
              value={tagFilter}
              onChange={(v) => setParam("trend", v)}
            />

            <div className="hidden h-6 w-px bg-line sm:block" />
            <FilterSelect
              label="Sắp xếp"
              options={SORT_OPTS}
              value={sortBy}
              onChange={(v) => setParam("sort", v, false)}
            />

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex h-9 items-center gap-1.5 rounded-full border border-primary/50 px-3 text-sm font-medium text-primary transition hover:bg-primary/5"
              >
                Xóa lọc
              </button>
            )}


          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="mx-auto max-w-[1200px] px-6 py-10 sm:px-16">
        {isLoading && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: pageSize }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-lg font-semibold text-ink">Không thể tải danh sách kiểu tóc.</p>
            <p className="mt-1 text-sm text-mauve">Vui lòng kiểm tra kết nối hoặc thử lại sau.</p>
            <Button to="/login" size="sm" className="mt-4">Đăng nhập lại</Button>
          </div>
        )}

        {!isLoading && !isError && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pageItems.length === 0 ? (
                <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
              ) : (
                pageItems.map((item, idx) => (
                  <AnimatedContent key={item.id} delay={idx * 0.04}>
                    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line/60 bg-surface shadow-sm transition-shadow duration-300 hover:shadow-lg">
                      <div className="relative overflow-hidden">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            e.target.src = `https://placehold.co/400x500?text=${encodeURIComponent(item.name)}`;
                          }}
                        />
                        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5">
                          {item.tag && (
                            <Badge variant={["Mới", "Bán chạy"].includes(item.tag) ? "new" : "hot"} className="shadow">
                              {item.tag}
                            </Badge>
                          )}
                          {item.premiumOnly && (
                            <Badge variant="premium" className="shadow">PREMIUM</Badge>
                          )}
                        </div>
                        <button
                          onClick={(e) => handleToggleSave(e, item.id)}
                          title={savedIds.has(item.id) ? "Bỏ lưu" : "Lưu kiểu tóc"}
                          className="absolute right-2.5 top-2.5 flex size-8 items-center justify-center rounded-full bg-white/90 shadow transition hover:bg-white hover:scale-110"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill={savedIds.has(item.id) ? "#FF57CF" : "none"} viewBox="0 0 24 24" strokeWidth={2} stroke="#FF57CF" className="size-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex flex-1 flex-col justify-between p-3">
                        <div>
                          <h4 className="truncate text-sm font-bold text-ink">{item.name}</h4>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {item.gender && (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{item.gender}</span>
                            )}
                            {item.hairLength && (
                              <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-mauve ring-1 ring-line">{item.hairLength}</span>
                            )}
                            {item.faceShape &&
                              item.faceShape.split(",").slice(0, 2).map((s) => (
                                <span key={s.trim()} className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-mauve ring-1 ring-line">
                                  {s.trim()}
                                </span>
                              ))}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDetail(item)}
                          className="mt-3 w-full rounded-xl border border-primary/30 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white"
                        >
                          Thử kiểu này
                        </button>
                      </div>
                    </div>
                  </AnimatedContent>
                ))
              )}
            </div>

            {sorted.length > 0 && (
              <div className="mt-10 flex flex-col items-center gap-5">
                <Pagination
                  page={safePage}
                  totalPages={totalPages}
                  onPageChange={(p) => setParam("page", String(p), false)}
                />
                <div className="flex items-center gap-4 text-sm text-mauve">
                  <span>
                    Hiển thị <span className="font-semibold text-ink">{startItem}–{endItem}</span> trong số{" "}
                    <span className="font-semibold text-ink">{sorted.length}</span> kiểu tóc
                  </span>
                  <span className="h-4 w-px bg-line" />
                  <div className="flex items-center gap-1.5">
                    <span>Hiển thị:</span>
                    {PAGE_SIZES.map((s) => (
                      <button
                        key={s}
                        onClick={() =>
                          setSearchParams((prev) => {
                            const next = new URLSearchParams(prev);
                            next.set("size", String(s));
                            next.set("page", "1");
                            return next;
                          })
                        }
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                          s === pageSize
                            ? "bg-primary text-white"
                            : "bg-surface text-mauve ring-1 ring-line hover:ring-primary"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
