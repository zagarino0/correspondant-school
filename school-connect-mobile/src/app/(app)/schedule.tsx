import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../stores/authStore";
import { colors } from "../../theme";

import { getMySchedule, getMyTeacherSchedule, getSchoolSchedule } from "../../services/schedule/schedule.service";
import type {
  ScheduleDay,
  StudentSchedule,
  TeacherSchedule,
  SchoolSchedule,
} from "../../features/schedule/schedule.types";

const dayLabels: Record<ScheduleDay, string> = {
  MONDAY: "Lundi",
  TUESDAY: "Mardi",
  WEDNESDAY: "Mercredi",
  THURSDAY: "Jeudi",
  FRIDAY: "Vendredi",
  SATURDAY: "Samedi",
  SUNDAY: "Dimanche",
};

const timetableDays: ScheduleDay[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

function getUniqueTimeSlots(schedules: Array<StudentSchedule | TeacherSchedule | SchoolSchedule>): string[] {
  return Array.from(
    new Set(
      schedules.map(
        (schedule) => `${schedule.startTime} - ${schedule.endTime}`,
      ),
    ),
  ).sort((first, second) => first.localeCompare(second));
}

function getScheduleForCell(
  schedules: Array<StudentSchedule | TeacherSchedule | SchoolSchedule>,
  day: ScheduleDay,
  timeSlot: string,
): Array<StudentSchedule | TeacherSchedule | SchoolSchedule> {
  return schedules.filter(
    (schedule) =>
      schedule.dayOfWeek === day &&
      `${schedule.startTime} - ${schedule.endTime}` === timeSlot,
  );
}

export default function ScheduleScreen() {
  const router = useRouter();
  const role = useAuthStore((state) => state.user?.role);
  const staffFunction = useAuthStore((state) => state.user?.staffFunction);
  const { width: screenWidth } = useWindowDimensions();
  const [schedules, setSchedules] = useState<Array<StudentSchedule | TeacherSchedule | SchoolSchedule>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [classSearch, setClassSearch] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadSchedule() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        if (role === "TEACHER") {
          const response = await getMyTeacherSchedule();
          if (isMounted) {
            setSchedules(response.schedules);
          }
        } else if (role === "STAFF" && (staffFunction === "SURVEILLANT" || staffFunction === "SECRETARIAT")) {
          const response = await getSchoolSchedule();
          if (isMounted) {
            setSchedules(response.schedules);
          }
        } else {
          const response = await getMySchedule();
          if (isMounted) {
            setSchedules(response.schedules);
          }
        }
      } catch {
        if (isMounted) {
          setErrorMessage(
            "Impossible de charger l’emploi du temps.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSchedule();

    return () => {
      isMounted = false;
    };
  }, [role, staffFunction]);

  const isSchoolStaffSchedule = role === "STAFF" && (staffFunction === "SURVEILLANT" || staffFunction === "SECRETARIAT");

  const classes = useMemo(() => {
    if (!isSchoolStaffSchedule) return [];
    const map = new Map<string, { id: string; name: string; level: string | null }>();
    schedules.forEach((schedule) => {
      if ("class" in schedule) {
        map.set(schedule.class.id, schedule.class);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [isSchoolStaffSchedule, schedules]);

  const filteredClasses = useMemo(() => {
    const query = classSearch.trim().toLowerCase();
    if (!query) return classes;
    return classes.filter((item) =>
      item.name.toLowerCase().includes(query) || (item.level ?? "").toLowerCase().includes(query),
    );
  }, [classes, classSearch]);

  const selectedClass = classes.find((item) => item.id === selectedClassId) ?? null;

  const visibleSchedules = useMemo(() => {
    if (!isSchoolStaffSchedule || !selectedClassId) return schedules;
    return schedules.filter((schedule) => "class" in schedule && schedule.class.id === selectedClassId);
  }, [isSchoolStaffSchedule, schedules, selectedClassId]);

  const timeSlots = useMemo(
    () => getUniqueTimeSlots(visibleSchedules),
    [visibleSchedules],
  );

  const tableWidth = Math.max(screenWidth - 32, 640);
  const timeColumnWidth = Math.min(
    112,
    Math.max(88, tableWidth * 0.17),
  );
  const dayColumnWidth = (tableWidth - timeColumnWidth) / timetableDays.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Text style={styles.backButton}>‹</Text>
        </Pressable>

        <View>
          <Text style={styles.title}>Emploi du temps</Text>
          <Text style={styles.subtitle}>
            {role === "TEACHER"
              ? "Vos cours, classes et horaires de la semaine"
              : role === "STAFF" && (staffFunction === "SURVEILLANT" || staffFunction === "SECRETARIAT")
                ? "Emploi du temps de toutes les classes de l’établissement"
                : "Votre planning de la semaine"}
          </Text>
        </View>
      </View>

      {isSchoolStaffSchedule && classes.length > 0 && !isLoading ? (
        <View style={styles.classSelector}>
          <View style={styles.selectorHeader}>
            <View style={styles.selectorCopy}>
              <Text style={styles.selectorLabel}>CLASSE</Text>
              <Text style={styles.selectorTitle}>{selectedClass ? selectedClass.name : "Toutes les classes"}</Text>
            </View>
            <Pressable
              style={styles.allClassesButton}
              onPress={() => setSelectedClassId(null)}
            >
              <Text style={styles.allClassesText}>Toutes</Text>
            </Pressable>
          </View>
          <View style={styles.classSearchBox}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              value={classSearch}
              onChangeText={setClassSearch}
              placeholder="Rechercher une classe…"
              placeholderTextColor="colors.textMuted"
              style={styles.classSearchInput}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.classChips}>
            {filteredClasses.map((item) => (
              <Pressable
                key={item.id}
                style={[styles.classChip, selectedClassId === item.id && styles.classChipActive]}
                onPress={() => setSelectedClassId(item.id)}
              >
                <Text style={[styles.classChipName, selectedClassId === item.id && styles.classChipTextActive]}>{item.name}</Text>
                {item.level ? <Text style={[styles.classChipLevel, selectedClassId === item.id && styles.classChipTextActive]}>{item.level}</Text> : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.stateText}>Chargement de votre emploi du temps…</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.stateContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : schedules.length === 0 ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>Aucun cours disponible</Text>
          <Text style={styles.stateText}>
            L’emploi du temps de votre établissement n'est pas encore disponible.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.verticalScroll}
          contentContainerStyle={styles.verticalContent}
          showsVerticalScrollIndicator={false}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            contentContainerStyle={styles.horizontalContent}
          >
            <View style={[styles.table, { width: tableWidth }]}>
              <View style={styles.row}>
                <View
                  style={[
                    styles.timeCell,
                    styles.headerCell,
                    { width: timeColumnWidth },
                  ]}
                >
                  <Text style={styles.headerText}>Horaire</Text>
                </View>

                {timetableDays.map((day) => (
                  <View
                    key={day}
                    style={[
                      styles.dayCell,
                      styles.headerCell,
                      { width: dayColumnWidth },
                    ]}
                  >
                    <Text style={styles.headerText} numberOfLines={1}>
                      {dayLabels[day]}
                    </Text>
                  </View>
                ))}
              </View>

              {timeSlots.map((timeSlot) => (
                <View key={timeSlot} style={styles.row}>
                  <View
                    style={[
                      styles.timeCell,
                      { width: timeColumnWidth },
                    ]}
                  >
                    <Text style={styles.timeText} numberOfLines={2}>
                      {timeSlot}
                    </Text>
                  </View>

                  {timetableDays.map((day) => {
                    const cellSchedules = getScheduleForCell(
                      visibleSchedules,
                      day,
                      timeSlot,
                    );

                    return (
                      <View
                        key={`${timeSlot}-${day}`}
                        style={[styles.dayCell, { width: dayColumnWidth }]}
                      >
                        {cellSchedules.length > 0 ? (
                          cellSchedules.map((schedule) => (
                            <View
                              key={schedule.id}
                              style={styles.scheduleItem}
                            >
                              <Text
                                style={styles.subjectText}
                                numberOfLines={3}
                              >
                                {schedule.subject}
                              </Text>

                              {"class" in schedule ? (
                                <Text style={styles.classText} numberOfLines={2}>
                                  {(schedule as TeacherSchedule | SchoolSchedule).class.name}
                                </Text>
                              ) : null}

                              {"teacher" in schedule ? (
                                <Text style={styles.teacherText} numberOfLines={2}>
                                  {(schedule as SchoolSchedule).teacher.firstName} {(schedule as SchoolSchedule).teacher.lastName}
                                </Text>
                              ) : null}

                              {schedule.room ? (
                                <Text style={styles.roomText} numberOfLines={2}>
                                  {schedule.room}
                                </Text>
                              ) : null}
                            </View>
                          ))
                        ) : (
                          <Text style={styles.emptyText}>—</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "colors.background",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: "colors.surface",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: "colors.border",
  },
  backButton: {
    fontSize: 36,
    lineHeight: 36,
    color: "colors.text",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "colors.text",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "colors.textSecondary",
  },
  verticalScroll: {
    flex: 1,
  },
  verticalContent: {
    paddingVertical: 16,
  },
  horizontalContent: {
    paddingHorizontal: 16,
  },
  classSelector: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "colors.surface",
    borderWidth: 1,
    borderColor: "colors.border",
  },
  selectorHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  selectorCopy: { flex: 1 },
  selectorLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 0.8, color: "colors.textSecondary" },
  selectorTitle: { marginTop: 3, fontSize: 16, fontWeight: "900", color: "colors.text" },
  allClassesButton: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 9, borderWidth: 1, borderColor: "colors.border" },
  allClassesText: { fontSize: 10, fontWeight: "900", color: "colors.primary" },
  classSearchBox: { marginTop: 10, minHeight: 42, flexDirection: "row", alignItems: "center", paddingHorizontal: 11, borderRadius: 10, borderWidth: 1, borderColor: "colors.border", backgroundColor: "colors.background" },
  searchIcon: { marginRight: 7, fontSize: 18, color: "colors.textSecondary" },
  classSearchInput: { flex: 1, fontSize: 12, color: "colors.text", paddingVertical: 8 },
  classChips: { gap: 7, paddingTop: 10 },
  classChip: { minWidth: 82, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "colors.border", backgroundColor: "colors.surface" },
  classChipActive: { borderColor: "colors.primary", backgroundColor: "colors.primary" },
  classChipName: { fontSize: 11, fontWeight: "900", color: "colors.primary" },
  classChipLevel: { marginTop: 2, fontSize: 9, color: "colors.textSecondary" },
  classChipTextActive: { color: "colors.surface" },
  table: {
    borderWidth: 1,
    borderColor: "colors.border",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "colors.surface",
  },
  row: {
    flexDirection: "row",
  },
  headerCell: {
    backgroundColor: "colors.surfaceMuted",
  },
  timeCell: {
    minHeight: 68,
    padding: 8,
    justifyContent: "center",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "colors.border",
  },
  dayCell: {
    minHeight: 68,
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "colors.border",
  },
  headerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "colors.textSecondary",
    textAlign: "center",
  },
  timeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "colors.textSecondary",
    textAlign: "center",
  },
  scheduleItem: {
    width: "100%",
    alignItems: "center",
  },
  subjectText: {
    fontSize: 12,
    fontWeight: "700",
    color: "colors.text",
    textAlign: "center",
  },
  classText: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: "600",
    color: "colors.textSecondary",
    textAlign: "center",
  },
  teacherText: {
    marginTop: 3,
    fontSize: 10,
    color: "colors.textSecondary",
    textAlign: "center",
  },
  roomText: {
    marginTop: 4,
    fontSize: 10,
    color: "colors.textSecondary",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "colors.textMuted",
  },
  stateContainer: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "colors.text",
    textAlign: "center",
  },
  stateText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "colors.textSecondary",
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: "colors.danger",
    textAlign: "center",
  },
});