# Plan: Mobile UI & Responsive UX Overhaul (Senior Dev Spec)

> **File:** `mobile-ui-overhaul.md`  
> **Status:** Draft / Ready for Review  
> **Lead Role:** Senior Frontend Architect (`frontend-specialist`)  
> **Target Framework:** React 19 + Tailwind CSS v4 + Motion  
> **Scope:** Fix critical mobile layout breaks, UX flow inversion on SwapPage, mobile navigation visibility, and global responsive constraints.

---

## 1. Executive Summary & Root Cause Analysis

### Vấn đề cốt lõi trên Mobile hiện tại:
1. **Đảo lộn luồng thao tác (UX Inversion) trên `SwapPage`:** Cột chọn kiểu tóc dài 47 mục đang nằm đè lên trước khu vực tải ảnh và kết quả, khiến người dùng mobile phải cuộn xuống tận đáy trang mới thấy được nút upload và kết quả thử tóc AI.
2. **Khung viền Avatar Pro/Premium bị ẩn 100% trên Mobile Nav:** `PillNav` ẩn hoàn toàn cụm avatar khi màn hình `< 768px`, người dùng điện thoại không thể thấy được avatar hay khung viền mới.
3. **Menu Mobile chữ quá khổ & mất nút:** `StaggeredMenu` dùng `text-5xl` không có `overflow-y-auto`, đẩy nút đăng xuất và CTA ra ngoài đáy màn hình trên các máy như iPhone SE/13 mini.
4. **Tràn khung ngang & vỡ dải Tab:** `ProfilePage` (5 tab), `ScanPage` (dải STATS 3 cột), chưa có `overflow-x: hidden` toàn cục dẫn đến việc trang web bị trượt ngang lỏng lẻo.
5. **Khoảng đệm Desktop áp đặt lên Mobile:** Các section dùng `py-24` ($192\text{px}$ dọc) và `<Card>` dùng `p-8` ($64\text{px}$ ngang), nuốt chửng 30% diện tích màn hình nhỏ.

---

## 2. Architectural Blueprint & Responsive Strategy

```
Mobile Breakpoint Matrix (Tailwind v4):
- Compact Phone (360px - 414px):  Base classes (Padding: px-4, Font: text-sm / text-2xl)
- Tablet (640px - 768px):        sm: classes (Padding: px-6, Font: text-base / text-3xl)
- Desktop (> 1024px):             lg: classes (2-column sticky layouts, full sidebars)
```

### Kiến trúc phân tầng can thiệp:
* **Tầng 0 (Toàn cục):** Chặn trượt ngang trên `index.css`, co giãn khoảng đệm `Section.jsx`.
* **Tầng 1 (Navigation Shell):** Đưa `UserAvatar` (size `sm`) hiển thị cạnh Hamburger trên `PillNav`; chuẩn hóa font & safe scroll trên `StaggeredMenu`.
* **Tầng 2 (Core Feature - Swap Page):** Đổi trật tự `order-first lg:order-last` đưa Preview ảnh lên đỉnh màn hình; tối ưu lưới chọn tóc 2 cột.
* **Tầng 3 (User & Engagement Pages):** Cuộn ngang 5 tab trên `ProfilePage`, chuyển đổi menu `SettingsPage` thành horizontal bar, thêm nút toggle Bản đồ trên `SalonsPage`.

---

## 3. Detailed Task Breakdown & File Map

### Phase 1: Toàn cục & Layout Shell (Global & Navigation)
- [ ] **Task 1.1: Chặn trượt ngang & tối ưu khoảng đệm section**
  - **File:** `project/frontend/src/index.css`, `project/frontend/src/components/ui/Section.jsx`
  - **Action:**
    - Thêm `html, body { overflow-x: hidden; }` trong `index.css`.
    - Đổi `py-24` trong `Section.jsx` thành `py-10 sm:py-16 lg:py-24` để tiết kiệm $80\text{px}$ khoảng trắng vô ích trên mobile.
  - **Verification:** Kiểm tra vuốt ngang trang chủ không bị lắc hay lộ viền trắng bên phải.

- [ ] **Task 1.2: Hiển thị Avatar & Tier Badge trên Mobile Navbar**
  - **File:** `project/frontend/src/components/layout/PillNav.jsx`
  - **Action:**
    - Tại cụm Mobile control (`md:hidden`), nếu đã đăng nhập (`token`), render `<Link to="/profile"><UserAvatar size="sm" ... /></Link>` ngay bên trái nút Hamburger.
  - **Verification:** Vào web trên giao diện mobile (F12 Mobile mode 375px), avatar với khung viền Pro/Premium hiển thị rõ nét góc trên bên phải.

- [ ] **Task 1.3: Khắc phục Menu toàn màn hình trên Mobile**
  - **File:** `project/frontend/src/components/layout/StaggeredMenu.jsx`
  - **Action:**
    - Giảm kích thước chữ menu từ `text-5xl` thành `text-2xl sm:text-3xl`.
    - Thêm `overflow-y-auto max-h-[90vh] py-8` cho modal menu.
    - Thêm header mini hiển thị Avatar + Tên + Badge gói tài khoản của user ở đầu menu khi đã đăng nhập.
  - **Verification:** Mở menu trên màn hình 360x640px, tất cả mục menu và nút Đăng xuất đều hiển thị vừa vặn, cuộn mượt mà.

---

### Phase 2: Luồng trải nghiệm cốt lõi (Core UX - Swap & Scan)
- [ ] **Task 2.1: Sắp xếp lại luồng thao tác trên Trang Thử Tóc**
  - **File:** `project/frontend/src/pages/SwapPage.jsx`
  - **Action:**
    - Cột Preview ảnh (Khu vực chính): Thêm `order-1 lg:order-2` (hiển thị lên trên cùng trên mobile).
    - Cột chọn kiểu tóc & bảng màu: Thêm `order-2 lg:order-1` (nằm phía dưới preview).
    - Giảm padding của `<Card>` trên mobile: `p-4 sm:p-6 lg:p-8`.
    - Tối ưu danh sách 47 kiểu tóc: lưới 2 cột với `gap-2.5` và chiều cao thumbnail linh hoạt.
  - **Verification:** Mở trang `/swap` trên mobile: Người dùng thấy ngay khung Tải ảnh ở đầu trang. Sau khi bấm thử tóc, ảnh kết quả hiện ngay trước mắt mà không cần cuộn.

- [ ] **Task 2.2: Tối ưu Trang Quét Khuôn Mặt AI**
  - **File:** `project/frontend/src/pages/ScanPage.jsx`
  - **Action:**
    - Đổi tiêu đề `h1`: `text-2xl sm:text-4xl lg:text-5xl` để tiêu đề không bị bẻ thành 8 dòng.
    - Đổi dải `STATS`: chuyển từ `flex gap-8` thành `grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-6`.
  - **Verification:** Khung quét và các chỉ số dàn đều đẹp mắt trên mobile 375px, không tràn viền.

---

### Phase 3: Trang Cá nhân & Dịch vụ (Profile, Settings, Salons)
- [ ] **Task 3.1: Chống vỡ 5 Tab & tối ưu Header Hồ sơ**
  - **File:** `project/frontend/src/pages/ProfilePage.jsx`
  - **Action:**
    - Bọc thanh 5 tab trong `<div className="flex gap-2 border-b border-line overflow-x-auto no-scrollbar whitespace-nowrap py-1">`.
    - Đổi 3 nút hành động đầu trang ("Sửa hồ sơ", "Quét AI mới", "Dashboard") sang `size="sm"` để dàn hàng ngang cân đối trên mobile.
    - Ô "Gói hiện tại" trong lưới 4 thông số: tối ưu font size và ngắt dòng hợp lý cho ngày hết hạn.
  - **Verification:** Vuốt ngang thanh tab mượt mà; 5 tab không bị nhảy dòng; header gọn gàng.

- [ ] **Task 3.2: Chuyển đổi Sidebar Settings thành Horizontal Tabs trên Mobile**
  - **File:** `project/frontend/src/pages/SettingsPage.jsx`
  - **Action:**
    - Thanh điều hướng cài đặt: Trên mobile hiển thị dạng cuộn ngang (`flex overflow-x-auto gap-2 lg:flex-col lg:space-y-1`), không còn nằm thành 1 khối dọc chiếm hết màn hình trước form.
    - Thu nhỏ avatar trên mobile: `size="lg"` trên mobile và `size="xl"` trên desktop (`size="lg sm:size-xl"` hoặc prop linh hoạt).
  - **Verification:** Vào `/settings` trên mobile, form chỉnh sửa hiện ra ngay bên dưới tab chọn, không cần cuộn dài.

- [ ] **Task 3.3: Thêm nút chuyển đổi Danh sách ⇄ Bản đồ cho Mobile**
  - **File:** `project/frontend/src/pages/SalonsPage.jsx`
  - **Action:**
    - Thêm state `mobileViewMode: "list" | "map"`.
    - Thêm thanh chuyển đổi pill nổi (Floating Pill Switcher) ở góc dưới màn hình trên mobile.
    - Khi chọn "Bản đồ", ẩn danh sách và hiển thị bản đồ Leaflet toàn màn hình có nút quay lại.
  - **Verification:** Người dùng điện thoại có thể tra cứu salon trực quan ngay trên bản đồ GPS.

---

## 4. Verification Checklist & Senior Criteria (Phase X)

| Tiêu chuẩn kiểm thử | Thiết bị mô phỏng | Tiêu chí đạt (Acceptance Criteria) |
| :--- | :--- | :--- |
| **No Horizontal Scroll** | iPhone SE ($375\text{px}$), Galaxy S20 ($360\text{px}$) | `document.documentElement.scrollWidth === window.innerWidth` (100% không tràn viền) |
| **Touch Target Size** | Mọi thiết bị | Mọi nút bấm, tab, icon đạt tối thiểu $44\text{px} \times 44\text{px}$ hoặc có padding an toàn |
| **Visual Parity** | Desktop & Mobile | Khung viền Pro & Premium hiển thị đầy đủ, không méo, không vỡ tỉ lệ |
| **Automated Suite** | Terminal | `npm run lint` = 0 lỗi; `npm test` = 18/18 passed; `npm run build` thành công |

---

## 5. Risk Assessment & Mitigation

1. **Rủi ro xung đột z-index giữa floating map button và footer:**
   * *Giải pháp:* Đặt floating pill ở `z-30`, nằm dưới modal `z-50` và hamburger menu `z-60`.
2. **Rủi ro giật lag khi chuyển đổi trật tự DOM trên SwapPage:**
   * *Giải pháp:* Dùng CSS Flexbox/Grid ordering (`order-1` / `order-2`) thay vì render 2 cụm JSX riêng biệt, giúp giữ nguyên state của file ảnh và kết quả phân tích.

