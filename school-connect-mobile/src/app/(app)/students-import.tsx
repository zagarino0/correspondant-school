import { useState } from "react";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as XLSX from "xlsx";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { bulkCreateSchoolStudents } from "../../services/school-admin/school-admin.service";
import type { BulkStudentInput } from "../../services/school-admin/school-admin.types";

const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase();

const getValue = (row: Record<string, unknown>, keys: string[]) => {
  const entry = Object.entries(row).find(([key]) => keys.includes(normalize(key)));
  return entry?.[1];
};

const parseDateValue = (value: unknown): string | null => {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)).toISOString();
  }
  const raw = String(value).trim();
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00.000Z` : raw;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export default function StudentsImportScreen() {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<BulkStudentInput[]>([]);
  const [loading, setLoading] = useState(false);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
      ],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets?.[0]) return;

    try {
      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const buffer = await response.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      if (!sheet) throw new Error("Aucune feuille Excel trouvée.");

      const raw: Array<Record<string, unknown>> = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const parsed: BulkStudentInput[] = raw.map((row: Record<string, unknown>) => ({
        firstName: String(getValue(row, ["firstname", "prénom", "prenom"]) ?? "").trim(),
        lastName: String(getValue(row, ["lastname", "nom"]) ?? "").trim(),
        email: String(getValue(row, ["email", "e-mail"]) ?? "").trim(),
        password: String(getValue(row, ["password", "motdepasse", "mot de passe"]) ?? "").trim(),
        studentNumber: String(getValue(row, ["studentnumber", "matricule", "numero", "numéro"]) ?? "").trim(),
        dateOfBirth: parseDateValue(getValue(row, ["dateofbirth", "date de naissance", "datenaissance"])),
        gender: String(getValue(row, ["gender", "genre", "sexe"]) ?? "").trim().toUpperCase() === "FEMALE" ||
          String(getValue(row, ["gender", "genre", "sexe"]) ?? "").trim().toLowerCase() === "fille" ? "FEMALE" : "MALE",
        className: String(getValue(row, ["classname", "classe"]) ?? "").trim(),
      }));

      if (!parsed.length) throw new Error("Le fichier ne contient aucune ligne.");
      const invalid = parsed.findIndex((row) => !row.firstName || !row.lastName || !row.email || row.password.length < 8 || !row.studentNumber || !row.className);
      if (invalid >= 0) throw new Error(`Ligne ${invalid + 2}: prénom, nom, email, mot de passe (8+), matricule et classe sont obligatoires.`);

      setRows(parsed);
      setFileName(asset.name);
    } catch (error: any) {
      Alert.alert("Fichier invalide", error?.message ?? "Impossible de lire le fichier Excel.");
      setRows([]);
      setFileName("");
    }
  };

  const importRows = async () => {
    try {
      setLoading(true);
      const response = await bulkCreateSchoolStudents(rows);
      Alert.alert("Import terminé", `${response.created} élève(s) ont été ajoutés.`, [
        { text: "OK", onPress: () => router.replace("/(app)/students") },
      ]);
    } catch (error: any) {
      Alert.alert("Import impossible", error?.response?.data?.error?.message ?? "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Importer des élèves</Text>
      <Text style={styles.subtitle}>Ajoutez plusieurs élèves en une seule opération à partir d'un fichier Excel (.xlsx, .xls ou CSV).</Text>

      <View style={styles.info}>
        <Text style={styles.infoTitle}>Colonnes attendues</Text>
        <Text style={styles.infoText}>firstName · lastName · email · password · studentNumber · dateOfBirth · gender · className</Text>
        <Text style={styles.infoHint}>gender : MALE/FEMALE ou Garçon/Fille. className doit correspondre exactement à une classe active.</Text>
      </View>

      <Pressable style={styles.pickButton} onPress={() => void pickFile()}>
        <Text style={styles.pickText}>{fileName ? "Changer le fichier" : "Choisir un fichier Excel"}</Text>
      </Pressable>

      {fileName ? <Text style={styles.file}>{fileName} · {rows.length} ligne(s)</Text> : null}

      {rows.length ? (
        <View style={styles.preview}>
          <Text style={styles.previewTitle}>Aperçu</Text>
          {rows.slice(0, 5).map((row, index) => (
            <View key={`${row.email}-${index}`} style={styles.previewRow}>
              <Text style={styles.name}>{row.lastName} {row.firstName}</Text>
              <Text style={styles.meta}>{row.email} · {row.className}</Text>
            </View>
          ))}
          {rows.length > 5 ? <Text style={styles.more}>+ {rows.length - 5} autre(s)</Text> : null}
        </View>
      ) : null}

      <Pressable disabled={!rows.length || loading} onPress={() => void importRows()} style={[styles.importAction, (!rows.length || loading) && styles.disabled]}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.importActionText}>Importer {rows.length || ""} élève(s)</Text>}
      </Pressable>

      <Pressable onPress={() => router.back()} style={styles.cancel}><Text>Annuler</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { width: "100%", maxWidth: 900, alignSelf: "center", padding: 20, paddingBottom: 40 },
  title: { fontSize: 25, fontWeight: "800", color: "#344976" },
  subtitle: { marginTop: 5, lineHeight: 20, color: "#6B7280" },
  info: { marginTop: 20, padding: 16, borderRadius: 15, backgroundColor: "#EEF2F7", borderWidth: 1, borderColor: "#D9DEE5" },
  infoTitle: { fontWeight: "800", color: "#344976" },
  infoText: { marginTop: 8, lineHeight: 20, color: "#111827" },
  infoHint: { marginTop: 7, fontSize: 12, lineHeight: 18, color: "#6B7280" },
  pickButton: { marginTop: 18, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: "#344976", backgroundColor: "#FFF", alignItems: "center" },
  pickText: { color: "#344976", fontWeight: "800" },
  file: { marginTop: 10, color: "#374151", fontWeight: "700" },
  preview: { marginTop: 18, borderRadius: 15, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFF", overflow: "hidden" },
  previewTitle: { padding: 14, backgroundColor: "#F1F5F9", fontWeight: "800", color: "#344976" },
  previewRow: { padding: 13, borderTopWidth: 1, borderTopColor: "#EEF2F7" },
  name: { fontWeight: "800", color: "#111827" },
  meta: { marginTop: 3, fontSize: 12, color: "#6B7280" },
  more: { padding: 12, color: "#6B7280" },
  importAction: { marginTop: 22, minHeight: 50, borderRadius: 12, backgroundColor: "#344976", alignItems: "center", justifyContent: "center" },
  importActionText: { color: "#FFF", fontWeight: "800" },
  disabled: { opacity: 0.45 },
  cancel: { marginTop: 14, padding: 14, alignItems: "center" },
});
