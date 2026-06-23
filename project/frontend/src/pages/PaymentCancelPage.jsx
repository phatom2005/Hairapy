import { useNavigate } from "react-router-dom";
import { Button, Card } from "../components/ui";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { AnimatedContent, BorderGlow } from "../components/animated";

export default function PaymentCancelPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <Navbar />

      <main className="flex-grow px-6 py-16 sm:px-16 flex items-center justify-center">
        <AnimatedContent y={30} className="w-full max-w-md">
          <BorderGlow rounded="rounded-3xl" thickness={2} className="w-full block">
            <Card className="bg-zinc-900/40 backdrop-blur-md border border-white/5 p-8 rounded-3xl text-center">
              <div className="flex flex-col items-center py-6">
                {/* Cancel Icon */}
                <div className="size-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-6 border border-amber-500/20">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                
                <h2 className="font-display text-2xl font-extrabold text-ink mb-3">
                  Đã hủy thanh toán
                </h2>
                
                <p className="text-sm text-muted mb-8 max-w-xs">
                  Giao dịch thanh toán của bạn đã bị hủy bỏ. Bạn không bị trừ bất kỳ khoản chi phí nào.
                </p>

                <div className="space-y-3 w-full">
                  <Button
                    onClick={() => navigate("/pricing")}
                    variant="pink"
                    className="w-full justify-center py-3.5 text-sm font-bold"
                  >
                    Quay lại bảng giá
                  </Button>
                  
                  <Button
                    onClick={() => navigate("/scan")}
                    variant="outline"
                    className="w-full justify-center py-2.5 text-xs"
                  >
                    Về trang quét AI miễn phí
                  </Button>
                </div>
              </div>
            </Card>
          </BorderGlow>
        </AnimatedContent>
      </main>

      <Footer />
    </div>
  );
}
