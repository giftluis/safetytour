import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AuthStore {
  static const _storage = FlutterSecureStorage();
  static const _kAccess = "access";
  static const _kRefresh = "refresh";

  static Future<void> saveTokens(String access, String refresh) async {
    await _storage.write(key: _kAccess, value: access);
    await _storage.write(key: _kRefresh, value: refresh);
  }

  static Future<String?> getAccess() => _storage.read(key: _kAccess);

  static Future<void> clear() async {
    await _storage.delete(key: _kAccess);
    await _storage.delete(key: _kRefresh);
  }
}
