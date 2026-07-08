import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthShell, AuthHeading, OrDivider, SocialButtons } from "../components/auth/AuthShell";
import { Button, Input } from "../components/ui";
import { AnimatedContent, BorderGlow } from "../components/animated";
import { MailIcon, LockIcon, ArrowRight } from "../components/icons";
import useAuthStore from "../store/useAuthStore";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, error, clearError } = useAuthStore();

  const from = location.state?.from || "/profile";
  const message = location.state?.message;

  // Xóa các lỗi cũ khi mở trang đăng nhập
  useEffect(() => {
    clearError();
  }, [clearError]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) return;
    try {
      const success = await login(email, password);
      if (success) {
        navigate(from);
      }
    } catch {
      // Lỗi đã được lưu trữ trong store và hiển thị trên giao diện
    }
  }

  return (
    <AuthShell>
      <AnimatedContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <AuthHeading title="Chào mừng trở lại!" subtitle="Khám phá phiên bản tóc đẹp nhất của bạn với AI." />

          {error && (
            <div className="rounded-2xl border border-[#ba1a1a]/20 bg-[#ba1a1a]/5 p-4 text-center text-sm font-semibold text-[#ba1a1a]">
              {error}
            </div>
          )}

          {message && !error && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center text-sm font-semibold text-primary">
              ℹ️ {message}
            </div>
          )}

          <div className="flex flex-col gap-6">
            <Input
              label="Email"
              type="email"
              name="email"
              placeholder="example@hairapy.ai"
              icon={<MailIcon />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Mật khẩu"
              name="password"
              placeholder="••••••••"
              icon={<LockIcon />}
              togglePassword
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              rightSlot={
                <span
                  className="text-xs font-bold text-mauve/50 cursor-not-allowed select-none"
                  title="Tính năng đang phát triển, sắp ra mắt"
                >
                  Quên mật khẩu?
                </span>
              }
            />
            <BorderGlow rounded="rounded-full" thickness={2} className="w-full block">
              <Button
                type="submit"
                variant="brand"
                className="w-full"
                icon={<ArrowRight />}
                disabled={loading}
              >
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </Button>
            </BorderGlow>
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
