import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { RoleDashboard } from "./RoleDashboard";
import { MedicalAccessCard } from "../components/MedicalAccessCard";
import { NurseDashboard } from "./NurseDashboard";
import { getMedicalAccess } from "../../../services/medical/medical.service";

type StaffDashboardProps = {
  firstName: string;
};

export function StaffDashboard({ firstName }: StaffDashboardProps) {
  const [isNurse, setIsNurse] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    void getMedicalAccess()
      .then((access) => {
        if (mounted) {
          setIsNurse(access.allowed && access.mode === "FULL");
        }
      })
      .catch(() => {
        if (mounted) setIsNurse(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (isNurse === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#344976" />
        <Text style={styles.loadingText}>Chargement de votre espace…</Text>
      </View>
    );
  }

  if (isNurse) {
    return <NurseDashboard firstName={firstName} />;
  }

  return (
    <>
      <RoleDashboard
      firstName={firstName}
      title="Espace personnel"
      subtitle="accédez aux opérations qui vous concernent."
      sections={[
        {
          id: "staff-operations",
          title: "Opérations",
          cards: [
            {
              id: "students",
              title: "Élèves",
              description: "Accéder aux informations des élèves.",
            },
            {
              id: "attendance",
              title: "Présences",
              description: "Consulter et suivre les présences.",
            },
            {
              id: "classes",
              title: "Classes",
              description: "Consulter les classes de l'établissement.",
            },
          ],
        },
      ]}
      />
      <MedicalAccessCard />
    </>
  );
}


const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: "#64748B",
  },
});
