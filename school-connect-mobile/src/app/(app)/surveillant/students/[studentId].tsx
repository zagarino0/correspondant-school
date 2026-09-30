import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import {
  getSchoolLifeProfile,
  type SchoolLifeProfile,
} from "../../../../services/surveillant/schoolLife.service";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusLabel(status: SchoolLifeProfile["status"]): string {
  return status === "ACTIVE"
    ? "Actif"
    : status === "INACTIVE"
      ? "Inactif"
      : "Suspendu";
}

function severityLabel(value: SchoolLifeProfile["incidents"][number]["severity"]): string {
  return {
    LOW: "Faible",
    MEDIUM: "Moyenne",
    HIGH: "Élevée",
    CRITICAL: "Critique",
  }[value];
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {typeof count === "number" ? (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{count}</Text>
          </View>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export default function SurveillantStudentLifeProfileScreen() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const id = Array.isArray(studentId) ? studentId[0] : studentId;

  const [profile, setProfile] = useState<SchoolLifeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setError("Identifiant de l'élève manquant.");
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setProfile(await getSchoolLifeProfile(id));
    } catch {
      setError("Impossible de charger la fiche vie scolaire.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeEnrollment = useMemo(
    () => profile?.enrollments[0] ?? null,
    [profile],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#344976" />
        <Text style={styles.stateText}>Chargement de la fiche…</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Fiche indisponible</Text>
        <Text style={styles.stateText}>{error ?? "Une erreur est survenue."}</Text>
        <Pressable style={styles.primaryButton} onPress={() => void load()}>
          <Text style={styles.primaryButtonText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  const openExits = profile.studentExits.filter((item) => item.status === "OPEN").length;
  const activeDiscipline = profile.disciplinaryActions.filter((item) => item.status === "ACTIVE").length;
  const pendingAuthorizations = profile.parentAuthorizations.filter((item) => item.status === "PENDING").length;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.headerIdentity}>
          <Text style={styles.eyebrow}>VIE SCOLAIRE</Text>
          <Text style={styles.title} numberOfLines={1}>
            {profile.lastName} {profile.firstName}
          </Text>
          <Text style={styles.subtitle}>
            {profile.studentNumber} · {activeEnrollment?.class.name ?? "Classe non renseignée"}
          </Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{statusLabel(profile.status)}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
      >
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.summaryGrid}>
          <SummaryCard label="Sorties ouvertes" value={openExits} />
          <SummaryCard label="Discipline active" value={activeDiscipline} />
          <SummaryCard label="Autorisations en attente" value={pendingAuthorizations} />
        </View>

        <Section title="Identité & scolarité">
          <InfoRow label="Élève" value={`${profile.firstName} ${profile.lastName}`} />
          <InfoRow label="Matricule" value={profile.studentNumber} />
          <InfoRow label="Classe" value={activeEnrollment?.class.name ?? "—"} />
          <InfoRow label="Niveau" value={activeEnrollment?.class.level ?? "—"} />
          <InfoRow label="Année scolaire" value={activeEnrollment?.academicYear.name ?? "—"} />
        </Section>

        <Section title="Parents / contacts" count={profile.parents.length}>
          {profile.parents.length === 0 ? (
            <Empty text="Aucun parent associé." />
          ) : (
            profile.parents.map((item) => (
              <View key={item.parent.id} style={styles.item}>
                <View style={styles.rowMain}>
                  <Text style={styles.itemTitle}>
                    {item.parent.firstName} {item.parent.lastName}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {item.relationship}{item.isPrimary ? " · Contact principal" : ""}
                  </Text>
                </View>
                <Text style={styles.itemValue}>{item.parent.phone ?? "Téléphone non renseigné"}</Text>
              </View>
            ))
          )}
        </Section>

        <Section title="Présences récentes" count={profile.attendances.length}>
          {profile.attendances.length === 0 ? (
            <Empty text="Aucune présence enregistrée." />
          ) : (
            profile.attendances.slice(0, 10).map((item) => (
              <View key={item.id} style={styles.item}>
                <View style={styles.rowMain}>
                  <Text style={styles.itemTitle}>{formatDate(item.date)}</Text>
                  <Text style={styles.itemMeta}>{item.reason ?? item.note ?? "Aucune observation"}</Text>
                </View>
                <StatusPill
                  label={item.status}
                  tone={
                    item.status === "PRESENT"
                      ? "success"
                      : item.status === "LATE"
                        ? "warning"
                        : "danger"
                  }
                />
              </View>
            ))
          )}
        </Section>

        <Section title="Sorties" count={profile.studentExits.length}>
          {profile.studentExits.length === 0 ? (
            <Empty text="Aucune sortie enregistrée." />
          ) : (
            profile.studentExits.slice(0, 10).map((item) => (
              <View key={item.id} style={styles.item}>
                <View style={styles.rowMain}>
                  <Text style={styles.itemTitle}>
                    {item.type === "TEMPORARY" ? "Sortie temporaire" : "Sortie définitive"}
                  </Text>
                  <Text style={styles.itemMeta}>{item.reason}</Text>
                  <Text style={styles.itemMeta}>
                    {formatDateTime(item.exitAt)} · {item.authorizedPersonName}
                  </Text>
                </View>
                <StatusPill
                  label={item.status}
                  tone={item.status === "OPEN" ? "warning" : item.status === "CANCELLED" ? "danger" : "success"}
                />
              </View>
            ))
          )}
        </Section>

        <Section title="Mouvements" count={profile.studentMovements.length}>
          {profile.studentMovements.length === 0 ? (
            <Empty text="Aucun mouvement enregistré." />
          ) : (
            profile.studentMovements.slice(0, 10).map((item) => (
              <View key={item.id} style={styles.item}>
                <View style={styles.rowMain}>
                  <Text style={styles.itemTitle}>
                    {item.type === "ENTRY" ? "Entrée" : "Sortie"}
                  </Text>
                  <Text style={styles.itemMeta}>{item.reason ?? "Sans motif"}</Text>
                </View>
                <Text style={styles.itemValue}>{formatDateTime(item.occurredAt)}</Text>
              </View>
            ))
          )}
        </Section>

        <Section title="Incidents" count={profile.incidents.length}>
          {profile.incidents.length === 0 ? (
            <Empty text="Aucun incident enregistré." />
          ) : (
            profile.incidents.slice(0, 10).map((item) => (
              <View key={item.id} style={styles.item}>
                <View style={styles.rowMain}>
                  <Text style={styles.itemTitle}>{item.type}</Text>
                  <Text style={styles.itemMeta}>{item.description}</Text>
                  <Text style={styles.itemMeta}>{formatDateTime(item.occurredAt)}</Text>
                </View>
                <StatusPill label={severityLabel(item.severity)} tone={item.severity === "CRITICAL" || item.severity === "HIGH" ? "danger" : item.severity === "MEDIUM" ? "warning" : "neutral"} />
              </View>
            ))
          )}
        </Section>

        <Section title="Suivi disciplinaire" count={profile.disciplinaryActions.length}>
          {profile.disciplinaryActions.length === 0 ? (
            <Empty text="Aucune action disciplinaire." />
          ) : (
            profile.disciplinaryActions.slice(0, 10).map((item) => (
              <View key={item.id} style={styles.item}>
                <View style={styles.rowMain}>
                  <Text style={styles.itemTitle}>{item.type}</Text>
                  <Text style={styles.itemMeta}>{item.description}</Text>
                  <Text style={styles.itemMeta}>{formatDateTime(item.actionAt)}</Text>
                </View>
                <StatusPill label={item.status} tone={item.status === "ACTIVE" ? "danger" : "neutral"} />
              </View>
            ))
          )}
        </Section>

        <Section title="Observations vie scolaire" count={profile.schoolLifeObservations.length}>
          {profile.schoolLifeObservations.length === 0 ? (
            <Empty text="Aucune observation." />
          ) : (
            profile.schoolLifeObservations.slice(0, 10).map((item) => (
              <View key={item.id} style={styles.itemStack}>
                <Text style={styles.itemMeta}>{formatDateTime(item.observedAt)}</Text>
                <Text style={styles.observation}>{item.content}</Text>
              </View>
            ))
          )}
        </Section>

        <Section title="Autorisations parentales" count={profile.parentAuthorizations.length}>
          {profile.parentAuthorizations.length === 0 ? (
            <Empty text="Aucune autorisation." />
          ) : (
            profile.parentAuthorizations.slice(0, 10).map((item) => (
              <View key={item.id} style={styles.item}>
                <View style={styles.rowMain}>
                  <Text style={styles.itemTitle}>{item.type}</Text>
                  <Text style={styles.itemMeta}>{item.reason ?? "Sans motif"}</Text>
                  <Text style={styles.itemMeta}>{formatDateTime(item.requestedAt)}</Text>
                </View>
                <StatusPill
                  label={item.status}
                  tone={item.status === "PENDING" ? "warning" : item.status === "APPROVED" ? "success" : "danger"}
                />
              </View>
            ))
          )}
        </Section>

        <Section title="Convocations parentales" count={profile.parentSummons.length}>
          {profile.parentSummons.length === 0 ? (
            <Empty text="Aucune convocation." />
          ) : (
            profile.parentSummons.slice(0, 10).map((item) => (
              <View key={item.id} style={styles.item}>
                <View style={styles.rowMain}>
                  <Text style={styles.itemTitle}>{item.reason}</Text>
                  <Text style={styles.itemMeta}>
                    Créée le {formatDateTime(item.createdAt)}
                  </Text>
                  {item.scheduledAt ? (
                    <Text style={styles.itemMeta}>
                      Rendez-vous : {formatDateTime(item.scheduledAt)}
                    </Text>
                  ) : null}
                </View>
                <StatusPill
                  label={item.status}
                  tone={item.status === "ACCEPTED" || item.status === "COMPLETED" ? "success" : item.status === "DECLINED" ? "danger" : "warning"}
                />
              </View>
            ))
          )}
        </Section>

        <Text style={styles.footerNote}>
          Cette fiche est dédiée au suivi de vie scolaire. Les données médicales ne sont pas affichées ici.
        </Text>
      </ScrollView>
    </View>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "warning" | "danger" | "neutral";
}) {
  return (
    <View style={[styles.pill, styles[`pill${tone[0].toUpperCase() + tone.slice(1)}` as "pillSuccess" | "pillWarning" | "pillDanger" | "pillNeutral"]]}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return <Text style={styles.emptyText}>{text}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC", padding: 24 },
  stateText: { marginTop: 8, fontSize: 12, color: "#64748B", textAlign: "center" },
  errorTitle: { fontSize: 18, fontWeight: "900", color: "#344976" },
  primaryButton: { marginTop: 18, minHeight: 44, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#344976" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 16, paddingBottom: 12, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0", gap: 10 },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF2F7" },
  backText: { fontSize: 30, lineHeight: 32, color: "#344976" },
  headerIdentity: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 9, fontWeight: "900", letterSpacing: 1.2, color: "#64748B" },
  title: { marginTop: 2, fontSize: 18, fontWeight: "900", color: "#344976" },
  subtitle: { marginTop: 3, fontSize: 11, color: "#64748B" },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: 12, backgroundColor: "#E2E8F0" },
  statusText: { fontSize: 9, fontWeight: "900", color: "#475569" },
  content: { padding: 14, paddingBottom: 40 },
  errorBox: { marginBottom: 12, padding: 11, borderRadius: 10, backgroundColor: "#FEE2E2" },
  errorText: { color: "#991B1B", fontSize: 11, fontWeight: "700" },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  summaryCard: { flex: 1, minWidth: 105, padding: 13, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D9DEE5" },
  summaryValue: { fontSize: 23, fontWeight: "900", color: "#344976" },
  summaryLabel: { marginTop: 4, fontSize: 9, fontWeight: "800", color: "#64748B" },
  section: { marginBottom: 12, padding: 13, borderRadius: 15, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D9DEE5" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "900", color: "#344976" },
  countBadge: { minWidth: 26, height: 26, paddingHorizontal: 7, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF2F7" },
  countText: { fontSize: 10, fontWeight: "900", color: "#475569" },
  infoRow: { flexDirection: "row", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#F1F5F9", gap: 10 },
  infoLabel: { width: 105, fontSize: 10, fontWeight: "800", color: "#94A3B8" },
  infoValue: { flex: 1, fontSize: 11, fontWeight: "700", color: "#334155" },
  item: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  itemStack: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  rowMain: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: 11, fontWeight: "900", color: "#334155" },
  itemMeta: { marginTop: 3, fontSize: 9, lineHeight: 13, color: "#64748B" },
  itemValue: { maxWidth: 125, fontSize: 9, fontWeight: "800", color: "#475569", textAlign: "right" },
  observation: { marginTop: 5, fontSize: 11, lineHeight: 17, color: "#334155" },
  pill: { minWidth: 58, paddingHorizontal: 7, paddingVertical: 6, borderRadius: 9, alignItems: "center" },
  pillSuccess: { backgroundColor: "#DCFCE7" },
  pillWarning: { backgroundColor: "#FEF3C7" },
  pillDanger: { backgroundColor: "#FEE2E2" },
  pillNeutral: { backgroundColor: "#E2E8F0" },
  pillText: { fontSize: 8, fontWeight: "900", color: "#475569" },
  emptyText: { paddingVertical: 12, fontSize: 10, color: "#94A3B8" },
  footerNote: { padding: 12, fontSize: 9, lineHeight: 14, color: "#94A3B8", textAlign: "center" },
});
