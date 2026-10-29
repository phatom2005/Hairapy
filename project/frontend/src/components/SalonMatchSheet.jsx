import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CloseCircle, Location, Star1, LocationDiscover, MagicStar, Call, Danger } from "iconsax-reactjs";
import api from "../lib/api";
import BookingForm from "./BookingForm";

function SalonMatchModalContent({
  onClose,
  hairstyle = null,
  tryOnImageUrl = null,
}) {
  const [userCoords, setUserCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState(null);

  const [bookingSalon, setBookingSalon] = useState(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const { data: queryData = { salons: [], hasExactMatch: true }, isLoading } = useQuery({
    queryKey: ["salon-match", hairstyle?.id, userCoords],
    queryFn: async () => {
      const params = { partnerOnly: true };
      if (hairstyle?.id) {
        params.hairstyleId = hairstyle.id;
      }
      if (userCoords?.lat && userCoords?.lng) {
        params.lat = userCoords.lat;
        params.lng = userCoords.lng;
      }

      let res = await api.get("/salons", { params });
      let data = res.data || [];
      let exact = true;

      if (data.length === 0 && hairstyle?.id) {
        exact = false;
        const fallbackParams = { partnerOnly: true };
        if (userCoords?.lat && userCoords?.lng) {
          fallbackParams.lat = userCoords.lat;
          fallbackParams.lng = userCoords.lng;
        }
        res = await api.get("/salons", { params: fallbackParams });
        data = res.data || [];
      }

      return { salons: data, hasExactMatch: exact };
    },
    staleTime: 60_000,
  });

  const salons = queryData.salons;
  const hasExactMatch = queryData.hasExactMatch;

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocError("Trình duyệt không hỗ trợ định vị vị trí.");
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocError("Không thể lấy vị trí của bạn (" + (err.message || "Bị từ chối") + ")");
      },
      { timeout: 10000 }
    );
  };

  const handleOpenBooking = (salon) => {
    setBookingSalon(salon);
    setIsBookingOpen(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full sm:max-w-2xl bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-900/90 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {tryOnImageUrl ? (
                <img
                  src={tryOnImageUrl}
                  alt="Ảnh thử tóc"
                  className="w-12 h-12 rounded-xl object-cover border border-pink-500/40 shrink-0"
                />
              ) : (
                hairstyle?.imageUrl && (
                  <img
                    src={hairstyle.imageUrl}
                    alt={hairstyle.name}
                    className="w-12 h-12 rounded-xl object-cover shrink-0"
                  />
                )
              )}
              <div className="min-w-0">
                <span className="text-xs font-semibold text-pink-400 flex items-center gap-1">
                  <MagicStar size={14} variant="Bold" /> Cắt kiểu này ở đâu?
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white truncate">
                  {hairstyle ? hairstyle.name : "Salon đối tác gợi ý"}
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <CloseCircle size={20} />
            </button>
          </div>

          {/* Subheader / Location filter */}
          <div className="px-4 py-2.5 bg-zinc-800/40 border-b border-zinc-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-zinc-400">
              <Location size={14} className="text-pink-500" />
              <span>{userCoords ? "Đang sắp xếp theo vị trí của bạn" : "Salon đối tác sẵn sàng tư vấn"}</span>
            </div>
            <button
              onClick={handleGetLocation}
              disabled={locating}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
            >
              <LocationDiscover size={14} className={`text-pink-400 ${locating ? "animate-spin" : ""}`} />
              <span>{userCoords ? "Cập nhật vị trí" : "Gần tôi nhất"}</span>
            </button>
          </div>

          {locError && (
            <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-300 flex items-center gap-1.5">
              <Danger size={14} className="shrink-0" /> {locError}
            </div>
          )}

          {!hasExactMatch && (
            <div className="px-4 py-2.5 bg-pink-500/10 border-b border-pink-500/20 text-xs text-pink-300 flex items-center gap-2">
              <MagicStar size={16} variant="Bold" className="shrink-0" />
              <span>Chưa có salon đăng ký kiểu này — các salon đối tác dưới đây có thể tư vấn và làm tương tự cho bạn:</span>
            </div>
          )}

          {/* Salon list */}
          <div className="p-4 overflow-y-auto space-y-3 flex-1">
            {isLoading ? (
              <div className="py-12 text-center text-zinc-400 space-y-2">
                <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs">Đang tìm salon đối tác...</p>
              </div>
            ) : salons.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 space-y-1">
                <p className="text-sm">Hiện chưa có salon đối tác nào phù hợp.</p>
                <p className="text-xs text-zinc-500">Vui lòng quay lại sau hoặc liên hệ hỗ trợ.</p>
              </div>
            ) : (
              salons.map((salon) => (
                <div
                  key={salon.id}
                  className="p-3.5 bg-zinc-800/60 hover:bg-zinc-800/90 border border-zinc-700/60 hover:border-pink-500/40 rounded-2xl transition-all flex flex-col sm:flex-row gap-3 sm:items-center justify-between"
                >
                  <div className="flex gap-3 items-center min-w-0">
                    <img
                      src={salon.imageUrl || "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200"}
                      alt={salon.name}
                      className="w-16 h-16 rounded-xl object-cover bg-zinc-900 shrink-0"
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-white text-sm truncate">{salon.name}</h4>
                        {salon.partner && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-pink-500/20 text-pink-400 border border-pink-500/30 rounded">
                            Đối tác
                          </span>
                        )}
                        {salon.rating > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                            <Star1 size={12} variant="Bold" className="text-amber-400" /> {salon.rating}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-400 truncate flex items-center gap-1">
                        <Location size={12} className="shrink-0 text-zinc-500" /> {salon.address}
                      </p>

                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-pink-400 font-medium">
                          {salon.stylePrice
                            ? `Giá kiểu này: ${salon.stylePrice.toLocaleString("vi-VN")}đ`
                            : salon.priceFrom
                            ? `Từ ${salon.priceFrom.toLocaleString("vi-VN")}đ`
                            : "Giá thỏa thuận"}
                        </span>
                        {salon.distanceKm != null && (
                          <span className="text-zinc-400 flex items-center gap-0.5">
                            • {salon.distanceKm} km
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col gap-2 shrink-0 pt-2 sm:pt-0">
                    <button
                      onClick={() => handleOpenBooking(salon)}
                      className="flex-1 sm:flex-none py-2 px-3.5 bg-pink-600 hover:bg-pink-500 text-white font-medium rounded-xl text-xs transition-colors shadow-lg shadow-pink-600/20 whitespace-nowrap cursor-pointer"
                    >
                      Gửi yêu cầu đặt lịch
                    </button>
                    {salon.phone && (
                      <a
                        href={`tel:${salon.phone}`}
                        className="py-2 px-3 bg-zinc-700/60 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs flex items-center justify-center gap-1 transition-colors"
                      >
                        <Call size={12} /> Gọi điện
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Booking Form Modal */}
      {isBookingOpen && (
        <BookingForm
          isOpen={isBookingOpen}
          onClose={() => setIsBookingOpen(false)}
          salon={bookingSalon}
          hairstyle={hairstyle}
          tryOnImageUrl={tryOnImageUrl}
          onSuccess={() => {
            // Đóng modal sau khi đặt
          }}
        />
      )}
    </>
  );
}

export default function SalonMatchSheet(props) {
  if (!props.isOpen) return null;
  return <SalonMatchModalContent {...props} />;
}
