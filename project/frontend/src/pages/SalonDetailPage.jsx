import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Phone, Calendar, Star, Sparkles, ArrowLeft, ExternalLink, Scissors, CheckCircle } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { Card, Badge, Button } from "../components/ui";
import api from "../lib/api";
import { trackEvent } from "../lib/analytics";
import BookingForm from "../components/BookingForm";

function formatPrice(v) {
  if (v == null) return "Liên hệ";
  return `${Number(v).toLocaleString("vi-VN")}đ`;
}

export default function SalonDetailPage() {
  const { id } = useParams();
  const [selectedHairstyle, setSelectedHairstyle] = useState(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const { data: salon, isLoading, isError } = useQuery({
    queryKey: ["salon-detail", id],
    queryFn: async () => {
      const { data } = await api.get(`/salons/${id}`);
      return data;
    },
    enabled: !!id,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (salon) {
      trackEvent("view_salon", { salon_id: salon.id, salon_name: salon.name });
    }
  }, [salon]);

  const handleOpenBooking = (style = null) => {
    setSelectedHairstyle(style);
    setIsBookingOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas">
        <Navbar />
        <div className="mx-auto max-w-[1200px] px-6 py-16 text-center text-mauve">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Đang tải thông tin salon...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (isError || !salon) {
    return (
      <div className="min-h-screen bg-canvas">
        <Navbar />
        <div className="mx-auto max-w-[1200px] px-6 py-20 text-center">
          <h2 className="text-xl font-bold text-ink">Không tìm thấy thông tin salon</h2>
          <p className="text-sm text-mauve mt-2">Salon này có thể đã ngừng hoạt động hoặc đường dẫn không đúng.</p>
          <Link to="/salons" className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-pink hover:underline">
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách salon
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const mapCenter = [salon.latitude || 10.7769, salon.longitude || 106.7009];
  const gmapsUrl = salon.latitude && salon.longitude
    ? `https://www.google.com/maps?q=${salon.latitude},${salon.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(salon.name + " " + salon.address)}`;

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />

      <main className="mx-auto max-w-[1200px] px-6 py-8 sm:px-16">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            to="/salons"
            className="inline-flex items-center gap-2 text-xs font-semibold text-mauve hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Danh sách salon
          </Link>
        </div>

        {/* Hero Card */}
        <Card padded={false} className="overflow-hidden border border-line bg-white shadow-sm rounded-3xl">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] lg:grid-cols-[450px_1fr]">
            {/* Ảnh đại diện */}
            <div className="relative aspect-[4/3] md:aspect-auto h-full min-h-[260px] bg-zinc-900 overflow-hidden">
              <img
                src={salon.imageUrl || "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800"}
                alt={salon.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
                {salon.partner && (
                  <Badge variant="new" className="bg-pink text-white border-pink text-xs font-bold shadow-md">
                    <Sparkles className="w-3.5 h-3.5 mr-1" /> SALON ĐỐI TÁC
                  </Badge>
                )}
                {salon.verified && (
                  <Badge variant="premium" className="text-xs shadow-md">
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> HAIRAPY KIỂM ĐỊNH
                  </Badge>
                )}
              </div>
            </div>

            {/* Thông tin chính */}
            <div className="p-6 sm:p-8 flex flex-col justify-between gap-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ink">
                    {salon.name}
                  </h1>
                  {salon.rating > 0 && (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-lime/10 border border-lime/30 text-ink text-sm font-bold">
                      <Star className="w-4 h-4 text-lime fill-lime" /> {salon.rating}
                    </span>
                  )}
                </div>

                <p className="text-sm text-mauve flex items-start gap-2">
                  <MapPin className="w-4 h-4 shrink-0 text-pink mt-0.5" />
                  <span>{salon.address}</span>
                </p>

                {salon.phone && (
                  <p className="text-sm text-mauve flex items-center gap-2">
                    <Phone className="w-4 h-4 shrink-0 text-pink" />
                    <a href={`tel:${salon.phone}`} className="hover:text-ink font-semibold">
                      {salon.phone}
                    </a>
                  </p>
                )}

                {salon.description && (
                  <p className="text-sm text-muted leading-relaxed pt-2 border-t border-divider/10">
                    {salon.description}
                  </p>
                )}

                {salon.serviceTypes && salon.serviceTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {salon.serviceTypes.map((st, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-canvas text-mauve border border-line">
                        {st}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-divider/10">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Mức giá tham khảo</p>
                  <p className="text-2xl font-black text-magenta">{formatPrice(salon.priceFrom)}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={gmapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-line bg-white hover:border-primary text-xs font-semibold text-ink transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" /> Mở Google Maps
                  </a>

                  {salon.partner ? (
                    <Button
                      onClick={() => handleOpenBooking(null)}
                      variant="pink"
                      className="px-6 py-2.5 text-sm font-bold shadow-md flex items-center gap-2"
                    >
                      <Calendar className="w-4 h-4" /> Đặt lịch hẹn
                    </Button>
                  ) : (
                    salon.phone && (
                      <a
                        href={`tel:${salon.phone}`}
                        className="px-6 py-2.5 rounded-xl bg-ink text-white hover:bg-ink/90 text-sm font-bold transition-colors inline-flex items-center gap-2"
                      >
                        <Phone className="w-4 h-4" /> Gọi đặt chỗ
                      </a>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 2 Cột: Kiểu tóc salon nhận làm + Bản đồ vị trí */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8">
          {/* Kiểu tóc salon nhận làm */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2">
                <Scissors className="w-5 h-5 text-pink" /> Kiểu tóc nhận làm tại salon
              </h2>
              <span className="text-xs text-muted">
                {salon.hairstyles?.length || 0} kiểu tóc đã đăng ký
              </span>
            </div>

            {(!salon.hairstyles || salon.hairstyles.length === 0) ? (
              <Card className="p-8 text-center text-muted">
                <p className="text-sm">Salon này nhận làm các kiểu tóc đa dạng theo yêu cầu trực tiếp của khách.</p>
                <p className="text-xs mt-1 text-mauve">Bạn có thể mang ảnh thử tóc của Hairapy tới để salon tư vấn cụ thể.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {salon.hairstyles.map((sh) => (
                  <Card key={sh.id} padded={false} className="overflow-hidden border border-line bg-white flex flex-col justify-between">
                    <div className="flex gap-3 p-3">
                      <img
                        src={sh.imageUrl || "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200"}
                        alt={sh.name}
                        className="w-20 h-20 rounded-xl object-cover bg-zinc-900 shrink-0"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <h4 className="font-bold text-ink text-sm truncate">{sh.name}</h4>
                        <p className="text-xs text-muted">Phù hợp: {sh.gender || "Unisex"}</p>
                        <p className="text-xs font-bold text-magenta">
                          {formatPrice(sh.customPrice || sh.price || salon.priceFrom)}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-canvas/60 border-t border-line/60 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-muted truncate">Được Hairapy gợi ý</span>
                      {salon.partner ? (
                        <button
                          type="button"
                          onClick={() => handleOpenBooking(sh)}
                          className="px-3 py-1.5 rounded-lg bg-pink hover:bg-pink-hover text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          Đặt lịch kiểu này
                        </button>
                      ) : (
                        salon.phone && (
                          <a
                            href={`tel:${salon.phone}`}
                            className="px-3 py-1.5 rounded-lg border border-line bg-white text-xs font-semibold text-ink hover:border-pink transition-colors"
                          >
                            Tư vấn kiểu này
                          </a>
                        )
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Bản đồ vị trí */}
          <div>
            <h2 className="font-display text-xl font-bold text-ink mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-pink" /> Vị trí trên bản đồ
            </h2>
            <div className="h-[360px] w-full rounded-3xl overflow-hidden border border-line shadow-sm">
              <MapContainer
                center={mapCenter}
                zoom={14}
                scrollWheelZoom={false}
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {salon.latitude && salon.longitude && (
                  <Marker position={[salon.latitude, salon.longitude]}>
                    <Popup>
                      <div className="p-1">
                        <p className="font-bold text-ink text-sm">{salon.name}</p>
                        <p className="text-xs text-mauve mt-0.5">{salon.address}</p>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          </div>
        </div>
      </main>

      {/* Booking Form Modal */}
      {isBookingOpen && (
        <BookingForm
          isOpen={isBookingOpen}
          onClose={() => setIsBookingOpen(false)}
          salon={salon}
          hairstyle={selectedHairstyle}
          tryOnImageUrl={null}
        />
      )}

      <Footer />
    </div>
  );
}
