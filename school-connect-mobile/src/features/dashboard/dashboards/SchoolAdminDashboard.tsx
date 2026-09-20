import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { RoleDashboard } from "./RoleDashboard";
import { getSchoolAdminDashboard } from "../../../services/school-admin/school-admin.service";
import type { SchoolAdminDashboardResponse } from "../../../services/school-admin/school-admin.types";

type SchoolAdminDashboardProps = {
  firstName: string;
};

const STAFF_FUNCTION_LABELS: Record<string, string> = {
  ADMINISTRATION: "Administration",
  SURVEILLANT: "Surveillance",
  SECRETARIAT: "Secrétariat",
  COMPTABILITE: "Comptabilité",
  INFIRMIER: "Infirmerie",
};

export function SchoolAdminDashboard({
  firstName,
}: SchoolAdminDashboardProps) {
  const router = useRouter();
  const [dashboard, setDashboard] =
    useState<SchoolAdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);

        const data = await getSchoolAdminDashboard();

        if (mounted) {
          setDashboard(data);
        }
      } catch {
        if (mounted) {
          setError(
            "Impossible de charger les indicateurs de l'établissement.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={styles.stateText}>
          Chargement du tableau de bord...
        </Text>
      </View>
    );
  }

  if (error || !dashboard) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.errorTitle}>Tableau de bord indisponible</Text>
        <Text style={styles.stateText}>
          {error ?? "Les données de l'établissement sont indisponibles."}
        </Text>
      </View>
    );
  }

  const { counts, attendance, classes, personnel } = dashboard;

  return (
    <RoleDashboard
      firstName={firstName}
      title="Administration scolaire"
      subtitle="pilotez les activités de votre établissement."
      sections={[
        {
          id: "school-management",
          title: "Vue d'ensemble",
          cards: [
            {
              id: "students",
              title: "Élèves",
              value: String(counts.students),
              description: "Élèves actifs cette année.",
              onPress: () => router.push("/(app)/students"),
            },
            {
              id: "teachers",
              title: "Enseignants",
              value: String(counts.teachers),
              description: "Enseignants actifs.",
              onPress: () => router.push("/(app)/teachers"),
            },
            {
              id: "classes",
              title: "Classes",
              value: `${classes.length} actives`,
              description:
                classes.length > 0
                  ? "Voir les classes ci-dessous."
                  : "Aucune classe dans l'année active.",
              content: (
                <View style={styles.list}>
                  {classes.length > 0 ? (
                    classes.map((schoolClass) => (
                      <View key={schoolClass.id} style={styles.listRow}>
                        <View style={styles.listMain}>
                          <Text style={styles.listTitle}>
                            {schoolClass.name}
                          </Text>
                          {schoolClass.level ? (
                            <Text style={styles.listMeta}>
                              {schoolClass.level}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={styles.listCount}>
                          {schoolClass.studentCount} élève(s)
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>
                      Aucune classe active pour l'année scolaire en cours.
                    </Text>
                  )}
                </View>
              ),
              fullWidth: true,
            },
            {
              id: "staff",
              title: "Personnel",
              value: `${personnel.length} actifs`,
              description:
                personnel.length > 0
                  ? "Personnel affecté à cet établissement."
                  : "Aucun personnel affecté.",
              content: (
                <View style={styles.list}>
                  {personnel.length > 0 ? (
                    personnel.map((member) => (
                      <View key={member.assignmentId} style={styles.listRow}>
                        <View style={styles.listMain}>
                          <Text style={styles.listTitle}>
                            {member.lastName} {member.firstName}
                          </Text>
                          <Text style={styles.listMeta}>
                            {STAFF_FUNCTION_LABELS[member.function] ??
                              member.function}
                          </Text>
                        </View>
                        <Text style={styles.statusText}>
                          {member.status === "ACTIVE" ? "Actif" : member.status}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>
                      Aucun personnel actif dans cet établissement.
                    </Text>
                  )}
                </View>
              ),
              fullWidth: true,
            },
          ],
        },
        {
          id: "daily-monitoring",
          title: "Suivi du jour",
          cards: [
            {
              id: "attendance",
              title: "Présences",
              value: String(attendance.recorded),
              description:
                `Présents ${attendance.present} · Absents ${attendance.absent} · Retards ${attendance.late} · Excusés ${attendance.excused}`,
            },
          ],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  stateText: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  list: {
    gap: 10,
  },
  listRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  listMain: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  listMeta: {
    marginTop: 3,
    fontSize: 12,
    color: "#6B7280",
  },
  listCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#344976",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#344976",
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#6B7280",
  },
});
