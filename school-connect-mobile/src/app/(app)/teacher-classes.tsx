import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";

import {
  getTeacherClass,
  getTeacherClasses,
} from "../../services/teachers/teacher.service";
import type {
  TeacherClass,
  TeacherClassStudent,
} from "../../services/teachers/teacher.types";

export default function TeacherClassesScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const isTablet = width >= 600 && width < 1024;
  const isWebWide = width >= 1024;

  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [students, setStudents] = useState<TeacherClassStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );

  const loadClasses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getTeacherClasses();
      setClasses(response.classes);

      setSelectedClassId((current) =>
        current && response.classes.some((item) => item.id === current)
          ? current
          : response.classes[0]?.id ?? null,
      );
    } catch {
      setError("Impossible de charger vos classes.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStudents = useCallback(async () => {
    if (!selectedClassId) {
      setStudents([]);
      return;
    }

    try {
      setDetailLoading(true);
      setError(null);

      const response = await getTeacherClass(selectedClassId);
      setStudents(response.students);
    } catch {
      setStudents([]);
      setError("Impossible de charger les élèves de cette classe.");
    } finally {
      setDetailLoading(false);
    }
  }, [selectedClassId]);

  useFocusEffect(
    useCallback(() => {
      void loadClasses();
    }, [loadClasses]),
  );

  useFocusEffect(
    useCallback(() => {
      void loadStudents();
    }, [loadStudents]),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Chargement de vos classes…</Text>
      </View>
    );
  }

  const classCardStyle = [
    styles.classCard,
    isMobile
      ? styles.classCardMobile
      : isTablet
        ? styles.classCardTablet
        : styles.classCardWeb,
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        isMobile && styles.contentMobile,
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.pageHeader, isMobile && styles.pageHeaderMobile]}>
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, isMobile && styles.eyebrowMobile]}>
            ESPACE ENSEIGNANT
          </Text>
          <Text style={[styles.title, isMobile && styles.titleMobile]}>
            Mes classes
          </Text>
          <Text style={styles.subtitle}>
            Consultez les classes qui vous sont affectées et leurs élèves.
          </Text>
        </View>

        <View style={styles.totalBadge}>
          <Text style={styles.totalValue}>{classes.length}</Text>
          <Text style={styles.totalLabel}>classe{classes.length > 1 ? "s" : ""}</Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}

      {classes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.sectionTitle}>Aucune classe affectée</Text>
          <Text style={styles.muted}>
            Votre compte enseignant n&apos;a encore aucune classe affectée.
          </Text>
        </View>
      ) : (
        <View style={[styles.mainLayout, isWebWide && styles.mainLayoutWeb]}>
          <View style={[styles.classesSection, isWebWide && styles.classesSectionWeb]}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Classes affectées</Text>
                <Text style={styles.sectionMeta}>
                  Sélectionnez une classe pour afficher ses élèves.
                </Text>
              </View>
            </View>

            <View style={styles.classGrid}>
              {classes.map((item) => {
                const active = item.id === selectedClassId;

                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setSelectedClassId(item.id)}
                    style={({ pressed }) => [
                      classCardStyle,
                      active && styles.classCardActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.classTopLine}>
                      <View
                        style={[
                          styles.classDot,
                          active && styles.classDotActive,
                        ]}
                      />
                      <Text
                        style={[
                          styles.classLevel,
                          active && styles.classLevelActive,
                        ]}
                        numberOfLines={1}
                      >
                        {item.level ?? "Niveau non renseigné"}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.className,
                        active && styles.classNameActive,
                      ]}
                      numberOfLines={2}
                    >
                      {item.name}
                    </Text>

                    <View style={styles.studentCountRow}>
                      <Text
                        style={[
                          styles.classStudents,
                          active && styles.classStudentsActive,
                        ]}
                      >
                        {item.studentCount}
                      </Text>
                      <Text
                        style={[
                          styles.studentLabel,
                          active && styles.studentLabelActive,
                        ]}
                      >
                        élève{item.studentCount > 1 ? "s" : ""}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {selectedClass ? (
            <View
              style={[
                styles.panel,
                isWebWide && styles.panelWeb,
              ]}
            >
              <View style={styles.panelHeader}>
                <View style={styles.flex}>
                  <Text style={styles.panelKicker}>CLASSE SÉLECTIONNÉE</Text>
                  <Text style={styles.panelTitle}>
                    {selectedClass.name}
                  </Text>
                  <Text style={styles.panelHint}>
                    {selectedClass.academicYear.name}
                  </Text>
                </View>

                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeValue}>
                    {selectedClass.studentCount}
                  </Text>
                  <Text style={styles.countBadgeLabel}>élèves</Text>
                </View>
              </View>

              {detailLoading ? (
                <View style={styles.loader}>
                  <ActivityIndicator />
                  <Text style={styles.muted}>Chargement des élèves…</Text>
                </View>
              ) : students.length === 0 ? (
                <View style={styles.noStudents}>
                  <Text style={styles.noStudentsTitle}>Aucun élève actif</Text>
                  <Text style={styles.muted}>
                    Cette classe ne contient actuellement aucun élève actif.
                  </Text>
                </View>
              ) : (
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.cell, styles.nameCell]}>Élève</Text>
                    <Text style={[styles.cell, styles.numberCell]}>N°</Text>
                  </View>

                  {students.map((item, index) => (
                    <View key={item.enrollmentId} style={styles.tableRow}>
                      <Text
                        style={[styles.studentName, styles.nameCell]}
                        numberOfLines={1}
                      >
                        {index + 1}. {item.student.firstName}{" "}
                        {item.student.lastName}
                      </Text>
                      <Text style={[styles.cell, styles.numberCell]}>
                        {item.student.studentNumber}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    width: "100%",
    maxWidth: 1320,
    alignSelf: "center",
    paddingHorizontal: 28,
    paddingTop: 30,
    paddingBottom: 48,
    gap: 22,
  },
  contentMobile: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 24,
    paddingBottom: 6,
  },
  pageHeaderMobile: {
    alignItems: "flex-start",
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    marginBottom: 7,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.6,
    color: "#344976",
  },
  eyebrowMobile: {
    fontSize: 10,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    color: "#111827",
  },
  titleMobile: {
    fontSize: 27,
    lineHeight: 33,
  },
  subtitle: {
    maxWidth: 720,
    marginTop: 8,
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 21,
  },
  totalBadge: {
    minWidth: 82,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#344976",
    alignItems: "center",
    justifyContent: "center",
  },
  totalValue: {
    fontSize: 22,
    lineHeight: 25,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  totalLabel: {
    marginTop: 2,
    fontSize: 11,
    color: "#E7EBF4",
  },
  errorBox: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  error: {
    color: "#B91C1C",
    fontSize: 13,
  },
  mainLayout: {
    gap: 18,
  },
  mainLayoutWeb: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  classesSection: {
    gap: 14,
  },
  classesSectionWeb: {
    flex: 1.05,
    minWidth: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  sectionMeta: {
    marginTop: 4,
    color: "#6B7280",
    fontSize: 13,
  },
  classGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  classCard: {
    minHeight: 136,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    justifyContent: "space-between",
    shadowColor: "#111827",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  classCardMobile: {
    width: "100%",
  },
  classCardTablet: {
    width: "48.5%",
  },
  classCardWeb: {
    width: "31.8%",
  },
  classCardActive: {
    backgroundColor: "#344976",
    borderColor: "#344976",
    shadowOpacity: 0.12,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  classTopLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  classDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#344976",
  },
  classDotActive: {
    backgroundColor: "#FFFFFF",
  },
  classLevel: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
  },
  classLevelActive: {
    color: "#E7EBF4",
  },
  className: {
    marginTop: 14,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
    color: "#111827",
  },
  classNameActive: {
    color: "#FFFFFF",
  },
  studentCountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
    marginTop: 16,
  },
  classStudents: {
    fontSize: 22,
    fontWeight: "800",
    color: "#344976",
  },
  classStudentsActive: {
    color: "#FFFFFF",
  },
  studentLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  studentLabelActive: {
    color: "#E7EBF4",
  },
  panel: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    gap: 16,
    shadowColor: "#111827",
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1,
  },
  panelWeb: {
    flex: 0.95,
    minWidth: 420,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  panelKicker: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: "#344976",
  },
  panelTitle: {
    marginTop: 5,
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  panelHint: {
    marginTop: 4,
    color: "#6B7280",
    fontSize: 13,
  },
  countBadge: {
    minWidth: 62,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#F1F5F9",
  },
  countBadgeValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  countBadgeLabel: {
    marginTop: 1,
    fontSize: 10,
    color: "#6B7280",
  },
  loader: {
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  noStudents: {
    paddingVertical: 20,
    gap: 6,
  },
  noStudentsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  table: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: "#F1F5F9",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 54,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  cell: {
    fontSize: 12,
    color: "#6B7280",
  },
  nameCell: {
    flex: 1,
    minWidth: 0,
  },
  numberCell: {
    width: 90,
    textAlign: "right",
  },
  studentName: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "600",
  },
  empty: {
    padding: 22,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  muted: {
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 20,
  },
});
