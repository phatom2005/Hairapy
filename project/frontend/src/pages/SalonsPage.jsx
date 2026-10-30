import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { Location, LocationDiscover, MagicStar, Call, Calendar, Star1 } from "iconsax-reactjs";

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
import { AnimatedContent, SpotlightCard } from "../components/animated";
import api from "../lib/api";
import { trackEvent } from "../lib/analytics";
import BookingForm from "../components/BookingForm";

const DISTRICT_OPTS = ["Quận 1", "Quận 3", "Quận 7", "Bình Thạnh", "Gò Vấp", "Phú Nhuận"];
const SERVICE_OPTS = ["Cắt tóc", "Nhuộm tóc", "Uốn/Duỗi tóc", "Phục hồi tóc", "Combo trọn gói"];
const PRICE_OPTS = [
  { label: "Dưới 150k", min: null, max: 150000 },
  { label: "150k - 250k", min: 150000, max: 250000 },
  { label: "250k - 400k", min: 250000, max: 400000 },
  { label: "Trên 400k", min: 400000, max: null },
];

function useSalons({ district, serviceType, priceRange, search, partnerOnly, hairstyleId, coords }) {
  return useQuery({
    queryKey: ["salons", district, serviceType, priceRange, search, partnerOnly, hairstyleId, coords],
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
      if (partnerOnly) params.partnerOnly = true;
      if (hairstyleId) params.hairstyleId = hairstyleId;
      if (coords?.lat && coords?.lng) {
        params.lat = coords.lat;
        params.lng = coords.lng;
      }

      const { data } = await api.get("/salons", { params });
      return data;
    },
    staleTime: 60_000,
  });
}

function formatPrice(v) {
  if (v == null) return "Liên hệ";
  return `${Number(v).toLocaleString("vi-VN")}đ`;
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
  const [partnerOnly, setPartnerOnly] = useState(false);
  const [selectedHairstyleId, setSelectedHairstyleId] = useState("");
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState(null);

  const [bookingSalon, setBookingSalon] = useState(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [mobileView, setMobileView] = useState("list"); // "list" | "map"

  // Debounce tìm kiếm theo tên
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(handler);
  }, [q]);

  // Load danh sách kiểu tóc cho dropdown filter
  const { data: hairstyles = [] } = useQuery({
    queryKey: ["hairstyles-dropdown"],
    queryFn: async () => (await api.get("/hairstyles")).data,
    staleTime: 300_000,
  });

  const mapRef = useRef(null);
  const mapWrapperRef = useRef(null);

  useEffect(() => {
    if (mobileView === "map") {
      const timer = setTimeout(() => mapRef.current?.invalidateSize(), 150);
      return () => clearTimeout(timer);
    }
  }, [mobileView]);

  useEffect(() => {
    const wrapper = mapWrapperRef.current;
    if (!wrapper) return;

    const fixMapSize = () => mapRef.current?.invalidateSize();
    const raf = requestAnimationFrame(fixMapSize);
    const observer = new ResizeObserver(fixMapSize);
    observer.observe(wrapper);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  const { data: list = [], isLoading, isError } = useSalons({
    district: district || null,
    serviceType: serviceType || null,
    priceRange: priceRange || null,
    search: debouncedQ || null,
    partnerOnly,
    hairstyleId: selectedHairstyleId || null,
    coords,
  });

  const hasFilters = !!(district || serviceType || priceRange || debouncedQ || partnerOnly || selectedHairstyleId || coords);

  useEffect(() => {
    if (!hasFilters) return;
    trackEvent("filter_salons", {
      district: district || "all",
      service_type: serviceType || "all",
      price_range: priceRange || "all",
      search_term: debouncedQ ? debouncedQ.toLowerCase().slice(0, 60) : "",
      partner_only: partnerOnly,
      hairstyle_id: selectedHairstyleId || "all",
    });
  }, [district, serviceType, priceRange, debouncedQ, partnerOnly, selectedHairstyleId, hasFilters]);

  const clearFilters = () => {
    setQ("");
    setDistrict("");
    setServiceType("");
    setPriceRange("");
    setPartnerOnly(false);
    setSelectedHairstyleId("");
    setCoords(null);
    setLocError(null);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocError("Trình duyệt không hỗ trợ định vị vị trí.");
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocError("Không thể lấy vị trí (" + (err.message || "Bị từ chối") + ")");
      },
      { timeout: 10000 }
    );
  };

  const handleOpenBooking = (sl, e) => {
    if (e) e.stopPropagation();
    setBookingSalon(sl);
    setIsBookingOpen(true);
  };

  const selectedHairstyleObj = hairstyles.find((h) => String(h.id) === String(selectedHairstyleId));

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Thanh tìm kiếm + filter */}
      <section className="border-b border-divider/20 bg-white px-6 py-6 sm:px-16">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex-1">
              <Input placeholder="Tìm kiếm salon theo tên..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
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
              <select
                value={selectedHairstyleId}
                onChange={(e) => setSelectedHairstyleId(e.target.value)}
                className="rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold text-mauve outline-none max-w-[200px] truncate"
              >
                <option value="">Kiểu tóc cần làm</option>
                {hairstyles.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.gender || "Unisex"})
                  </option>
                ))}
              </select>
              {hasFilters && (
                <Button size="sm" variant="ghost" onClick={clearFilters}>Xoá lọc</Button>
              )}
            </div>
          </div>

          {/* Hàng bộ lọc nâng cao: Đối tác + Vị trí */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-divider/10 text-xs">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={partnerOnly}
                  onChange={(e) => setPartnerOnly(e.target.checked)}
                  className="rounded border-line text-pink focus:ring-pink"
                />
                <span className="flex items-center gap-1 text-pink">
                  <MagicStar size={14} variant="Bold" /> Chỉ salon nhận đặt lịch online (Đối tác)
                </span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={locating}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors cursor-pointer ${
                  coords
                    ? "bg-pink/10 border-pink/30 text-pink"
                    : "bg-white border-line text-mauve hover:text-ink"
                }`}
              >
                <LocationDiscover size={14} className={`text-pink ${locating ? "animate-spin" : ""}`} />
                <span>{coords ? "Đã định vị gần bạn" : "Gần tôi nhất"}</span>
              </button>
              {coords && (
                <button
                  type="button"
                  onClick={() => setCoords(null)}
                  className="text-muted hover:text-ink text-xs underline"
                >
                  Bỏ vị trí
                </button>
              )}
            </div>
          </div>

          {locError && (
            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
              {locError}
            </p>
          )}
        </div>
      </section>

      {/* List + Map */}
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-4 sm:px-10 py-6 sm:py-10 lg:px-16 lg:grid-cols-[1.2fr_1fr]">
        {/* Danh sách salon (ẩn trên mobile khi đang xem bản đồ) */}
        <div className={mobileView === "list" ? "block" : "hidden lg:block"}>
          <div className="mb-6 flex items-center justify-between">
            <h1 className="font-display text-2xl font-bold text-ink">
              {isLoading ? "Đang tải..." : `${list.length} Salon`}
            </h1>
            <Link to="/for-salons" className="text-xs font-bold text-pink hover:underline flex items-center gap-1">
              Bạn là chủ salon? Trở thành đối tác Hairapy →
            </Link>
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
                      <Link to={`/salons/${sl.id}`} className="shrink-0 relative group">
                        <img
                          src={sl.imageUrl || "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300"}
                          alt={sl.name}
                          className="h-44 w-full object-cover sm:w-48 group-hover:scale-105 transition-transform duration-300"
                        />
                      </Link>
                      <div className="flex flex-1 flex-col gap-2 p-5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {sl.partner && (
                            <Badge variant="new" className="bg-pink text-white border-pink text-[10px] font-bold">
                              SALON ĐỐI TÁC
                            </Badge>
                          )}
                          {sl.verified && (
                            <Badge variant="premium" className="text-[10px]">
                              HAIRAPY KIỂM ĐỊNH
                            </Badge>
                          )}
                          {sl.distanceKm != null && (
                            <span className="text-[11px] font-semibold text-muted bg-canvas px-2 py-0.5 rounded-full border border-line">
                              ~{sl.distanceKm} km
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <Link to={`/salons/${sl.id}`} className="hover:text-primary transition-colors">
                            <h3 className="text-lg font-bold text-ink">{sl.name}</h3>
                          </Link>
                          {sl.rating > 0 && (
                            <span className="flex items-center gap-1 text-sm font-bold text-ink">
                              <Star1 size={16} variant="Bold" className="text-lime" /> {sl.rating}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-mauve flex items-center gap-1">
                          <Location size={14} className="shrink-0 text-muted" /> {sl.address}
                        </p>

                        {sl.description && (
                          <p className="text-xs text-muted line-clamp-2 mt-0.5">{sl.description}</p>
                        )}

                        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-divider/10">
                          <div>
                            {sl.stylePrice != null ? (
                              <>
                                <p className="text-[10px] font-bold uppercase tracking-wide text-pink">
                                  Giá kiểu đã chọn
                                </p>
                                <p className="font-bold text-magenta text-base">{formatPrice(sl.stylePrice)}</p>
                              </>
                            ) : (
                              <>
                                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Giá từ</p>
                                <p className="font-bold text-magenta">{formatPrice(sl.priceFrom)}</p>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Link
                              to={`/salons/${sl.id}`}
                              className="px-3 py-1.5 rounded-xl border border-line bg-canvas text-xs font-semibold text-ink hover:border-pink transition-colors"
                            >
                              Chi tiết
                            </Link>

                            {sl.partner ? (
                              <button
                                type="button"
                                onClick={(e) => handleOpenBooking(sl, e)}
                                className="px-4 py-1.5 rounded-xl bg-pink hover:bg-pink-hover text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1 cursor-pointer"
                              >
                                <Calendar size={14} />
                                <span>Đặt lịch</span>
                              </button>
                            ) : (
                              sl.phone && (
                                <a
                                  href={`tel:${sl.phone}`}
                                  className="px-3.5 py-1.5 rounded-xl bg-canvas border border-line hover:border-primary text-xs font-semibold text-ink flex items-center gap-1 transition-colors"
                                >
                                  <Call size={12} /> Gọi điện
                                </a>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </SpotlightCard>
                </AnimatedContent>
              ))}
              {list.length === 0 && <p className="py-10 text-center text-mauve">Không tìm thấy salon phù hợp với bộ lọc.</p>}
            </div>
          )}
        </div>

        {/* Bản đồ Leaflet (hiển thị khi mobileView === 'map' hoặc desktop) */}
        <div
          ref={mapWrapperRef}
          className={`sticky top-24 h-[500px] sm:h-[600px] w-full overflow-hidden rounded-3xl border border-line shadow-lg ${
            mobileView === "map" ? "block" : "hidden lg:block"
          }`}
        >
          <MapContainer
            ref={mapRef}
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
                <Marker
                  key={sl.id}
                  position={[sl.latitude, sl.longitude]}
                  eventHandlers={{ click: () => trackEvent("view_salon", { salon_id: sl.id, salon_name: sl.name }) }}
                >
                  <Popup>
                    <div className="p-1 space-y-1">
                      <p className="text-sm font-bold text-ink">{sl.name}</p>
                      {sl.partner && (
                        <span className="text-[10px] font-bold text-pink bg-pink/10 px-1.5 py-0.5 rounded">
                          Đối tác Hairapy
                        </span>
                      )}
                      <p className="text-xs text-mauve">{sl.address}</p>
                      <p className="text-xs font-semibold text-primary">{formatPrice(sl.stylePrice || sl.priceFrom)}</p>
                      <Link to={`/salons/${sl.id}`} className="text-[11px] font-bold text-pink hover:underline block pt-1">
                        Xem chi tiết salon →
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              ))}
          </MapContainer>
        </div>
      </div>

      {/* Floating View Switcher trên Mobile */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 rounded-full border border-line bg-white/95 p-1 shadow-2xl backdrop-blur-md lg:hidden">
        <button
          type="button"
          onClick={() => setMobileView("list")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition cursor-pointer ${
            mobileView === "list"
              ? "bg-primary text-white shadow-xs"
              : "text-mauve hover:text-ink"
          }`}
        >
          <span>📋 Danh sách ({list.length})</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMobileView("map");
            setTimeout(() => mapRef.current?.invalidateSize(), 150);
          }}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition cursor-pointer ${
            mobileView === "map"
              ? "bg-primary text-white shadow-xs"
              : "text-mauve hover:text-ink"
          }`}
        >
          <span>🗺️ Bản đồ</span>
        </button>
      </div>

      {/* Booking Form Modal */}
      {isBookingOpen && (
        <BookingForm
          isOpen={isBookingOpen}
          onClose={() => setIsBookingOpen(false)}
          salon={bookingSalon}
          hairstyle={selectedHairstyleObj}
          tryOnImageUrl={null}
        />
      )}

      <Footer />
    </div>
  );
}
