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
          // 401 -> token hết hạn/không hợp lệ: xoá token, để UI tự điều hướng
          // về Login (xử lý ở tầng provider/router, không side-effect ở đây).
          handler.next(error);
        },
      ),
    );
  }

  static final ApiClient instance = ApiClient._internal();
  late final Dio _dio;

  Dio get dio => _dio;
}
