import { Link } from "react-router-dom";
import { AuthShell, AuthHeading, OrDivider, SocialButtons } from "../components/auth/AuthShell";
import { Button, Input } from "../components/ui";
import { AnimatedContent, BorderGlow } from "../components/animated";
import { MailIcon, LockIcon, UserIcon, ShieldIcon, ArrowRight, ChevronLeft } from "../components/icons";

export default function RegisterPage() {
  function handleSubmit(e) {
    e.preventDefault();
    // TODO: gọi API POST /api/auth/register
  }

  return (
    <AuthShell>
      <AnimatedContent>
      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <AuthHeading title="Tạo tài khoản mới" subtitle="Khám phá phiên bản tóc đẹp nhất của bạn với AI." />

        <div className="flex flex-col gap-5">
          <Input label="Họ và tên" name="fullName" placeholder="Nguyễn Văn A" icon={<UserIcon />} />
          <Input label="Email" type="email" name="email" placeholder="example@hairapy.ai" icon={<MailIcon />} />
          <Input label="Mật khẩu" name="password" placeholder="••••••••" icon={<LockIcon />} togglePassword />
          <Input label="Xác nhận mật khẩu" name="confirm" placeholder="••••••••" icon={<ShieldIcon />} togglePassword />
          <BorderGlow rounded="rounded-full" thickness={2} className="w-full block"><Button type="submit" variant="brand" className="w-full" icon={<ArrowRight />}>Đăng ký ngay</Button></BorderGlow>
        </div>

        <OrDivider label="Hoặc tiếp tục với" />
        <SocialButtons />

        <p className="pt-4 text-center text-base text-mauve">
          Đã có tài khoản?{" "}
          <Link to="/login" className="font-bold text-brand">Đăng nhập</Link>
        </p>

        <Link to="/" className="flex items-center justify-center gap-2 text-xs font-bold tracking-wide text-muted hover:text-mauve">
          <ChevronLeft /> Trang chủ
        </Link>
      </form>
      </AnimatedContent>
    </AuthShell>
  );
}
