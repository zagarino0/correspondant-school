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
  const user = useAuthStore((state) => state.user);
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
      try {
        setDetailLoading(true);
        setError(null);
        const response = await getMedicalDetails(selectedUserId);
        if (!mounted) return;
        setDetails(response);
        setDraft({
          bloodGroup: response.record?.bloodGroup ?? "",
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
        <ActivityIndicator color="#344976" />
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
            placeholderTextColor="#94A3B8"
            style={styles.search}
          />

          <ScrollView showsVerticalScrollIndicator={false}>
            {listItems.length === 0 ? (
              <Text style={styles.empty}>Aucune personne trouvée.</Text>
            ) : (
              listItems.map((item) => {
                const id = "userId" in item ? item.userId : item.id;
                const label = `${item.firstName} ${item.lastName}`;
                const meta =
                  "studentNumber" in item
                    ? `Élève · ${item.studentNumber}`
                    : `${roleLabel(item.role, item.function)}${item.studentNumber ? ` · ${item.studentNumber}` : ""}`;

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
              <ActivityIndicator color="#344976" />
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
                <Text style={styles.sectionTitle}>Fiche médicale</Text>

                {FIELD_CONFIG.map((field) => (
                  <View key={field.key} style={styles.field}>
                    <Text style={styles.fieldLabel}>{field.label}</Text>
                    <TextInput
                      value={String(draft[field.key] ?? "")}
                      onChangeText={(value) =>
                        setDraft((current) => ({ ...current, [field.key]: value }))
                      }
                      placeholder={field.placeholder}
                      placeholderTextColor="#94A3B8"
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
                      <ActivityIndicator color="#FFFFFF" />
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
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 10, backgroundColor: "#F5F7FA" },
  lockIcon: { fontSize: 36 },
  title: { fontSize: 21, fontWeight: "800", color: "#111827", textAlign: "center" },
  muted: { marginTop: 5, fontSize: 13, lineHeight: 19, color: "#64748B", textAlign: "center" },
  backButton: { marginTop: 18, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 10, backgroundColor: "#344976" },
  backButtonText: { color: "#FFFFFF", fontWeight: "800" },
  header: { minHeight: 76, paddingHorizontal: 18, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  backCircle: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
  backIcon: { fontSize: 31, color: "#111827", lineHeight: 34 },
  headerCopy: { flex: 1 },
  kicker: { fontSize: 10, fontWeight: "900", letterSpacing: 1.5, color: "#344976" },
  headerTitle: { marginTop: 2, fontSize: 20, fontWeight: "800", color: "#111827" },
  headerBadge: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, backgroundColor: "#EEF2FF" },
  headerBadgeText: { fontSize: 11, fontWeight: "800", color: "#344976" },
  body: { flex: 1, flexDirection: "row", gap: 14, padding: 14 },
  bodyMobile: { flexDirection: "column" },
  listPanel: { width: 330, maxWidth: "38%", padding: 12, borderRadius: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  listPanelMobile: { width: "100%", maxWidth: "100%", height: 235 },
  search: { minHeight: 44, paddingHorizontal: 13, borderRadius: 10, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", color: "#111827" },
  personItem: { marginTop: 7, padding: 10, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 11 },
  personItemSelected: { backgroundColor: "#EEF2F7" },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "#E2E8F0" },
  avatarText: { fontSize: 12, fontWeight: "800", color: "#344976" },
  personCopy: { flex: 1 },
  personName: { fontSize: 13, fontWeight: "800", color: "#111827" },
  personMeta: { marginTop: 3, fontSize: 11, color: "#64748B" },
  empty: { marginTop: 20, paddingHorizontal: 8, fontSize: 13, color: "#64748B", textAlign: "center" },
  detailPanel: { flex: 1, borderRadius: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  detailPanelMobile: { width: "100%" },
  detailContent: { padding: 18, paddingBottom: 40 },
  detailState: { minHeight: 300, alignItems: "center", justifyContent: "center", padding: 28 },
  personHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  personTitle: { fontSize: 23, fontWeight: "900", color: "#111827" },
  personSubtitle: { marginTop: 5, fontSize: 13, color: "#64748B" },
  secureBadge: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, backgroundColor: "#F1F5F9" },
  secureBadgeText: { fontSize: 11, fontWeight: "800", color: "#475569" },
  alertCard: { marginTop: 16, padding: 13, borderRadius: 11, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA" },
  alertTitle: { fontSize: 12, fontWeight: "900", color: "#9A3412" },
  alertText: { marginTop: 4, fontSize: 12, lineHeight: 18, color: "#9A3412" },
  formCard: { marginTop: 14, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF" },
  sectionTitle: { fontSize: 17, fontWeight: "900", color: "#111827" },
  field: { marginTop: 13 },
  fieldLabel: { marginBottom: 6, fontSize: 12, fontWeight: "800", color: "#475569" },
  input: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10, backgroundColor: "#FFFFFF", color: "#111827", fontSize: 13 },
  inputMultiline: { minHeight: 86, textAlignVertical: "top" },
  inputReadOnly: { backgroundColor: "#F8FAFC", color: "#475569" },
  saveButton: { marginTop: 18, minHeight: 46, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#344976" },
  saveText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  disabled: { opacity: 0.55 },
  error: { marginTop: 12, padding: 10, borderRadius: 9, backgroundColor: "#FEF2F2", color: "#B91C1C", fontSize: 12 },
});
