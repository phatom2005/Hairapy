# Kế hoạch sửa lỗi Batch: 8 bug production (Hairapy)

> **For Claude / Agent:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Khắc phục dứt điểm các lỗi và khiếm khuyết được phát hiện khi kiểm thử thực tế trên production: chặn triệt để khi hết quota quét khuôn mặt, sửa lỗi hiển thị stale quota badge sau khi thử kiểu tóc bằng cách invalidate cache React Query, áp dụng Optimistic Update khi lưu kiểu tóc yêu thích, hoàn thiện giao diện 3 tab còn trống trong Cài đặt, bảo vệ kiểu tóc Premium ở Landing Page, và vô hiệu hóa nút tự hạ quyền trong trang quản trị.

**Architecture:** 
- Frontend React (Vite + Tailwind CSS v4 + React Query v5 + Zustand).
- Khai thác Single Source of Truth từ React Query cache (`["usage-summary"]`, `["profile-saved-styles"]`) và Zustand (`useAuthStore`, `useScanStore`).
- Chặn client-side sớm kết hợp bắt chính xác HTTP Status 429 từ Backend để ngắt luồng chuyển trang không hợp lệ.

**Tech Stack:** React 19, Vite 8, @tanstack/react-query v5, Zustand v5, Tailwind CSS v4, Axios.

---

### Task 1 (Section A - Bug #3 & #5): Chặn Quét Khuôn Mặt Khi Hết Quota trong `ScanPage.jsx`

**Mục tiêu:** Chặn user hết quota không thể bấm phân tích mặt; nếu backend trả về 429 khi lưu scan history thì hiển thị thông báo lỗi và **KHÔNG** chuyển hướng sang `/results`.

**Files:**
- Modify: `project/frontend/src/pages/ScanPage.jsx`

**Chi tiết các bước thực hiện:**
1. **Lấy thông tin quota hiện tại:**
   - Dùng `useQuery` với `queryKey: ["usage-summary"]` và endpoint `/api/usage/me` (hoặc kiểm tra từ `useAuthStore` token).
   - Xác định biến `isFaceScanQuotaExceeded`: nếu `data?.faceScan && !data.faceScan.unlimited && data.faceScan.used >= data.faceScan.limit` thì bằng `true`.
2. **Disable các nút chụp / tải ảnh:**
   - Cập nhật cả 2 nút `Chụp ảnh` và `Tải ảnh lên`:
     `disabled={analyzing || isFaceScanQuotaExceeded}`
   - Nếu `isFaceScanQuotaExceeded`, thêm tooltip hoặc text thông báo nhỏ người dùng đã hết lượt quét trong ngày.
3. **Xử lý 429 trong `startAnalysis()`:**
   - Trong khối `try { await api.post("/profile/scans", ...); } catch (backendErr)`:
     - Nếu `backendErr.response?.status === 429`:
       - `const errorMsg = backendErr.response?.data?.error || "Bạn đã hết lượt quét khuôn mặt hôm nay.";`
       - `setError(errorMsg);`
       - `setAnalyzing(false);`
       - `URL.revokeObjectURL(objectUrl);`
       - **`return;`** (ngắt luồng ngay, không gọi `navigate("/results")`).
     - Với các lỗi khác: giữ nguyên log cảnh báo và tiếp tục cho qua.
4. **Kiểm tra & Verify:**
   - Chạy `npm run build` trong `project/frontend`.

---

### Task 2 (Section B - Bug #7): Invalidate Quota Cache Sau Khi Hair Swap & Scan Hoàn Thành

**Mục tiêu:** Cập nhật ngay lập tức badge số lượt dùng trên UI ngay sau khi thử kiểu tóc (thành công hoặc lỗi/refund) và sau khi quét khuôn mặt thành công, không để badge bị stale trong 30 giây.

**Files:**
- Modify: `project/frontend/src/pages/SwapPage.jsx`
- Modify: `project/frontend/src/pages/ScanPage.jsx`

**Chi tiết các bước thực hiện:**
1. **Trong `SwapPage.jsx`:**
   - Import `useQueryClient` từ `@tanstack/react-query`.
   - Khởi tạo: `const queryClient = useQueryClient();`.
   - Gọi `queryClient.invalidateQueries({ queryKey: ["usage-summary"] });` ở tất cả các điểm kết thúc task:
     - Trong `pollTaskStatus`: khi `data.status === "DONE"`.
     - Trong `pollTaskStatus`: khi `data.status === "ERROR"`.
     - Trong `pollTaskStatus`: khi `attempt >= MAX_POLL_ATTEMPTS`.
     - Trong `catch (err)` của `pollTaskStatus` (khi dừng poll).
     - Trong `handleApply`: trong khối `catch (err)` (các trường hợp 504, 429 hoặc các lỗi khác).
2. **Trong `ScanPage.jsx`:**
   - Khởi tạo `const queryClient = useQueryClient();`.
   - Sau khi `await api.post("/profile/scans", formData, ...)` thành công:
     - Gọi `queryClient.invalidateQueries({ queryKey: ["usage-summary"] });`.
3. **Kiểm tra & Verify:**
   - Chạy `npm run build` trong `project/frontend`.

---

### Task 3 (Section C - Bug #6): Optimistic Update Cho Nút Lưu Kiểu Tóc Yêu Thích trong `ResultsPage.jsx`

**Mục tiêu:** Icon trái tim phản hồi đổi màu ngay lập tức khi click, rollback lại nếu API lưu/xóa thất bại.

**Files:**
- Modify: `project/frontend/src/pages/ResultsPage.jsx`
- Review bổ sung: `project/frontend/src/pages/CatalogPage.jsx`

**Chi tiết các bước thực hiện:**
1. **Trong `ResultsPage.jsx`:**
   - Sửa hàm `handleToggleSave`:
     - Lưu snapshot dữ liệu cũ: `const previousSaved = queryClient.getQueryData(["profile-saved-styles"]) || [];`.
     - Kiểm tra trạng thái hiện tại: `const isSaved = savedIds.has(hairstyleId);`.
     - Cập nhật tức thời (Optimistic):
       - Nếu đang saved -> lọc bỏ `item.id !== hairstyleId`.
       - Nếu chưa saved -> tìm hairstyle tương ứng trong danh sách `recommendations` và thêm vào mảng.
       - Gọi `queryClient.setQueryData(["profile-saved-styles"], newSavedList);`.
     - Thực hiện gọi API `POST` hoặc `DELETE` ngầm:
       - Nếu thành công: gọi `queryClient.invalidateQueries({ queryKey: ["profile-saved-styles"] });`.
       - Nếu lỗi: khôi phục `queryClient.setQueryData(["profile-saved-styles"], previousSaved);` và có thể thông báo lỗi cho người dùng.
2. **Kiểm tra tính nhất quán:**
   - Xem xét áp dụng tương tự cho `CatalogPage.jsx` nếu có luồng lưu tương tự để đảm bảo trải nghiệm đồng bộ.
3. **Kiểm tra & Verify:**
   - Chạy `npm run build` trong `project/frontend`.

---

### Task 4 (Section D - Bug #1): Bổ Sung Nội Dung 3 Tab Cài Đặt & Đồng Bộ Form trong `SettingsPage.jsx`

**Mục tiêu:** Cung cấp nội dung giao diện cho các tab "Bảo mật", "Gói dịch vụ", "Thông báo" và thêm `useEffect` tự động đồng bộ giá trị form khi `user` trong `useAuthStore` thay đổi.

**Files:**
- Modify: `project/frontend/src/pages/SettingsPage.jsx`

**Chi tiết các bước thực hiện:**
1. **Đồng bộ Form State với Auth Store:**
   - Thêm `useEffect` quan sát `[user?.fullName, user?.phone, user?.dateOfBirth]` để cập nhật lại `fullName`, `phone`, `dob`.
2. **Switch Panel theo `active` tab:**
   - **Tab "Thông tin cá nhân":** Giữ nguyên form cập nhật hiện tại.
   - **Tab "Bảo mật":**
     - Hiển thị thông tin bảo mật tài khoản (Email đăng nhập, phương thức đăng nhập).
     - Form đổi mật khẩu với thông báo rõ ràng hoặc nút điều hướng yêu cầu đặt lại mật khẩu qua email `/forgot-password`.
   - **Tab "Gói dịch vụ":**
     - Hiển thị vai trò/gói dịch vụ hiện tại (`user?.role` như FREE, PREMIUM, ADMIN).
     - Hiển thị tóm tắt quyền lợi của gói hiện tại (số lượt quét/ngày, số lượt thử kiểu tóc/ngày).
     - Nút dẫn sang `/pricing` nếu là tài khoản FREE để nâng cấp gói.
   - **Tab "Thông báo":**
     - Thiết kế giao diện cấu hình thông báo (Email thông báo tính năng mới, nhắc nhở định kỳ) ở trạng thái placeholder / đang phát triển chuyên nghiệp, có công tắc chuyển đổi (toggle) minh họa.
3. **Kiểm tra & Verify:**
   - Chạy `npm run build` trong `project/frontend`.

---

### Task 5 (Section E - Bug #2 & #4): Kiểm Tra `premiumOnly` Nút "Thử Ngay" Ở `LandingPage.jsx`

**Mục tiêu:** Ngăn chặn người dùng FREE nhấn "Thử ngay" các mẫu tóc Premium trực tiếp từ mục Xu Hướng ở Trang Chủ mà không qua trang Báo Giá, tạo tính nhất quán với `ResultsPage` và `SwapPage`.

**Files:**
- Modify: `project/frontend/src/pages/LandingPage.jsx`

**Chi tiết các bước thực hiện:**
1. Trong hàm `Trends.handleTryStyle(hairstyle)`:
   - Lấy `user` từ `useAuthStore.getState()` hoặc hook `useAuthStore`.
   - Kiểm tra:
     ```js
     const isPaidUser = user && (user.role === "PREMIUM" || user.role === "ADMIN" || user.role === "TESTER");
     if (hairstyle.premiumOnly && !isPaidUser) {
       navigate("/pricing");
       return;
     }
     ```
2. Giữ nguyên luồng điều hướng hợp lệ khi đủ quyền: `setSelectedHairstyle(...)` -> `navigate('/scan?hairstyleId=...')`.
3. **Kiểm tra & Verify:**
   - Chạy `npm run build` trong `project/frontend`.

---

### Task 6 (Section F - Polish Bug #8): Vô Hiệu Hóa Nút Tự Hạ Quyền Admin trong `AdminUsersPage.jsx`

**Mục tiêu:** Tránh gây khó chịu cho Admin khi bấm nút hạ quyền chính mình rồi nhận thông báo lỗi từ server, bằng cách vô hiệu hóa sẵn nút hành động tương ứng.

**Files:**
- Modify: `project/frontend/src/pages/admin/AdminUsersPage.jsx`

**Chi tiết các bước thực hiện:**
1. Lấy thông tin user hiện tại đang đăng nhập qua `useAuthStore`:
   - `const currentUser = useAuthStore((s) => s.user);`
2. Kiểm tra điều kiện:
   - `const isSelf = u.email?.toLowerCase() === currentUser?.email?.toLowerCase();`
3. Cập nhật nút button hành động:
   - Nếu `u.role === "ADMIN" && isSelf`:
     - Set thuộc tính `disabled={actionLoading || isSelf}`.
     - Thêm `title="Bạn không thể tự hạ quyền quản trị của chính mình"`.
4. **Kiểm tra & Verify:**
   - Chạy `npm run build` trong `project/frontend`.

---

### Task 7: Kiểm Tra Tổng Thể & Xác Nhận Độc Lập

**Mục tiêu:** Xác minh toàn bộ mã nguồn không phát sinh lỗi biên dịch, không vi phạm linter, và git diff khớp với yêu cầu đề ra.

**Các bước thực hiện:**
1. Chạy `npm run lint` tại thư mục `project/frontend`.
2. Chạy `npm run build` tại thư mục `project/frontend`.
3. Kiểm tra `git status` và `git diff` từng file để đảm bảo code sạch, chuẩn xác, không sửa đổi dư thừa.
