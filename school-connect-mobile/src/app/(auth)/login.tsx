import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useRouter } from "expo-router";
import { loginSchema, type LoginFormData } from "../../features/auth/auth.schema";
import { login } from "../../services/auth/auth.service";
import { useAuthStore } from "../../stores/authStore";
import { colors, radius, spacing, typography } from "../../theme";

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const session = await login(data.email, data.password);
      setSession(session);
      router.replace("/(app)");
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}><Ionicons name="school-outline" size={24} color="colors.surface" /></View>
            <View>
              <Text style={styles.brand}>CORRESPONDANT</Text>
              <Text style={styles.brandSub}>Espace scolaire</Text>
            </View>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Bienvenue.</Text>
            <Text style={styles.subtitle}>Accédez à votre espace scolaire et retrouvez vos informations au même endroit.</Text>
          </View>

          <View style={styles.form}>
            <Controller control={control} name="email" render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.field}>
                <Text style={styles.label}>Adresse e-mail</Text>
                <View style={[styles.inputWrap, errors.email && styles.inputError]}>
                  <Ionicons name="mail-outline" size={18} color="colors.textMuted" />
                  <TextInput value={value} onChangeText={onChange} onBlur={onBlur} placeholder="parent@example.com" placeholderTextColor={colors.textMuted} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" editable={!isSubmitting} style={styles.input} />
                </View>
                {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}
              </View>
            )} />

            <Controller control={control} name="password" render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.field}>
                <Text style={styles.label}>Mot de passe</Text>
                <View style={[styles.inputWrap, errors.password && styles.inputError]}>
                  <Ionicons name="lock-closed-outline" size={18} color="colors.textMuted" />
                  <TextInput value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Votre mot de passe" placeholderTextColor="colors.textMuted" secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} editable={!isSubmitting} style={styles.input} />
                  <Pressable onPress={() => setShowPassword((current) => !current)} disabled={isSubmitting} hitSlop={8}>
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={19} color="colors.textSecondary" />
                  </Pressable>
                </View>
                {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}
              </View>
            )} />

            <Pressable disabled={isSubmitting} style={styles.forgotButton}><Text style={styles.forgotText}>Mot de passe oublié ?</Text></Pressable>

            <Pressable onPress={handleSubmit(onSubmit)} disabled={isSubmitting} style={({ pressed }) => [styles.loginButton, pressed && styles.pressed, isSubmitting && styles.loginButtonDisabled]}>
              {isSubmitting ? <ActivityIndicator color="colors.surface" size="small" /> : <><Text style={styles.loginButtonText}>Se connecter</Text><Ionicons name="arrow-forward" size={18} color="colors.surface" /></>}
            </Pressable>

            <View style={styles.separator}><View style={styles.separatorLine} /><Text style={styles.separatorText}>OU</Text><View style={styles.separatorLine} /></View>

            <Pressable disabled={isSubmitting} style={({ pressed }) => [styles.otpButton, pressed && styles.pressed]}>
              <Ionicons name="key-outline" size={18} color="colors.textSecondary" />
              <Text style={styles.otpButtonText}>Se connecter avec un code OTP</Text>
            </Pressable>
          </View>

          <Text style={styles.footer}>Une plateforme simple pour connecter élèves, parents et établissement.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1 },
  container: { flex: 1, width: "100%", maxWidth: 520, alignSelf: "center", paddingHorizontal: 20, paddingVertical: 36, justifyContent: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 44 },
  brandIcon: { width: 48, height: 48, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
  brand: { fontSize: 14, fontWeight: "900", letterSpacing: 1.8, color: colors.text },
  brandSub: { marginTop: 2, fontSize: 11, color: colors.textSecondary },
  header: { marginBottom: 30 },
  title: { fontSize: 36, lineHeight: 42, fontWeight: "800", color: colors.text },
  subtitle: { marginTop: 10, maxWidth: 410, fontSize: 15, lineHeight: 23, color: colors.textSecondary },
  form: { width: "100%" },
  field: { marginBottom: 19 },
  label: { marginBottom: 8, fontSize: 13, fontWeight: "700", color: colors.textSecondary },
  inputWrap: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 15, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
  inputError: { borderColor: colors.danger },
  input: { flex: 1, minHeight: 52, color: colors.text, fontSize: 15 },
  error: { marginTop: 6, fontSize: 12, color: colors.danger },
  forgotButton: { alignSelf: "flex-end", marginTop: -3, marginBottom: 22, paddingVertical: 4 },
  forgotText: { fontSize: 13, fontWeight: "700", color: colors.primary },
  loginButton: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: radius.lg, backgroundColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.20, shadowRadius: 14, elevation: 4 },
  loginButtonDisabled: { opacity: 0.6 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  loginButtonText: { fontSize: 14, fontWeight: "800", color: colors.surface },
  separator: { flexDirection: "row", alignItems: "center", marginVertical: 25 },
  separatorLine: { flex: 1, height: 1, backgroundColor: colors.border },
  separatorText: { marginHorizontal: 13, fontSize: 10, fontWeight: "800", color: colors.textMuted },
  otpButton: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface },
  otpButtonText: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
  footer: { marginTop: 34, textAlign: "center", fontSize: 11, lineHeight: 17, color: colors.textMuted },
});
