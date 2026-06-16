# Prompt cho Google Stitch — Thiết kế UI Hairapy

> Copy nguyên khối prompt bên dưới vào Stitch. Có thể chạy từng phần (mỗi "MÀN HÌNH" là 1 lần generate) hoặc gộp chung nếu Stitch hỗ trợ multi-screen.

---

## Prompt tổng (Project context — dán đầu mỗi lần generate)

```
Design a mobile-first web app UI for "Hairapy" — an AI app that scans a user's
face and recommends hairstyles. Slogan: "Scan. Style. Smile."

Target users: Vietnamese Gen Z & young adults (18–28) who care about personal
style, are active on social media, and want a fast, fun, low-friction way to
try new hairstyles before committing to a haircut.

Visual style: modern minimal with a warm pastel palette (soft peach, cream,
blush pink, warm beige, with a muted terracotta or coral as the accent/CTA
color). Generous white space, soft rounded corners (16–24px), soft drop
shadows, friendly rounded sans-serif typography (e.g. Inter / Be Vietnam Pro
style). Tone: approachable, encouraging, never clinical. Avoid harsh dark UI,
avoid overly "techy" cold blues.

Layout: mobile-first responsive (375px base width), clean single-column flows,
big tappable CTA buttons, bottom nav for primary sections (Home / Catalog /
History / Account).
```

---

## MÀN HÌNH 1 — Landing / Onboarding / Upload ảnh / Kết quả phân tích

```
Screen set: Landing page, Onboarding carousel, Photo upload flow, Analysis
result screen.

1. Landing page: Hero section with the slogan "Scan. Style. Smile.", a short
   value proposition ("Quét gương mặt — AI gợi ý kiểu tóc hợp với bạn trong
   30 giây"), a primary CTA button "Bắt đầu quét ảnh", and a secondary link
   "Đăng nhập". Show 3 short benefit cards with icons (Phân tích khuôn mặt
   bằng AI / Thử kiểu tóc ảo / Gợi ý cá nhân hóa). Include a small banner
   noting Guest users can preview but must sign up to scan.

2. Onboarding carousel (3 slides, swipeable, with progress dots): 
   (1) "Tải lên ảnh chân dung rõ mặt" 
   (2) "AI phân tích hình dáng khuôn mặt của bạn" 
   (3) "Nhận gợi ý kiểu tóc & thử ngay trên ảnh của bạn".

3. Upload screen: large dashed-border upload zone with camera/gallery icons,
   helper text "Ảnh sẽ tự động được xoá sau 24 giờ vì lý do bảo mật", a live
   preview thumbnail once selected, a daily-quota indicator pill showing
   remaining scans for the day (e.g. "Còn 1 lượt phân tích hôm nay — gói
   Free"), and a primary CTA "Phân tích ngay". Include a friendly loading
   state with a progress ring and rotating tips while AI processes
   (mention: nếu xử lý quá 10 giây, hệ thống sẽ tự hoàn lượt).

4. Analysis result screen: shows the user's photo with subtle face-mesh
   overlay graphic, a card summarizing detected face shape (e.g. "Khuôn mặt
   trái xoan"), then a horizontally scrollable list of 4–6 recommended
   hairstyle cards (thumbnail, style name, short reason tag like "Phù hợp
   khuôn mặt tròn"). Each card has a "Thử kiểu này" button. Free-tier results
   show a small watermark badge on thumbnails; add an upsell banner "Nâng cấp
   Premium để xem ảnh HD không watermark".
```

---

## MÀN HÌNH 2 — Tài khoản / Gói cước (Free vs Premium) / Thanh toán

```
Screen set: Account/profile page, Pricing comparison page, Checkout/payment
screen (PayOS + VietQR), Payment status screen.

1. Account page: profile header (avatar, name, email, current plan badge —
   "Free" in neutral pastel or "Premium" in warm gold/coral badge), usage
   summary cards showing today's remaining quota for "Phân tích khuôn mặt"
   and "Thử kiểu tóc" with progress bars, a list of settings rows (Đổi mật
   khẩu, Lịch sử giao dịch, Thông báo, Đăng xuất).

2. Pricing comparison page: two side-by-side (or stacked on mobile) plan
   cards — "Free" and "Premium" — each listing features with check/cross
   icons: số lần phân tích/ngày (1 vs 5), số lần thử kiểu/ngày (5 vs 20), kho
   kiểu tóc (giới hạn vs toàn bộ), chất lượng ảnh (watermark vs HD không
   watermark), AI Stylist cá nhân hóa (✗ vs ✓), ưu tiên xử lý (thường vs cao).
   Premium card visually highlighted with accent border/glow and a "Phổ biến
   nhất" ribbon. Toggle/segmented control to switch between "Gói Tuần" and
   "Gói Tháng" pricing. Primary CTA "Nâng cấp lên Premium".

3. Checkout screen: order summary card (plan name, duration, price), payment
   method shown as VietQR / PayOS with a QR code placeholder graphic, short
   numbered instructions "Quét mã bằng app ngân hàng → Xác nhận → Tài khoản
   tự động nâng cấp", a countdown timer for QR expiry, and a note "Gói sẽ tự
   hết hạn khi kết thúc chu k�ỳ — không tự động gia hạn".

4. Payment status screen: success state (checkmark animation placeholder,
   "Thanh toán thành công! Tài khoản của bạn đã là Premium 🎉", CTA "Khám phá
   ngay") and a pending/failed state variant (friendly retry message, support
   contact link).
```

---

## MÀN HÌNH 3 — Kho kiểu tóc / Thử kiểu (Try-on)

```
Screen set: Hairstyle catalog/browse screen, Style detail screen, Try-on
(before/after) screen.

1. Catalog screen: search bar + filter chips at top (Giới tính, Độ dài, Kiểu
   khuôn mặt phù hợp, Xu hướng), grid of hairstyle cards (2 columns on
   mobile) each with thumbnail image, style name, and a small lock icon
   overlay on cards that are Premium-only for Free users. Include a "Phổ
   biến tuần này" horizontal carousel section at top.

2. Style detail screen: large hero image of the hairstyle, name and short
   description, tags (e.g. "Phù hợp mặt trái xoan, mặt vuông"), a primary CTA
   "Thử kiểu này trên ảnh của bạn", and a secondary "Lưu vào yêu thích"
   (heart icon).

3. Try-on / before-after screen: split-screen or slider comparison showing
   the user's original photo vs the AI-generated result with the new
   hairstyle applied, a horizontal thumbnail strip to quickly switch between
   other suggested styles, action buttons "Tải ảnh xuống" (disabled/blurred
   with upsell tooltip for Free users due to watermark) and "Thử kiểu khác".
   Show a small queue-priority indicator for Premium users ("Xử lý ưu tiên
   cao ⚡").
```

---

## Gợi ý dùng

- Chạy lần lượt từng khối "MÀN HÌNH" — luôn dán kèm **Prompt tổng** ở đầu để Stitch giữ nhất quán style giữa các màn.
- Sau khi có bản phác thảo đầu tiên, có thể yêu cầu Stitch "giữ nguyên style, chỉ đổi nội dung" để tạo các biến thể (ví dụ: trạng thái rỗng, trạng thái lỗi, dark mode nếu cần sau).
- Khi đưa cho dev FE implement bằng React + Tailwind, nhớ map lại đúng design tokens (màu pastel, bo góc, spacing) thành Tailwind config thay vì hardcode.
