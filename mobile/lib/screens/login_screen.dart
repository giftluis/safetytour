import 'package:flutter/material.dart';
import '../api.dart';
import '../auth_store.dart';
import 'visits_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final username = TextEditingController();
  final password = TextEditingController();
  String err = "";
  bool busy = false;

  Future<void> onLogin() async {
    setState(() { err = ""; busy = true; });
    try {
      final tokens = await Api.login(username.text.trim(), password.text);
      await AuthStore.saveTokens(tokens["access"], tokens["refresh"]);
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const VisitsScreen()));
    } catch (e) {
      setState(() => err = e.toString());
    } finally {
      setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 30),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Branding Section
              Image.asset(
                'assets/images/logo.png',
                width: 100,
                height: 100,
              ),
              const SizedBox(height: 10),
              const Text(
                "SAFETY TOUR",
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2,
                  color: Color(0xFFE60000),
                ),
              ),
              const Text(
                "Digital Capture System",
                style: TextStyle(color: Colors.grey, fontSize: 14),
              ),
              const SizedBox(height: 40),

              if (err.isNotEmpty)
                Container(
                  padding: const EdgeInsets.all(10),
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(err, style: const TextStyle(color: Colors.red, fontSize: 13)),
                ),

              TextField(
                controller: username,
                decoration: InputDecoration(
                  labelText: "Username",
                  prefixIcon: const Icon(Icons.person_outline),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  filled: true,
                  fillColor: Colors.grey.shade50,
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: password,
                decoration: InputDecoration(
                  labelText: "Password",
                  prefixIcon: const Icon(Icons.lock_outline),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  filled: true,
                  fillColor: Colors.grey.shade50,
                ),
                obscureText: true,
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 55,
                child: ElevatedButton(
                  onPressed: busy ? null : onLogin,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFE60000),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  child: busy
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Text("SIGN IN", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                "v0.1.0-alpha",
                style: TextStyle(color: Colors.grey, fontSize: 12),
              )
            ],
          ),
        ),
      ),
    );
  }
}
