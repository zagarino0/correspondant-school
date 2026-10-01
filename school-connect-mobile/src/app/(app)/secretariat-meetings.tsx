import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { getSecretariatMeetings, createSecretariatMeeting, updateSecretariatMeeting } from "../../services/secretariat/secretariat.service";
import type { SecretariatMeeting } from "../../services/secretariat/secretariat.types";
import { getStudents } from "../../services/students/student.service";
import type { StudentListItem } from "../../services/students/student.types";
import { hasPermission } from "../../features/secretariat/access";
import { useAuthStore } from "../../stores/authStore";

export default function SecretariatMeetingsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [items, setItems] = useState<SecretariatMeeting[]>([]);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [studentId, setStudentId] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [scheduledAt, setScheduledAt] = useState(new Date(Date.now() + 3600000).toISOString().slice(0, 16));
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    try {
      const [m, s] = await Promise.all([
        getSecretariatMeetings(),
        getStudents({ status: "ACTIVE", page: 1, pageSize: 100 }),
      ]);
      setItems(m.meetings);
      setStudents(s.students);
    } catch {
      Alert.alert("Erreur", "Impossible de charger les rendez-vous.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const reset = () => {
    setEditing(null); setStudentId(""); setTitle(""); setType("");
    setScheduledAt(new Date(Date.now() + 3600000).toISOString().slice(0, 16));
    setDescription(""); setNotes(""); setFormOpen(false);
  };

  const submit = async () => {
    if (!title.trim() || !type.trim() || !scheduledAt.trim()) {
      Alert.alert("Champs requis", "Titre, type et date sont obligatoires.");
      return;
    }
    const parsedDate = new Date(scheduledAt);
    if (Number.isNaN(parsedDate.getTime())) {
      Alert.alert("Date invalide", "Utilisez le format AAAA-MM-JJTHH:mm.");
      return;
    }
    try {
      setSaving(true);
      if (editing) {
        const result = await updateSecretariatMeeting(editing, {
          studentId: studentId || null,
          title: title.trim(),
          type: type.trim(),
          scheduledAt: parsedDate.toISOString(),
          description: description.trim() || null,
          notes: notes.trim() || null,
        });
        setItems((current) => current.map((item) => item.id === editing ? result.meeting : item));
      } else {
        const result = await createSecretariatMeeting({
          ...(studentId ? { studentId } : {}),
          title: title.trim(),
          type: type.trim(),
          scheduledAt: parsedDate.toISOString(),
          ...(description.trim() ? { description: description.trim() } : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        });
        setItems((current) => [result.meeting, ...current]);
      }
      reset();
    } catch (error: any) {
      Alert.alert("Erreur", error?.response?.data?.error?.message ?? "Opération impossible.");
    } finally {
      setSaving(false);
    }
  };

  const edit = (item: SecretariatMeeting) => {
    setEditing(item.id); setStudentId(item.studentId ?? ""); setTitle(item.title);
    setType(item.type); setScheduledAt(item.scheduledAt.slice(0, 16));
    setDescription(item.description ?? ""); setNotes(item.notes ?? ""); setFormOpen(true);
  };

  if (!hasPermission(user, "meeting.read")) return <AccessDenied onBack={() => router.back()} />;
  if (loading) return <View style={styles.center}><ActivityIndicator /><Text style={styles.muted}>Chargement…</Text></View>;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Header title="Rendez-vous" onBack={() => router.back()} />
      {hasPermission(user, "meeting.create") ? (
        <Pressable style={styles.primary} onPress={() => setFormOpen((v) => !v)}>
          <Text style={styles.primaryText}>{formOpen ? "Fermer" : "+ Nouveau rendez-vous"}</Text>
        </Pressable>
      ) : null}
      {formOpen ? (
        <View style={styles.form}>
          <TextInput value={title} onChangeText={setTitle} placeholder="Titre" style={styles.input} />
          <TextInput value={type} onChangeText={setType} placeholder="Type (parent, administratif…)" style={styles.input} />
          <TextInput value={scheduledAt} onChangeText={setScheduledAt} placeholder="2026-10-01T14:30" style={styles.input} />
          <Text style={styles.label}>Élève (optionnel)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Pressable style={[styles.chip, !studentId && styles.chipActive]} onPress={() => setStudentId("")}><Text style={styles.chipText}>Aucun</Text></Pressable>
            {students.map((student) => (
              <Pressable key={student.id} style={[styles.chip, studentId === student.id && styles.chipActive]} onPress={() => setStudentId(student.id)}>
                <Text style={styles.chipText}>{student.lastName} {student.firstName}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <TextInput value={description} onChangeText={setDescription} placeholder="Description" multiline style={[styles.input, styles.multi]} />
          <TextInput value={notes} onChangeText={setNotes} placeholder="Notes" multiline style={[styles.input, styles.multi]} />
          <Pressable disabled={saving} style={styles.primary} onPress={() => void submit()}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{editing ? "Mettre à jour" : "Enregistrer"}</Text>}
          </Pressable>
          {editing ? <Pressable style={styles.secondary} onPress={reset}><Text style={styles.secondaryText}>Annuler</Text></Pressable> : null}
        </View>
      ) : null}
      {items.length === 0 ? <Empty text="Aucun rendez-vous." /> : items.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.row}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.status}>{item.status}</Text></View>
          <Text style={styles.body}>{new Date(item.scheduledAt).toLocaleString("fr-FR")}</Text>
          <Text style={styles.muted}>{item.type}{item.student ? " · " + item.student.lastName + " " + item.student.firstName : ""}</Text>
          {item.description ? <Text style={styles.body}>{item.description}</Text> : null}
          {hasPermission(user, "meeting.update") ? <Pressable style={styles.secondary} onPress={() => edit(item)}><Text style={styles.secondaryText}>Modifier</Text></Pressable> : null}
        </View>
      ))}
    </ScrollView>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) { return <View style={styles.header}><Pressable onPress={onBack}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.title}>{title}</Text></View>; }
function Empty({ text }: { text: string }) { return <View style={styles.card}><Text style={styles.muted}>{text}</Text></View>; }
function AccessDenied({ onBack }: { onBack: () => void }) { return <View style={styles.center}><Text style={styles.cardTitle}>Accès non autorisé</Text><Pressable onPress={onBack} style={styles.primary}><Text style={styles.primaryText}>Retour</Text></Pressable></View>; }

const styles = StyleSheet.create({
  screen:{flex:1,backgroundColor:"#F8FAFC"},content:{padding:16,paddingBottom:36,gap:12},center:{flex:1,alignItems:"center",justifyContent:"center",padding:24,gap:10},
  header:{flexDirection:"row",alignItems:"center",gap:12},back:{fontSize:34,color:"#111827"},title:{fontSize:24,fontWeight:"800",color:"#111827"},primary:{minHeight:44,paddingHorizontal:15,borderRadius:11,backgroundColor:"#111827",alignItems:"center",justifyContent:"center"},primaryText:{color:"#fff",fontWeight:"800"},secondary:{minHeight:40,paddingHorizontal:13,borderRadius:10,borderWidth:1,borderColor:"#CBD5E1",alignItems:"center",justifyContent:"center"},secondaryText:{color:"#344976",fontWeight:"800"},
  form:{padding:14,borderRadius:14,backgroundColor:"#fff",borderWidth:1,borderColor:"#E5E7EB",gap:9},input:{minHeight:44,borderWidth:1,borderColor:"#D1D5DB",borderRadius:10,paddingHorizontal:12,color:"#111827",backgroundColor:"#fff"},multi:{minHeight:80,paddingTop:12,textAlignVertical:"top"},label:{fontSize:12,fontWeight:"800",color:"#374151"},chips:{gap:7},chip:{paddingHorizontal:11,paddingVertical:9,borderRadius:999,borderWidth:1,borderColor:"#D1D5DB",backgroundColor:"#fff"},chipActive:{backgroundColor:"#EEF2F7",borderColor:"#344976"},chipText:{fontSize:11,fontWeight:"700",color:"#374151"},
  card:{padding:15,borderRadius:14,backgroundColor:"#fff",borderWidth:1,borderColor:"#E5E7EB",gap:7},row:{flexDirection:"row",justifyContent:"space-between",gap:8},cardTitle:{fontSize:16,fontWeight:"800",color:"#111827",flex:1},status:{fontSize:10,fontWeight:"800",color:"#344976"},body:{fontSize:13,lineHeight:19,color:"#374151"},muted:{fontSize:12,color:"#6B7280"}
});
