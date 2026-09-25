import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Lưu JWT an toàn trong Keychain (iOS) / Keystore (Android),
/// thay vì SharedPreferences thô như đã dặn trong plan Flutter.
class TokenStorage {
  TokenStorage._();
  static final TokenStorage instance = TokenStorage._();

  final _storage = const FlutterSecureStorage();
  static const _key = 'hairapy_jwt';

  Future<String?> read() => _storage.read(key: _key);

  Future<void> save(String token) => _storage.write(key: _key, value: token);

  Future<void> clear() => _storage.delete(key: _key);
}
