import 'package:dio/dio.dart';
import 'token_storage.dart';

/// Base URL backend Spring Boot trên Railway.
/// Đổi sang biến môi trường (--dart-define) khi cần build nhiều flavor (dev/prod).
const String kApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://hairapy-production.up.railway.app/api',
);

/// Client dùng chung toàn app: tự gắn JWT vào header, tự log lỗi cơ bản.
/// KHÔNG cần lo CORS như bên web — app native gọi thẳng API, không qua browser.
class ApiClient {
  ApiClient._internal() {
    _dio = Dio(
      BaseOptions(
        baseUrl: kApiBaseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 20),
        headers: {'Content-Type': 'application/json'},
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await TokenStorage.instance.read();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          // Phiên hết hạn: backend hiện trả 403 với body RỖNG khi JWT hết hạn/sai
          // (Spring Security mặc định), còn các lỗi nghiệp vụ (hết lượt, cần Premium,
          // sai mật khẩu...) luôn có body JSON. Nên: có gửi token + body rỗng + 401/403
          // => token không còn dùng được -> xoá token và báo cho AuthNotifier đăng xuất.
          // (Nếu sau này backend đổi sang 401 kèm JSON, cần cập nhật điều kiện này.)
          final status = error.response?.statusCode;
          final data = error.response?.data;
          final emptyBody = data == null ||
              (data is String && data.trim().isEmpty) ||
              (data is Map && data.isEmpty);
          final hadToken = error.requestOptions.headers['Authorization'] != null;
          if (hadToken && emptyBody && (status == 401 || status == 403)) {
            await TokenStorage.instance.clear();
            onSessionExpired?.call();
          }
          handler.next(error);
        },
      ),
    );
  }

  /// AuthNotifier gán callback này để reset state đăng nhập khi phiên hết hạn.
  static void Function()? onSessionExpired;

  static final ApiClient instance = ApiClient._internal();
  late final Dio _dio;

  Dio get dio => _dio;
}
