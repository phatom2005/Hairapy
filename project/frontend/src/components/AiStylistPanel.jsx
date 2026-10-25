import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import useAuthStore from "../store/useAuthStore";
import { useScanStore } from "../store/useScanStore";
import { Button } from "./ui";
import PremiumGateModal from "./PremiumGateModal";

const SUGGESTED_PROMPTS = [
  "Kiểu nào hợp đi làm văn phòng?",
  "Tóc mình mỏng thì nên cắt sao?",
  "Kiểu này chăm sóc có khó không?",
];

export default function AiStylistPanel({ hairstyleId = null, defaultOpen = false, className = "" }) {
  const { user } = useAuthStore();
  const { analysisResult } = useScanStore();
  const queryClient = useQueryClient();
  const msgIdRef = useRef(0);

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [question, setQuestion] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [isConsulting, setIsConsulting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showGate, setShowGate] = useState(false);

  const isPremium =
    user?.role === "ADMIN" || user?.role === "TESTER" || user?.plan === "PREMIUM";

  const { data: usageData } = useQuery({
    queryKey: ["usage-summary"],
    queryFn: async () => {
      const res = await api.get("/usage/me");
      return res.data;
    },
    enabled: !!user,
  });

  // BE trả FeatureUsage(used, limit, unlimited) — không có field "remaining"; Admin/Tester có limit = Integer.MAX_VALUE
  const stylistQuota = usageData?.aiStylist;
  const unlimitedQuota = !!stylistQuota?.unlimited;
  const limit = stylistQuota?.limit ?? 5;
  const remaining = Math.max(limit - (stylistQuota?.used ?? 0), 0);
  const quotaLabel = unlimitedQuota ? "Không giới hạn lượt" : `Còn ${remaining}/${limit} lượt`;

  const handleSend = async (textToSend) => {
    const q = (textToSend || question).trim();
    if (!q || isConsulting) return;

    if (!user) {
      setShowGate(true);
      return;
    }

    if (!isPremium) {
      setShowGate(true);
      return;
    }

    setIsConsulting(true);
    setErrorMsg(null);

    msgIdRef.current += 1;
    const userEntry = { id: msgIdRef.current, role: "user", text: q };
    setChatLog((prev) => [...prev, userEntry]);
    setQuestion("");

    try {
      const payload = {
        question: q,
        faceShape: analysisResult?.faceShape || null,
        hairType: analysisResult?.hairType || null,
        hairstyleId: hairstyleId || null,
      };

      const res = await api.post("/stylist/consult", payload);
      const answer = res.data?.answer || "AI không thể đưa ra câu trả lời lúc này.";

      msgIdRef.current += 1;
      setChatLog((prev) => [
        ...prev,
        { id: msgIdRef.current, role: "assistant", text: answer },
      ]);
      queryClient.invalidateQueries({ queryKey: ["usage-summary"] });
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;

      if (status === 403 && data?.requiresPremium) {
        setShowGate(true);
      } else if (status === 429) {
        setErrorMsg("Bạn đã dùng hết 5 lượt tư vấn hôm nay.");
      } else if (status === 504) {
        setErrorMsg(data?.error || "AI xử lý quá lâu. Lượt của bạn đã được hoàn lại, vui lòng thử lại.");
      } else {
        setErrorMsg(data?.error || "AI Stylist đang bận. Vui lòng thử lại sau ít phút.");
      }
    } finally {
      setIsConsulting(false);
    }
  };

  return (
    <div className={`overflow-hidden rounded-3xl border border-line bg-canvas shadow-sm transition-all ${className}`}>
      {/* Header Bar */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 sm:p-5 text-left transition-colors hover:bg-line/20"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary/20 via-primary/10 to-transparent text-primary text-xl">
            ✨
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-ink">AI Stylist 1:1</h3>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                Gói Tháng
              </span>
            </div>
            <p className="text-xs text-mauve">Tư vấn kiểu tóc cá nhân hoá theo dáng mặt và chất tóc</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isPremium && (
            <span className="hidden sm:inline-block rounded-xl border border-divider/10 bg-white px-2.5 py-1 text-xs font-semibold text-muted">
              {quotaLabel}
            </span>
          )}
          <span className="text-mauve transition-transform duration-200" style={{ transform: isOpen ? "rotate(180deg)" : "none" }}>
            ▼
          </span>
        </div>
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div className="border-t border-line/60 p-4 sm:p-6">
          {!isPremium ? (
            /* Locked Preview State for Non-Premium Users */
            <div className="relative rounded-2xl border border-divider/10 bg-white p-5 overflow-hidden">
              <div className="mb-4">
                <span className="text-xs font-bold text-muted">Câu hỏi mẫu:</span>
                <p className="mt-1 font-semibold text-ink text-sm">
                  &ldquo;Khuôn mặt tròn, trán ngắn thì nên để kiểu mái nào để gương mặt thon gọn hơn?&rdquo;
                </p>
              </div>

              <div className="relative">
                <div className="select-none blur-[5px] opacity-40 text-sm leading-relaxed text-ink">
                  Với dáng mặt tròn và trán ngắn, bạn nên chọn các kiểu mái bay dài qua gò má hoặc mái thưa rẽ ngôi lệch nhẹ 7:3. Tránh tuyệt đối mái bằng dày vì sẽ làm tỉ lệ khuôn mặt ngắn lại. Hãy kết hợp tỉa layer nhẹ nhàng ở phần đuôi để ôm lấy xương quai hàm, tạo cảm giác thanh thoát hơn...
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-xs p-4 text-center">
                  <div className="mb-2 size-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-xl">
                    🔒
                  </div>
                  <p className="text-sm font-bold text-ink">
                    Mở khóa AI Stylist riêng của bạn
                  </p>
                  <p className="mt-1 max-w-sm text-xs text-mauve">
                    Trò chuyện trực tiếp cùng trợ lý AI Stylist để chọn kiểu, tư vấn uốn nhuộm và cách chăm sóc phù hợp dáng mặt.
                  </p>
                  <Button
                    onClick={() => setShowGate(true)}
                    size="sm"
                    className="mt-3.5 shadow-sm text-xs"
                  >
                    Mở khóa với Gói Tháng
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Active AI Stylist Chat for Premium Users */
            <div className="flex flex-col gap-4">
              {/* Quota Bar Mobile */}
              <div className="flex sm:hidden items-center justify-between rounded-xl bg-white p-2.5 border border-divider/10 text-xs">
                <span className="text-muted">Hạn mức hôm nay:</span>
                <span className="font-bold text-ink">{unlimitedQuota ? "Không giới hạn" : `${remaining} / ${limit} lượt`}</span>
              </div>

              {/* Chat Log */}
              {chatLog.length > 0 ? (
                <div className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
                  {chatLog.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col rounded-2xl p-3.5 text-sm ${
                        msg.role === "user"
                          ? "ml-auto max-w-[85%] bg-primary text-white"
                          : "mr-auto max-w-[95%] border border-divider/10 bg-white text-ink"
                      }`}
                    >
                      <span className={`text-[11px] font-bold mb-1 ${msg.role === "user" ? "text-white/80" : "text-primary"}`}>
                        {msg.role === "user" ? "Bạn" : "✨ AI Stylist"}
                      </span>
                      <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                    </div>
                  ))}
                  {isConsulting && (
                    <div className="mr-auto flex items-center gap-2 rounded-2xl border border-divider/10 bg-white p-3 text-xs text-mauve animate-pulse">
                      <span>✨</span> AI Stylist đang phân tích và viết gợi ý...
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-divider/20 bg-white/50 p-4 text-center">
                  <p className="text-xs text-mauve">
                    Hỏi bất kỳ điều gì về tạo kiểu, uốn duỗi, nhuộm màu hoặc phối đồ theo khuôn mặt.
                  </p>
                </div>
              )}

              {/* Error Message */}
              {errorMsg && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-semibold text-red-600">
                  {errorMsg}
                </div>
              )}

              {/* Suggested Prompts */}
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={isConsulting}
                    onClick={() => handleSend(prompt)}
                    className="rounded-full border border-divider/15 bg-white px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                  >
                    💬 {prompt}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex flex-col gap-2"
              >
                <div className="relative">
                  <textarea
                    rows={2}
                    maxLength={500}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Nhập câu hỏi cho AI Stylist (ví dụ: Mặt trái xoan có hợp uốn con sâu không?)..."
                    disabled={isConsulting}
                    className="w-full resize-none rounded-2xl border border-line bg-white p-3 pr-16 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-hidden disabled:bg-line/20"
                  />
                  <span className="absolute bottom-2.5 right-3 text-[11px] text-muted">
                    {question.length}/500
                  </span>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!question.trim() || isConsulting}
                    className="text-xs"
                  >
                    {isConsulting ? "Đang gửi..." : "Gửi câu hỏi"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Paywall Gate */}
      <PremiumGateModal
        isOpen={showGate}
        onClose={() => setShowGate(false)}
        reason="stylist"
      />
    </div>
  );
}
