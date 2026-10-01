import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { getSecretariatDocuments, createSecretariatDocument } from "../../services/secretariat/secretariat.service";
import type { SecretariatDocument } from "../../services/secretariat/secretariat.types";
import { hasPermission } from "../../features/secretariat/access";
import { useAuthStore } from "../../stores/authStore";

export default function SecretariatDocumentsScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [items, setItems] = useState<SecretariatDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");

  const load = useCallback(async () => {
    try { setItems((await getSecretariatDocuments()).documents); }
    catch { Alert.alert("Erreur", "Impossible de charger les documents."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submit = async () => {
    if (!title.trim() || !type.trim()) {
      Alert.alert("Champs requis", "Le titre et le type sont obligatoires.");
      return;
    }
    try {
      setSaving(true);
      const result = await createSecretariatDocument({
        title: title.trim(),
        type: type.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(fileUrl.trim() ? { fileUrl: fileUrl.trim() } : {}),
      });
      setItems((current) => [result.document, ...current]);
      setTitle(""); setType(""); setDescription(""); setFileUrl(""); setFormOpen(false);
    } catch (error: any) {
      Alert.alert("Erreur", error?.response?.data?.error?.message ?? "Création impossible.");
    } finally { setSaving(false); }
  };

  if (!hasPermission(user, "document.read")) return <AccessDenied onBack={() => router.back()} />;
  if (loading) return <View style={styles.center}><ActivityIndicator /><Text style={styles.muted}>Chargement…</Text></View>;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Header title="Documents" onBack={() => router.back()} />
      {hasPermission(user, "document.create") ? (
        <Pressable style={styles.primaryButton} onPress={() => setFormOpen((v) => !v)}>
          <Text style={styles.primaryText}>{formOpen ? "Fermer le formulaire" : "+ Nouveau document"}</Text>
        </Pressable>
      ) : null}
      {formOpen ? (
        <View style={styles.form}>
          <TextInput value={title} onChangeText={setTitle} placeholder="Titre" style={styles.input} />
          <TextInput value={type} onChangeText={setType} placeholder="Type (certificat, dossier…)" style={styles.input} />
          <TextInput value={description} onChangeText={setDescription} placeholder="Description" multiline style={[styles.input, styles.multiline]} />
          <TextInput value={fileUrl} onChangeText={setFileUrl} placeholder="URL du fichier (optionnel)" autoCapitalize="none" style={styles.input} />
          <Pressable disabled={saving} style={styles.primaryButton} onPress={() => void submit()}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Enregistrer</Text>}
          </Pressable>
        </View>
      ) : null}
      {items.length === 0 ? <Empty text="Aucun document." /> : items.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.badge}>{item.type}</Text>
          {item.description ? <Text style={styles.body}>{item.description}</Text> : null}
          <Text style={styles.muted}>Créé le {new Date(item.createdAt).toLocaleDateString("fr-FR")}</Text>
          {item.fileUrl ? <Text style={styles.link}>{item.fileUrl}</Text> : null}
        </View>
      ))}
    </ScrollView>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return <View style={styles.header}><Pressable onPress={onBack}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.title}>{title}</Text></View>;
}
function Empty({ text }: { text: string }) { return <View style={styles.card}><Text style={styles.muted}>{text}</Text></View>; }
function AccessDenied({ onBack }: { onBack: () => void }) { return <View style={styles.center}><Text style={styles.cardTitle}>Accès non autorisé</Text><Text style={styles.muted}>Cette fonction n'est pas disponible pour votre compte.</Text><Pressable onPress={onBack} style={styles.primaryButton}><Text style={styles.primaryText}>Retour</Text></Pressable></View>; }

const styles = StyleSheet.create({
  screen:{flex:1,backgroundColor:"#F8FAFC"}, content:{padding:16,paddingBottom:36,gap:12}, center:{flex:1,alignItems:"center",justifyContent:"center",padding:24,gap:10},
  header:{flexDirection:"row",alignItems:"center",gap:12,marginBottom:4}, back:{fontSize:34,color:"#111827"}, title:{fontSize:24,fontWeight:"800",color:"#111827"}, primaryButton:{minHeight:44,paddingHorizontal:16,borderRadius:11,backgroundColor:"#111827",alignItems:"center",justifyContent:"center"}, primaryText:{color:"#fff",fontWeight:"800"},
  form:{padding:14,borderRadius:14,backgroundColor:"#fff",borderWidth:1,borderColor:"#E5E7EB",gap:10}, input:{minHeight:44,borderWidth:1,borderColor:"#D1D5DB",borderRadius:10,paddingHorizontal:12,color:"#111827",backgroundColor:"#fff"}, multiline:{minHeight:90,paddingTop:12,textAlignVertical:"top"},
  card:{padding:15,borderRadius:14,backgroundColor:"#fff",borderWidth:1,borderColor:"#E5E7EB",gap:6}, cardTitle:{fontSize:16,fontWeight:"800",color:"#111827"}, badge:{alignSelf:"flex-start",paddingHorizontal:8,paddingVertical:4,borderRadius:999,backgroundColor:"#EEF2F7",fontSize:11,fontWeight:"800",color:"#344976"}, body:{fontSize:13,lineHeight:19,color:"#374151"}, muted:{fontSize:12,color:"#6B7280"}, link:{fontSize:12,color:"#344976"}
});
