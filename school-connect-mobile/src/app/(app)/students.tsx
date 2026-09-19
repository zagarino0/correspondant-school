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
  }, [students]);          renderItem={({ item: categoryGroup }) => (
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
                  </View>

                  {classGroup.students.map((student, index) => (
                    <View key={student.id} style={styles.studentRow}>
                      <View style={styles.positionCell}>
                        <Text style={styles.positionText}>
                          {student.classPosition ?? `—`}
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
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}  classColumn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D9DEE5",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    marginBottom: 4,
  },
  classColumnHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: "#111827",
  },
  classHeaderIdentity: {
    flex: 1,
  },
  classTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  classLevel: {
    marginTop: 3,
    fontSize: 11,
    color: "#D1D5DB",
  },
  classCount: {
    fontSize: 11,
    fontWeight: "700",
    color: "#E5E7EB",
  },
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
  positionColumn: {
    flex: 0.75,
  },
  genderColumn: {
    flex: 0.55,
    textAlign: "center",
  },
  matriculeColumn: {
    flex: 1.35,
    textAlign: "right",
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  positionCell: {
    flex: 0.75,
  },
  positionText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
  },
  identity: {
    flex: 1,
    paddingRight: 8,
  },
  studentName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  genderCell: {
    flex: 0.55,
    alignItems: "center",
  },
  genderText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#374151",
  },
  matriculeCell: {
    flex: 1.35,
    alignItems: "flex-end",
  },
  studentNumber: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },

