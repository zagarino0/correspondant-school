import { useCallback, useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
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
  createSchoolSchedule,
  deleteSchoolSchedule,
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
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);
  const [teacherDropdownOpen, setTeacherDropdownOpen] = useState(false);
  const [classSearch, setClassSearch] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");

  const selectedClass = useMemo(
    () => dashboard?.classes.find((item) => item.id === classId) ?? null,
    [dashboard?.classes, classId],
  );

  const selectedTeacher = useMemo(
    () => teachers.find((item) => item.id === teacherId) ?? null,
    [teachers, teacherId],
  );

  const filteredClasses = useMemo(() => {
    const query = classSearch.trim().toLowerCase();
    if (!query) return dashboard?.classes ?? [];
    return (dashboard?.classes ?? []).filter((item) =>
      item.name.toLowerCase().includes(query),
    );
  }, [dashboard?.classes, classSearch]);

  const filteredTeachers = useMemo(() => {
    const query = teacherSearch.trim().toLowerCase();
    if (!query) return teachers;
    return teachers.filter((item) =>
      (item.firstName + " " + item.lastName).toLowerCase().includes(query),
    );
  }, [teachers, teacherSearch]);

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
      <Pressable onPress={() => { setClassSearch(""); setClassDropdownOpen(true); }} style={styles.selectButton}>
        <View style={styles.selectTextWrap}>
          <Text style={selectedClass ? styles.selectValue : styles.selectPlaceholder}>
            {selectedClass?.name ?? "Sélectionner une classe"}
          </Text>
          {selectedClass?.level ? <Text style={styles.selectMeta}>{selectedClass.level}</Text> : null}
        </View>
        <Text style={styles.selectChevron}>⌄</Text>
      </Pressable>

      <Text style={styles.label}>Enseignant</Text>
      <Pressable onPress={() => { setTeacherSearch(""); setTeacherDropdownOpen(true); }} style={styles.selectButton}>
        <View style={styles.selectTextWrap}>
          <Text style={selectedTeacher ? styles.selectValue : styles.selectPlaceholder}>
            {selectedTeacher ? selectedTeacher.firstName + " " + selectedTeacher.lastName : "Sélectionner un enseignant"}
          </Text>
          {selectedTeacher?.email ? <Text style={styles.selectMeta}>{selectedTeacher.email}</Text> : null}
        </View>
        <Text style={styles.selectChevron}>⌄</Text>
      </Pressable>

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

  const dropdown = (
    <Modal
      visible={classDropdownOpen || teacherDropdownOpen}
      transparent
      animationType="fade"
      onRequestClose={() => { setClassDropdownOpen(false); setTeacherDropdownOpen(false); }}
    >
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => { setClassDropdownOpen(false); setTeacherDropdownOpen(false); }} />
        <View style={[styles.dropdownCard, isMobile && styles.dropdownCardMobile]}>
          <View style={styles.dropdownHeader}>
            <View style={styles.flex}>
              <Text style={styles.dropdownTitle}>{classDropdownOpen ? "Sélectionner une classe" : "Sélectionner un enseignant"}</Text>
              <Text style={styles.dropdownMeta}>
                {classDropdownOpen ? filteredClasses.length + " classe(s)" : filteredTeachers.length + " enseignant(s)"}
              </Text>
            </View>
            <Pressable onPress={() => { setClassDropdownOpen(false); setTeacherDropdownOpen(false); }} style={styles.dropdownClose}>
              <Text style={styles.dropdownCloseText}>×</Text>
            </Pressable>
          </View>

          <TextInput
            value={classDropdownOpen ? classSearch : teacherSearch}
            onChangeText={classDropdownOpen ? setClassSearch : setTeacherSearch}
            placeholder={classDropdownOpen ? "Rechercher une classe…" : "Rechercher un enseignant…"}
            placeholderTextColor="#9CA3AF"
            autoFocus
            style={styles.dropdownSearch}
          />

          {classDropdownOpen ? (
            <FlatList
              data={filteredClasses}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              style={styles.dropdownList}
              renderItem={({ item }) => (
                <Pressable onPress={() => { setClassId(item.id); setClassDropdownOpen(false); }} style={[styles.dropdownItem, item.id === classId && styles.dropdownItemActive]}>
                  <View style={styles.flex}>
                    <Text style={[styles.dropdownItemTitle, item.id === classId && styles.dropdownItemTitleActive]}>{item.name}</Text>
                    {item.level ? <Text style={[styles.dropdownItemMeta, item.id === classId && styles.dropdownItemMetaActive]}>{item.level}</Text> : null}
                  </View>
                  {item.id === classId ? <Text style={styles.checkMark}>✓</Text> : null}
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.dropdownEmpty}>Aucune classe trouvée.</Text>}
            />
          ) : (
            <FlatList
              data={filteredTeachers}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              style={styles.dropdownList}
              renderItem={({ item }) => (
                <Pressable onPress={() => { setTeacherId(item.id); setTeacherDropdownOpen(false); }} style={[styles.dropdownItem, item.id === teacherId && styles.dropdownItemActive]}>
                  <View style={styles.flex}>
                    <Text style={[styles.dropdownItemTitle, item.id === teacherId && styles.dropdownItemTitleActive]}>{item.firstName} {item.lastName}</Text>
                    {item.email ? <Text style={[styles.dropdownItemMeta, item.id === teacherId && styles.dropdownItemMetaActive]}>{item.email}</Text> : null}
                  </View>
                  {item.id === teacherId ? <Text style={styles.checkMark}>✓</Text> : null}
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.dropdownEmpty}>Aucun enseignant trouvé.</Text>}
            />
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      {dropdown}
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
                  <View style={styles.scheduleActions}>
                    <Pressable
                      onPress={() => router.push({ pathname: "/schedule-edit", params: { scheduleId: item.id } })}
                      style={styles.editScheduleButton}
                    >
                      <Text style={styles.editScheduleText}>Modifier</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        Alert.alert(
                          "Supprimer le créneau",
                          `Supprimer « ${item.subject} » de l'emploi du temps ?`,
                          [
                            { text: "Annuler", style: "cancel" },
                            {
                              text: "Supprimer",
                              style: "destructive",
                              onPress: async () => {
                                try {
                                  await deleteSchoolSchedule(item.id);
                                  await load();
                                } catch (error: any) {
                                  Alert.alert(
                                    "Suppression impossible",
                                    error?.response?.data?.error?.message ?? "Une erreur est survenue.",
                                  );
                                }
                              },
                            },
                          ],
                        );
                      }}
                      style={styles.deleteScheduleButton}
                    >
                      <Text style={styles.deleteScheduleText}>Supprimer</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {form}
      </View>
      </ScrollView>
    </>
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
  scheduleActions: { alignItems: "flex-end", justifyContent: "center", gap: 6, marginLeft: 8 },
  editScheduleButton: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#D9DEE5", backgroundColor: "#FFF" },
  editScheduleText: { fontSize: 10, fontWeight: "800", color: "#344976" },
  deleteScheduleButton: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA" },
  deleteScheduleText: { fontSize: 10, fontWeight: "800", color: "#B91C1C" },
  formCard: { padding: 18, borderRadius: 18, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFF", gap: 2 },
  formHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  kicker: { fontSize: 10, fontWeight: "800", letterSpacing: 1.4, color: "#344976" },
  formTitle: { marginTop: 4, fontSize: 20, fontWeight: "800", color: "#111827" },
  formHint: { marginTop: 3, fontSize: 12, color: "#6B7280" },
  dayBadge: { minWidth: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#344976" },
  dayBadgeText: { color: "#FFF", fontWeight: "800", fontSize: 12 },
  label: { marginTop: 13, marginBottom: 7, fontSize: 12, fontWeight: "700", color: "#374151" },
  selectButton: { minHeight: 54, borderWidth: 1, borderColor: "#D9DEE5", borderRadius: 11, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: "#FFF", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  selectTextWrap: { flex: 1, minWidth: 0 },
  selectValue: { fontSize: 13, fontWeight: "700", color: "#111827" },
  selectPlaceholder: { fontSize: 13, color: "#9CA3AF" },
  selectMeta: { marginTop: 3, fontSize: 10, color: "#6B7280" },
  selectChevron: { fontSize: 20, lineHeight: 20, color: "#344976", fontWeight: "800" },
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
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.42)", alignItems: "center", justifyContent: "center", padding: 20 },
  dropdownCard: { width: "100%", maxWidth: 560, maxHeight: "82%", backgroundColor: "#FFF", borderRadius: 18, borderWidth: 1, borderColor: "#E5E7EB", padding: 18, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  dropdownCardMobile: { maxHeight: "88%", padding: 14 },
  dropdownHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  dropdownTitle: { fontSize: 17, fontWeight: "800", color: "#111827" },
  dropdownMeta: { marginTop: 3, fontSize: 11, color: "#6B7280" },
  dropdownClose: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  dropdownCloseText: { fontSize: 25, lineHeight: 27, color: "#374151" },
  dropdownSearch: { height: 46, borderWidth: 1, borderColor: "#D9DEE5", borderRadius: 11, paddingHorizontal: 12, backgroundColor: "#F8FAFC", color: "#111827", marginBottom: 10 },
  dropdownList: { maxHeight: 430 },
  dropdownItem: { minHeight: 58, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 11, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFF", flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 7 },
  dropdownItemActive: { backgroundColor: "#344976", borderColor: "#344976" },
  dropdownItemTitle: { fontSize: 13, fontWeight: "700", color: "#111827" },
  dropdownItemTitleActive: { color: "#FFF" },
  dropdownItemMeta: { marginTop: 3, fontSize: 10, color: "#6B7280" },
  dropdownItemMetaActive: { color: "#E5E7EB" },
  checkMark: { color: "#FFF", fontSize: 17, fontWeight: "900" },
  dropdownEmpty: { padding: 20, textAlign: "center", color: "#6B7280", fontSize: 12 },
});
