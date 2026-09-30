import { Redirect, Stack } from "expo-router";

import { useAuthStore } from "../../../stores/authStore";

export default function SurveillantLayout() {
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  // Les écrans /surveillant sont exclusivement réservés
  // au personnel dont la fonction est SURVEILLANT.
  if (user?.role !== "STAFF" || user.staffFunction !== "SURVEILLANT") {
    return <Redirect href="/(app)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
      }}
    />
  );
}
