import { RoleDashboard } from "./RoleDashboard";

type SuperAdminDashboardProps = {
  firstName: string;
};

export function SuperAdminDashboard({
  firstName,
}: SuperAdminDashboardProps) {
  return (
    <RoleDashboard
      firstName={firstName}
      title="Administration globale"
      subtitle="administrez la plateforme School Connect."
      sections={[
        {
          id: "platform-management",
          title: "Plateforme",
          cards: [
            {
              id: "schools",
              title: "Établissements",
              description: "Gérer les établissements de la plateforme.",
            },
            {
              id: "users",
              title: "Utilisateurs",
              description: "Administrer les comptes et leurs rôles.",
            },
            {
              id: "reports",
              title: "Rapports",
              description: "Consulter les indicateurs de la plateforme.",
            },
            {
              id: "system",
              title: "Système",
              description: "Superviser la configuration et les services.",
            },
          ],
        },
        {
          id: "platform-communication",
          title: "Communication",
          cards: [
            {
              id: "announcements",
              title: "Annonces",
              description: "Superviser les communications de la plateforme.",
            },
            {
              id: "messages",
              title: "Messages",
              description: "Accéder aux échanges autorisés.",
            },
          ],
        },
      ]}
    />
  );
}
