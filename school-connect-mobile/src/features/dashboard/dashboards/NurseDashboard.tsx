
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { RoleDashboard } from "./RoleDashboard";
import type { DashboardSectionData } from "../dashboard.types";
import { getMedicalDashboard, type MedicalDashboard } from "../../../services/medical/medical.service";

type NurseDashboardProps = {
  firstName: string;
};

export function NurseDashboard({ firstName }: NurseDashboardProps) {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<MedicalDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      setDashboard(await getMedicalDashboard());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard]),
  );

  const sections: DashboardSectionData[] = [
    {
      id: "medical-overview",
      title: "Suivi médical",
      cards: [
        {
          id: "total-people",
          title: "Personnes suivies",
          value: loading ? "…" : error ? "—" : String(dashboard?.people.total ?? 0),
          description: loading
            ? "Chargement des effectifs."
            : error
              ? "Impossible de charger les indicateurs médicaux."
              : String(dashboard?.people.students ?? 0) + " élèves · " + String(dashboard?.people.adults ?? 0) + " adultes",
        },
        {
          id: "completed-records",
          title: "Fiches renseignées",
          value: loading ? "…" : error ? "—" : String(dashboard?.records.completionRate ?? 0) + "%",
          description: loading
            ? "Calcul de la couverture médicale."
            : error
              ? "Indicateur indisponible."
              : String(dashboard?.records.completed ?? 0) + " fiche(s) renseignée(s) sur " + String(dashboard?.people.total ?? 0) + ".",
          onPress: () => router.push("/(app)/medical"),
        },
        {
          id: "missing-records",
          title: "Fiches à compléter",
          value: loading ? "…" : error ? "—" : String(dashboard?.records.missing ?? 0),
          description: "Personnes actives sans fiche médicale enregistrée.",
          onPress: () => router.push("/(app)/medical"),
        },
        {
          id: "vigilance",
          title: "Points de vigilance",
          value: loading ? "…" : error ? "—" : String((dashboard?.vigilance.allergies ?? 0) + (dashboard?.vigilance.medicalConditions ?? 0)),
          description: loading
            ? "Analyse des informations médicales."
            : error
              ? "Indicateur indisponible."
              : String(dashboard?.vigilance.allergies ?? 0) + " allergie(s) · " + String(dashboard?.vigilance.medicalConditions ?? 0) + " antécédent(s)/pathologie(s).",
          onPress: () => router.push("/(app)/medical"),
        },
      ],
    },
    {
      id: "medical-actions",
      title: "Actions",
      cards: [
        {
          id: "medical-calendar",
          title: "Suivi médical",
          value: "Calendrier",
          description: "Planifier les consultations, visites et suivis réalisés à l'école.",
          onPress: () => router.push("/(app)/medical-calendar"),
        },
        {
          id: "open-files",
          title: "Fiches médicales",
          value: "Ouvrir",
          description: "Consulter et mettre à jour les dossiers médicaux de l'établissement.",
          onPress: () => router.push("/(app)/medical"),
        },
        {
          id: "medical-reports",
          title: "Rapports médicaux",
          value: "Nouveau",
          description: "Documenter les passages, incidents, consultations et suivis médicaux.",
          onPress: () => router.push("/(app)/medical-reports"),
        },
        {
          id: "medical-history",
          title: "Historique",
          value: loading ? "…" : error ? "—" : String(dashboard?.recentChanges ?? 0),
          description: "Modifications enregistrées au cours des 30 derniers jours.",
          onPress: () => router.push("/(app)/medical-history"),
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <RoleDashboard
        firstName={firstName}
        title="Espace infirmier"
        subtitle="Suivez la couverture médicale et les dossiers de l'établissement."
        sections={sections}
      />

      {!loading && error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Données médicales indisponibles</Text>
          <Text style={styles.errorText}>
            Vérifiez votre accès infirmier puis actualisez le tableau de bord.
          </Text>
          <Pressable onPress={() => void loadDashboard()} style={styles.retryButton}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color="#344976" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { position: "absolute", top: 10, right: 18 },
  errorCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  errorTitle: { fontSize: 13, fontWeight: "900", color: "#991B1B" },
  errorText: { marginTop: 4, fontSize: 12, lineHeight: 17, color: "#B91C1C" },
  retryButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: "#344976",
  },
  retryText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
});
