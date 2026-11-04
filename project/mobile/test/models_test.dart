import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/booking.dart';
import 'package:mobile/models/payment_record.dart';
import 'package:mobile/screens/profile/change_password_screen.dart' show validatePasswordChange;
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

  group('Lịch sử thanh toán (GET /payments/my)', () {
    test('đọc response phân trang và nhãn tiếng Việt', () {
      final list = parsePaymentPage({
        'content': [
          {'orderCode': 123, 'plan': 'PREMIUM', 'amount': 99000, 'status': 'PAID',
           'createdAt': '2026-11-01T09:00:00', 'paidAt': '2026-11-01T09:02:00'},
          {'orderCode': 124, 'plan': 'PRO', 'amount': 49000, 'status': 'CANCELLED', 'createdAt': '2026-10-01T09:00:00'},
        ],
        'totalElements': 2,
      });
      expect(list, hasLength(2));
      expect(list[0].planName, 'Gói Tháng');
      expect(list[0].statusLabel, 'Thành công');
      expect(list[0].displayDate, DateTime(2026, 11, 1, 9, 2));
      expect(list[1].planName, 'Gói Tuần');
      expect(list[1].displayDate, DateTime(2026, 10, 1, 9, 0)); // chưa trả -> ngày tạo đơn
    });

    test('nhận cả mảng thuần và dữ liệu rỗng/lỗi', () {
      expect(parsePaymentPage([{'orderCode': 1, 'plan': 'PRO', 'amount': 49000, 'status': 'PENDING'}]), hasLength(1));
      expect(parsePaymentPage(null), isEmpty);
      expect(parsePaymentPage({'content': null}), isEmpty);
    });

    test('định dạng tiền VND', () {
      expect(formatVnd(99000), '99.000đ');
      expect(formatVnd(1250000), '1.250.000đ');
      expect(formatVnd(0), '0đ');
    });
  });

  group('Kiểm tra form đổi mật khẩu', () {
    test('thiếu mật khẩu hiện tại khi tài khoản có mật khẩu', () {
      expect(validatePasswordChange(needCurrent: true, current: '', next: 'abcd1234', confirm: 'abcd1234'), isNotNull);
    });
    test('tài khoản Google (chưa có mật khẩu) không cần mật khẩu hiện tại', () {
      expect(validatePasswordChange(needCurrent: false, current: '', next: 'abcd1234', confirm: 'abcd1234'), isNull);
    });
    test('mật khẩu mới quá ngắn hoặc nhập lại không khớp', () {
      expect(validatePasswordChange(needCurrent: true, current: 'old12345', next: 'short', confirm: 'short'), isNotNull);
      expect(validatePasswordChange(needCurrent: true, current: 'old12345', next: 'abcd1234', confirm: 'abcd12345'), isNotNull);
    });
    test('mật khẩu mới trùng mật khẩu cũ', () {
      expect(validatePasswordChange(needCurrent: true, current: 'abcd1234', next: 'abcd1234', confirm: 'abcd1234'), isNotNull);
    });
  });
}
