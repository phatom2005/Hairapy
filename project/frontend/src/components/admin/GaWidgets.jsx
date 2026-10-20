import { nf } from "./gaUtils";

export function Bar({ value, max, color = "#6d3fd6" }) {
  const w = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-canvas">
      <div className="h-full rounded-full" style={{ width: `${w}%`, backgroundColor: color }} />
    </div>
  );
}

export function Stat({ label, value, hint }) {
  return (
    <div className="rounded-2xl bg-canvas px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-ink">{value}</p>
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

/** Danh sách thanh ngang: rows = [{label, value, note, color}] */
export function List({ title, rows, empty }) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  return (
    <div>
      {title && <p className="mb-2 text-xs font-bold uppercase tracking-wide text-mauve">{title}</p>}
      {rows.length === 0 ? (
        <p className="rounded-xl bg-canvas px-3 py-2 text-xs font-semibold text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {rows.map((r) => (
            <li key={r.label} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="min-w-0 truncate font-semibold text-ink" title={r.label}>{r.label}</span>
                <span className="shrink-0 font-bold text-ink">
                  {nf.format(r.value)}
                  {r.note && <span className="ml-1 font-normal text-muted">{r.note}</span>}
                </span>
              </div>
              <Bar value={r.value} max={max} color={r.color} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Section({ title, subtitle, children, className = "" }) {
  return (
    <section className={`rounded-3xl border border-line bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4">
        <h3 className="text-sm font-bold text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

/** Biểu đồ cột đơn giản: items = [{label, value}] (dùng cho theo ngày / theo giờ). */
export function Columns({ items, color = "#6d3fd6", labelEvery = 1 }) {
  const max = Math.max(0, ...items.map((i) => i.value));
  return (
    <div>
      <div className="flex h-36 items-end gap-[3px]">
        {items.map((i) => (
          <div key={i.label} className="flex h-full min-w-0 flex-1 items-end" title={`${i.label}: ${nf.format(i.value)}`}>
            <div
              className="w-full rounded-t"
              style={{ height: `${max > 0 ? Math.max(2, (i.value / max) * 100) : 0}%`, backgroundColor: color }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-[3px]">
        {items.map((i, idx) => (
          <span key={i.label} className="min-w-0 flex-1 overflow-hidden text-center text-[9px] text-muted">
            {idx % labelEvery === 0 ? i.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
