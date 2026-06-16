import { Link } from "react-router-dom";
import { AuthShell, AuthHeading } from "../components/auth/AuthShell";
import { Button, Input } from "../components/ui";
import { AnimatedContent, BorderGlow } from "../components/animated";
import { MailIcon, ArrowRight } from "../components/icons";

export default function ForgotPasswordPage() {
  function handleSubmit(e) {
    e.preventDefault();
    // TODO: gọi API POST /api/auth/forgot-password
  }

  return (
    <AuthShell>
      <AnimatedContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <AuthHeading
            title="Quên mật khẩu?"
            subtitle="Nhập email để nhận liên kết đặt lại mật khẩu."
          />

          <div className="flex flex-col gap-6">
            <Input label="Email" type="email" name="email" placeholder="example@hairapy.ai" icon={<MailIcon />} />
            <BorderGlow rounded="rounded-full" thickness={2} className="w-full block">
              <Button type="submit" variant="brand" className="w-full" icon={<ArrowRight />}>
                Gửi liên kết
              </Button>
            </BorderGlow>
          </div>

          <p className="pt-4 text-center text-base text-mauve">
            Nhớ mật khẩu rồi?{" "}
            <Link to="/login" className="font-bold text-brand">Đăng nhập</Link>
          </p>
        </form>
      </AnimatedContent>
    </AuthShell>
  );
}
