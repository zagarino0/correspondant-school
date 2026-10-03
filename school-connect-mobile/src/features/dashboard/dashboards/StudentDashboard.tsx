import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { DashboardSection } from "../components/DashboardSection";
import type { DashboardSectionData } from "../dashboard.types";
import { getMyAssignments } from "../../../services/assignments/assignment.service";
import { getMyNextSchedule } from "../../../services/schedule/schedule.service";
import { getMyAttendance, type ParentAttendanceRecord } from "../../../services/attendance/attendance.service";
import { createRealtimeConnection } from "../../../services/realtime/websocket.service";
import type { StudentSchedule } from "../../schedule/schedule.types";
import { normalizeApiError } from "../../../services/api/errors";
import { getMyStudentDiscipline, type ApprovedDisciplinaryAction } from "../../../services/discipline/discipline.service";

type StudentDashboardProps = {
  firstName: string;
};

const dayLabels: Record<StudentSchedule["dayOfWeek"], string> = {
  MONDAY: "Lundi",
  TUESDAY: "Mardi",
  WEDNESDAY: "Mercredi",
  THURSDAY: "Jeudi",
  FRIDAY: "Vendredi",
  SATURDAY: "Samedi",
  SUNDAY: "Dimanche",
};

export function StudentDashboard({
  firstName,
}: StudentDashboardProps) {
  const router = useRouter();
  const [assignmentCount, setAssignmentCount] = useState<number | null>(null);
  const [assignmentsError, setAssignmentsError] = useState(false);
  const [nextSchedule, setNextSchedule] = useState<StudentSchedule | null>(null);
  const [nextScheduleLoading, setNextScheduleLoading] = useState(true);
  const [nextScheduleError, setNextScheduleError] = useState(false);
  const [attendance, setAttendance] = useState<ParentAttendanceRecord | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [discipline, setDiscipline] = useState<ApprovedDisciplinaryAction[]>([]);
  const [disciplineLoading, setDisciplineLoading] = useState(true);
  const [disciplineError, setDisciplineError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadAssignments() {
      try {
        setAssignmentsError(false);
        const response = await getMyAssignments();

        if (isMounted) {
          setAssignmentCount(response.count);
        }
      } catch {
        if (isMounted) {
          setAssignmentsError(true);
        }
      }
    }

    void loadAssignments();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadNextSchedule() {
      try {
        setNextScheduleError(false);
        setNextScheduleLoading(true);
        const response = await getMyNextSchedule();

        if (isMounted) {
          setNextSchedule(response.schedule);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const apiError = normalizeApiError(error);

        if (apiError.code === "NOT_FOUND") {
          setNextSchedule(null);
          setNextScheduleError(false);
        } else {
          setNextScheduleError(true);
        }
      } finally {
        if (isMounted) {
          setNextScheduleLoading(false);
        }
      }
    }

    void loadNextSchedule();

    return () => {
      isMounted = false;
    };
  }, []);


  useEffect(() => {
    let mounted = true;

    const loadAttendance = async () => {
      try {
        const response = await getMyAttendance();
        if (mounted) {
          setAttendance(response.attendance[0] ?? null);
        }
      } catch {
        if (mounted) setAttendance(null);
      } finally {
        if (mounted) setAttendanceLoading(false);
      }
    };

    void loadAttendance();

    const connection = createRealtimeConnection({
      onEvent: (event) => {
        if (event.type !== "attendance:event") return;
        void loadAttendance();
      },
    });
    connection.connect();

    return () => {
      mounted = false;
      connection.close();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadDiscipline = async () => {
      try {
        setDisciplineLoading(true);
        setDisciplineError(false);
        const response = await getMyStudentDiscipline();
        if (mounted) setDiscipline(response.actions);
      } catch {
        if (mounted) {
          setDiscipline([]);
          setDisciplineError(true);
        }
      } finally {
        if (mounted) setDisciplineLoading(false);
      }
    };

    void loadDiscipline();

    const connection = createRealtimeConnection({
      onEvent: (event) => {
        if (event.type === "discipline:updated") {
          void loadDiscipline();
        }
      },
    });
    connection.connect();

    return () => {
      mounted = false;
      connection.close();
    };
  }, []);

  const nextScheduleValue = nextScheduleLoading
    ? "…"
    : nextScheduleError
      ? "—"
      : nextSchedule
        ? nextSchedule.subject
        : "Aucun cours";

  const nextScheduleDescription = nextScheduleLoading
    ? "Chargement du prochain cours."
    : nextScheduleError
      ? "Impossible de charger le prochain cours."
      : nextSchedule
        ? `${dayLabels[nextSchedule.dayOfWeek]} · ${nextSchedule.startTime} - ${nextSchedule.endTime}${nextSchedule.room ? ` · Salle ${nextSchedule.room}` : ""}`
        : "Aucun prochain cours prévu.";

  const sections: DashboardSectionData[] = [
    {
      id: "student-overview",
      title: "Ma scolarité",
      cards: [
        {
          id: "assignments",
          title: "Devoirs",
          value: assignmentsError ? "—" : assignmentCount === null ? "…" : String(assignmentCount),
          description: "Vos devoirs à venir.",
          onPress: () => router.push("/(app)/assignments"),
        },
        {
          id: "next-class",
          title: "Prochain cours",
          value: nextScheduleValue,
          description: nextScheduleDescription,
        },
      ],
    },
    {
      id: "student-attendance",
      title: "Ma présence",
      cards: [
        {
          id: "attendance-status",
          title: "Aujourd'hui",
          value: attendanceLoading
            ? "…"
            : attendance?.status === "PRESENT"
              ? "Présent"
              : attendance?.status === "ABSENT"
                ? "Absent"
                : attendance?.status === "LATE"
                  ? "Retard"
                  : attendance?.status === "EXCUSED"
                    ? "Justifié"
                    : "Non renseigné",
          description: attendance?.events?.[0]
            ? attendance.events[0].type === "LATE_AUTHORIZED"
              ? "Retard — entrée autorisée."
              : attendance.events[0].type === "LATE_NOT_AUTHORIZED"
                ? "Retard — entrée non autorisée."
                : attendance.events[0].type === "ABSENCE_JUSTIFIED"
                  ? "Absence justifiée."
                  : "Absence non justifiée."
            : "État synchronisé avec votre établissement.",
        },
      ],
    },
    {
      id: "student-discipline",
      title: "Discipline",
      cards: [
        {
          id: "discipline-status",
          title: "Mes mesures disciplinaires",
          value: disciplineLoading
            ? "…"
            : disciplineError
              ? "—"
              : String(discipline.length),
          description: disciplineLoading
            ? "Chargement de votre suivi disciplinaire."
            : disciplineError
              ? "Impossible de charger votre suivi disciplinaire."
              : discipline.length === 0
                ? "Aucune mesure disciplinaire validée."
                : `Dernière mesure : ${discipline[0].type} · ${discipline[0].status === "COMPLETED" ? "Terminée" : "Active"}.`,
        },
      ],
    },
    {
      id: "student-activity",
      title: "Mon activité",
      cards: [
        {
          id: "schedule",
          title: "Emploi du temps",
          description: "Consulter vos cours et horaires.",
          onPress: () => router.push("/(app)/schedule"),
        },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}><View style={styles.heroIcon}><Ionicons name="school" size={22} color="#FFFFFF" /></View><View style={styles.heroText}><Text style={styles.eyebrow}>MON ESPACE</Text><Text style={styles.title}>Bonjour {firstName}</Text><Text style={styles.subtitle}>Voici l’essentiel de votre journée scolaire.</Text></View></View>

      {sections.map((section) => (
        <DashboardSection key={section.id} {...section} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 110 },
  hero: { flexDirection: "row", alignItems: "center", gap: 13, padding: 18, borderRadius: 22, backgroundColor: "#101828", shadowColor: "#101828", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 18, elevation: 4 },
  heroIcon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#4F46E5" },
  heroText: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5, color: "#C7D2FE" },
  title: { marginTop: 3, fontSize: 23, lineHeight: 28, fontWeight: "800", color: "#FFFFFF" },
  subtitle: { marginTop: 4, fontSize: 13, lineHeight: 19, color: "#D0D5DD" },
});
