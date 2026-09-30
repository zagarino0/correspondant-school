import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  getSchoolAdminDisciplinaryActions,
  updateSchoolAdminDisciplinaryAction,
} from "../../../services/school-admin/school-admin.service";
import type {
  SchoolAdminDisciplinaryAction,
} from "../../../services/school-admin/school-admin.types";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function DisciplinaryApprovalCard() {
  const [items, setItems] = useState<SchoolAdminDisciplinaryAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SchoolAdminDisciplinaryAction | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const response = await getSchoolAdminDisciplinaryActions();
      setItems(response.items);
    } catch {
      setError("Impossible de charger les mesures disciplinaires.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function decide(
    item: SchoolAdminDisciplinaryAction,
    approvalStatus: "APPROVED" | "REJECTED",
  ) {
    try {
      setSavingId(item.id);
      setError(null);

      await updateSchoolAdminDisciplinaryAction(item.studentId, item.id, {
        approvalStatus,
        decisionNote: decisionNote.trim() || null,
      });

      setSelected(null);
      setDecisionNote("");
      await load();
    } catch {
      setError("La décision n'a pas pu être enregistrée.");
    } finally {
      setSavingId(null);
    }
  }

  const pending = items.filter((item) => item.approvalStatus === "PENDING");

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>DISCIPLINE</Text>
          <Text style={styles.title}>Validation des mesures</Text>
          <Text style={styles.subtitle}>
            Validez ou rejetez les mesures proposées par le surveillant.
          </Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{pending.length}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator size="small" color="#344976" />
          <Text style={styles.stateText}>Chargement...</Text>
        </View>
      ) : pending.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Aucune mesure à valider</Text>
          <Text style={styles.emptyText}>
            Les nouvelles propositions du surveillant apparaîtront ici.
          </Text>
        </View>
      ) : (
        pending.map((item) => (
          <View key={item.id} style={styles.item}>
            <View style={styles.itemTop}>
              <View style={styles.itemCopy}>
                <Text style={styles.studentName}>
                  {item.student.firstName} {item.student.lastName}
                </Text>
                <Text style={styles.meta}>
                  {item.type} · {formatDate(item.actionAt)}
                </Text>
              </View>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingText}>À valider</Text>
              </View>
            </View>

            <Text style={styles.description} numberOfLines={3}>
              {item.description}
            </Text>

            {item.decisionNote ? (
              <Text style={styles.note} numberOfLines={2}>
                Note : {item.decisionNote}
              </Text>
            ) : null}

            <Pressable
              style={styles.reviewButton}
              onPress={() => {
                setSelected(item);
                setDecisionNote("");
              }}
              disabled={savingId !== null}
            >
              <Text style={styles.reviewButtonText}>Examiner la mesure</Text>
            </Pressable>
          </View>
        ))
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal
        visible={selected !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!savingId) {
            setSelected(null);
            setDecisionNote("");
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalKicker}>DÉCISION ADMINISTRATIVE</Text>
            <Text style={styles.modalTitle}>
              {selected?.student.firstName} {selected?.student.lastName}
            </Text>

            <Text style={styles.modalMeta}>{selected?.type}</Text>

            <Text style={styles.modalDescription}>
              {selected?.description}
            </Text>

            <Text style={styles.inputLabel}>Note de décision (facultative)</Text>
            <TextInput
              value={decisionNote}
              onChangeText={setDecisionNote}
              placeholder="Motif de la validation ou du rejet..."
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
              style={styles.input}
              editable={savingId === null}
            />

            <View style={styles.actions}>
              <Pressable
                style={styles.cancelButton}
                disabled={savingId !== null}
                onPress={() => {
                  setSelected(null);
                  setDecisionNote("");
                }}
              >
                <Text style={styles.cancelText}>Annuler</Text>
              </Pressable>

              <Pressable
                style={styles.rejectButton}
                disabled={savingId !== null}
                onPress={() => {
                  if (selected) void decide(selected, "REJECTED");
                }}
              >
                {savingId === selected?.id ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.actionText}>Rejeter</Text>
                )}
              </Pressable>

              <Pressable
                style={styles.approveButton}
                disabled={savingId !== null}
                onPress={() => {
                  if (selected) void decide(selected, "APPROVED");
                }}
              >
                {savingId === selected?.id ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.actionText}>Valider</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
  },
  kicker: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: "#344976",
  },
  title: {
    marginTop: 4,
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: "#6B7280",
  },
  countBadge: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 9,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
  },
  countText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  state: {
    minHeight: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  stateText: {
    marginTop: 8,
    fontSize: 12,
    color: "#6B7280",
  },
  empty: {
    marginTop: 14,
    padding: 14,
    borderRadius: 13,
    backgroundColor: "#F8FAFC",
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  emptyText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: "#6B7280",
  },
  item: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F8FAFC",
  },
  itemTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  itemCopy: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  meta: {
    marginTop: 4,
    fontSize: 11,
    color: "#6B7280",
  },
  pendingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#FEF3C7",
  },
  pendingText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#92400E",
  },
  description: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    color: "#374151",
  },
  note: {
    marginTop: 8,
    fontSize: 11,
    lineHeight: 16,
    color: "#6B7280",
    fontStyle: "italic",
  },
  reviewButton: {
    marginTop: 12,
    minHeight: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#344976",
  },
  reviewButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  error: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    color: "#B91C1C",
  },
  modalBackdrop: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17, 24, 39, 0.55)",
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  modalKicker: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.3,
    color: "#344976",
  },
  modalTitle: {
    marginTop: 5,
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  modalMeta: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  modalDescription: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 20,
    color: "#374151",
  },
  inputLabel: {
    marginTop: 16,
    marginBottom: 7,
    fontSize: 11,
    fontWeight: "800",
    color: "#374151",
  },
  input: {
    minHeight: 90,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 11,
    fontSize: 13,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  actions: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  cancelButton: {
    minHeight: 42,
    paddingHorizontal: 13,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  cancelText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#374151",
  },
  rejectButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#991B1B",
  },
  approveButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#166534",
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
});
