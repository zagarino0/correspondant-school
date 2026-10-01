import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  createAuthorization,
  getMyAuthorizations,
  getMyChildren,
  type ParentAuthorization,
  type ParentChild,
} from "../../services/parents/parent.service";

const AUTHORIZATION_TYPES = [
  "Sortie exceptionnelle",
  "Absence exceptionnelle",
  "Autorisation de récupération",
  "Autre",
];

function statusLabel(status: ParentAuthorization["status"]) {
  if (status === "APPROVED") return "Approuvée";
  if (status === "REJECTED") return "Refusée";
  return "En attente";
}

function statusStyle(status: ParentAuthorization["status"]) {
  if (status === "APPROVED") return styles.statusApproved;
  if (status === "REJECTED") return styles.statusRejected;
  return styles.statusPending;
}

export default function AuthorizationsScreen() {
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [authorizations, setAuthorizations] = useState<ParentAuthorization[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [type, setType] = useState(AUTHORIZATION_TYPES[0]);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [childrenResponse, authorizationsResponse] = await Promise.all([
      getMyChildren(),
      getMyAuthorizations(),
    ]);

    setChildren(childrenResponse.children);
    setAuthorizations(authorizationsResponse.authorizations);
    setSelectedChildId((current) => {
      if (current && childrenResponse.children.some((child) => child.id === current)) {
        return current;
      }
      return childrenResponse.children[0]?.id ?? null;
    });
  }, []);

  useEffect(() => {
    void load()
      .catch(() => {
        Alert.alert(
          "Erreur",
          "Impossible de charger les autorisations parentales.",
        );
      })
      .finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } catch {
      Alert.alert("Erreur", "Impossible d'actualiser les autorisations.");
    } finally {
      setRefreshing(false);
    }
  };

  const submit = async () => {
    if (!selectedChildId) {
      Alert.alert("Enfant requis", "Sélectionnez l'enfant concerné.");
      return;
    }

    const cleanReason = reason.trim();
    if (!cleanReason) {
      Alert.alert("Motif requis", "Saisissez le motif de la demande.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await createAuthorization({
        studentId: selectedChildId,
        type,
        reason: cleanReason,
      });

      setAuthorizations((current) => [
        response.authorization,
        ...current,
      ]);
      setReason("");

      Alert.alert(
        "Demande envoyée",
        "Votre demande d'autorisation a été transmise à la vie scolaire.",
      );
    } catch {
      Alert.alert(
        "Erreur",
        "La demande n'a pas pu être envoyée. Vérifiez votre connexion.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Chargement…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Autorisations parentales</Text>
      <Text style={styles.subtitle}>
        Envoyez une demande à la vie scolaire et suivez sa décision.
      </Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Nouvelle demande</Text>

        <Text style={styles.label}>Enfant</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {children.map((child) => {
            const selected = child.id === selectedChildId;
            return (
              <Pressable
                key={child.id}
                onPress={() => setSelectedChildId(child.id)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {child.firstName} {child.lastName}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.label}>Type d'autorisation</Text>
        <View style={styles.typeGrid}>
          {AUTHORIZATION_TYPES.map((item) => {
            const selected = item === type;
            return (
              <Pressable
                key={item}
                onPress={() => setType(item)}
                style={[styles.typeButton, selected && styles.typeButtonSelected]}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    selected && styles.typeButtonTextSelected,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Motif</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Expliquez la raison de votre demande…"
          placeholderTextColor="#9CA3AF"
          multiline
          textAlignVertical="top"
          maxLength={1000}
          style={styles.textInput}
        />

        <Pressable
          onPress={() => void submit()}
          disabled={submitting}
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitText}>Envoyer la demande</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.historyHeader}>
        <Text style={styles.sectionTitle}>Mes demandes</Text>
        <Text style={styles.count}>{authorizations.length}</Text>
      </View>

      {authorizations.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Aucune demande</Text>
          <Text style={styles.emptyText}>
            Vos demandes d'autorisation apparaîtront ici.
          </Text>
        </View>
      ) : (
        authorizations.map((item) => (
          <View key={item.id} style={styles.authorizationCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderText}>
                <Text style={styles.authorizationType}>{item.type}</Text>
                <Text style={styles.studentName}>
                  {item.student.firstName} {item.student.lastName}
                </Text>
              </View>
              <View style={[styles.statusBadge, statusStyle(item.status)]}>
                <Text style={styles.statusText}>{statusLabel(item.status)}</Text>
              </View>
            </View>

            {item.reason ? (
              <Text style={styles.reason}>{item.reason}</Text>
            ) : null}

            <Text style={styles.date}>
              Demandée le{" "}
              {new Date(item.requestedAt).toLocaleDateString("fr-FR")}
            </Text>

            {item.decidedAt ? (
              <Text style={styles.date}>
                Décision le{" "}
                {new Date(item.decidedAt).toLocaleDateString("fr-FR")}
              </Text>
            ) : null}
          </View>
        ))
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
    padding: 16,
    paddingBottom: 36,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: 10,
    color: "#64748B",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    marginTop: 7,
    marginBottom: 18,
    fontSize: 14,
    lineHeight: 20,
    color: "#64748B",
  },
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  label: {
    marginTop: 18,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  chips: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  chipSelected: {
    borderColor: "#111827",
    backgroundColor: "#111827",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  typeGrid: {
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  typeButtonSelected: {
    borderColor: "#111827",
    backgroundColor: "#F3F4F6",
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  typeButtonTextSelected: {
    color: "#111827",
    fontWeight: "800",
  },
  textInput: {
    minHeight: 110,
    padding: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    fontSize: 14,
    color: "#111827",
  },
  submitButton: {
    minHeight: 48,
    marginTop: 14,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  historyHeader: {
    marginTop: 24,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  count: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    textAlign: "center",
    backgroundColor: "#E5E7EB",
    color: "#374151",
    fontSize: 12,
    fontWeight: "800",
  },
  emptyCard: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#374151",
  },
  emptyText: {
    marginTop: 5,
    fontSize: 13,
    color: "#6B7280",
  },
  authorizationCard: {
    marginBottom: 10,
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  cardHeaderText: {
    flex: 1,
  },
  authorizationType: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  studentName: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748B",
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusPending: {
    backgroundColor: "#FEF3C7",
  },
  statusApproved: {
    backgroundColor: "#DCFCE7",
  },
  statusRejected: {
    backgroundColor: "#FEE2E2",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#374151",
  },
  reason: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    color: "#374151",
  },
  date: {
    marginTop: 8,
    fontSize: 11,
    color: "#94A3B8",
  },
});
