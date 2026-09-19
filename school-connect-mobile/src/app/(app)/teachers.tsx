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
    const categoryMap = new Map<
      TeacherCategory,
      Array<{
        classId: string;
        className: string;
        level: string | null;
        teachers: SchoolTeacher[];
      }>
    >();

    for (const teacher of teachers) {
      const fullName =
        `${teacher.firstName} ${teacher.lastName} ${teacher.email}`.toLowerCase();
      const searchValue = search.trim().toLowerCase();

      for (const schoolClass of teacher.classes) {
        if (
          searchValue &&
          !fullName.includes(searchValue) &&
          !classMatchesSearch(schoolClass, searchValue)
        ) {
          continue;
        }

        const category = getTeacherCategory(schoolClass.level);

        if (!categoryMap.has(category)) categoryMap.set(category, []);

        const classes = categoryMap.get(category)!;
        let classGroup = classes.find((item) => item.classId === schoolClass.id);

        if (!classGroup) {
          classGroup = {
            classId: schoolClass.id,
            className: schoolClass.name,
            level: schoolClass.level,
            teachers: [],
          };
          classes.push(classGroup);
        }

        if (!classGroup.teachers.some((item) => item.id === teacher.id)) {
          classGroup.teachers.push(teacher);
        }
      }
    }

    return CATEGORY_ORDER.filter((category) => categoryMap.has(category)).map(
      (category) => ({
        category,
        classes: categoryMap
          .get(category)!
          .sort((a, b) => a.className.localeCompare(b.className)),
      }),
    );
  }, [search, teachers]);        renderItem={({ item }) => (
          <View style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <View>
                <Text style={styles.categoryTitle}>
                  {CATEGORY_LABELS[item.category]}
                </Text>
                <Text style={styles.categoryCount}>
                  {item.classes.length} classe
                  {item.classes.length > 1 ? "s" : ""}
                </Text>
              </View>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>
                  {item.classes.length}
                </Text>
              </View>
            </View>

            {item.classes.map((classGroup) => (
              <View key={classGroup.classId} style={styles.classColumn}>
                <View style={styles.classColumnHeader}>
                  <View style={styles.classHeaderIdentity}>
                    <Text style={styles.classTitle}>{classGroup.className}</Text>
                    <Text style={styles.classLevel}>
                      {classGroup.level ?? "Niveau non renseigné"}
                    </Text>
                  </View>
                  <Text style={styles.classCount}>
                    {classGroup.teachers.length} enseignant
                    {classGroup.teachers.length > 1 ? "s" : ""}
                  </Text>
                </View>

                <View style={styles.columnHeadings}>
                  <Text style={[styles.headingText, styles.numberColumn]}>
                    N°
                  </Text>
                  <Text style={styles.headingText}>Nom et prénom</Text>
                  <Text style={[styles.headingText, styles.emailColumn]}>
                    Contact
                  </Text>
                </View>

                {classGroup.teachers.map((teacher, index) => (
                  <View key={`${classGroup.classId}-${teacher.id}`} style={styles.teacherRow}>
                    <View style={styles.numberCell}>
                      <Text style={styles.numberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.identity}>
                      <Text style={styles.teacherName}>
                        {teacher.lastName} {teacher.firstName}
                      </Text>
                    </View>
                    <View style={styles.emailCell}>
                      <Text style={styles.email} numberOfLines={1}>
                        {teacher.email}
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
  numberColumn: {
    flex: 0.6,
  },
  emailColumn: {
    flex: 1.35,
    textAlign: "right",
  },
  teacherRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  numberCell: {
    flex: 0.6,
  },
  numberText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
  },
  identity: {
    flex: 1,
    paddingRight: 8,
  },
  teacherName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  emailCell: {
    flex: 1.35,
    alignItems: "flex-end",
  },
  email: {
    fontSize: 11,
    color: "#6B7280",
  },

