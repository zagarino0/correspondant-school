import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { colors, radius, spacing, typography } from "../../theme";
import { useAuthStore } from "../../stores/authStore";
import {
  allocateFinancialPayment,
  getFinancialInvoice,
  getFinancialPayments,
} from "../../services/finance/finance.service";
import type {
  FinancialInvoice,
  FinancialPayment,
} from "../../services/finance/finance.types";

function money(value: string | number, currency: string) {
  return `${Number(value).toLocaleString("fr-FR")} ${currency}`;
}

export default function FinanceInvoiceDetailScreen() {
  const router = useRouter();
  const { invoiceId } = useLocalSearchParams<{ invoiceId?: string }>();
  const user = useAuthStore((state) => state.user);
  const permissions = user?.permissions ?? [];

  const [invoice, setInvoice] = useState<FinancialInvoice | null>(null);
  const [payments, setPayments] = useState<FinancialPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);
  const [showAllocation, setShowAllocation] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState("");
  const [allocationAmount, setAllocationAmount] = useState("");

  const load = useCallback(async () => {
    if (!invoiceId) return;
    try {
      const [invoiceResult, paymentsResult] = await Promise.all([
        getFinancialInvoice(invoiceId),
        getFinancialPayments(),
      ]);
      setInvoice(invoiceResult);
      setPayments(paymentsResult.payments.filter((payment) => payment.status === "RECORDED"));
    } catch {
      Alert.alert("Erreur", "Impossible de charger la facture.");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedPayment = useMemo(
    () => payments.find((payment) => payment.id === selectedPaymentId) ?? null,
    [payments, selectedPaymentId],
  );

  const openAllocation = () => {
    if (!invoice || Number(invoice.balanceAmount) <= 0) return;
    setSelectedPaymentId("");
    setAllocationAmount("");
    setShowAllocation(true);
  };

  const submitAllocation = async () => {
    if (!invoice || !selectedPaymentId) {
      Alert.alert("Paiement requis", "Sélectionnez un paiement à affecter.");
      return;
    }

    const amount = Number(allocationAmount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Montant invalide", "Saisissez un montant positif.");
      return;
    }

    if (selectedPayment && selectedPayment.currency !== invoice.currency) {
      Alert.alert("Devise incompatible", "La devise du paiement doit correspondre à celle de la facture.");
      return;
    }

    try {
      setAllocating(true);
      const result = await allocateFinancialPayment(selectedPaymentId, {
        invoiceId: invoice.id,
        amount,
      });

      Alert.alert(
        "Affectation enregistrée",
        `Paiement restant : ${money(result.paymentAvailable, invoice.currency)}\nSolde facture : ${money(result.invoiceBalance, invoice.currency)}`,
      );
      setShowAllocation(false);
      setSelectedPaymentId("");
      setAllocationAmount("");
      await load();
    } catch (error: any) {
      const code = error?.response?.data?.error?.code;
      const message =
        code === "PAYMENT_AMOUNT_EXCEEDED"
          ? "Le montant dépasse le montant encore disponible sur ce paiement."
          : code === "INVOICE_BALANCE_EXCEEDED"
            ? "Le montant dépasse le solde restant de la facture."
            : error?.response?.data?.error?.message ?? "L'affectation n'a pas pu être enregistrée.";
      Alert.alert("Affectation impossible", message);
    } finally {
      setAllocating(false);
    }
  };

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

  if (loading || !invoice) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.muted}>Chargement de la facture…</Text>
      </View>
    );
  }

  const remaining = Number(invoice.balanceAmount);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Retour">
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>{invoice.number}</Text>
          <Text style={styles.subtitle}>
            {invoice.student.lastName} {invoice.student.firstName} · {invoice.student.studentNumber}
          </Text>
        </View>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total facture</Text>
          <Text style={styles.summaryValue}>{money(invoice.totalAmount, invoice.currency)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Montant payé</Text>
          <Text style={[styles.summaryValue, styles.success]}>{money(invoice.allocatedAmount, invoice.currency)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Solde restant</Text>
          <Text style={[styles.summaryValue, remaining > 0 ? styles.warning : styles.success]}>
            {money(invoice.balanceAmount, invoice.currency)}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Informations</Text>
        <InfoRow label="Statut" value={invoice.status} />
        <InfoRow label="Date d'émission" value={new Date(invoice.issueDate).toLocaleDateString("fr-FR")} />
        {invoice.dueDate ? <InfoRow label="Échéance" value={new Date(invoice.dueDate).toLocaleDateString("fr-FR")} /> : null}
        <InfoRow label="Élève" value={`${invoice.student.lastName} ${invoice.student.firstName}`} />
        <InfoRow label="Matricule" value={invoice.student.studentNumber} />
        {invoice.notes ? <InfoRow label="Note" value={invoice.notes} /> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Lignes de facture</Text>
        {invoice.items.map((item) => (
          <View key={item.id} style={styles.lineItem}>
            <View style={styles.lineIdentity}>
              <Text style={styles.lineLabel}>{item.label}</Text>
              {item.category ? <Text style={styles.muted}>{item.category}</Text> : null}
            </View>
            <View style={styles.lineAmounts}>
              <Text style={styles.muted}>{Number(item.quantity).toLocaleString("fr-FR")} × {money(item.unitAmount, invoice.currency)}</Text>
              <Text style={styles.lineTotal}>{money(item.totalAmount, invoice.currency)}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Paiements affectés</Text>
        {invoice.allocations.length === 0 ? (
          <Text style={styles.muted}>Aucun paiement affecté à cette facture.</Text>
        ) : (
          invoice.allocations.map((allocation) => (
            <View key={allocation.id} style={styles.allocationRow}>
              <View>
                <Text style={styles.lineLabel}>Paiement</Text>
                <Text style={styles.muted}>{new Date(allocation.createdAt).toLocaleString("fr-FR")}</Text>
              </View>
              <Text style={styles.lineTotal}>{money(allocation.amount, invoice.currency)}</Text>
            </View>
          ))
        )}
      </View>

      {permissions.includes("payment-allocation.create") && remaining > 0 ? (
        <View style={styles.card}>
          <Pressable style={styles.primaryButton} onPress={openAllocation}>
            <Text style={styles.primaryButtonText}>Affecter un paiement</Text>
          </Pressable>

          {showAllocation ? (
            <View style={styles.allocationForm}>
              <Text style={styles.formTitle}>Sélectionner un paiement</Text>
              {payments.length === 0 ? (
                <Text style={styles.muted}>Aucun paiement enregistré et disponible à sélectionner.</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paymentChoices}>
                  {payments.map((payment) => (
                    <Pressable
                      key={payment.id}
                      onPress={() => {
                        setSelectedPaymentId(payment.id);
                        setAllocationAmount("");
                      }}
                      style={[
                        styles.paymentChoice,
                        selectedPaymentId === payment.id && styles.paymentChoiceActive,
                      ]}
                    >
                      <Text style={styles.paymentChoiceAmount}>
                        {money(payment.amount, payment.currency)}
                      </Text>
                      <Text style={styles.paymentChoiceMeta}>{payment.method}</Text>
                      <Text style={styles.paymentChoiceMeta}>
                        {payment.student ? `${payment.student.lastName} ${payment.student.firstName}` : "Sans élève"}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}

              {selectedPayment ? (
                <>
                  <Text style={styles.formLabel}>Montant à affecter</Text>
                  <TextInput
                    value={allocationAmount}
                    onChangeText={setAllocationAmount}
                    placeholder="Montant"
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                  <Text style={styles.muted}>
                    Paiement sélectionné : {money(selectedPayment.amount, selectedPayment.currency)}
                  </Text>
                  <Pressable
                    disabled={allocating}
                    style={[styles.primaryButton, allocating && styles.disabledButton]}
                    onPress={() => void submitAllocation()}
                  >
                    {allocating ? (
                      <ActivityIndicator color={colors.primaryForeground} />
                    ) : (
                      <Text style={styles.primaryButtonText}>Confirmer l'affectation</Text>
                    )}
                  </Pressable>
                </>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 48, gap: spacing.md },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  headerText: { flex: 1 },
  back: { fontSize: 36, color: colors.primaryDark, lineHeight: 36 },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  summary: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
  },
  summaryItem: { flex: 1, minWidth: 0 },
  summaryLabel: { ...typography.caption, color: colors.primaryForeground, opacity: 0.82 },
  summaryValue: { ...typography.bodySmall, color: colors.primaryForeground, fontWeight: "800", marginTop: 4 },
  success: { color: colors.success },
  warning: { color: colors.warningSoft },
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  sectionTitle: { ...typography.heading, color: colors.text, fontSize: 18 },
  infoRow: { flexDirection: "row", gap: spacing.md, paddingVertical: 5 },
  infoLabel: { width: 110, ...typography.caption, color: colors.textMuted },
  infoValue: { flex: 1, ...typography.bodySmall, color: colors.text, fontWeight: "700" },
  lineItem: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  lineIdentity: { flex: 1, minWidth: 0 },
  lineLabel: { ...typography.bodySmall, color: colors.text, fontWeight: "800" },
  lineAmounts: { alignItems: "flex-end" },
  lineTotal: { ...typography.bodySmall, color: colors.text, fontWeight: "900", marginTop: 2 },
  allocationRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  muted: { ...typography.bodySmall, color: colors.textSecondary },
  primaryButton: { minHeight: 46, paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { ...typography.bodySmall, color: colors.primaryForeground, fontWeight: "800" },
  allocationForm: { gap: spacing.sm, marginTop: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  formTitle: { ...typography.heading, color: colors.text, fontSize: 17 },
  formLabel: { ...typography.caption, color: colors.text, marginTop: spacing.sm },
  paymentChoices: { gap: spacing.sm, paddingVertical: 4 },
  paymentChoice: { width: 170, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  paymentChoiceActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  paymentChoiceAmount: { ...typography.bodySmall, color: colors.text, fontWeight: "900" },
  paymentChoiceMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  input: { minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, backgroundColor: colors.surface, color: colors.text, ...typography.bodySmall },
  disabledButton: { opacity: 0.6 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md, backgroundColor: colors.background },
});
