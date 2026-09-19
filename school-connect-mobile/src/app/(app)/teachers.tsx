import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Pressable,
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
  const [expandedCategory, setExpandedCategory] = useState<TeacherCategory | null>(null);
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(() => new Set());
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(() => new Set());

  const toggleCategory = (category: TeacherCategory) => {
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
      if (next.has(levelKey)) next.delete(levelKey);
      else next.add(levelKey);
      setExpandedClasses(new Set());
      return next;
    });
  };

  const toggleClass = (classKey: string) => {
    setExpandedClasses((current) => {
      const next = new Set(current);
      if (next.has(classKey)) next.delete(classKey);
      else next.add(classKey);
      return next;
    });
  };

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
    type ClassGroup = {
      classId: string;
      className: string;
      level: string | null;
      teachers: SchoolTeacher[];
    };

    type LevelGroup = {
      level: string;
      classes: ClassGroup[];
    };

    const categoryMap = new Map<TeacherCategory, Map<string, Map<string, ClassGroup>>>();
    const searchValue = search.trim().toLowerCase();

    for (const teacher of teachers) {
      const fullName = (
        teacher.firstName +
        " " +
        teacher.lastName +
        " " +
        teacher.email
      ).toLowerCase();

      for (const schoolClass of teacher.classes) {
        if (
          searchValue &&
          !fullName.includes(searchValue) &&
          !classMatchesSearch(schoolClass, searchValue)
        ) {
          continue;
        }

        const category = getTeacherCategory(schoolClass.level);
        const level = schoolClass.level?.trim() || "Niveau non renseigné";

        if (!categoryMap.has(category)) categoryMap.set(category, new Map());
        const levels = categoryMap.get(category)!;
        if (!levels.has(level)) levels.set(level, new Map());
        const classes = levels.get(level)!;

        if (!classes.has(schoolClass.id)) {
          classes.set(schoolClass.id, {
            classId: schoolClass.id,
            className: schoolClass.name,
            level: schoolClass.level,
            teachers: [],
          });
        }

        const classGroup = classes.get(schoolClass.id)!;
        if (!classGroup.teachers.some((item) => item.id === teacher.id)) {
          classGroup.teachers.push(teacher);
        }
      }
    }

    return CATEGORY_ORDER.filter((category) => categoryMap.has(category)).map((category) => {
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
    });
  }, [search, teachers]);
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Enseignants</Text>
        <Text style={styles.subtitle}>{teachers.length} enseignant(s)</Text>
      </View>
      <TextInput value={search} onChangeText={setSearch} placeholder="Rechercher un enseignant ou une classe…" placeholderTextColor="#9CA3AF" style={styles.searchInput} />
      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
      <FlatList
        data={groupedCategories}
        keyExtractor={(item) => item.category}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadTeachers(); }} />}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>Aucun enseignant</Text><Text style={styles.stateText}>Aucun résultat ne correspond à la recherche.</Text></View>}
        renderItem={({ item: categoryGroup }) => {
          const categoryTeacherCount = new Set(
            categoryGroup.levels.flatMap((level) =>
              level.classes.flatMap((classGroup) =>
                classGroup.teachers.map((teacher) => teacher.id),
              ),
            ),
          ).size;

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
                      {categoryTeacherCount} enseignant(s) · {categoryGroup.levels.length} niveau(x)
                    </Text>
                  </View>
                  <Text style={styles.expandIcon}>
                    {expandedCategory === categoryGroup.category ? "▼" : "▶"}
                  </Text>
                </View>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>
                    {categoryGroup.levels.reduce((sum, level) => sum + level.classes.length, 0)}
                  </Text>
                </View>
              </Pressable>

              {expandedCategory === categoryGroup.category ? (
                <View style={styles.levelGrid}>
                  {categoryGroup.levels.map((levelGroup) => {
                    const levelKey = categoryGroup.category + "::" + levelGroup.level;
                    const isLevelExpanded = expandedLevels.has(levelKey);

                    return (
                      <View key={levelGroup.level} style={styles.levelCard}>
                        <Pressable
                          onPress={() => toggleLevel(levelKey)}
                          style={styles.levelHeader}
                        >
                          <View style={styles.levelHeaderText}>
                            <Text style={styles.levelTitle}>{levelGroup.level}</Text>
                            <Text style={styles.levelCount}>{levelGroup.classes.length} classe(s)</Text>
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
                              const isClassExpanded = expandedClasses.has(classKey);

                              return (
                                <View key={classGroup.classId} style={styles.classCard}>
                                  <Pressable
                                    onPress={() => toggleClass(classKey)}
                                    style={styles.classCardHeader}
                                  >
                                    <View style={styles.classHeaderIdentity}>
                                      <Text style={styles.classTitle}>{classGroup.className}</Text>
                                      <Text style={styles.classCount}>{classGroup.teachers.length} enseignant(s)</Text>
                                    </View>
                                    <Text style={styles.classExpandIcon}>
                                      {isClassExpanded ? "▼" : "▶"}
                                    </Text>
                                  </Pressable>

                                  {isClassExpanded ? (
                                    <>
                                      <View style={styles.teacherListHeader}>
                                        <Text style={[styles.teacherListHeaderText, styles.numberColumn]}>N°</Text>
                                        <Text style={[styles.teacherListHeaderText, styles.teacherNameColumn]}>Nom et prénom</Text>
                                        <Text style={[styles.teacherListHeaderText, styles.emailColumn]}>Contact</Text>
                                      </View>

                                      {classGroup.teachers.map((teacher, index) => (
                                        <View
                                          key={classGroup.classId + "-" + teacher.id}
                                          style={styles.teacherRow}
                                        >
                                          <Text style={styles.numberText}>{index + 1}</Text>
                                          <View style={styles.teacherNameColumn}>
                                            <Text style={styles.teacherName} numberOfLines={1}>
                                              {teacher.lastName} {teacher.firstName}
                                            </Text>
                                          </View>
                                          <View style={styles.emailColumnCell}>
                                            <Text style={styles.email} numberOfLines={1}>{teacher.email}</Text>
                                          </View>
                                        </View>
                                      ))}
                                    </>
                                  ) : null}
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
        }}        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: "800", color: "#344976" },
  subtitle: { marginTop: 3, fontSize: 12, color: "#6B7280" },
  searchInput: { marginHorizontal: 14, height: 44, borderWidth: 1, borderColor: "#D9DEE5", borderRadius: 12, paddingHorizontal: 13, backgroundColor: "#FFFFFF", color: "#344976", fontSize: 13, marginBottom: 10 },
  listContent: { paddingHorizontal: 14, paddingBottom: 28 },
  categorySection: { marginBottom: 16, padding: 12, borderRadius: 18, borderWidth: 1, borderColor: "#D9DEE5", backgroundColor: "#EEF2F7" },
  categoryHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, paddingVertical: 6 },
  categoryHeaderIdentity: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  categoryHeaderText: { flex: 1 },
  categoryTitle: { fontSize: 19, fontWeight: "900", color: "#344976" },
  categoryCount: { marginTop: 3, fontSize: 11, color: "#6B7280" },
  expandIcon: { fontSize: 11, fontWeight: "900", color: "#344976" },
  categoryBadge: { minWidth: 34, height: 34, paddingHorizontal: 8, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#344976" },
  categoryBadgeText: { fontSize: 11, fontWeight: "900", color: "#FFFFFF" },
  levelGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  levelCard: { width: "48.8%", marginBottom: 12, padding: 10, borderRadius: 14, borderWidth: 1, borderColor: "#D9DEE5", backgroundColor: "#FFFFFF" },
  levelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 2, paddingVertical: 2 },
  levelHeaderText: { flex: 1 },
  levelTitle: { fontSize: 15, fontWeight: "900", color: "#344976" },
  levelCount: { marginTop: 2, fontSize: 10, fontWeight: "700", color: "#6B7280" },
  classGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  classCard: { width: "100%", marginBottom: 9, borderRadius: 11, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", overflow: "hidden" },
  classCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 9, paddingVertical: 9, backgroundColor: "#344976" },
  classHeaderIdentity: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  classTitle: { flex: 1, fontSize: 13, fontWeight: "900", color: "#FFFFFF" },
  classCount: { fontSize: 9, fontWeight: "800", color: "#E5E7EB" },
  classExpandIcon: { marginLeft: 6, fontSize: 10, fontWeight: "900", color: "#FFFFFF" },
  teacherListHeader: { flexDirection: "row", alignItems: "center", minHeight: 32, paddingHorizontal: 10, backgroundColor: "#E2E8F0", borderBottomWidth: 1, borderBottomColor: "#CBD5E1" },
  teacherListHeaderText: { fontSize: 8, fontWeight: "900", color: "#64748B", textTransform: "uppercase" },
  numberColumn: { width: 38 },
  teacherNameColumn: { flex: 1, paddingRight: 4 },
  emailColumn: { width: 78, textAlign: "right" },
  teacherRow: { flexDirection: "row", alignItems: "center", minHeight: 48, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  numberText: { width: 38, fontSize: 10, fontWeight: "900", color: "#344976" },
  teacherName: { fontSize: 11, fontWeight: "700", color: "#344976" },
  emailColumnCell: { width: 78, alignItems: "flex-end" },
  email: { fontSize: 8, color: "#6B7280", maxWidth: 78 },
  errorBox: { marginHorizontal: 14, marginBottom: 8, padding: 12, borderRadius: 10, backgroundColor: "#FEE2E2" },
  errorText: { color: "#991B1B", fontSize: 12, fontWeight: "600" },
  empty: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#344976", marginBottom: 4 },
  stateText: { marginTop: 8, fontSize: 12, color: "#6B7280" },
});
