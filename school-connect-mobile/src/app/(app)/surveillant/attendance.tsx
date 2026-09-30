import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { getSchoolSchedule } from "../../../services/schedule/schedule.service";
import type { SchoolSchedule } from "../../../features/schedule/schedule.types";
import {
  createSurveillantLateAttendance,
  getSurveillantAttendanceSession,
  updateSurveillantLateAttendance,
  type SurveillantAttendanceStudent,
} from "../../../services/surveillant/attendance.service";

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
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [loadingSession, setLoadingSession] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lateStudent, setLateStudent] = useState<SurveillantAttendanceStudent | null>(null);
  const [arrivalTime, setArrivalTime] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

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
  }

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
        if (mounted) setSession(response);
      } catch {
        if (mounted) setError("Impossible de charger le pointage de la classe.");
      } finally {
        if (mounted) setLoadingSession(false);
      }
    }

    void loadSession();
    return () => {
      mounted = false;
    };
  }, [selectedSchedule?.id]);

  function formatTime(value: string | null) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function openLateModal(student: SurveillantAttendanceStudent) {
    const existing = student.attendance?.status === "LATE"
      ? student.attendance
      : null;
    setLateStudent(student);
    setArrivalTime(existing?.arrivalTime ? formatTime(existing.arrivalTime) : "");
    setReason(existing?.reason ?? "");
    setNote(existing?.note ?? "");
    setModalError(null);
  }

  function closeLateModal() {
    if (saving) return;
    setLateStudent(null);
    setModalError(null);
  }

  async function saveLate() {
    if (!lateStudent || !selectedSchedule) return;

    const time = arrivalTime.trim();
    if (!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(time)) {
      setModalError("Indiquez une heure au format HH:MM.");
      return;
    }

    try {
      setSaving(true);
      setModalError(null);

      const arrival = new Date(
        `${getDateKey()}T${time}:00`,
      ).toISOString();

      if (lateStudent.attendance?.status === "LATE") {
        await updateSurveillantLateAttendance(lateStudent.attendance.id, {
          arrivalTime: arrival,
          reason: reason.trim() || null,
          note: note.trim() || null,
        });
      } else {
        await createSurveillantLateAttendance({
          scheduleId: selectedSchedule.id,
          date: getDateKey(),
          studentId: lateStudent.id,
          arrivalTime: arrival,
          reason: reason.trim() || null,
          note: note.trim() || null,
        });
      }

      const refreshed = await getSurveillantAttendanceSession(
        selectedSchedule.id,
        getDateKey(),
      );
      setSession(refreshed);
      setLateStudent(null);
    } catch (err) {
      const message =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response?: { data?: { error?: { message?: unknown } } } }).response?.data?.error?.message === "string"
          ? String((err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message)
          : "Impossible d'enregistrer le retard.";
      setModalError(message);
    } finally {
      setSaving(false);
    }
  }

  const presentCount =
    session?.students.filter((student) => student.attendance?.status === "PRESENT").length ?? 0;
  const absentCount =
    session?.students.filter((student) => student.attendance?.status === "ABSENT").length ?? 0;
  const lateCount =
    session?.students.filter((student) => student.attendance?.status === "LATE").length ?? 0;
  const pendingCount =
    (session?.students.length ?? 0) - presentCount - absentCount - lateCount;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>VIE SCOLAIRE · POINTAGE</Text>
            <Text style={styles.title}>Suivi des présences + retards</Text>
            <Text style={styles.subtitle}>
              P/A sont saisis par l'enseignant. Le surveillant consulte le pointage et enregistre uniquement les retards.
            </Text>
          </View>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>Retour</Text>
          </Pressable>
        </View>

        <View style={styles.ruleCard}>
          <Text style={styles.ruleTitle}>RÈGLE DE POINTAGE</Text>
          <Text style={styles.ruleText}>P = présent · A = absent · lecture seule</Text>
          <Text style={styles.ruleActive}>R = retard · action du surveillant</Text>
        </View>

        {loadingSchedules ? (
          <View style={styles.state}><ActivityIndicator /><Text style={styles.stateText}>Chargement de l'emploi du temps…</Text></View>
        ) : todaySchedules.length === 0 ? (
          <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Aucun cours aujourd'hui</Text><Text style={styles.emptyText}>Aucun créneau n'est planifié pour aujourd'hui.</Text></View>
        ) : (
          <>
            <View style={styles.scheduleCard}>
              <Text style={styles.sectionLabel}>CRÉNEAUX DU JOUR</Text>
              <Text style={styles.scheduleHint}>Sélectionnez le cours à consulter.</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scheduleChips}>
                {todaySchedules.map((item) => {
                  const active = item.id === selectedSchedule?.id;
                  return (
                    <Pressable key={item.id} style={[styles.scheduleChip, active && styles.scheduleChipActive]} onPress={() => setSelectedScheduleId(item.id)}>
                      <Text style={[styles.scheduleTime, active && styles.activeText]}>{item.startTime}–{item.endTime}</Text>
                      <Text style={[styles.scheduleClass, active && styles.activeText]}>{item.class.name}</Text>
                      <Text style={[styles.scheduleSubject, active && styles.activeMutedText]}>{item.subject}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {loadingSession ? (
              <View style={styles.state}><ActivityIndicator /><Text style={styles.stateText}>Chargement du pointage…</Text></View>
            ) : session && selectedSchedule ? (
              <>
                <View style={styles.sessionHeader}>
                  <View style={styles.sessionCopy}>
                    <Text style={styles.sessionClass}>{session.schedule.class.name}</Text>
                    <Text style={styles.sessionMeta}>{session.schedule.subject} · {session.schedule.startTime}–{session.schedule.endTime}{session.schedule.room ? ` · ${session.schedule.room}` : ""}</Text>
                    <Text style={styles.sessionTeacher}>Enseignant : {session.schedule.teacher.firstName} {session.schedule.teacher.lastName}</Text>
                  </View>
                </View>

                <View style={styles.stats}>
                  <Stat label="Présents" value={presentCount} />
                  <Stat label="Absents" value={absentCount} />
                  <Stat label="Retards" value={lateCount} />
                  <Stat label="Non pointés" value={pendingCount} />
                </View>

                <View style={styles.listCard}>
                  <View style={styles.listHeader}>
                    <Text style={styles.listTitle}>ÉLÈVES ATTENDUS · {session.students.length}</Text>
                    <Text style={styles.listHint}>P/A = lecture seule · R = action surveillant</Text>
                  </View>
                  {session.students.map((student, index) => {
                    const status = student.attendance?.status ?? null;
                    const isLate = status === "LATE";
                    return (
                      <View key={student.id} style={styles.studentRow}>
                        <View style={styles.studentIndex}><Text style={styles.indexText}>{index + 1}</Text></View>
                        <View style={styles.studentCopy}>
                          <Text style={styles.studentName}>{studentName(student)}</Text>
                          <Text style={styles.studentMeta}>{student.studentNumber}</Text>
                          <Text style={styles.statusText}>
                            {status === "PRESENT" ? "Présent" : status === "ABSENT" ? "Absent" : isLate ? `Retard · ${formatTime(student.attendance?.arrivalTime ?? null)}` : "Non pointé"}
                          </Text>
                          {isLate && student.attendance?.reason ? <Text style={styles.lateMeta}>{student.attendance.reason}</Text> : null}
                        </View>
                        <Pressable style={styles.lateAction} onPress={() => openLateModal(student)} disabled={!student.attendance}>
                          <Text style={styles.lateActionText}>{isLate ? "Modifier retard" : "Marquer retard"}</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : null}
          </>
        )}
        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
      </ScrollView>

      <Modal visible={Boolean(lateStudent)} transparent animationType="slide" onRequestClose={closeLateModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View><Text style={styles.modalEyebrow}>RETARD</Text><Text style={styles.modalTitle}>{lateStudent ? studentName(lateStudent) : ""}</Text></View>
              <Pressable onPress={closeLateModal} disabled={saving}><Text style={styles.closeText}>Fermer</Text></Pressable>
            </View>
            <Text style={styles.fieldLabel}>HEURE D'ARRIVÉE *</Text>
            <TextInput value={arrivalTime} onChangeText={setArrivalTime} placeholder="08:15" keyboardType="numbers-and-punctuation" maxLength={5} style={styles.input} />
            <Text style={styles.fieldLabel}>MOTIF</Text>
            <TextInput value={reason} onChangeText={setReason} placeholder="Motif du retard" style={styles.input} />
            <Text style={styles.fieldLabel}>NOTE</Text>
            <TextInput value={note} onChangeText={setNote} placeholder="Information complémentaire" multiline style={[styles.input, styles.noteInput]} />
            {modalError ? <View style={styles.modalError}><Text style={styles.modalErrorText}>{modalError}</Text></View> : null}
            <Pressable style={[styles.modalSave, saving && styles.disabled]} onPress={() => void saveLate()} disabled={saving}>
              <Text style={styles.modalSaveText}>{saving ? "Enregistrement…" : "Enregistrer le retard"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
function Stat({ label, value }: { label: string; value: number }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 },
  headerCopy: { flex: 1 },
  eyebrow: { fontSize: 9, fontWeight: "900", letterSpacing: 1.2, color: "#64748B" },
  title: { marginTop: 4, fontSize: 25, fontWeight: "900", color: "#344976" },
  subtitle: { marginTop: 5, fontSize: 12, lineHeight: 18, color: "#64748B" },
  backButton: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: "#D9DEE5", backgroundColor: "#FFFFFF" },
  backText: { fontSize: 10, fontWeight: "900", color: "#344976" },
  ruleCard: { padding: 14, marginBottom: 12, borderRadius: 16, borderWidth: 1, borderColor: "#D9DEE5", backgroundColor: "#FFFFFF" },
  ruleTitle: { fontSize: 9, fontWeight: "900", letterSpacing: 0.8, color: "#64748B" },
  ruleText: { marginTop: 7, fontSize: 10, color: "#475569" },
  ruleActive: { marginTop: 4, fontSize: 10, fontWeight: "900", color: "#344976" },
  scheduleCard: { padding: 14, borderRadius: 16, borderWidth: 1, borderColor: "#D9DEE5", backgroundColor: "#FFFFFF" },
  sectionLabel: { fontSize: 9, fontWeight: "900", letterSpacing: 0.8, color: "#64748B" },
  scheduleHint: { marginTop: 4, fontSize: 10, color: "#64748B" },
  scheduleChips: { gap: 9, marginTop: 10 },
  scheduleChip: { minWidth: 145, padding: 11, borderRadius: 12, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#F8FAFC" },
  scheduleChipActive: { borderColor: "#344976", backgroundColor: "#344976" },
  scheduleTime: { fontSize: 9, fontWeight: "900", color: "#64748B" },
  scheduleClass: { marginTop: 5, fontSize: 13, fontWeight: "900", color: "#334155" },
  scheduleSubject: { marginTop: 3, fontSize: 10, color: "#64748B" },
  activeText: { color: "#FFFFFF" },
  activeMutedText: { color: "#DCE4F2" },
  sessionHeader: { marginTop: 14, padding: 15, borderRadius: 16, backgroundColor: "#344976" },
  sessionCopy: { flex: 1 },
  sessionClass: { fontSize: 20, fontWeight: "900", color: "#FFFFFF" },
  sessionMeta: { marginTop: 4, fontSize: 10, color: "#E2E8F0" },
  sessionTeacher: { marginTop: 4, fontSize: 10, color: "#CBD5E1" },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 12 },
  stat: { flex: 1, minWidth: 78, padding: 12, borderRadius: 13, borderWidth: 1, borderColor: "#D9DEE5", backgroundColor: "#FFFFFF" },
  statValue: { fontSize: 19, fontWeight: "900", color: "#344976" },
  statLabel: { marginTop: 3, fontSize: 8, fontWeight: "800", color: "#64748B" },
  listCard: { marginTop: 12, borderRadius: 16, borderWidth: 1, borderColor: "#D9DEE5", backgroundColor: "#FFFFFF", overflow: "hidden" },
  listHeader: { padding: 14, borderBottomWidth: 1, borderBottomColor: "#EEF2F7" },
  listTitle: { fontSize: 10, fontWeight: "900", letterSpacing: 0.6, color: "#344976" },
  listHint: { marginTop: 4, fontSize: 9, color: "#64748B" },
  studentRow: { minHeight: 78, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: "#EEF2F7" },
  studentIndex: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
  indexText: { fontSize: 9, fontWeight: "900", color: "#64748B" },
  studentCopy: { flex: 1, minWidth: 0 },
  studentName: { fontSize: 12, fontWeight: "900", color: "#334155" },
  studentMeta: { marginTop: 2, fontSize: 9, color: "#64748B" },
  statusText: { marginTop: 5, fontSize: 9, fontWeight: "900", color: "#475569" },
  lateMeta: { marginTop: 2, fontSize: 9, color: "#92400E" },
  lateAction: { paddingHorizontal: 9, paddingVertical: 8, borderRadius: 9, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF" },
  lateActionText: { fontSize: 9, fontWeight: "900", color: "#344976" },
  state: { paddingVertical: 50, alignItems: "center" },
  stateText: { marginTop: 10, fontSize: 11, color: "#64748B" },
  emptyCard: { padding: 20, borderRadius: 16, borderWidth: 1, borderColor: "#D9DEE5", backgroundColor: "#FFFFFF" },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: "#344976" },
  emptyText: { marginTop: 6, fontSize: 11, lineHeight: 17, color: "#64748B" },
  errorBox: { marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: "#FEE2E2" },
  errorText: { fontSize: 11, lineHeight: 16, color: "#991B1B", fontWeight: "700" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.45)" },
  modalCard: { padding: 18, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: "#FFFFFF" },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 18 },
  modalEyebrow: { fontSize: 9, fontWeight: "900", letterSpacing: 0.8, color: "#64748B" },
  modalTitle: { marginTop: 3, fontSize: 19, fontWeight: "900", color: "#344976" },
  closeText: { fontSize: 10, fontWeight: "900", color: "#64748B" },
  fieldLabel: { marginTop: 10, marginBottom: 6, fontSize: 9, fontWeight: "900", letterSpacing: 0.7, color: "#64748B" },
  input: { minHeight: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF", fontSize: 12, color: "#334155" },
  noteInput: { minHeight: 76, paddingTop: 11, textAlignVertical: "top" },
  modalError: { marginTop: 10, padding: 10, borderRadius: 9, backgroundColor: "#FEE2E2" },
  modalErrorText: { fontSize: 10, lineHeight: 15, color: "#991B1B", fontWeight: "700" },
  modalSave: { marginTop: 14, paddingVertical: 14, alignItems: "center", borderRadius: 12, backgroundColor: "#344976" },
  modalSaveText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  disabled: { opacity: 0.55 },
});
