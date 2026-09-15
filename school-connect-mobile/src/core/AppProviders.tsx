import type { PropsWithChildren } from "react";

import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { queryClient } from "../config/queryClient";
import { AuthBootstrap } from "./AuthBootstrap";

export function AppProviders({
  children,
}: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthBootstrap>
          {children}
        </AuthBootstrap>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}