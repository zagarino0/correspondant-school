import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import {
  getSchoolLifeAuthorizations,
  getSchoolLifeDisciplinaryActions,
  getSchoolLifeExits,
  getSchoolLifeIncidents,
  getSchoolLifeMovements,
  type SchoolLifeAuthorizationItem,
  type SchoolLifeDisciplinaryItem,
  type SchoolLifeExitItem,
  type SchoolLifeIncidentItem,
  type SchoolLifeMovementItem,
} from "../../../services/surveillant/schoolLife.service";

type Tab = "overview" | "exits" | "movements" | "incidents" | "discipline" | "authorizations";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "overview", label: "Vue d'ensemble" },
  { key: "exits", label: "Sorties" },
  { key: "movements", label: "Mouvements" },
  { key: "incidents", label: "Incidents" },
  { key: "discipline", label: "Discipline" },
  { key: "authorizations", label: "Autorisations" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function dateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function studentName(item: {
  firstName: string;
  lastName: string;
}) {
  return `${item.lastName} ${item.firstName}`;
}

export default function SurveillantSchoolLifeScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [exits, setExits] = useState<SchoolLifeExitItem[]>([]);
  const [movements, setMovements] = useState<SchoolLifeMovementItem[]>([]);
  const [incidents, setIncidents] = useState<SchoolLifeIncidentItem[]>([]);
  const [discipline, setDiscipline] = useState<SchoolLifeDisciplinaryItem[]>([]);
  const [authorizations, setAuthorizations] = useState<SchoolLifeAuthorizationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const [nextExits, nextMovements, nextIncidents, nextDiscipline, nextAuthorizations] =
      await Promise.all([
        getSchoolLifeExits({ date: today() }),
        getSchoolLifeMovements({ date: today() }),
        getSchoolLifeIncidents(),
        getSchoolLifeDisciplinaryActions(),
        getSchoolLifeAuthorizations(),
      ]);

    setExits(nextExits);
    setMovements(nextMovements);
    setIncidents(nextIncidents);
    setDiscipline(nextDiscipline);
    setAuthorizations(nextAuthorizations);
  }, []);

  useEffect(() => {
    void load()
      .catch(() => setError("Impossible de charger la vie scolaire."))
      .finally(() => setLoading(false));
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } catch {
      setError("Impossible de rafraîchir la vie scolaire.");
    } finally {
      setRefreshing(false);
    }
  };

  const openExits = useMemo(
    () => exits.filter((item) => item.status === "OPEN").length,
    [exits],
  );
  const pendingAuthorizations = useMemo(
    () => authorizations.filter((item) => item.status === "PENDING").length,
    [authorizations],
  );
  const activeDiscipline = useMemo(
    () => discipline.filter((item) => item.status === "ACTIVE").length,
    [discipline],
  );
  const seriousIncidents = useMemo(
    () => incidents.filter((item) => item.severity === "HIGH" || item.severity === "CRITICAL").length,
    [incidents],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#344976" />
        <Text style={styles.muted}>Chargement de la vie scolaire…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.headerMain}>
            <Text style={styles.eyebrow}>ESPACE SURVEILLANT</Text>
            <Text style={styles.title}>Vie scolaire</Text>
            <Text style={styles.subtitle}>
              Suivi opérationnel des mouvements, sorties, incidents et autorisations.
            </Text>
          </View>
          <Pressable style={styles.studentsButton} onPress={() => router.push("/(app)/students")}>
            <Text style={styles.studentsButtonText}>Élèves</Text>
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void refresh()}>
              <Text style={styles.retryText}>Réessayer</Text>
            </Pressable>
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map((item) => (
            <Pressable
              key={item.key}
              style={[styles.tab, tab === item.key && styles.tabActive]}
              onPress={() => setTab(item.key)}
            >
              <Text style={[styles.tabText, tab === item.key && styles.tabTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {tab === "overview" ? (
          <>
            <View style={styles.statGrid}>
              <Stat label="Sorties ouvertes" value={openExits} />
              <Stat label="Mouvements aujourd'hui" value={movements.length} />
              <Stat label="Incidents" value={incidents.length} />
              <Stat label="Incidents sérieux" value={seriousIncidents} />
              <Stat label="Discipline active" value={activeDiscipline} />
              <Stat label="Autorisations en attente" value={pendingAuthorizations} />
            </View>

            <Section title="ACCÈS OPÉRATIONNELS">
              <ActionRow title="Sorties élèves" description="Suivre les élèves actuellement sortis et les retours." onPress={() => setTab("exits")} />
              <ActionRow title="Mouvements" description="Consulter les entrées et sorties enregistrées aujourd'hui." onPress={() => setTab("movements")} />
              <ActionRow title="Incidents" description="Consulter les incidents et leur niveau de gravité." onPress={() => setTab("incidents")} />
              <ActionRow title="Discipline" description="Suivre les mesures disciplinaires en cours." onPress={() => setTab("discipline")} />
              <ActionRow title="Autorisations parentales" description="Voir les demandes qui nécessitent un traitement." onPress={() => setTab("authorizations")} />
            </Section>

            <Section title="ÉLÈVES">
              <ActionRow
                title="Rechercher un élève"
                description="Accéder à la fiche vie scolaire complète d'un élève."
                onPress={() => router.push("/(app)/students")}
              />
            </Section>
          </>
        ) : null}

        {tab === "exits" ? (
          <Section title="SORTIES DU JOUR">
            {exits.length === 0 ? <Empty text="Aucune sortie enregistrée aujourd'hui." /> : exits.map((item) => (
              <ItemCard key={item.id}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{studentName(item.student)}</Text>
                  <Badge text={item.status === "OPEN" ? "EN SORTIE" : item.status} />
                </View>
                <Text style={styles.itemMeta}>{item.student.studentNumber} · {item.type === "TEMPORARY" ? "Temporaire" : "Définitive"}</Text>
                <Text style={styles.itemText}>{item.reason}</Text>
                <Text style={styles.itemMeta}>Départ {dateTime(item.exitAt)} · Retour {dateTime(item.returnAt)}</Text>
                <Text style={styles.itemMeta}>Personne autorisée : {item.authorizedPersonName}</Text>
              </ItemCard>
            ))}</Section>
        ) : null}

        {tab === "movements" ? (
          <Section title="MOUVEMENTS DU JOUR">
            {movements.length === 0 ? <Empty text="Aucun mouvement enregistré aujourd'hui." /> : movements.map((item) => (
              <ItemCard key={item.id}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{studentName(item.student)}</Text>
                  <Badge text={item.type === "ENTRY" ? "ENTRÉE" : "SORTIE"} />
                </View>
                <Text style={styles.itemMeta}>{item.student.studentNumber} · {dateTime(item.occurredAt)}</Text>
                <Text style={styles.itemText}>{item.reason || "Aucun motif renseigné."}</Text>
              </ItemCard>
            ))}</Section>
        ) : null}

        {tab === "incidents" ? (
          <Section title="INCIDENTS">
            {incidents.length === 0 ? <Empty text="Aucun incident enregistré." /> : incidents.slice(0, 50).map((item) => (
              <ItemCard key={item.id}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{studentName(item.student)}</Text>
                  <Badge text={item.severity} />
                </View>
                <Text style={styles.itemMeta}>{item.type} · {dateTime(item.occurredAt)}</Text>
                <Text style={styles.itemText}>{item.description}</Text>
              </ItemCard>
            ))}</Section>
        ) : null}

        {tab === "discipline" ? (
          <Section title="SUIVI DISCIPLINAIRE">
            {discipline.length === 0 ? <Empty text="Aucune mesure disciplinaire enregistrée." /> : discipline.slice(0, 50).map((item) => (
              <ItemCard key={item.id}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{studentName(item.student)}</Text>
                  <Badge text={item.status} />
                </View>
                <Text style={styles.itemMeta}>{item.type} · {dateTime(item.actionAt)}</Text>
                <Text style={styles.itemText}>{item.description}</Text>
              </ItemCard>
            ))}</Section>
        ) : null}

        {tab === "authorizations" ? (
          <Section title="AUTORISATIONS PARENTALES">
            {authorizations.length === 0 ? <Empty text="Aucune autorisation enregistrée." /> : authorizations.slice(0, 50).map((item) => (
              <ItemCard key={item.id}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{studentName(item.student)}</Text>
                  <Badge text={item.status} />
                </View>
                <Text style={styles.itemMeta}>{item.type} · demandée {dateTime(item.requestedAt)}</Text>
                <Text style={styles.itemText}>{item.reason || "Aucun motif renseigné."}</Text>
              </ItemCard>
            ))}</Section>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionRow({
  title,
  description,
  onPress,
}: {
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.actionRow} onPress={onPress}>
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
}

function ItemCard({ children }: { children: ReactNode }) {
  return <View style={styles.itemCard}>{children}</View>;
}

function Badge({ text }: { text: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{text.replaceAll("_", " ")}</Text>
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC" },
  muted: { marginTop: 10, color: "#64748B", fontSize: 12 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  headerMain: { flex: 1 },
  eyebrow: { fontSize: 9, fontWeight: "900", letterSpacing: 1.2, color: "#64748B" },
  title: { marginTop: 3, fontSize: 26, fontWeight: "900", color: "#344976" },
  subtitle: { marginTop: 5, fontSize: 12, lineHeight: 18, color: "#64748B" },
  studentsButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 11, backgroundColor: "#344976" },
  studentsButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  tabs: { gap: 8, paddingBottom: 14 },
  tab: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: "#D9DEE5", backgroundColor: "#FFFFFF" },
  tabActive: { backgroundColor: "#344976", borderColor: "#344976" },
  tabText: { color: "#475569", fontSize: 11, fontWeight: "800" },
  tabTextActive: { color: "#FFFFFF" },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 6 },
  stat: { width: "31.8%", minWidth: 105, padding: 13, borderRadius: 14, borderWidth: 1, borderColor: "#D9DEE5", backgroundColor: "#FFFFFF" },
  statValue: { fontSize: 21, fontWeight: "900", color: "#344976" },
  statLabel: { marginTop: 4, fontSize: 9, lineHeight: 13, color: "#64748B", fontWeight: "700" },
  section: { marginTop: 14 },
  sectionTitle: { marginBottom: 8, fontSize: 10, fontWeight: "900", letterSpacing: 0.8, color: "#64748B" },
  card: { overflow: "hidden", borderRadius: 16, borderWidth: 1, borderColor: "#D9DEE5", backgroundColor: "#FFFFFF" },
  actionRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#EEF2F7" },
  actionCopy: { flex: 1 },
  actionTitle: { fontSize: 13, fontWeight: "900", color: "#344976" },
  actionDescription: { marginTop: 3, fontSize: 10, lineHeight: 15, color: "#64748B" },
  arrow: { marginLeft: 10, fontSize: 25, color: "#94A3B8" },
  itemCard: { padding: 14, borderBottomWidth: 1, borderBottomColor: "#EEF2F7" },
  itemHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  itemTitle: { flex: 1, fontSize: 13, fontWeight: "900", color: "#344976" },
  itemMeta: { marginTop: 4, fontSize: 10, color: "#64748B" },
  itemText: { marginTop: 7, fontSize: 11, lineHeight: 16, color: "#334155" },
  badge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: "#EEF2F7" },
  badgeText: { fontSize: 8, fontWeight: "900", color: "#344976" },
  empty: { padding: 18, fontSize: 11, color: "#64748B" },
  errorBox: { marginBottom: 12, padding: 12, borderRadius: 12, backgroundColor: "#FEE2E2" },
  errorText: { fontSize: 11, color: "#991B1B", fontWeight: "700" },
  retryText: { marginTop: 7, fontSize: 11, color: "#991B1B", fontWeight: "900" },
});
