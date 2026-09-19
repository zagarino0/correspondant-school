import { ScrollView, StyleSheet, Text } from "react-native";

import { DashboardSection } from "../components/DashboardSection";
import type { DashboardSectionData } from "../dashboard.types";

type RoleDashboardProps = {
  firstName: string;
  title: string;
  subtitle: string;
  sections: DashboardSectionData[];
};

export function RoleDashboard({
  firstName,
  title,
  subtitle,
  sections,
}: RoleDashboardProps) {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>
        Bonjour {firstName}, {subtitle}
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
    lineHeight: 21,
    color: "#6B7280",
  },
});
