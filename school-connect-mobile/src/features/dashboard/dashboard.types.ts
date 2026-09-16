import type { UserRole } from "../../types/auth";

export type DashboardShellProps = {
  role: UserRole;
  firstName: string;
  onLogout: () => void;
};

export type DashboardCardData = {
  id: string;
  title: string;
  value?: string;
  description?: string;
  onPress?: () => void;
};

export type DashboardSectionData = {
  id: string;
  title: string;
  cards: DashboardCardData[];
};
