import {
  createBottomTabNavigator
} from "@react-navigation/bottom-tabs";

import type { ParentTabParamList } from "./types";

import { View, Text } from "react-native";

const Tab =
  createBottomTabNavigator<ParentTabParamList>();

function HomeScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <Text>Accueil</Text>
    </View>
  );
}

function MessagesScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <Text>Messages</Text>
    </View>
  );
}

function AIScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <Text>Assistant IA</Text>
    </View>
  );
}

function ProfileScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <Text>Profil</Text>
    </View>
  );
}

export function ParentNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Accueil"
        component={HomeScreen}
      />

      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
      />

      <Tab.Screen
        name="Assistant"
        component={AIScreen}
      />

      <Tab.Screen
        name="Profil"
        component={ProfileScreen}
      />
    </Tab.Navigator>
  );
}