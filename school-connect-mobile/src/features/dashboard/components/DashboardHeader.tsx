import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { getMyAnnouncements } from "../../../features/announcements/announcement.service";
import { getMyAuthorizations, getMySummons } from "../../../services/parents/parent.service";
import { createRealtimeConnection } from "../../../services/realtime/websocket.service";
import { getSummonsNotifications } from "../../../services/surveillant/surveillant.service";
import { getSchoolLifeAuthorizations } from "../../../services/surveillant/schoolLife.service";
import type { StaffFunction, UserRole } from "../../../types/auth";
import { useNotificationCenterStore } from "../../../stores/notificationCenterStore";

type DashboardHeaderProps = {
  firstName: string;
  role: UserRole;
  staffFunction?: StaffFunction | null;
};

const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: "Super administrateur",
  SCHOOL_ADMIN: "Administrateur scolaire",
  TEACHER: "Enseignant",
  PARENT: "Parent",
  STUDENT: "Élève",
  STAFF: "Personnel",
};

export function DashboardHeader({ firstName, role, staffFunction }: DashboardHeaderProps) {
  const router = useRouter();
  const [notificationCount, setNotificationCount] = useState(0);
  const lastViewedAt = useNotificationCenterStore((state) => state.lastViewedAt);

  useEffect(() => {
    let mounted = true;

    async function loadBadges() {
      const [announcements, summons, surveillant, authorizations, parentAuthorizations] =
        await Promise.allSettled([
          getMyAnnouncements(),
          role === "PARENT" ? getMySummons() : Promise.resolve(null),
          role === "STAFF" && staffFunction === "SURVEILLANT" ? getSummonsNotifications() : Promise.resolve(null),
          role === "STAFF" && staffFunction === "SURVEILLANT" ? getSchoolLifeAuthorizations() : Promise.resolve(null),
          role === "PARENT" ? getMyAuthorizations() : Promise.resolve(null),
        ]);

      if (!mounted) return;

      const announcementCount = announcements.status === "fulfilled"
        ? announcements.value.announcements.filter((a) => !a.isRead && new Date(a.createdAt).getTime() > lastViewedAt).length
        : 0;
      const summonCount = summons.status === "fulfilled"
        ? (summons.value?.summons.filter((s) => s.status === "PENDING" && new Date(s.createdAt).getTime() > lastViewedAt).length ?? 0)
        : 0;
      const surveillantCount = surveillant.status === "fulfilled"
        ? (surveillant.value?.items.filter((i) => !i.responseReadAt && new Date(i.updatedAt || i.createdAt).getTime() > lastViewedAt).length ?? 0)
        : 0;
      const authorizationCount = authorizations.status === "fulfilled"
        ? (authorizations.value ?? []).filter((i) => i.status === "PENDING" && new Date(i.requestedAt).getTime() > lastViewedAt).length
        : 0;
      const responseCount = parentAuthorizations.status === "fulfilled"
        ? (parentAuthorizations.value?.authorizations.filter((a) => (a.status === "APPROVED" || a.status === "REJECTED") && new Date(a.decidedAt ?? a.requestedAt).getTime() > lastViewedAt).length ?? 0)
        : 0;

      setNotificationCount(announcementCount + summonCount + surveillantCount + authorizationCount + responseCount);
    }

    void loadBadges();
    const timer = setInterval(() => void loadBadges(), 10000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [role, staffFunction, lastViewedAt]);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.identity}>
          <View style={styles.logo}>
            <Ionicons name="school-outline" size={21} color="#FFFFFF" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.brand}>Correspondant</Text>
            <Text style={styles.greeting} numberOfLines={1}>Bonjour, {firstName}</Text>
            <Text style={styles.role} numberOfLines={1}>{roleLabels[role]}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={() => router.push("/(app)/announcements")} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Notifications">
            <Ionicons name="notifications-outline" size={21} color="#344054" />
            {notificationCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{notificationCount > 99 ? "99+" : notificationCount}</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable onPress={() => router.push("/(app)/profile")} style={styles.profileButton} accessibilityRole="button" accessibilityLabel="Profil">
            <Ionicons name="person-outline" size={19} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EAECF0",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  identity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
  },
  textContainer: { flex: 1, minWidth: 0 },
  brand: { fontSize: 17, fontWeight: "800", color: "#101828" },
  greeting: { marginTop: 2, fontSize: 13, fontWeight: "600", color: "#475467" },
  role: { marginTop: 1, fontSize: 11, color: "#98A2B3" },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F4F7",
    position: "relative",
  },
  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#101828",
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D92D20",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900" },
});
