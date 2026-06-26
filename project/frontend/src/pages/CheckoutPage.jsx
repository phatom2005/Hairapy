import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatedContent, BorderGlow, GlareHover } from "../components/animated";
import { CheckIcon, CrownIcon, ShieldIcon } from "../components/icons";
import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import { Badge, Button, Card } from "../components/ui";
import api from "../lib/api";

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const plan = searchParams.get("plan")?.toUpperCase() || "PRO";

  // Xác định thông tin chi tiết của gói
  const isPremium = plan === "PREMIUM";
  const planName = isPremium ? "Tháng" : "Pro (Tuần)";
  const planPrice = isPremium ? "99.000vnđ" : "49.000vnđ";
  const planPeriod = isPremium ? "30 ngày" : "7 ngày";

  const features = isPremium
    ? [
        "Quét hình ảnh AI không giới hạn",
        "Phân tích chuyên sâu hình dáng & màu sắc",
        "Ưu đãi giảm giá 30% tại Salon liên kết",
        "Tư vấn 1:1 trực tiếp cùng Stylist chuyên nghiệp",
        "Không chèn watermark, xuất ảnh chất lượng HD",
      ]
    : [
        "5 lần quét AI phân tích khuôn mặt mỗi ngày",
        "20 lần thử kiểu tóc mới mỗi ngày",
        "Ưu đãi giảm giá 10% tại Salon liên kết",
        "Không chèn watermark, xuất ảnh chất lượng HD",
      ];

  const handlePayment = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/payments/create", { plan });
      const { checkoutUrl } = response.data;
      if (checkoutUrl) {
        // Redirect sang trang thanh toán VietQR của PayOS
        window.location.href = checkoutUrl;
      } else {
        throw new Error("Không nhận được URL thanh toán từ hệ thống.");
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error || 
        "Đã xảy ra lỗi trong quá trình khởi tạo thanh toán. Vui lòng thử lại sau."
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <Navbar />

      <main className="flex-grow px-6 py-16 sm:px-16 flex items-center justify-center">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
          
          {/* Thông tin gói (Bên trái) */}
          <div className="md:col-span-7 flex flex-col justify-center">
            <AnimatedContent y={30}>
              <Badge variant="premium" className="mb-4 w-fit">
                XÁC NHẬN ĐƠN HÀNG
              </Badge>
              <h1 className="font-display text-3xl font-extrabold text-ink sm:text-4xl mb-4">
                Khai phá toàn bộ quyền lợi cùng {planName}
              </h1>
              <p className="text-mauve mb-8 max-w-md">
                Chỉ một bước quét mã VietQR để nâng cấp tài khoản của bạn lên gói dịch vụ cao cấp và tận hưởng mọi tính năng AI thông minh.
              </p>

              <div className="space-y-4">
                {features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="mt-1 flex items-center justify-center rounded-full bg-emerald-500/10 p-0.5 text-emerald-500">
                      <CheckIcon size={16} className="text-emerald-500" />
                    </div>
                    <span className="text-sm text-mauve font-medium">{feat}</span>
                  </div>
                ))}
              </div>
            </AnimatedContent>
          </div>

          {/* Form Checkout (Bên phải) */}
          <div className="md:col-span-5">
            <AnimatedContent y={40} delay={0.15} className="h-full">
              <BorderGlow rounded="rounded-3xl" thickness={2} className="h-full w-full block">
                <GlareHover className="h-full">
                  <Card className="h-full relative flex flex-col justify-between bg-zinc-900/40 backdrop-blur-md border border-white/5 p-8 rounded-3xl">
                    <div>
                      {/* Tiêu đề & Icon */}
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <span className="text-xs font-semibold text-magenta uppercase tracking-wider">
                            Gói đăng ký
                          </span>
                          <h3 className="font-display text-2xl font-bold text-ink mt-1">
                            {planName}
                          </h3>
                        </div>
                        <div className="p-3 bg-pink/10 rounded-2xl text-magenta">
                          <CrownIcon size={24} />
                        </div>
                      </div>

                      {/* Chi tiết giá */}
                      <div className="border-t border-white/5 py-4 mb-6">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-muted">Thời gian sử dụng</span>
                          <span className="text-sm font-semibold text-ink">{planPeriod}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-muted">Đơn giá</span>
                          <span className="text-sm font-semibold text-ink">{planPrice}</span>
                        </div>
                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
                          <span className="text-base font-bold text-ink">Tổng tiền</span>
                          <span className="text-2xl font-extrabold text-magenta">
                            {planPrice}
                          </span>
                        </div>
                      </div>

                      {error && (
                        <div className="p-4 mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                          {error}
                        </div>
                      )}
                    </div>

                    <div>
                      {/* Nút thanh toán */}
                      <Button
                        onClick={handlePayment}
                        disabled={loading}
                        variant="pink"
                        className="w-full justify-center py-3.5 mb-4 text-sm font-bold tracking-wide"
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Đang kết nối...
                          </div>
                        ) : (
                          "Thanh toán qua VietQR"
                        )}
                      </Button>

                      {/* Nút quay lại */}
                      <Button
                        onClick={() => navigate("/pricing")}
                        disabled={loading}
                        variant="outline"
                        className="w-full justify-center py-3 text-xs"
                      >
                        Quay lại bảng giá
                      </Button>

                      {/* Thông tin bảo mật */}
                      <div className="flex items-center justify-center gap-2 mt-6 text-2xs text-muted text-center">
                        <ShieldIcon size={12} className="text-emerald-500" />
                        <span>Hệ thống bảo mật 100% qua PayOS VietQR</span>
                      </div>
                    </div>
                    </Card>
                </GlareHover>
              </BorderGlow>
            </AnimatedContent>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
