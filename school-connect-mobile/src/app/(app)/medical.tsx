import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { colors } from "../../theme";

import { useAuthStore } from "../../stores/authStore";
import {
  getMedicalAccess,
  getMedicalChildren,
  getMedicalDetails,
  getMedicalPeople,
  updateMedicalRecord,
  type MedicalChild,
  type MedicalDetailsResponse,
  type MedicalPerson,
  type MedicalUpdateInput,
} from "../../services/medical/medical.service";

const VITAL_CONFIG: Array<{
  key: "temperature" | "weightKg" | "bloodPressureSystolic" | "bloodPressureDiastolic";
  label: string;
  placeholder: string;
  suffix: string;
}> = [
  { key: "temperature", label: "Température", placeholder: "Ex. 36.8", suffix: "°C" },
  { key: "weightKg", label: "Poids", placeholder: "Ex. 62.5", suffix: "kg" },
  { key: "bloodPressureSystolic", label: "Tension systolique", placeholder: "Ex. 120", suffix: "mmHg" },
  { key: "bloodPressureDiastolic", label: "Tension diastolique", placeholder: "Ex. 80", suffix: "mmHg" },
];

const FIELD_CONFIG: Array<{
  key: keyof MedicalUpdateInput;
  label: string;
  placeholder: string;
  multiline?: boolean;
}> = [
  { key: "bloodGroup", label: "Groupe sanguin", placeholder: "Ex. O+" },
  { key: "allergies", label: "Allergies", placeholder: "Allergies connues…", multiline: true },
  { key: "medicalConditions", label: "Antécédents / pathologies", placeholder: "Antécédents médicaux…", multiline: true },
  { key: "medications", label: "Traitements en cours", placeholder: "Traitements et posologie…", multiline: true },
  { key: "emergencyContactName", label: "Contact d'urgence", placeholder: "Nom et prénom" },
  { key: "emergencyContactPhone", label: "Téléphone d'urgence", placeholder: "Téléphone" },
  { key: "doctorName", label: "Médecin traitant", placeholder: "Nom du médecin" },
  { key: "doctorPhone", label: "Téléphone du médecin", placeholder: "Téléphone" },
  { key: "notes", label: "Notes médicales", placeholder: "Informations complémentaires…", multiline: true },
];

function roleLabel(role: string, fn: string | null): string {
  if (role === "STUDENT") return "Élève";
  if (role === "TEACHER") return "Enseignant";
  if (role === "STAFF") return fn === "INFIRMIER" ? "Infirmier" : "Personnel";
  return role;
}

export default function MedicalScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [access, setAccess] = useState<Awaited<ReturnType<typeof getMedicalAccess>> | null>(null);
  const [people, setPeople] = useState<MedicalPerson[]>([]);
  const [children, setChildren] = useState<MedicalChild[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [details, setDetails] = useState<MedicalDetailsResponse | null>(null);
  const [draft, setDraft] = useState<MedicalUpdateInput>({});
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const currentAccess = await getMedicalAccess();

        if (!mounted) return;
        setAccess(currentAccess);

        if (!currentAccess.allowed) {
          setLoading(false);
          return;
        }

        if (currentAccess.mode === "PARENT") {
          const response = await getMedicalChildren();
          if (!mounted) return;
          setChildren(response.children);
          setSelectedUserId(response.children[0]?.userId ?? null);
        } else {
          const response = await getMedicalPeople();
          if (!mounted) return;
          setPeople(response.people);
          setSelectedUserId(response.people[0]?.id ?? null);
        }
      } catch (e) {
        if (mounted) {
          setError(
            e instanceof Error ? e.message : "Impossible de charger le module médical.",
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedUserId) {
      setDetails(null);
      return;
    }

    let mounted = true;
    async function loadDetails() {
      if (!selectedUserId) return;

      try {
        setDetailLoading(true);
        setError(null);
        const response = await getMedicalDetails(selectedUserId);
        if (!mounted) return;
        setDetails(response);
        setDraft({
          bloodGroup: response.record?.bloodGroup ?? "",
          temperature: response.record?.temperature ?? null,
          weightKg: response.record?.weightKg ?? null,
          bloodPressureSystolic: response.record?.bloodPressureSystolic ?? null,
          bloodPressureDiastolic: response.record?.bloodPressureDiastolic ?? null,
          allergies: response.record?.allergies ?? "",
          medicalConditions: response.record?.medicalConditions ?? "",
          medications: response.record?.medications ?? "",
          emergencyContactName: response.record?.emergencyContactName ?? "",
          emergencyContactPhone: response.record?.emergencyContactPhone ?? "",
          doctorName: response.record?.doctorName ?? "",
          doctorPhone: response.record?.doctorPhone ?? "",
          notes: response.record?.notes ?? "",
        });
      } catch (e) {
        if (mounted) {
          setDetails(null);
          setError(
            e instanceof Error ? e.message : "Impossible de charger la fiche médicale.",
          );
        }
      } finally {
        if (mounted) setDetailLoading(false);
      }
    }

    void loadDetails();
    return () => {
      mounted = false;
    };
  }, [selectedUserId]);

  const filteredPeople = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return people;

    return people.filter((person) =>
      `${person.firstName} ${person.lastName} ${person.email} ${person.studentNumber ?? ""} ${person.function ?? ""}`
        .toLowerCase()
        .includes(query),
    );
  }, [people, search]);

  const filteredChildren = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return children;

    return children.filter((child) =>
      `${child.firstName} ${child.lastName} ${child.studentNumber}`
        .toLowerCase()
        .includes(query),
    );
  }, [children, search]);

  const canEdit = access?.allowed === true && access.mode === "FULL";

  async function handleSave() {
    if (!selectedUserId || !canEdit) return;

    try {
      setSaving(true);
      setError(null);
      const response = await updateMedicalRecord(selectedUserId, {
        ...draft,
        bloodGroup: draft.bloodGroup?.trim() || null,
        temperature: draft.temperature === null || draft.temperature === undefined || Number.isNaN(Number(draft.temperature)) ? null : Number(draft.temperature),
        weightKg: draft.weightKg === null || draft.weightKg === undefined || Number.isNaN(Number(draft.weightKg)) ? null : Number(draft.weightKg),
        bloodPressureSystolic: draft.bloodPressureSystolic === null || draft.bloodPressureSystolic === undefined || Number.isNaN(Number(draft.bloodPressureSystolic)) ? null : Number(draft.bloodPressureSystolic),
        bloodPressureDiastolic: draft.bloodPressureDiastolic === null || draft.bloodPressureDiastolic === undefined || Number.isNaN(Number(draft.bloodPressureDiastolic)) ? null : Number(draft.bloodPressureDiastolic),
        allergies: draft.allergies?.trim() || null,
        medicalConditions: draft.medicalConditions?.trim() || null,
        medications: draft.medications?.trim() || null,
        emergencyContactName: draft.emergencyContactName?.trim() || null,
        emergencyContactPhone: draft.emergencyContactPhone?.trim() || null,
        doctorName: draft.doctorName?.trim() || null,
        doctorPhone: draft.doctorPhone?.trim() || null,
        notes: draft.notes?.trim() || null,
      });
      setDetails(response);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Impossible d'enregistrer la fiche médicale.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="colors.primary" />
        <Text style={styles.muted}>Chargement du module médical…</Text>
      </View>
    );
  }

  if (!access?.allowed) {
    return (
      <View style={styles.center}>
        <Text style={styles.lockIcon}>🩺</Text>
        <Text style={styles.title}>Accès médical indisponible</Text>
        <Text style={styles.muted}>
          {access?.reason ?? "Votre rôle ne permet pas d'accéder aux fiches médicales."}
        </Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const listItems = access.mode === "PARENT" ? filteredChildren : filteredPeople;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backCircle} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>SANTÉ</Text>
          <Text style={styles.headerTitle}>Fiches médicales</Text>
        </View>
        <Pressable
          style={styles.historyButton}
          onPress={() => router.push("/(app)/medical-history")}
        >
          <Text style={styles.historyButtonText}>Historique</Text>
        </Pressable>
        {selectedUserId ? (
          <Pressable
            style={styles.historyButton}
            onPress={() =>
              router.push({
                pathname: "/(app)/medical-reports",
                params: { userId: selectedUserId },
              })
            }
          >
            <Text style={styles.historyButtonText}>Rapports</Text>
          </Pressable>
        ) : null}
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>
            {access.mode === "PARENT" ? "Parent" : "Gestion"}
          </Text>
        </View>
      </View>

      <View style={[styles.body, width < 760 ? styles.bodyMobile : null]}>
        <View style={[styles.listPanel, width < 760 ? styles.listPanelMobile : null]}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={access.mode === "PARENT" ? "Rechercher un enfant…" : "Rechercher une personne…"}
            placeholderTextColor="colors.textMuted"
            style={styles.search}
          />

          <ScrollView showsVerticalScrollIndicator={false}>
            {listItems.length === 0 ? (
              <Text style={styles.empty}>Aucune personne trouvée.</Text>
            ) : (
              listItems.map((item) => {
                const isChild = access.mode === "PARENT";
                const id = isChild
                  ? (item as MedicalChild).userId
                  : (item as MedicalPerson).id;
                const firstName = item.firstName;
                const lastName = item.lastName;
                const label = `${firstName} ${lastName}`;
                const meta = isChild
                  ? `Élève · ${(item as MedicalChild).studentNumber}`
                  : `${roleLabel((item as MedicalPerson).role, (item as MedicalPerson).function)}${(item as MedicalPerson).studentNumber ? ` · ${(item as MedicalPerson).studentNumber}` : ""}`;

                return (
                  <Pressable
                    key={id}
                    onPress={() => setSelectedUserId(id)}
                    style={[styles.personItem, selectedUserId === id ? styles.personItemSelected : null]}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {item.firstName.charAt(0)}{item.lastName.charAt(0)}
                      </Text>
                    </View>
                    <View style={styles.personCopy}>
                      <Text style={styles.personName} numberOfLines={1}>{label}</Text>
                      <Text style={styles.personMeta} numberOfLines={1}>{meta}</Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>

        <ScrollView style={[styles.detailPanel, width < 760 ? styles.detailPanelMobile : null]} contentContainerStyle={styles.detailContent}>
          {detailLoading ? (
            <View style={styles.detailState}>
              <ActivityIndicator color="colors.primary" />
              <Text style={styles.muted}>Chargement de la fiche…</Text>
            </View>
          ) : details ? (
            <>
              <View style={styles.personHeader}>
                <View>
                  <Text style={styles.personTitle}>
                    {details.person.firstName} {details.person.lastName}
                  </Text>
                  <Text style={styles.personSubtitle}>
                    {roleLabel(details.person.role, details.person.function)}
                    {details.person.student?.studentNumber
                      ? ` · ${details.person.student.studentNumber}`
                      : ""}
                  </Text>
                </View>
                <View style={styles.secureBadge}>
                  <Text style={styles.secureBadgeText}>
                    {canEdit ? "Accès complet" : "Lecture seule"}
                  </Text>
                </View>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={styles.alertCard}>
                <Text style={styles.alertTitle}>⚠ Informations importantes</Text>
                <Text style={styles.alertText}>
                  Les données médicales sont réservées aux utilisateurs autorisés.
                </Text>
              </View>

              <View style={styles.formCard}>
                <View style={styles.sectionHeading}>
                  <View style={styles.sectionHeadingCopy}>
                    <Text style={styles.sectionTitle}>Constantes vitales</Text>
                    <Text style={styles.sectionHint}>Mesures relevées lors du suivi médical.</Text>
                  </View>
                  <View style={styles.sectionIcon}><Text style={styles.sectionIconText}>+</Text></View>
                </View>

                <View style={styles.vitalsGrid}>
                  {VITAL_CONFIG.map((field) => (
                    <View key={field.key} style={styles.vitalCard}>
                      <Text style={styles.vitalLabel}>{field.label}</Text>
                      <View style={styles.vitalInputRow}>
                        <TextInput
                          value={draft[field.key] === null || draft[field.key] === undefined ? "" : String(draft[field.key])}
                          onChangeText={(value) =>
                            setDraft((current) => ({
                              ...current,
                              [field.key]: value.trim() === "" ? null : Number(value.replace(",", ".")),
                            }))
                          }
                          placeholder={field.placeholder}
                          placeholderTextColor="colors.textMuted"
                          editable={canEdit}
                          keyboardType="decimal-pad"
                          style={[styles.vitalInput, !canEdit ? styles.inputReadOnly : null]}
                        />
                        <Text style={styles.vitalSuffix}>{field.suffix}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.sectionDivider} />

                <View style={styles.sectionHeading}>
                  <View style={styles.sectionHeadingCopy}>
                    <Text style={styles.sectionTitle}>Informations médicales</Text>
                    <Text style={styles.sectionHint}>Antécédents, traitements et contacts utiles.</Text>
                  </View>
                </View>

                {FIELD_CONFIG.map((field) => (
                  <View key={field.key} style={styles.field}>
                    <Text style={styles.fieldLabel}>{field.label}</Text>
                    <TextInput
                      value={String(draft[field.key] ?? "")}
                      onChangeText={(value) =>
                        setDraft((current) => ({ ...current, [field.key]: value }))
                      }
                      placeholder={field.placeholder}
                      placeholderTextColor="colors.textMuted"
                      editable={canEdit}
                      multiline={field.multiline}
                      style={[
                        styles.input,
                        field.multiline ? styles.inputMultiline : null,
                        !canEdit ? styles.inputReadOnly : null,
                      ]}
                    />
                  </View>
                ))}

                {canEdit ? (
                  <Pressable
                    disabled={saving}
                    onPress={() => void handleSave()}
                    style={[styles.saveButton, saving ? styles.disabled : null]}
                  >
                    {saving ? (
                      <ActivityIndicator color="colors.surface" />
                    ) : (
                      <Text style={styles.saveText}>Enregistrer la fiche</Text>
                    )}
                  </Pressable>
                ) : null}
              </View>
            </>
          ) : (
            <View style={styles.detailState}>
              <Text style={styles.title}>Sélectionnez une personne</Text>
              <Text style={styles.muted}>
                Choisissez une fiche dans la liste pour afficher les informations médicales.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 10, backgroundColor: colors.background },
  lockIcon: { fontSize: 36 },
  title: { fontSize: 21, fontWeight: "800", color: colors.text, textAlign: "center" },
  muted: { marginTop: 5, fontSize: 13, lineHeight: 19, color: colors.textSecondary, textAlign: "center" },
  backButton: { marginTop: 18, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 10, backgroundColor: colors.primary },
  backButtonText: { color: colors.surface, fontWeight: "800" },
  header: { minHeight: 76, paddingHorizontal: 18, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: "colors.border" },
  backCircle: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceMuted },
  backIcon: { fontSize: 31, color: colors.text, lineHeight: 34 },
  headerCopy: { flex: 1 },
  kicker: { fontSize: 10, fontWeight: "900", letterSpacing: 1.5, color: colors.primary },
  headerTitle: { marginTop: 2, fontSize: 20, fontWeight: "800", color: colors.text },
  headerBadge: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, backgroundColor: colors.primarySoft },
  historyButton: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 9, backgroundColor: colors.surfaceMuted },
  historyButtonText: { fontSize: 11, fontWeight: "900", color: colors.primary },
  headerBadgeText: { fontSize: 11, fontWeight: "800", color: colors.primary },
  body: { flex: 1, flexDirection: "row", gap: 14, padding: 14 },
  bodyMobile: { flexDirection: "column" },
  listPanel: { width: 330, maxWidth: "38%", padding: 12, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  listPanelMobile: { width: "100%", maxWidth: "100%", height: 235 },
  search: { minHeight: 44, paddingHorizontal: 13, borderRadius: 10, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, color: colors.text },
  personItem: { marginTop: 7, padding: 10, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 11 },
  personItemSelected: { backgroundColor: colors.surfaceMuted },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: colors.border },
  avatarText: { fontSize: 12, fontWeight: "800", color: colors.primary },
  personCopy: { flex: 1 },
  personName: { fontSize: 13, fontWeight: "800", color: colors.text },
  personMeta: { marginTop: 3, fontSize: 11, color: colors.textSecondary },
  empty: { marginTop: 20, paddingHorizontal: 8, fontSize: 13, color: colors.textSecondary, textAlign: "center" },
  detailPanel: { flex: 1, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  detailPanelMobile: { width: "100%" },
  detailContent: { padding: 18, paddingBottom: 40 },
  detailState: { minHeight: 300, alignItems: "center", justifyContent: "center", padding: 28 },
  personHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  personTitle: { fontSize: 23, fontWeight: "900", color: colors.text },
  personSubtitle: { marginTop: 5, fontSize: 13, color: colors.textSecondary },
  secureBadge: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, backgroundColor: colors.surfaceMuted },
  secureBadgeText: { fontSize: 11, fontWeight: "800", color: colors.textSecondary },
  alertCard: { marginTop: 16, padding: 13, borderRadius: 11, backgroundColor: "colors.surface7ED", borderWidth: 1, borderColor: colors.warningSoft },
  alertTitle: { fontSize: 12, fontWeight: "900", color: colors.warning },
  alertText: { marginTop: 4, fontSize: 12, lineHeight: 18, color: colors.warning },
  formCard: { marginTop: 14, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  sectionTitle: { fontSize: 17, fontWeight: "900", color: colors.text },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  sectionHeadingCopy: { flex: 1 },
  sectionHint: { marginTop: 4, fontSize: 11, lineHeight: 17, color: colors.textSecondary },
  sectionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceMuted },
  sectionIconText: { fontSize: 18, fontWeight: "900", color: colors.primary },
  vitalsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  vitalCard: { flexGrow: 1, flexBasis: 150, minWidth: 140, padding: 11, borderRadius: 12, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  vitalLabel: { fontSize: 11, fontWeight: "800", color: colors.textSecondary },
  vitalInputRow: { flexDirection: "row", alignItems: "center", marginTop: 7 },
  vitalInput: { flex: 1, minHeight: 40, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 9, backgroundColor: colors.surface, color: colors.text, fontSize: 14, fontWeight: "800" },
  vitalSuffix: { marginLeft: 7, minWidth: 38, fontSize: 11, fontWeight: "900", color: colors.textSecondary },
  sectionDivider: { height: 1, backgroundColor: colors.border, marginVertical: 18 },
  field: { marginTop: 13 },
  fieldLabel: { marginBottom: 6, fontSize: 12, fontWeight: "800", color: colors.textSecondary },
  input: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.surface, color: colors.text, fontSize: 13 },
  inputMultiline: { minHeight: 86, textAlignVertical: "top" },
  inputReadOnly: { backgroundColor: colors.background, color: colors.textSecondary },
  saveButton: { marginTop: 18, minHeight: 46, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
  saveText: { color: colors.surface, fontSize: 13, fontWeight: "900" },
  disabled: { opacity: 0.55 },
  error: { marginTop: 12, padding: 10, borderRadius: 9, backgroundColor: colors.dangerSoft, color: colors.danger, fontSize: 12 },
});
