import { RoleDashboard } from "./RoleDashboard";

type TeacherDashboardProps = {
  firstName: string;
};

export function TeacherDashboard({ firstName }: TeacherDashboardProps) {
  return (
    <RoleDashboard
      firstName={firstName}
      title="Espace enseignant"
      subtitle="retrouvez vos activités pédagogiques."
      sections={[
        {
          id: "teacher-work",
          title: "Activité pédagogique",
          cards: [
            {
              id: "classes",
              title: "Mes classes",
              description: "Accéder à vos classes et élèves.",
            },
            {
              id: "schedule",
              title: "Emploi du temps",
              description: "Consulter vos cours et horaires.",
            },
            {
              id: "assignments",
              title: "Devoirs",
              description: "Préparer et suivre les travaux des élèves.",
            },
            {
              id: "attendance",
              title: "Présences",
              description: "Gérer les présences et absences.",
            },
          ],
        },
        {
          id: "teacher-communication",
          title: "Communication",
          cards: [
            {
              id: "announcements",
              title: "Annonces",
              description: "Publier et consulter les informations scolaires.",
            },
            {
              id: "messages",
              title: "Messages",
              description: "Échanger avec les parents et l'établissement.",
            },
          ],
        },
      ]}
    />
  );
}
