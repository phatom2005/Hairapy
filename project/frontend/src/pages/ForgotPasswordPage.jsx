import { Link } from "react-router-dom";
import { AuthShell, AuthHeading } from "../components/auth/AuthShell";
import { Button } from "../components/ui";
import { AnimatedContent } from "../components/animated";
import { ArrowRight } from "../components/icons";

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <AnimatedContent>
        <div className="flex flex-col gap-8">
          <AuthHeading
            title="Quên mật khẩu?"
            subtitle="Tính năng đặt lại mật khẩu qua email đang được phát triển và sẽ sớm ra mắt."
          />
          <p className="text-center text-base text-mauve">
            Trong lúc chờ đợi, vui lòng liên hệ đội ngũ Hairapy để được hỗ trợ đặt lại mật khẩu thủ công.
          </p>
          <Link to="/login">
            <Button variant="brand" className="w-full" icon={<ArrowRight />}>
              Quay lại đăng nhập
            </Button>
          </Link>
        </div>
      </AnimatedContent>
    </AuthShell>
  );
}
