import { useState } from "react";
import api from "../../lib/api";
import { Button, Input } from "../ui";
import { PLAN_LABEL } from "../../lib/plans";

export default function GrantSubscriptionForm({
  initialEmail = "",
  lockEmail = false,
  onSuccess,
  onCancel,
}) {
  const [email, setEmail] = useState(initialEmail);
  const [plan, setPlan] = useState("PREMIUM");
  const [days, setDays] = useState("30");
  const [mode, setMode] = useState("EXTEND");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePlanChange = (newPlan) => {
    setPlan(newPlan);
    if (!days || days === "7" || days === "30") {
      setDays(newPlan === "PRO" ? "7" : "30");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Vui lòng nhập email người dùng.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        email: email.trim(),
        plan,
        days: days ? parseInt(days, 10) : null,
        mode,
      };

      await api.post("/admin/subscriptions/grant", payload);
      onSuccess?.();
    } catch (err) {
      console.error("Lỗi khi cấp gói:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Cấp gói dịch vụ thất bại. Vui lòng kiểm tra lại.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-semibold text-red-600">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-ink mb-1.5">
          Email người dùng <span className="text-red-500">*</span>
        </label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={lockEmail || loading}
          placeholder="user@example.com"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-ink mb-1.5">
            Gói dịch vụ <span className="text-red-500">*</span>
          </label>
          <select
            value={plan}
            onChange={(e) => handlePlanChange(e.target.value)}
            disabled={loading}
            className="w-full rounded-2xl border border-line bg-white p-3 text-sm text-ink focus:border-primary focus:outline-hidden disabled:bg-line/20"
          >
            <option value="PRO">{PLAN_LABEL.PRO} (7 ngày)</option>
            <option value="PREMIUM">{PLAN_LABEL.PREMIUM} (30 ngày)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink mb-1.5">
            Số ngày cấp
          </label>
          <Input
            type="number"
            min="1"
            max="365"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            disabled={loading}
            placeholder="Số ngày (vd: 30)"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-ink mb-1.5">
          Chế độ áp dụng
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("EXTEND")}
            className={`rounded-xl border p-2.5 text-left transition-all ${
              mode === "EXTEND"
                ? "border-primary bg-primary/5 text-primary font-bold"
                : "border-line bg-white text-mauve hover:text-ink"
            }`}
          >
            <p className="text-xs">Gia hạn (Cộng dồn)</p>
            <p className="text-[10px] text-muted font-normal mt-0.5">
              Cộng thêm vào hạn còn lại
            </p>
          </button>
          <button
            type="button"
            onClick={() => setMode("REPLACE")}
            className={`rounded-xl border p-2.5 text-left transition-all ${
              mode === "REPLACE"
                ? "border-primary bg-primary/5 text-primary font-bold"
                : "border-line bg-white text-mauve hover:text-ink"
            }`}
          >
            <p className="text-xs">Thay thế (Tính lại)</p>
            <p className="text-[10px] text-muted font-normal mt-0.5">
              Hủy gói cũ, tính từ hôm nay
            </p>
          </button>
        </div>
        <p className="text-[11px] text-muted mt-1.5">
          * Gia hạn: cộng thêm vào hạn còn lại · Thay thế: huỷ gói cũ, tính lại từ hôm nay
        </p>
      </div>

      <div className="mt-2 flex justify-end gap-2.5 pt-2 border-t border-line/60">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="text-xs"
          >
            Hủy
          </Button>
        )}
        <Button
          type="submit"
          disabled={loading}
          className="text-xs font-bold"
        >
          {loading ? "Đang xử lý..." : "Cấp gói ngay"}
        </Button>
      </div>
    </form>
  );
}
