import PillNav from "../components/layout/PillNav";
import Footer from "../components/layout/Footer";
import FeedbackWidget from "../components/FeedbackWidget";

/**
 * Trang đánh giá chung (/feedback): ai đã đăng nhập cũng gửi được, KHÔNG cần quét mặt hay thử tóc trước.
 * Gửi POST /api/feedback với feature = GENERAL (backend giới hạn 10 đánh giá / tài khoản / 24h).
 */
export default function FeedbackPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PillNav />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 py-10 sm:py-16">
        <span className="text-xs font-bold uppercase tracking-wider text-primary">Góp ý</span>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Đánh giá Hairapy
        </h1>
        <p className="mt-2 text-sm text-mauve">
          Chấm điểm và cho chúng mình biết bạn thích gì, chưa thích gì — giao diện, tốc độ, kết quả AI hay bất cứ điều gì.
        </p>
        <div className="mt-6">
          <FeedbackWidget feature="GENERAL" loginPrompt />
        </div>
      </main>
      <Footer />
    </div>
  );
}
