import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { getMyAnnouncements } from "../../../features/announcements/announcement.service";
import { getMySummons } from "../../../services/parents/parent.service";
import { createRealtimeConnection } from "../../../services/realtime/websocket.service";
import { getSummonsNotifications } from "../../../services/surveillant/surveillant.service";
import type { UserRole } from "../../../types/auth";

type DashboardHeaderProps = {
  firstName: string;
  role: UserRole;
};

const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: "Super administrateur",
  SCHOOL_ADMIN: "Administrateur scolaire",
  TEACHER: "Enseignant",
  PARENT: "Parent",
  STUDENT: "Élève",
  STAFF: "Personnel",
};

export function DashboardHeader({ firstName, role }: DashboardHeaderProps) {
  const router = useRouter();
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const [pendingSummons, setPendingSummons] = useState(0);
  const [surveillantNotifications, setSurveillantNotifications] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadBadges() {
      try {
        const announcementPromise = getMyAnnouncements();
        const summonsPromise = role === "PARENT" ? getMySummons() : null;
        const surveillantPromise = role === "STAFF" ? getSummonsNotifications() : null;
        const [announcementResponse, summonsResponse] = await Promise.all([
          announcementPromise,
          summonsPromise,
          surveillantPromise,
        ]);

        if (!mounted) return;

        setUnreadAnnouncements(
          announcementResponse.announcements.filter(
            (announcement) => !announcement.isRead,
          ).length,
        );
        setPendingSummons(
          role === "PARENT"
            ? (summonsResponse?.summons.filter(
                (summon) => summon.status === "PENDING",
              ).length ?? 0)
            : 0,
        );
        setSurveillantNotifications(
          role === "STAFF" ? (surveillantResponse?.unreadCount ?? 0) : 0,
        );
      } catch {
        if (!mounted) return;
        setUnreadAnnouncements(0);
        setPendingSummons(0);
      }
    }

    void loadBadges();

    if (role !== "PARENT" && role !== "STAFF") {
      return () => {
        mounted = false;
      };
    }

    const connection = createRealtimeConnection({
      onEvent: (event) => {
        if (
          event.type === "parent:summons:new" ||
          event.type === "parent:summons:updated"
        ) {
          void loadBadges();
        }
      },
    });

    connection.connect();

    const pollingTimer = setInterval(() => {
      void loadBadges();
    }, 5000);

    return () => {
      mounted = false;
      connection.close();
      clearInterval(pollingTimer);
    };
  }, [role]);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.textContainer}>
          <Text style={styles.brand} numberOfLines={1}>
            Correspondant
          </Text>
          <Text style={styles.greeting} numberOfLines={1}>
            Bonjour {firstName}
          </Text>
          <Text style={styles.role} numberOfLines={1}>
            {roleLabels[role]}
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => router.push("/(app)/announcements")}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="Annonces"
          >
            <Ionicons name="notifications-outline" size={23} color="#344976" />
            {unreadAnnouncements + pendingSummons + surveillantNotifications > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadAnnouncements + pendingSummons + surveillantNotifications > 99
                    ? "99+"
                    : unreadAnnouncements + pendingSummons + surveillantNotifications}
                </Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => router.push("/(app)/profile")}
            style={styles.profileButton}
            accessibilityRole="button"
            accessibilityLabel="Profil"
          >
            <Ionicons name="person-outline" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  brand: {
    fontSize: 21,
    fontWeight: "800",
    color: "#111827",
  },
  greeting: {
    marginTop: 4,
    fontSize: 14,
    color: "#6B7280",
  },
  role: {
    marginTop: 2,
    fontSize: 11,
    color: "#9CA3AF",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    position: "relative",
  },
  actionIcon: {
    fontSize: 24,
    fontWeight: "800",
    color: "#344976",
  },
  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#344976",
  },
  profileIcon: {
    fontSize: 22,
    color: "#FFFFFF",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DC2626",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },
});