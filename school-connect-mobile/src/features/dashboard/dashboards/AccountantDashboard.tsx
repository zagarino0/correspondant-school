import { useRouter } from "expo-router";
import { useAuthStore } from "../../../stores/authStore";
import { RoleDashboard } from "./RoleDashboard";

const EMPTY_PERMISSIONS: readonly string[] = [];

type AccountantDashboardProps = {
  firstName: string;
};

type AccountantCard = {
  id: string;
  title: string;
  description: string;
  permission: string;
  onPress?: () => void;
};

type AccountantSection = {
  id: string;
  title: string;
  cards: AccountantCard[];
};

/**
 * Dashboard métier de la Comptabilité / Économie.
 *
 * Le dashboard n'accorde aucune permission : il expose uniquement
 * les capacités financières déjà accordées par le backend.
 */
export function AccountantDashboard({
  firstName,
}: AccountantDashboardProps) {
  const router = useRouter();
  const permissions = useAuthStore(
    (state) => state.user?.permissions ?? EMPTY_PERMISSIONS,
  );

  const can = (permission: string) => permissions.includes(permission);

  const sections: AccountantSection[] = [
    {
      id: "accounting-finance",
      title: "Finance",
      cards: [
        {
          id: "invoices",
          title: "Factures",
          description:
            "Consulter les factures, les montants déjà payés et les soldes restant dus.",
          permission: "invoice.read",
          onPress: () => router.push("/(app)/finance-invoices"),
        },
        {
          id: "payments",
          title: "Paiements",
          description:
            "Consulter, enregistrer et mettre à jour les paiements selon les droits comptables.",
          permission: "payment.read",
          onPress: () => router.push("/(app)/secretariat-payments"),
        },
        {
          id: "documents",
          title: "Documents",
          description:
            "Consulter les documents nécessaires au traitement administratif et financier.",
          permission: "document.read",
          onPress: () => router.push("/(app)/secretariat-documents"),
        },
      ],
    },
    {
      id: "accounting-support",
      title: "Suivi",
      cards: [
        {
          id: "students",
          title: "Élèves",
          description:
            "Consulter les informations minimales nécessaires au traitement des paiements.",
          permission: "student.read",
          onPress: () => router.push("/(app)/students"),
        },
        {
          id: "tickets",
          title: "Demandes internes",
          description:
            "Créer, consulter et suivre les demandes internes liées à l'activité.",
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
      title="Comptabilité"
      subtitle="Gérez les opérations financières autorisées de l'établissement."
      sections={visibleSections}
    />
  );
}
