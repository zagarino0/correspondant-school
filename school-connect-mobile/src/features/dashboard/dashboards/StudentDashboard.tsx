import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { DashboardSection } from "../components/DashboardSection";
import type { DashboardSectionData } from "../dashboard.types";
import { getMyAssignments } from "../../../services/assignments/assignment.service";
import { getMyNextSchedule } from "../../../services/schedule/schedule.service";
import { getMyAnnouncements } from "../../announcements/announcement.service";
import type { StudentSchedule } from "../../schedule/schedule.types";
import { normalizeApiError } from "../../../services/api/errors";
import { getUnreadMessageCount } from "../../../services/messages/message.service";
import { createRealtimeConnection } from "../../../services/realtime/websocket.service";
import type { RealtimeEvent } from "../../../services/realtime/websocket.types";
import { useAuthStore } from "../../../stores/authStore";

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
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [unreadMessageCount, setUnreadMessageCount] = useState<number | null>(null);
  const [assignmentCount, setAssignmentCount] = useState<number | null>(null);
  const [assignmentsError, setAssignmentsError] = useState(false);
  const [nextSchedule, setNextSchedule] = useState<StudentSchedule | null>(null);
  const [nextScheduleLoading, setNextScheduleLoading] = useState(true);
  const [nextScheduleError, setNextScheduleError] = useState(false);
  const [announcementCount, setAnnouncementCount] = useState<number | null>(null);
  const [announcementsError, setAnnouncementsError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      async function loadUnreadMessages() {
        try {
          const count = await getUnreadMessageCount();

          if (isMounted) {
            setUnreadMessageCount(count);
          }
        } catch {
          if (isMounted) {
            setUnreadMessageCount(null);
          }
        }
      }

      void loadUnreadMessages();

      const realtime = createRealtimeConnection({
        onEvent: (event: RealtimeEvent) => {
          if (
            event.type === "message:new" &&
            event.payload.senderId !== currentUserId
          ) {
            setUnreadMessageCount((current) => (current ?? 0) + 1);
          }
        },
      });

      realtime.connect();

      return () => {
        isMounted = false;
        realtime.close();
      };
    }, [currentUserId]),
  );

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
    let isMounted = true;

    async function loadAnnouncements() {
      try {
        setAnnouncementsError(false);
        const response = await getMyAnnouncements();

        if (isMounted) {
          setAnnouncementCount(
            response.announcements.filter((announcement) => !announcement.isRead).length,
          );
        }
      } catch {
        if (isMounted) {
          setAnnouncementsError(true);
        }
      }
    }

    void loadAnnouncements();

    return () => {
      isMounted = false;
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
      id: "student-activity",
      title: "Mon activité",
      cards: [
        {
          id: "schedule",
          title: "Emploi du temps",
          description: "Consulter vos cours et horaires.",
          onPress: () => router.push("/(app)/schedule"),
        },
        {
          id: "announcements",
          title: "Annonces",
          value: announcementsError
            ? "—"
            : announcementCount === null
              ? "…"
              : String(announcementCount),
          description: "Vos annonces non lues.",
          onPress: () => router.push("/(app)/announcements"),
        },
        {
          id: "messages",
          title: "Messages",
          badge:
            unreadMessageCount !== null && unreadMessageCount > 0
              ? unreadMessageCount > 99
                ? "99+"
                : String(unreadMessageCount)
              : undefined,
          description:
            unreadMessageCount === null
              ? "Vos échanges avec l’établissement."
              : unreadMessageCount > 0
                ? `${unreadMessageCount} message${unreadMessageCount > 1 ? "s" : ""} non lu${unreadMessageCount > 1 ? "s" : ""}.`
                : "Aucun nouveau message.",
          onPress: () => router.push("/(app)/messages"),
        },
      ],
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.title}>Espace étudiant</Text>
      <Text style={styles.subtitle}>
        Bonjour {firstName}, voici votre espace scolaire.
      </Text>

      {sections.map((section) => (
        <DashboardSection key={section.id} {...section} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: "#6B7280",
  },
});
