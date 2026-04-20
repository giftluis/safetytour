import 'dart:convert';
import 'package:http/http.dart' as http;

class Api {
  // Change to your server IP for real device testing, e.g. http://192.168.1.50:8000/api
  static const String base = "https://adiaphorous-joaquin-bubbly.ngrok-free.dev/api";

  static Future<Map<String, dynamic>> login(String username, String password) async {
    final res = await http.post(
      Uri.parse("$base/auth/login/"),
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({"username": username, "password": password}),
    );
    if (res.statusCode >= 400) {
      throw Exception(_readError(res.body));
    }
    return jsonDecode(res.body);
  }

  static Future<List<dynamic>> listVisits(String accessToken) async {
    final res = await http.get(
      Uri.parse("$base/visits/"),
      headers: {"Authorization": "Bearer $accessToken"},
    );
    if (res.statusCode >= 400) {
      throw Exception(_readError(res.body));
    }
    return jsonDecode(res.body) as List<dynamic>;
  }

  static Future<Map<String, dynamic>> createVisit(String accessToken, Map<String, dynamic> payload) async {
    final res = await http.post(
      Uri.parse("$base/visits/"),
      headers: {"Authorization": "Bearer $accessToken", "Content-Type": "application/json"},
      body: jsonEncode(payload),
    );
    if (res.statusCode >= 400) {
      throw Exception(_readError(res.body));
    }
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> getVisit(String accessToken, int id) async {
    final res = await http.get(
      Uri.parse("$base/visits/$id/"),
      headers: {"Authorization": "Bearer $accessToken"},
    );
    if (res.statusCode >= 400) {
      throw Exception(_readError(res.body));
    }
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> getMe(String accessToken) async {
    final res = await http.get(
      Uri.parse("$base/auth/me/"),
      headers: {"Authorization": "Bearer $accessToken"},
    );
    if (res.statusCode >= 400) {
      throw Exception(_readError(res.body));
    }
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> getStats(String accessToken) async {
    final res = await http.get(
      Uri.parse("$base/visits/stats/"),
      headers: {"Authorization": "Bearer $accessToken"},
    );
    if (res.statusCode >= 400) {
      throw Exception(_readError(res.body));
    }
    return jsonDecode(res.body);
  }

  static Future<void> uploadVisitPhoto(String accessToken, int visitId, String filePath) async {
    var request = http.MultipartRequest('POST', Uri.parse("$base/attachments/"));
    request.headers['Authorization'] = 'Bearer $accessToken';
    request.fields['link_type'] = 'visit';
    request.fields['visit'] = visitId.toString();
    request.files.add(await http.MultipartFile.fromPath('image', filePath));
    
    final streamedResponse = await request.send();
    final res = await http.Response.fromStream(streamedResponse);
    
    if (res.statusCode >= 400) {
      throw Exception(_readError(res.body));
    }
  }

  static Future<Map<String, dynamic>> createActionItem(String accessToken, Map<String, dynamic> payload) async {
    final res = await http.post(
      Uri.parse("$base/action-items/"),
      headers: {"Authorization": "Bearer $accessToken", "Content-Type": "application/json"},
      body: jsonEncode(payload),
    );
    if (res.statusCode >= 400) {
      throw Exception(_readError(res.body));
    }
    return jsonDecode(res.body);
  }

  static String _readError(String body) {
    try {
      final j = jsonDecode(body);
      if (j is Map && j["detail"] != null) return j["detail"].toString();
      return body;
    } catch (_) {
      return body;
    }
  }
}
