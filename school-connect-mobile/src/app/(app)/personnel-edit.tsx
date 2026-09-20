import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { getSchoolAdminDashboard, updateSchoolPersonnel } from "../../services/school-admin/school-admin.service";
import type { SchoolAdminDashboardResponse, StaffFunction } from "../../services/school-admin/school-admin.types";

const functions: Array<[StaffFunction, string]> = [
  ["ADMINISTRATION", "Administration"],
  ["SURVEILLANT", "Surveillance"],
  ["SECRETARIAT", "Secrétariat"],
  ["COMPTABILITE", "Comptabilité"],
  ["INFIRMIER", "Infirmerie"],
];

export default function PersonnelEditScreen() {
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fn, setFn] = useState<StaffFunction>("ADMINISTRATION");

  useEffect(() => {
    void getSchoolAdminDashboard().then((data: SchoolAdminDashboardResponse) => {
      const item = data.personnel.find((person) => person.assignmentId === assignmentId);
      if (!item) {
        Alert.alert("Personnel introuvable", "Ce membre du personnel n'est plus disponible.", [{ text: "OK", onPress: () => router.back() }]);
        return;
      }
      setFirstName(item.firstName); setLastName(item.lastName); setEmail(item.email);
      setFn(item.function as StaffFunction);
    }).catch(() => {
      Alert.alert("Erreur", "Impossible de charger le personnel.", [{ text: "OK", onPress: () => router.back() }]);
    }).finally(() => setLoading(false));
  }, [assignmentId]);

  const submit = async () => {
    if (!assignmentId || !firstName.trim() || !lastName.trim() || !email.trim()) {
      Alert.alert("Champs invalides", "Prénom, nom et email sont obligatoires."); return;
    }
    if (password && password.length < 6) {
      Alert.alert("Mot de passe invalide", "Le mot de passe doit contenir au moins 6 caractères."); return;
    }
    try {
      setSaving(true);
      await updateSchoolPersonnel(assignmentId, {
        firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(),
        password: password || undefined, function: fn,
      });
      Alert.alert("Modifications enregistrées", "Le personnel a été mis à jour.", [
        { text: "OK", onPress: () => router.replace("/(app)/personnel") },
      ]);
    } catch (error: any) {
      Alert.alert("Modification impossible", error?.response?.data?.error?.message ?? "Une erreur est survenue.");
    } finally { setSaving(false); }
  };

  if (loading) return <View style={styles.center}><Text>Chargement…</Text></View>;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Modifier le personnel</Text>
      <Text style={styles.subtitle}>Mettre à jour les informations et la fonction.</Text>
      <Text style={styles.label}>Prénom</Text><TextInput value={firstName} onChangeText={setFirstName} style={styles.input} />
      <Text style={styles.label}>Nom</Text><TextInput value={lastName} onChangeText={setLastName} style={styles.input} />
      <Text style={styles.label}>Email</Text><TextInput value={email} onChangeText={setEmail} style={styles.input} autoCapitalize="none" keyboardType="email-address" />
      <Text style={styles.label}>Fonction</Text>
      <View style={styles.choices}>
        {functions.map(([value, label]) => (
          <Pressable key={value} onPress={() => setFn(value)} style={[styles.choice, fn === value && styles.choiceActive]}>
            <Text style={fn === value ? styles.choiceTextActive : styles.choiceText}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Nouveau mot de passe (optionnel)</Text>
      <TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
      <Pressable disabled={saving} onPress={() => void submit()} style={styles.button}><Text style={styles.buttonText}>{saving ? "Enregistrement…" : "Enregistrer"}</Text></Pressable>
      <Pressable onPress={() => router.back()} style={styles.cancel}><Text>Annuler</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:{flex:1,backgroundColor:"#F8FAFC"}, content:{width:"100%",maxWidth:900,alignSelf:"center",padding:20,paddingBottom:40},
  center:{flex:1,alignItems:"center",justifyContent:"center"}, title:{fontSize:25,fontWeight:"800",color:"#344976"}, subtitle:{marginTop:5,color:"#6B7280"},
  label:{marginTop:14,marginBottom:7,fontWeight:"700",color:"#374151"}, input:{minHeight:48,borderWidth:1,borderColor:"#D9DEE5",borderRadius:12,paddingHorizontal:13,backgroundColor:"#FFF"},
  choices:{flexDirection:"row",flexWrap:"wrap",gap:8}, choice:{paddingHorizontal:12,paddingVertical:10,borderRadius:20,borderWidth:1,borderColor:"#D9DEE5",backgroundColor:"#FFF"},
  choiceActive:{backgroundColor:"#344976",borderColor:"#344976"}, choiceText:{color:"#374151"}, choiceTextActive:{color:"#FFF",fontWeight:"800"},
  button:{marginTop:24,padding:15,borderRadius:12,backgroundColor:"#344976",alignItems:"center"}, buttonText:{color:"#FFF",fontWeight:"800"},
  cancel:{marginTop:14,padding:14,alignItems:"center"}
});