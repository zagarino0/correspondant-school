import type { ReactNode } from "react";
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
  badge?: string;
  description?: string;
  onPress?: () => void;
  content?: ReactNode;
  fullWidth?: boolean;
};

export type DashboardSectionData = {
  id: string;
  title: string;
  cards: DashboardCardData[];
};
