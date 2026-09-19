import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";

import {
  createTeacherAssignment,
  getTeacherAttendance,
  getTeacherClass,
  getTeacherClasses,
  saveTeacherAttendance,
} from "../../../services/teacher/teacher-class.service";
import type {
  TeacherAttendanceRow,
  TeacherClass,
} from "../../../features/dashboard/teacher-classes.types";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

function getToday(): string {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export default function TeacherClassesScreen() {
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [students, setStudents] = useState<
    Awaited<ReturnType<typeof getTeacherClass>>["students"]
  >([]);
  const [attendance, setAttendance] = useState<TeacherAttendanceRow[]>([]);
  const [date, setDate] = useState(getToday);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [subject, setSubject] = useState("");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDescription, setAssignmentDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );

  const loadClasses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getTeacherClasses();
      setClasses(response.classes);

      if (!selectedClassId && response.classes[0]) {
        setSelectedClassId(response.classes[0].id);
      }
    } catch {
      setError("Impossible de charger vos classes.");
    } finally {
      setLoading(false);
    }
  }, [selectedClassId]);

  const loadClass = useCallback(async () => {
    if (!selectedClassId) {
      return;
    }

    try {
      setDetailLoading(true);
      setError(null);

      const [details, attendanceResponse] = await Promise.all([
        getTeacherClass(selectedClassId),
        getTeacherAttendance(selectedClassId, date),
      ]);

      setStudents(details.students);
      setAttendance(attendanceResponse.students);
    } catch {
      setError("Impossible de charger les élèves ou les présences.");
    } finally {
      setDetailLoading(false);
    }
  }, [date, selectedClassId]);

  useFocusEffect(
    useCallback(() => {
      void loadClasses();
    }, [loadClasses]),
  );

  useFocusEffect(
    useCallback(() => {
      void loadClass();
    }, [loadClass]),
  );

  async function handleCreateAssignment() {
    if (!selectedClassId || !subject.trim() || !assignmentTitle.trim()) {
      Alert.alert(
        "Informations manquantes",
        "La matière et le titre du devoir sont obligatoires.",
      );
      return;
    }

    try {
      setSaving(true);

      await createTeacherAssignment({
        classId: selectedClassId,
        subject: subject.trim(),
        title: assignmentTitle.trim(),
        description: assignmentDescription.trim() || null,
        assignedAt: new Date().toISOString(),
        dueDate: dueDate.trim()
          ? new Date(dueDate.trim() + "T23:59:59").toISOString()
          : null,
      });

      setAssignmentTitle("");
      setAssignmentDescription("");
      setDueDate("");

      Alert.alert("Devoir ajouté", "Le devoir a été attribué à la classe.");
    } catch {
      Alert.alert(
        "Erreur",
        "Le devoir n'a pas pu être enregistré.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleAttendance(
    row: TeacherAttendanceRow,
    status: AttendanceStatus,
  ) {
    if (!selectedClassId) {
      return;
    }

    try {
      setSaving(true);

      await saveTeacherAttendance(selectedClassId, {
        enrollmentId: row.enrollmentId,
        date,
        status,
      });

      setAttendance((current) =>
        current.map((item) =>
          item.enrollmentId === row.enrollmentId
            ? {
                ...item,
                attendance: {
                  id: item.attendance?.id ?? "local",
                  date,
                  status,
                  arrivalTime: null,
                  reason: null,
                  note: null,
                  recordedBy: "me",
                },
              }
            : item,
        ),
      );
    } catch {
      Alert.alert(
        "Erreur",
        "La présence n'a pas pu être enregistrée.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Chargement de vos classes…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Mes classes</Text>
      <Text style={styles.subtitle}>
        Gérez vos élèves, devoirs et présences depuis cet espace.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.classList}
      >
        {classes.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setSelectedClassId(item.id)}
            style={[
              styles.classChip,
              item.id === selectedClassId && styles.classChipActive,
            ]}
          >
            <Text
              style={[
                styles.classChipTitle,
                item.id === selectedClassId && styles.classChipTitleActive,
              ]}
            >
              {item.name}
            </Text>
            <Text
              style={[
                styles.classChipMeta,
                item.id === selectedClassId && styles.classChipMetaActive,
              ]}
            >
              {item.studentCount} élève{item.studentCount > 1 ? "s" : ""}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {selectedClass ? (
        <>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>{selectedClass.name}</Text>
              <Text style={styles.sectionMeta}>
                {selectedClass.level ?? "Niveau non renseigné"} ·{" "}
                {selectedClass.academicYear.name}
              </Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {students.length}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Liste des élèves</Text>

          {detailLoading ? (
            <ActivityIndicator />
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.cell, styles.nameCell]}>Élève</Text>
                <Text style={[styles.cell, styles.numberCell]}>N°</Text>
              </View>

              {students.map((item, index) => (
                <View key={item.enrollmentId} style={styles.tableRow}>
                  <View style={styles.nameCell}>
                    <Text style={styles.studentName}>
                      {index + 1}. {item.student.firstName}{" "}
                      {item.student.lastName}
                    </Text>
                  </View>
                  <Text style={[styles.cell, styles.numberCell]}>
                    {item.student.studentNumber}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Ajouter un devoir</Text>
            <Text style={styles.panelHint}>
              Le devoir sera attribué à toute la classe sélectionnée.
            </Text>

            <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholder="Matière"
              style={styles.input}
            />
            <TextInput
              value={assignmentTitle}
              onChangeText={setAssignmentTitle}
              placeholder="Titre du devoir"
              style={styles.input}
            />
            <TextInput
              value={assignmentDescription}
              onChangeText={setAssignmentDescription}
              placeholder="Consignes / description"
              multiline
              style={[styles.input, styles.multiline]}
            />
            <TextInput
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="Date limite : AAAA-MM-JJ"
              style={styles.input}
              autoCapitalize="none"
            />

            <Pressable
              disabled={saving}
              onPress={() => void handleCreateAssignment()}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
                saving && styles.disabled,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {saving ? "Enregistrement…" : "Ajouter le devoir"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.panel}>
            <View style={styles.attendanceHeader}>
              <View>
                <Text style={styles.panelTitle}>Présences / absences</Text>
                <Text style={styles.panelHint}>
                  Saisissez la date puis marquez chaque élève.
                </Text>
              </View>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="AAAA-MM-JJ"
                style={styles.dateInput}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.attendanceGridHeader}>
              <Text style={[styles.cell, styles.nameCell]}>Élève</Text>
              <Text style={styles.statusHeader}>Présent</Text>
              <Text style={styles.statusHeader}>Absent</Text>
              <Text style={styles.statusHeader}>Retard</Text>
            </View>

            {attendance.map((row) => {
              const current = row.attendance?.status;

              return (
                <View key={row.enrollmentId} style={styles.attendanceRow}>
                  <Text style={[styles.studentName, styles.nameCell]}>
                    {row.student.firstName} {row.student.lastName}
                  </Text>

                  {(["PRESENT", "ABSENT", "LATE"] as const).map((status) => (
                    <Pressable
                      key={status}
                      disabled={saving}
                      onPress={() => void handleAttendance(row, status)}
                      style={[
                        styles.statusButton,
                        current === status && styles.statusButtonActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusButtonText,
                          current === status &&
                            styles.statusButtonTextActive,
                        ]}
                      >
                        {status === "PRESENT"
                          ? "✓"
                          : status === "ABSENT"
                            ? "A"
                            : "R"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              );
            })}

            {attendance.length === 0 ? (
              <Text style={styles.muted}>
                Aucun élève actif dans cette classe.
              </Text>
            ) : null}
          </View>
        </>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.sectionTitle}>Aucune classe assignée</Text>
          <Text style={styles.muted}>
            Votre compte enseignant n'a encore aucune classe affectée.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  title: { fontSize: 28, fontWeight: "700", color: "#111827" },
  subtitle: { color: "#6B7280", lineHeight: 21 },
  error: { color: "#B91C1C", fontSize: 13 },
  classList: { gap: 10, paddingVertical: 2 },
  classChip: {
    minWidth: 130,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  classChipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  classChipTitle: { fontWeight: "700", color: "#111827" },
  classChipTitleActive: { color: "#FFFFFF" },
  classChipMeta: { marginTop: 5, color: "#6B7280", fontSize: 12 },
  classChipMetaActive: { color: "#E5E7EB" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  sectionMeta: { marginTop: 4, color: "#6B7280", fontSize: 13 },
  countBadge: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
  },
  countBadgeText: { fontWeight: "700", color: "#111827" },
  table: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  tableHeader: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#F1F5F9",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 54,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  cell: { fontSize: 12, color: "#6B7280" },
  nameCell: { flex: 1 },
  numberCell: { width: 90 },
  studentName: { color: "#111827", fontWeight: "600" },
  panel: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    gap: 10,
  },
  panelTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  panelHint: { color: "#6B7280", fontSize: 13, lineHeight: 18 },
  input: {
    minHeight: 46,
    paddingHorizontal: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    color: "#111827",
  },
  multiline: { minHeight: 88, paddingTop: 12, textAlignVertical: "top" },
  primaryButton: {
    minHeight: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "700" },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
  attendanceHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  dateInput: {
    width: 110,
    height: 42,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    color: "#111827",
    fontSize: 12,
  },
  attendanceGridHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  statusHeader: { width: 48, textAlign: "center", fontSize: 9, color: "#6B7280" },
  attendanceRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 58,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  statusButton: {
    width: 42,
    height: 36,
    marginLeft: 5,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  statusButtonActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  statusButtonText: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  statusButtonTextActive: { color: "#FFFFFF" },
  empty: {
    padding: 20,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  muted: { color: "#6B7280", fontSize: 13 },
});
