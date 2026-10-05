import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { colors } from "../../theme";

import { DashboardHeader } from "../../features/dashboard/components/DashboardHeader";
import { ParentDashboard } from "../../features/dashboard/dashboards/ParentDashboard";
import { SchoolAdminDashboard } from "../../features/dashboard/dashboards/SchoolAdminDashboard";
import { SecretaryDashboard } from "../../features/dashboard/dashboards/SecretaryDashboard";
import { StaffDashboard } from "../../features/dashboard/dashboards/StaffDashboard";
import { SurveillantDashboard } from "../../features/dashboard/dashboards/SurveillantDashboard";
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
        if (user.staffFunction === "SURVEILLANT") return <SurveillantDashboard firstName={user.firstName} />;
        if (user.staffFunction === "SECRETARIAT") return <SecretaryDashboard firstName={user.firstName} />;
        return <StaffDashboard firstName={user.firstName} staffFunction={user.staffFunction} />;
      case "SCHOOL_ADMIN": return <SchoolAdminDashboard firstName={user.firstName} />;
      case "SUPER_ADMIN": return <SuperAdminDashboard firstName={user.firstName} />;
      default: return null;
    }
  };

  return (
    <View style={styles.container}>
      <DashboardHeader firstName={user?.firstName ?? ""} role={user?.role ?? "STUDENT"} staffFunction={user?.staffFunction ?? null} />
      {renderDashboard()}

      <View style={styles.bottomNavigation}>
        <Pressable style={[styles.navItem, styles.navItemActive]} accessibilityRole="button" accessibilityLabel="Accueil">
          <Ionicons name="home" size={20} color="colors.primary" />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Accueil</Text>
        </Pressable>

        <Pressable style={styles.navItem} onPress={() => router.push("/(app)/messages")} accessibilityRole="button" accessibilityLabel="Messages">
          <View style={styles.navIconWrap}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="colors.textSecondary" />
            {unreadMessages > 0 ? <View style={styles.messageBadge}><Text style={styles.messageBadgeText}>{unreadMessages > 99 ? "99+" : unreadMessages}</Text></View> : null}
          </View>
          <Text style={styles.navLabel}>Messages</Text>
        </Pressable>

        <Pressable style={styles.navItem} onPress={() => router.push("/(app)/assistant")} accessibilityRole="button" accessibilityLabel="Assistant">
          <Ionicons name="sparkles-outline" size={20} color="colors.textSecondary" />
          <Text style={styles.navLabel}>Assistant IA</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "colors.background" },
  bottomNavigation: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    height: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    borderRadius: 24,
    backgroundColor: "colors.surface",
    borderWidth: 1,
    borderColor: "colors.border",
    shadowColor: "colors.text",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 18,
    elevation: 7,
  },
  navItem: {
    flex: 1,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    gap: 3,
  },
  navItemActive: { backgroundColor: "colors.primarySoft" },
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
    backgroundColor: "colors.danger",
    borderWidth: 2,
    borderColor: "colors.surface",
  },
  messageBadgeText: { color: "colors.surface", fontSize: 8, fontWeight: "900" },
  navLabel: { fontSize: 10, fontWeight: "700", color: "colors.textSecondary" },
  navLabelActive: { color: "colors.primary" },
});
