import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../api.dart';
import '../auth_store.dart';

class NewVisitScreen extends StatefulWidget {
  const NewVisitScreen({super.key});
  @override
  State<NewVisitScreen> createState() => _NewVisitScreenState();
}

class _NewVisitScreenState extends State<NewVisitScreen> {
  final _formKey = GlobalKey<FormState>();
  
  // Section 1: Metadata
  final visitNo = TextEditingController(text: "V-${DateTime.now().millisecondsSinceEpoch}");
  final manager = TextEditingController();
  final area = TextEditingController();
  final theme = TextEditingController();
  bool p1 = false, p2 = false, p3 = false, p4 = false;
  final otherComments = TextEditingController();

  // Section 2: Observations & Photos
  final observation = TextEditingController();
  final List<XFile> photos = [];
  final ImagePicker picker = ImagePicker();

  // Section 3: Actions
  final List<Map<String, TextEditingController>> actions = [];

  bool busy = false;
  String err = "";

  void addAction() {
    setState(() {
      actions.add({
        "title": TextEditingController(),
        "description": TextEditingController(),
      });
    });
  }

  void removeAction(int index) {
    setState(() => actions.removeAt(index));
  }

  Future<void> pickImage() async {
    final XFile? image = await picker.pickImage(source: ImageSource.camera, imageQuality: 70);
    if (image != null) {
      setState(() => photos.add(image));
    }
  }

  Future<void> save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() { busy = true; err = ""; });
    try {
      final access = await AuthStore.getAccess();
      if (access == null) throw Exception("Not authenticated");

      final payload = {
        "visit_no": visitNo.text.trim(),
        "manager_name": manager.text.trim(),
        "visited_area": area.text.trim(),
        "theme": theme.text.trim(),
        "visit_datetime": DateTime.now().toUtc().toIso8601String(),
        "prep_previous_read": p1,
        "prep_scope_defined": p2,
        "prep_risks_considered": p3,
        "prep_checked_equip": p4,
        "prep_other_comments": otherComments.text.trim(),
        "prep_other": otherComments.text.isNotEmpty,
        "observation": observation.text.trim(),
      };

      final visit = await Api.createVisit(access, payload);
      final int visitId = visit["id"];

      // Upload photos sequentially
      for (var photo in photos) {
        await Api.uploadVisitPhoto(access, visitId, photo.path);
      }

      // Create Actions sequentially
      for (var action in actions) {
        final title = action["title"]!.text.trim();
        final desc = action["description"]!.text.trim();
        if (title.isNotEmpty) {
           await Api.createActionItem(access, {
             "visit": visitId,
             "title": title,
             "description": desc,
           });
        }
      }

      if (!mounted) return;
      Navigator.of(context).pop();
    } catch (e) {
      setState(() => err = e.toString());
    } finally {
      setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Capture Safety Tour"),
        backgroundColor: const Color(0xFFE60000),
        foregroundColor: Colors.white,
      ),
      body: busy 
        ? const Center(child: CircularProgressIndicator(color: Color(0xFFE60000)))
        : Form(
            key: _formKey,
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                if (err.isNotEmpty) 
                  Padding(
                    padding: const EdgeInsets.only(bottom: 15),
                    child: Text(err, style: const TextStyle(color: Colors.red)),
                  ),
                
                _buildSectionHeader("VISIT DETAILS"),
                TextFormField(
                  controller: visitNo, 
                  decoration: const InputDecoration(labelText: "Visit Number", filled: true),
                  validator: (v) => v!.isEmpty ? "Required" : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: manager, 
                  decoration: const InputDecoration(labelText: "Manager Name", filled: true),
                  validator: (v) => v!.isEmpty ? "Required" : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: area, 
                  decoration: const InputDecoration(labelText: "Visited Area", filled: true),
                  validator: (v) => v!.isEmpty ? "Required" : null,
                ),
                const SizedBox(height: 20),

                _buildSectionHeader("PREPARATION CHECKLIST"),
                _buildSwitch("Read previous tour issues", p1, (v) => setState(() => p1 = v)),
                _buildSwitch("Defined the scope", p2, (v) => setState(() => p2 = v)),
                _buildSwitch("Considered risks", p3, (v) => setState(() => p3 = v)),
                _buildSwitch("Checked equipment", p4, (v) => setState(() => p4 = v)),
                const SizedBox(height: 10),
                TextField(
                  controller: otherComments,
                  decoration: const InputDecoration(labelText: "Other Preparation Comments", filled: true),
                  maxLines: 2,
                ),
                const SizedBox(height: 20),

                _buildSectionHeader("OBSERVATIONS & FINDINGS"),
                TextField(
                  controller: observation,
                  decoration: const InputDecoration(labelText: "Enter your observations here...", filled: true),
                  maxLines: 4,
                ),
                const SizedBox(height: 20),

                _buildSectionHeader("PHOTOS"),
                if (photos.isNotEmpty)
                  SizedBox(
                    height: 100,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: photos.length,
                      itemBuilder: (context, index) => Padding(
                        padding: const EdgeInsets.only(right: 8.0),
                        child: Stack(
                          children: [
                            Image.file(File(photos[index].path), width: 100, height: 100, fit: BoxFit.cover),
                            Positioned(
                              right: 0,
                              child: GestureDetector(
                                onTap: () => setState(() => photos.removeAt(index)),
                                child: Container(color: Colors.black54, child: const Icon(Icons.close, color: Colors.white, size: 20)),
                              ),
                            )
                          ],
                        ),
                      ),
                    ),
                  ),
                const SizedBox(height: 10),
                OutlinedButton.icon(
                  onPressed: pickImage,
                  icon: const Icon(Icons.add_a_photo, color: Color(0xFFE60000)),
                  label: const Text("ADD PHOTO", style: TextStyle(color: Color(0xFFE60000))),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFFE60000)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
                const SizedBox(height: 20),

                _buildSectionHeader("ACTION ITEMS"),
                ...actions.asMap().entries.map((entry) {
                  int idx = entry.key;
                  var controllers = entry.value;
                  return Card(
                    margin: const EdgeInsets.only(bottom: 15),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text("Action #${idx + 1}", style: const TextStyle(fontWeight: FontWeight.bold)),
                              IconButton(onPressed: () => removeAction(idx), icon: const Icon(Icons.delete, color: Colors.grey, size: 20)),
                            ],
                          ),
                          TextField(controller: controllers["title"], decoration: const InputDecoration(labelText: "Action Title")),
                          TextField(controller: controllers["description"], decoration: const InputDecoration(labelText: "Description / Responsibility")),
                        ],
                      ),
                    ),
                  );
                }),
                OutlinedButton.icon(
                  onPressed: addAction,
                  icon: const Icon(Icons.add_task),
                  label: const Text("ADD ACTION ITEM"),
                  style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 12)),
                ),
                const SizedBox(height: 40),

                SizedBox(
                  height: 55,
                  child: ElevatedButton(
                    onPressed: save,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFE60000),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: const Text("SUBMIT SAFETY TOUR", style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(height: 30),
              ],
            ),
          ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 15, top: 10),
      child: Text(
        title,
        style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 1.2, fontSize: 12),
      ),
    );
  }

  Widget _buildSwitch(String title, bool value, Function(bool) onChanged) {
    return SwitchListTile(
      title: Text(title, style: const TextStyle(fontSize: 14)),
      value: value,
      onChanged: onChanged,
      activeThumbColor: const Color(0xFFE60000),
      contentPadding: EdgeInsets.zero,
    );
  }
}
