import { RoleDashboard } from "./RoleDashboard";
import { MedicalAccessCard } from "../components/MedicalAccessCard";
import { NurseDashboard } from "./NurseDashboard";
import { SurveillantDashboard } from "./SurveillantDashboard";
import { AccountantDashboard } from "./AccountantDashboard";
import { SecretaryDashboard } from "./SecretaryDashboard";
import type { StaffFunction } from "../../../types/auth";

type StaffDashboardProps = {
  firstName: string;
  staffFunction?: StaffFunction | null;
};

export function StaffDashboard({
  firstName,
  staffFunction,
}: StaffDashboardProps) {
  if (staffFunction === "INFIRMIER") {
    return <NurseDashboard firstName={firstName} />;
  }

  if (staffFunction === "SURVEILLANT") {
    return <SurveillantDashboard firstName={firstName} />;
  }

  if (staffFunction === "SECRETARIAT") {
    return <SecretaryDashboard firstName={firstName} />;
  }

  if (staffFunction === "COMPTABILITE") {
    return <AccountantDashboard firstName={firstName} />;
  }

  return (
    <>
      <RoleDashboard
        firstName={firstName}
        title="Espace personnel"
        subtitle="Accédez aux opérations qui vous concernent."
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
