import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { RoleDashboard } from "./RoleDashboard";
import { getSchoolAdminDashboard } from "../../../services/school-admin/school-admin.service";
import type { SchoolAdminDashboardResponse } from "../../../services/school-admin/school-admin.types";

type SchoolAdminDashboardProps = {
  firstName: string;
};

const STAFF_FUNCTION_LABELS: Record<string, string> = {
  ADMINISTRATION: "Administration",
  SURVEILLANT: "Surveillance",
  SECRETARIAT: "Secrétariat",
  COMPTABILITE: "Comptabilité",
  INFIRMIER: "Infirmerie",
};

export function SchoolAdminDashboard({
  firstName,
}: SchoolAdminDashboardProps) {
  const router = useRouter();
  const [dashboard, setDashboard] =
    useState<SchoolAdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);

        const data = await getSchoolAdminDashboard();

        if (mounted) {
          setDashboard(data);
        }
      } catch {
        if (mounted) {
          setError(
            "Impossible de charger les indicateurs de l'établissement.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={styles.stateText}>
          Chargement du tableau de bord...
        </Text>
      </View>
    );
  }

  if (error || !dashboard) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.errorTitle}>Tableau de bord indisponible</Text>
        <Text style={styles.stateText}>
          {error ?? "Les données de l'établissement sont indisponibles."}
        </Text>
      </View>
    );
  }

  const { counts, attendance, classes, personnel } = dashboard;


