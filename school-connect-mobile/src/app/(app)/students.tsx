import { useCallback, useEffect, useState } from "react";
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
        if (replace) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

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
    if (
      loading ||
      loadingMore ||
      page >= totalPages
    ) {
      return;
    }

    void loadStudents(page + 1, false);
  };

  const renderStudent = ({ item }: { item: StudentListItem }) => {
    const enrollment = item.enrollments[0];
    const fullName = `${item.firstName} ${item.lastName}`;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.studentCard,
          pressed ? styles.cardPressed : null,
        ]}
      >
        <View style={styles.studentHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {`${item.firstName[0] ?? ""}${item.lastName[0] ?? ""}`.toUpperCase()}
            </Text>
          </View>

          <View style={styles.identity}>
            <Text style={styles.studentName}>{fullName}</Text>
            <Text style={styles.studentNumber}>
              Matricule : {item.studentNumber}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              item.status === "ACTIVE"
                ? styles.statusActive
                : item.status === "SUSPENDED"
                  ? styles.statusSuspended
                  : styles.statusInactive,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                item.status === "ACTIVE"
                  ? styles.statusTextActive
                  : item.status === "SUSPENDED"
                    ? styles.statusTextSuspended
                    : styles.statusTextInactive,
              ]}
            >
              {item.status === "ACTIVE"
                ? "Actif"
                : item.status === "SUSPENDED"
                  ? "Suspendu"
                  : "Inactif"}
            </Text>
          </View>
        </View>

        <View style={styles.meta}>
          <Text style={styles.metaText}>
            {enrollment?.class.name ?? "Aucune classe"}
          </Text>
          <Text style={styles.metaText}>
            {enrollment?.academicYear.name ?? "Aucune année active"}
          </Text>
        </View>
      </Pressable>
    );
  };

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
          data={students}
          keyExtractor={(item) => item.id}
          renderItem={renderStudent}
          contentContainerStyle={
            students.length === 0 ? styles.emptyContent : styles.listContent
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
    gap: 10,
  },
  emptyContent: {
    flexGrow: 1,
  },
  studentCard: {
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  studentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#374151",
  },
  identity: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
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
  meta: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  metaText: {
    flex: 1,
    fontSize: 12,
    color: "#6B7280",
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
