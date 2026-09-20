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

  const primaryClasses = classes.filter((item) => {
    const level = (item.level ?? "").toLowerCase();
    return level.includes("primaire") || /^(cp|ce1|ce2|ce3|ce4|cm1|cm2)\\b/.test(level);
  }).length;

  const firstCycleClasses = classes.filter((item) => {
    const level = (item.level ?? "").toLowerCase();
    return level.includes("premier cycle") || level.includes("collège") || /^(6e|5e|4e|3e)\\b/.test(level);
  }).length;

  const secondCycleClasses = classes.filter((item) => {
    const level = (item.level ?? "").toLowerCase();
    return level.includes("second cycle") || level.includes("lycée") || /^(2nde|seconde|1re|1ère|première|terminale)\\b/.test(level);
  }).length;
      sections={[
        {
          id: "school-management",
          title: "Vue d'ensemble",
          cards: [
            {
              id: "students",
              title: "Élèves",
              value: String(counts.students),
              description: "Élèves actifs cette année.",
              onPress: () => router.push("/(app)/students"),
            },
            {
              id: "teachers",
              title: "Enseignants",
              value: String(counts.teachers),
              description: "Enseignants actifs.",
              onPress: () => router.push("/(app)/teachers"),
            },
            {
              id: "classes",
              title: "Classes",
              value: String(classes.length),
              description: "Voir toutes les classes actives, regroupées par cycle.",
              onPress: () => router.push("/(app)/classes"),
            },
            {
              id: "staff",
              title: "Personnel",
              value: String(personnel.length),
              description: "Voir le personnel actif de l'établissement, regroupé par fonction.",
              onPress: () => router.push("/(app)/personnel"),
            },
          ],
        },
        {
          id: "quick-actions",
          title: "Ajouter",
          cards: [
            {
              id: "add-class",
              title: "Nouvelle classe",
              value: "+",
              description: "Créer une classe dans l'année active.",
              onPress: () => router.push("/(app)/class-create"),
            },
            {
              id: "add-personnel",
              title: "Nouveau personnel",
              value: "+",
              description: "Ajouter un membre du personnel.",
              onPress: () => router.push("/(app)/personnel-create"),
            },
            {
              id: "add-teacher",
              title: "Nouvel enseignant",
              value: "+",
              description: "Créer un compte enseignant.",
              onPress: () => router.push("/(app)/teacher-create"),
            },
          ],
        },
        {
          id: "daily-monitoring",
          title: "Suivi du jour",
          cards: [
            {
              id: "attendance",
              title: "Présences",
              value: String(attendance.recorded),
              description:
                `Présents ${attendance.present} · Absents ${attendance.absent} · Retards ${attendance.late} · Excusés ${attendance.excused}`,
            },
          ],
        },
      ]} { useEffect, useState } from "react";
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

  const primaryClasses = classes.filter((item) => {
    const level = (item.level ?? "").toLowerCase();
    return level.includes("primaire") || /^(cp|ce1|ce2|ce3|ce4|cm1|cm2)\\b/.test(level);
  }).length;

  const firstCycleClasses = classes.filter((item) => {
    const level = (item.level ?? "").toLowerCase();
    return level.includes("premier cycle") || level.includes("collège") || /^(6e|5e|4e|3e)\\b/.test(level);
  }).length;

  const secondCycleClasses = classes.filter((item) => {
    const level = (item.level ?? "").toLowerCase();
    return level.includes("second cycle") || level.includes("lycée") || /^(2nde|seconde|1re|1ère|première|terminale)\\b/.test(level);
  }).length;

