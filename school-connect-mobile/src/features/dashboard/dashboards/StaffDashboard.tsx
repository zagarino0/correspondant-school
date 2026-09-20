import { RoleDashboard } from "./RoleDashboard";
import { MedicalAccessCard } from "../components/MedicalAccessCard";

type StaffDashboardProps = {
  firstName: string;
};

export function StaffDashboard({ firstName }: StaffDashboardProps) {
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
