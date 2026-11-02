import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/booking.dart';
import 'package:mobile/models/salon.dart';
import 'package:mobile/models/user.dart';
import 'package:mobile/utils/booking_time.dart';

void main() {
  group('AppUser.isPremium theo gói (plan), không theo role', () {
    test('chủ salon đã mua Gói Tuần vẫn là Premium', () {
      final u = AppUser.fromJson({'email': 'a@x.vn', 'role': 'SALON_OWNER', 'plan': 'PRO', 'salonId': 3});
      expect(u.isPremium, isTrue);
      expect(u.isSalonOwner, isTrue);
      expect(u.salonId, 3);
    });

    test('người dùng thường gói FREE không phải Premium', () {
      final u = AppUser.fromJson({'email': 'a@x.vn', 'role': 'USER', 'plan': 'FREE'});
      expect(u.isPremium, isFalse);
    });

    test('backend cũ chưa có plan thì dựa vào role PREMIUM', () {
      expect(AppUser.fromJson({'email': 'a@x.vn', 'role': 'PREMIUM'}).isPremium, isTrue);
    });

    test('Admin/Tester luôn được coi như Premium', () {
      expect(AppUser.fromJson({'email': 'a@x.vn', 'role': 'ADMIN', 'plan': 'FREE'}).isPremium, isTrue);
    });

    test('đọc hạn gói ISO', () {
      final u = AppUser.fromJson({'email': 'a@x.vn', 'role': 'USER', 'plan': 'PREMIUM', 'planEndDate': '2026-12-01T10:00:00'});
      expect(u.planEndsAt, DateTime(2026, 12, 1, 10));
    });
  });

  group('Salon', () {
    test('tách serviceTypes dạng chuỗi "a,b,c"', () {
      expect(splitServiceTypes('Cắt tóc, Uốn,,Nhuộm '), ['Cắt tóc', 'Uốn', 'Nhuộm']);
      expect(splitServiceTypes(null), isEmpty);
    });

    test('đọc field mới partner/stylePrice, thiếu field vẫn không lỗi', () {
      final s = Salon.fromJson({'id': 1, 'name': 'A', 'partner': true, 'stylePrice': 180000});
      expect(s.partner, isTrue);
      expect(s.stylePrice, 180000);
      expect(Salon.fromJson({'id': 2}).partner, isFalse);
    });
  });

  group('Đặt lịch', () {
    final now = DateTime(2026, 11, 2, 10, 0);

    test('giờ hẹn phải sau ít nhất 1 giờ và trong 30 ngày', () {
      expect(validatePreferredTime(now.add(const Duration(minutes: 30)), now), isNotNull);
      expect(validatePreferredTime(now.add(const Duration(hours: 2)), now), isNull);
      expect(validatePreferredTime(now.add(const Duration(days: 31)), now), isNotNull);
    });

    test('định dạng LocalDateTime gửi backend', () {
      expect(toBackendLocalDateTime(DateTime(2026, 11, 5, 9, 5)), '2026-11-05T09:05:00');
    });

    test('SĐT theo đúng quy tắc backend', () {
      expect(isValidVnPhone('0912 345 678'), isTrue);
      expect(isValidVnPhone('+84912345678'), isTrue);
      expect(isValidVnPhone('12345'), isFalse);
      expect(normalizePhone('091.234-5678'), '0912345678');
    });

    test('chỉ huỷ được lịch chờ/đã xác nhận chưa tới giờ', () {
      MyBooking b(String status, DateTime t) =>
          MyBooking(id: 1, salonName: 'A', status: status, preferredTime: t);
      expect(b('PENDING', now.add(const Duration(hours: 3))).canCancel(now), isTrue);
      expect(b('CONFIRMED', now.subtract(const Duration(hours: 1))).canCancel(now), isFalse);
      expect(b('COMPLETED', now.add(const Duration(hours: 3))).canCancel(now), isFalse);
    });
  });
}
