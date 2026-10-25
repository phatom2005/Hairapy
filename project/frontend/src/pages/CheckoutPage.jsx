import { useState } from "react";
import { trackEvent } from "../lib/analytics";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatedContent, BorderGlow, GlareHover } from "../components/animated";
import { CheckIcon, CrownIcon, ShieldIcon } from "../components/icons";
import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import { Badge, Button, Card } from "../components/ui";
import api from "../lib/api";
import useAuthStore from "../store/useAuthStore";
import { PLANS, PLAN_LABEL, getPlanCta } from "../lib/plans";

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const plan = searchParams.get("plan")?.toUpperCase() || "PRO";

  // Xác định thông tin chi tiết của gói từ PLANS (nguồn sự thật duy nhất)
  const targetPlan = PLANS.find((p) => p.code === plan) || PLANS.find((p) => p.code === "PRO") || PLANS[1];

  const userPlan = user?.plan || "FREE";
  // Truyền đúng object gói + object user (trước đây truyền chuỗi → nút thanh toán bị khoá với mọi user đã đăng nhập)
  const cta = getPlanCta(targetPlan, user);
  const isDisabled = cta.disabled;
  const disabledHint = cta.hint;
  const isPaidUser = userPlan !== "FREE";
  const formattedEndDate = user?.planEndDate
    ? new Date(user.planEndDate).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  const planName = targetPlan.name;
  const planPrice = targetPlan.price;
  const planPeriod = targetPlan.days ? `${targetPlan.days} ngày` : targetPlan.period;

  const features = targetPlan.features.filter((f) => f.on).map((f) => f.text);

  const handlePayment = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/payments/create", { plan });
      const { checkoutUrl } = response.data;
      trackEvent("begin_checkout", { plan });
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

                      {isPaidUser && (
                        <div className="p-3.5 mb-4 rounded-2xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold leading-relaxed">
                          Bạn đang dùng {PLAN_LABEL[userPlan] || userPlan} {formattedEndDate ? `đến ${formattedEndDate}` : ""}. Gói mới sẽ được cộng dồn vào hạn hiện tại.
                        </div>
                      )}

                      {isDisabled && (
                        <div className="p-4 mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-medium">
                          {disabledHint || "Gói này hiện không khả dụng cho tài khoản của bạn."}
                        </div>
                      )}

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
                        disabled={loading || isDisabled}
                        variant="pink"
                        className="w-full justify-center py-3.5 mb-4 text-sm font-bold tracking-wide"
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Đang kết nối...
                          </div>
                        ) : isDisabled ? (
                          "Không khả dụng"
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
