import { RoleDashboard } from "./RoleDashboard";

type SchoolAdminDashboardProps = {
  firstName: string;
};

export function SchoolAdminDashboard({
  firstName,
}: SchoolAdminDashboardProps) {
  return (
    <RoleDashboard
      firstName={firstName}
      title="Administration scolaire"
      subtitle="pilotez les activités de votre établissement."
      sections={[
        {
          id: "school-management",
          title: "Gestion de l'établissement",
          cards: [
            {
              id: "students",
              title: "Élèves",
              description: "Gérer les élèves et leurs informations.",
            },
            {
              id: "teachers",
              title: "Enseignants",
              description: "Gérer les enseignants de l'établissement.",
            },
            {
              id: "classes",
              title: "Classes",
              description: "Organiser les classes et affectations.",
            },
            {
              id: "staff",
              title: "Personnel",
              description: "Gérer les membres du personnel.",
            },
          ],
        },
        {
          id: "school-communication",
          title: "Communication",
          cards: [
            {
              id: "announcements",
              title: "Annonces",
              description: "Gérer les communications de l'établissement.",
            },
            {
              id: "messages",
              title: "Messages",
              description: "Suivre les échanges avec la communauté scolaire.",
            },
            {
              id: "reports",
              title: "Rapports",
              description: "Accéder aux indicateurs et rapports scolaires.",
            },
          ],
        },
      ]}
    />
  );
}
