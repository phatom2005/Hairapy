import { useState } from "react";
import useAuthStore from "../store/useAuthStore";
import api from "../lib/api";
import { Card, Button } from "./ui";

export default function FeedbackWidget({ feature }) {
  const token = useAuthStore((state) => state.token);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  if (!token) return null;

  if (submitted) {
    return (
      <Card className="border border-emerald-200 bg-emerald-50/50 p-5 text-center rounded-2xl">
        <div className="flex flex-col items-center justify-center gap-1.5 text-emerald-700">
          <span className="text-2xl">✨</span>
          <p className="font-bold text-sm">Cảm ơn bạn đã đánh giá!</p>
          <p className="text-xs text-emerald-600">
            Ý kiến đóng góp của bạn giúp Hairapy ngày càng hoàn thiện hơn.
          </p>
        </div>
      </Card>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      await api.post("/feedback", {
        rating,
        comment: comment.trim() || null,
        feature,
      });
      setSubmitted(true);
    } catch (err) {
      if (err.response?.status === 429) {
        setErrorMessage(err.response.data?.error || "Bạn đã gửi quá nhiều đánh giá hôm nay.");
      } else {
        setErrorMessage("Không gửi được, thử lại sau.");
      }
    } finally {
      setLoading(false);
    }
  };

  const starLabels = ["Rất tệ", "Tệ", "Bình thường", "Hài lòng", "Rất hài lòng"];

  return (
    <Card className="border border-divider/10 p-5 rounded-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <h4 className="font-bold text-ink text-sm">Đánh giá trải nghiệm của bạn</h4>
          <p className="text-xs text-muted mt-0.5">
            Bạn cảm thấy kết quả {feature === "FACE_SCAN" ? "quét khuôn mặt" : "thử kiểu tóc"} thế nào?
          </p>
        </div>

        {/* Stars */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = (hoverRating || rating) >= star;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onFocus={() => setHoverRating(star)}
                  onBlur={() => setHoverRating(0)}
                  aria-label={`${star} sao - ${starLabels[star - 1]}`}
                  className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none"
                >
                  <span className={active ? "text-amber-400" : "text-gray-300"}>★</span>
                </button>
              );
            })}
          </div>
          {(hoverRating || rating) > 0 && (
            <span className="text-xs font-semibold text-amber-600 ml-1">
              {starLabels[(hoverRating || rating) - 1]}
            </span>
          )}
        </div>

        {/* Comment Box */}
        <div className="space-y-1">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            placeholder="Chia sẻ nhận xét hoặc góp ý để chúng mình cải thiện nhé (không bắt buộc)..."
            rows={2}
            maxLength={500}
            className="w-full rounded-xl border border-line bg-canvas p-3 text-xs text-ink placeholder:text-muted outline-none transition focus:border-brand resize-none"
          />
          <div className="flex justify-between items-center text-[10px] text-muted px-1">
            <span>{errorMessage && <strong className="text-red-500 font-semibold">{errorMessage}</strong>}</span>
            <span>{comment.length}/500 ký tự</span>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          size="sm"
          disabled={!rating || loading}
          className="rounded-xl px-4 py-2 text-xs font-bold"
        >
          {loading ? "Đang gửi..." : "Gửi đánh giá"}
        </Button>
      </form>
    </Card>
  );
}
