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
import { colors, radius, spacing } from "../../../theme";

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
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const [pendingSummons, setPendingSummons] = useState(0);
  const [surveillantNotifications, setSurveillantNotifications] = useState(0);
  const [pendingAuthorizations, setPendingAuthorizations] = useState(0);
  const [authorizationResponses, setAuthorizationResponses] = useState(0);
  const lastViewedAt = useNotificationCenterStore((state) => state.lastViewedAt);

  useEffect(() => {
    let mounted = true;

    async function loadBadges() {
      const [announcementResult, summonsResult, surveillantResult, authorizationResult, parentAuthorizationResult] =
        await Promise.allSettled([
          getMyAnnouncements(),
          role === "PARENT" ? getMySummons() : Promise.resolve(null),
          role === "STAFF" && staffFunction === "SURVEILLANT"
            ? getSummonsNotifications()
            : Promise.resolve(null),
          role === "STAFF" && staffFunction === "SURVEILLANT"
            ? getSchoolLifeAuthorizations()
            : Promise.resolve(null),
          role === "PARENT" ? getMyAuthorizations() : Promise.resolve(null),
        ]);

      if (!mounted) return;

      setUnreadAnnouncements(
        announcementResult.status === "fulfilled"
          ? announcementResult.value.announcements.filter(
              (announcement) =>
                !announcement.isRead &&
                new Date(announcement.createdAt).getTime() > lastViewedAt,
            ).length
          : 0,
      );

      setPendingSummons(
        role === "PARENT" && summonsResult.status === "fulfilled"
          ? (summonsResult.value?.summons.filter(
              (summon) =>
                summon.status === "PENDING" &&
                new Date(summon.createdAt).getTime() > lastViewedAt,
            ).length ?? 0)
          : 0,
      );

      setSurveillantNotifications(
        role === "STAFF" && surveillantResult.status === "fulfilled"
          ? surveillantResult.value?.items.filter(
              (item) =>
                !item.responseReadAt &&
                new Date(item.updatedAt || item.createdAt).getTime() > lastViewedAt,
            ).length ?? 0
          : 0,
      );

      setAuthorizationResponses(
        role === "PARENT" && parentAuthorizationResult.status === "fulfilled"
          ? (parentAuthorizationResult.value?.authorizations.filter(
              (authorization) =>
                (authorization.status === "APPROVED" || authorization.status === "REJECTED") &&
                new Date(authorization.decidedAt ?? authorization.requestedAt).getTime() > lastViewedAt,
            ).length ?? 0)
          : 0,
      );

      setPendingAuthorizations(
        role === "STAFF" &&
        staffFunction === "SURVEILLANT" &&
        authorizationResult.status === "fulfilled"
          ? (authorizationResult.value ?? []).filter(
              (item) =>
                item.status === "PENDING" &&
                new Date(item.requestedAt).getTime() > lastViewedAt,
            ).length
          : 0,
      );
    }

    void loadBadges();

    if (
      role !== "PARENT" &&
      !(role === "STAFF" && staffFunction === "SURVEILLANT")
    ) {
      return () => {
        mounted = false;
      };
    }

    const connection = createRealtimeConnection({
      onEvent: (event) => {
        if (
          event.type === "parent:summons:new" ||
          event.type === "parent:summons:updated" ||
          event.type === "parent:authorization:new" ||
          event.type === "parent:authorization:updated"
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
  }, [role, staffFunction, lastViewedAt]);

  const badgeCount =
    unreadAnnouncements +
    pendingSummons +
    surveillantNotifications +
    pendingAuthorizations +
    authorizationResponses;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.identity}>
          <View style={styles.logo}>
            <Ionicons name="school-outline" size={20} color={colors.primaryForeground} />
          </View>
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
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => router.push("/(app)/announcements")}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={21} color={colors.textSecondary} />
            {badgeCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badgeCount > 99 ? "99+" : badgeCount}</Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => router.push("/(app)/profile")}
            style={styles.profileButton}
            accessibilityRole="button"
            accessibilityLabel="Profil"
          >
            <Ionicons name="person-outline" size={19} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  identity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  brand: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    color: colors.text,
  },
  greeting: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  role: {
    marginTop: 1,
    fontSize: 10,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    position: "relative",
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryDark,
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  badgeText: {
    color: colors.primaryForeground,
    fontSize: 9,
    fontWeight: "900",
  },
});
