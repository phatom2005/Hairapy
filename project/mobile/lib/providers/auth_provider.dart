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

  const AuthState({this.isLoading = false, this.user, this.error});

  bool get isLoggedIn => user != null;

  AuthState copyWith({bool? isLoading, AppUser? user, String? error}) => AuthState(
        isLoading: isLoading ?? this.isLoading,
        user: user ?? this.user,
        error: error,
      );
}

/// Đọc thông điệp lỗi trả về từ backend (Map {"error": "..."} hoặc {"message": "..."})
/// — khớp cách RestControllerAdvice/ResponseEntity.body bên Spring Boot trả lỗi.
String _extractError(Object e, String fallback) {
  if (e is DioException) {
    final data = e.response?.data;
    if (data is Map) {
      if (data['error'] is String) return data['error'] as String;
      if (data['message'] is String) return data['message'] as String;
      if (data['errors'] is Map) {
        return (data['errors'] as Map).values.join(', ');
      }
    }
  }
  return fallback;
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState()) {
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
    } catch (_) {
      // Token hết hạn/không hợp lệ -> coi như guest
      await TokenStorage.instance.clear();
      state = const AuthState();
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
      );
      return false;
    }
  }

  /// Đăng ký — khớp RegisterRequest bên backend (fullName, email, password, confirmPassword).
  /// Backend trả cùng AuthResponse như /auth/login nên đăng ký xong là đăng nhập luôn,
  /// không cần bắt người dùng đăng nhập lại lần nữa (giống useAuthStore.register bên web).
  Future<bool> register({
    required String fullName,
    required String email,
    required String password,
    required String confirmPassword,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final res = await ApiClient.instance.dio.post('/auth/register', data: {
        'fullName': fullName,
        'email': email,
        'password': password,
        'confirmPassword': confirmPassword,
      });
      final token = (res.data as Map<String, dynamic>)['token'] as String;
      await TokenStorage.instance.save(token);
      await fetchMe();
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
