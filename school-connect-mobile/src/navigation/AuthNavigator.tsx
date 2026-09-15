import {
  createNativeStackNavigator
} from "@react-navigation/native-stack";

import type { AuthStackParamList } from "./types";

import { View, Text } from "react-native";

const Stack =
  createNativeStackNavigator<AuthStackParamList>();

function LoginScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <Text>Connexion</Text>
    </View>
  );
}

function OTPScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <Text>Vérification OTP</Text>
    </View>
  );
}

export function AuthNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          headerShown: false
        }}
      />

      <Stack.Screen
        name="OTP"
        component={OTPScreen}
        options={{
          title: "Vérification"
        }}
      />
    </Stack.Navigator>
  );
}