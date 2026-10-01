import { useRouter } from "expo-router";
import { RoleDashboard } from "./RoleDashboard";

type SecretaryDashboardProps = {
  firstName: string;
};

export function SecretaryDashboard({
  firstName,
}: SecretaryDashboardProps) {
  const router = useRouter();

  return (
    <RoleDashboard
      firstName={firstName}
      title="Secrétariat"
      subtitle="Gérez les opérations administratives courantes de l'établissement."
      sections={[
        {
          id: "secretariat-dossiers",
          title: "Dossiers scolaires",
          cards: [
            {
              id: "students",
              title: "Élèves",
              description:
                "Rechercher et consulter les dossiers des élèves de l'établissement.",
              onPress: () => router.push("/(app)/students"),
            },
            {
              id: "classes",
              title: "Classes",
              description:
                "Consulter les classes et leurs effectifs pour l'année active.",
              onPress: () => router.push("/(app)/classes"),
            },
            {
              id: "personnel",
              title: "Personnel",
              description:
                "Consulter l'annuaire du personnel de l'établissement.",
              onPress: () => router.push("/(app)/personnel"),
            },
          ],
        },
        {
          id: "secretariat-communication",
          title: "Communication",
          cards: [
            {
              id: "announcements",
              title: "Annonces",
              description:
                "Consulter les informations et communications diffusées par l'établissement.",
              onPress: () => router.push("/(app)/announcements"),
            },
            {
              id: "messages",
              title: "Messages",
              description:
                "Accéder aux échanges avec les autres utilisateurs de l'établissement.",
              onPress: () => router.push("/(app)/messages"),
            },
          ],
        },
        {
          id: "secretariat-permissions",
          title: "Demandes administratives",
          cards: [
            {
              id: "authorizations",
              title: "Autorisations",
              description:
                "Suivre les demandes d'autorisation. Le Secrétariat ne prend pas la décision.",
            },
            {
              id: "documents",
              title: "Documents",
              description:
                "Espace réservé aux documents administratifs lorsque le module documentaire sera disponible.",
            },
          ],
        },
      ]}
    />
  );
}
