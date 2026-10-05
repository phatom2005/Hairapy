import { Link, Navigate, useLocation } from "react-router-dom";
import { AuthShell, AuthHeading } from "../components/auth/AuthShell";
import ResendVerification from "../components/auth/ResendVerification";
import { Button } from "../components/ui";
import { AnimatedContent } from "../components/animated";
import { ArrowRight } from "../components/icons";

// Màn hình chờ xác minh — hiện ngay sau khi đăng ký thành công (email truyền qua router state)
export default function CheckEmailPage() {
  const location = useLocation();
  const email = location.state?.email || "";

  // Vào thẳng URL (không qua đăng ký) thì không biết gửi lại cho ai → về đăng nhập
  if (!email) return <Navigate to="/login" replace />;

  return (
    <AuthShell>
      <AnimatedContent>
        <div className="flex flex-col gap-8">
          <AuthHeading
            title="Kiểm tra email của bạn"
            subtitle={`Chúng tôi đã gửi liên kết xác minh tới ${email}. Bấm vào liên kết trong email (có hiệu lực 24 giờ) để kích hoạt tài khoản.`}
          />
          <ResendVerification email={email} initialCooldown={60} />
          <Link to="/login">
            <Button variant="brand" className="w-full" icon={<ArrowRight />}>
              Tới trang đăng nhập
            </Button>
          </Link>
        </div>
      </AnimatedContent>
    </AuthShell>
  );
}
