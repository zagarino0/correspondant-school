import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { getMyAnnouncements } from "../../../features/announcements/announcement.service";
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

  useEffect(() => {
    let mounted = true;

    async function loadBadges() {
      try {
        const announcementResponse = await getMyAnnouncements();

        if (!mounted) return;

        setUnreadAnnouncements(
          announcementResponse.announcements.filter(
            (announcement) => !announcement.isRead,
          ).length,
        );
      } catch {
        if (!mounted) return;
        setUnreadAnnouncements(0);
      }
    }

    void loadBadges();

    return () => {
      mounted = false;
    };
  }, []);

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
            {unreadAnnouncements > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadAnnouncements > 99 ? "99+" : unreadAnnouncements}
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