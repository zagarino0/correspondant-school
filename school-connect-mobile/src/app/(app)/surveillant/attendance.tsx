import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { getSchoolSchedule } from "../../../services/schedule/schedule.service";
import type { SchoolSchedule } from "../../../features/schedule/schedule.types";
import {
  getSurveillantAttendanceSession,
  saveSurveillantAttendanceSession,
  type SurveillantAttendanceStatus,
  type SurveillantAttendanceStudent,
} from "../../../services/surveillant/attendance.service";

const dayMap: Record<string, string> = {
  MONDAY: "LUNDI",
  TUESDAY: "MARDI",
  WEDNESDAY: "MERCREDI",
  THURSDAY: "JEUDI",
  FRIDAY: "VENDREDI",
  SATURDAY: "SAMEDI",
  SUNDAY: "DIMANCHE",
};

function getTodayKey() {
  const days = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];
  return days[new Date().getDay()];
}

function getDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function studentName(student: SurveillantAttendanceStudent) {
  return `${student.lastName} ${student.firstName}`;
}

export default function SurveillantAttendanceScreen() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<SchoolSchedule[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [session, setSession] = useState<Awaited<ReturnType<typeof getSurveillantAttendanceSession>> | null>(null);
  const [statuses, setStatuses] = useState<Record<string, SurveillantAttendanceStatus | null>>({});
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [loadingSession, setLoadingSession] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todaySchedules = useMemo(() => {
    const today = getTodayKey();
    return schedules
      .filter((item) => item.dayOfWeek === today)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [schedules]);

  const selectedSchedule =
    todaySchedules.find((item) => item.id === selectedScheduleId) ??
    todaySchedules[0] ??
    null;

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoadingSchedules(true);
        setError(null);
        const response = await getSchoolSchedule();
        if (!mounted) return;
        setSchedules(response.schedules);
        const today = response.schedules
          .filter((item) => item.dayOfWeek === getTodayKey())
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
        if (today.length > 0) {
          const now = new Date();
          const currentMinutes = now.getHours() * 60 + now.getMinutes();
          const active = today.find((item) => {
            const [startH, startM] = item.startTime.split(":").map(Number);
            const [endH, endM] = item.endTime.split(":").map(Number);
            const start = startH * 60 + startM;
            const end = endH * 60 + endM;
            return currentMinutes >= start && currentMinutes <= end;
          });
          setSelectedScheduleId(active?.id ?? today[0].id);
        }
      } catch {
        if (mounted) setError("Impossible de charger les créneaux d'aujourd'hui.");
      } finally {
        if (mounted) setLoadingSchedules(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedSchedule) {
      setSession(null);
      return;
    }

    let mounted = true;

    async function loadSession() {
      try {
        setLoadingSession(true);
        setError(null);
        const response = await getSurveillantAttendanceSession(
          selectedSchedule!.id,
          getDateKey(),
        );
        if (!mounted) return;
        setSession(response);
        const next: Record<string, SurveillantAttendanceStatus | null> = {};
        response.students.forEach((student) => {
          next[student.id] = student.attendance?.status ?? null;
        });
        setStatuses(next);
      } catch {
        if (mounted) setError("Impossible de charger les élèves attendus.");
      } finally {
        if (mounted) setLoadingSession(false);
      }
    }

    void loadSession();
    return () => {
      mounted = false;
    };
  }, [selectedSchedule?.id]);

  function setStatus(studentId: string, status: SurveillantAttendanceStatus) {
    setStatuses((current) => ({ ...current, [studentId]: status }));
  }

  function markAllPresent() {
    if (!session) return;
    const next: Record<string, SurveillantAttendanceStatus> = {};
    session.students.forEach((student) => {
      next[student.id] = "PRESENT";
    });
    setStatuses(next);
  }

  async function save() {
    if (!session || !selectedSchedule) return;

    const incomplete = session.students.filter((student) => !statuses[student.id]);
    if (incomplete.length > 0) {
      setError(`Il reste ${incomplete.length} élève(s) sans statut.`);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await saveSurveillantAttendanceSession({
        scheduleId: selectedSchedule.id,
        date: getDateKey(),
        records: session.students.map((student) => ({
          studentId: student.id,
          status: statuses[student.id]!,
          arrivalTime:
            statuses[student.id] === "LATE"
              ? new Date().toISOString()
              : student.attendance?.arrivalTime ?? null,
        })),
      });

      const refreshed = await getSurveillantAttendanceSession(
        selectedSchedule.id,
        getDateKey(),
      );
      setSession(refreshed);
      const next: Record<string, SurveillantAttendanceStatus | null> = {};
      refreshed.students.forEach((student) => {
        next[student.id] = student.attendance?.status ?? null;
      });
      setStatuses(next);
    } catch {
      setError("Impossible d'enregistrer les présences.");
    } finally {
      setSaving(false);
    }
  }

  const presentCount = session?.students.filter((student) => statuses[student.id] === "PRESENT").length ?? 0;
  const absentCount = session?.students.filter((student) => statuses[student.id] === "ABSENT").length ?? 0;
  const lateCount = session?.students.filter((student) => statuses[student.id] === "LATE").length ?? 0;
  const pendingCount = (session?.students.length ?? 0) - presentCount - absentCount - lateCount;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>VIE SCOLAIRE · PRÉSENCES</Text>
            <Text style={styles.title}>Présences / Retards</Text>
            <Text style={styles.subtitle}>
              Les élèves attendus sont déterminés automatiquement à partir du créneau sélectionné.
            </Text>
          </View>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>Retour</Text>
          </Pressable>
        </View>

        {loadingSchedules ? (
          <View style={styles.state}>
            <ActivityIndicator />
            <Text style={styles.stateText}>Chargement de l'emploi du temps…</Text>
          </View>
        ) : todaySchedules.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Aucun cours aujourd'hui</Text>
            <Text style={styles.emptyText}>
              Aucun créneau n'est planifié pour aujourd'hui dans l'établissement.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.scheduleCard}>
              <View style={styles.scheduleCardHeader}>
                <View>
                  <Text style={styles.sectionLabel}>CRÉNEAUX DU JOUR</Text>
                  <Text style={styles.scheduleHint}>Sélectionnez la classe et le cours à contrôler.</Text>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scheduleChips}>
                {todaySchedules.map((item) => {
                  const active = item.id === selectedSchedule?.id;
                  return (
                    <Pressable
                      key={item.id}
                      style={[styles.scheduleChip, active && styles.scheduleChipActive]}
                      onPress={() => setSelectedScheduleId(item.id)}
                    >
                      <Text style={[styles.scheduleTime, active && styles.activeText]}>
                        {item.startTime}–{item.endTime}
                      </Text>
                      <Text style={[styles.scheduleClass, active && styles.activeText]}>
                        {item.class.name}
                      </Text>
                      <Text style={[styles.scheduleSubject, active && styles.activeMutedText]}>
                        {item.subject}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {loadingSession ? (
              <View style={styles.state}>
                <ActivityIndicator />
                <Text style={styles.stateText}>Chargement des élèves attendus…</Text>
              </View>
            ) : session && selectedSchedule ? (
              <>
                <View style={styles.sessionHeader}>
                  <View style={styles.sessionCopy}>
                    <Text style={styles.sessionClass}>{session.schedule.class.name}</Text>
                    <Text style={styles.sessionMeta}>
                      {session.schedule.subject} · {session.schedule.startTime}–{session.schedule.endTime}
                      {session.schedule.room ? ` · ${session.schedule.room}` : ""}
                    </Text>
                    <Text style={styles.sessionTeacher}>
                      Enseignant : {session.schedule.teacher.firstName} {session.schedule.teacher.lastName}
                    </Text>
                  </View>
                  <Pressable style={styles.presentAllButton} onPress={markAllPresent}>
                    <Text style={styles.presentAllText}>Tous présents</Text>
                  </Pressable>
                </View>

                <View style={styles.stats}>
                  <Stat label="Présents" value={presentCount} />
                  <Stat label="Absents" value={absentCount} />
                  <Stat label="Retards" value={lateCount} />
                  <Stat label="À renseigner" value={pendingCount} />
                </View>

                <View style={styles.listCard}>
                  <View style={styles.listHeader}>
                    <Text style={styles.listTitle}>ÉLÈVES ATTENDUS · {session.students.length}</Text>
                    <Text style={styles.listHint}>A = absent · P = présent · R = retard</Text>
                  </View>

                  {session.students.map((student, index) => {
                    const status = statuses[student.id] ?? null;
                    return (
                      <View key={student.id} style={styles.studentRow}>
                        <View style={styles.studentIndex}>
                          <Text style={styles.indexText}>{index + 1}</Text>
                        </View>
                        <View style={styles.studentCopy}>
                          <Text style={styles.studentName}>{studentName(student)}</Text>
                          <Text style={styles.studentMeta}>{student.studentNumber}</Text>
                        </View>
                        <View style={styles.statusRow}>
                          {([
                            ["ABSENT", "A"],
                            ["PRESENT", "P"],
                            ["LATE", "R"],
                          ] as const).map(([value, label]) => (
                            <Pressable
                              key={value}
                              style={[
                                styles.statusButton,
                                status === value && styles.statusButtonActive,
                              ]}
                              onPress={() => setStatus(student.id, value)}
                            >
                              <Text style={[
                                styles.statusButtonText,
                                status === value && styles.statusButtonTextActive,
                              ]}>
                                {label}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </View>

                <Pressable
                  style={[styles.saveButton, saving && styles.disabled]}
                  onPress={() => void save()}
                  disabled={saving}
                >
                  <Text style={styles.saveText}>
                    {saving ? "Enregistrement…" : "Enregistrer les présences"}
                  </Text>
                </Pressable>
              </>
            ) : null}
          </>
        )}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 },
  headerCopy: { flex: 1 },
  eyebrow: { fontSize: 9, fontWeight: "900", letterSpacing: 1.2, color: "#64748B" },
  title: { marginTop: 4, fontSize: 26, fontWeight: "900", color: "#344976" },
  subtitle: { marginTop: 5, fontSize: 12, lineHeight: 18, color: "#64748B" },
  backButton: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: "#D9DEE5", backgroundColor: "#FFFFFF" },
  backText: { fontSize: 10, fontWeight: "900", color: "#344976" },
  scheduleCard: { padding: 14, borderRadius: 16, borderWidth: 1, borderColor: "#D9DEE5", backgroundColor: "#FFFFFF" },
  scheduleCardHeader: { marginBottom: 10 },
  sectionLabel: { fontSize: 9, fontWeight: "900", letterSpacing: 0.8, color: "#64748B" },
  scheduleHint: { marginTop: 4, fontSize: 10, color: "#64748B" },
  scheduleChips: { gap: 9 },
  scheduleChip: { minWidth: 145, padding: 11, borderRadius: 12, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#F8FAFC" },
  scheduleChipActive: { borderColor: "#344976", backgroundColor: "#344976" },
  scheduleTime: { fontSize: 9, fontWeight: "900", color: "#64748B" },
  scheduleClass: { marginTop: 5, fontSize: 13, fontWeight: "900", color: "#334155" },
  scheduleSubject: { marginTop: 3, fontSize: 10, color: "#64748B" },
  activeText: { color: "#FFFFFF" },
  activeMutedText: { color: "#DCE4F2" },
  sessionHeader: { marginTop: 14, padding: 15, borderRadius: 16, backgroundColor: "#344976", flexDirection: "row", alignItems: "center", gap: 12 },
  sessionCopy: { flex: 1 },
  sessionClass: { fontSize: 20, fontWeight: "900", color: "#FFFFFF" },
  sessionMeta: { marginTop: 4, fontSize: 10, color: "#E2E8F0" },
  sessionTeacher: { marginTop: 4, fontSize: 10, color: "#CBD5E1" },
  presentAllButton: { paddingHorizontal: 11, paddingVertical: 9, borderRadius: 10, backgroundColor: "#FFFFFF" },
  presentAllText: { fontSize: 9, fontWeight: "900", color: "#344976" },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 12 },
  stat: { flex: 1, minWidth: 78, padding: 12, borderRadius: 13, borderWidth: 1, borderColor: "#D9DEE5", backgroundColor: "#FFFFFF" },
  statValue: { fontSize: 19, fontWeight: "900", color: "#344976" },
  statLabel: { marginTop: 3, fontSize: 8, fontWeight: "800", color: "#64748B" },
  listCard: { marginTop: 12, borderRadius: 16, borderWidth: 1, borderColor: "#D9DEE5", backgroundColor: "#FFFFFF", overflow: "hidden" },
  listHeader: { padding: 14, borderBottomWidth: 1, borderBottomColor: "#EEF2F7" },
  listTitle: { fontSize: 10, fontWeight: "900", letterSpacing: 0.6, color: "#344976" },
  listHint: { marginTop: 4, fontSize: 9, color: "#64748B" },
  studentRow: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: "#EEF2F7" },
  studentIndex: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
  indexText: { fontSize: 9, fontWeight: "900", color: "#64748B" },
  studentCopy: { flex: 1 },
  studentName: { fontSize: 12, fontWeight: "900", color: "#334155" },
  studentMeta: { marginTop: 2, fontSize: 9, color: "#64748B" },
  statusRow: { flexDirection: "row", gap: 5 },
  statusButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 9, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF" },
  statusButtonActive: { borderColor: "#344976", backgroundColor: "#344976" },
  statusButtonText: { fontSize: 10, fontWeight: "900", color: "#64748B" },
  statusButtonTextActive: { color: "#FFFFFF" },
  saveButton: { marginTop: 14, paddingVertical: 14, alignItems: "center", borderRadius: 12, backgroundColor: "#344976" },
  saveText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  disabled: { opacity: 0.55 },
  state: { paddingVertical: 50, alignItems: "center" },
  stateText: { marginTop: 10, fontSize: 11, color: "#64748B" },
  emptyCard: { padding: 20, borderRadius: 16, borderWidth: 1, borderColor: "#D9DEE5", backgroundColor: "#FFFFFF" },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: "#344976" },
  emptyText: { marginTop: 6, fontSize: 11, lineHeight: 17, color: "#64748B" },
  errorBox: { marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: "#FEE2E2" },
  errorText: { fontSize: 11, lineHeight: 16, color: "#991B1B", fontWeight: "700" },
});
