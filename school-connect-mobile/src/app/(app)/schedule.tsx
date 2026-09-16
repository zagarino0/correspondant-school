import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
const timeSlots = [
  "08:00 - 09:00",
  "09:00 - 10:00",
  "10:00 - 11:00",
  "11:00 - 12:00",
  "14:00 - 15:00",
  "15:00 - 16:00",
];

export default function ScheduleScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          ‹
        </Text>
        <View>
          <Text style={styles.title}>Emploi du temps</Text>
          <Text style={styles.subtitle}>Votre planning de la semaine</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.table}>
          <View style={styles.row}>
            <View style={[styles.timeCell, styles.headerCell]}>
              <Text style={styles.headerText}>Horaire</Text>
            </View>
            {days.map((day) => (
              <View key={day} style={[styles.dayCell, styles.headerCell]}>
                <Text style={styles.headerText}>{day}</Text>
              </View>
            ))}
          </View>

          {timeSlots.map((slot) => (
            <View key={slot} style={styles.row}>
              <View style={styles.timeCell}>
                <Text style={styles.timeText}>{slot}</Text>
              </View>

              {days.map((day) => (
                <View key={`${slot}-${day}`} style={styles.dayCell}>
                  <Text style={styles.emptyText}>—</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      <Text style={styles.note}>
        Les horaires et matières seront affichés ici dès que les données de
        votre établissement seront disponibles.
      </Text>
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
  table: {
    margin: 24,
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
  emptyText: {
    fontSize: 18,
    color: "#9CA3AF",
  },
  note: {
    marginHorizontal: 24,
    marginBottom: 24,
    fontSize: 13,
    lineHeight: 19,
    color: "#6B7280",
  },
});
