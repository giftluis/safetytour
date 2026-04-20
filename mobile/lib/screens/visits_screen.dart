import 'package:flutter/material.dart';
import '../api.dart';
import '../auth_store.dart';
import 'new_visit_screen.dart';
import 'visit_detail_screen.dart';
import 'login_screen.dart';

class VisitsScreen extends StatefulWidget {
  const VisitsScreen({super.key});
  @override
  State<VisitsScreen> createState() => _VisitsScreenState();
}

class _VisitsScreenState extends State<VisitsScreen> {
  bool loading = true;
  String err = "";
  List<dynamic> visits = [];
  Map<String, dynamic>? userProfile;
  int myTotalVisits = 0;

  Future<void> load() async {
    setState(() { loading = true; err = ""; });
    try {
      final access = await AuthStore.getAccess();
      if (access == null) throw Exception("Not authenticated");
      
      // Load profile and visits
      final results = await Future.wait([
        Api.getMe(access),
        Api.listVisits(access),
        Api.getStats(access),
      ]);

      userProfile = results[0] as Map<String, dynamic>;
      visits = results[1] as List<dynamic>;
      final stats = results[2] as Map<String, dynamic>;

      // Calculate my total visits from stats (it's already filtered for managers)
      myTotalVisits = (stats["by_manager"] as List).fold(0, (sum, item) => sum + (item["count"] as int));

    } catch (e) {
      err = e.toString();
    } finally {
      setState(() => loading = false);
    }
  }

  Future<void> logout() async {
    await AuthStore.clear();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const LoginScreen()));
  }

  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text("SAFETY TOURS", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, letterSpacing: 1)),
        backgroundColor: const Color(0xFFE60000),
        foregroundColor: Colors.white,
        actions: [
          IconButton(onPressed: logout, icon: const Icon(Icons.logout)),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: const Color(0xFFE60000),
        foregroundColor: Colors.white,
        onPressed: () async {
          await Navigator.of(context).push(MaterialPageRoute(builder: (_) => const NewVisitScreen()));
          load();
        },
        child: const Icon(Icons.add),
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFE60000)))
          : RefreshIndicator(
              onRefresh: load,
              child: ListView(
                children: [
                   _buildReportingHeader(),
                   if (err.isNotEmpty) Center(child: Padding(
                     padding: const EdgeInsets.all(20),
                     child: Text(err, style: const TextStyle(color: Colors.red)),
                   )),
                   Padding(
                     padding: const EdgeInsets.fromLTRB(20, 10, 20, 10),
                     child: Text("MY RECENT TOURS (${visits.length})", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey)),
                   ),
                   ...visits.map((v) => _buildVisitCard(v)).toList(),
                   const SizedBox(height: 80),
                ],
              ),
            ),
    );
  }

  Widget _buildReportingHeader() {
    return Container(
      padding: const EdgeInsets.all(25),
      decoration: const BoxDecoration(
        color: Color(0xFFE60000),
        borderRadius: BorderRadius.only(bottomLeft: Radius.circular(30), bottomRight: Radius.circular(30)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("Hello, ${userProfile?["first_name"] ?? 'Manager'}", style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
          const Text("Here's your tour performance summary.", style: TextStyle(color: Colors.white70, fontSize: 14)),
          const SizedBox(height: 25),
          Row(
            children: [
              _buildStatCard("Total Tours", myTotalVisits.toString(), Icons.directions_walk),
              const SizedBox(width: 15),
              _buildStatCard("BU / Region", userProfile?["business_unit"] ?? '-', Icons.business_center),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(15),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.15),
          borderRadius: BorderRadius.circular(15),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: Colors.white, size: 20),
            const SizedBox(height: 10),
            Text(value, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
            Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12)),
          ],
        ),
      ),
    );
  }

  Widget _buildVisitCard(dynamic v) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15), side: BorderSide(color: Colors.grey.shade200)),
      child: ListTile(
        contentPadding: const EdgeInsets.all(12),
        leading: Container(
          width: 50,
          height: 50,
          decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(12)),
          child: const Icon(Icons.assignment, color: Color(0xFFE60000)),
        ),
        title: Text(v["visit_no"], style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("${v["visited_area"]} • ${v["manager_name"]}"),
            Text(v["visit_datetime"], style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
          ],
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: v["status"] == "Completed" ? Colors.green.shade50 : Colors.blue.shade50,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            v["status"],
            style: TextStyle(
              color: v["status"] == "Completed" ? Colors.green : Colors.blue,
              fontSize: 11,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        onTap: () async {
          await Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => VisitDetailScreen(visitId: v["id"])),
          );
        },
      ),
    );
  }
}
