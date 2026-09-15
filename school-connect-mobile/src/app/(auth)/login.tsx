import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useRouter } from "expo-router";
import {
  loginSchema,
  type LoginFormData,
} from "../../features/auth/auth.schema";

import { login } from "../../services/auth/auth.service";
import { useAuthStore } from "../../stores/authStore";

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
const router = useRouter();

const setSession = useAuthStore(
  (state) => state.setSession,
);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });


  //bouton submit handler
const onSubmit = async (data: LoginFormData) => {
  try {
    const session = await login(
      data.email,
      data.password,
    );

    setSession(session);

    router.replace("/(app)");
  } catch (error) {
    console.error("Login failed:", error);
  }
};

  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.brand}>SCHOOL CONNECT</Text>

            <Text style={styles.title}>
              Bienvenue
            </Text>

            <Text style={styles.subtitle}>
              Connectez-vous à votre espace scolaire.
            </Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.field}>
                  <Text style={styles.label}>
                    Adresse e-mail
                  </Text>

                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="parent@example.com"
                    placeholderTextColor="#92908A"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    editable={!isSubmitting}
                    style={[
                      styles.input,
                      errors.email && styles.inputError,
                    ]}
                  />

                  {errors.email && (
                    <Text style={styles.error}>
                      {errors.email.message}
                    </Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.field}>
                  <Text style={styles.label}>
                    Mot de passe
                  </Text>

                  <View
                    style={[
                      styles.passwordContainer,
                      errors.password && styles.inputError,
                    ]}
                  >
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Votre mot de passe"
                      placeholderTextColor="#92908A"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isSubmitting}
                      style={styles.passwordInput}
                    />

                    <Pressable
                      onPress={() =>
                        setShowPassword((current) => !current)
                      }
                      disabled={isSubmitting}
                      style={styles.passwordButton}
                    >
                      <Text style={styles.passwordButtonText}>
                        {showPassword ? "Masquer" : "Afficher"}
                      </Text>
                    </Pressable>
                  </View>

                  {errors.password && (
                    <Text style={styles.error}>
                      {errors.password.message}
                    </Text>
                  )}
                </View>
              )}
            />

            <Pressable
              disabled={isSubmitting}
              style={styles.forgotButton}
            >
              <Text style={styles.forgotText}>
                Mot de passe oublié ?
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              style={[
                styles.loginButton,
                isSubmitting && styles.loginButtonDisabled,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator
                  color="#FFFFFF"
                  size="small"
                />
              ) : (
                <Text style={styles.loginButtonText}>
                  SE CONNECTER
                </Text>
              )}
            </Pressable>

            <View style={styles.separator}>
              <View style={styles.separatorLine} />

              <Text style={styles.separatorText}>
                OU
              </Text>

              <View style={styles.separatorLine} />
            </View>

            <Pressable
              disabled={isSubmitting}
              style={styles.otpButton}
            >
              <Text style={styles.otpButtonText}>
                Se connecter avec un code OTP
              </Text>
            </Pressable>
          </View>

          <Text style={styles.footer}>
            School Connect
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
    backgroundColor: "#F7F6F2",
  },

  scrollContent: {
    flexGrow: 1,
  },

  container: {
    flex: 1,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
    justifyContent: "center",
  },

  header: {
    marginBottom: 36,
  },

  brand: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2.5,
    color: "#66645E",
    marginBottom: 18,
  },

  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "700",
    color: "#11110F",
  },

  subtitle: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 24,
    color: "#66645E",
    maxWidth: 380,
  },

  form: {
    width: "100%",
  },

  field: {
    marginBottom: 20,
  },

  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#11110F",
  },

  input: {
    width: "100%",
    minHeight: 52,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E3E1DA",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    color: "#11110F",
    fontSize: 16,
  },

  passwordContainer: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E3E1DA",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },

  passwordInput: {
    flex: 1,
    minHeight: 50,
    paddingHorizontal: 16,
    color: "#11110F",
    fontSize: 16,
  },

  passwordButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  passwordButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#66645E",
  },

  inputError: {
    borderColor: "#A33A3A",
  },

  error: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: "#A33A3A",
  },

  forgotButton: {
    alignSelf: "flex-end",
    marginTop: -4,
    marginBottom: 24,
    paddingVertical: 4,
  },

  forgotText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#11110F",
  },

  loginButton: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#11110F",
  },

  loginButtonDisabled: {
    opacity: 0.6,
  },

  loginButtonText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#FFFFFF",
  },

  separator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 26,
  },

  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E3E1DA",
  },

  separatorText: {
    marginHorizontal: 14,
    fontSize: 11,
    fontWeight: "600",
    color: "#92908A",
  },

  otpButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#11110F",
    borderRadius: 10,
    backgroundColor: "transparent",
  },

  otpButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#11110F",
  },

  footer: {
    marginTop: 40,
    textAlign: "center",
    fontSize: 12,
    color: "#92908A",
  },
});