import { useCallback, useEffect, useState } from "react";
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
import type { SurveillantDashboardResponse } from "../../../services/surveillant/surveillant.types";
import { createRealtimeConnection } from "../../../services/realtime/websocket.service";
import type { RealtimeEvent } from "../../../services/realtime/websocket.types";

type Props = {
  firstName: string;
};

export function SurveillantDashboard({ firstName }: Props) {
  const [data, setData] = useState<SurveillantDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

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
    type:
      | "LATE_AUTHORIZED"
      | "LATE_NOT_AUTHORIZED"
      | "ABSENCE_JUSTIFIED"
      | "ABSENCE_UNJUSTIFIED",
  ) => {
    setBusyId(`${attendanceId}:${type}`);
    try {
      await createAttendanceEvent(studentId, attendanceId, type);
      await load();
    } finally {
      setBusyId(null);
    }
  };

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

      <SectionTitle title="SUIVI EN COURS" />
      {data.currentSession ? (
        <View style={styles.card}>
          <Text style={styles.time}>
            {data.currentSession.startTime} – {data.currentSession.endTime}
          </Text>
          <Text style={styles.className}>{data.currentSession.className}</Text>
          <Text style={styles.subject}>
            {data.currentSession.subject}
            {data.currentSession.teacher
              ? ` · ${data.currentSession.teacher.firstName} ${data.currentSession.teacher.lastName}`
              : ""}
          </Text>
          <Text style={styles.meta}>
            {data.currentSession.attendance.totalStudents} élèves ·{" "}
            {data.currentSession.attendance.present} présents ·{" "}
            {data.currentSession.attendance.absent} absents ·{" "}
            {data.currentSession.attendance.late} retards
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.emptyCard}>Aucune séance en cours.</Text>
        </View>
      )}

      <SectionTitle title="RETARDS DU JOUR" />
      {data.lateArrivals.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyCard}>Aucun retard enregistré.</Text>
        </View>
      ) : (
        data.lateArrivals.map((item) => (
          <View key={item.id} style={styles.eventCard}>
            <View style={styles.eventMain}>
              <Text style={styles.studentName}>
                {item.student.firstName} {item.student.lastName}
              </Text>
              <Text style={styles.eventTime}>
                Arrivée {item.attendance.arrivalTime
                  ? new Date(item.attendance.arrivalTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </Text>
            </View>

            <View style={styles.actions}>
              <Pressable
                style={[styles.actionButton, styles.allowButton]}
                disabled={busyId !== null}
                onPress={() =>
                  void handleEvent(item.student.id, item.attendanceId, "LATE_AUTHORIZED")
                }
              >
                <Text style={styles.actionText}>Autoriser</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.denyButton]}
                disabled={busyId !== null}
                onPress={() =>
                  void handleEvent(item.student.id, item.attendanceId, "LATE_NOT_AUTHORIZED")
                }
              >
                <Text style={styles.actionText}>Refuser</Text>
              </Pressable>
              <Pressable
                style={styles.summonsButton}
                disabled={busyId !== null}
                onPress={() => void handleSummons(item.student.id)}
              >
                <Text style={styles.summonsText}>Convoquer</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}

      <SectionTitle title="ABSENCES À TRAITER" />
      {data.absenceItems.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyCard}>Aucune absence à traiter.</Text>
        </View>
      ) : (
        data.absenceItems.map((item) => (
          <View key={item.id} style={styles.eventCard}>
            <View style={styles.eventMain}>
              <View style={styles.eventMainStudent}>
                <Text style={styles.studentName}>
                  {item.student.firstName} {item.student.lastName}
                </Text>
                <Text style={styles.eventTime}>
                  Absence{item.reason ? " · " + item.reason : ""}
                </Text>
              </View>
              {item.latestEvent ? (
                <Text style={styles.latestEvent}>
                  {item.latestEvent.type === "ABSENCE_JUSTIFIED"
                    ? "Justifiée"
                    : item.latestEvent.type === "ABSENCE_UNJUSTIFIED"
                      ? "Non justifiée"
                      : ""}
                </Text>
              ) : null}
            </View>

            <View style={styles.actions}>
              <Pressable
                style={[styles.actionButton, styles.allowButton]}
                disabled={busyId !== null}
                onPress={() =>
                  void handleEvent(item.student.id, item.attendanceId, "ABSENCE_JUSTIFIED")
                }
              >
                <Text style={styles.actionText}>Absence justifiée</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.denyButton]}
                disabled={busyId !== null}
                onPress={() =>
                  void handleEvent(item.student.id, item.attendanceId, "ABSENCE_UNJUSTIFIED")
                }
              >
                <Text style={styles.actionText}>Absence non justifiée</Text>
              </Pressable>
              <Pressable
                style={styles.summonsButton}
                disabled={busyId !== null}
                onPress={() => void handleSummons(item.student.id)}
              >
                <Text style={styles.summonsText}>Convoquer le parent</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
      <SectionTitle title="PRÉSENCES À OBSERVER" />
      {data.attendanceToControl.map((item) => (
        <View key={item.scheduleId} style={styles.rowCard}>
          <View style={styles.rowMain}>
            <Text style={styles.className}>{item.className}</Text>
            <Text style={styles.subject}>{item.subject}</Text>
          </View>
          <Text style={styles.rowValue}>{item.attendance.totalStudents} élèves</Text>
        </View>
      ))}

      <SectionTitle title="PROCHAINES SÉANCES" />
      {data.upcomingSessions.slice(0, 5).map((item) => (
        <View key={item.scheduleId} style={styles.rowCard}>
          <View style={styles.rowMain}>
            <Text style={styles.time}>
              {item.startTime} – {item.endTime}
            </Text>
            <Text style={styles.className}>{item.className}</Text>
            <Text style={styles.subject}>{item.subject}</Text>
          </View>
          {item.room ? <Text style={styles.room}>{item.room}</Text> : null}
        </View>
      ))}
    </ScrollView>
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
