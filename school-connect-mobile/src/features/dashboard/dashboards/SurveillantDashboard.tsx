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

import {
  createAttendanceEvent,
  createParentSummons,
  getDashboard,
} from "../../../services/surveillant/surveillant.service";
import type {
  AttendanceEventType,
  SurveillantDashboardResponse,
} from "../../../services/surveillant/surveillant.types";
import { createRealtimeConnection } from "../../../services/realtime/websocket.service";
import type { RealtimeEvent } from "../../../services/realtime/websocket.types";

type Props = {
  firstName: string;
};

type ActionItem = {
  id: string;
  attendanceId: string;
  student: { id: string; firstName: string; lastName: string };
  type: AttendanceEventType | null;
  reason: string | null;
  arrivalTime: string | null;
};

export function SurveillantDashboard({ firstName }: Props) {
  const [data, setData] = useState<SurveillantDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<
    "LATE_AUTHORIZED" | "LATE_NOT_AUTHORIZED" | "ABSENCE_JUSTIFIED" | "ABSENCE_UNJUSTIFIED"
  >("LATE_AUTHORIZED");

  const load = useCallback(async () => {
    const next = await getDashboard();
    setData(next);
  }, []);

  useEffect(() => {
    let mounted = true;

    void load()
      .catch(() => {
        if (mounted) setData(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const connection = createRealtimeConnection({
      onEvent: (event: RealtimeEvent) => {
        if (event.type === "attendance:event" || event.type === "parent:summons:new") {
          void load().catch(() => undefined);
        }
      },
    });

    connection.connect();

    return () => {
      mounted = false;
      connection.close();
    };
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const handleEvent = async (
    studentId: string,
    attendanceId: string,
    type: AttendanceEventType,
  ) => {
    setBusyId(`${attendanceId}:${type}`);
    try {
      await createAttendanceEvent(studentId, attendanceId, type);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const actionItems = useMemo<ActionItem[]>(() => {
    if (!data) return [];

    if (selectedAction === "LATE_AUTHORIZED" || selectedAction === "LATE_NOT_AUTHORIZED") {
      return data.lateArrivals
        .filter((item) => item.type !== selectedAction)
        .map((item) => ({
          id: item.id,
          attendanceId: item.attendanceId,
          student: item.student,
          type: item.type,
          reason: null,
          arrivalTime: item.attendance.arrivalTime,
        }));
    }

    return data.absenceItems
      .filter((item) => item.latestEvent?.type !== selectedAction)
      .map((item) => ({
        id: item.id,
        attendanceId: item.attendanceId,
        student: item.student,
        type: item.latestEvent?.type ?? null,
        reason: item.reason,
        arrivalTime: null,
      }));
  }, [data, selectedAction]);

  const actionCounts = useMemo(() => {
    if (!data) {
      return {
        LATE_AUTHORIZED: 0,
        LATE_NOT_AUTHORIZED: 0,
        ABSENCE_JUSTIFIED: 0,
        ABSENCE_UNJUSTIFIED: 0,
      };
    }

    return {
      LATE_AUTHORIZED: data.lateArrivals.filter((item) => item.type !== "LATE_AUTHORIZED").length,
      LATE_NOT_AUTHORIZED: data.lateArrivals.filter((item) => item.type !== "LATE_NOT_AUTHORIZED").length,
      ABSENCE_JUSTIFIED: data.absenceItems.filter((item) => item.latestEvent?.type !== "ABSENCE_JUSTIFIED").length,
      ABSENCE_UNJUSTIFIED: data.absenceItems.filter((item) => item.latestEvent?.type !== "ABSENCE_UNJUSTIFIED").length,
    };
  }, [data]);

  const handleSummons = async (studentId: string) => {
    setBusyId(`summons:${studentId}`);
    try {
      await createParentSummons(studentId, {
        reason: "Suivi de présence",
        message:
          "Nous vous invitons à prendre contact avec l'établissement concernant la présence de votre enfant.",
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#344976" />
        <Text style={styles.loadingText}>Chargement de votre espace…</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Espace surveillant indisponible</Text>
        <Text style={styles.emptyText}>
          Impossible de charger les données de surveillance.
        </Text>
        <Pressable style={styles.primaryButton} onPress={() => void refresh()}>
          <Text style={styles.primaryButtonText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>ESPACE SURVEILLANT</Text>
        <Text style={styles.title}>Bonjour, {firstName}</Text>
        <Text style={styles.subtitle}>
          Observez les présences et gérez les événements de surveillance.
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <Stat label="Élèves" value={data.summary.totalStudents} />
        <Stat label="Présents" value={data.summary.presentToday} />
        <Stat label="Absents" value={data.summary.absentToday} />
        <Stat label="Retards" value={data.summary.lateToday} />
      </View>

      <SectionTitle title="ACTIONS DU SURVEILLANT" />
      <View style={styles.actionGrid}>
        <ActionCard
          title="Retard autorisé"
          count={actionCounts.LATE_AUTHORIZED}
          active={selectedAction === "LATE_AUTHORIZED"}
          onPress={() => setSelectedAction("LATE_AUTHORIZED")}
        />
        <ActionCard
          title="Retard non autorisé"
          count={actionCounts.LATE_NOT_AUTHORIZED}
          active={selectedAction === "LATE_NOT_AUTHORIZED"}
          onPress={() => setSelectedAction("LATE_NOT_AUTHORIZED")}
        />
        <ActionCard
          title="Absence justifiée"
          count={actionCounts.ABSENCE_JUSTIFIED}
          active={selectedAction === "ABSENCE_JUSTIFIED"}
          onPress={() => setSelectedAction("ABSENCE_JUSTIFIED")}
        />
        <ActionCard
          title="Absence non justifiée"
          count={actionCounts.ABSENCE_UNJUSTIFIED}
          active={selectedAction === "ABSENCE_UNJUSTIFIED"}
          onPress={() => setSelectedAction("ABSENCE_UNJUSTIFIED")}
        />
      </View>

      <SectionTitle title="ÉLÈVES À TRAITER" />
      {actionItems.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyCard}>Aucun élève à traiter pour cette action.</Text>
        </View>
      ) : (
        actionItems.map((item) => {
          const student = item.student;
          const attendanceId = item.attendanceId;
          const isLate =
            selectedAction === "LATE_AUTHORIZED" ||
            selectedAction === "LATE_NOT_AUTHORIZED";

          return (
            <View key={item.id} style={styles.eventCard}>
              <View style={styles.eventMain}>
                <View style={styles.eventMainStudent}>
                  <Text style={styles.studentName}>
                    {student.firstName} {student.lastName}
                  </Text>
                  <Text style={styles.eventTime}>
                    {isLate
                      ? `Retard · arrivée ${item.arrivalTime
                          ? new Date(item.arrivalTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}`
                      : `Absence${item.reason ? " · " + item.reason : ""}`}
                  </Text>
                </View>
                <Text style={styles.latestEvent}>
                  {isLate
                    ? item.type === "LATE_AUTHORIZED"
                      ? "Autorisé"
                      : item.type === "LATE_NOT_AUTHORIZED"
                        ? "Non autorisé"
                        : "À traiter"
                    : item.type === "ABSENCE_JUSTIFIED"
                      ? "Justifiée"
                      : item.type === "ABSENCE_UNJUSTIFIED"
                        ? "Non justifiée"
                        : "À traiter"}
                </Text>
              </View>

              <View style={styles.actions}>
                <Pressable
                  style={[styles.actionButton, styles.primaryAction]}
                  disabled={busyId !== null}
                  onPress={() =>
                    void handleEvent(student.id, attendanceId, selectedAction)
                  }
                >
                  <Text style={styles.actionText}>
                    {selectedAction === "LATE_AUTHORIZED"
                      ? "Autoriser l'entrée"
                      : selectedAction === "LATE_NOT_AUTHORIZED"
                        ? "Refuser l'entrée"
                        : selectedAction === "ABSENCE_JUSTIFIED"
                          ? "Justifier l'absence"
                          : "Déclarer non justifiée"}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.summonsButton}
                  disabled={busyId !== null}
                  onPress={() => void handleSummons(student.id)}
                >
                  <Text style={styles.summonsText}>Convoquer le parent</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function ActionCard({
  title,
  count,
  active,
  onPress,
}: {
  title: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.actionCard, active && styles.actionCardActive]}
      onPress={onPress}
    >
      <Text style={[styles.actionCardTitle, active && styles.actionCardTitleActive]}>
        {title}
      </Text>
      <Text style={[styles.actionCardCount, active && styles.actionCardCountActive]}>
        {count}
      </Text>
      <Text style={[styles.actionCardHint, active && styles.actionCardHintActive]}>
        élèves à traiter
      </Text>
    </Pressable>
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

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  content: { padding: 16, paddingBottom: 110, gap: 10 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  loadingText: { marginTop: 10, color: "#64748B", fontSize: 13 },
  empty: { padding: 24, alignItems: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  emptyText: { marginTop: 8, color: "#64748B", textAlign: "center" },
  header: { paddingVertical: 6, marginBottom: 8 },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1, color: "#344976" },
  title: { marginTop: 4, fontSize: 26, fontWeight: "800", color: "#111827" },
  subtitle: { marginTop: 5, color: "#64748B", fontSize: 13, lineHeight: 19 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stat: { flexGrow: 1, flexBasis: "45%", minHeight: 86, padding: 14, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  statValue: { fontSize: 24, fontWeight: "800", color: "#111827" },
  statLabel: { marginTop: 4, fontSize: 12, color: "#64748B" },
  sectionTitle: { marginTop: 16, marginBottom: 3, fontSize: 11, fontWeight: "800", letterSpacing: 0.8, color: "#64748B" },
  card: { padding: 16, borderRadius: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  time: { fontSize: 12, fontWeight: "800", color: "#344976" },
  className: { marginTop: 4, fontSize: 16, fontWeight: "800", color: "#111827" },
  subject: { marginTop: 3, fontSize: 13, color: "#475569" },
  meta: { marginTop: 12, fontSize: 12, color: "#64748B" },
  emptyCard: { color: "#64748B", fontSize: 13 },
  eventCard: { padding: 14, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  eventMain: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  eventMainStudent: { flex: 1 },
  latestEvent: { fontSize: 11, fontWeight: "800", color: "#344976" },
  studentName: { flex: 1, fontSize: 14, fontWeight: "800", color: "#111827" },
  eventTime: { fontSize: 12, color: "#64748B" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 },
  actionButton: { paddingHorizontal: 11, paddingVertical: 9, borderRadius: 9 },
  allowButton: { backgroundColor: "#344976" },
  primaryAction: { backgroundColor: "#344976" },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionCard: { flexGrow: 1, flexBasis: "45%", minHeight: 104, padding: 14, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  actionCardActive: { backgroundColor: "#344976", borderColor: "#344976" },
  actionCardTitle: { fontSize: 13, fontWeight: "800", color: "#111827" },
  actionCardTitleActive: { color: "#FFFFFF" },
  actionCardCount: { marginTop: 12, fontSize: 24, fontWeight: "900", color: "#344976" },
  actionCardCountActive: { color: "#FFFFFF" },
  actionCardHint: { marginTop: 2, fontSize: 10, color: "#64748B" },
  actionCardHintActive: { color: "#E2E8F0" },
  denyButton: { backgroundColor: "#475569" },
  actionText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  summonsButton: { paddingHorizontal: 11, paddingVertical: 9, borderRadius: 9, borderWidth: 1, borderColor: "#344976" },
  summonsText: { color: "#344976", fontSize: 11, fontWeight: "800" },
  rowCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 14, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  rowMain: { flex: 1 },
  rowValue: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  room: { fontSize: 12, color: "#64748B" },
  primaryButton: { marginTop: 16, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10, backgroundColor: "#344976" },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800" },
});
