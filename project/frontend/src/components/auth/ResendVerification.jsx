import { useEffect, useState } from "react";
import { Button } from "../ui";
import api from "../../lib/api";

// Thời gian chờ giữa 2 lần gửi lại — khớp cooldown 60s ở backend (EmailVerificationService)
const COOLDOWN_SECONDS = 60;

/**
 * Nút "Gửi lại email xác minh" có đếm ngược cooldown.
 * initialCooldown > 0 khi vừa mới gửi mail (vd. ngay sau đăng ký) để tránh bấm lại quá sớm.
 */
export default function ResendVerification({ email, initialCooldown = 0 }) {
  const [secondsLeft, setSecondsLeft] = useState(initialCooldown);
  const [sending, setSending] = useState(false);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const handleResend = async () => {
    setSending(true);
    setInfo("");
    setError("");
    try {
      await api.post("/auth/resend-verification", { email });
      setInfo("Đã gửi lại email xác minh. Vui lòng kiểm tra hộp thư (kể cả mục Spam).");
      setSecondsLeft(COOLDOWN_SECONDS);
    } catch {
      setError("Không thể gửi lại email lúc này. Vui lòng thử lại sau.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleResend}
        disabled={sending || secondsLeft > 0}
      >
        {sending
          ? "Đang gửi..."
          : secondsLeft > 0
            ? `Gửi lại email xác minh (${secondsLeft}s)`
            : "Gửi lại email xác minh"}
      </Button>
      {info && <p className="text-center text-sm font-semibold text-primary">{info}</p>}
      {error && <p className="text-center text-sm font-semibold text-rose-600">{error}</p>}
    </div>
  );
}
