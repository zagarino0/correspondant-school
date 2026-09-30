import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { RoleDashboard } from "./RoleDashboard";
import { MedicalAccessCard } from "../components/MedicalAccessCard";
import { DisciplinaryApprovalCard } from "../components/DisciplinaryApprovalCard";
import { getSchoolAdminDashboard, getSchoolAdminSchedules } from "../../../services/school-admin/school-admin.service";
import type { SchoolAdminDashboardResponse, ScheduleDay, SchoolAdminSchedule } from "../../../services/school-admin/school-admin.types";

type SchoolAdminDashboardProps = {
  firstName: string;
};

export function SchoolAdminDashboard({
  firstName,
}: SchoolAdminDashboardProps) {
  const router = useRouter();
  const [dashboard, setDashboard] =
    useState<SchoolAdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<SchoolAdminSchedule[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);

        const [data, scheduleData] = await Promise.all([
          getSchoolAdminDashboard(),
          getSchoolAdminSchedules(),
        ]);

        if (mounted) {
          setDashboard(data);
          setSchedules(scheduleData.schedules);
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

  const scheduleDays: Array<{ key: ScheduleDay; label: string; short: string }> = [
    { key: "MONDAY", label: "Lundi", short: "Lun" },
    { key: "TUESDAY", label: "Mardi", short: "Mar" },
    { key: "WEDNESDAY", label: "Mercredi", short: "Mer" },
    { key: "THURSDAY", label: "Jeudi", short: "Jeu" },
    { key: "FRIDAY", label: "Vendredi", short: "Ven" },
    { key: "SATURDAY", label: "Samedi", short: "Sam" },
  ];

  return (
    <>
      <RoleDashboard
        firstName={firstName}
        title="Administration de l'établissement"
        subtitle="Pilotez les effectifs, les classes, le personnel et le suivi des présences."
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
              value: String(classes.length),
              description:
                "Voir toutes les classes actives, regroupées par cycle.",
              onPress: () => router.push("/(app)/classes"),
            },
            {
              id: "staff",
              title: "Personnel",
              value: String(personnel.length),
              description:
                "Voir le personnel actif de l'établissement, regroupé par fonction.",
              onPress: () => router.push("/(app)/personnel"),
            },
          ],
        },
        {
          id: "quick-actions",
          title: "Ajouter",
          cards: [
            {
              id: "add-student",
              title: "Nouvel élève",
              value: "+",
              description: "Ajouter un élève individuellement.",
              onPress: () => router.push("/(app)/student-create"),
            },
            {
              id: "import-students",
              title: "Élèves par groupe",
              value: "Excel",
              description: "Importer plusieurs élèves depuis un fichier Excel.",
              onPress: () => router.push("/(app)/students-import"),
            },
            {
              id: "add-class",
              title: "Nouvelle classe",
              value: "+",
              description: "Créer une classe dans l'année active.",
              onPress: () => router.push("/(app)/class-create"),
            },
            {
              id: "add-personnel",
              title: "Nouveau personnel",
              value: "+",
              description: "Ajouter un membre du personnel.",
              onPress: () => router.push("/(app)/personnel-create"),
            },
            {
              id: "import-personnel",
              title: "Personnel par groupe",
              value: "Excel",
              description: "Importer plusieurs membres du personnel depuis Excel.",
              onPress: () => router.push("/(app)/personnel-import"),
            },
            {
              id: "add-teacher",
              title: "Nouvel enseignant",
              value: "+",
              description: "Créer un compte enseignant.",
              onPress: () => router.push("/(app)/teacher-create"),
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

      <MedicalAccessCard />

      <DisciplinaryApprovalCard />

      <View style={styles.timetableSection}>
        <View style={styles.timetableHeader}>
          <View style={styles.timetableCopy}>
            <Text style={styles.timetableKicker}>ORGANISATION</Text>
            <Text style={styles.timetableTitle}>Emploi du temps</Text>
            <Text style={styles.timetableSubtitle}>
              Construisez rapidement les créneaux de l'année active.
            </Text>
          </View>
          <Pressable
            style={styles.timetableButton}
            onPress={() => router.push("/(app)/schedule-create")}
          >
            <Text style={styles.timetableButtonText}>+ Créer un créneau</Text>
          </Pressable>
        </View>

        <View style={styles.dayGrid}>
          {scheduleDays.map((day) => {
            const count = schedules.filter((item) => item.dayOfWeek === day.key).length;
            return (
              <Pressable
                key={day.key}
                style={styles.dayCard}
                onPress={() => router.push("/(app)/schedule-create")}
              >
                <Text style={styles.dayShort}>{day.short}</Text>
                <Text style={styles.dayLabel}>{day.label}</Text>
                <Text style={styles.dayCount}>{count} cours</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  stateText: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 21,
    color: "#6B7280",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  timetableSection: {
    marginHorizontal: 16,
    marginTop: -12,
    marginBottom: 24,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  timetableHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 14,
  },
  timetableCopy: { flex: 1, minWidth: 0 },
  timetableKicker: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: "#344976",
  },
  timetableTitle: {
    marginTop: 4,
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
  },
  timetableSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: "#6B7280",
  },
  timetableButton: {
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 11,
    backgroundColor: "#344976",
  },
  timetableButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  dayGrid: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  dayCard: {
    flexGrow: 1,
    flexBasis: 120,
    minWidth: 95,
    minHeight: 78,
    padding: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F8FAFC",
  },
  dayShort: {
    fontSize: 10,
    fontWeight: "800",
    color: "#344976",
    textTransform: "uppercase",
  },
  dayLabel: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  dayCount: {
    marginTop: 7,
    fontSize: 11,
    color: "#6B7280",
  },
});
