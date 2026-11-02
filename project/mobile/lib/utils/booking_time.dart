/// Kiểm tra giờ hẹn salon — khớp BookingController (giờ VN):
/// phải sau hiện tại ít nhất 1 giờ và không quá 30 ngày.
/// Trả null nếu hợp lệ, ngược lại là câu báo lỗi tiếng Việt.
String? validatePreferredTime(DateTime picked, DateTime now) {
  if (picked.isBefore(now.add(const Duration(hours: 1)))) {
    return 'Giờ hẹn phải sau thời điểm hiện tại ít nhất 1 giờ.';
  }
  if (picked.isAfter(now.add(const Duration(days: 30)))) {
    return 'Chỉ đặt được lịch trong vòng 30 ngày tới.';
  }
  return null;
}

/// LocalDateTime cho backend: "yyyy-MM-ddTHH:mm:00" (không kèm múi giờ — backend hiểu là giờ VN).
String toBackendLocalDateTime(DateTime t) {
  String two(int v) => v.toString().padLeft(2, '0');
  return '${t.year}-${two(t.month)}-${two(t.day)}T${two(t.hour)}:${two(t.minute)}:00';
}

/// Bỏ khoảng trắng, dấu chấm, gạch ngang trong SĐT người dùng gõ.
String normalizePhone(String raw) => raw.replaceAll(RegExp(r'[\s.\-]'), '');

/// Cùng quy tắc với backend: bắt đầu 0 hoặc +84, theo sau 9–10 chữ số.
bool isValidVnPhone(String raw) => RegExp(r'^(0|\+84)\d{9,10}$').hasMatch(normalizePhone(raw));
