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

import { getMySchedule } from "../../services/schedule/schedule.service";
import type {
  ScheduleDay,
  StudentSchedule,
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

function getUniqueDays(schedules: StudentSchedule[]): ScheduleDay[] {
  return Array.from(
    new Set(schedules.map((schedule) => schedule.dayOfWeek)),
  );
}

function getUniqueTimeSlots(schedules: StudentSchedule[]): string[] {
  return Array.from(
    new Set(
      schedules.map(
        (schedule) => `${schedule.startTime} - ${schedule.endTime}`,
      ),
    ),
  );
}

function getScheduleForCell(
  schedules: StudentSchedule[],
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
  const [schedules, setSchedules] = useState<StudentSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSchedule() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const response = await getMySchedule();

        if (isMounted) {
          setSchedules(response.schedules);
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
  }, []);

  const days = useMemo(
    () => getUniqueDays(schedules),
    [schedules],
  );

  const timeSlots = useMemo(
    () => getUniqueTimeSlots(schedules),
    [schedules],
  );

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
          <Text style={styles.subtitle}>Votre planning de la semaine</Text>
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
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalContent}
        >
          <View style={styles.table}>
            <View style={styles.row}>
              <View style={[styles.timeCell, styles.headerCell]}>
                <Text style={styles.headerText}>Horaire</Text>
              </View>

              {days.map((day) => (
                <View
                  key={day}
                  style={[styles.dayCell, styles.headerCell]}
                >
                  <Text style={styles.headerText}>
                    {dayLabels[day]}
                  </Text>
                </View>
              ))}
            </View>

            {timeSlots.map((timeSlot) => (
              <View key={timeSlot} style={styles.row}>
                <View style={styles.timeCell}>
                  <Text style={styles.timeText}>{timeSlot}</Text>
                </View>

                {days.map((day) => {
                  const cellSchedules = getScheduleForCell(
                    schedules,
                    day,
                    timeSlot,
                  );

                  return (
                    <View
                      key={`${timeSlot}-${day}`}
                      style={styles.dayCell}
                    >
                      {cellSchedules.length > 0 ? (
                        cellSchedules.map((schedule) => (
                          <View
                            key={schedule.id}
                            style={styles.scheduleItem}
                          >
                            <Text style={styles.subjectText}>
                              {schedule.subject}
                            </Text>

                            {schedule.room ? (
                              <Text style={styles.roomText}>
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
  horizontalContent: {
    padding: 24,
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
    width: 112,
    minHeight: 68,
    padding: 10,
    justifyContent: "center",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  dayCell: {
    width: 132,
    minHeight: 68,
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  headerText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  timeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  scheduleItem: {
    width: "100%",
    alignItems: "center",
  },
  subjectText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  roomText: {
    marginTop: 4,
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 18,
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