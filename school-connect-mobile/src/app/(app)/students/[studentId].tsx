import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import {
  getStudent,
  getStudentClasses,
  updateStudent,
} from "../../../services/students/student.service";
import type {
  StudentClassOption,
  StudentGender,
  StudentStatus,
} from "../../../services/students/student.types";

const STATUS_OPTIONS: Array<{ label: string; value: StudentStatus }> = [
  { label: "Actif", value: "ACTIVE" },
  { label: "Inactif", value: "INACTIVE" },
  { label: "Suspendu", value: "SUSPENDED" },
];

const GENDER_OPTIONS: Array<{ label: string; value: StudentGender }> = [
  { label: "Garçon", value: "MALE" },
  { label: "Fille", value: "FEMALE" },
];

function toDateInput(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function toDateTime(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return new Date(`${trimmed}T00:00:00.000Z`).toISOString();
}

export default function StudentDetailScreen() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const id = Array.isArray(studentId) ? studentId[0] : studentId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<StudentGender | null>(null);
  const [status, setStatus] = useState<StudentStatus>("ACTIVE");
  const [classId, setClassId] = useState<string | null>(null);
  const [classes, setClasses] = useState<StudentClassOption[]>([]);

  const currentClass = useMemo(
    () => classes.find((item) => item.id === classId) ?? null,
    [classes, classId],
  );

  const load = useCallback(async () => {
    if (!id) {
      setError("Identifiant de l'élève manquant.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [studentResponse, classesResponse] = await Promise.all([
        getStudent(id),
        getStudentClasses(),
      ]);

      const student = studentResponse.student;
      const enrollment =
        student.enrollments.find((item) => item.status === "ACTIVE") ??
        student.enrollments[0] ??
        null;

      setFirstName(student.firstName);
      setLastName(student.lastName);
      setStudentNumber(student.studentNumber);
      setEmail(student.user.email);
      setDateOfBirth(toDateInput(student.dateOfBirth));
      setGender(student.gender);
      setStatus(student.status);
      setClassId(enrollment?.class.id ?? null);
      setClasses(classesResponse.classes);
    } catch {
      setError("Impossible de charger la fiche de l'élève.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    if (!id) return;

    if (!gender) {
      setError("Veuillez sélectionner le sexe de l'élève.");
      return;
    }

    if (!firstName.trim() || !lastName.trim() || !studentNumber.trim()) {
      setError("Le nom, le prénom et le matricule sont obligatoires.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await updateStudent(id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        studentNumber: studentNumber.trim(),
        email: email.trim(),
        password: password.trim() || undefined,
        dateOfBirth: toDateTime(dateOfBirth),
        gender,
        status,
        classId,
      });

      setPassword("");
      setSuccess("Les informations de l'élève ont été enregistrées.");
    } catch {
      setError(
        "Impossible d'enregistrer les modifications. Vérifiez les informations saisies.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.stateText}>Chargement de la fiche…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.headerIdentity}>
          <Text style={styles.title}>Modifier l'élève</Text>
          <Text style={styles.subtitle}>
            {lastName} {firstName}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>

          <Text style={styles.label}>Nom</Text>
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            style={styles.input}
            placeholder="Nom"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
          />

          <Text style={styles.label}>Prénom</Text>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            style={styles.input}
            placeholder="Prénom"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
          />

          <Text style={styles.label}>Sexe</Text>
          <View style={styles.optionRow}>
            {GENDER_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setGender(option.value)}
                style={[
                  styles.option,
                  gender === option.value && styles.optionActive,
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    gender === option.value && styles.optionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Date de naissance</Text>
          <TextInput
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            style={styles.input}
            placeholder="AAAA-MM-JJ"
            placeholderTextColor="#9CA3AF"
            keyboardType="numbers-and-punctuation"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scolarité</Text>

          <Text style={styles.label}>Matricule</Text>
          <TextInput
            value={studentNumber}
            onChangeText={setStudentNumber}
            style={styles.input}
            placeholder="Matricule"
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.label}>Classe</Text>
          {classes.length > 0 ? (
            <View style={styles.classGrid}>
              {classes.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => setClassId(item.id)}
                  style={[
                    styles.classOption,
                    classId === item.id && styles.classOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.classOptionTitle,
                      classId === item.id && styles.classOptionTextActive,
                    ]}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={[
                      styles.classOptionLevel,
                      classId === item.id && styles.classOptionTextActive,
                    ]}
                  >
                    {item.level ?? "Niveau non renseigné"}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.muted}>Aucune classe active disponible.</Text>
          )}

          {currentClass ? (
            <Text style={styles.currentClass}>
              Classe sélectionnée : {currentClass.name}
            </Text>
          ) : null}

          <Text style={styles.label}>Statut</Text>
          <View style={styles.optionRow}>
            {STATUS_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setStatus(option.value)}
                style={[
                  styles.option,
                  status === option.value && styles.optionActive,
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    status === option.value && styles.optionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compte</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholder="email@exemple.com"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Nouveau mot de passe</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            placeholder="Laisser vide pour ne pas modifier"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            autoCapitalize="none"
          />
          <Text style={styles.helper}>
            8 caractères minimum si vous renseignez un nouveau mot de passe.
          </Text>
        </View>

        <Pressable
          onPress={() => void handleSave()}
          disabled={saving}
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveText}>Enregistrer les modifications</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          disabled={saving}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelText}>Annuler</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  stateText: { marginTop: 8, fontSize: 12, color: "#6B7280" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  backText: { fontSize: 30, lineHeight: 32, color: "#111827" },
  headerIdentity: { flex: 1, marginLeft: 10 },
  title: { fontSize: 20, fontWeight: "800", color: "#111827" },
  subtitle: { marginTop: 2, fontSize: 12, color: "#6B7280" },
  content: { padding: 14, paddingBottom: 40 },
  section: {
    padding: 14,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D9DEE5",
    backgroundColor: "#FFFFFF",
  },
  sectionTitle: {
    marginBottom: 14,
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  label: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 11,
    fontWeight: "800",
    color: "#4B5563",
    textTransform: "uppercase",
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: "#D9DEE5",
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    color: "#111827",
    fontSize: 13,
  },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: {
    borderWidth: 1,
    borderColor: "#D9DEE5",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  optionActive: {
    borderColor: "#111827",
    backgroundColor: "#111827",
  },
  optionText: { fontSize: 12, fontWeight: "700", color: "#4B5563" },
  optionTextActive: { color: "#FFFFFF" },
  classGrid: { gap: 8 },
  classOption: {
    borderWidth: 1,
    borderColor: "#D9DEE5",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  classOptionActive: {
    borderColor: "#111827",
    backgroundColor: "#111827",
  },
  classOptionTitle: { fontSize: 13, fontWeight: "800", color: "#111827" },
  classOptionLevel: { marginTop: 2, fontSize: 11, color: "#6B7280" },
  classOptionTextActive: { color: "#FFFFFF" },
  currentClass: {
    marginTop: 8,
    fontSize: 11,
    color: "#6B7280",
  },
  muted: { fontSize: 12, color: "#6B7280" },
  helper: { marginTop: 6, fontSize: 10, color: "#6B7280" },
  errorBox: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
  },
  errorText: { color: "#991B1B", fontSize: 12, fontWeight: "600" },
  successBox: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#DCFCE7",
  },
  successText: { color: "#166534", fontSize: 12, fontWeight: "600" },
  saveButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#111827",
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  cancelButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  cancelText: { color: "#4B5563", fontSize: 13, fontWeight: "700" },
});
