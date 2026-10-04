import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { Card, Button } from "../components/ui";
import { SUPPORT_EMAIL } from "./PrivacyPage";

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between">
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 py-12 sm:px-8">
        <Card className="p-8 sm:p-12 shadow-sm rounded-3xl bg-white/90 backdrop-blur-md border border-line">
          <div className="border-b border-line pb-6 mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-red-500">
              Quyền riêng tư & Bảo vệ người dùng
            </span>
            <h1 className="mt-2 text-3xl font-extrabold text-ink sm:text-4xl">
              Yêu Cầu Xoá Tài Khoản & Dữ Liệu
            </h1>
            <p className="mt-2 text-sm text-mauve">
              Hướng dẫn chi tiết quy trình xoá vĩnh viễn tài khoản và các dữ liệu liên quan trên hệ thống Hairapy.
            </p>
          </div>

          <div className="space-y-8 text-sm leading-relaxed text-mauve">
            {/* Giới thiệu */}
            <section>
              <h2 className="text-lg font-bold text-ink mb-2">Các dữ liệu sẽ bị xoá và giữ lại</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200">
                  <p className="font-bold text-red-600 text-sm mb-2">Dữ liệu sẽ bị xoá vĩnh viễn:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs text-red-800">
                    <li>Ảnh chụp khuôn mặt quét trên Cloudinary.</li>
                    <li>Lịch sử quét và kết quả phân tích dáng khuôn mặt.</li>
                    <li>Bộ sưu tập các kiểu tóc đã lưu trong mục Yêu thích.</li>
                    <li>Nhật ký số lượt sử dụng tính năng AI.</li>
                    <li>Nội dung nhận xét trong các đánh giá bạn đã gửi.</li>
                    <li>Mọi token đặt lại mật khẩu và phiên đăng nhập.</li>
                  </ul>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
                  <p className="font-bold text-amber-700 text-sm mb-2">Dữ liệu được giữ lại (Ẩn danh hoá):</p>
                  <ul className="list-disc list-inside space-y-1 text-xs text-amber-900">
                    <li>Bản ghi hóa đơn / giao dịch thanh toán được lưu trữ theo quy định kế toán và thuế.</li>
                    <li>Số sao đánh giá dịch vụ ở dạng ẩn danh hoàn toàn (phục vụ thống kê chất lượng).</li>
                    <li>Toàn bộ thông tin định danh (tên, email, số điện thoại) của bạn sẽ được ẩn danh hoá thành tài khoản không thể nhận diện (ví dụ: <code className="bg-amber-100 px-1 py-0.5 rounded">deleted-xxx@deleted.hairapy.invalid</code>).</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Các cách thực hiện */}
            <section>
              <h2 className="text-lg font-bold text-ink mb-4">Các phương thức thực hiện yêu cầu xoá tài khoản</h2>
              
              <div className="space-y-4">
                {/* Cách 1 */}
                <div className="p-5 rounded-2xl border border-line bg-canvas/50">
                  <h3 className="font-bold text-ink text-base mb-1">Cách 1: Xoá trực tiếp trong ứng dụng di động Android</h3>
                  <p className="text-xs text-mauve mb-2">Đây là cách nhanh nhất và được xử lý tự động ngay lập tức:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs pl-2">
                    <li>Mở ứng dụng <strong>Hairapy</strong> trên điện thoại.</li>
                    <li>Vào mục <strong>Cá nhân</strong> (tab cuối cùng) → chọn <strong>Cài đặt tài khoản</strong>.</li>
                    <li>Cuộn xuống mục <strong>Vùng nguy hiểm</strong> → bấm nút <strong>Xoá tài khoản</strong>.</li>
                    <li>Nhập mật khẩu để xác thực (tài khoản Google/Facebook có thể bỏ trống) và xác nhận <strong>Xoá vĩnh viễn</strong>.</li>
                  </ol>
                </div>

                {/* Cách 2 */}
                <div className="p-5 rounded-2xl border border-line bg-canvas/50">
                  <h3 className="font-bold text-ink text-base mb-1">Cách 2: Xoá trên giao diện Web</h3>
                  <p className="text-xs text-mauve mb-2">Thực hiện trực tiếp trên trình duyệt của bạn:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs pl-2">
                    <li>Đăng nhập tài khoản của bạn trên website Hairapy.</li>
                    <li>Truy cập trang <strong>Cài đặt tài khoản</strong> (Settings).</li>
                    <li>Tại cuối trang, trong phần <strong>Vùng nguy hiểm</strong>, bấm nút <strong>Xoá tài khoản</strong> và nhập mật khẩu xác nhận.</li>
                  </ol>
                  <div className="mt-3">
                    <Button to="/settings" variant="secondary" className="text-xs px-4 py-2">
                      Đi tới Cài đặt tài khoản
                    </Button>
                  </div>
                </div>

                {/* Cách 3 */}
                <div className="p-5 rounded-2xl border border-line bg-canvas/50">
                  <h3 className="font-bold text-ink text-base mb-1">Cách 3: Gửi yêu cầu qua Email (Khi không thể đăng nhập)</h3>
                  <p className="text-xs text-mauve mb-2">Nếu bạn đã mất quyền truy cập tài khoản hoặc gặp sự cố kỹ thuật:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs pl-2">
                    <li>Gửi email từ chính địa chỉ email bạn đã dùng để đăng ký tài khoản Hairapy.</li>
                    <li>Gửi tới: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary font-bold hover:underline">{SUPPORT_EMAIL}</a></li>
                    <li>Tiêu đề: <strong className="text-ink">[Yêu cầu xoá tài khoản Hairapy]</strong></li>
                    <li>Nội dung: Ghi rõ họ tên và xác nhận muốn xoá toàn bộ dữ liệu tài khoản.</li>
                    <li>Thời gian xử lý: Yêu cầu qua email sẽ được đội ngũ hỗ trợ xác minh và xử lý trong thời gian tối đa <strong className="text-ink">30 ngày làm việc</strong>.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="pt-4 border-t border-line">
              <p className="text-xs text-mauve">
                Xem thêm <Link to="/privacy" className="text-primary hover:underline font-semibold">Chính sách bảo mật</Link> hoặc <Link to="/terms" className="text-primary hover:underline font-semibold">Điều khoản dịch vụ</Link> của Hairapy.
              </p>
            </section>
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
