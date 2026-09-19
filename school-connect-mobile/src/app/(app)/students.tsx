import { useCallback, useEffect, useMemo, useState } from "react";
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

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadStudents(1, true);
    }, 300);

    return () => clearTimeout(timeout);
  }, [loadStudents]);

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
      Map<
        string,
        {
          className: string;
          level: string | null;
          students: StudentListItem[];
        }
      >
    >();

    for (const student of students) {
      const enrollment = student.enrollments[0];
      const category = getStudentCategory(enrollment?.class.level);
      const classId = enrollment?.class.id ?? "no-class";
      const className = enrollment?.class.name ?? "Sans classe";
      const level = enrollment?.class.level ?? null;

      if (!categoryMap.has(category)) {
        categoryMap.set(category, new Map());
      }

      const classMap = categoryMap.get(category)!;

      if (!classMap.has(classId)) {
        classMap.set(classId, { className, level, students: [] });
      }

      classMap.get(classId)!.students.push(student);
    }

    return CATEGORY_ORDER.filter((category) => categoryMap.has(category)).map(
      (category) => ({
        category,
        classes: Array.from(categoryMap.get(category)!.values()).sort((a, b) =>
          a.className.localeCompare(b.className),
        ),
      }),
    );
  }, [students]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>ADMINISTRATION</Text>
          <Text style={styles.title}>Élèves</Text>
          <Text style={styles.subtitle}>
            {total} élève{total > 1 ? "s" : ""} dans l'établissement
          </Text>
        </View>
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Rechercher un élève, matricule ou email"
        placeholderTextColor="#9CA3AF"
        style={styles.searchInput}
        autoCapitalize="none"
        returnKeyType="search"
      />

      <View style={styles.filters}>
        {STATUS_FILTERS.map((filter) => {
          const selected = status === filter.value;

          return (
            <Pressable
              key={filter.label}
              style={[
                styles.filterChip,
                selected ? styles.filterChipSelected : null,
              ]}
              onPress={() => setStatus(filter.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text
                style={[
                  styles.filterText,
                  selected ? styles.filterTextSelected : null,
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading && students.length === 0 ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#111827" />
          <Text style={styles.stateText}>Chargement des élèves...</Text>
        </View>
      ) : error && students.length === 0 ? (
        <View style={styles.stateContainer}>
          <Text style={styles.errorTitle}>Liste indisponible</Text>
          <Text style={styles.stateText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={groupedCategories}
          keyExtractor={(item) => item.category}
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
                <View key={classGroup.className} style={styles.classSection}>
                  <View style={styles.classHeader}>
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

                  {classGroup.students.map((student) => {
                    const initials =
                      `${student.firstName[0] ?? ""}${student.lastName[0] ?? ""}`.toUpperCase();

                    return (
                      <View key={student.id} style={styles.studentRow}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>{initials}</Text>
                        </View>

                        <View style={styles.identity}>
                          <Text style={styles.studentName}>
                            {student.firstName} {student.lastName}
                          </Text>
                          <Text style={styles.studentNumber}>
                            Matricule : {student.studentNumber}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.statusBadge,
                            student.status === "ACTIVE"
                              ? styles.statusActive
                              : student.status === "SUSPENDED"
                                ? styles.statusSuspended
                                : styles.statusInactive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              student.status === "ACTIVE"
                                ? styles.statusTextActive
                                : student.status === "SUSPENDED"
                                  ? styles.statusTextSuspended
                                  : styles.statusTextInactive,
                            ]}
                          >
                            {student.status === "ACTIVE"
                              ? "Actif"
                              : student.status === "SUSPENDED"
                                ? "Suspendu"
                                : "Inactif"}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          )}
          contentContainerStyle={
            groupedCategories.length === 0
              ? styles.emptyContent
              : styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#111827"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.35}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Aucun élève trouvé</Text>
              <Text style={styles.emptyText}>
                Modifiez votre recherche ou votre filtre.
              </Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#111827" />
              </View>
            ) : null
          }
        />
      )}
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
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
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
  },
  filters: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  filterChipSelected: {
    borderColor: "#111827",
    backgroundColor: "#111827",
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  filterTextSelected: {
    color: "#FFFFFF",
  },
  listContent: {
    paddingBottom: 24,
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
  classSection: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    marginBottom: 2,
  },
  classHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 13,
    backgroundColor: "#F1F5F9",
  },
  classHeaderIdentity: {
    flex: 1,
  },
  classTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  classLevel: {
    marginTop: 3,
    fontSize: 11,
    color: "#6B7280",
  },
  classCount: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
  studentName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  studentNumber: {
    marginTop: 3,
    fontSize: 12,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusActive: {
    backgroundColor: "#DCFCE7",
  },
  statusSuspended: {
    backgroundColor: "#FEF3C7",
  },
  statusInactive: {
    backgroundColor: "#F3F4F6",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusTextActive: {
    color: "#166534",
  },
  statusTextSuspended: {
    color: "#92400E",
  },
  statusTextInactive: {
    color: "#4B5563",
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  stateText: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#111827",
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
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
  emptyText: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 13,
    color: "#6B7280",
  },
  footerLoader: {
    paddingVertical: 16,
  },
});
