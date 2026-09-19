import { useEffect, useState } from "react";
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
  getChildMedicalRecord,
  getMyChildren,
  type ParentChild,
  type ParentMedicalRecord,
} from "../../services/parents/parent.service";

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value?.trim() || "Non renseigné"}</Text>
    </View>
  );
}

export default function MedicalRecordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ studentId?: string }>();
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(
    params.studentId ?? null,
  );
  const [record, setRecord] = useState<ParentMedicalRecord | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isChildrenLoading, setIsChildrenLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadChildren() {
      try {
        const response = await getMyChildren();
        if (!mounted) return;

        setChildren(response.children);
        setSelectedChildId((current) => {
          if (current && response.children.some((child) => child.id === current)) {
            return current;
          }
          return response.children[0]?.id ?? null;
        });
      } catch {
        if (mounted) {
          setErrorMessage("Impossible de charger les enfants.");
        }
      } finally {
        if (mounted) {
          setIsChildrenLoading(false);
        }
      }
    }

    void loadChildren();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadRecord() {
      if (!selectedChildId) {
        setRecord(null);
        setStudentName("");
        setStudentNumber("");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage(null);

        const response = await getChildMedicalRecord(selectedChildId);

        if (mounted) {
          setRecord(response.medicalRecord);
          setStudentName(`${response.student.firstName} ${response.student.lastName}`.trim());
          setStudentNumber(response.student.studentNumber);
        }
      } catch {
        if (mounted) {
          setRecord(null);
          setErrorMessage("Impossible de charger la fiche médicale.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadRecord();

    return () => {
      mounted = false;
    };
  }, [selectedChildId]);

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
        <Text style={styles.headerTitle}>Fiche médicale</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isChildrenLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator />
          <Text style={styles.stateText}>Chargement...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
        >
          {children.length > 1 && (
            <>
              <Text style={styles.sectionTitle}>Enfant</Text>
              <View style={styles.childrenList}>
                {children.map((child) => {
                  const selected = child.id === selectedChildId;
                  return (
                    <Pressable
                      key={child.id}
                      style={[
                        styles.childButton,
                        selected && styles.childButtonSelected,
                      ]}
                      onPress={() => setSelectedChildId(child.id)}
                    >
                      <Text
                        style={[
                          styles.childButtonText,
                          selected && styles.childButtonTextSelected,
                        ]}
                      >
                        {child.firstName} {child.lastName}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : isLoading ? (
            <View style={styles.stateContainer}>
              <ActivityIndicator />
              <Text style={styles.stateText}>
                Chargement de la fiche médicale...
              </Text>
            </View>
          ) : !selectedChildId ? (
            <View style={styles.card}>
              <Text style={styles.emptyTitle}>Aucun enfant sélectionné</Text>
            </View>
          ) : (
            <>
              <View style={styles.identityCard}>
                <Text style={styles.identityName}>{studentName}</Text>
                <Text style={styles.identityNumber}>
                  Matricule : {studentNumber}
                </Text>
              </View>

              {!record ? (
                <View style={styles.card}>
                  <Text style={styles.emptyTitle}>Fiche médicale non renseignée</Text>
                  <Text style={styles.emptyText}>
                    Aucune information médicale n’est actuellement enregistrée
                    pour cet enfant.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Informations médicales</Text>
                    <InfoRow label="Groupe sanguin" value={record.bloodGroup} />
                    <InfoRow label="Allergies" value={record.allergies} />
                    <InfoRow
                      label="Antécédents / conditions médicales"
                      value={record.medicalConditions}
                    />
                    <InfoRow label="Traitements / médicaments" value={record.medications} />
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Contact d’urgence</Text>
                    <InfoRow
                      label="Nom"
                      value={record.emergencyContactName}
                    />
                    <InfoRow
                      label="Téléphone"
                      value={record.emergencyContactPhone}
                    />
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Médecin</Text>
                    <InfoRow label="Nom" value={record.doctorName} />
                    <InfoRow label="Téléphone" value={record.doctorPhone} />
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Notes</Text>
                    <Text style={styles.notes}>
                      {record.notes?.trim() || "Aucune note renseignée."}
                    </Text>
                  </View>
                </>
              )}
            </>
          )}
        </ScrollView>
      )}
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
    paddingTop: 24,
    paddingBottom: 20,
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
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
    gap: 14,
  },
  sectionTitle: {
    marginBottom: 10,
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  childrenList: {
    gap: 8,
    marginBottom: 6,
  },
  childButton: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  childButtonSelected: {
    borderColor: "#111827",
    backgroundColor: "#F3F4F6",
  },
  childButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  childButtonTextSelected: {
    color: "#111827",
    fontWeight: "800",
  },
  identityCard: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#111827",
  },
  identityName: {
    fontSize: 21,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  identityNumber: {
    marginTop: 5,
    fontSize: 13,
    color: "#D1D5DB",
  },
  card: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  infoRow: {
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  infoValue: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 21,
    color: "#111827",
  },
  notes: {
    fontSize: 15,
    lineHeight: 22,
    color: "#374151",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  emptyText: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
  },
  errorText: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    color: "#B91C1C",
    fontSize: 14,
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
    color: "#6B7280",
    fontSize: 14,
  },
});
