import type { AuthSession } from "../../types/auth";
import type { AuthUser } from "../../types/auth";
export type LoginResponse = {
  session: AuthSession;
};
export type AuthMeResponse = {
  user: AuthUser & {
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  };
};