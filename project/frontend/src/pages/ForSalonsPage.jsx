import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, CheckCircle, ShieldCheck, TrendingUp, Users, Calendar, ArrowRight, AlertCircle, Store } from "lucide-react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { Card, Button, Input } from "../components/ui";
import { AnimatedContent } from "../components/animated";
import api from "../lib/api";
import useAuthStore from "../store/useAuthStore";
import { SALON_PARTNER } from "../lib/plans";

const DISTRICT_OPTS = ["Quận 1", "Quận 3", "Quận 7", "Bình Thạnh", "Gò Vấp", "Phú Nhuận"];

export default function ForSalonsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [salonName, setSalonName] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState(DISTRICT_OPTS[0]);
  const [city, setCity] = useState("TP. Hồ Chí Minh");
  const [contactName, setContactName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [businessLicense, setBusinessLicense] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  // Fetch đơn đăng ký hiện tại của user
  const { data: applications = [], isLoading: appLoading } = useQuery({
    queryKey: ["salon-applications-my"],
    queryFn: async () => {
      const res = await api.get("/salon-applications/my");
      return res.data || [];
    },
    enabled: !!user,
  });

  const latestApp = applications.length > 0 ? applications[0] : null;
  const isOwner = user?.role === "SALON_OWNER";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate("/login", { state: { from: "/for-salons", message: "Vui lòng đăng nhập để gửi đơn đăng ký đối tác." } });
      return;
    }

    if (!phone.trim().match(/^(0|\+84)\d{9,10}$/)) {
      setError("Số điện thoại không hợp lệ (10-11 số).");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        salonName: salonName.trim(),
        address: address.trim(),
        district,
        city: city.trim() || "TP. Hồ Chí Minh",
        contactName: contactName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        businessLicense: businessLicense.trim() || null,
        notes: notes.trim() || null,
      };

      await api.post("/salon-applications", payload);
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["salon-applications-my"] });
    } catch (err) {
      setError(err.response?.data?.error || "Gửi đơn đăng ký thất bại. Vui lòng kiểm tra lại thông tin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pt-16 pb-20 sm:px-16 text-center">
        <AnimatedContent>
          <div className="mx-auto max-w-3xl space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink/10 border border-pink/30 text-xs font-bold text-pink">
              <Sparkles className="w-3.5 h-3.5" /> Mạng lưới Salon Đối tác Hairapy
            </span>

            <h1 className="font-display text-3xl sm:text-5xl font-black text-ink leading-tight">
              Đón đầu khách hàng làm đẹp thế hệ mới cùng <span className="text-magenta">Hairapy</span>
            </h1>

            <p className="text-sm sm:text-base text-mauve max-w-2xl mx-auto leading-relaxed">
              Kết nối trực tiếp với hàng ngàn khách hàng đã phân tích khuôn mặt và thử trước kiểu tóc bằng AI.
              Giảm thiểu rủi ro cắt hỏng, gia tăng khách hàng trung thành và tỷ lệ chuyển đổi dịch vụ.
            </p>

            <div className="pt-2 flex flex-wrap justify-center gap-4">
              {isOwner ? (
                <Button to="/salon-portal" variant="pink" className="px-6 py-3 font-bold text-sm shadow-md">
                  Vào Cổng quản lý salon →
                </Button>
              ) : (
                <a
                  href="#dang-ky"
                  className="px-6 py-3 rounded-full bg-pink hover:bg-pink-hover text-white font-bold text-sm transition-colors shadow-md inline-flex items-center gap-2"
                >
                  Đăng ký hợp tác ngay <ArrowRight className="w-4 h-4" />
                </a>
              )}
              <Button to="/salons" variant="outline" className="px-6 py-3 font-semibold text-sm">
                Xem mạng lưới Salon
              </Button>
            </div>
          </div>
        </AnimatedContent>
      </section>

      {/* 3 Lợi ích cốt lõi */}
      <section className="px-6 py-12 sm:px-16 bg-white/70 border-y border-line/60">
        <div className="mx-auto max-w-[1200px]">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl font-bold text-ink">Vì sao salon nên đồng hành cùng Hairapy?</h2>
            <p className="text-xs text-mauve mt-1">Giải pháp công nghệ giúp tối ưu trải nghiệm khách hàng ngay từ trước khi bước vào tiệm.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 border border-line bg-canvas/60 space-y-3 rounded-2xl">
              <div className="size-12 rounded-xl bg-pink/10 text-pink flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-ink text-base">Khách hàng có nhu cầu rõ ràng</h3>
              <p className="text-xs text-mauve leading-relaxed">
                Khách đến salon đã xem trước hình ảnh của chính họ sau khi tạo kiểu AI, biết rõ phong cách mong muốn, loại bỏ sự mơ hồ khi tư vấn.
              </p>
            </Card>

            <Card className="p-6 border border-line bg-canvas/60 space-y-3 rounded-2xl">
              <div className="size-12 rounded-xl bg-lime/15 text-lime flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-ink text-base">Xuất hiện đúng thời điểm vàng</h3>
              <p className="text-xs text-mauve leading-relaxed">
                Salon của bạn được đề xuất trực tiếp tại nút &quot;Cắt kiểu này ở đâu?&quot; ngay khi khách hàng vừa ưng ý với kết quả thử tóc AI.
              </p>
            </Card>

            <Card className="p-6 border border-line bg-canvas/60 space-y-3 rounded-2xl">
              <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-ink text-base">Huy hiệu Đối tác xác thực</h3>
              <p className="text-xs text-mauve leading-relaxed">
                Được gắn nhãn &quot;SALON ĐỐI TÁC&quot; nổi bật trên bản đồ và bộ lọc trực tuyến, nâng cao uy tín thương hiệu trong mắt giới trẻ.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Bảng giá đối tác & Dùng thử */}
      <section className="px-6 py-16 sm:px-16">
        <div className="mx-auto max-w-xl text-center">
          <Card className="p-8 sm:p-10 border-2 border-pink/40 bg-white shadow-xl rounded-3xl relative overflow-hidden">
            <span className="absolute -top-3 right-6 px-3 py-1 bg-gradient-to-r from-pink to-brand text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow">
              Ưu đãi ra mắt
            </span>

            <p className="text-xs font-bold uppercase tracking-wider text-pink">{SALON_PARTNER.name}</p>
            <div className="my-4 flex items-baseline justify-center gap-1">
              <span className="text-4xl sm:text-5xl font-black text-ink">{SALON_PARTNER.priceLabel}</span>
              <span className="text-sm font-semibold text-mauve">{SALON_PARTNER.period}</span>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 font-bold text-xs border border-emerald-500/20 mb-6">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Miễn phí 30 ngày trải nghiệm đầu tiên khi duyệt đơn</span>
            </div>

            <ul className="text-left space-y-2.5 text-xs text-ink border-t border-divider/10 pt-6">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-pink shrink-0" /> Nhận yêu cầu đặt lịch online từ khách hàng
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-pink shrink-0" /> Xem ảnh thử tóc khách gửi kèm khi đặt lịch
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-pink shrink-0" /> Quản lý danh mục kiểu tóc & bảng giá riêng của tiệm
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-pink shrink-0" /> Cổng quản trị chuyên biệt dành riêng cho salon (/salon-portal)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-pink shrink-0" /> Thống kê lượt xem, yêu cầu đặt lịch và kiểu tóc hot
              </li>
            </ul>
          </Card>
        </div>
      </section>

      {/* Form đăng ký đối tác */}
      <section id="dang-ky" className="px-6 py-16 sm:px-16 bg-white border-t border-line">
        <div className="mx-auto max-w-2xl">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink">Đăng ký tham gia mạng lưới Salon</h2>
            <p className="text-xs sm:text-sm text-mauve mt-1">Đội ngũ Hairapy sẽ xem xét hồ sơ và liên hệ kích hoạt trong vòng 24 - 48 giờ.</p>
          </div>

          {!user ? (
            <Card className="p-8 text-center space-y-4 bg-canvas/60 border border-line rounded-2xl">
              <Store className="w-12 h-12 text-pink mx-auto" />
              <h3 className="font-bold text-ink text-lg">Đăng nhập để gửi đơn đăng ký</h3>
              <p className="text-xs text-mauve max-w-md mx-auto">
                Tài khoản Hairapy của bạn sẽ được nâng cấp thành vai trò Chủ Salon sau khi đơn đăng ký được duyệt.
              </p>
              <Button to="/login" variant="pink" className="px-6 py-2.5 font-bold text-xs shadow-sm">
                Đăng nhập ngay
              </Button>
            </Card>
          ) : isOwner ? (
            <Card className="p-8 text-center space-y-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
              <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="font-bold text-ink text-lg">Tài khoản của bạn đã là Chủ Salon Đối tác!</h3>
              <p className="text-xs text-mauve max-w-md mx-auto">
                Bạn có thể truy cập Cổng quản lý salon để cập nhật thông tin tiệm, danh mục kiểu tóc và xử lý lịch hẹn.
              </p>
              <Button to="/salon-portal" variant="pink" className="px-6 py-2.5 font-bold text-xs shadow-sm">
                Vào Cổng quản lý salon →
              </Button>
            </Card>
          ) : latestApp && latestApp.status === "PENDING" ? (
            <Card className="p-8 text-center space-y-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
              <Calendar className="w-12 h-12 text-amber-600 mx-auto" />
              <h3 className="font-bold text-ink text-lg">Đơn đăng ký đang được xét duyệt</h3>
              <p className="text-xs text-mauve max-w-md mx-auto">
                Bạn đã gửi đơn đăng ký cho <strong>{latestApp.salonName}</strong> lúc{" "}
                {new Date(latestApp.createdAt).toLocaleString("vi-VN")}. Đội ngũ Hairapy đang thẩm định và sẽ liên hệ qua SĐT <strong>{latestApp.phone}</strong>.
              </p>
            </Card>
          ) : submitted ? (
            <Card className="p-8 text-center space-y-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
              <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="font-bold text-ink text-lg">Gửi đơn đăng ký thành công!</h3>
              <p className="text-xs text-mauve max-w-md mx-auto">
                Cảm ơn bạn đã quan tâm. Chúng tôi sẽ liên hệ trong 24-48 giờ làm việc.
              </p>
            </Card>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-ink mb-1">
                    Tên Salon <span className="text-pink">*</span>
                  </label>
                  <Input
                    required
                    value={salonName}
                    onChange={(e) => setSalonName(e.target.value)}
                    placeholder="VD: Hairapy Studio Saigon"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-ink mb-1">
                    Địa chỉ salon <span className="text-pink">*</span>
                  </label>
                  <Input
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="VD: 123 Nguyễn Thị Minh Khai, Phường Bến Nghé"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Quận / Huyện <span className="text-pink">*</span>
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink outline-none"
                  >
                    {DISTRICT_OPTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Tỉnh / Thành phố
                  </label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="TP. Hồ Chí Minh"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Người liên hệ / Chủ tiệm <span className="text-pink">*</span>
                  </label>
                  <Input
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Họ và tên người đại diện"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Số điện thoại liên hệ <span className="text-pink">*</span>
                  </label>
                  <Input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912345678"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-ink mb-1">
                    Email nhận thông báo <span className="text-pink">*</span>
                  </label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="salon@example.com"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-ink mb-1">
                    Link Fanpage / Website / Giấy phép kinh doanh (tùy chọn)
                  </label>
                  <Input
                    value={businessLicense}
                    onChange={(e) => setBusinessLicense(e.target.value)}
                    placeholder="https://facebook.com/hairsalon..."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-ink mb-1">
                    Giới thiệu thêm về salon (tùy chọn)
                  </label>
                  <textarea
                    rows="3"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Thế mạnh dịch vụ, số lượng ghế, thương hiệu mỹ phẩm sử dụng..."
                    className="w-full rounded-2xl border border-line bg-white p-3 text-sm text-ink outline-none focus:border-pink resize-none"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="pink"
                disabled={loading || appLoading}
                className="w-full py-3.5 font-bold text-sm shadow-md justify-center"
              >
                {loading ? "Đang gửi đơn..." : "Gửi đơn đăng ký tham gia →"}
              </Button>
            </form>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
