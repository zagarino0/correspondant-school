import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import {
  getSchoolAdminDashboard,
  getSchoolAdminSchedules,
  updateSchoolSchedule,
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

export default function ScheduleEditScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const { scheduleId } = useLocalSearchParams<{ scheduleId: string }>();
  const [dashboard, setDashboard] = useState<SchoolAdminDashboardResponse | null>(null);
  const [teachers, setTeachers] = useState<SchoolTeacher[]>([]);
  const [schedule, setSchedule] = useState<SchoolAdminSchedule | null>(null);
  const [classId, setClassId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [subject, setSubject] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState<ScheduleDay>("MONDAY");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [room, setRoom] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classOpen, setClassOpen] = useState(false);
  const [teacherOpen, setTeacherOpen] = useState(false);
  const [classSearch, setClassSearch] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");

  const classes = dashboard?.classes ?? [];
  const selectedClass = useMemo(() => classes.find((item) => item.id === classId), [classes, classId]);
  const selectedTeacher = useMemo(() => teachers.find((item) => item.id === teacherId), [teachers, teacherId]);
  const filteredClasses = useMemo(() => {
    const q = classSearch.trim().toLowerCase();
    return q ? classes.filter((item) => item.name.toLowerCase().includes(q)) : classes;
  }, [classes, classSearch]);
  const filteredTeachers = useMemo(() => {
    const q = teacherSearch.trim().toLowerCase();
    return q
      ? teachers.filter((item) => (item.firstName + " " + item.lastName).toLowerCase().includes(q))
      : teachers;
  }, [teachers, teacherSearch]);

  const load = useCallback(async () => {
    if (!scheduleId) return;
    try {
      setLoading(true);
      const [dashboardData, teacherData, scheduleData] = await Promise.all([
        getSchoolAdminDashboard(),
        getSchoolTeachers(),
        getSchoolAdminSchedules(),
      ]);
      const found = scheduleData.schedules.find((item) => item.id === scheduleId);
      if (!found) {
        Alert.alert("Introuvable", "Ce créneau n'existe plus.");
        router.back();
        return;
      }
      setDashboard(dashboardData);
      setTeachers(teacherData.teachers);
      setSchedule(found);
      setClassId(found.classId);
      setTeacherId(found.teacherId);
      setSubject(found.subject);
      setDayOfWeek(found.dayOfWeek);
      setStartTime(found.startTime);
      setEndTime(found.endTime);
      setRoom(found.room ?? "");
    } catch {
      Alert.alert("Erreur", "Impossible de charger le créneau.");
    } finally {
      setLoading(false);
    }
  }, [scheduleId]);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!scheduleId || !classId || !teacherId || !subject.trim()) {
      Alert.alert("Champs requis", "Sélectionnez une classe, un enseignant et indiquez la matière.");
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) || startTime >= endTime) {
      Alert.alert("Horaires invalides", "Utilisez HH:MM et vérifiez l'ordre des horaires.");
      return;
    }
    const input: CreateScheduleInput = {
      classId, teacherId, subject: subject.trim(), dayOfWeek, startTime, endTime,
      room: room.trim() || null,
    };
    try {
      setSaving(true);
      await updateSchoolSchedule(scheduleId, input);
      Alert.alert("Modification enregistrée", "Le créneau a été mis à jour.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Modification impossible", error?.response?.data?.error?.message ?? "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !schedule) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#344976" /></View>;
  }

  const dropdown = (
    <Modal
      visible={classOpen || teacherOpen}
      transparent
      animationType="fade"
      onRequestClose={() => { setClassOpen(false); setTeacherOpen(false); }}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => { setClassOpen(false); setTeacherOpen(false); }} />
        <View style={[styles.dropdown, isMobile && styles.dropdownMobile]}>
          <View style={styles.modalHeader}>
            <View style={styles.flex}>
              <Text style={styles.modalTitle}>{classOpen ? "Sélectionner une classe" : "Sélectionner un enseignant"}</Text>
              <Text style={styles.modalMeta}>{classOpen ? filteredClasses.length + " classe(s)" : filteredTeachers.length + " enseignant(s)"}</Text>
            </View>
            <Pressable onPress={() => { setClassOpen(false); setTeacherOpen(false); }} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>
          </View>
          <TextInput
            value={classOpen ? classSearch : teacherSearch}
            onChangeText={classOpen ? setClassSearch : setTeacherSearch}
            placeholder={classOpen ? "Rechercher une classe…" : "Rechercher un enseignant…"}
            placeholderTextColor="#9CA3AF"
            autoFocus
            style={styles.search}
          />
          {classOpen ? (
            <FlatList
              data={filteredClasses}
              keyExtractor={(item) => item.id}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable onPress={() => { setClassId(item.id); setClassOpen(false); }} style={[styles.option, item.id === classId && styles.optionActive]}>
                  <View style={styles.flex}><Text style={[styles.optionTitle, item.id === classId && styles.optionTitleActive]}>{item.name}</Text>{item.level ? <Text style={styles.optionMeta}>{item.level}</Text> : null}</View>
                  {item.id === classId ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
              )}
            />
          ) : (
            <FlatList
              data={filteredTeachers}
              keyExtractor={(item) => item.id}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable onPress={() => { setTeacherId(item.id); setTeacherOpen(false); }} style={[styles.option, item.id === teacherId && styles.optionActive]}>
                  <View style={styles.flex}><Text style={[styles.optionTitle, item.id === teacherId && styles.optionTitleActive]}>{item.firstName} {item.lastName}</Text>{item.email ? <Text style={styles.optionMeta}>{item.email}</Text> : null}</View>
                  {item.id === teacherId ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      {dropdown}
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, isMobile && styles.mobile]}>
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text style={styles.eyebrow}>EMPLOI DU TEMPS</Text>
            <Text style={[styles.title, isMobile && styles.titleMobile]}>Modifier le créneau</Text>
            <Text style={styles.subtitle}>{schedule.subject} · {schedule.class.name}</Text>
          </View>
          <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>Retour</Text></Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Jour</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
            {DAYS.map((day) => (
              <Pressable key={day.key} onPress={() => setDayOfWeek(day.key)} style={[styles.day, day.key === dayOfWeek && styles.dayActive]}>
                <Text style={[styles.dayText, day.key === dayOfWeek && styles.dayTextActive]}>{day.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.label}>Classe</Text>
          <Pressable onPress={() => { setClassSearch(""); setClassOpen(true); }} style={styles.select}>
            <View style={styles.flex}><Text style={styles.value}>{selectedClass?.name ?? "Sélectionner une classe"}</Text>{selectedClass?.level ? <Text style={styles.meta}>{selectedClass.level}</Text> : null}</View>
            <Text style={styles.chevron}>⌄</Text>
          </Pressable>

          <Text style={styles.label}>Enseignant</Text>
          <Pressable onPress={() => { setTeacherSearch(""); setTeacherOpen(true); }} style={styles.select}>
            <View style={styles.flex}><Text style={styles.value}>{selectedTeacher ? selectedTeacher.firstName + " " + selectedTeacher.lastName : "Sélectionner un enseignant"}</Text>{selectedTeacher?.email ? <Text style={styles.meta}>{selectedTeacher.email}</Text> : null}</View>
            <Text style={styles.chevron}>⌄</Text>
          </Pressable>

          <Text style={styles.label}>Matière</Text>
          <TextInput value={subject} onChangeText={setSubject} style={styles.input} placeholder="Ex. Mathématiques" />

          <View style={styles.row}>
            <View style={styles.flex}><Text style={styles.label}>Début</Text><TextInput value={startTime} onChangeText={setStartTime} maxLength={5} keyboardType="numbers-and-punctuation" style={styles.input} /></View>
            <View style={styles.flex}><Text style={styles.label}>Fin</Text><TextInput value={endTime} onChangeText={setEndTime} maxLength={5} keyboardType="numbers-and-punctuation" style={styles.input} /></View>
          </View>

          <Text style={styles.label}>Salle (optionnel)</Text>
          <TextInput value={room} onChangeText={setRoom} style={styles.input} placeholder="Ex. Salle 4" />

          <Pressable disabled={saving} onPress={() => void save()} style={[styles.save, saving && styles.disabled]}>
            <Text style={styles.saveText}>{saving ? "Enregistrement…" : "Enregistrer les modifications"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { width: "100%", maxWidth: 760, alignSelf: "center", padding: 28, paddingBottom: 48, gap: 18 },
  mobile: { padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 14 },
  flex: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.4, color: "#344976", marginBottom: 5 },
  title: { fontSize: 29, fontWeight: "800", color: "#111827" },
  titleMobile: { fontSize: 24 },
  subtitle: { marginTop: 5, color: "#6B7280" },
  back: { paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: "#D9DEE5", borderRadius: 11, backgroundColor: "#FFF" },
  backText: { color: "#344976", fontWeight: "700" },
  card: { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 18, padding: 18 },
  label: { marginTop: 13, marginBottom: 7, fontSize: 12, fontWeight: "700", color: "#374151" },
  days: { gap: 7 },
  day: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: "#D9DEE5" },
  dayActive: { backgroundColor: "#344976", borderColor: "#344976" },
  dayText: { fontSize: 11, fontWeight: "700", color: "#374151" },
  dayTextActive: { color: "#FFF" },
  select: { minHeight: 54, borderWidth: 1, borderColor: "#D9DEE5", borderRadius: 11, paddingHorizontal: 13, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 10 },
  value: { fontSize: 13, fontWeight: "700", color: "#111827" },
  meta: { marginTop: 3, fontSize: 10, color: "#6B7280" },
  chevron: { fontSize: 20, color: "#344976", fontWeight: "800" },
  input: { height: 46, borderWidth: 1, borderColor: "#D9DEE5", borderRadius: 11, paddingHorizontal: 12, color: "#111827", backgroundColor: "#FFF" },
  row: { flexDirection: "row", gap: 10 },
  save: { marginTop: 20, minHeight: 48, borderRadius: 11, backgroundColor: "#344976", alignItems: "center", justifyContent: "center" },
  saveText: { color: "#FFF", fontWeight: "800" },
  disabled: { opacity: 0.55 },
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,.42)", alignItems: "center", justifyContent: "center", padding: 20 },
  dropdown: { width: "100%", maxWidth: 560, maxHeight: "82%", backgroundColor: "#FFF", borderRadius: 18, padding: 18 },
  dropdownMobile: { maxHeight: "88%", padding: 14 },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: "800", color: "#111827" },
  modalMeta: { marginTop: 3, fontSize: 11, color: "#6B7280" },
  close: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 25, color: "#374151" },
  search: { height: 46, borderWidth: 1, borderColor: "#D9DEE5", borderRadius: 11, paddingHorizontal: 12, marginBottom: 10, color: "#111827" },
  list: { maxHeight: 430 },
  option: { minHeight: 58, padding: 10, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 11, marginBottom: 7, flexDirection: "row", alignItems: "center" },
  optionActive: { backgroundColor: "#344976", borderColor: "#344976" },
  optionTitle: { fontSize: 13, fontWeight: "700", color: "#111827" },
  optionTitleActive: { color: "#FFF" },
  optionMeta: { marginTop: 3, fontSize: 10, color: "#6B7280" },
  check: { color: "#FFF", fontWeight: "900", fontSize: 17 },
});
