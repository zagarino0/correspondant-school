import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { colors, radius, spacing, typography } from "../../theme";
import { useAuthStore } from "../../stores/authStore";
import { getFinancialInvoices } from "../../services/finance/finance.service";
import type {
  FinancialInvoice,
  InvoiceStatus,
} from "../../services/finance/finance.types";

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Brouillon",
  ISSUED: "Émise",
  PARTIALLY_PAID: "Partiellement payée",
  PAID: "Payée",
  OVERDUE: "En retard",
  CANCELLED: "Annulée",
};

function money(value: string | number, currency: string) {
  return `${Number(value).toLocaleString("fr-FR")} ${currency}`;
}

function statusStyle(status: InvoiceStatus) {
  if (status === "PAID") return { backgroundColor: colors.successSoft, color: colors.success };
  if (status === "OVERDUE") return { backgroundColor: colors.dangerSoft, color: colors.danger };
  if (status === "PARTIALLY_PAID") return { backgroundColor: colors.warningSoft, color: colors.warning };
  if (status === "CANCELLED") return { backgroundColor: colors.dangerSoft, color: colors.danger };
  return { backgroundColor: colors.primarySoft, color: colors.primary };
}

export default function FinanceInvoicesScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const permissions = user?.permissions ?? [];
  const [invoices, setInvoices] = useState<FinancialInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<InvoiceStatus | undefined>();

  const load = useCallback(async () => {
    try {
      const result = await getFinancialInvoices({ take: 100, ...(status ? { status } : {}) });
      setInvoices(result.invoices);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!permissions.includes("invoice.read")) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Accès non autorisé</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.muted}>Chargement des factures…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Retour">
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Factures</Text>
          <Text style={styles.subtitle}>Suivi des créances et des règlements</Text>
        </View>
      </View>

      <View style={styles.filters}>
        {[
          { value: undefined, label: "Toutes" },
          { value: "ISSUED" as const, label: "Émises" },
          { value: "PARTIALLY_PAID" as const, label: "Partielles" },
          { value: "PAID" as const, label: "Payées" },
          { value: "OVERDUE" as const, label: "En retard" },
        ].map((item) => (
          <Pressable
            key={item.label}
            onPress={() => setStatus(item.value)}
            style={[styles.filter, status === item.value && styles.filterActive]}
          >
            <Text style={[styles.filterText, status === item.value && styles.filterTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Aucune facture</Text>
            <Text style={styles.muted}>Aucune facture ne correspond au filtre sélectionné.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusAppearance = statusStyle(item.status);
          return (
            <Pressable
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: "/(app)/finance-invoice-detail",
                  params: { invoiceId: item.id },
                })
              }
            >
              <View style={styles.cardTop}>
                <View style={styles.identity}>
                  <Text style={styles.invoiceNumber}>{item.number}</Text>
                  <Text style={styles.student}>
                    {item.student.lastName} {item.student.firstName}
                  </Text>
                  <Text style={styles.studentNumber}>{item.student.studentNumber}</Text>
                </View>
                <View style={[styles.status, { backgroundColor: statusAppearance.backgroundColor }]}>
                  <Text style={[styles.statusText, { color: statusAppearance.color }]}>
                    {STATUS_LABELS[item.status]}
                  </Text>
                </View>
              </View>

              <View style={styles.amountGrid}>
                <View style={styles.amountItem}>
                  <Text style={styles.amountLabel}>Total</Text>
                  <Text style={styles.amountValue}>{money(item.totalAmount, item.currency)}</Text>
                </View>
                <View style={styles.amountItem}>
                  <Text style={styles.amountLabel}>Payé</Text>
                  <Text style={[styles.amountValue, styles.paidValue]}>
                    {money(item.allocatedAmount, item.currency)}
                  </Text>
                </View>
                <View style={styles.amountItem}>
                  <Text style={styles.amountLabel}>Solde</Text>
                  <Text style={[styles.amountValue, Number(item.balanceAmount) > 0 ? styles.balanceValue : styles.paidValue]}>
                    {money(item.balanceAmount, item.currency)}
                  </Text>
                </View>
              </View>

              <Text style={styles.openDetail}>Voir le détail ›</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerText: { flex: 1 },
  back: { fontSize: 36, color: colors.primaryDark, lineHeight: 36 },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  filter: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  filterText: { ...typography.caption, color: colors.textSecondary },
  filterTextActive: { color: colors.primaryForeground },
  list: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: 36, gap: spacing.md },
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  identity: { flex: 1, minWidth: 0 },
  invoiceNumber: { ...typography.heading, color: colors.text },
  student: { ...typography.body, color: colors.text, marginTop: 3 },
  studentNumber: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  status: { paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.full, maxWidth: 145 },
  statusText: { ...typography.caption, textAlign: "center" },
  amountGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  amountItem: { flex: 1, minWidth: 0 },
  amountLabel: { ...typography.caption, color: colors.textMuted, textTransform: "uppercase" },
  amountValue: { ...typography.bodySmall, color: colors.text, fontWeight: "800", marginTop: 3 },
  paidValue: { color: colors.success },
  balanceValue: { color: colors.warning },
  openDetail: { ...typography.bodySmall, color: colors.primary, fontWeight: "800", marginTop: spacing.md },
  empty: { alignItems: "center", paddingVertical: 70, paddingHorizontal: 24 },
  emptyTitle: { ...typography.heading, color: colors.text, marginBottom: spacing.sm },
  muted: { ...typography.bodySmall, color: colors.textSecondary, textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: spacing.md, backgroundColor: colors.background },
  primaryButton: { minHeight: 44, paddingHorizontal: 18, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { ...typography.bodySmall, color: colors.primaryForeground, fontWeight: "800" },
});
