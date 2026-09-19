import { useCallback, useEffect, useMemo, useState } from "react";
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
          placeholderTextColor="#9CA3AF"
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
              <View style={styles.categoryHeader}>
                <View>
                  <Text style={styles.categoryTitle}>
                    {CATEGORY_LABELS[categoryGroup.category]}
                  </Text>
                  <Text style={styles.categoryCount}>
                    {categoryStudentCount} élève(s) · {categoryGroup.levels.length} niveau(x)
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
              </View>

              <View style={styles.levelGrid}>
                {categoryGroup.levels.map((levelGroup) => (
                  <View key={levelGroup.level} style={styles.levelCard}>
                    <View style={styles.levelHeader}>
                      <Text style={styles.levelTitle}>{levelGroup.level}</Text>
                      <Text style={styles.levelCount}>
                        {levelGroup.classes.length} classe(s)
                      </Text>
                    </View>

                    <View style={styles.classGrid}>
                      {levelGroup.classes.map((classGroup) => (
                        <View key={classGroup.classId} style={styles.classCard}>
                          <View style={styles.classCardHeader}>
                            <View style={styles.classHeaderIdentity}>
                              <Text style={styles.classTitle}>
                                {classGroup.className}
                              </Text>
                              <Text style={styles.classCount}>
                                {classGroup.students.length} élève(s)
                              </Text>
                            </View>
                          </View>

                          <View style={styles.studentListHeader}>
                            <Text style={[styles.studentListHeaderText, styles.studentNumberCol]}>
                              N°
                            </Text>
                            <Text style={[styles.studentListHeaderText, styles.studentNameCol]}>
                              Élève
                            </Text>
                            <Text style={[styles.studentListHeaderText, styles.studentGenderCol]}>
                              S.
                            </Text>
                            <Text style={[styles.studentListHeaderText, styles.studentMatriculeCol]}>
                              Mat.
                            </Text>
                            <View style={styles.studentActionCol} />
                          </View>

                          {classGroup.students.map((student) => (
                            <View key={student.id} style={styles.studentRow}>
                              <View style={styles.studentNumberCol}>
                                <Text style={styles.positionText}>
                                  {student.classPosition ?? "—"}
                                </Text>
                              </View>

                              <View style={styles.studentNameCol}>
                                <Text
                                  style={styles.studentName}
                                  numberOfLines={1}
                                >
                                  {student.lastName} {student.firstName}
                                </Text>
                              </View>

                              <View style={styles.studentGenderCol}>
                                <Text style={styles.genderText}>
                                  {student.gender === "MALE"
                                    ? "G"
                                    : student.gender === "FEMALE"
                                      ? "F"
                                      : "—"}
                                </Text>
                              </View>

                              <View style={styles.studentMatriculeCol}>
                                <Text
                                  style={styles.studentNumber}
                                  numberOfLines={1}
                                >
                                  {student.studentNumber}
                                </Text>
                              </View>

                              <View style={styles.studentActionCol}>
                                <Pressable
                                  onPress={() =>
                                    router.push({
                                      pathname: "/(app)/students/[studentId]",
                                      params: { studentId: student.id },
                                    })
                                  }
                                  style={styles.editButton}
                                >
                                  <Text style={styles.editButtonText}>Modifier</Text>
                                </Pressable>
                              </View>
                            </View>
                          ))}
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: "800", color: "#111827" },
  subtitle: { marginTop: 3, fontSize: 12, color: "#6B7280" },
  controls: { paddingHorizontal: 14, paddingBottom: 8 },
  searchInput: {
    height: 44,
    borderWidth: 1,
    borderColor: "#D9DEE5",
    borderRadius: 12,
    paddingHorizontal: 13,
    backgroundColor: "#FFFFFF",
    color: "#111827",
    fontSize: 13,
  },
  filters: { gap: 8, paddingVertical: 10 },
  filter: {
    borderWidth: 1,
    borderColor: "#D9DEE5",
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 8,
    color: "#4B5563",
    backgroundColor: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  filterActive: {
    borderColor: "#111827",
    backgroundColor: "#111827",
    color: "#FFFFFF",
  },
  listContent: { paddingHorizontal: 14, paddingBottom: 28 },
  categorySection: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D9DEE5",
    backgroundColor: "#EEF2F7",
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingVertical: 6,
    marginBottom: 10,
  },
  categoryTitle: { fontSize: 19, fontWeight: "900", color: "#111827" },
  categoryCount: { marginTop: 3, fontSize: 11, color: "#6B7280" },
  categoryBadge: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 8,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
  },
  categoryBadgeText: { fontSize: 11, fontWeight: "900", color: "#FFFFFF" },
  levelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  levelCard: {
    width: "48.8%",
    marginBottom: 12,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D9DEE5",
    backgroundColor: "#FFFFFF",
  },
  levelHeader: {
    paddingHorizontal: 2,
    paddingBottom: 9,
    marginBottom: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  levelTitle: { fontSize: 15, fontWeight: "900", color: "#111827" },
  levelCount: { marginTop: 2, fontSize: 10, fontWeight: "700", color: "#6B7280" },
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
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    overflow: "hidden",
  },
  classCardHeader: {
    paddingHorizontal: 9,
    paddingVertical: 9,
    backgroundColor: "#111827",
  },
  classHeaderIdentity: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  classTitle: { flex: 1, fontSize: 13, fontWeight: "900", color: "#FFFFFF" },
  classCount: { fontSize: 9, fontWeight: "800", color: "#D1D5DB" },
  studentListHeader: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 27,
    paddingHorizontal: 7,
    backgroundColor: "#E2E8F0",
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E1",
  },
  studentListHeaderText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#64748B",
    textTransform: "uppercase",
  },
  studentNumberCol: { width: 38 },
  studentNameCol: { flex: 1, paddingRight: 4 },
  studentGenderCol: { width: 24, alignItems: "center" },
  studentMatriculeCol: { width: 58, alignItems: "flex-end" },
  studentActionCol: { width: 62, alignItems: "flex-end" },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 43,
    paddingHorizontal: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  positionText: { fontSize: 9, fontWeight: "900", color: "#111827" },
  studentName: { fontSize: 10, fontWeight: "700", color: "#111827" },
  genderText: { fontSize: 9, fontWeight: "900", color: "#374151" },
  studentNumber: {
    fontSize: 8,
    fontWeight: "600",
    color: "#64748B",
    maxWidth: 58,
  },
  editButton: {
    paddingHorizontal: 7,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: "#111827",
  },
  editButtonText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  errorBox: {
    marginHorizontal: 14,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
  },
  errorText: { color: "#991B1B", fontSize: 12, fontWeight: "600" },
  empty: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  stateText: { marginTop: 8, fontSize: 12, color: "#6B7280" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  footer: { paddingVertical: 18 },
});

