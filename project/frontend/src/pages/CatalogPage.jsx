import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Scissor, MagicStar } from "iconsax-reactjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatedContent } from "../components/animated";
import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import { Badge, Button, Card } from "../components/ui";
import api from "../lib/api";
import { trackEvent } from "../lib/analytics";
import { useScanStore } from "../store/useScanStore";
import useAuthStore from "../store/useAuthStore";
import { HAIR_COLORS, COLOR_BY_VALUE, swatchBg } from "../lib/hairColors";
import HairstyleDetailModal from "../components/HairstyleDetailModal";
import PremiumGateModal from "../components/PremiumGateModal";

const GENDER_OPTS = ["Nam", "Nữ", "Unisex"];
const FACE_OPTS = ["Tròn", "Vuông", "Trái xoan", "Dài", "Trái tim", "Kim cương"];
const LENGTH_OPTS = ["Ngắn", "Vừa", "Dài"];
const SORT_OPTS = [
  { value: "popular", label: "Phổ biến" },
  { value: "newest", label: "Mới nhất" },
  { value: "a-z", label: "Tên A → Z" },
  { value: "z-a", label: "Tên Z → A" },
];
const PAGE_SIZES = [12, 24, 36];

// ─── Data hook ────────────────────────────────────────────────────────────────
function useHairstyles({ faceShape, search, gender, hairLength, tag, color, sort }) {
  return useQuery({
    queryKey: ["hairstyles", faceShape, search, gender, hairLength, tag, color, sort],
    queryFn: async () => {
      const params = {};
      if (faceShape) params.faceShape = faceShape;
      if (search) params.search = search;
      if (gender) params.gender = gender;
      if (hairLength) params.hairLength = hairLength;
      if (tag) params.tag = tag;
      if (color) params.color = color;
      if (sort === "popular") params.sort = "popular";
      const { data } = await api.get("/hairstyles", { params });
      return data;
    },
    staleTime: 60_000,
  });
}

function useAllCatalogTags() {
  return useQuery({
    queryKey: ["catalog-available-tags"],
    queryFn: async () => {
      const { data } = await api.get("/hairstyles");
      const tags = new Set();
      data.forEach((h) => {
        if (h.tag && h.tag.trim()) tags.add(h.tag.trim());
      });
      return Array.from(tags);
    },
    staleTime: 300_000,
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function FilterSelect({ label, options, value, onChange }) {
  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value || null)}
        className={`h-10 w-full cursor-pointer appearance-none rounded-2xl border pl-3.5 pr-8 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${
          value
            ? "border-primary bg-primary text-white"
            : "border-line bg-white text-ink hover:border-primary/50"
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
        className={`pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 ${value ? "text-white" : "text-mauve"}`}
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
      <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-primary/10 text-4xl text-primary">
        <Scissor size={36} variant="Bulk" />
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

function HairstyleCatalogCard({
  group,
  isSaved,
  onToggleSave,
  onOpenDetail,
  onTryStyle,
}) {
  const [selectedVariant, setSelectedVariant] = useState(group.base);
  const current = selectedVariant || group.base;

  return (
    <div
      onClick={() => onOpenDetail(group.base, group.variants, current)}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line/60 bg-white shadow-sm transition-all duration-300 hover:shadow-lg cursor-pointer"
    >
      <div className="relative overflow-hidden">
        <img
          src={current.imageUrl}
          alt={current.name}
          className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            e.target.src = `https://placehold.co/400x500?text=${encodeURIComponent(current.name)}`;
          }}
        />
        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5 z-10">
          {current.tag && (
            <Badge variant={["Mới", "Bán chạy", "Viral"].includes(current.tag) ? "new" : "hot"} className="shadow">
              {current.tag}
            </Badge>
          )}
          {current.premiumOnly && (
            <Badge variant="premium" className="shadow">
              Trả phí
            </Badge>
          )}
        </div>

        {current.sampleByAi && (
          <div className="absolute left-2.5 bottom-2.5 rounded-full bg-ink/75 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md shadow z-10">
            <span className="inline-flex items-center gap-1"><MagicStar size={11} variant="Bold" /> Ảnh minh hoạ do AI tạo</span>
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(e, current.id);
          }}
          title={isSaved ? "Bỏ lưu" : "Lưu kiểu tóc"}
          className="absolute right-2.5 top-2.5 flex size-8 items-center justify-center rounded-full bg-white/90 shadow transition hover:bg-white hover:scale-110 z-10"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill={isSaved ? "#FF57CF" : "none"}
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="#FF57CF"
            className="size-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
            />
          </svg>
        </button>
      </div>

      {/* Chấm màu biến thể nếu có */}
      {group.variants.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 px-3 pt-2.5">
          {group.variants.map((v) => {
            const isSel = v.id === current.id;
            const colorObj = v.ailabColor ? COLOR_BY_VALUE[v.ailabColor] : null;
            const tones = colorObj?.tones || ["#3a2c23", "#231812", "#0f0a07"];
            const label = colorObj?.label || (v.baseStyleId ? "Biến thể" : "Màu gốc");
            return (
              <button
                key={v.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedVariant(v);
                }}
                title={label}
                className={`size-4 rounded-full transition-transform ${
                  isSel ? "ring-2 ring-pink ring-offset-1 scale-125" : "hover:scale-110 opacity-70 hover:opacity-100"
                }`}
                style={{ background: swatchBg(tones) }}
              />
            );
          })}
        </div>
      )}

      <div className="flex flex-1 flex-col justify-between p-3">
        <div>
          <h4 className="truncate text-sm font-bold text-ink" title={current.name}>
            {current.name}
          </h4>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {current.gender && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                {current.gender}
              </span>
            )}
            {current.hairLength && (
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-mauve ring-1 ring-line">
                {current.hairLength}
              </span>
            )}
            {current.faceShape &&
              current.faceShape.split(",").slice(0, 2).map((s) => (
                <span
                  key={s.trim()}
                  className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-mauve ring-1 ring-line"
                >
                  {s.trim()}
                </span>
              ))}
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTryStyle(current);
          }}
          className="mt-3 w-full rounded-xl border border-primary/30 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white"
        >
          Thử kiểu này
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CatalogPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const { user } = useAuthStore();
  const setSelectedHairstyle = useScanStore((state) => state.setSelectedHairstyle);

  const q = searchParams.get("q") || "";
  const genderFilter = searchParams.get("gender") || "";
  const face = searchParams.get("face") || "";
  const lengthFilter = searchParams.get("length") || "";
  const tagFilter = searchParams.get("trend") || "";
  const colorFilter = searchParams.get("color") || "";
  const sortBy = searchParams.get("sort") || "popular";
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = PAGE_SIZES.includes(Number(searchParams.get("size")))
    ? Number(searchParams.get("size"))
    : 12;

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailModalData, setDetailModalData] = useState(null);
  const [gateStyle, setGateStyle] = useState(null);

  const hasFilters = !!(q || genderFilter || face || lengthFilter || tagFilter || colorFilter);

  // GA4: từ khoá tìm kiếm và bộ lọc đang dùng
  useEffect(() => {
    if (!q.trim()) return;
    const t = setTimeout(() => trackEvent("search", { search_term: q.trim().toLowerCase().slice(0, 60), source: "catalog" }), 800);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!(genderFilter || face || lengthFilter || tagFilter || colorFilter)) return;
    trackEvent("filter_catalog", {
      gender: genderFilter || "all",
      face_shape: face || "all",
      length: lengthFilter || "all",
      trend: tagFilter || "all",
      color: colorFilter || "all",
    });
  }, [genderFilter, face, lengthFilter, tagFilter, colorFilter]);

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
      ["q", "gender", "face", "length", "trend", "color"].forEach((k) => next.delete(k));
      next.set("page", "1");
      return next;
    });
  }, [setSearchParams]);

  // Danh sách tag động từ database
  const { data: availableTags = [] } = useAllCatalogTags();

  // Truy vấn danh sách kiểu tóc
  const { data: items = [], isLoading, isError } = useHairstyles({
    faceShape: face || null,
    search: q || null,
    gender: genderFilter || null,
    hairLength: lengthFilter || null,
    tag: tagFilter || null,
    color: colorFilter || null,
    sort: sortBy === "popular" ? "popular" : null,
  });

  const sorted = useMemo(() => {
    const copy = [...items];
    switch (sortBy) {
      case "newest": return copy.sort((a, b) => b.id - a.id);
      case "a-z":    return copy.sort((a, b) => a.name.localeCompare(b.name, "vi"));
      case "z-a":    return copy.sort((a, b) => b.name.localeCompare(a.name, "vi"));
      default:       return copy; // popular đã được BE sắp xếp đúng
    }
  }, [items, sortBy]);

  // Nhóm theo kiểu tóc gốc nếu không lọc theo màu
  const groupedItems = useMemo(() => {
    if (colorFilter) {
      return sorted.map((item) => ({ base: item, variants: [item] }));
    }
    const groups = new Map();
    for (const item of sorted) {
      const baseId = item.baseStyleId || item.id;
      if (!groups.has(baseId)) {
        groups.set(baseId, []);
      }
      groups.get(baseId).push(item);
    }
    const list = [];
    for (const variants of groups.values()) {
      variants.sort((a, b) => {
        if (!a.baseStyleId && b.baseStyleId) return -1;
        if (a.baseStyleId && !b.baseStyleId) return 1;
        return a.id - b.id;
      });
      const base = variants.find((v) => !v.baseStyleId) || variants[0];
      list.push({ base, variants });
    }
    return list;
  }, [sorted, colorFilter]);

  const totalPages = Math.max(1, Math.ceil(groupedItems.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = groupedItems.slice((safePage - 1) * pageSize, safePage * pageSize);
  const startItem = groupedItems.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, groupedItems.length);

  // Yêu thích
  const { data: savedStyles = [] } = useQuery({
    queryKey: ["profile-saved-styles"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) return [];
      const { data } = await api.get("/profile/saved-styles");
      return data;
    },
  });
  const savedIds = new Set(savedStyles.map((s) => s.id));

  const handleToggleSave = async (e, hairstyleId) => {
    e.stopPropagation();
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { state: { from: "/catalog" } });
      return;
    }
    const previousSaved = queryClient.getQueryData(["profile-saved-styles"]) || [];
    const isSaved = savedIds.has(hairstyleId);

    const styleToSave =
      items.find((h) => h.id === hairstyleId) || { id: hairstyleId };

    const nextSaved = isSaved
      ? previousSaved.filter((s) => s.id !== hairstyleId)
      : [...previousSaved, styleToSave];

    queryClient.setQueryData(["profile-saved-styles"], nextSaved);

    try {
      if (isSaved) {
        await api.delete("/profile/saved-styles", { params: { hairstyleId } });
        trackEvent("unsave_favorite", { hairstyle_id: hairstyleId, source: "catalog" });
      } else {
        await api.post("/profile/saved-styles", null, { params: { hairstyleId } });
        trackEvent("save_favorite", { hairstyle_id: hairstyleId, source: "catalog" });
      }
      queryClient.invalidateQueries({ queryKey: ["profile-saved-styles"] });
    } catch (err) {
      console.error("Lỗi khi thay đổi trạng thái yêu thích:", err);
      queryClient.setQueryData(["profile-saved-styles"], previousSaved);
    }
  };

  const handleOpenDetail = (base, variants, selected) => {
    trackEvent("view_hairstyle", { hairstyle_id: selected.id, hairstyle_name: selected.name });
    setDetailModalData({ base, variants, selected });
  };

  const executeTryStyle = (hairstyle) => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", {
        state: {
          from: `/swap?hairstyleId=${hairstyle.id}`,
          message: "Đăng nhập để thử kiểu tóc bằng AI",
        },
      });
      return;
    }
    const isPaidUser = user?.plan && user.plan !== "FREE";
    if (hairstyle.premiumOnly && !isPaidUser) {
      setGateStyle(hairstyle);
      return;
    }
    setSelectedHairstyle({
      id: hairstyle.id,
      name: hairstyle.name,
      imageUrl: hairstyle.imageUrl,
      ailabHairType: hairstyle.ailabHairType,
      ailabProStyle: hairstyle.ailabProStyle,
    });
    navigate(`/swap?hairstyleId=${hairstyle.id}`);
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="bg-transparent px-6 pb-6 pt-16 sm:px-16">
        <div className="mx-auto max-w-[1200px] text-center">
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
            Bộ Sưu Tập Kiểu Tóc
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-mauve">
            Khám phá hơn {items.length || 47} mẫu tóc phù hợp cho mọi dáng mặt và phong cách. Xem mẫu trực quan và thử diện mạo mới với AI.
          </p>
        </div>
      </section>

      {/* Main Container: Sidebar + Results Grid */}
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-6 py-6 sm:px-16 lg:grid-cols-[260px_1fr]">
        {/* Sidebar filter */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          {/* Nút toggle mobile (< lg) */}
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <button
              onClick={() => setFiltersOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:border-primary/50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {filtersOpen ? "Thu gọn bộ lọc" : "Bộ lọc & Tìm kiếm"}
            </button>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Xóa tất cả
              </button>
            )}
          </div>

          {/* Form lọc xếp dọc */}
          <div className={`space-y-4 rounded-3xl border border-line/60 bg-white/80 p-5 shadow-sm backdrop-blur-md ${filtersOpen ? "block" : "hidden lg:block"}`}>
            <div className="flex items-center justify-between border-b border-line/40 pb-3">
              <h3 className="font-display text-base font-bold text-ink">Bộ lọc kiểu tóc</h3>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs font-semibold text-primary transition hover:underline"
                >
                  Xóa lọc
                </button>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm kiểu tóc..."
                value={q}
                onChange={(e) => setParam("q", e.target.value)}
                className="h-10 w-full rounded-2xl border border-line bg-canvas pl-3.5 pr-8 text-sm text-ink placeholder-mauve transition hover:border-primary/50 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
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

            <div className="space-y-3 pt-1">
              <div>
                <label className="mb-1 block text-xs font-semibold text-mauve">Giới tính</label>
                <FilterSelect label="Tất cả giới tính" options={GENDER_OPTS} value={genderFilter} onChange={(v) => setParam("gender", v)} />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-mauve">Khuôn mặt</label>
                <FilterSelect label="Tất cả khuôn mặt" options={FACE_OPTS} value={face} onChange={(v) => setParam("face", v)} />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-mauve">Độ dài</label>
                <FilterSelect label="Tất cả độ dài" options={LENGTH_OPTS} value={lengthFilter} onChange={(v) => setParam("length", v)} />
              </div>

              {availableTags.length > 0 && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-mauve">Phong cách & Xu hướng</label>
                  <FilterSelect
                    label="Tất cả phong cách"
                    options={availableTags}
                    value={tagFilter}
                    onChange={(v) => setParam("trend", v)}
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-mauve">Màu tóc</label>
                <FilterSelect
                  label="Tất cả màu tóc"
                  options={[
                    { value: "original", label: "Màu gốc" },
                    ...HAIR_COLORS.map((c) => ({ value: c.value, label: c.label })),
                  ]}
                  value={colorFilter}
                  onChange={(v) => setParam("color", v)}
                />
              </div>

              <div className="border-t border-line/40 pt-3">
                <label className="mb-1 block text-xs font-semibold text-mauve">Sắp xếp theo</label>
                <FilterSelect
                  label="Mặc định (Phổ biến)"
                  options={SORT_OPTS}
                  value={sortBy}
                  onChange={(v) => setParam("sort", v, false)}
                />
              </div>
            </div>
          </div>
        </aside>

        {/* Results Area */}
        <div>
          {/* Header hiển thị số lượng */}
          {!isLoading && !isError && (
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-semibold text-mauve">
                Hiển thị <span className="text-ink font-bold">{startItem}–{endItem}</span> trên tổng số{" "}
                <span className="text-ink font-bold">{items.length}</span> mẫu tóc đang hoạt động
              </p>
            </div>
          )}

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
                  pageItems.map((group, idx) => (
                    <AnimatedContent key={group.base.id} delay={idx * 0.03}>
                      <HairstyleCatalogCard
                        group={group}
                        isSaved={savedIds.has(group.base.id)}
                        onToggleSave={handleToggleSave}
                        onOpenDetail={handleOpenDetail}
                        onTryStyle={executeTryStyle}
                      />
                    </AnimatedContent>
                  ))
                )}
              </div>

              {groupedItems.length > 0 && (
                <div className="mt-10 flex flex-col items-center gap-5">
                  <Pagination page={safePage} totalPages={totalPages} onPageChange={(p) => setParam("page", String(p))} />
                  <div className="flex items-center gap-2 text-xs text-mauve">
                    <span>Mỗi trang:</span>
                    {PAGE_SIZES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setParam("size", String(s))}
                        className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                          pageSize === s
                            ? "bg-primary text-white"
                            : "border border-line text-mauve hover:border-primary hover:text-primary"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Footer />

      {/* Modal chi tiết kiểu tóc */}
      <HairstyleDetailModal
        isOpen={!!detailModalData}
        onClose={() => setDetailModalData(null)}
        hairstyle={detailModalData?.base}
        variants={detailModalData?.variants || []}
        selectedVariant={detailModalData?.selected}
        onSelectVariant={(v) => setDetailModalData((prev) => (prev ? { ...prev, selected: v } : null))}
        isSaved={detailModalData ? savedIds.has(detailModalData.selected?.id || detailModalData.base?.id) : false}
        onToggleSave={handleToggleSave}
        onTryStyle={(h) => {
          setDetailModalData(null);
          executeTryStyle(h);
        }}
      />

      {/* Paywall Gate */}
      <PremiumGateModal
        isOpen={!!gateStyle}
        onClose={() => setGateStyle(null)}
        style={gateStyle}
      />
    </div>
  );
}
