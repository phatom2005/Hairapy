import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import useAuthStore from "../store/useAuthStore";
import { Button, Card, Badge } from "../components/ui";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { CheckIcon, ShieldIcon } from "../components/icons";
import { AnimatedContent, BorderGlow } from "../components/animated";

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hydrate = useAuthStore((state) => state.hydrate);
  
  const orderCode = searchParams.get("orderCode");
  
  const [status, setStatus] = useState(() => orderCode ? "checking" : "error"); // checking, paid, pending_webhook, error
  const [errorMessage, setErrorMessage] = useState(() => orderCode ? "" : "Không tìm thấy mã hóa đơn (orderCode) trong yêu cầu.");
  const pollCount = useRef(0);

  useEffect(() => {
    if (!orderCode) return;

    const checkStatus = async () => {
      try {
        const response = await api.get(`/payments/status/${orderCode}`);
        const { status: paymentStatus } = response.data;

        if (paymentStatus === "PAID") {
          setStatus("paid");
          // Đồng bộ lại thông tin gói tài khoản mới của user trong auth store
          await hydrate();
        } else {
          // Nếu chưa PAID (đang PENDING), tiếp tục poll
          pollCount.current += 1;
          if (pollCount.current >= 15) {
            // Đã thử 15 lần (30 giây) nhưng chưa nhận được webhook cập nhật PAID
            setStatus("pending_webhook");
          } else {
            setTimeout(checkStatus, 2000);
          }
        }
      } catch (err) {
        console.error(err);
        pollCount.current += 1;
        if (pollCount.current >= 15) {
          setStatus("error");
          setErrorMessage("Lỗi kết nối kiểm tra trạng thái thanh toán quá lâu.");
        } else {
          setTimeout(checkStatus, 2000);
        }
      }
    };

    checkStatus();
  }, [orderCode, hydrate]);

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <Navbar />

      <main className="flex-grow px-6 py-16 sm:px-16 flex items-center justify-center">
        <AnimatedContent y={30} className="w-full max-w-md">
          <BorderGlow rounded="rounded-3xl" thickness={2} className="w-full block">
            <Card className="bg-zinc-900/40 backdrop-blur-md border border-white/5 p-8 rounded-3xl text-center">
              
              {status === "checking" && (
                <div className="flex flex-col items-center py-8">
                  <div className="size-16 animate-spin rounded-full border-4 border-brand border-t-transparent mb-6" />
                  <h2 className="font-display text-xl font-bold text-ink mb-2">
                    Đang xác nhận thanh toán
                  </h2>
                  <p className="text-sm text-muted max-w-xs">
                    Chúng tôi đang kiểm tra giao dịch của bạn với PayOS. Vui lòng giữ nguyên trang web...
                  </p>
                </div>
              )}

              {status === "paid" && (
                <div className="flex flex-col items-center py-6">
                  {/* Icon thành công rực rỡ */}
                  <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-6 border border-emerald-500/20 animate-bounce">
                    <CheckIcon size={32} className="text-emerald-500" />
                  </div>
                  
                  <Badge variant="premium" className="mb-2">
                    THANH TOÁN THÀNH CÔNG
                  </Badge>
                  
                  <h2 className="font-display text-2xl font-extrabold text-ink mb-3">
                    Đã Nâng Cấp Tài Khoản!
                  </h2>
                  
                  <p className="text-sm text-mauve mb-8 max-w-xs">
                    Tài khoản của bạn đã được nâng cấp lên gói dịch vụ trả phí. Hãy bắt đầu khám phá các tính năng AI không giới hạn ngay hôm nay!
                  </p>

                  <Button
                    onClick={() => navigate("/scan")}
                    variant="pink"
                    className="w-full justify-center py-3.5 text-sm font-bold"
                  >
                    Bắt đầu trải nghiệm ngay
                  </Button>
                </div>
              )}

              {status === "pending_webhook" && (
                <div className="flex flex-col items-center py-6">
                  <div className="size-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-6 border border-amber-500/20">
                    <ShieldIcon size={32} className="text-amber-500" />
                  </div>
                  
                  <h2 className="font-display text-xl font-bold text-ink mb-2">
                    Thanh toán đang xử lý
                  </h2>
                  
                  <p className="text-sm text-mauve mb-6 max-w-xs">
                    Giao dịch đã được ghi nhận. Webhook nâng cấp có thể trễ vài phút. Bạn có thể quay lại trang quét hoặc kiểm tra trong hồ sơ cá nhân.
                  </p>

                  <div className="space-y-3 w-full">
                    <Button
                      onClick={() => {
                        hydrate();
                        navigate("/scan");
                      }}
                      variant="pink"
                      className="w-full justify-center py-3 text-sm font-bold"
                    >
                      Đi tới trang quét AI
                    </Button>
                    <Button
                      onClick={() => navigate("/pricing")}
                      variant="outline"
                      className="w-full justify-center py-2.5 text-xs"
                    >
                      Quay lại bảng giá
                    </Button>
                  </div>
                </div>
              )}

              {status === "error" && (
                <div className="flex flex-col items-center py-6">
                  <div className="size-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-6 border border-red-500/20">
                    <span className="text-2xl font-bold">!</span>
                  </div>
                  
                  <h2 className="font-display text-xl font-bold text-red-500 mb-2">
                    Lỗi xác nhận giao dịch
                  </h2>
                  
                  <p className="text-sm text-muted mb-8 max-w-xs">
                    {errorMessage || "Không thể kiểm tra hoặc giao dịch chưa thành công. Vui lòng liên hệ bộ phận hỗ trợ."}
                  </p>

                  <Button
                    onClick={() => navigate("/pricing")}
                    variant="pink"
                    className="w-full justify-center py-3.5 text-sm font-bold"
                  >
                    Quay lại bảng giá
                  </Button>
                </div>
              )}

            </Card>
          </BorderGlow>
        </AnimatedContent>
      </main>

      <Footer />
    </div>
  );
}
