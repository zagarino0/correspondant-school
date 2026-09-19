import { RoleDashboard } from "./RoleDashboard";

type ParentDashboardProps = {
  firstName: string;
};

export function ParentDashboard({ firstName }: ParentDashboardProps) {
  return (
    <RoleDashboard
      firstName={firstName}
      title="Espace parent"
      subtitle="suivez la scolarité de votre enfant."
      sections={[
        {
          id: "parent-follow-up",
          title: "Suivi scolaire",
          cards: [
            {
              id: "children",
              title: "Mes enfants",
              description: "Accéder aux profils et informations scolaires.",
            },
            {
              id: "attendance",
              title: "Présences",
              description: "Consulter les absences et retards.",
            },
            {
              id: "results",
              title: "Résultats",
              description: "Consulter les notes et résultats scolaires.",
            },
            {
              id: "assignments",
              title: "Devoirs",
              description: "Suivre les devoirs et travaux à venir.",
            },
          ],
        },
        {
          id: "parent-communication",
          title: "Communication",
          cards: [
            {
              id: "schedule",
              title: "Emploi du temps",
              description: "Consulter le planning scolaire.",
            },
            {
              id: "announcements",
              title: "Annonces",
              description: "Retrouver les informations de l'établissement.",
            },
            {
              id: "messages",
              title: "Messages",
              description: "Échanger avec l'établissement.",
            },
          ],
        },
      ]}
    />
  );
}
