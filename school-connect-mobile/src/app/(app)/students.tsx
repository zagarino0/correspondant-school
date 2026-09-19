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
    const categoryMap = new Map<
      StudentCategory,
      Array<{
        classId: string;
        className: string;
        level: string | null;
        students: StudentListItem[];
      }>
    >();

    for (const student of students) {
      const enrollment = student.enrollments[0];
      const category = getStudentCategory(enrollment?.class.level);
      const classId = enrollment?.class.id ?? "no-class";
      const className = enrollment?.class.name ?? "Sans classe";
      const level = enrollment?.class.level ?? null;

      if (!categoryMap.has(category)) categoryMap.set(category, []);

      const classes = categoryMap.get(category)!;
      let classGroup = classes.find((item) => item.classId === classId);

      if (!classGroup) {
        classGroup = { classId, className, level, students: [] };
        classes.push(classGroup);
      }

      classGroup.students.push(student);
    }

    return CATEGORY_ORDER.filter((category) => categoryMap.has(category)).map(
      (category) => ({
        category,
        classes: categoryMap
          .get(category)!
          .sort((a, b) => a.className.localeCompare(b.className)),
      }),
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
        renderItem={({ item: categoryGroup }) => (
          <View style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <View>
                <Text style={styles.categoryTitle}>
                  {CATEGORY_LABELS[categoryGroup.category]}
                </Text>
                <Text style={styles.categoryCount}>
                  {categoryGroup.classes.reduce(
                    (sum, group) => sum + group.students.length,
                    0,
                  )}{" "}
                  élève(s)
                </Text>
              </View>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>
                  {categoryGroup.classes.length}
                </Text>
              </View>
            </View>

            {categoryGroup.classes.map((classGroup) => (
              <View key={classGroup.classId} style={styles.classColumn}>
                <View style={styles.classColumnHeader}>
                  <View style={styles.classHeaderIdentity}>
                    <Text style={styles.classTitle}>
                      {classGroup.className}
                    </Text>
                    <Text style={styles.classLevel}>
                      {classGroup.level ?? "Niveau non renseigné"}
                    </Text>
                  </View>
                  <Text style={styles.classCount}>
                    {classGroup.students.length} élève(s)
                  </Text>
                </View>

                <View style={styles.columnHeadings}>
                  <Text style={[styles.headingText, styles.positionColumn]}>
                    N°
                  </Text>
                  <Text style={styles.headingText}>Nom et prénom</Text>
                  <Text style={[styles.headingText, styles.genderColumn]}>
                    Sexe
                  </Text>
                  <Text style={[styles.headingText, styles.matriculeColumn]}>
                    Matricule
                  </Text>
                  <Text style={[styles.headingText, styles.actionColumn]}>
                    Action
                  </Text>
                </View>

                {classGroup.students.map((student) => (
                  <View key={student.id} style={styles.studentRow}>
                    <View style={styles.positionCell}>
                      <Text style={styles.positionText}>
                        {student.classPosition ?? "—"}
                      </Text>
                    </View>
                    <View style={styles.identity}>
                      <Text style={styles.studentName}>
                        {student.lastName} {student.firstName}
                      </Text>
                    </View>
                    <View style={styles.genderCell}>
                      <Text style={styles.genderText}>
                        {student.gender === "MALE"
                          ? "G"
                          : student.gender === "FEMALE"
                            ? "F"
                            : "—"}
                      </Text>
                    </View>
                    <View style={styles.matriculeCell}>
                      <Text style={styles.studentNumber}>
                        {student.studentNumber}
                      </Text>
                    </View>
                    <View style={styles.actionCell}>
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
        )}
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
  categorySection: { marginBottom: 14 },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  categoryTitle: { fontSize: 17, fontWeight: "800", color: "#111827" },
  categoryCount: { marginTop: 2, fontSize: 11, color: "#6B7280" },
  categoryBadge: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
  },
  categoryBadgeText: { fontSize: 11, fontWeight: "800", color: "#374151" },
  classColumn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D9DEE5",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    marginBottom: 10,
  },
  classColumnHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: "#111827",
  },
  classHeaderIdentity: { flex: 1 },
  classTitle: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
  classLevel: { marginTop: 3, fontSize: 11, color: "#D1D5DB" },
  classCount: { fontSize: 11, fontWeight: "700", color: "#E5E7EB" },
  columnHeadings: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#F1F5F9",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headingText: {
    flex: 1,
    fontSize: 10,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
  },
  positionColumn: { flex: 0.75 },
  genderColumn: { flex: 0.55, textAlign: "center" },
  matriculeColumn: { flex: 1.15, textAlign: "right" },
  actionColumn: { flex: 0.9, textAlign: "right" },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  positionCell: { flex: 0.75 },
  positionText: { fontSize: 12, fontWeight: "800", color: "#111827" },
  identity: { flex: 1, paddingRight: 8 },
  studentName: { fontSize: 13, fontWeight: "700", color: "#111827" },
  genderCell: { flex: 0.55, alignItems: "center" },
  genderText: { fontSize: 12, fontWeight: "800", color: "#374151" },
  matriculeCell: { flex: 1.15, alignItems: "flex-end" },
  actionCell: { flex: 0.9, alignItems: "flex-end" },
  editButton: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#111827",
  },
  editButtonText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  studentNumber: { fontSize: 11, fontWeight: "600", color: "#6B7280" },
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
