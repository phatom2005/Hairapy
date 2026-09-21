import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../lib/api";
import useAuthStore from "../store/useAuthStore";

const LABELS = {
  FACE_SCAN: "phân tích khuôn mặt",
  HAIR_SWAP: "thử kiểu tóc",
};

// Hiển thị "Còn X/Y lượt [tính năng] hôm nay" — đặt ngay trước nút hành động để user biết trước khi bấm,
// thay vì chỉ biết khi bị lỗi 429 "Bạn đã hết lượt...".
export default function QuotaBadge({ feature }) {
  const token = useAuthStore((s) => s.token);

  const { data, isLoading } = useQuery({
    queryKey: ["usage-summary"],
    queryFn: async () => {
      const { data } = await api.get("/usage/me");
      return data;
    },
    enabled: !!token,
    staleTime: 30_000,
  });

  if (!token || isLoading || !data) return null;

  const key = feature === "HAIR_SWAP" ? "hairSwap" : "faceScan";
  const { used, limit, unlimited } = data[key];

  if (unlimited) {
    return (
      <p className="text-xs font-semibold text-mauve">
        Không giới hạn lượt {LABELS[feature]} (tài khoản Admin/Tester).
      </p>
    );
  }

  const remaining = Math.max(limit - used, 0);
  const isOut = remaining === 0;

  return (
    <p className={`text-xs font-semibold ${isOut ? "text-red-500" : "text-mauve"}`}>
      {isOut ? (
        <>
          Bạn đã hết lượt {LABELS[feature]} hôm nay.{" "}
          <Link to="/pricing" className="underline text-primary">Nâng cấp Premium</Link> để có thêm lượt.
        </>
      ) : (
        <>Còn {remaining}/{limit} lượt {LABELS[feature]} hôm nay.</>
      )}
    </p>
  );
}
