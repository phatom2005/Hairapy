import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Khắc phục lỗi bundler Vite không tải được default marker icons của Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

import { Button, Card, Badge, Input } from "../components/ui";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { StarIcon } from "../components/icons";
import { AnimatedContent, SpotlightCard } from "../components/animated";
import api from "../lib/api";

const DISTRICT_OPTS = ["Quận 1", "Quận 3", "Quận 7", "Bình Thạnh", "Gò Vấp", "Phú Nhuận"];
const SERVICE_OPTS = ["Cắt tóc", "Nhuộm tóc", "Uốn/Duỗi tóc", "Phục hồi tóc", "Combo trọn gói"];
const PRICE_OPTS = [
  { label: "Dưới 150k", min: null, max: 150000 },
  { label: "150k - 250k", min: 150000, max: 250000 },
  { label: "250k - 400k", min: 250000, max: 400000 },
  { label: "Trên 400k", min: 400000, max: null },
];

// ─── Data hook ──────────────────────────────────────────────────────────────
function useSalons({ district, serviceType, priceRange, search }) {
  return useQuery({
    queryKey: ["salons", district, serviceType, priceRange, search],
    queryFn: async () => {
      const params = {};
      if (district) params.district = district;
      if (serviceType) params.serviceType = serviceType;
      if (priceRange) {
        const opt = PRICE_OPTS.find((p) => p.label === priceRange);
        if (opt?.min != null) params.minPrice = opt.min;
        if (opt?.max != null) params.maxPrice = opt.max;
      }
      if (search) params.search = search;
      const { data } = await api.get("/salons", { params });
      return data;
    },
    staleTime: 60_000,
  });
}

function formatPrice(v) {
  return `${v.toLocaleString("vi-VN")}đ`;
}

function SkeletonCard() {
  return (
    <Card padded={false} className="flex animate-pulse flex-col overflow-hidden sm:flex-row">
      <div className="h-44 w-full bg-line sm:w-44" />
      <div className="flex-1 space-y-2 p-5">
        <div className="h-4 w-2/3 rounded-full bg-line" />
        <div className="h-3 w-1/2 rounded-full bg-line" />
        <div className="mt-6 h-8 w-1/3 rounded-xl bg-line" />
      </div>
    </Card>
  );
}

export default function SalonsPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [district, setDistrict] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [priceRange, setPriceRange] = useState("");

  // Debounce tìm kiếm theo tên, giống pattern AdminUsersPage
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(handler);
  }, [q]);

  const { data: list = [], isLoading, isError } = useSalons({
    district: district || null,
    serviceType: serviceType || null,
    priceRange: priceRange || null,
    search: debouncedQ || null,
  });

  const hasFilters = !!(district || serviceType || priceRange || debouncedQ);
  const clearFilters = () => {
    setQ("");
    setDistrict("");
    setServiceType("");
    setPriceRange("");
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Thanh tìm kiếm + filter */}
      <section className="border-b border-divider/20 bg-white px-6 py-6 sm:px-16">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex-1">
            <Input placeholder="Tìm kiếm salon theo tên..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold text-mauve outline-none"
            >
              <option value="">Quận / Huyện</option>
              {DISTRICT_OPTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold text-mauve outline-none"
            >
              <option value="">Loại dịch vụ</option>
              {SERVICE_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              className="rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold text-mauve outline-none"
            >
              <option value="">Khoảng giá</option>
              {PRICE_OPTS.map((p) => <option key={p.label} value={p.label}>{p.label}</option>)}
            </select>
            {hasFilters && (
              <Button size="sm" variant="ghost" onClick={clearFilters}>Xoá lọc</Button>
            )}
          </div>
        </div>
      </section>

      {/* List + Map */}
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-6 py-10 sm:px-16 lg:grid-cols-[1.2fr_1fr]">
        {/* Danh sách salon */}
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h1 className="font-display text-2xl font-bold text-ink">
              {isLoading ? "Đang tải..." : `${list.length} Salon`}
            </h1>
          </div>

          {isError && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-lg font-semibold text-ink">Không thể tải danh sách salon.</p>
              <p className="mt-1 text-sm text-mauve">Vui lòng kiểm tra kết nối hoặc thử lại sau.</p>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col gap-5">
              {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {!isLoading && !isError && (
            <div className="flex flex-col gap-5">
              {list.map((sl, idx) => (
                <AnimatedContent key={sl.id} delay={idx * 0.08}>
                  <SpotlightCard className="rounded-2xl">
                    <Card padded={false} className="flex flex-col overflow-hidden sm:flex-row">
                      <img src={sl.imageUrl} alt={sl.name} className="h-44 w-full object-cover sm:w-44" />
                      <div className="flex flex-1 flex-col gap-2 p-5">
                        {sl.verified && <Badge variant="premium" className="w-fit">HAIRAPY KIỂM ĐỊNH</Badge>}
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-ink">{sl.name}</h3>
                          <span className="flex items-center gap-1 text-sm font-bold text-ink">
                            <StarIcon size={16} className="text-lime" /> {sl.rating}
                          </span>
                        </div>
                        <p className="text-sm text-mauve">{sl.address}</p>
                        <div className="mt-auto flex items-center justify-between pt-2">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Giá từ</p>
                            <p className="font-bold text-magenta">{formatPrice(sl.priceFrom)}</p>
                          </div>
                          <Button size="sm" disabled title="Tính năng đặt lịch sẽ sớm ra mắt" className="opacity-50 cursor-not-allowed">
                            Đặt lịch ngay
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </SpotlightCard>
                </AnimatedContent>
              ))}
              {list.length === 0 && <p className="py-10 text-center text-mauve">Không tìm thấy salon.</p>}
            </div>
          )}
        </div>

        {/* Bản đồ Leaflet thật */}
        <div className="sticky top-24 hidden h-[600px] w-full overflow-hidden rounded-3xl border border-line shadow-lg lg:block">
          <MapContainer
            center={[10.7769, 106.7009]}
            zoom={12}
            scrollWheelZoom={false}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {list
              .filter((sl) => sl.latitude != null && sl.longitude != null)
              .map((sl) => (
                <Marker key={sl.id} position={[sl.latitude, sl.longitude]}>
                  <Popup>
                    <div className="p-1">
                      <p className="text-sm font-bold text-ink">{sl.name}</p>
                      <p className="mt-1 text-xs text-mauve">{sl.address}</p>
                      <p className="mt-1 text-xs font-semibold text-primary">{formatPrice(sl.priceFrom)}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
          </MapContainer>
        </div>
      </div>

      <Footer />
    </div>
  );
}
