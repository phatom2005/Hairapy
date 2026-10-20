import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";

// Màu thanh tiến độ theo phần còn lại: xanh (ổn) → vàng (sắp hết) → đỏ (rất thấp)
const COLOR_OK = "#9fc93c";
const COLOR_WARN = "#f5a524";
const COLOR_LOW = "#e5484d";

const nf = new Intl.NumberFormat("vi-VN");

function leftColor(percentLeft) {
  if (percentLeft == null) return COLOR_OK;
  if (percentLeft <= 10) return COLOR_LOW;
  if (percentLeft <= 30) return COLOR_WARN;
  return COLOR_OK;
}

function Bar({ percent, color }) {
  const width = Math.min(100, Math.max(0, percent ?? 0));
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-canvas">
      <div className="h-full rounded-full transition-all" style={{ width: `${width}%`, backgroundColor: color }} />
    </div>
  );
}

function ErrorLine({ text }) {
  return <p className="rounded-xl bg-canvas px-3 py-2 text-xs font-semibold text-muted">{text}</p>;
}

/**
 * Hạn mức còn lại của AILabTools và Cloudinary (backend cache 10 phút).
 * Lỗi tải chỉ ẩn trong widget này, không ảnh hưởng phần còn lại của dashboard.
 */
export default function QuotaPanel() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-quota"],
    queryFn: async () => (await api.get("/admin/quota")).data,
    staleTime: 5 * 60_000,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await api.get("/admin/quota", { params: { refresh: true } });
      queryClient.setQueryData(["admin-quota"], res.data);
    } catch (err) {
      console.error("Không làm mới được quota:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchedAt = data?.fetchedAt ? new Date(data.fetchedAt) : null;
  const fetchedLabel =
    fetchedAt && !isNaN(fetchedAt.getTime())
      ? fetchedAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
      : null;

  return (
    <section className="rounded-3xl border border-line bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-ink">Hạn mức dịch vụ bên thứ 3</h3>
          <p className="mt-0.5 text-xs text-muted">
            AILabTools và Cloudinary{fetchedLabel ? ` · cập nhật lúc ${fetchedLabel}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing || isLoading}
          className="rounded-xl border border-line px-3 py-1.5 text-xs font-semibold text-mauve transition hover:text-ink disabled:opacity-50"
        >
          {refreshing ? "Đang tải..." : "Làm mới"}
        </button>
      </div>

      {isLoading ? (
        <div className="h-24 animate-pulse rounded-2xl bg-line" />
      ) : error || !data ? (
        <ErrorLine text="Không tải được hạn mức dịch vụ." />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-mauve">AILabTools (credit còn lại)</p>
            {data.ailab?.error ? (
              <ErrorLine text={data.ailab.error} />
            ) : !data.ailab?.items?.length ? (
              <ErrorLine text="Chưa có dữ liệu credit." />
            ) : (
              <ul className="space-y-3">
                {data.ailab.items.map((i) => (
                  <li key={i.name}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-semibold text-ink">{i.name}</span>
                      <span className="text-mauve">
                        <b className="text-ink">{nf.format(i.balance)}</b>
                        {i.total != null ? ` / ${nf.format(i.total)}` : ""}
                        {i.percentLeft != null ? ` (${i.percentLeft}%)` : ""}
                      </span>
                    </div>
                    <Bar percent={i.percentLeft ?? 100} color={leftColor(i.percentLeft)} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-mauve">Cloudinary (credits đã dùng)</p>
            {data.cloudinary?.error ? (
              <ErrorLine text={data.cloudinary.error} />
            ) : data.cloudinary?.usedPercent == null ? (
              <ErrorLine text="Chưa có dữ liệu credits." />
            ) : (
              <div>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-ink">Gói {data.cloudinary.plan ?? "—"}</span>
                  <span className="text-mauve">
                    <b className="text-ink">{data.cloudinary.usedPercent}%</b>
                    {data.cloudinary.usage != null && data.cloudinary.limit != null
                      ? ` · ${nf.format(data.cloudinary.usage)} / ${nf.format(data.cloudinary.limit)}`
                      : ""}
                  </span>
                </div>
                <Bar percent={data.cloudinary.usedPercent} color={leftColor(100 - data.cloudinary.usedPercent)} />
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
