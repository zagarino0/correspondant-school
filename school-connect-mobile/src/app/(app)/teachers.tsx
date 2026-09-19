import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { getSchoolTeachers } from "../../services/teachers/teacher.service";
import type {
  SchoolTeacher,
  TeacherClassSummary,
} from "../../services/teachers/teacher.types";

type TeacherCategory =
  | "PRIMAIRE"
  | "PREMIER_CYCLE"
  | "SECOND_CYCLE"
  | "SECONDAIRE";

const CATEGORY_LABELS: Record<TeacherCategory, string> = {
  PRIMAIRE: "Primaire",
  PREMIER_CYCLE: "Secondaire — 1er cycle",
  SECOND_CYCLE: "Secondaire — 2e cycle",
  SECONDAIRE: "Secondaire",
};

const CATEGORY_ORDER: TeacherCategory[] = [
  "PRIMAIRE",
  "PREMIER_CYCLE",
  "SECOND_CYCLE",
  "SECONDAIRE",
];

function getTeacherCategory(level: string | null | undefined): TeacherCategory {
  const normalized = (level ?? "").trim().toLowerCase();

  if (
    normalized.includes("primaire") ||
    /^(cp|ce1|ce2|ce3|ce4|cm1|cm2)\b/.test(normalized)
  ) {
    return "PRIMAIRE";
  }

  if (
    normalized.includes("premier cycle") ||
    normalized.includes("collège") ||
    normalized.includes("college") ||
    /^(6e|5e|4e|3e)\b/.test(normalized)
  ) {
    return "PREMIER_CYCLE";
  }

  if (
    normalized.includes("second cycle") ||
    normalized.includes("lycée") ||
    normalized.includes("lycee") ||
    /^(2nde|seconde|1re|1ère|première|premiere|terminale)\b/.test(normalized)
  ) {
    return "SECOND_CYCLE";
  }

  return "SECONDAIRE";
}

function classMatchesSearch(
  schoolClass: TeacherClassSummary,
  search: string,
): boolean {
  return `${schoolClass.name} ${schoolClass.level ?? ""}`
    .toLowerCase()
    .includes(search);
}

export default function TeachersScreen() {
  const [teachers, setTeachers] = useState<SchoolTeacher[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTeachers = useCallback(async () => {
    try {
      setError(null);
      const response = await getSchoolTeachers();
      setTeachers(response.teachers);
    } catch {
      setError("Impossible de charger la liste des enseignants.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadTeachers();
  }, [loadTeachers]);

  const groupedCategories = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const categoryMap = new Map<TeacherCategory, SchoolTeacher[]>();

    for (const teacher of teachers) {
      const fullName = `${teacher.firstName} ${teacher.lastName} ${teacher.email}`.toLowerCase();

      if (
        normalizedSearch &&
        !fullName.includes(normalizedSearch) &&
        !teacher.classes.some((schoolClass) =>
          classMatchesSearch(schoolClass, normalizedSearch),
        )
      ) {
        continue;
      }

      for (const category of CATEGORY_ORDER) {
        const categoryClasses = teacher.classes.filter(
          (schoolClass) => getTeacherCategory(schoolClass.level) === category,
        );

        if (categoryClasses.length === 0) continue;

        const visibleClasses = normalizedSearch
          ? categoryClasses.filter(
              (schoolClass) =>
                fullName.includes(normalizedSearch) ||
                classMatchesSearch(schoolClass, normalizedSearch),
            )
          : categoryClasses;

        if (visibleClasses.length === 0) continue;

        if (!categoryMap.has(category)) {
          categoryMap.set(category, []);
        }

        categoryMap.get(category)!.push({
          ...teacher,
          classes: visibleClasses,
        });
      }
    }

    return CATEGORY_ORDER.filter((category) => categoryMap.has(category)).map(
      (category) => ({
        category,
        teachers: categoryMap.get(category)!.sort((a, b) =>
          `${a.lastName} ${a.firstName}`.localeCompare(
            `${b.lastName} ${b.firstName}`,
          ),
        ),
      }),
    );
  }, [search, teachers]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={styles.muted}>Chargement des enseignants...</Text>
      </View>
    );
  }

  if (error && teachers.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Liste indisponible</Text>
        <Text style={styles.muted}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>ADMINISTRATION</Text>
        <Text style={styles.title}>Enseignants</Text>
        <Text style={styles.subtitle}>
          Enseignants classés par catégorie puis par classe.
        </Text>
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Rechercher un enseignant ou une classe"
        placeholderTextColor="#9CA3AF"
        style={styles.searchInput}
        autoCapitalize="none"
      />

      <FlatList
        data={groupedCategories}
        keyExtractor={(item) => item.category}
        contentContainerStyle={
          groupedCategories.length === 0
            ? styles.emptyContent
            : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadTeachers();
            }}
            tintColor="#111827"
          />
        }
        renderItem={({ item }) => (
          <View style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <View>
                <Text style={styles.categoryTitle}>
                  {CATEGORY_LABELS[item.category]}
                </Text>
                <Text style={styles.categoryCount}>
                  {item.teachers.length} enseignant
                  {item.teachers.length > 1 ? "s" : ""}
                </Text>
              </View>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>
                  {item.teachers.length}
                </Text>
              </View>
            </View>

            {item.teachers.map((teacher) => (
              <View key={teacher.id} style={styles.teacherCard}>
                <View style={styles.teacherHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {`${teacher.firstName[0] ?? ""}${teacher.lastName[0] ?? ""}`.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.identity}>
                    <Text style={styles.teacherName}>
                      {teacher.firstName} {teacher.lastName}
                    </Text>
                    <Text style={styles.email}>{teacher.email}</Text>
                  </View>
                </View>

                <View style={styles.classList}>
                  {teacher.classes.map((schoolClass) => (
                    <View key={schoolClass.id} style={styles.classChip}>
                      <Text style={styles.className}>{schoolClass.name}</Text>
                      <Text style={styles.classLevel}>
                        {schoolClass.level ?? "Niveau non renseigné"}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Aucun enseignant trouvé</Text>
            <Text style={styles.muted}>Modifiez votre recherche.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
  },
  header: {
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "#6B7280",
  },
  title: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: "#6B7280",
  },
  searchInput: {
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    fontSize: 14,
    color: "#111827",
    marginBottom: 14,
  },
  listContent: {
    paddingBottom: 28,
    gap: 12,
  },
  emptyContent: {
    flexGrow: 1,
  },
  categorySection: {
    gap: 10,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  categoryCount: {
    marginTop: 3,
    fontSize: 12,
    color: "#6B7280",
  },
  categoryBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
  },
  categoryBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  teacherCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  teacherHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#374151",
  },
  identity: {
    flex: 1,
    marginLeft: 11,
  },
  teacherName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  email: {
    marginTop: 3,
    fontSize: 12,
    color: "#6B7280",
  },
  classList: {
    marginTop: 12,
    gap: 8,
  },
  classChip: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  className: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  classLevel: {
    marginTop: 2,
    fontSize: 11,
    color: "#6B7280",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  muted: {
    fontSize: 13,
    lineHeight: 20,
    color: "#6B7280",
    textAlign: "center",
  },
});
