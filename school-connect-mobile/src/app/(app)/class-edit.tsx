import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { updateSchoolClass } from "../../services/school-admin/school-admin.service";
import { colors } from "../../theme";

export default function ClassEditScreen() {
  const params = useLocalSearchParams<{ classId: string; name?: string; level?: string }>();
  const [name, setName] = useState(String(params.name ?? ""));
  const [level, setLevel] = useState(String(params.level ?? ""));
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!params.classId || !name.trim() || !level.trim()) {
      Alert.alert("Champs requis", "Le nom et le niveau sont obligatoires.");
      return;
    }

    try {
      setSaving(true);
      await updateSchoolClass(params.classId, {
        name: name.trim(),
        level: level.trim(),
      });
      Alert.alert("Classe modifiée", "Les informations de la classe ont été mises à jour.", [
        { text: "OK", onPress: () => router.replace("/(app)/classes") },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Modification impossible",
        error?.response?.data?.error?.message ?? "Une erreur est survenue.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>ADMINISTRATION</Text>
      <Text style={styles.title}>Modifier la classe</Text>
      <Text style={styles.subtitle}>Mettez à jour le nom ou le niveau de cette classe.</Text>

      <Text style={styles.label}>Nom de la classe</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Ex. CM2 A" style={styles.input} />

      <Text style={styles.label}>Niveau / cycle</Text>
      <TextInput value={level} onChangeText={setLevel} placeholder="Ex. Primaire" style={styles.input} />

      <Pressable disabled={saving} onPress={() => void submit()} style={[styles.button, saving && styles.disabled]}>
        <Text style={styles.buttonText}>{saving ? "Enregistrement…" : "Enregistrer les modifications"}</Text>
      </Pressable>

      <Pressable onPress={() => router.back()} style={styles.cancel}>
        <Text style={styles.cancelText}>Annuler</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "colors.background" },
  content: { width: "100%", maxWidth: 760, alignSelf: "center", padding: 24, paddingBottom: 40 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5, color: "colors.primary", marginBottom: 6 },
  title: { fontSize: 27, fontWeight: "800", color: "colors.text" },
  subtitle: { marginTop: 6, marginBottom: 22, color: "colors.textSecondary", lineHeight: 20 },
  label: { marginTop: 14, marginBottom: 7, fontWeight: "700", color: "colors.textSecondary" },
  input: { height: 48, borderWidth: 1, borderColor: "colors.border", borderRadius: 12, paddingHorizontal: 13, backgroundColor: "colors.surface" },
  button: { marginTop: 24, minHeight: 50, paddingHorizontal: 16, borderRadius: 12, backgroundColor: "colors.primary", alignItems: "center", justifyContent: "center" },
  buttonText: { color: "colors.surface", fontWeight: "800" },
  disabled: { opacity: 0.55 },
  cancel: { marginTop: 14, padding: 14, alignItems: "center" },
  cancelText: { color: "colors.primary", fontWeight: "700" },
});
