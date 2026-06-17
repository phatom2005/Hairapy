import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell, AuthHeading, OrDivider, SocialButtons } from "../components/auth/AuthShell";
import { Button, Input } from "../components/ui";
import { AnimatedContent, BorderGlow } from "../components/animated";
import { MailIcon, LockIcon, ShieldIcon, ArrowRight, ChevronLeft } from "../components/icons";
import useAuthStore from "../store/useAuthStore";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState("");
  
  const navigate = useNavigate();
  const { register, loading, error, clearError } = useAuthStore();

  // Xóa các lỗi cũ khi mở trang đăng ký
  useEffect(() => {
    clearError();
    setLocalError("");
  }, [clearError]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError("");

    if (!email || !password || !confirm) {
      setLocalError("Vui lòng điền đầy đủ các thông tin bắt buộc");
      return;
    }

    if (password !== confirm) {
      setLocalError("Mật khẩu xác nhận không khớp");
      return;
    }

    try {
      const success = await register(email, password, confirm);
      if (success) {
        navigate("/profile");
      }
    } catch (err) {
      // Lỗi từ server đã được lưu trữ trong store và hiển thị trên giao diện
    }
  }

  const activeError = localError || error;

  return (
    <AuthShell>
      <AnimatedContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <AuthHeading title="Tạo tài khoản mới" subtitle="Khám phá phiên bản tóc đẹp nhất của bạn với AI." />

          {activeError && (
            <div className="rounded-2xl border border-[#ba1a1a]/20 bg-[#ba1a1a]/5 p-4 text-center text-sm font-semibold text-[#ba1a1a]">
              {activeError}
            </div>
          )}

          <div className="flex flex-col gap-5">
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
            />
            <Input
              label="Xác nhận mật khẩu"
              name="confirm"
              placeholder="••••••••"
              icon={<ShieldIcon />}
              togglePassword
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            <BorderGlow rounded="rounded-full" thickness={2} className="w-full block">
              <Button
                type="submit"
                variant="brand"
                className="w-full"
                icon={<ArrowRight />}
                disabled={loading}
              >
                {loading ? "Đang đăng ký..." : "Đăng ký ngay"}
              </Button>
            </BorderGlow>
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
