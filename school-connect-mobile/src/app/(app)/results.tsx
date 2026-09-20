import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  getMyChildren,
  type ParentChild,
} from "../../services/parents/parent.service";
import {
  getStudentGrades,
  type ParentGrade,
} from "../../services/grades/grade.service";

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date non renseignée";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ studentId?: string | string[] }>();
  const requestedStudentId = Array.isArray(params.studentId)
    ? params.studentId[0]
    : params.studentId;

  const [children, setChildren] = useState<ParentChild[]>([]);
  const [selectedChild, setSelectedChild] = useState<ParentChild | null>(null);
  const [grades, setGrades] = useState<ParentGrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadResults() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const childrenResponse = await getMyChildren();

        if (!isMounted) {
          return;
        }

        setChildren(childrenResponse.children);

        const child =
          childrenResponse.children.find(
            (item) => item.id === requestedStudentId,
          ) ?? childrenResponse.children[0] ?? null;

        setSelectedChild(child);

        if (!child) {
          setGrades([]);
          return;
        }

        const gradesResponse = await getStudentGrades(child.id);

        if (isMounted) {
          setGrades(gradesResponse.grades);
        }
      } catch {
        if (isMounted) {
          setGrades([]);
          setErrorMessage(
            "Impossible de charger les résultats pour le moment.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadResults();

    return () => {
      isMounted = false;
    };
  }, [requestedStudentId]);

  const gradeSummary = useMemo(() => {
    if (grades.length === 0) {
      return {
        count: 0,
        average: null as number | null,
      };
    }

    const weightedTotal = grades.reduce(
      (total, grade) =>
        total + (grade.value / grade.maxValue) * 20 * grade.coefficient,
      0,
    );

    const coefficientTotal = grades.reduce(
      (total, grade) => total + grade.coefficient,
      0,
    );

    return {
      count: grades.length,
      average:
        coefficientTotal > 0 ? weightedTotal / coefficientTotal : null,
    };
  }, [grades]);

  const gradesBySubject = useMemo(() => {
    const grouped = new Map<string, ParentGrade[]>();

    for (const grade of grades) {
      const subjectGrades = grouped.get(grade.subject) ?? [];
      subjectGrades.push(grade);
      grouped.set(grade.subject, subjectGrades);
    }

    return Array.from(grouped.entries()).sort(([subjectA], [subjectB]) =>
      subjectA.localeCompare(subjectB, "fr"),
    );
  }, [grades]);

  const handleChildChange = (child: ParentChild) => {
    if (child.id === selectedChild?.id) {
      return;
    }

    router.replace({
      pathname: "/(app)/results",
      params: { studentId: child.id },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Résultats</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {children.length > 1 ? (
          <View style={styles.childSelector}>
            <Text style={styles.sectionLabel}>Enfant suivi</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.childSelectorContent}
            >
              {children.map((child) => {
                const isSelected = child.id === selectedChild?.id;

                return (
                  <Pressable
                    key={child.id}
                    style={[
                      styles.childChip,
                      isSelected ? styles.childChipSelected : null,
                    ]}
                    onPress={() => handleChildChange(child)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      "Afficher les résultats de " +
                      child.firstName +
                      " " +
                      child.lastName
                    }
                  >
                    <Text
                      style={[
                        styles.childChipText,
                        isSelected ? styles.childChipTextSelected : null,
                      ]}
                    >
                      {child.firstName} {child.lastName}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {selectedChild ? (
          <View style={styles.studentHeader}>
            <Text style={styles.studentName}>
              {selectedChild.firstName} {selectedChild.lastName}
            </Text>
            <Text style={styles.studentMeta}>
              {selectedChild.enrollment?.class.name ?? "Classe non renseignée"}
              {" · "}
              {selectedChild.enrollment?.academicYear.name ??
                "Année non renseignée"}
            </Text>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator />
            <Text style={styles.stateText}>Chargement des résultats...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.stateContainer}>
            <Text style={styles.stateText}>{errorMessage}</Text>
          </View>
        ) : !selectedChild ? (
          <View style={styles.stateContainer}>
            <Text style={styles.stateTitle}>Aucun enfant</Text>
            <Text style={styles.stateText}>
              Aucun enfant actif n’est associé à ce compte.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <View>
                <Text style={styles.summaryLabel}>Moyenne générale</Text>
                <Text style={styles.summaryValue}>
                  {gradeSummary.average !== null
                    ? gradeSummary.average.toFixed(2) + " / 20"
                    : "—"}
                </Text>
              </View>

              <View style={styles.summaryCount}>
                <Text style={styles.summaryCountValue}>
                  {gradeSummary.count}
                </Text>
                <Text style={styles.summaryCountLabel}>évaluation(s)</Text>
              </View>
            </View>

            {gradesBySubject.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Aucune note enregistrée</Text>
                <Text style={styles.emptyText}>
                  Les résultats apparaîtront ici dès qu’une note sera publiée.
                </Text>
              </View>
            ) : (
              <View style={styles.subjectList}>
                {gradesBySubject.map(([subject, subjectGrades]) => (
                  <View key={subject} style={styles.subjectCard}>
                    <Text style={styles.subjectTitle}>{subject}</Text>

                    {subjectGrades.map((grade) => (
                      <View key={grade.id} style={styles.gradeRow}>
                        <View style={styles.gradeMain}>
                          <Text style={styles.gradeTitle}>{grade.title}</Text>
                          <Text style={styles.gradeMeta}>
                            {formatDate(grade.evaluationDate)} · Coef.{" "}
                            {grade.coefficient}
                          </Text>
                          {grade.comment ? (
                            <Text style={styles.gradeComment}>
                              {grade.comment}
                            </Text>
                          ) : null}
                        </View>

                        <Text style={styles.gradeValue}>
                          {grade.value} / {grade.maxValue}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  backIcon: {
    fontSize: 32,
    lineHeight: 34,
    color: "#111827",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  childSelector: {
    marginBottom: 20,
  },
  sectionLabel: {
    marginBottom: 10,
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },
  childSelectorContent: {
    gap: 8,
  },
  childChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  childChipSelected: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  childChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  childChipTextSelected: {
    color: "#FFFFFF",
  },
  studentHeader: {
    marginBottom: 20,
  },
  studentName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  studentMeta: {
    marginTop: 6,
    fontSize: 14,
    color: "#6B7280",
  },
  summaryCard: {
    marginBottom: 20,
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  summaryValue: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  summaryCount: {
    alignItems: "flex-end",
  },
  summaryCountValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  summaryCountLabel: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
  },
  subjectList: {
    gap: 14,
  },
  subjectCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  subjectTitle: {
    marginBottom: 4,
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  gradeRow: {
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#F0F1F3",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  gradeMain: {
    flex: 1,
  },
  gradeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },
  gradeMeta: {
    marginTop: 5,
    fontSize: 12,
    color: "#6B7280",
  },
  gradeComment: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    color: "#6B7280",
  },
  gradeValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  emptyCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  emptyText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
  },
  stateContainer: {
    paddingVertical: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  stateText: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
  },
});
