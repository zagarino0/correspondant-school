import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {  useState } from "react";
import { useRouter } from "expo-router";

import { useAuthStore } from "../../stores/authStore";


export default function AppHomeScreen() {


  const router = useRouter();

  const user = useAuthStore(
    (state) => state.user,
  );

  const logout = useAuthStore(
    (state) => state.logout,
  );

  const [isLoggingOut, setIsLoggingOut] =
    useState(false);

 

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await logout();
      router.replace("/(auth)/login");
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        School Connect
      </Text>

      <Text style={styles.subtitle}>
        Espace connecté
      </Text>

      {user && (
        <Text style={styles.user}>
          {user.firstName} {user.lastName}
        </Text>
      )}

      <Pressable
        style={styles.logoutButton}
        onPress={handleLogout}
        disabled={isLoggingOut}
      >
        {isLoggingOut ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.logoutText}>
            Se déconnecter
          </Text>
        )}
      </Pressable>
    
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F7F6F2",
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#11110F",
  },

  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: "#66645E",
  },

  user: {
    marginTop: 16,
    fontSize: 16,
    color: "#11110F",
  },

  logoutButton: {
    marginTop: 32,
    minWidth: 180,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#11110F",
  },

  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  testButton: {
  marginTop: 16,
  minWidth: 180,
  paddingVertical: 14,
  paddingHorizontal: 24,
  alignItems: "center",
  borderRadius: 10,
  backgroundColor: "#66645E",
},


});