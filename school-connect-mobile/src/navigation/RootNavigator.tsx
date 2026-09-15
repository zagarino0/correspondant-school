import {
  NavigationContainer
} from "@react-navigation/native";

import {
  createNativeStackNavigator
} from "@react-navigation/native-stack";

import { AuthNavigator } from "./AuthNavigator";
import { ParentNavigator } from "./ParentNavigator";

const Stack =
  createNativeStackNavigator();

export function RootNavigator() {
  const isAuthenticated = false;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen
            name="Auth"
            component={AuthNavigator}
          />
        ) : (
          <Stack.Screen
            name="App"
            component={ParentNavigator}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}