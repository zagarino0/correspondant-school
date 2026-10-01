import { useRouter } from "expo-router";
import { useAuthStore } from "../../../stores/authStore";
import { RoleDashboard } from "./RoleDashboard";

const EMPTY_PERMISSIONS: readonly string[] = [];

type SecretaryDashboardProps = {
  firstName: string;
};

type SecretaryCard = {
  id: string;
  title: string;
  description: string;
  permission: string;
  onPress?: () => void;
};

type SecretarySection = {
  id: string;
  title: string;
  cards: SecretaryCard[];
};

/**
 * Dashboard métier du Secrétariat.
 *
 * Le dashboard n'accorde aucune permission : il ne fait qu'exposer
 * les capacités déjà accordées par le backend dans user.permissions.
 * L'API reste l'autorité finale via authorize(...).
 */
export function SecretaryDashboard({
  firstName,
}: SecretaryDashboardProps) {
  const router = useRouter();
  const permissions = useAuthStore(
    (state) => state.user?.permissions ?? EMPTY_PERMISSIONS,
  );

  const can = (permission: string) => permissions.includes(permission);

  const sections: SecretarySection[] = [
    {
      id: "secretariat-dossiers",
      title: "Dossiers scolaires",
      cards: [
        {
          id: "students",
          title: "Élèves",
          description:
            "Rechercher, consulter et gérer les informations administratives des élèves.",
          permission: "student.read",
          onPress: () => router.push("/(app)/students"),
        },
        {
          id: "classes",
          title: "Classes",
          description:
            "Consulter les classes et leurs effectifs de l'établissement.",
          permission: "school.read",
          onPress: () => router.push("/(app)/classes"),
        },
        {
          id: "personnel",
          title: "Personnel",
          description:
            "Consulter l'annuaire du personnel de l'établissement.",
          permission: "user.read",
          onPress: () => router.push("/(app)/personnel"),
        },
        {
          id: "attendance",
          title: "Présences",
          description:
            "Consulter les présences, absences et retards enregistrés.",
          permission: "attendance.read",
          onPress: () => router.push("/(app)/secretariat-attendance"),
        },
        {
          id: "schedule",
          title: "Emploi du temps",
          description:
            "Consulter les emplois du temps nécessaires au suivi administratif.",
          permission: "schedule.read",
          onPress: () => router.push("/(app)/schedule"),
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
          permission: "announcement.read",
          onPress: () => router.push("/(app)/announcements"),
        },
        {
          id: "messages",
          title: "Messages",
          description:
            "Lire et envoyer les messages dans le cadre administratif.",
          permission: "message.read",
          onPress: () => router.push("/(app)/messages"),
        },
      ],
    },
    {
      id: "secretariat-administration",
      title: "Administration",
      cards: [
        {
          id: "authorizations",
          title: "Autorisations",
          description:
            "Consulter et suivre les demandes d'autorisation sans prendre la décision.",
          permission: "authorization.read",
          onPress: () => router.push("/(app)/secretariat-authorizations"),
        },
        {
          id: "documents",
          title: "Documents",
          description:
            "Consulter et préparer les documents administratifs.",
          permission: "document.read",
          onPress: () => router.push("/(app)/secretariat-documents"),
        },
        {
          id: "meetings",
          title: "Rendez-vous",
          description:
            "Consulter et gérer les rendez-vous administratifs.",
          permission: "meeting.read",
          onPress: () => router.push("/(app)/secretariat-meetings"),
        },
        {
          id: "payments",
          title: "Paiements",
          description:
            "Consulter et enregistrer les paiements autorisés au Secrétariat.",
          permission: "payment.read",
          onPress: () => router.push("/(app)/secretariat-payments"),
        },
        {
          id: "tickets",
          title: "Demandes internes",
          description:
            "Créer, consulter et suivre les demandes administratives internes.",
          permission: "ticket.read",
          onPress: () => router.push("/(app)/secretariat-tickets"),
        },
      ],
    },
  ];

  const visibleSections = sections
    .map((section) => ({
      ...section,
      cards: section.cards
        .filter((card) => can(card.permission))
        .map(({ permission: _permission, ...card }) => card),
    }))
    .filter((section) => section.cards.length > 0);

  return (
    <RoleDashboard
      firstName={firstName}
      title="Secrétariat"
      subtitle="Gérez les opérations administratives courantes de l'établissement."
      sections={visibleSections}
    />
  );
}
