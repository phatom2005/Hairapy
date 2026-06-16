# DESIGN.md — Hairapy

> Tài liệu mô tả giao diện & cảm nhận mong muốn cho Hairapy — dùng để dán vào Google Stitch (mục "Dán tệp DESIGN.md hiện có").

## 1. Tổng quan sản phẩm

Hairapy là web-app AI quét khuôn mặt và gợi ý kiểu tóc. Slogan: **"Scan. Style. Smile."**
Đối tượng: Gen Z & người trẻ Việt Nam (18–28 tuổi), năng động trên mạng xã hội, thích trải nghiệm nhanh – vui – ít ma sát trước khi quyết định cắt tóc thật.

Cảm nhận thương hiệu mong muốn: **trẻ trung, năng lượng tích cực, đáng tin cậy về công nghệ** — không quá "kẹo ngọt" trẻ con, cũng không lạnh lùng kiểu doanh nghiệp.

## 2. Bảng màu (theo bản phác thảo của team Graphic Design)

| Mã hex | Vai trò GD đặt tên | Đề xuất vai trò trong UI |
|---|---|---|
| `#FF57CF` — *"peace"* | Hồng magenta rực | **Primary / Brand color** — dùng cho logo, highlight chính, badge Premium, accent nổi bật |
| `#E1FF97` — *"fresh"* | Xanh chanh non | **Secondary / Energy accent** — dùng cho tag "mới", trạng thái thành công nhẹ nhàng, điểm nhấn vui tươi, nút phụ |
| `#1039DA` — *"clean & pro"* | Xanh dương đậm | **CTA chính / Action color** — dùng cho nút bấm chính (Phân tích ngay, Nâng cấp Premium), link, trạng thái active |
| `#F5F5F5` — *"option"* | Xám trắng nhạt | **Background / Surface neutral** — nền trang, nền card, đường viền nhẹ |

Ghi chú phối màu:
- Nền chính: trắng hoặc `#F5F5F5`.
- Chữ chính: than đen đậm gần đen (ví dụ `#1A1A1A`) để đảm bảo tương phản — tránh dùng `#1039DA` cho khối chữ dài vì khá đậm.
- `#FF57CF` và `#1039DA` là 2 màu có độ bão hoà cao — chỉ dùng làm điểm nhấn (CTA, badge, icon, gradient nhỏ), **không phủ nền lớn** để tránh chói mắt.
- `#E1FF97` hợp làm điểm nhấn phụ, chip trạng thái, hoặc dải gradient kết hợp với `#FF57CF` cho hero section.
- Có thể tạo gradient thương hiệu: `#FF57CF → #1039DA` (hồng sang xanh) cho hero/banner, tạo cảm giác công nghệ + vui tươi.

> Lưu ý: đây là bảng màu **bold/vibrant**, khác với hướng "pastel ấm" đã đề cập trước đó trong prompt Stitch ban đầu — nếu dùng DESIGN.md này thì nên ưu tiên bảng màu chính thức của GD ở trên.

## 3. Typography

- Font đề xuất: font sans-serif bo tròn, thân thiện, hỗ trợ tiếng Việt tốt — ví dụ **Be Vietnam Pro** hoặc **Inter**.
- Heading: đậm (Semibold/Bold), cỡ lớn, tạo cảm giác năng lượng.
- Body: Regular/Medium, dễ đọc trên nền sáng.

*(Điền thêm nếu GD đã chốt font cụ thể.)*

## 4. Phong cách thị giác chung

- **Bo góc lớn** (16–24px) cho card, nút, ảnh — tạo cảm giác mềm mại, hiện đại.
- **Khoảng trắng rộng rãi**, bố cục đơn giản, ưu tiên mobile-first (375px base).
- **Shadow nhẹ, mềm** thay vì viền cứng để tạo chiều sâu.
- **Icon/illustration**: phong cách flat hoặc duotone sử dụng 2 màu thương hiệu (`#FF57CF` + `#1039DA`).
- Nút CTA chính: nền `#1039DA`, chữ trắng, bo tròn pill; nút phụ: viền `#1039DA` hoặc nền `#F5F5F5`.
- Badge "Premium": nền/viền `#FF57CF` hoặc gradient `#FF57CF → #1039DA`.
- Trạng thái thành công/tươi mới: dùng `#E1FF97` làm nền chip hoặc icon nhỏ.

## 5. Hướng dẫn bổ sung cho Stitch

```
Use the Hairapy brand palette exactly as defined: vibrant magenta-pink #FF57CF
as the primary brand/accent color, lime-green #E1FF97 as a secondary energy
accent, deep blue #1039DA as the main CTA/action color, and light neutral
#F5F5F5 as background/surface. Keep large surfaces neutral (white or #F5F5F5)
and reserve the saturated pink and blue for buttons, badges, icons, and small
highlight areas — do not flood full backgrounds with the saturated colors.
Body text should be near-black for readability. Overall feel: youthful,
energetic, trustworthy tech — rounded corners (16-24px), generous white
space, soft shadows, mobile-first layout (375px base width), friendly
rounded sans-serif typography (Be Vietnam Pro / Inter style).
```

## 6. Thư viện component động — React Bits

Khi code FE (React 19 + Vite + Tailwind 4), dùng [React Bits](https://reactbits.dev/) để bổ sung hiệu ứng động cho các điểm chạm quan trọng — copy-paste theo từng component (không cài cả gói), ưu tiên bản Tailwind + Framer Motion cho hợp stack hiện tại.

Đề xuất áp dụng:

| Vị trí | Loại component React Bits | Ghi chú phối màu |
|---|---|---|
| Hero/Landing — slogan "Scan. Style. Smile." | Text animation (typewriter / split-text / gradient text) | Gradient chữ `#FF57CF → #1039DA` |
| Nền hero/banner | Animated background / gradient blob | Nền `#F5F5F5`, blob màu `#FF57CF` & `#E1FF97` mờ nhẹ |
| Card kiểu tóc trong catalog | Hover/tilt/reveal effect | Viền sáng `#1039DA` khi hover |
| Màn hình "AI đang phân tích" | Loading / progress animation | Vòng tròn tiến trình màu `#1039DA`, chấm nhấp nháy `#E1FF97` |
| Badge "Premium" / upsell banner | Shine / glow effect nhẹ | Glow màu `#FF57CF` |
| Trạng thái thanh toán thành công | Success animation (checkmark, confetti nhẹ) | Confetti phối 4 màu thương hiệu |

Lưu ý cho team 2 dev:
- Chỉ lấy đúng component cần dùng để giữ bundle nhẹ — tránh over-engineer.
- Ưu tiên hiệu ứng ở các điểm "wow" (hero, loading, success) — không lạm dụng animation ở toàn bộ UI vì dễ gây rối mắt và ảnh hưởng hiệu năng trên mobile.
- Khi chọn xong component cụ thể, ghi lại tên + đường dẫn vào đây để cả team tra cứu nhanh khi maintain.
