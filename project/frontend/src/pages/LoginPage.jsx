import { Link } from "react-router-dom";
import { AuthShell, AuthHeading, OrDivider, SocialButtons } from "../components/auth/AuthShell";
import { Button, Input } from "../components/ui";
import { AnimatedContent, BorderGlow } from "../components/animated";
import { MailIcon, LockIcon, ArrowRight } from "../components/icons";

export default function LoginPage() {
  function handleSubmit(e) {
    e.preventDefault();
    // TODO: gọi API POST /api/auth/login
  }

  return (
    <AuthShell>
      <AnimatedContent>
      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <AuthHeading title="Chào mừng trở lại!" subtitle="Khám phá phiên bản tóc đẹp nhất của bạn với AI." />

        <div className="flex flex-col gap-6">
          <Input label="Email" type="email" name="email" placeholder="example@hairapy.ai" icon={<MailIcon />} />
          <Input
            label="Mật khẩu" name="password" placeholder="••••••••" icon={<LockIcon />} togglePassword
            rightSlot={<Link to="/forgot-password" className="text-xs font-bold text-brand">Quên mật khẩu?</Link>}
          />
          <BorderGlow rounded="rounded-full" thickness={2} className="w-full block"><Button type="submit" variant="brand" className="w-full" icon={<ArrowRight />}>Đăng nhập</Button></BorderGlow>
        </div>

        <OrDivider label="Hoặc đăng nhập bằng" />
        <SocialButtons />

        <p className="pt-4 text-center text-base text-mauve">
          Chưa có tài khoản?{" "}
          <Link to="/register" className="font-bold text-brand">Đăng ký ngay</Link>
        </p>
      </form>
      </AnimatedContent>
    </AuthShell>
  );
}
