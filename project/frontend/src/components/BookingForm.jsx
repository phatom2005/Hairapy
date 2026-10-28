import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { X, Calendar, Clock, MapPin, Phone, CheckCircle, AlertCircle, Sparkles } from "lucide-react";
import api from "../lib/api";
import useAuthStore from "../store/useAuthStore";
import { useScanStore } from "../store/useScanStore";
import { trackEvent } from "../lib/analytics";

function BookingModalContent({
  onClose,
  salon,
  hairstyle = null,
  tryOnImageUrl = null,
  onSuccess = null,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { analysisResult } = useScanStore();

  const [preferredTime, setPreferredTime] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2);
    d.setMinutes(0);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [customerName, setCustomerName] = useState(() => user?.fullName || "");
  const [customerPhone, setCustomerPhone] = useState(() => user?.phone || "");
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [attachTryOn, setAttachTryOn] = useState(() => Boolean(tryOnImageUrl));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Min and max for datetime-local
  const now = new Date();
  const minDate = new Date(now.getTime() + 60 * 60 * 1000); // now + 1h
  const maxDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // now + 30d
  const pad = (n) => String(n).padStart(2, "0");
  const minStr = `${minDate.getFullYear()}-${pad(minDate.getMonth() + 1)}-${pad(minDate.getDate())}T${pad(minDate.getHours())}:${pad(minDate.getMinutes())}`;
  const maxStr = `${maxDate.getFullYear()}-${pad(maxDate.getMonth() + 1)}-${pad(maxDate.getDate())}T${pad(maxDate.getHours())}:${pad(maxDate.getMinutes())}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      onClose();
      navigate("/login", {
        state: { from: location.pathname + location.search, message: "Đăng nhập để gửi yêu cầu đặt lịch." },
      });
      return;
    }

    if (!consent) {
      setError("Bạn cần đồng ý chia sẻ thông tin với salon để được phục vụ.");
      return;
    }

    if (!customerPhone.trim().match(/^(0|\+84)\d{9,10}$/)) {
      setError("Số điện thoại không hợp lệ (10-11 số).");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        salonId: salon.id,
        hairstyleId: hairstyle?.id || null,
        tryOnImageUrl: attachTryOn ? tryOnImageUrl : null,
        faceShape: analysisResult?.faceShape || null,
        preferredTime: preferredTime,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        note: note.trim() || null,
        consent: true,
      };

      await api.post("/bookings", payload);
      setSuccess(true);
      trackEvent("booking_submit", { salon_id: salon.id, hairstyle_id: hairstyle?.id });
      if (onSuccess) onSuccess();
    } catch (err) {
      const msg = err.response?.data?.error || "Không thể gửi yêu cầu đặt lịch. Vui lòng thử lại.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/80">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-pink-500" />
            <h3 className="text-lg font-semibold text-white">
              {success ? "Gửi yêu cầu thành công" : "Đặt lịch tại Salon"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {success ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-bold text-white">Đã gửi yêu cầu đặt lịch!</h4>
                <p className="text-sm text-zinc-300">
                  Salon <strong>{salon.name}</strong> sẽ liên hệ với bạn qua số điện thoại <strong>{customerPhone}</strong> để xác nhận lịch hẹn.
                </p>
              </div>
              <div className="p-3 bg-zinc-800/60 rounded-xl text-xs text-zinc-400 text-left space-y-1">
                <p>• Địa chỉ: {salon.address}</p>
                <p>• Thời gian mong muốn: {preferredTime ? new Date(preferredTime).toLocaleString("vi-VN") : ""}</p>
                {hairstyle && <p>• Kiểu tóc: {hairstyle.name}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <Link
                  to="/profile?tab=bookings"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 bg-pink-600 hover:bg-pink-500 text-white font-medium rounded-xl text-center text-sm transition-colors"
                >
                  Xem lịch hẹn của tôi
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Salon info card */}
              <div className="p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50 flex gap-3 items-center">
                <img
                  src={salon.imageUrl || "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200"}
                  alt={salon.name}
                  className="w-14 h-14 rounded-lg object-cover bg-zinc-800 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-white text-sm truncate">{salon.name}</h4>
                    {salon.partner && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-pink-500/20 text-pink-400 border border-pink-500/30 rounded">
                        Đối tác
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 truncate flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 shrink-0" /> {salon.address}
                  </p>
                  <p className="text-xs text-zinc-400 truncate flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 shrink-0" /> {salon.phone}
                  </p>
                </div>
              </div>

              {/* Hairstyle & Try-on image attached */}
              {(hairstyle || tryOnImageUrl) && (
                <div className="p-3 bg-pink-500/10 border border-pink-500/20 rounded-xl flex gap-3 items-center justify-between">
                  <div className="flex gap-3 items-center min-w-0">
                    {tryOnImageUrl && attachTryOn ? (
                      <img
                        src={tryOnImageUrl}
                        alt="Ảnh thử tóc"
                        className="w-12 h-12 rounded-lg object-cover border border-pink-500/30 shrink-0"
                      />
                    ) : (
                      hairstyle?.imageUrl && (
                        <img
                          src={hairstyle.imageUrl}
                          alt={hairstyle.name}
                          className="w-12 h-12 rounded-lg object-cover shrink-0"
                        />
                      )
                    )}
                    <div className="min-w-0">
                      <p className="text-xs text-pink-400 font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Kiểu tóc mong muốn
                      </p>
                      <p className="text-sm font-semibold text-white truncate">
                        {hairstyle ? hairstyle.name : "Kiểu tóc từ ảnh thử"}
                      </p>
                      {analysisResult?.faceShape && (
                        <p className="text-[11px] text-zinc-400">Dáng mặt: {analysisResult.faceShape}</p>
                      )}
                    </div>
                  </div>

                  {tryOnImageUrl && (
                    <button
                      type="button"
                      onClick={() => setAttachTryOn(!attachTryOn)}
                      className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                        attachTryOn
                          ? "bg-pink-600/20 border-pink-500/40 text-pink-300 hover:bg-pink-600/30"
                          : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {attachTryOn ? "Đang đính kèm" : "Không đính kèm"}
                    </button>
                  )}
                </div>
              )}

              {/* Customer info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Họ và tên <span className="text-pink-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:outline-none focus:border-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Số điện thoại <span className="text-pink-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              {/* Preferred time */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Thời gian hẹn mong muốn <span className="text-pink-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    required
                    min={minStr}
                    max={maxStr}
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:outline-none focus:border-pink-500"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Tối thiểu trước 1 giờ, tối đa 30 ngày tới.
                </p>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Ghi chú cho salon (tùy chọn)</label>
                <textarea
                  rows="2"
                  maxLength={500}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Yêu cầu riêng, tình trạng tóc hiện tại..."
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:outline-none focus:border-pink-500 resize-none"
                />
              </div>

              {/* Consent checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-zinc-300 select-none">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-700 bg-zinc-800 text-pink-600 focus:ring-pink-500"
                  />
                  <span>
                    Tôi đồng ý chia sẻ ảnh thử tóc, dáng mặt và số điện thoại với salon này để được tư vấn và xác nhận lịch hẹn.
                  </span>
                </label>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium transition-colors"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={loading || !consent}
                  className="flex-1 py-2.5 px-4 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Đang gửi yêu cầu...
                    </>
                  ) : (
                    "Gửi yêu cầu đặt lịch"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BookingForm(props) {
  if (!props.isOpen || !props.salon) return null;
  return <BookingModalContent {...props} />;
}
