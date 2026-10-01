import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { Card } from "../components/ui";
import { SUPPORT_EMAIL } from "./PrivacyPage";

export default function TermsPage() {
  const effectiveDate = "01/10/2026";

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between">
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 py-12 sm:px-8">
        <Card className="p-8 sm:p-12 shadow-sm rounded-3xl bg-white/90 backdrop-blur-md border border-line">
          <div className="border-b border-line pb-6 mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Quy định sử dụng
            </span>
            <h1 className="mt-2 text-3xl font-extrabold text-ink sm:text-4xl">
              Điều Khoản Dịch Vụ
            </h1>
            <p className="mt-2 text-sm text-mauve">
              Ngày hiệu lực: <span className="font-semibold text-ink">{effectiveDate}</span>
            </p>
          </div>

          <div className="space-y-8 text-sm leading-relaxed text-mauve">
            <section>
              <h2 className="text-lg font-bold text-ink mb-2">1. Giới thiệu dịch vụ</h2>
              <p>
                Hairapy là nền tảng ứng dụng công nghệ trí tuệ nhân tạo (AI) giúp phân tích hình dáng khuôn mặt từ ảnh chụp và mô phỏng thử nghiệm các kiểu tóc khác nhau trên khuôn mặt người dùng trước khi quyết định tạo kiểu tại salon.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-ink mb-2">2. Đăng ký & Bảo mật tài khoản</h2>
              <p>
                Khi tạo tài khoản trên Hairapy, bạn cam kết cung cấp thông tin chính xác và có trách nhiệm bảo mật thông tin đăng nhập của mình. Bạn chịu trách nhiệm cho mọi hoạt động diễn ra dưới tài khoản của bạn.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-ink mb-2">3. Các gói dịch vụ & Thanh toán</h2>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li><strong className="text-ink">Gói Miễn phí (Free):</strong> Cung cấp lượt quét phân tích khuôn mặt và thử kiểu tóc cơ bản với số lượt giới hạn mỗi ngày. Ảnh thử tóc có thể được đính kèm watermark nhận diện thương hiệu.</li>
                <li><strong className="text-ink">Gói Trả phí (Premium):</strong> Mở khóa các kiểu tóc độc quyền, xuất ảnh độ phân giải cao không watermark, tăng hoặc không giới hạn lượt tạo ảnh theo chu kỳ đã chọn.</li>
                <li><strong className="text-ink">Phương thức thanh toán:</strong> Các gói dịch vụ được thanh toán theo từng chu kỳ (tuần / tháng) qua cổng thanh toán được tích hợp. Các gói dịch vụ <span className="text-ink font-semibold">KHÔNG tự động trừ tiền gia hạn</span>; khi hết hạn, tài khoản sẽ tự động chuyển về trạng thái Free trừ khi người dùng chủ động thanh toán tiếp.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-ink mb-2">4. Tính chất tham khảo của kết quả do AI tạo ra</h2>
              <p>
                Mọi hình ảnh mô phỏng kiểu tóc và đánh giá dáng khuôn mặt từ Hairapy được tạo ra bởi mô hình máy học và chỉ mang tính chất minh họa tham khảo. Kết quả thực tế khi tạo kiểu tóc tại salon phụ thuộc vào chất tóc, độ dày, kỹ thuật của nhà tạo mẫu tóc và các yếu tố vật lý khác. Hairapy không cam đoan kết quả làm tóc ngoài đời thực sẽ giống 100% hình ảnh do AI mô phỏng.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-ink mb-2">5. Hành vi bị nghiêm cấm</h2>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Tải lên hình ảnh khiêu dâm, bạo lực, vi phạm pháp luật hoặc xâm phạm quyền hình ảnh của người khác khi chưa được phép.</li>
                <li>Sử dụng các công cụ tự động (bot, crawler, script) để khai thác trái phép hệ thống của Hairapy.</li>
                <li>Can thiệp, phá hoại hoặc cố ý làm gián đoạn hạ tầng máy chủ và dịch vụ của chúng tôi.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-ink mb-2">6. Giới hạn trách nhiệm</h2>
              <p>
                Hairapy được cung cấp trên cơ sở &quot;nguyên trạng&quot; (as is). Chúng tôi nỗ lực tối đa để đảm bảo dịch vụ vận hành ổn định nhưng không chịu trách nhiệm đối với các gián đoạn dịch vụ do sự cố mạng, bảo trì định kỳ của nhà cung cấp hạ tầng đám mây hoặc các trường hợp bất khả kháng.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-ink mb-2">7. Điều chỉnh điều khoản</h2>
              <p>
                Chúng tôi có quyền cập nhật các điều khoản này theo thời gian để phản ánh các thay đổi trong dịch vụ hoặc yêu cầu pháp luật. Phiên bản cập nhật sẽ được công bố trên website kèm ngày hiệu lực mới.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-ink mb-2">8. Liên hệ</h2>
              <p>
                Mọi thắc mắc liên quan đến Điều khoản dịch vụ, vui lòng gửi email tới: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary font-bold hover:underline">{SUPPORT_EMAIL}</a>.
              </p>
            </section>
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
