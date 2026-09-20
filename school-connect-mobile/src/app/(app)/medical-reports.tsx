import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  createMedicalReport,
  deleteMedicalReport,
  getMedicalAccess,
  getMedicalChildren,
  getMedicalPeople,
  getMedicalReports,
  type MedicalAccess,
  type MedicalChild,
  type MedicalPerson,
  type MedicalReport,
  type MedicalReportInput,
  type MedicalReportPriority,
  type MedicalReportType,
} from "../../services/medical/medical.service";

const TYPE_OPTIONS: Array<{ value: MedicalReportType; label: string }> = [
  { value: "INFIRMARY_VISIT", label: "Passage infirmerie" },
  { value: "MEDICAL_INCIDENT", label: "Incident médical" },
  { value: "CONSULTATION", label: "Consultation" },
  { value: "FOLLOW_UP", label: "Suivi médical" },
  { value: "PERIODIC", label: "Rapport périodique" },
];

const PRIORITY_OPTIONS: Array<{ value: MedicalReportPriority; label: string }> = [
  { value: "NORMAL", label: "Normal" },
  { value: "IMPORTANT", label: "Important" },
  { value: "URGENT", label: "Urgent" },
];

function typeLabel(value: string) {
  return TYPE_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function MedicalReportsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string }>();
  const { width } = useWindowDimensions();
  const wide = width >= 850;

  const initialUserId = typeof params.userId === "string" ? params.userId : null;

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(app)");
    }
  }, [router]);

  const [access, setAccess] = useState<MedicalAccess | null>(null);
  const [people, setPeople] = useState<MedicalPerson[]>([]);
  const [children, setChildren] = useState<MedicalChild[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialUserId);
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<MedicalReport | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingReports, setLoadingReports] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [type, setType] = useState<MedicalReportType>("INFIRMARY_VISIT");
  const [priority, setPriority] = useState<MedicalReportPriority>("NORMAL");
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [observations, setObservations] = useState("");
  const [actionsTaken, setActionsTaken] = useState("");
  const [outcome, setOutcome] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [parentContacted, setParentContacted] = useState(false);
  const [temperature, setTemperature] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [bloodPressureSystolic, setBloodPressureSystolic] = useState("");
  const [bloodPressureDiastolic, setBloodPressureDiastolic] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const a = await getMedicalAccess();
      setAccess(a);
      if (!a.allowed) return;

      if (a.mode === "FULL") {
        const result = await getMedicalPeople();
        setPeople(result.people);
        if (!selectedUserId && result.people[0]) setSelectedUserId(result.people[0].id);
      } else {
        const result = await getMedicalChildren();
        setChildren(result.children);
        if (!selectedUserId && result.children[0]) setSelectedUserId(result.children[0].userId);
      }
    } catch {
      setError("Impossible de charger les rapports médicaux.");
    } finally {
      setLoading(false);
    }
  }, [selectedUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadReports = useCallback(async () => {
    if (!selectedUserId || !access?.allowed) {
      setReports([]);
      return;
    }

    try {
      setLoadingReports(true);
      const result = await getMedicalReports(selectedUserId);
      setReports(result.reports);
      setSelectedReport(result.reports[0] ?? null);
    } catch {
      setError("Impossible de charger les rapports de cette fiche.");
    } finally {
      setLoadingReports(false);
    }
  }, [selectedUserId, access?.allowed]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const filteredPeople = useMemo(
    () =>
      people.filter((person) =>
        (person.firstName + " " + person.lastName)
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      ),
    [people, search],
  );

  const filteredChildren = useMemo(
    () =>
      children.filter((child) =>
        (child.firstName + " " + child.lastName)
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      ),
    [children, search],
  );

  const selectedName =
    access?.mode === "FULL"
      ? people.find((person) => person.id === selectedUserId)
      : children.find((child) => child.userId === selectedUserId);

  const createReport = async () => {
    if (!selectedUserId || !title.trim()) {
      Alert.alert("Rapport incomplet", "Sélectionnez une personne et renseignez le titre.");
      return;
    }

    try {
      setCreating(true);
      const input: MedicalReportInput = {
        targetUserId: selectedUserId,
        type,
        title: title.trim(),
        reportDate: new Date().toISOString(),
        priority,
        status: "FINAL",
        reason: reason.trim() || null,
        temperature: temperature.trim() === "" ? null : Number(temperature.replace(",", ".")),
        weightKg: weightKg.trim() === "" ? null : Number(weightKg.replace(",", ".")),
        bloodPressureSystolic: bloodPressureSystolic.trim() === "" ? null : Number(bloodPressureSystolic),
        bloodPressureDiastolic: bloodPressureDiastolic.trim() === "" ? null : Number(bloodPressureDiastolic),
        observations: observations.trim() || null,
        actionsTaken: actionsTaken.trim() || null,
        outcome: outcome.trim() || null,
        recommendations: recommendations.trim() || null,
        parentContacted,
      };
      const result = await createMedicalReport(input);
      setReports((current) => [result.report, ...current]);
      setSelectedReport(result.report);
      setTitle("");
      setReason("");
      setTemperature("");
      setWeightKg("");
      setBloodPressureSystolic("");
      setBloodPressureDiastolic("");
      setObservations("");
      setActionsTaken("");
      setOutcome("");
      setRecommendations("");
      setParentContacted(false);
    } catch {
      Alert.alert("Erreur", "Le rapport n'a pas pu être enregistré.");
    } finally {
      setCreating(false);
    }
  };

  const deleteReport = (report: MedicalReport) => {
    Alert.alert(
      "Supprimer le rapport",
      "Cette action supprime définitivement ce rapport.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMedicalReport(report.id);
              setReports((current) => current.filter((item) => item.id !== report.id));
              setSelectedReport(null);
            } catch {
              Alert.alert("Erreur", "Le rapport n'a pas pu être supprimé.");
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#344976" />
        <Text style={styles.muted}>Chargement des rapports médicaux…</Text>
      </View>
    );
  }

  if (!access?.allowed) {
    return (
      <View style={styles.center}>
        <Text style={styles.lock}>🔒</Text>
        <Text style={styles.title}>Rapports médicaux indisponibles</Text>
        <Text style={styles.muted}>{access?.reason ?? error ?? "Accès refusé."}</Text>
        <Pressable style={styles.primaryButton} onPress={goBack}>
          <Text style={styles.primaryText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>SUIVI MÉDICAL</Text>
          <Text style={styles.headerTitle}>Rapports médicaux</Text>
          <Text style={styles.headerSubtitle}>
            Documenter les passages, incidents, consultations et suivis.
          </Text>
        </View>
        <Pressable onPress={() => router.back()} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Retour</Text>
        </Pressable>
      </View>

      <View style={[styles.body, wide && styles.bodyWide]}>
        <View style={[styles.peoplePanel, wide && styles.panelWide]}>
          <Text style={styles.sectionTitle}>Personnes suivies</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher…"
            placeholderTextColor="#94A3B8"
            style={styles.search}
          />
          <ScrollView showsVerticalScrollIndicator={false}>
            {(access.mode === "FULL" ? filteredPeople : filteredChildren).map((item) => {
              const id = access.mode === "FULL" ? (item as MedicalPerson).id : (item as MedicalChild).userId;
              const firstName = item.firstName;
              const lastName = item.lastName;
              const selected = id === selectedUserId;
              return (
                <Pressable
                  key={id}
                  onPress={() => setSelectedUserId(id)}
                  style={[styles.personRow, selected && styles.personRowActive]}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{firstName.charAt(0)}{lastName.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.personName}>{firstName} {lastName}</Text>
                    <Text style={styles.personMeta}>
                      {access.mode === "FULL"
                        ? (item as MedicalPerson).role
                        : "Enfant · " + (item as MedicalChild).studentNumber}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={[styles.contentPanel, wide && styles.panelWide]}>
          <Text style={styles.sectionTitle}>
            {selectedName ? `${selectedName.firstName} ${selectedName.lastName}` : "Sélectionnez une personne"}
          </Text>

          {selectedUserId ? (
            <>
              <View style={styles.reportList}>
                <View style={styles.rowBetween}>
                  <Text style={styles.subTitle}>Rapports ({reports.length})</Text>
                  {loadingReports ? <ActivityIndicator size="small" color="#344976" /> : null}
                </View>
                {reports.length === 0 ? (
                  <Text style={styles.muted}>Aucun rapport enregistré pour cette fiche.</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {reports.map((report) => (
                      <Pressable
                        key={report.id}
                        onPress={() => setSelectedReport(report)}
                        style={[styles.reportChip, selectedReport?.id === report.id && styles.reportChipActive]}
                      >
                        <Text style={styles.reportChipTitle}>{report.title}</Text>
                        <Text style={styles.reportChipMeta}>{formatDate(report.reportDate)}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </View>

              {selectedReport ? (
                <View style={styles.detailCard}>
                  <View style={styles.rowBetween}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailTitle}>{selectedReport.title}</Text>
                      <Text style={styles.detailMeta}>
                        {typeLabel(selectedReport.type)} · {formatDate(selectedReport.reportDate)}
                      </Text>
                    </View>
                    {access.mode === "FULL" ? (
                      <Pressable onPress={() => deleteReport(selectedReport)}>
                        <Text style={styles.deleteText}>Supprimer</Text>
                      </Pressable>
                    ) : null}
                  </View>

                  <Text style={styles.badge}>{selectedReport.priority}</Text>
                  <View style={styles.vitalsSummary}>
                    <View style={styles.vitalSummaryItem}>
                      <Text style={styles.vitalSummaryLabel}>Température</Text>
                      <Text style={styles.vitalSummaryValue}>{selectedReport.temperature ?? "—"} °C</Text>
                    </View>
                    <View style={styles.vitalSummaryItem}>
                      <Text style={styles.vitalSummaryLabel}>Poids</Text>
                      <Text style={styles.vitalSummaryValue}>{selectedReport.weightKg ?? "—"} kg</Text>
                    </View>
                    <View style={styles.vitalSummaryItemWide}>
                      <Text style={styles.vitalSummaryLabel}>Tension</Text>
                      <Text style={styles.vitalSummaryValue}>
                        {selectedReport.bloodPressureSystolic ?? "—"} / {selectedReport.bloodPressureDiastolic ?? "—"} mmHg
                      </Text>
                    </View>
                  </View>
                  {[
                    ["Motif", selectedReport.reason],
                    ["Observations", selectedReport.observations],
                    ["Actions effectuées", selectedReport.actionsTaken],
                    ["Évolution", selectedReport.outcome],
                    ["Recommandations", selectedReport.recommendations],
                    ["Orientation", selectedReport.referredTo],
                    ["Notes", selectedReport.notes],
                  ].map(([label, value]) =>
                    value ? (
                      <View key={label} style={styles.detailBlock}>
                        <Text style={styles.detailLabel}>{label}</Text>
                        <Text style={styles.detailValue}>{value}</Text>
                      </View>
                    ) : null,
                  )}
                  <Text style={styles.detailFooter}>
                    Rédigé par {selectedReport.createdBy.firstName} {selectedReport.createdBy.lastName}
                  </Text>
                </View>
              ) : null}

              {access.mode === "FULL" ? (
                <View style={styles.formCard}>
                  <Text style={styles.subTitle}>Nouveau rapport</Text>
                  <View style={styles.optionRow}>
                    {TYPE_OPTIONS.map((option) => (
                      <Pressable
                        key={option.value}
                        onPress={() => setType(option.value)}
                        style={[styles.option, type === option.value && styles.optionActive]}
                      >
                        <Text style={[styles.optionText, type === option.value && styles.optionTextActive]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <TextInput value={title} onChangeText={setTitle} placeholder="Titre du rapport" placeholderTextColor="#94A3B8" style={styles.input} />
                  <TextInput value={reason} onChangeText={setReason} placeholder="Motif" placeholderTextColor="#94A3B8" style={styles.input} />
                  <Text style={styles.formSectionLabel}>Constantes vitales</Text>
                  <View style={styles.vitalsFormRow}>
                    <View style={styles.vitalField}>
                      <Text style={styles.vitalFieldLabel}>Température</Text>
                      <TextInput value={temperature} onChangeText={setTemperature} placeholder="36.8" placeholderTextColor="#94A3B8" keyboardType="decimal-pad" style={styles.compactInput} />
                      <Text style={styles.vitalUnit}>°C</Text>
                    </View>
                    <View style={styles.vitalField}>
                      <Text style={styles.vitalFieldLabel}>Poids</Text>
                      <TextInput value={weightKg} onChangeText={setWeightKg} placeholder="62.5" placeholderTextColor="#94A3B8" keyboardType="decimal-pad" style={styles.compactInput} />
                      <Text style={styles.vitalUnit}>kg</Text>
                    </View>
                    <View style={styles.vitalField}>
                      <Text style={styles.vitalFieldLabel}>Tension</Text>
                      <View style={styles.bpRow}>
                        <TextInput value={bloodPressureSystolic} onChangeText={setBloodPressureSystolic} placeholder="120" placeholderTextColor="#94A3B8" keyboardType="number-pad" style={styles.bpInput} />
                        <Text style={styles.bpSlash}>/</Text>
                        <TextInput value={bloodPressureDiastolic} onChangeText={setBloodPressureDiastolic} placeholder="80" placeholderTextColor="#94A3B8" keyboardType="number-pad" style={styles.bpInput} />
                      </View>
                      <Text style={styles.vitalUnit}>mmHg</Text>
                    </View>
                  </View>
                  <TextInput value={observations} onChangeText={setObservations} placeholder="Observations" placeholderTextColor="#94A3B8" style={[styles.input, styles.multiline]} multiline />
                  <TextInput value={actionsTaken} onChangeText={setActionsTaken} placeholder="Actions effectuées" placeholderTextColor="#94A3B8" style={[styles.input, styles.multiline]} multiline />
                  <TextInput value={outcome} onChangeText={setOutcome} placeholder="Évolution / résultat" placeholderTextColor="#94A3B8" style={[styles.input, styles.multiline]} multiline />
                  <TextInput value={recommendations} onChangeText={setRecommendations} placeholder="Recommandations" placeholderTextColor="#94A3B8" style={[styles.input, styles.multiline]} multiline />

                  <Text style={styles.detailLabel}>Priorité</Text>
                  <View style={styles.optionRow}>
                    {PRIORITY_OPTIONS.map((option) => (
                      <Pressable
                        key={option.value}
                        onPress={() => setPriority(option.value)}
                        style={[styles.option, priority === option.value && styles.optionActive]}
                      >
                        <Text style={[styles.optionText, priority === option.value && styles.optionTextActive]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Pressable onPress={() => setParentContacted((value) => !value)} style={styles.checkRow}>
                    <View style={[styles.checkbox, parentContacted && styles.checkboxActive]}>
                      {parentContacted ? <Text style={styles.check}>✓</Text> : null}
                    </View>
                    <Text style={styles.checkLabel}>Parent contacté</Text>
                  </Pressable>

                  <Pressable disabled={creating} onPress={() => void createReport()} style={styles.primaryButton}>
                    {creating ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Enregistrer le rapport</Text>}
                  </Pressable>
                </View>
              ) : (
                <Text style={styles.readOnly}>Lecture seule — vous consultez uniquement les rapports de votre enfant.</Text>
              )}
            </>
          ) : (
            <Text style={styles.muted}>Sélectionnez une personne pour consulter ses rapports.</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 10, backgroundColor: "#F5F7FA" },
  lock: { fontSize: 34 },
  title: { fontSize: 22, fontWeight: "900", color: "#111827", textAlign: "center" },
  muted: { color: "#64748B", fontSize: 13, lineHeight: 19 },
  header: { padding: 14, borderBottomWidth: 1, borderBottomColor: "#E2E8F0", backgroundColor: "#FFFFFF", flexDirection: "row", gap: 12, alignItems: "center" },
  eyebrow: { color: "#344976", fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
  headerTitle: { marginTop: 2, fontSize: 21, fontWeight: "900", color: "#111827" },
  headerSubtitle: { marginTop: 2, color: "#64748B", fontSize: 12 },
  body: { flex: 1, padding: 14 },
  bodyWide: { flexDirection: "row", gap: 12 },
  panelWide: { flex: 1 },
  peoplePanel: { width: 280, maxHeight: "100%", backgroundColor: "#FFFFFF", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  contentPanel: { flex: 1, minWidth: 0, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#E2E8F0" },
  sectionTitle: { fontSize: 17, fontWeight: "900", color: "#111827", marginBottom: 10 },
  subTitle: { fontSize: 14, fontWeight: "900", color: "#111827" },
  search: { height: 42, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 10, paddingHorizontal: 12, color: "#111827", marginBottom: 8 },
  personRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 12, marginBottom: 5 },
  personRowActive: { backgroundColor: "#EEF2F8" },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#E7EBF2", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#344976", fontWeight: "900", fontSize: 12 },
  personName: { color: "#111827", fontWeight: "800", fontSize: 13 },
  personMeta: { color: "#64748B", fontSize: 11, marginTop: 2 },
  reportList: { borderBottomWidth: 1, borderBottomColor: "#E2E8F0", paddingBottom: 14 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  reportChip: { width: 190, padding: 11, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", marginRight: 8, marginTop: 10 },
  reportChipActive: { borderColor: "#344976", backgroundColor: "#F1F4F9" },
  reportChipTitle: { fontSize: 12, fontWeight: "800", color: "#111827" },
  reportChipMeta: { fontSize: 10, color: "#64748B", marginTop: 4 },
  detailCard: { marginTop: 10, padding: 12, borderRadius: 14, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" },
  detailTitle: { fontSize: 17, fontWeight: "900", color: "#111827" },
  detailMeta: { color: "#64748B", fontSize: 11, marginTop: 4 },
  badge: { alignSelf: "flex-start", marginTop: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: "#E7EBF2", color: "#344976", fontSize: 10, fontWeight: "900" },
  detailBlock: { marginTop: 12 },
  detailLabel: { fontSize: 11, fontWeight: "900", color: "#64748B", textTransform: "uppercase" },
  detailValue: { marginTop: 3, fontSize: 13, lineHeight: 19, color: "#1E293B" },
  detailFooter: { marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#E2E8F0", color: "#64748B", fontSize: 11 },
  deleteText: { color: "#B91C1C", fontSize: 11, fontWeight: "900" },
  formCard: { marginTop: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0" },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 7, marginBottom: 7 },
  option: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF" },
  optionActive: { backgroundColor: "#344976", borderColor: "#344976" },
  optionText: { fontSize: 11, fontWeight: "800", color: "#475569" },
  optionTextActive: { color: "#FFFFFF" },
  input: { minHeight: 40, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: "#111827", marginTop: 8, backgroundColor: "#FFFFFF" },
  multiline: { minHeight: 58, textAlignVertical: "top" },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 12 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1, borderColor: "#94A3B8", alignItems: "center", justifyContent: "center" },
  checkboxActive: { backgroundColor: "#344976", borderColor: "#344976" },
  check: { color: "#FFFFFF", fontWeight: "900" },
  checkLabel: { color: "#334155", fontSize: 12, fontWeight: "700" },
  primaryButton: { marginTop: 10, alignSelf: "flex-start", backgroundColor: "#344976", paddingHorizontal: 15, paddingVertical: 11, borderRadius: 10 },
  primaryText: { color: "#FFFFFF", fontWeight: "900", fontSize: 12 },
  secondaryButton: { borderWidth: 1, borderColor: "#CBD5E1", paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
  secondaryText: { color: "#344976", fontSize: 12, fontWeight: "900" },
  readOnly: { marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: "#F1F5F9", color: "#64748B", fontSize: 12, lineHeight: 18 },
  vitalsSummary: { flexDirection: "row", gap: 8, marginTop: 10, padding: 9, borderRadius: 10, backgroundColor: "#EEF2F8" },
  vitalSummaryItem: { flex: 1, minWidth: 0 },
  vitalSummaryItemWide: { flex: 1.35, minWidth: 0 },
  vitalSummaryLabel: { fontSize: 9, fontWeight: "900", color: "#64748B", textTransform: "uppercase" },
  vitalSummaryValue: { marginTop: 2, fontSize: 12, fontWeight: "900", color: "#344976" },
  formSectionLabel: { marginTop: 8, fontSize: 10, fontWeight: "900", color: "#64748B", textTransform: "uppercase" },
  vitalsFormRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6, marginBottom: 2 },
  vitalField: { flex: 1, minWidth: 150, position: "relative" },
  vitalFieldLabel: { fontSize: 10, fontWeight: "800", color: "#475569", marginBottom: 4 },
  compactInput: { height: 36, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 8, paddingHorizontal: 9, paddingRight: 34, color: "#111827", backgroundColor: "#FFFFFF" },
  vitalUnit: { position: "absolute", right: 9, bottom: 9, fontSize: 10, fontWeight: "800", color: "#64748B" },
  bpRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  bpInput: { flex: 1, minWidth: 0, height: 36, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 8, paddingHorizontal: 8, color: "#111827", backgroundColor: "#FFFFFF" },
  bpSlash: { color: "#64748B", fontWeight: "900" },
});
