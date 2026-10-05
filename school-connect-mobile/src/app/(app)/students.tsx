import { useCallback, useMemo, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { getStudents } from "../../services/students/student.service";
import type {
  StudentListItem,
  StudentStatus,
} from "../../services/students/student.types";
import { useAuthStore } from "../../stores/authStore";
import { colors } from "../../theme";

type StudentCategory =
  | "PRIMAIRE"
  | "PREMIER_CYCLE"
  | "SECOND_CYCLE"
  | "SECONDAIRE";

const CATEGORY_LABELS: Record<StudentCategory, string> = {
  PRIMAIRE: "Primaire",
  PREMIER_CYCLE: "Secondaire — 1er cycle",
  SECOND_CYCLE: "Secondaire — 2e cycle",
  SECONDAIRE: "Secondaire",
};

const CATEGORY_ORDER: StudentCategory[] = [
  "PRIMAIRE",
  "PREMIER_CYCLE",
  "SECOND_CYCLE",
  "SECONDAIRE",
];

function getStudentCategory(level: string | null | undefined): StudentCategory {
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

const STATUS_FILTERS: Array<{ label: string; value?: StudentStatus }> = [
  { label: "Tous" },
  { label: "Actifs", value: "ACTIVE" },
  { label: "Inactifs", value: "INACTIVE" },
  { label: "Suspendus", value: "SUSPENDED" },
];

export default function StudentsScreen() {
  const user = useAuthStore((state) => state.user);
  const isSurveillant = user?.role === "STAFF" && user.staffFunction === "SURVEILLANT";
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StudentStatus | undefined>();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] =
    useState<StudentCategory | null>(null);
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(
    () => new Set(),
  );
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(
    () => new Set(),
  );

  const toggleCategory = (category: StudentCategory) => {
    setExpandedCategory((current) => {
      const next = current === category ? null : category;

      setExpandedLevels(new Set());
      setExpandedClasses(new Set());

      return next;
    });
  };

  const toggleLevel = (levelKey: string) => {
    setExpandedLevels((current) => {
      const next = new Set(current);

      if (next.has(levelKey)) {
        next.delete(levelKey);
      } else {
        next.add(levelKey);
      }

      setExpandedClasses(new Set());
      return next;
    });
  };

  const toggleClass = (classKey: string) => {
    setExpandedClasses((current) => {
      const next = new Set(current);

      if (next.has(classKey)) {
        next.delete(classKey);
      } else {
        next.add(classKey);
      }

      return next;
    });
  };

  const loadStudents = useCallback(
    async (targetPage: number, replace: boolean) => {
      try {
        if (replace) setLoading(true);
        else setLoadingMore(true);

        setError(null);

        const response = await getStudents({
          search: search.trim() || undefined,
          status,
          page: targetPage,
          pageSize: 25,
        });

        setStudents((current) =>
          replace ? response.students : [...current, ...response.students],
        );
        setPage(response.pagination.page);
        setTotal(response.pagination.total);
        setTotalPages(response.pagination.totalPages);
      } catch {
        setError("Impossible de charger la liste des élèves.");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [search, status],
  );

  useFocusEffect(
    useCallback(() => {
      const timeout = setTimeout(() => {
        void loadStudents(1, true);
      }, 300);

      return () => clearTimeout(timeout);
    }, [loadStudents]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    void loadStudents(1, true);
  };

  const handleLoadMore = () => {
    if (loading || loadingMore || page >= totalPages) return;
    void loadStudents(page + 1, false);
  };

  const groupedCategories = useMemo(() => {
    type ClassGroup = {
      classId: string;
      className: string;
      students: StudentListItem[];
    };

    type LevelGroup = {
      level: string;
      classes: ClassGroup[];
    };

    const categoryMap = new Map<StudentCategory, Map<string, Map<string, ClassGroup>>>();

    for (const student of students) {
      const enrollment = student.enrollments[0];
      const category = getStudentCategory(enrollment?.class.level);
      const level = enrollment?.class.level?.trim() || "Niveau non renseigné";
      const classId = enrollment?.class.id ?? "no-class";
      const className = enrollment?.class.name ?? "Sans classe";

      if (!categoryMap.has(category)) {
        categoryMap.set(category, new Map());
      }

      const levels = categoryMap.get(category)!;

      if (!levels.has(level)) {
        levels.set(level, new Map());
      }

      const classes = levels.get(level)!;

      if (!classes.has(classId)) {
        classes.set(classId, {
          classId,
          className,
          students: [],
        });
      }

      classes.get(classId)!.students.push(student);
    }

    return CATEGORY_ORDER.filter((category) => categoryMap.has(category)).map(
      (category) => {
        const levels = categoryMap.get(category)!;

        return {
          category,
          levels: Array.from(levels.entries())
            .sort(([a], [b]) => a.localeCompare(b, "fr", { numeric: true }))
            .map(([level, classes]) => ({
              level,
              classes: Array.from(classes.values()).sort((a, b) =>
                a.className.localeCompare(b.className, "fr", { numeric: true }),
              ),
            })),
        };
      },
    );
  }, [students]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Élèves</Text>
        <Text style={styles.subtitle}>{total} élève(s)</Text>
      </View>

      <View style={styles.controls}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un élève, matricule…"
          placeholderTextColor="colors.textMuted"
          style={styles.searchInput}
        />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(item) => item.label}
          contentContainerStyle={styles.filters}
          renderItem={({ item }) => (
            <Text
              onPress={() => setStatus(item.value)}
              style={[
                styles.filter,
                status === item.value && styles.filterActive,
              ]}
            >
              {item.label}
            </Text>
          )}
        />
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={groupedCategories}
        keyExtractor={(item) => item.category}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Aucun élève</Text>
            <Text style={styles.stateText}>
              Aucun résultat ne correspond aux filtres.
            </Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator />
            </View>
          ) : null
        }
        renderItem={({ item: categoryGroup }) => {
          const categoryStudentCount = categoryGroup.levels.reduce(
            (sum, level) =>
              sum +
              level.classes.reduce(
                (classSum, classGroup) => classSum + classGroup.students.length,
                0,
              ),
            0,
          );

          return (
            <View style={styles.categorySection}>
              <Pressable
                onPress={() => toggleCategory(categoryGroup.category)}
                style={styles.categoryHeader}
              >
                <View style={styles.categoryHeaderIdentity}>
                  <View style={styles.categoryHeaderText}>
                    <Text style={styles.categoryTitle}>
                      {CATEGORY_LABELS[categoryGroup.category]}
                    </Text>
                    <Text style={styles.categoryCount}>
                      {categoryStudentCount} élève(s) · {categoryGroup.levels.length} niveau(x)
                    </Text>
                  </View>
                  <Text style={styles.expandIcon}>
                    {expandedCategory === categoryGroup.category ? "▼" : "▶"}
                  </Text>
                </View>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>
                    {categoryGroup.levels.reduce(
                      (sum, level) => sum + level.classes.length,
                      0,
                    )}
                  </Text>
                </View>
              </Pressable>

              {expandedCategory === categoryGroup.category ? (
                <View style={styles.levelGrid}>
                  {categoryGroup.levels.map((levelGroup) => {
                    const levelKey =
                      categoryGroup.category + "::" + levelGroup.level;
                    const isLevelExpanded = expandedLevels.has(levelKey);

                    return (
                      <View key={levelGroup.level} style={styles.levelCard}>
                        <Pressable
                          onPress={() => toggleLevel(levelKey)}
                          style={styles.levelHeader}
                        >
                          <View style={styles.levelHeaderText}>
                            <Text style={styles.levelTitle}>{levelGroup.level}</Text>
                            <Text style={styles.levelCount}>
                              {levelGroup.classes.length} classe(s)
                            </Text>
                          </View>
                          <Text style={styles.expandIcon}>
                            {isLevelExpanded ? "▼" : "▶"}
                          </Text>
                        </Pressable>

                        {isLevelExpanded ? (
                          <View style={styles.classGrid}>
                            {levelGroup.classes.map((classGroup) => {
                              const classKey =
                                categoryGroup.category +
                                "::" +
                                levelGroup.level +
                                "::" +
                                classGroup.classId;
                              const isClassExpanded =
                                expandedClasses.has(classKey);

                              return (
                                <View
                                  key={classGroup.classId}
                                  style={styles.classCard}
                                >
                                  <Pressable
                                    onPress={() => toggleClass(classKey)}
                                    style={styles.classCardHeader}
                                  >
                                    <View style={styles.classHeaderIdentity}>
                                      <Text style={styles.classTitle}>
                                        {classGroup.className}
                                      </Text>
                                      <Text style={styles.classCount}>
                                        {classGroup.students.length} élève(s)
                                      </Text>
                                    </View>
                                    <Text style={styles.classExpandIcon}>
                                      {isClassExpanded ? "▼" : "▶"}
                                    </Text>
                                  </Pressable>

                                  {isClassExpanded ? (
                                    <>
                                      <View style={styles.studentCards}>
                                        {classGroup.students.map((student) => (
                                          <View key={student.id} style={styles.studentCard}>
                                            <View style={styles.studentCardTop}>
                                              <View style={styles.studentIdentity}>
                                                <View style={styles.studentPositionBadge}>
                                                  <Text style={styles.studentPositionBadgeText}>
                                                    {student.classPosition ?? "—"}
                                                  </Text>
                                                </View>
                                                <View style={styles.studentIdentityText}>
                                                  <Text style={styles.studentName} numberOfLines={2}>
                                                    {student.lastName} {student.firstName}
                                                  </Text>
                                                  <Text style={styles.studentMeta}>
                                                    {student.gender === "MALE" ? "Garçon" : student.gender === "FEMALE" ? "Fille" : "Sexe non renseigné"}
                                                  </Text>
                                                </View>
                                              </View>
                                              <Pressable
                                                onPress={() => router.push({
                                                  pathname: isSurveillant ? "/(app)/surveillant/students/[studentId]" : "/(app)/students/[studentId]",
                                                  params: { studentId: student.id },
                                                })}
                                                style={styles.editButton}
                                              >
                                                <Text style={styles.editButtonText}>{isSurveillant ? "Voir fiche" : "Modifier"}</Text>
                                              </Pressable>
                                            </View>
                                            <View style={styles.studentCardBottom}>
                                              <View style={styles.studentInfoItem}>
                                                <Text style={styles.studentInfoLabel}>Matricule</Text>
                                                <Text style={styles.studentInfoValue} numberOfLines={1}>{student.studentNumber}</Text>
                                              </View>
                                              <View style={styles.studentInfoItem}>
                                                <Text style={styles.studentInfoLabel}>Position</Text>
                                                <Text style={styles.studentInfoValue}>{student.classPosition ?? "—"}</Text>
                                              </View>
                                            </View>
                                          </View>
                                        ))}
                                      </View>
                                    </> ) : null}
                                </View>
                              );
                            })}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "colors.background" },
  header: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: "800", color: "colors.primary" },
  subtitle: { marginTop: 3, fontSize: 12, color: "colors.textSecondary" },
  controls: { paddingHorizontal: 14, paddingBottom: 8 },
  searchInput: {
    height: 44,
    borderWidth: 1,
    borderColor: "colors.border",
    borderRadius: 12,
    paddingHorizontal: 13,
    backgroundColor: "colors.surface",
    color: "colors.primary",
    fontSize: 13,
  },
  filters: { gap: 8, paddingVertical: 10 },
  filter: {
    borderWidth: 1,
    borderColor: "colors.border",
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 8,
    color: "colors.textSecondary",
    backgroundColor: "colors.surface",
    fontSize: 12,
    fontWeight: "700",
  },
  filterActive: {
    borderColor: "colors.primary",
    backgroundColor: "colors.primary",
    color: "colors.surface",
  },
  listContent: { paddingHorizontal: 14, paddingBottom: 28 },
  categorySection: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "colors.border",
    backgroundColor: "colors.surfaceMuted",
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  categoryHeaderIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryHeaderText: { flex: 1 },
  categoryTitle: { fontSize: 19, fontWeight: "900", color: "colors.primary" },
  expandIcon: {
    fontSize: 11,
    fontWeight: "900",
    color: "colors.primary",
  },
  categoryCount: { marginTop: 3, fontSize: 11, color: "colors.textSecondary" },
  categoryBadge: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 8,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "colors.primary",
  },
  categoryBadgeText: { fontSize: 11, fontWeight: "900", color: "colors.surface" },
  levelGrid: {
    flexDirection: "column",
  },
  levelCard: {
    width: "100%",
    marginBottom: 12,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "colors.border",
    backgroundColor: "colors.surface",
  },
  levelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  levelHeaderText: { flex: 1 },
  levelTitle: { fontSize: 15, fontWeight: "900", color: "colors.primary" },
  levelCount: { marginTop: 2, fontSize: 10, fontWeight: "700", color: "colors.textSecondary" },
  classGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  classCard: {
    width: "100%",
    marginBottom: 9,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "colors.border",
    backgroundColor: "colors.background",
    overflow: "hidden",
  },
  classCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 9,
    paddingVertical: 9,
    backgroundColor: "colors.primary",
  },
  classHeaderIdentity: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  classTitle: { flex: 1, fontSize: 13, fontWeight: "900", color: "colors.surface" },
  classCount: { fontSize: 9, fontWeight: "800", color: "colors.border" },
  classExpandIcon: {
    marginLeft: 6,
    fontSize: 10,
    fontWeight: "900",
    color: "colors.surface",
  },
  studentCards: { padding: 9, gap: 8 },
  studentCard: {
    padding: 11,
    borderRadius: 13,
    backgroundColor: "colors.surface",
    borderWidth: 1,
    borderColor: "colors.border",
  },
  studentCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  studentIdentity: { flex: 1, flexDirection: "row", alignItems: "center", gap: 9 },
  studentPositionBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "colors.surfaceMuted",
  },
  studentPositionBadgeText: { fontSize: 10, fontWeight: "900", color: "colors.primary" },
  studentIdentityText: { flex: 1, minWidth: 0 },
  studentName: { fontSize: 13, fontWeight: "800", color: "colors.primary" },
  studentMeta: { marginTop: 3, fontSize: 10, color: "colors.textSecondary" },
  studentCardBottom: {
    flexDirection: "row",
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: "colors.border",
    gap: 18,
  },
  studentInfoItem: { flex: 1, minWidth: 0 },
  studentInfoLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: "colors.textMuted",
    textTransform: "uppercase",
  },
  studentInfoValue: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "700",
    color: "colors.textSecondary",
  },
  editButton: {
    paddingHorizontal: 7,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: "colors.primary",
  },
  editButtonText: {
    fontSize: 8,
    fontWeight: "900",
    color: "colors.surface",
  },
  errorBox: {
    marginHorizontal: 14,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "colors.dangerSoft",
  },
  errorText: { color: "colors.danger", fontSize: 12, fontWeight: "600" },
  empty: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "colors.primary",
    marginBottom: 4,
  },
  stateText: { marginTop: 8, fontSize: 12, color: "colors.textSecondary" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "colors.background",
  },
  footer: { paddingVertical: 18 },
});

