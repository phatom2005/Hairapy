# Task: Bổ sung filter Ngày/Tháng/Năm cho Admin Dashboard

## Mục tiêu
Thêm chức năng lọc thống kê theo khoảng thời gian (7 ngày / 30 ngày / 3 tháng / 1 năm / tuỳ chọn) cho trang Admin Dashboard. Hiện tại dashboard chỉ hiển thị cứng 30 ngày gần nhất — cần cho phép admin chọn khoảng thời gian khác nhau, đồng thời thống kê theo tháng khi range > 90 ngày.

**Yêu cầu CP3 gốc:** "số lượng acc đăng ký sử dụng theo ngày/tháng/năm, số lượng các giao dịch hằng ngày/tháng/năm"

## Code hiện tại cần sửa

### Backend

**1. `UsageHistoryRepository.java`** (`project/backend/src/main/java/com/hairapy/repositories/UsageHistoryRepository.java`)

Hiện có:
```java
@Query("SELECT CAST(u.usedAt AS date) as day, COUNT(u) as count FROM UsageHistory u WHERE u.usedAt >= :since GROUP BY CAST(u.usedAt AS date) ORDER BY day")
List<Object[]> countDailyUsageSince(@Param("since") LocalDateTime since);
```

→ **Thêm** query nhóm theo tháng:
```java
// Thống kê theo tháng (dùng khi range > 90 ngày)
@Query("SELECT FUNCTION('to_char', u.usedAt, 'YYYY-MM') as month, COUNT(u) as count FROM UsageHistory u WHERE u.usedAt >= :since GROUP BY FUNCTION('to_char', u.usedAt, 'YYYY-MM') ORDER BY month")
List<Object[]> countMonthlyUsageSince(@Param("since") LocalDateTime since);
```

**Cần thêm tương tự cho UserRepository** — đếm user đăng ký theo ngày/tháng:
```java
// Thống kê user đăng ký theo ngày
@Query("SELECT CAST(u.createdAt AS date) as day, COUNT(u) as count FROM User u WHERE u.createdAt >= :since GROUP BY CAST(u.createdAt AS date) ORDER BY day")
List<Object[]> countDailyRegistrationsSince(@Param("since") LocalDateTime since);

// Thống kê user đăng ký theo tháng
@Query("SELECT FUNCTION('to_char', u.createdAt, 'YYYY-MM') as month, COUNT(u) as count FROM User u WHERE u.createdAt >= :since GROUP BY FUNCTION('to_char', u.createdAt, 'YYYY-MM') ORDER BY month")
List<Object[]> countMonthlyRegistrationsSince(@Param("since") LocalDateTime since);
```

**2. `AdminDashboardController.java`** (`project/backend/src/main/java/com/hairapy/controllers/admin/AdminDashboardController.java`)

Hiện tại endpoint `GET /api/admin/dashboard/stats` không nhận tham số nào.

→ **Sửa** để nhận query param `period`:
```
GET /api/admin/dashboard/stats?period=30d    (mặc định)
GET /api/admin/dashboard/stats?period=7d
GET /api/admin/dashboard/stats?period=90d
GET /api/admin/dashboard/stats?period=1y
```

Logic:
- Parse `period` → tính `since` = `LocalDate.now().minus(...)` 
- Nếu period <= 90 ngày → dùng `countDailyUsageSince` + `countDailyRegistrationsSince`
- Nếu period > 90 ngày → dùng `countMonthlyUsageSince` + `countMonthlyRegistrationsSince`
- Trả thêm field `granularity: "day" | "month"` trong response để FE biết cách render label

**3. `DashboardStatsResponse.java`** (`project/backend/src/main/java/com/hairapy/dto/admin/DashboardStatsResponse.java`)

Hiện tại:
```java
public record DashboardStatsResponse(
    long totalUsers, long totalAdmins, long activeSubscriptions,
    long totalScans, long totalSwaps, long scansToday, long swapsToday,
    List<DailyUsageStat> dailyUsage
) {}
```

→ **Thêm fields**:
```java
public record DashboardStatsResponse(
    long totalUsers, long totalAdmins, long activeSubscriptions,
    long totalScans, long totalSwaps, long scansToday, long swapsToday,
    List<DailyUsageStat> dailyUsage,
    List<DailyUsageStat> registrationTrend,  // user đăng ký theo ngày/tháng
    String granularity                        // "day" hoặc "month"
) {}
```

### Frontend

**4. `AdminDashboardPage.jsx`** (`project/frontend/src/pages/admin/AdminDashboardPage.jsx`)

Cần sửa:
- Thêm dãy nút filter (tab bar) phía trên chart: `7 ngày` | `30 ngày` | `3 tháng` | `1 năm`
- State `period` mặc định `"30d"`, khi đổi → gọi lại API `GET /api/admin/dashboard/stats?period={period}`
- Dùng field `granularity` từ response để format label trục X:
  - `"day"` → hiển thị `dd/MM`
  - `"month"` → hiển thị `MM/YYYY`
- **Thêm chart thứ 2** cho `registrationTrend` (user đăng ký) — dùng cùng format bar chart, màu khác (ví dụ `bg-lime` thay vì `bg-brand`)
- Giữ nguyên toàn bộ 4 stat cards và summary box hiện có

**UI mẫu cho tab bar filter** (dùng style giống SwapPage tab đã có):
```jsx
const PERIODS = [
  { label: "7 ngày", value: "7d" },
  { label: "30 ngày", value: "30d" },
  { label: "3 tháng", value: "90d" },
  { label: "1 năm", value: "1y" },
];
// Render dưới dạng rounded pill tabs, active = bg-white text-ink shadow
```

## Ràng buộc quan trọng
- DB là PostgreSQL 16 — `to_char()` là hàm native, nhưng trong JPQL phải dùng `FUNCTION('to_char', ...)` 
- KHÔNG sửa file migration — chỉ thêm query mới vào repository, sửa controller + DTO + FE page
- Giữ nguyên comment tiếng Việt trong code
- Component UI đã có sẵn: `Card`, `Badge`, `Button` từ `../../components/ui` — dùng lại, không tạo mới
- Chart hiện tại là pure CSS bar chart (div height %), KHÔNG dùng thư viện chart — giữ nguyên approach này
- Khi `period=7d`, các card "Quét hôm nay" / "Thử tóc hôm nay" vẫn giữ nguyên là hôm nay (không đổi theo period)

## Kết quả mong đợi
- Admin có thể chuyển đổi giữa 7d/30d/90d/1y để xem trend sử dụng và trend đăng ký
- Chart tự động chuyển granularity (ngày → tháng) khi range > 90 ngày
- Không break bất cứ gì đang hoạt động
