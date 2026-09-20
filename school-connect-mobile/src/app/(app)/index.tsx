import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";

import { DashboardHeader } from "../../features/dashboard/components/DashboardHeader";
import { ParentDashboard } from "../../features/dashboard/dashboards/ParentDashboard";
import { SchoolAdminDashboard } from "../../features/dashboard/dashboards/SchoolAdminDashboard";
import { StaffDashboard } from "../../features/dashboard/dashboards/StaffDashboard";
import { NurseDashboard } from "../../features/dashboard/dashboards/NurseDashboard";
import { StudentDashboard } from "../../features/dashboard/dashboards/StudentDashboard";
import { SuperAdminDashboard } from "../../features/dashboard/dashboards/SuperAdminDashboard";
import { TeacherDashboard } from "../../features/dashboard/dashboards/TeacherDashboard";
import { useAuthStore } from "../../stores/authStore";
import { getUnreadMessageCount } from "../../services/messages/message.service";

export default function AppHomeScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    let mounted = true;
    void getUnreadMessageCount().then((count) => {
      if (mounted) setUnreadMessages(count);
    }).catch(() => {
      if (mounted) setUnreadMessages(0);
    });
    return () => { mounted = false; };
  }, []);

  const renderDashboard = () => {
    if (!user) return null;

    switch (user.role) {
      case "STUDENT": return <StudentDashboard firstName={user.firstName} />;
      case "PARENT": return <ParentDashboard firstName={user.firstName} />;
      case "TEACHER": return <TeacherDashboard firstName={user.firstName} />;
      case "STAFF":
        return user.staffProfile?.function === "INFIRMIER"
          ? <NurseDashboard firstName={user.firstName} />
          : <StaffDashboard firstName={user.firstName} />;
      case "SCHOOL_ADMIN": return <SchoolAdminDashboard firstName={user.firstName} />;
      case "SUPER_ADMIN": return <SuperAdminDashboard firstName={user.firstName} />;
      default: return null;
    }
  };

  return (
    <View style={styles.container}>
      <DashboardHeader
        firstName={user?.firstName ?? ""}
        role={user?.role ?? "STUDENT"}
      />

      {renderDashboard()}

      <View style={styles.bottomNavigation}>
        <Pressable style={[styles.navItem, styles.navItemActive]} accessibilityRole="button" accessibilityLabel="Accueil">
          <Ionicons name="home-outline" size={21} color="#344976" />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Accueil</Text>
        </Pressable>

        <Pressable
          style={styles.navItem}
          onPress={() => router.push("/(app)/messages")}
          accessibilityRole="button"
          accessibilityLabel="Messages"
        >
          <View style={styles.navIconWrap}>
            <Ionicons name="mail-outline" size={21} color="#475569" />
            {unreadMessages > 0 ? <View style={styles.messageBadge}><Text style={styles.messageBadgeText}>{unreadMessages > 99 ? "99+" : unreadMessages}</Text></View> : null}
          </View>
          <Text style={styles.navLabel}>Messages</Text>
        </Pressable>

        <Pressable
          style={styles.navItem}
          onPress={() => router.push("/(app)/assistant")}
          accessibilityRole="button"
          accessibilityLabel="Assistant"
        >
          <Ionicons name="sparkles-outline" size={21} color="#475569" />
          <Text style={styles.navLabel}>Assistant</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  bottomNavigation: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    gap: 2,
  },
  navItemActive: {
    backgroundColor: "#EEF2F7",
  },
  navIconWrap: { position: "relative" },
  messageBadge: {
    position: "absolute",
    top: -7,
    right: -10,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 3,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DC2626",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  messageBadgeText: { color: "#FFFFFF", fontSize: 8, fontWeight: "900" },
  navIcon: {
    fontSize: 21,
    color: "#475569",
  },
  navIconActive: {
    color: "#344976",
  },
  navLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
  },
  navLabelActive: {
    color: "#344976",
  },
});