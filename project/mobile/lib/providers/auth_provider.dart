import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../api/token_storage.dart';
import '../models/user.dart';

/// State đăng nhập toàn app. UI lắng nghe provider này để biết
/// hiện guest hay đã login, và để lấy role (FREE/PREMIUM) cho việc
/// chặn tính năng premiumOnly giống hệt logic web (handleTryStyle).
class AuthState {
  final bool isLoading;
  final AppUser? user;
  final String? error;

  /// Có giá trị khi đăng nhập bị chặn vì email chưa xác thực (mã EMAIL_NOT_VERIFIED)
  /// — UI dùng để hiện nút "Gửi lại email xác thực".
  final String? unverifiedEmail;

  const AuthState({this.isLoading = false, this.user, this.error, this.unverifiedEmail});

  bool get isLoggedIn => user != null;

  AuthState copyWith({bool? isLoading, AppUser? user, String? error, String? unverifiedEmail}) =>
      AuthState(
        isLoading: isLoading ?? this.isLoading,
        user: user ?? this.user,
        error: error,
        unverifiedEmail: unverifiedEmail,
      );
}

/// Đọc thông điệp lỗi trả về từ backend.
/// GlobalExceptionHandler trả `message` là nội dung thật, còn `error` chỉ là tên
/// trạng thái HTTP ("Unauthorized", "Forbidden"...) — ngoại trừ lỗi validation thì
/// `error` mới là câu thông báo đầu tiên. Vì vậy ưu tiên `message`, rồi mới tới `error`.
String _extractError(Object e, String fallback) {
  if (e is DioException) {
    final data = e.response?.data;
    if (data is Map) {
      final message = data['message'];
      if (message is String && message.trim().isNotEmpty) return message;
      final error = data['error'];
      if (error is String && error.trim().isNotEmpty) return error;
      if (data['errors'] is Map) {
        return (data['errors'] as Map).values.join(', ');
      }
    }
    // Không có phản hồi từ server (mất mạng/timeout) → báo rõ để người dùng biết
    if (e.response == null) {
      return 'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.';
    }
  }
  return fallback;
}

/// Mã lỗi nghiệp vụ backend trả kèm (vd EMAIL_NOT_VERIFIED).
String? _extractCode(Object e) {
  if (e is DioException) {
    final data = e.response?.data;
    if (data is Map && data['code'] is String) return data['code'] as String;
  }
  return null;
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState()) {
    // Phiên hết hạn giữa chừng (token 24h) -> về trạng thái guest, router tự đưa về Login.
    ApiClient.onSessionExpired = () {
      if (mounted) state = const AuthState();
    };
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    final token = await TokenStorage.instance.read();
    if (token == null || token.isEmpty) return;
    await fetchMe();
  }

  Future<void> fetchMe() async {
    try {
      final res = await ApiClient.instance.dio.get('/auth/me');
      state = state.copyWith(user: AppUser.fromJson(res.data as Map<String, dynamic>));
    } catch (e) {
      // Chỉ xoá token khi server THẬT SỰ từ chối (401/403). Lỗi mạng/timeout/5xx
      // (mở app lúc mất sóng) thì giữ token để lần mở sau vẫn tự đăng nhập.
      final status = e is DioException ? e.response?.statusCode : null;
      if (status == 401 || status == 403) {
        await TokenStorage.instance.clear();
        state = const AuthState();
      }
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final res = await ApiClient.instance.dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      final token = (res.data as Map<String, dynamic>)['token'] as String;
      await TokenStorage.instance.save(token);
      await fetchMe();
      state = state.copyWith(isLoading: false);
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: _extractError(e, 'Email hoặc mật khẩu không đúng'),
        // Email chưa xác thực → UI hiện nút gửi lại email
        unverifiedEmail: _extractCode(e) == 'EMAIL_NOT_VERIFIED' ? email : null,
      );
      return false;
    }
  }

  /// Đăng ký — khớp RegisterRequest bên backend (fullName, email, password, confirmPassword).
  /// Backend KHÔNG trả JWT nữa: tài khoản phải xác thực email (link gửi qua mail) rồi mới
  /// đăng nhập được. Vì vậy ở đây chỉ trả true để UI chuyển sang màn "Kiểm tra email".
  Future<bool> register({
    required String fullName,
    required String email,
    required String password,
    required String confirmPassword,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await ApiClient.instance.dio.post('/auth/register', data: {
        'fullName': fullName,
        'email': email,
        'password': password,
        'confirmPassword': confirmPassword,
      });
      state = state.copyWith(isLoading: false);
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: _extractError(e, 'Đăng ký thất bại. Vui lòng thử lại.'),
      );
      return false;
    }
  }

  /// POST /auth/resend-verification {email} — backend luôn trả phản hồi trung tính
  /// (không lộ email có tồn tại không) và có cooldown 60s phía server.
  /// Không đụng tới state chung để không xoá lỗi/trạng thái đang hiển thị ở màn khác.
  Future<bool> resendVerification(String email) async {
    try {
      await ApiClient.instance.dio.post('/auth/resend-verification', data: {'email': email});
      return true;
    } catch (_) {
      return false;
    }
  }

  /// POST /auth/forgot-password {email} — backend luôn trả message trung tính
  /// (không lộ email có tồn tại hay không), nên UI chỉ cần hiện thông báo thành công.
  Future<bool> forgotPassword(String email) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await ApiClient.instance.dio.post('/auth/forgot-password', data: {'email': email});
      state = state.copyWith(isLoading: false);
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: _extractError(e, 'Không thể gửi yêu cầu. Vui lòng thử lại.'),
      );
      return false;
    }
  }

  /// POST /auth/reset-password {token, newPassword, confirmPassword}.
  /// `token` là mã trong email đặt lại mật khẩu — người dùng dán thủ công vào app
  /// (mobile không tự mở được deep-link từ email như web khi bấm link).
  Future<bool> resetPassword({
    required String token,
    required String newPassword,
    required String confirmPassword,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await ApiClient.instance.dio.post('/auth/reset-password', data: {
        'token': token,
        'newPassword': newPassword,
        'confirmPassword': confirmPassword,
      });
      state = state.copyWith(isLoading: false);
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: _extractError(e, 'Không thể đặt lại mật khẩu. Kiểm tra lại mã token.'),
      );
      return false;
    }
  }

  /// PUT /auth/me — khớp UpdateProfileRequest (Settings page).
  Future<bool> updateProfile({
    required String fullName,
    String? phone,
    String? dateOfBirth, // "yyyy-MM-dd" hoặc null
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final res = await ApiClient.instance.dio.put('/auth/me', data: {
        'fullName': fullName,
        'phone': phone,
        'dateOfBirth': dateOfBirth,
      });
      state = state.copyWith(
        isLoading: false,
        user: AppUser.fromJson(res.data as Map<String, dynamic>),
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: _extractError(e, 'Không thể cập nhật hồ sơ.'),
      );
      return false;
    }
  }

  /// DELETE /auth/me — Xoá tài khoản người dùng theo yêu cầu Google Play.
  Future<bool> deleteAccount(String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await ApiClient.instance.dio.delete('/auth/me', data: {
        'password': password,
      });
      await TokenStorage.instance.clear();
      state = const AuthState();
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: _extractError(e, 'Không thể xoá tài khoản.'),
      );
      return false;
    }
  }

  Future<void> logout() async {
    try {
      await ApiClient.instance.dio.post('/auth/logout');
    } catch (_) {
      // Kể cả gọi backend lỗi (mất mạng) vẫn xoá token cục bộ để đăng xuất.
    }
    await TokenStorage.instance.clear();
    state = const AuthState();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) => AuthNotifier());
