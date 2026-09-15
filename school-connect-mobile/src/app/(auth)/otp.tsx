import {
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function OtpScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Vérification
      </Text>

      <Text style={styles.subtitle}>
        Entrez le code reçu.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
});