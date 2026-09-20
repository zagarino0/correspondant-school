import { useCallback, useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import {
  createSchoolSchedule,
  getSchoolAdminDashboard,
  getSchoolAdminSchedules,
} from "../../services/school-admin/school-admin.service";
import { getSchoolTeachers } from "../../services/teachers/teacher.service";
import type {
  CreateScheduleInput,
  ScheduleDay,
  SchoolAdminDashboardResponse,
  SchoolAdminSchedule,
} from "../../services/school-admin/school-admin.types";
import type { SchoolTeacher } from "../../services/teachers/teacher.types";

const DAYS: Array<{ key: ScheduleDay; label: string; short: string }> = [
  { key: "MONDAY", label: "Lundi", short: "Lun" },
  { key: "TUESDAY", label: "Mardi", short: "Mar" },
  { key: "WEDNESDAY", label: "Mercredi", short: "Mer" },
  { key: "THURSDAY", label: "Jeudi", short: "Jeu" },
  { key: "FRIDAY", label: "Vendredi", short: "Ven" },
  { key: "SATURDAY", label: "Samedi", short: "Sam" },
];

export default function ScheduleCreateScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const isWeb = width >= 1024;

  const [dashboard, setDashboard] = useState<SchoolAdminDashboardResponse | null>(null);
  const [teachers, setTeachers] = useState<SchoolTeacher[]>([]);
  const [schedules, setSchedules] = useState<SchoolAdminSchedule[]>([]);
  const [selectedDay, setSelectedDay] = useState<ScheduleDay>("MONDAY");
  const [classId, setClassId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [subject, setSubject] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [room, setRoom] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedDaySchedules = useMemo(
    () => schedules.filter((item) => item.dayOfWeek === selectedDay),
    [schedules, selectedDay],
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [dashboardData, teacherData, scheduleData] = await Promise.all([
        getSchoolAdminDashboard(),
        getSchoolTeachers(),
        getSchoolAdminSchedules(),
      ]);
      setDashboard(dashboardData);
      setTeachers(teacherData.teachers);
      setSchedules(scheduleData.schedules);

      setClassId((current) =>
        current && dashboardData.classes.some((item) => item.id === current)
          ? current
          : dashboardData.classes[0]?.id ?? "",
      );
      setTeacherId((current) =>
        current && teacherData.teachers.some((item) => item.id === current)
          ? current
          : teacherData.teachers[0]?.id ?? "",
      );
    } catch {
      Alert.alert("Erreur", "Impossible de charger les données de l'emploi du temps.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (!classId || !teacherId || !subject.trim()) {
      Alert.alert("Champs requis", "Sélectionnez une classe, un enseignant et indiquez la matière.");
      return;
    }

    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) || startTime >= endTime) {
      Alert.alert("Horaires invalides", "Utilisez HH:MM et vérifiez que l'heure de fin est après l'heure de début.");
      return;
    }

    const input: CreateScheduleInput = {
      classId,
      teacherId,
      subject: subject.trim(),
      dayOfWeek: selectedDay,
      startTime,
      endTime,
      room: room.trim() || null,
    };

    try {
      setSaving(true);
      await createSchoolSchedule(input);
      setSubject("");
      setRoom("");
      await load();
      Alert.alert("Créneau créé", "Le cours a été ajouté à l'emploi du temps.");
    } catch (error: any) {
      Alert.alert(
        "Création impossible",
        error?.response?.data?.error?.message ?? "Une erreur est survenue.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#344976" /></View>;
  }

  const form = (
    <View style={styles.formCard}>
      <View style={styles.formHeader}>
        <View style={styles.flex}>
          <Text style={styles.kicker}>NOUVEAU CRÉNEAU</Text>
          <Text style={styles.formTitle}>Créer un cours</Text>
          <Text style={styles.formHint}>{DAYS.find((day) => day.key === selectedDay)?.label}</Text>
        </View>
        <View style={styles.dayBadge}><Text style={styles.dayBadgeText}>{DAYS.find((day) => day.key === selectedDay)?.short}</Text></View>
      </View>

      <Text style={styles.label}>Classe</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {(dashboard?.classes ?? []).map((item) => (
          <Pressable key={item.id} onPress={() => setClassId(item.id)} style={[styles.chip, item.id === classId && styles.chipActive]}>
            <Text style={[styles.chipText, item.id === classId && styles.chipTextActive]}>{item.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.label}>Enseignant</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {teachers.map((teacher) => (
          <Pressable key={teacher.id} onPress={() => setTeacherId(teacher.id)} style={[styles.chip, teacher.id === teacherId && styles.chipActive]}>
            <Text style={[styles.chipText, teacher.id === teacherId && styles.chipTextActive]}>
              {teacher.firstName} {teacher.lastName}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.label}>Matière</Text>
      <TextInput value={subject} onChangeText={setSubject} placeholder="Ex. Mathématiques" style={styles.input} />

      <View style={styles.timeRow}>
        <View style={styles.timeField}>
          <Text style={styles.label}>Début</Text>
          <TextInput value={startTime} onChangeText={setStartTime} placeholder="08:00" maxLength={5} keyboardType="numbers-and-punctuation" style={styles.input} />
        </View>
        <View style={styles.timeField}>
          <Text style={styles.label}>Fin</Text>
          <TextInput value={endTime} onChangeText={setEndTime} placeholder="09:00" maxLength={5} keyboardType="numbers-and-punctuation" style={styles.input} />
        </View>
      </View>

      <Text style={styles.label}>Salle (optionnel)</Text>
      <TextInput value={room} onChangeText={setRoom} placeholder="Ex. Salle 4" style={styles.input} />

      <Pressable disabled={saving} onPress={() => void submit()} style={[styles.saveButton, saving && styles.disabled]}>
        <Text style={styles.saveText}>{saving ? "Création…" : "Ajouter à l'emploi du temps"}</Text>
      </Pressable>
    </View>
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>ADMINISTRATION</Text>
          <Text style={[styles.title, isMobile && styles.titleMobile]}>Emploi du temps</Text>
          <Text style={styles.subtitle}>Construisez l'emploi du temps de l'année active, créneau par créneau.</Text>
        </View>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Retour</Text>
        </Pressable>
      </View>

      <View style={styles.dayGrid}>
        {DAYS.map((day) => (
          <Pressable key={day.key} onPress={() => setSelectedDay(day.key)} style={[styles.dayCard, day.key === selectedDay && styles.dayCardActive]}>
            <Text style={[styles.dayShort, day.key === selectedDay && styles.dayTextActive]}>{day.short}</Text>
            <Text style={[styles.dayLabel, day.key === selectedDay && styles.dayTextActive]}>{day.label}</Text>
            <Text style={[styles.dayCount, day.key === selectedDay && styles.dayTextActive]}>{schedules.filter((item) => item.dayOfWeek === day.key).length} cours</Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.layout, isWeb && styles.layoutWeb]}>
        <View style={[styles.gridCard, isWeb && styles.gridCardWeb]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Grille — {DAYS.find((day) => day.key === selectedDay)?.label}</Text>
              <Text style={styles.sectionMeta}>{selectedDaySchedules.length} créneau(x) planifié(s)</Text>
            </View>
          </View>

          {selectedDaySchedules.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Journée libre</Text>
              <Text style={styles.muted}>Aucun cours n'est encore programmé ce jour.</Text>
            </View>
          ) : (
            <View style={styles.scheduleList}>
              {selectedDaySchedules.map((item) => (
                <View key={item.id} style={styles.scheduleRow}>
                  <View style={styles.timeBox}>
                    <Text style={styles.time}>{item.startTime}</Text>
                    <Text style={styles.timeSeparator}>—</Text>
                    <Text style={styles.time}>{item.endTime}</Text>
                  </View>
                  <View style={styles.scheduleMain}>
                    <Text style={styles.scheduleSubject}>{item.subject}</Text>
                    <Text style={styles.scheduleClass}>{item.class.name} · {item.teacher.firstName} {item.teacher.lastName}</Text>
                    {item.room ? <Text style={styles.scheduleRoom}>Salle {item.room}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {form}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { width: "100%", maxWidth: 1320, alignSelf: "center", padding: 28, paddingBottom: 48, gap: 18 },
  contentMobile: { padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 18 },
  flex: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5, color: "#344976", marginBottom: 6 },
  title: { fontSize: 30, fontWeight: "800", color: "#111827" },
  titleMobile: { fontSize: 25 },
  subtitle: { marginTop: 6, maxWidth: 760, color: "#6B7280", lineHeight: 21 },
  backButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 11, borderWidth: 1, borderColor: "#D9DEE5", backgroundColor: "#FFF" },
  backText: { color: "#344976", fontWeight: "700", fontSize: 12 },
  dayGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  dayCard: { flexGrow: 1, flexBasis: 130, minWidth: 100, minHeight: 86, padding: 13, borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFF" },
  dayCardActive: { backgroundColor: "#344976", borderColor: "#344976" },
  dayShort: { fontSize: 11, fontWeight: "800", color: "#344976", textTransform: "uppercase" },
  dayLabel: { marginTop: 5, fontSize: 15, fontWeight: "800", color: "#111827" },
  dayCount: { marginTop: 8, fontSize: 11, color: "#6B7280" },
  dayTextActive: { color: "#FFF" },
  layout: { gap: 18 },
  layoutWeb: { flexDirection: "row", alignItems: "flex-start" },
  gridCard: { padding: 18, borderRadius: 18, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFF" },
  gridCardWeb: { flex: 1.05, minWidth: 0 },
  sectionHeader: { marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  sectionMeta: { marginTop: 4, fontSize: 12, color: "#6B7280" },
  empty: { paddingVertical: 35, alignItems: "center" },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: "#111827" },
  muted: { marginTop: 5, color: "#6B7280", textAlign: "center", lineHeight: 20 },
  scheduleList: { gap: 10 },
  scheduleRow: { flexDirection: "row", gap: 12, padding: 13, borderRadius: 13, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E5E7EB" },
  timeBox: { width: 70, justifyContent: "center", alignItems: "center" },
  time: { fontSize: 12, fontWeight: "800", color: "#344976" },
  timeSeparator: { color: "#9CA3AF", fontSize: 10 },
  scheduleMain: { flex: 1, minWidth: 0 },
  scheduleSubject: { fontSize: 14, fontWeight: "800", color: "#111827" },
  scheduleClass: { marginTop: 4, fontSize: 12, color: "#4B5563" },
  scheduleRoom: { marginTop: 3, fontSize: 11, color: "#6B7280" },
  formCard: { padding: 18, borderRadius: 18, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFF", gap: 2 },
  formHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  kicker: { fontSize: 10, fontWeight: "800", letterSpacing: 1.4, color: "#344976" },
  formTitle: { marginTop: 4, fontSize: 20, fontWeight: "800", color: "#111827" },
  formHint: { marginTop: 3, fontSize: 12, color: "#6B7280" },
  dayBadge: { minWidth: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#344976" },
  dayBadgeText: { color: "#FFF", fontWeight: "800", fontSize: 12 },
  label: { marginTop: 13, marginBottom: 7, fontSize: 12, fontWeight: "700", color: "#374151" },
  chips: { gap: 7, paddingVertical: 2 },
  chip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#D9DEE5", backgroundColor: "#FFF" },
  chipActive: { backgroundColor: "#344976", borderColor: "#344976" },
  chipText: { fontSize: 11, fontWeight: "700", color: "#374151" },
  chipTextActive: { color: "#FFF" },
  input: { height: 46, borderWidth: 1, borderColor: "#D9DEE5", borderRadius: 11, paddingHorizontal: 12, backgroundColor: "#FFF", color: "#111827" },
  timeRow: { flexDirection: "row", gap: 10 },
  timeField: { flex: 1 },
  saveButton: { marginTop: 20, minHeight: 48, paddingHorizontal: 14, borderRadius: 11, backgroundColor: "#344976", alignItems: "center", justifyContent: "center" },
  saveText: { color: "#FFF", fontWeight: "800", fontSize: 13 },
  disabled: { opacity: 0.55 },
});
