import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { Card } from "../components/ui";

// TODO: người dùng xác nhận email hỗ trợ thật khi phát hành chính thức
export const SUPPORT_EMAIL = "support@hairapy.id.vn";

export default function PrivacyPage() {
  const effectiveDate = "01/10/2026";

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between">
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 py-12 sm:px-8">
        <Card className="p-8 sm:p-12 shadow-sm rounded-3xl bg-white/90 backdrop-blur-md border border-line">
          <div className="border-b border-line pb-6 mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Pháp lý & Minh bạch dữ liệu
            </span>
            <h1 className="mt-2 text-3xl font-extrabold text-ink sm:text-4xl">
              Chính Sách Bảo Mật
            </h1>
            <p className="mt-2 text-sm text-mauve">
              Ngày hiệu lực: <span className="font-semibold text-ink">{effectiveDate}</span>
            </p>
          </div>

          {/* Mục lục */}
          <nav className="mb-10 rounded-2xl bg-canvas/60 p-5 border border-line/60">
            <p className="font-bold text-sm text-ink mb-3">Mục Lục</p>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-mauve font-medium">
              <li><a href="#thu-thap" className="hover:text-primary transition-colors">Dữ liệu cá nhân thu thập</a></li>
              <li><a href="#muc-dich" className="hover:text-primary transition-colors">Mục đích sử dụng dữ liệu</a></li>
              <li><a href="#ben-thu-ba" className="hover:text-primary transition-colors">Bên thứ ba xử lý dữ liệu</a></li>
              <li><a href="#luu-tru" className="hover:text-primary transition-colors">Thời gian và phạm vi lưu trữ</a></li>
              <li><a href="#quyen-nguoi-dung" className="hover:text-primary transition-colors">Quyền của người dùng & Xoá tài khoản</a></li>
              <li><a href="#tre-em" className="hover:text-primary transition-colors">Bảo vệ quyền riêng tư của trẻ em</a></li>
              <li><a href="#lien-he" className="hover:text-primary transition-colors">Thông tin liên hệ</a></li>
            </ol>
          </nav>

          <div className="space-y-8 text-sm leading-relaxed text-mauve">
            {/* 1. Dữ liệu thu thập */}
            <section id="thu-thap">
              <h2 className="text-lg font-bold text-ink mb-3">1. Dữ liệu cá nhân chúng tôi thu thập</h2>
              <p className="mb-2">
                Để cung cấp trải nghiệm phân tích khuôn mặt và thử nghiệm kiểu tóc bằng AI, Hairapy thu thập các nhóm dữ liệu sau:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li><strong className="text-ink">Thông tin tài khoản:</strong> Địa chỉ email, họ và tên, số điện thoại (tùy chọn), ngày sinh (tùy chọn) và mật khẩu được lưu trữ dưới dạng băm mã hóa một chiều (BCrypt).</li>
                <li><strong className="text-ink">Hình ảnh khuôn mặt & Trắc học:</strong> Ảnh chân dung selfie do bạn trực tiếp chụp hoặc tải lên từ thư viện thiết bị, tọa độ các điểm mốc khuôn mặt (face mesh landmarks) được trích xuất trên thiết bị.</li>
                <li><strong className="text-ink">Dữ liệu sử dụng tính năng:</strong> Kết quả xác định dáng khuôn mặt (Oval, Tròn, Vuông...), danh sách lịch sử các lần quét mặt, kiểu tóc yêu thích đã lưu và số lượt dùng quota hàng ngày.</li>
                <li><strong className="text-ink">Dữ liệu giao dịch:</strong> Mã đơn hàng, số tiền, ngày giờ giao dịch và trạng thái thanh toán từ PayOS. <span className="text-ink font-semibold">Hairapy tuyệt đối KHÔNG lưu trữ số thẻ ngân hàng, số CVV hay mật khẩu tài khoản ngân hàng của bạn.</span></li>
              </ul>
            </section>

            {/* 2. Mục đích */}
            <section id="muc-dich">
              <h2 className="text-lg font-bold text-ink mb-3">2. Mục đích sử dụng dữ liệu</h2>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Phân tích cấu trúc khuôn mặt và gợi ý các kiểu tóc phù hợp nhất với đặc điểm nhân trắc học của bạn.</li>
                <li>Xử lý ghép kiểu tóc AI (Hair Swap) tạo hình ảnh trực quan trước khi ra tiệm salon.</li>
                <li>Quản lý hạn mức sử dụng (quota) tương ứng với từng gói dịch vụ (Free / Premium).</li>
                <li>Xử lý và kích hoạt trạng thái nâng cấp tài khoản khi có giao dịch thanh toán hợp lệ.</li>
                <li>Phục vụ công tác hỗ trợ khách hàng, giải quyết khiếu nại và ngăn ngừa gian lận.</li>
              </ul>
            </section>

            {/* 3. Bên thứ ba */}
            <section id="ben-thu-ba">
              <h2 className="text-lg font-bold text-ink mb-3">3. Các bên thứ ba tiếp nhận và xử lý dữ liệu</h2>
              <p className="mb-2">Chúng tôi chỉ hợp tác với các nhà cung cấp dịch vụ hạ tầng và công nghệ uy tín:</p>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li><strong className="text-ink">AILabTools:</strong> Cung cấp dịch vụ trí tuệ nhân tạo ghép kiểu tóc qua giao thức API bảo mật.</li>
                <li><strong className="text-ink">Cloudinary:</strong> Nền tảng lưu trữ hình ảnh đám mây bảo mật cao cho ảnh quét khuôn mặt và catalog.</li>
                <li><strong className="text-ink">PayOS:</strong> Cổng thanh toán trực tuyến xử lý giao dịch quét mã VietQR ngân hàng.</li>
                <li><strong className="text-ink">Railway & Supabase:</strong> Hạ tầng máy chủ lưu trữ backend và cơ sở dữ liệu PostgreSQL.</li>
                <li><strong className="text-ink">Sentry:</strong> Hệ thống giám sát và báo cáo lỗi hệ thống phục vụ việc khắc phục sự cố kỹ thuật.</li>
              </ul>
            </section>

            {/* 4. Thời gian lưu trữ */}
            <section id="luu-tru">
              <h2 className="text-lg font-bold text-ink mb-3">4. Thời gian và phạm vi lưu trữ</h2>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li><strong className="text-ink">Ảnh kết quả AI (ai-results):</strong> Tự động xóa vĩnh viễn khỏi Cloudinary sau khoảng 24 giờ kể từ thời điểm tạo ra.</li>
                <li><strong className="text-ink">Ảnh quét khuôn mặt trong Lịch sử:</strong> Được lưu trữ an toàn để hiển thị trong mục Lịch sử quét của tài khoản cho đến khi bạn chủ động xóa tài khoản.</li>
                <li><strong className="text-ink">Bản ghi giao dịch thanh toán:</strong> Sau khi tài khoản bị xóa, thông tin cá nhân của bạn sẽ bị ẩn danh hoàn toàn; bản ghi thanh toán được lưu trữ theo nghĩa vụ pháp lý kế toán và thuế.</li>
              </ul>
            </section>

            {/* 5. Quyền người dùng */}
            <section id="quyen-nguoi-dung">
              <h2 className="text-lg font-bold text-ink mb-3">5. Quyền của người dùng & Xoá tài khoản</h2>
              <p className="mb-2">Bạn có toàn quyền kiểm soát dữ liệu cá nhân của mình:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Xem, kiểm tra và chỉnh sửa thông tin hồ sơ bất kỳ lúc nào tại mục Cài đặt.</li>
                <li><strong className="text-ink">Yêu cầu xoá vĩnh viễn tài khoản:</strong> Bạn có thể tự thực hiện ngay trong ứng dụng di động (Cài đặt → Xoá tài khoản) hoặc trên giao diện website (Cài đặt → Vùng nguy hiểm → Xoá tài khoản). Ngoài ra, bạn cũng có thể gửi yêu cầu xóa qua email.</li>
                <li>Khi tài khoản được xoá: Toàn bộ ảnh quét trên Cloudinary, lịch sử phân tích, kiểu tóc đã lưu và thông tin cá nhân sẽ bị xoá hoặc ẩn danh hoá hoàn toàn, không thể khôi phục.</li>
              </ul>
            </section>

            {/* 6. Trẻ em */}
            <section id="tre-em">
              <h2 className="text-lg font-bold text-ink mb-3">6. Quyền riêng tư của trẻ em</h2>
              <p>
                Dịch vụ của Hairapy không hướng tới và không chủ đích thu thập dữ liệu cá nhân từ trẻ em dưới 13 tuổi (hoặc độ tuổi tương ứng theo quy định pháp luật sở tại). Nếu chúng tôi phát hiện đã thu thập thông tin của trẻ em dưới 13 tuổi mà không có sự đồng ý của phụ huynh, chúng tôi sẽ lập tức tiến hành xóa dữ liệu đó.
              </p>
            </section>

            {/* 7. Liên hệ */}
            <section id="lien-he">
              <h2 className="text-lg font-bold text-ink mb-3">7. Thông tin liên hệ</h2>
              <p>
                Nếu bạn có bất kỳ câu hỏi nào về Chính sách bảo mật này hoặc muốn thực hiện các quyền riêng tư của mình, vui lòng liên hệ:
              </p>
              <div className="mt-3 p-4 rounded-xl bg-canvas border border-line text-ink font-medium">
                <p>Email hỗ trợ: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary font-bold hover:underline">{SUPPORT_EMAIL}</a></p>
                <p className="text-xs text-mauve mt-1">Đội ngũ kỹ thuật Hairapy AI</p>
              </div>
            </section>
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
