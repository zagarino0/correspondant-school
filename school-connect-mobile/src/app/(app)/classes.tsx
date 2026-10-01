import { useCallback, useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { getSchoolAdminDashboard, deleteSchoolClass } from "../../services/school-admin/school-admin.service";
import { hasPermission } from "../../features/secretariat/access";
import { useAuthStore } from "../../stores/authStore";
import type { SchoolAdminDashboardResponse } from "../../services/school-admin/school-admin.types";

type Category = "PRIMAIRE" | "PREMIER_CYCLE" | "SECOND_CYCLE" | "AUTRE";

const labels: Record<Category, string> = {
  PRIMAIRE: "Primaire",
  PREMIER_CYCLE: "Premier cycle",
  SECOND_CYCLE: "Deuxième cycle",
  AUTRE: "Autres",
};

function category(level: string | null) {
  const value = (level ?? "").toLowerCase();
  if (value.includes("primaire") || /^(cp|ce1|ce2|ce3|ce4|cm1|cm2)\b/.test(value)) return "PRIMAIRE" as const;
  if (value.includes("premier cycle") || value.includes("collège") || /^(6e|5e|4e|3e)\b/.test(value)) return "PREMIER_CYCLE" as const;
  if (value.includes("second cycle") || value.includes("lycée") || /^(2nde|seconde|1re|1ère|première|terminale)\b/.test(value)) return "SECOND_CYCLE" as const;
  return "AUTRE" as const;
}

export default function ClassesScreen() {
  const user = useAuthStore((state) => state.user);
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const isWeb = width >= 1024;

  const [data, setData] = useState<SchoolAdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await getSchoolAdminDashboard());
    } catch {
      Alert.alert("Erreur", "Impossible de charger les classes.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const groups = useMemo(() => {
    const map = new Map<Category, SchoolAdminDashboardResponse["classes"]>();
    for (const item of data?.classes ?? []) {
      const key = category(item.level);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return (Object.keys(labels) as Category[])
      .filter((key) => map.has(key))
      .map((key) => ({ key, items: map.get(key)! }));
  }, [data]);

  const confirmDelete = (classId: string, className: string) => {
    Alert.alert(
      "Supprimer la classe ?",
      `La classe « ${className} » sera supprimée. Une classe contenant des élèves actifs ne peut pas être supprimée.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingId(classId);
              await deleteSchoolClass(classId);
              await load();
            } catch (error: any) {
              Alert.alert(
                "Suppression impossible",
                error?.response?.data?.error?.message ?? "Une erreur est survenue.",
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#344976" /></View>;
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); void load(); }}
        />
      }
    >
      <View style={[styles.header, isMobile && styles.headerMobile]}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>ADMINISTRATION</Text>
          <Text style={[styles.title, isMobile && styles.titleMobile]}>Classes actives</Text>
          <Text style={styles.subtitle}>
            {data?.classes.length ?? 0} classe(s) · année active
          </Text>
        </View>

        {hasPermission(user, "school.update") ? <Pressable style={styles.addButton} onPress={() => router.push("/(app)/class-create")}>
          <Text style={styles.addButtonText}>+ Ajouter</Text>
        </Pressable>
      </View>

      {groups.map((group) => (
        <View key={group.key} style={styles.group}>
          <View style={styles.groupHeader}>
            <View>
              <Text style={styles.groupTitle}>{labels[group.key]}</Text>
              <Text style={styles.groupMeta}>{group.items.length} classe(s)</Text>
            </View>
            <Text style={styles.groupCount}>{group.items.length}</Text>
          </View>

          <View style={styles.grid}>
            {group.items.map((item) => {
              const deleting = deletingId === item.id;

              return (
                <View
                  key={item.id}
                  style={[
                    styles.classCard,
                    isMobile ? styles.classCardMobile : isWeb ? styles.classCardWeb : styles.classCardTablet,
                  ]}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.cardCopy}>
                      <Text style={styles.className} numberOfLines={2}>{item.name}</Text>
                      <Text style={styles.level}>{item.level || "Niveau non renseigné"}</Text>
                    </View>
                    <View style={styles.studentBadge}>
                      <Text style={styles.studentValue}>{item.studentCount}</Text>
                      <Text style={styles.studentLabel}>élèves</Text>
                    </View>
                  </View>

                  <View style={styles.actions}>
                    <Pressable
                      style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
                      onPress={() =>
                        router.push({
                          pathname: "/(app)/class-edit",
                          params: { classId: item.id, name: item.name, level: item.level ?? "" },
                        })
                      }
                    >
                      <Text style={styles.editText}>Modifier</Text>
                    </Pressable>

                    <Pressable
                      disabled={deleting}
                      style={({ pressed }) => [
                        styles.deleteButton,
                        pressed && styles.pressed,
                        deleting && styles.disabled,
                      ]}
                      onPress={() => confirmDelete(item.id, item.name)}
                    >
                      {deleting ? (
                        <ActivityIndicator size="small" color="#B91C1C" />
                      ) : (
                        <Text style={styles.deleteText}>Supprimer</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ))}

      {groups.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Aucune classe active</Text>
          <Text style={styles.emptyText}>Créez la première classe de l'année scolaire.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { width: "100%", maxWidth: 1320, alignSelf: "center", padding: 24, paddingBottom: 44, gap: 18 },
  contentMobile: { padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 18 },
  headerMobile: { alignItems: "flex-start" },
  headerText: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5, color: "#344976", marginBottom: 5 },
  title: { fontSize: 28, fontWeight: "800", color: "#111827" },
  titleMobile: { fontSize: 24 },
  subtitle: { marginTop: 5, fontSize: 13, color: "#6B7280" },
  addButton: { paddingHorizontal: 15, paddingVertical: 11, borderRadius: 12, backgroundColor: "#344976" },
  addButtonText: { color: "#FFF", fontWeight: "800", fontSize: 13 },
  group: { borderRadius: 18, borderWidth: 1, borderColor: "#D9DEE5", backgroundColor: "#FFF", overflow: "hidden" },
  groupHeader: { padding: 15, backgroundColor: "#EEF2F7", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  groupTitle: { fontSize: 17, fontWeight: "800", color: "#344976" },
  groupMeta: { marginTop: 2, fontSize: 12, color: "#6B7280" },
  groupCount: { minWidth: 30, textAlign: "center", paddingVertical: 5, borderRadius: 15, backgroundColor: "#344976", color: "#FFF", fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, padding: 12 },
  classCard: { minHeight: 148, padding: 15, borderRadius: 15, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFF", justifyContent: "space-between" },
  classCardMobile: { width: "100%" },
  classCardTablet: { width: "48.5%" },
  classCardWeb: { width: "31.8%" },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  cardCopy: { flex: 1, minWidth: 0 },
  className: { fontSize: 16, fontWeight: "800", color: "#111827" },
  level: { marginTop: 5, fontSize: 12, color: "#6B7280" },
  studentBadge: { minWidth: 54, paddingVertical: 6, paddingHorizontal: 7, borderRadius: 10, backgroundColor: "#F1F5F9", alignItems: "center" },
  studentValue: { fontSize: 15, fontWeight: "800", color: "#344976" },
  studentLabel: { fontSize: 9, color: "#6B7280" },
  actions: { flexDirection: "row", gap: 8, marginTop: 18 },
  editButton: { flex: 1, minHeight: 38, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: "#344976", alignItems: "center", justifyContent: "center" },
  editText: { color: "#344976", fontSize: 12, fontWeight: "800" },
  deleteButton: { flex: 1, minHeight: 38, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: "#FECACA", backgroundColor: "#FFF7F7", alignItems: "center", justifyContent: "center" },
  deleteText: { color: "#B91C1C", fontSize: 12, fontWeight: "800" },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.75 },
  empty: { padding: 28, borderRadius: 16, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  emptyText: { marginTop: 5, color: "#6B7280", textAlign: "center" },
});
