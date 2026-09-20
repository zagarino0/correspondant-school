import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { createSchoolStudent } from "../../services/school-admin/school-admin.service";
import { getStudentClasses } from "../../services/students/student.service";
import type { StudentClassOption } from "../../services/students/student.types";

export default function StudentCreateScreen() {
  const [classes, setClasses] = useState<StudentClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<StudentClassOption | null>(null);
  const [classSearch, setClassSearch] = useState("");
  const [classModal, setClassModal] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getStudentClasses().then((response) => setClasses(response.classes)).catch(() => undefined);
  }, []);

  const filteredClasses = classes.filter((item) =>
    `${item.name} ${item.level ?? ""}`.toLowerCase().includes(classSearch.toLowerCase()),
  );

  const submit = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || password.length < 8 || !studentNumber.trim() || !selectedClass) {
      Alert.alert("Champs invalides", "Renseignez tous les champs obligatoires, un mot de passe de 8 caractères minimum et une classe.");
      return;
    }

    try {
      setSaving(true);
      await createSchoolStudent({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        studentNumber: studentNumber.trim(),
        dateOfBirth: dateOfBirth.trim() ? new Date(dateOfBirth.trim()).toISOString() : null,
        classId: selectedClass.id,
        gender,
      });
      Alert.alert("Élève créé", "L'élève a été ajouté à la classe active.", [
        { text: "OK", onPress: () => router.replace("/(app)/students") },
      ]);
    } catch (error: any) {
      Alert.alert("Création impossible", error?.response?.data?.error?.message ?? "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Nouvel élève</Text>
          <Text style={styles.subtitle}>Ajouter un élève dans l'année scolaire active.</Text>
        </View>
        <Pressable style={styles.importButton} onPress={() => router.push("/(app)/students-import")}>
          <Text style={styles.importText}>Importer Excel</Text>
        </Pressable>
      </View>

      {[
        ["Prénom", firstName, setFirstName],
        ["Nom", lastName, setLastName],
        ["Email", email, setEmail],
        ["Matricule", studentNumber, setStudentNumber],
      ].map(([label, value, setter]) => (
        <View key={label as string}>
          <Text style={styles.label}>{label as string}</Text>
          <TextInput
            value={value as string}
            onChangeText={setter as (value: string) => void}
            style={styles.input}
            autoCapitalize={label === "Email" ? "none" : "words"}
            keyboardType={label === "Email" ? "email-address" : "default"}
          />
        </View>
      ))}

      <Text style={styles.label}>Date de naissance</Text>
      <TextInput value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="AAAA-MM-JJ" style={styles.input} />

      <Text style={styles.label}>Genre</Text>
      <View style={styles.choices}>
        {([["MALE", "Garçon"], ["FEMALE", "Fille"]] as const).map(([value, label]) => (
          <Pressable key={value} onPress={() => setGender(value)} style={[styles.choice, gender === value && styles.choiceActive]}>
            <Text style={gender === value ? styles.choiceTextActive : styles.choiceText}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Classe</Text>
      <Pressable style={styles.select} onPress={() => setClassModal(true)}>
        <Text style={selectedClass ? styles.selectText : styles.placeholder}>
          {selectedClass ? `${selectedClass.name} · ${selectedClass.level ?? "Niveau"}` : "Sélectionner une classe"}
        </Text>
        <Text style={styles.chevron}>⌄</Text>
      </Pressable>

      <Text style={styles.label}>Mot de passe</Text>
      <TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />

      <Pressable disabled={saving} onPress={() => void submit()} style={styles.button}>
        <Text style={styles.buttonText}>{saving ? "Création…" : "Créer l'élève"}</Text>
      </Pressable>
      <Pressable onPress={() => router.back()} style={styles.cancel}><Text>Annuler</Text></Pressable>

      <Modal visible={classModal} transparent animationType="fade" onRequestClose={() => setClassModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir une classe</Text>
              <Pressable onPress={() => setClassModal(false)}><Text style={styles.close}>×</Text></Pressable>
            </View>
            <TextInput value={classSearch} onChangeText={setClassSearch} placeholder="Rechercher…" style={styles.input} />
            <FlatList
              data={filteredClasses}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable style={styles.classRow} onPress={() => { setSelectedClass(item); setClassModal(false); }}>
                  <Text style={styles.className}>{item.name}</Text>
                  <Text style={styles.classLevel}>{item.level ?? "Niveau non renseigné"}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { width: "100%", maxWidth: 900, alignSelf: "center", padding: 20, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 18 },
  title: { fontSize: 25, fontWeight: "800", color: "#344976" },
  subtitle: { marginTop: 5, color: "#6B7280", maxWidth: 620 },
  importButton: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 11, borderWidth: 1, borderColor: "#344976", backgroundColor: "#FFF" },
  importText: { color: "#344976", fontWeight: "800", fontSize: 12 },
  label: { marginTop: 14, marginBottom: 7, fontWeight: "700", color: "#374151" },
  input: { minHeight: 48, borderWidth: 1, borderColor: "#D9DEE5", borderRadius: 12, paddingHorizontal: 13, backgroundColor: "#FFF" },
  choices: { flexDirection: "row", gap: 8 },
  choice: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: "#D9DEE5", backgroundColor: "#FFF" },
  choiceActive: { backgroundColor: "#344976", borderColor: "#344976" },
  choiceText: { color: "#374151" },
  choiceTextActive: { color: "#FFF", fontWeight: "800" },
  select: { minHeight: 48, borderWidth: 1, borderColor: "#D9DEE5", borderRadius: 12, paddingHorizontal: 13, backgroundColor: "#FFF", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  selectText: { color: "#111827", fontWeight: "700" },
  placeholder: { color: "#9CA3AF" },
  chevron: { fontSize: 20, color: "#344976" },
  button: { marginTop: 24, padding: 15, borderRadius: 12, backgroundColor: "#344976", alignItems: "center" },
  buttonText: { color: "#FFF", fontWeight: "800" },
  cancel: { marginTop: 14, padding: 14, alignItems: "center" },
  overlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.42)", justifyContent: "center", padding: 18 },
  modal: { maxHeight: "82%", backgroundColor: "#FFF", borderRadius: 18, padding: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  close: { fontSize: 30, color: "#344976" },
  classRow: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#EEF2F7" },
  className: { fontWeight: "800", color: "#111827" },
  classLevel: { marginTop: 3, fontSize: 12, color: "#6B7280" },
});
