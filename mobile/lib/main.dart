import 'package:flutter/material.dart';
import 'screens/login_screen.dart';
import 'screens/visits_screen.dart';
import 'auth_store.dart';

void main() {
  runApp(const SafetyTourApp());
}

class SafetyTourApp extends StatelessWidget {
  const SafetyTourApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Safety Tour',
      theme: ThemeData(useMaterial3: true),
      home: const Boot(),
    );
  }
}

class Boot extends StatefulWidget {
  const Boot({super.key});
  @override
  State<Boot> createState() => _BootState();
}

class _BootState extends State<Boot> {
  bool loading = true;
  bool authed = false;

  @override
  void initState() {
    super.initState();
    _check();
  }

  Future<void> _check() async {
    final access = await AuthStore.getAccess();
    setState(() {
      authed = access != null && access.isNotEmpty;
      loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    return authed ? const VisitsScreen() : const LoginScreen();
  }
}
