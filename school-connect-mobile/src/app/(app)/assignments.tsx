import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import type {
  AssignmentStatus,
  StudentAssignment,
} from "../../features/assignments/assignment.types";
import { getMyAssignments } from "../../services/assignments/assignment.service";

const statusLabels: Record<AssignmentStatus, string> = {
  PENDING: "À faire",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminé",
  LATE: "En retard",
  CANCELLED: "Annulé",
};

function formatDueDate(dueDate: string | null): string {
  if (!dueDate) {
    return "Sans date limite";
  }

  const date = new Date(dueDate);

  if (Number.isNaN(date.getTime())) {
    return "Date limite indisponible";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function AssignmentCard({ assignment }: { assignment: StudentAssignment }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.subject}>{assignment.subject}</Text>
          <Text style={styles.title}>{assignment.title}</Text>
        </View>

        <Text style={styles.status}>{statusLabels[assignment.status]}</Text>
      </View>

      {assignment.description ? (
        <Text style={styles.description}>{assignment.description}</Text>
      ) : null}

      <Text style={styles.dueDate}>
        Date limite : {formatDueDate(assignment.dueDate)}
      </Text>
    </View>
  );
}

export default function AssignmentsScreen() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAssignments() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const response = await getMyAssignments();

        if (isMounted) {
          setAssignments(response.assignments);
        }
      } catch {
        if (isMounted) {
          setErrorMessage("Impossible de charger vos devoirs.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadAssignments();

    return () => {
      isMounted = false;
    };
  }, []);

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
          <Text style={styles.headerTitle}>Devoirs</Text>
          <Text style={styles.subtitle}>Vos devoirs</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.stateText}>Chargement de vos devoirs…</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.stateContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : assignments.length === 0 ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>Aucun devoir</Text>
          <Text style={styles.stateText}>
            Aucun devoir n'est actuellement disponible.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {assignments.map((assignment) => (
            <AssignmentCard key={assignment.id} assignment={assignment} />
          ))}
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
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#6B7280",
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  subject: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
    textTransform: "uppercase",
  },
  title: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  status: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    textAlign: "right",
  },
  description: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: "#4B5563",
  },
  dueDate: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
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
