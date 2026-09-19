import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../stores/authStore";

import { getMySchedule, getMyTeacherSchedule } from "../../services/schedule/schedule.service";
import type {
  ScheduleDay,
  StudentSchedule,
  TeacherSchedule,
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

function getUniqueTimeSlots(schedules: StudentSchedule[]): string[] {
  return Array.from(
    new Set(
      schedules.map(
        (schedule) => `${schedule.startTime} - ${schedule.endTime}`,
      ),
    ),
  ).sort((first, second) => first.localeCompare(second));
}

function getScheduleForCell(
  schedules: Array<StudentSchedule | TeacherSchedule>,
  day: ScheduleDay,
  timeSlot: string,
): StudentSchedule[] {
  return schedules.filter(
    (schedule) =>
      schedule.dayOfWeek === day &&
      `${schedule.startTime} - ${schedule.endTime}` === timeSlot,
  );
}

export default function ScheduleScreen() {
  const router = useRouter();
  const role = useAuthStore((state) => state.user?.role);
  const { width: screenWidth } = useWindowDimensions();
  const [schedules, setSchedules] = useState<Array<StudentSchedule | TeacherSchedule>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        } else {
          const response = await getMySchedule();
          if (isMounted) {
            setSchedules(response.schedules);
          }
        }
      } catch {
        if (isMounted) {
          setErrorMessage(
            "Impossible de charger votre emploi du temps.",
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
  }, [role]);

  const timeSlots = useMemo(
    () => getUniqueTimeSlots(schedules),
    [schedules],
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
              : "Votre planning de la semaine"}
          </Text>
        </View>
      </View>

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
            Votre emploi du temps n'est pas encore disponible.
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
                      schedules,
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
                                  {schedule.class.name}
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
    backgroundColor: "#F5F7FA",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    fontSize: 36,
    lineHeight: 36,
    color: "#111827",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#6B7280",
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
  table: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  row: {
    flexDirection: "row",
  },
  headerCell: {
    backgroundColor: "#F3F4F6",
  },
  timeCell: {
    minHeight: 68,
    padding: 8,
    justifyContent: "center",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  dayCell: {
    minHeight: 68,
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  headerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    textAlign: "center",
  },
  timeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4B5563",
    textAlign: "center",
  },
  scheduleItem: {
    width: "100%",
    alignItems: "center",
  },
  subjectText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  classText: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },
  roomText: {
    marginTop: 4,
    fontSize: 10,
    color: "#6B7280",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#9CA3AF",
  },
  stateContainer: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  stateText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#B91C1C",
    textAlign: "center",
  },
});