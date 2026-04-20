import 'package:flutter/material.dart';
import '../api.dart';
import '../auth_store.dart';

class VisitDetailScreen extends StatefulWidget {
  final int visitId;
  const VisitDetailScreen({super.key, required this.visitId});

  @override
  State<VisitDetailScreen> createState() => _VisitDetailScreenState();
}

class _VisitDetailScreenState extends State<VisitDetailScreen> {
  bool loading = true;
  String err = "";
  Map<String, dynamic>? visit;

  Future<void> load() async {
    setState(() { loading = true; err = ""; });
    try {
      final access = await AuthStore.getAccess();
      if (access == null) throw Exception("Not authenticated");
      visit = await Api.getVisit(access, widget.visitId);
    } catch (e) {
      err = e.toString();
    } finally {
      setState(() => loading = false);
    }
  }

  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Visit Detail")),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : err.isNotEmpty
              ? Center(child: Text(err, style: const TextStyle(color: Colors.red)))
              : Padding(
                  padding: const EdgeInsets.all(16),
                  child: ListView(
                    children: [
                      Text("${visit?["visit_no"]}", style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                      Text("Area: ${visit?["visited_area"]}"),
                      Text("Manager: ${visit?["manager_name"]}"),
                      const SizedBox(height: 12),
                      const Text("Observations", style: TextStyle(fontWeight: FontWeight.bold)),
                      ...((visit?["observations"] as List<dynamic>? ?? []).map((o) {
                        return Card(
                          child: ListTile(
                            title: Text("#${o["number"]} • ${o["category"]}"),
                            subtitle: Text(o["text"]),
                          ),
                        );
                      })),
                      if ((visit?["observations"] as List<dynamic>? ?? []).isEmpty)
                        const Text("No observations yet."),
                    ],
                  ),
                ),
    );
  }
}
