import { useState } from "react";
import { Columns, List, Section, Stat } from "../../components/admin/GaWidgets";
import {
  CHANNEL_LABEL, DEVICE_LABEL, EVENT_LABEL, FACE_SHAPE_LABEL, FUNNEL, HAIR_COLOR_LABEL, PERIODS, VISITOR_LABEL,
  deltaText, fmtDuration, fmtGaDate, nf, toRows, useGaData, useGaRealtime,
} from "../../components/admin/gaUtils";

const LANG_LABEL = { vi: "Tiếng Việt", en: "Tiếng Anh", "en-us": "Tiếng Anh (Mỹ)", "vi-vn": "Tiếng Việt (VN)" };
const PREV_KEYS = ["activeUsers", "newUsers", "sessions", "screenPageViews", "engagementRate", "averageSessionDuration", "keyEvents"];

/** Khối "Đang online" (GA4 realtime, 30 phút qua), tự làm mới mỗi 30 giây. */
function RealtimeCard() {
  const { data, isLoading } = useGaRealtime();
  const countries = toRows(data?.countries, { limit: 5 });
  const pages = toRows(data?.pages, { limit: 5 });
  const devices = toRows(data?.devices, { labelMap: DEVICE_LABEL });
  return (
    <Section title="Đang online" subtitle="Người dùng trong 30 phút qua, tự cập nhật mỗi 30 giây">
      {isLoading ? (
        <div className="h-20 animate-pulse rounded-2xl bg-line" />
      ) : data?.error ? (
        <p className="text-xs font-semibold text-muted">{data.error}</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-4">
          <div className="rounded-2xl bg-canvas px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Người dùng đang hoạt động</p>
            <p className="mt-1 text-3xl font-extrabold text-ink">{nf.format(data?.activeUsers || 0)}</p>
          </div>
          <List title="Quốc gia" rows={countries} empty="Không có ai đang online." />
          <List title="Trang đang xem" rows={pages} empty="Không có ai đang online." />
          <List title="Thiết bị" rows={devices} empty="Không có ai đang online." />
        </div>
      )}
    </Section>
  );
}

const NEED_DIM = "Chưa có dữ liệu. Cần đăng ký custom dimension trong GA4 (Quản trị → Định nghĩa tùy chỉnh) và đợi khoảng 24 giờ.";

export default function AdminGaPage() {
  const [days, setDays] = useState(30);
  const { data, isLoading, error, refreshing, refresh } = useGaData(days);

  const o = data?.overview || {};
  const x = data?.extra || {};
  const eventCount = (name) => data?.events?.find((r) => r.dims[0] === name)?.metrics[0] ?? 0;
  const fetchedAt = data?.fetchedAt ? new Date(data.fetchedAt) : null;
  const prevRow = x.prevOverview?.[0]?.metrics;
  const prev = (key) => prevRow?.[PREV_KEYS.indexOf(key)];
  const hint = (key) => deltaText(o[key] || 0, prev(key));

  // Chuyển đổi theo kênh: sự kiện chính / phiên
  const conversion = (data?.channels || [])
    .map((r) => ({
      label: CHANNEL_LABEL[r.dims[0]] || r.dims[0],
      value: r.metrics[0] > 0 ? Math.round((r.metrics[2] / r.metrics[0]) * 100) : 0,
      unit: "%",
      note: `· ${nf.format(r.metrics[2])} sự kiện chính / ${nf.format(r.metrics[0])} phiên`,
      color: "#2f9e5e",
    }))
    .sort((a, b) => b.value - a.value);
  const topPages = (x.topPages || []).slice(0, 15).map((r) => ({
    label: r.dims[0],
    value: r.metrics[0],
    note: `· ${nf.format(r.metrics[1])} người · TB ${fmtDuration(r.metrics[2])}`,
  }));
  const revenue = (x.revenueBySource || [])
    .filter((r) => r.metrics[0] > 0)
    .map((r) => ({ label: r.dims[0], value: r.metrics[0], unit: " đ", note: `· ${nf.format(r.metrics[1])} giao dịch`, color: "#2f9e5e" }));

  const funnel = FUNNEL.map((name, i) => {
    const value = eventCount(name);
    const prev = i > 0 ? eventCount(FUNNEL[i - 1]) : 0;
    return {
      label: EVENT_LABEL[name],
      value,
      note: i > 0 && prev > 0 ? `· ${Math.round((value / prev) * 100)}% so với bước trước` : "",
      color: "#2f9e5e",
    };
  });
  const otherEvents = (data?.events || [])
    .filter((r) => !FUNNEL.includes(r.dims[0]) && r.dims[0] !== "page_timing" && r.dims[0] !== "page_view")
    .map((r) => ({ label: EVENT_LABEL[r.dims[0]] || r.dims[0], value: r.metrics[0], note: `· ${nf.format(r.metrics[1])} người`, color: "#8e949b" }));
  const social = (data?.social || []).map((r) => ({
    label: r.platform, value: r.sessions, note: `· ${nf.format(r.users)} người · ${nf.format(r.keyEvents)} sự kiện chính`, color: "#e0457b",
  }));

  const daily = (data?.daily || []).map((r) => ({ label: fmtGaDate(r.dims[0]), users: r.metrics[0], sessions: r.metrics[1] }));
  const hours = Array.from({ length: 24 }, (_, h) => ({
    label: String(h),
    value: x.hours?.find((r) => Number(r.dims[0]) === h)?.metrics[0] ?? 0,
  }));

  // Thống kê theo nguồn đầu tiên (first-touch) từ custom dimension ft_source
  const signupBySource = {};
  (x.signupSources || []).forEach((r) => {
    const [src, ev] = r.dims;
    if (!src || src === "(not set)") return;
    signupBySource[src] = signupBySource[src] || {};
    signupBySource[src][ev] = (signupBySource[src][ev] || 0) + r.metrics[0];
  });
  const signupRows = Object.entries(signupBySource)
    .map(([src, evs]) => ({
      label: src,
      value: evs.sign_up || 0,
      note: `· quét ${evs.face_scan || 0} · thử tóc ${evs.hair_swap || 0} · mua ${evs.purchase || 0}`,
      color: "#e0457b",
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Google Analytics</h1>
          <p className="text-sm text-muted">
            Báo cáo chi tiết GA4
            {fetchedAt && !isNaN(fetchedAt.getTime())
              ? ` · cập nhật lúc ${fetchedAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-line bg-white p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setDays(p.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  days === p.value ? "bg-ink text-white" : "text-mauve hover:text-ink"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing || isLoading}
            className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-mauve transition hover:text-ink disabled:opacity-50"
          >
            {refreshing ? "Đang tải..." : "Làm mới"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-3xl bg-line" />
      ) : error || !data ? (
        <p className="rounded-2xl bg-white p-5 text-sm font-semibold text-muted">Không tải được dữ liệu GA4.</p>
      ) : data.error ? (
        <p className="rounded-2xl bg-white p-5 text-sm font-semibold text-muted">{data.error}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            <Stat label="Người dùng" value={nf.format(o.activeUsers || 0)} hint={hint("activeUsers")} />
            <Stat label="Người dùng mới" value={nf.format(o.newUsers || 0)} hint={hint("newUsers")} />
            <Stat label="Phiên" value={nf.format(o.sessions || 0)} hint={hint("sessions")} />
            <Stat label="Lượt xem trang" value={nf.format(o.screenPageViews || 0)} hint={hint("screenPageViews")} />
            <Stat label="Tỷ lệ tương tác" value={`${Math.round((o.engagementRate || 0) * 100)}%`} hint={hint("engagementRate")} />
            <Stat label="TB mỗi phiên" value={fmtDuration(o.averageSessionDuration)} hint={hint("averageSessionDuration")} />
            <Stat label="Sự kiện chính" value={nf.format(o.keyEvents || 0)} hint={hint("keyEvents")} />
          </div>

          <RealtimeCard />

          <Section title="Xu hướng theo ngày" subtitle="Số phiên truy cập mỗi ngày">
            {daily.length === 0 ? (
              <p className="text-xs text-muted">Chưa có dữ liệu.</p>
            ) : (
              <Columns items={daily.map((d) => ({ label: d.label, value: d.sessions }))} labelEvery={Math.ceil(daily.length / 10)} />
            )}
          </Section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Mạng xã hội" subtitle="Số phiên theo nền tảng (đã gộp l./m./lm.facebook.com…)">
              <List rows={social} empty="Chưa có lượt truy cập từ MXH. Hãy dùng link có UTM khi đăng bài." />
            </Section>
            <Section title="Kênh truy cập" subtitle="Số phiên theo nhóm kênh mặc định của GA4">
              <List rows={toRows(data.channels, { labelMap: CHANNEL_LABEL, noteMetric: 1 })} empty="Chưa có dữ liệu." />
            </Section>
            <Section title="Nguồn / phương tiện" subtitle="Chi tiết từng nguồn (nên dùng UTM để phân biệt chiến dịch)">
              <List rows={toRows(data.sources, { noteMetric: 1, limit: 15 })} empty="Chưa có dữ liệu." />
            </Section>
            <Section title="Chuyển đổi theo kênh" subtitle="Tỷ lệ sự kiện chính trên số phiên của từng kênh (kênh nào chất lượng nhất)">
              <List rows={conversion} empty="Chưa có dữ liệu." />
            </Section>
            <Section title="Doanh thu theo nguồn" subtitle="Doanh thu mua gói gắn với nguồn truy cập (cần sự kiện purchase có giá trị)">
              <List rows={revenue} empty="Chưa có giao dịch nào được GA4 ghi nhận kèm doanh thu." />
            </Section>
            <Section title="Nguồn của người dùng mới" subtitle="Người dùng mới đến lần đầu từ đâu">
              <List rows={toRows(x.firstUserSources, { noteMetric: 1, noteSuffix: "sự kiện chính" })} empty="Chưa có dữ liệu." />
            </Section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Phễu sử dụng" subtitle="Số lần mỗi bước và tỷ lệ chuyển đổi so với bước trước">
              <List rows={funnel} empty="Chưa có dữ liệu." />
            </Section>
            <Section title="Sự kiện khác" subtitle="Hành vi, lỗi và phản hồi của người dùng">
              <List rows={otherEvents} empty="Chưa có dữ liệu." />
            </Section>
            <Section title="Trang được xem nhiều" subtitle="Số lượt xem trang">
              <List rows={topPages} empty="Chưa có dữ liệu." />
            </Section>
            <Section title="Trang đích" subtitle="Trang người dùng vào đầu tiên (số phiên)">
              <List rows={toRows(x.landingPages, { noteMetric: 1, noteSuffix: "người", limit: 15 })} empty="Chưa có dữ liệu." />
            </Section>
          </div>

          <Section title="Người dùng của bạn là ai" subtitle="Vị trí, thiết bị và thời gian truy cập">
            <div className="grid gap-6 lg:grid-cols-3">
              <List title="Quốc gia" rows={toRows(x.countries, { noteMetric: 1 })} empty="Chưa có dữ liệu." />
              <List title="Thành phố" rows={toRows(x.cities, { noteMetric: 1, limit: 10 })} empty="Chưa có dữ liệu." />
              <List title="Người dùng mới / quay lại" rows={toRows(x.newVsReturning, { labelMap: VISITOR_LABEL, noteMetric: 1 })} empty="Chưa có dữ liệu." />
              <List title="Thiết bị" rows={toRows(x.devices, { labelMap: DEVICE_LABEL, noteMetric: 1 })} empty="Chưa có dữ liệu." />
              <List title="Trình duyệt" rows={toRows(x.browsers, { noteMetric: 1 })} empty="Chưa có dữ liệu." />
              <List title="Hệ điều hành" rows={toRows(x.os, { noteMetric: 1 })} empty="Chưa có dữ liệu." />
              <List title="Ngôn ngữ trình duyệt" rows={toRows(x.languages, { labelMap: LANG_LABEL, noteMetric: 1 })} empty="Chưa có dữ liệu." />
            </div>
            <div className="mt-6">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-mauve">Phiên theo giờ trong ngày</p>
              <Columns items={hours} color="#2f6fdb" />
            </div>
          </Section>

          <Section title="Hành vi sản phẩm" subtitle="Dựa trên tham số của sự kiện (cần custom dimension trong GA4)">
            <div className="grid gap-6 lg:grid-cols-3">
              <List
                title="Màu tóc được thử"
                rows={toRows(x.hairColors, { labelMap: HAIR_COLOR_LABEL })}
                empty={NEED_DIM}
              />
              <List
                title="Dáng mặt được quét"
                rows={toRows(x.faceShapes, { labelMap: FACE_SHAPE_LABEL })}
                empty={NEED_DIM}
              />
              <List title="Đăng ký theo nguồn đầu tiên" rows={signupRows} empty={NEED_DIM} />
              <List title="Từ khoá tìm kiếm kiểu tóc" rows={toRows(x.searchTerms)} empty={NEED_DIM} />
            </div>
          </Section>

          <Section title="Sức khoẻ trang web" subtitle="Lỗi giao diện được ghi nhận (không có nghĩa là lỗi thật nếu ít)">
            <List title="Trang có lỗi" rows={toRows(x.errorPages, { limit: 10 })} empty="Không ghi nhận lỗi nào. Tốt." />
          </Section>

          <p className="text-[11px] text-muted">
            Số liệu GA4 thường trễ vài giờ và thấp hơn thực tế do trình chặn quảng cáo. Truy cập của Admin/Tester được gắn nhãn nội bộ; hãy bật bộ lọc dữ liệu nội bộ trong GA4 để loại khỏi báo cáo.
          </p>
        </>
      )}
    </div>
  );
}
