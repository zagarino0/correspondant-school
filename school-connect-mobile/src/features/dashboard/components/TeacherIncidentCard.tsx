import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { getTeacherClass } from "../../../services/teacher/teacher-class.service";
import { createTeacherIncident } from "../../../services/teacher/teacher-discipline.service";
import type {
  TeacherClass,
  TeacherClassStudent,
} from "../teacher-classes.types";

type Props = {
  classes: TeacherClass[];
  onCreated?: () => void;
};

const severities = [
  { value: "LOW", label: "Faible" },
  { value: "MEDIUM", label: "Moyenne" },
  { value: "HIGH", label: "Élevée" },
  { value: "CRITICAL", label: "Critique" },
] as const;

export function TeacherIncidentCard({ classes, onCreated }: Props) {
  const [visible, setVisible] = useState(false);
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<TeacherClassStudent[]>([]);
  const [studentId, setStudentId] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [type, setType] = useState("");
  const [severity, setSeverity] = useState<(typeof severities)[number]["value"]>("MEDIUM");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === classId) ?? null,
    [classes, classId],
  );

  const reset = () => {
    setClassId("");
    setStudents([]);
    setStudentId("");
    setType("");
    setSeverity("MEDIUM");
    setDescription("");
    setLocation("");
    setError("");
  };

  useEffect(() => {
    if (!classId) {
      setStudents([]);
      setStudentId("");
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        setLoadingStudents(true);
        setError("");
        const response = await getTeacherClass(classId);
        if (!cancelled) {
          setStudents(response.students);
          setStudentId("");
        }
      } catch {
        if (!cancelled) {
          setStudents([]);
          setError("Impossible de charger les élèves de cette classe.");
        }
      } finally {
        if (!cancelled) setLoadingStudents(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [classId]);

  const submit = async () => {
    if (!studentId || !type.trim() || !description.trim()) {
      setError("Sélectionnez un élève et renseignez le type et la description.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await createTeacherIncident({
        studentId,
        type: type.trim(),
        severity,
        description: description.trim(),
        location: location.trim() || null,
        occurredAt: new Date().toISOString(),
      });

      setVisible(false);
      reset();
      onCreated?.();
    } catch {
      setError("Impossible d'enregistrer l'incident.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text style={styles.eyebrow}>VIE SCOLAIRE</Text>
            <Text style={styles.title}>Signaler un incident</Text>
            <Text style={styles.description}>
              Signalez un incident concernant un élève. Le Surveillant pourra ensuite
              l'examiner et proposer une mesure disciplinaire.
            </Text>
          </View>
          <Text style={styles.icon}>!</Text>
        </View>

        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            setError("");
            setVisible(true);
          }}
          disabled={classes.length === 0}
        >
          <Text style={styles.primaryButtonText}>Créer un incident</Text>
        </Pressable>
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!saving) {
            setVisible(false);
            reset();
          }
        }}
      >
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <View style={styles.flex}>
                <Text style={styles.modalTitle}>Nouvel incident</Text>
                <Text style={styles.modalSubtitle}>
                  Déclarer un incident pour un élève
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  if (!saving) {
                    setVisible(false);
                    reset();
                  }
                }}
                disabled={saving}
              >
                <Text style={styles.close}>Fermer</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.form}
              contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.label}>Classe</Text>
              <View style={styles.chips}>
                {classes.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => setClassId(item.id)}
                    style={[styles.chip, classId === item.id && styles.chipActive]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        classId === item.id && styles.chipTextActive,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {selectedClass ? (
                <>
                  <Text style={styles.label}>Élève</Text>
                  {loadingStudents ? (
                    <ActivityIndicator />
                  ) : (
                    <View style={styles.studentList}>
                      {students.map((item) => (
                        <Pressable
                          key={item.enrollmentId}
                          onPress={() => setStudentId(item.student.id)}
                          style={[
                            styles.studentOption,
                            studentId === item.student.id && styles.studentOptionActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.studentName,
                              studentId === item.student.id && styles.studentNameActive,
                            ]}
                          >
                            {item.student.firstName} {item.student.lastName}
                          </Text>
                          <Text style={styles.studentNumber}>
                            {item.student.studentNumber}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </>
              ) : null}

              <Text style={styles.label}>Type d'incident</Text>
              <TextInput
                value={type}
                onChangeText={setType}
                placeholder="Ex. Comportement perturbateur"
                placeholderTextColor="#94A3B8"
                style={styles.input}
              />

              <Text style={styles.label}>Gravité</Text>
              <View style={styles.chips}>
                {severities.map((item) => (
                  <Pressable
                    key={item.value}
                    onPress={() => setSeverity(item.value)}
                    style={[styles.chip, severity === item.value && styles.chipActive]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        severity === item.value && styles.chipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Décrivez précisément les faits…"
                placeholderTextColor="#94A3B8"
                multiline
                textAlignVertical="top"
                style={[styles.input, styles.textarea]}
              />

              <Text style={styles.label}>Lieu (facultatif)</Text>
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="Ex. Salle 3"
                placeholderTextColor="#94A3B8"
                style={styles.input}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable
                style={[styles.submit, saving && styles.disabled]}
                onPress={() => void submit()}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitText}>Enregistrer l'incident</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  header: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  flex: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1, color: "#64748B" },
  title: { marginTop: 4, fontSize: 17, fontWeight: "900", color: "#111827" },
  description: { marginTop: 5, fontSize: 12, lineHeight: 17, color: "#64748B" },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    textAlign: "center",
    textAlignVertical: "center",
    backgroundColor: "#EEF2F7",
    color: "#344976",
    fontSize: 18,
    fontWeight: "900",
  },
  primaryButton: {
    marginTop: 14,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#344976",
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.4)",
  },
  modal: {
    maxHeight: "92%",
    backgroundColor: "#F5F7FA",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 16,
  },
  modalHeader: { flexDirection: "row", gap: 12, marginBottom: 12 },
  modalTitle: { fontSize: 19, fontWeight: "900", color: "#111827" },
  modalSubtitle: { marginTop: 3, fontSize: 12, color: "#64748B" },
  close: { color: "#344976", fontSize: 12, fontWeight: "900" },
  form: { flexGrow: 0 },
  formContent: { paddingBottom: 24 },
  label: { marginTop: 10, marginBottom: 6, fontSize: 11, fontWeight: "900", color: "#475569" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  chipActive: { borderColor: "#344976", backgroundColor: "#344976" },
  chipText: { fontSize: 10, fontWeight: "800", color: "#475569" },
  chipTextActive: { color: "#FFFFFF" },
  studentList: { gap: 7 },
  studentOption: {
    padding: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  studentOptionActive: { borderColor: "#344976", backgroundColor: "#EEF2F7" },
  studentName: { fontSize: 12, fontWeight: "800", color: "#111827" },
  studentNameActive: { color: "#344976" },
  studentNumber: { marginTop: 2, fontSize: 10, color: "#64748B" },
  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    color: "#111827",
    fontSize: 12,
  },
  textarea: { minHeight: 110, paddingVertical: 12 },
  error: { marginTop: 10, color: "#B91C1C", fontSize: 11, fontWeight: "700" },
  submit: {
    marginTop: 14,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#344976",
  },
  submitText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  disabled: { opacity: 0.6 },
});
