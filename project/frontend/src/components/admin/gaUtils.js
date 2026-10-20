import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";

export const nf = new Intl.NumberFormat("vi-VN");

export const PERIODS = [
  { value: 7, label: "7 ngày" },
  { value: 30, label: "30 ngày" },
  { value: 90, label: "90 ngày" },
];

// Tên sự kiện GA4 → nhãn tiếng Việt
export const EVENT_LABEL = {
  page_view: "Lượt xem trang",
  sign_up: "Đăng ký",
  login: "Đăng nhập",
  face_scan: "Quét khuôn mặt",
  view_hairstyle: "Xem kiểu tóc",
  select_hair_color: "Chọn màu tóc",
  hair_swap: "Thử kiểu tóc",
  download_result: "Tải ảnh kết quả",
  save_favorite: "Lưu yêu thích",
  view_plans: "Xem bảng giá",
  begin_checkout: "Bắt đầu thanh toán",
  purchase: "Mua gói",
  paywall_view: "Bị chặn vì Premium",
  quota_exceeded: "Hết lượt",
  scan_error: "Lỗi quét",
  swap_error: "Lỗi thử tóc",
  ai_report_submit: "Báo cáo nội dung AI",
  feedback_submit: "Gửi đánh giá",
};

// Phễu sử dụng chính, theo thứ tự
export const FUNNEL = ["sign_up", "face_scan", "hair_swap", "begin_checkout", "purchase"];

export const CHANNEL_LABEL = {
  "Organic Social": "MXH (tự nhiên)",
  "Paid Social": "MXH (quảng cáo)",
  Direct: "Truy cập trực tiếp",
  "Organic Search": "Tìm kiếm Google",
  Referral: "Từ website khác",
  Unassigned: "Chưa phân loại",
  Email: "Email",
};

export const DEVICE_LABEL = { mobile: "Điện thoại", desktop: "Máy tính", tablet: "Máy tính bảng" };
export const VISITOR_LABEL = { new: "Người dùng mới", returning: "Người dùng quay lại" };
export const FACE_SHAPE_LABEL = {
  Oval: "Trái xoan", Round: "Tròn", Square: "Vuông", Heart: "Trái tim", Oblong: "Dài", Diamond: "Kim cương",
};
export const HAIR_COLOR_LABEL = {
  black: "Đen", brown: "Nâu", lightBrown: "Nâu sáng", blonde: "Vàng", platinumBlonde: "Bạch kim", red: "Đỏ",
  burgundy: "Đỏ rượu", orange: "Cam", pink: "Hồng", purple: "Tím", blue: "Xanh dương", green: "Xanh lá",
  grey: "Xám", silver: "Bạc", white: "Trắng", default: "Mặc định",
};

export const fmtDuration = (sec) => {
  const s = Math.round(sec || 0);
  return `${Math.floor(s / 60)}p ${String(s % 60).padStart(2, "0")}s`;
};

/** Chuyển "20261020" của GA4 thành "20/10". */
export const fmtGaDate = (d) => (d && d.length === 8 ? `${d.slice(6, 8)}/${d.slice(4, 6)}` : d);

/** Chuyển các dòng GA4 thành {label, value, note} cho danh sách thanh ngang. */
export function toRows(rows = [], { labelMap, metric = 0, noteMetric, noteSuffix = "người", limit } = {}) {
  const list = rows.map((r) => ({
    label: labelMap?.[r.dims[0]] || r.dims[0] || "(không rõ)",
    value: r.metrics[metric] ?? 0,
    note: noteMetric != null && r.metrics[noteMetric] != null ? `· ${nf.format(r.metrics[noteMetric])} ${noteSuffix}` : "",
  }));
  return limit ? list.slice(0, limit) : list;
}

/** Tải số liệu GA4 từ backend (cache 10 phút) kèm nút làm mới. */
export function useGaData(days) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const query = useQuery({
    queryKey: ["admin-ga", days],
    queryFn: async () => (await api.get("/admin/ga", { params: { days } })).data,
    staleTime: 5 * 60_000,
  });
  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await api.get("/admin/ga", { params: { days, refresh: true } });
      queryClient.setQueryData(["admin-ga", days], res.data);
    } catch (err) {
      console.error("Không làm mới được GA4:", err);
    } finally {
      setRefreshing(false);
    }
  };
  return { ...query, refreshing, refresh };
}
