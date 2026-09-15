import {
  PropsWithChildren,
  useEffect,
} from "react";

import { getSession } from "../services/storage/secureStorage";
import { useAuthStore } from "../stores/authStore";

export function AuthBootstrap({
  children,
}: PropsWithChildren) {
  const setSession = useAuthStore(
    (state) => state.setSession,
  );

  const clearSession = useAuthStore(
    (state) => state.clearSession,
  );

  const setLoading = useAuthStore(
    (state) => state.setLoading,
  );

  useEffect(() => {
    async function bootstrap() {
      try {
       const session = await getSession();

          if (session) {
            setSession(session);

            const refreshUser =
              useAuthStore.getState().refreshUser;

            await refreshUser();

            return;
          }

          clearSession();
        clearSession();
      } catch (error) {
        console.error(
          "Auth bootstrap error:",
          error,
        );

        clearSession();
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, [
    clearSession,
    setLoading,
    setSession,
  ]);

  return children;
}