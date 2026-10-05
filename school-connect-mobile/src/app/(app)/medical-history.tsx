import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import {
  getMedicalAccess,
  getMedicalChildren,
  getMedicalHistory,
  getMedicalPeople,
  type MedicalAccess,
  type MedicalChild,
  type MedicalHistoryEntry,
  type MedicalPerson,
} from "../../services/medical/medical.service";

const BLUE = "colors.primary";

const labels: Record<string, string> = {
  bloodGroup: "Groupe sanguin",
  allergies: "Allergies",
  medicalConditions: "Antécédents / conditions",
  medications: "Médicaments",
  emergencyContactName: "Contact d'urgence",
  emergencyContactPhone: "Téléphone d'urgence",
  doctorName: "Médecin",
  doctorPhone: "Téléphone du médecin",
  notes: "Notes",
};

function roleLabel(role: string, fn?: string | null) {
  if (role === "STAFF" && fn) return fn;
  if (role === "SCHOOL_ADMIN") return "Administrateur";
  if (role === "TEACHER") return "Enseignant";
  if (role === "PARENT") return "Parent";
  if (role === "STUDENT") return "Élève";
  return role;
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString("fr-FR");
}

export default function MedicalHistoryScreen() {
  const { width } = useWindowDimensions();
  const mobile = width < 760;
  const [access, setAccess] = useState<MedicalAccess | null>(null);
  const [people, setPeople] = useState<Array<MedicalPerson | MedicalChild>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<MedicalHistoryEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const a = await getMedicalAccess();
      setAccess(a);
      if (!a.allowed) return;
      if (a.mode === "PARENT") {
        const result = await getMedicalChildren();
        setPeople(result.children);
        setSelectedId(result.children[0]?.userId ?? null);
      } else {
        const result = await getMedicalPeople();
        setPeople(result.people);
        setSelectedId(result.people[0]?.id ?? null);
      }
    } catch {
      setError("Impossible de charger l'historique médical.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedId) return;
    setHistoryLoading(true);
    void getMedicalHistory(selectedId)
      .then((result) => setHistory(result.history))
      .catch(() => setError("Impossible de charger l'historique de cette fiche."))
      .finally(() => setHistoryLoading(false));
  }, [selectedId]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={BLUE} /><Text style={styles.muted}>Chargement…</Text></View>;

  if (!access?.allowed) {
    return <View style={styles.center}><Text style={styles.lock}>🔒</Text><Text style={styles.title}>Historique médical indisponible</Text><Text style={styles.muted}>{access?.reason ?? "Accès refusé."}</Text></View>;
  }

  const filtered = people.filter((p) =>
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase()),
  );
  const selected = people.find((p) =>
    access.mode === "PARENT" ? (p as MedicalChild).userId === selectedId : (p as MedicalPerson).id === selectedId,
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCopy}><Text style={styles.kicker}>DOSSIER MÉDICAL</Text><Text style={styles.headerTitle}>Historique</Text></View>
        <View style={styles.badge}><Text style={styles.badgeText}>{access.mode === "PARENT" ? "Lecture seule" : "Accès autorisé"}</Text></View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={[styles.body, mobile ? styles.bodyMobile : null]}>
        <View style={[styles.list, mobile ? styles.listMobile : null]}>
          <TextInput value={search} onChangeText={setSearch} placeholder="Rechercher…" placeholderTextColor="colors.textMuted" style={styles.search} />
          <ScrollView>
            {filtered.map((p) => {
              const id = access.mode === "PARENT" ? (p as MedicalChild).userId : (p as MedicalPerson).id;
              const meta = access.mode === "PARENT"
                ? `Élève · ${(p as MedicalChild).studentNumber}`
                : roleLabel((p as MedicalPerson).role, (p as MedicalPerson).function);
              return <Pressable key={id} onPress={() => setSelectedId(id)} style={[styles.person, id === selectedId && styles.selected]}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{p.firstName[0]}{p.lastName[0]}</Text></View>
                <View style={styles.personCopy}><Text style={styles.name}>{p.firstName} {p.lastName}</Text><Text style={styles.meta}>{meta}</Text></View>
              </Pressable>;
            })}
          </ScrollView>
        </View>

        <ScrollView style={styles.detail} contentContainerStyle={styles.detailContent}>
          {selected ? <>
            <Text style={styles.personTitle}>{selected.firstName} {selected.lastName}</Text>
            <Text style={styles.personSubtitle}>
              {access.mode === "PARENT" ? `Élève · ${(selected as MedicalChild).studentNumber}` : roleLabel((selected as MedicalPerson).role, (selected as MedicalPerson).function)}
            </Text>
            <View style={styles.info}><Text style={styles.infoTitle}>Traçabilité</Text><Text style={styles.muted}>Les modifications médicales sont conservées avec leur auteur et leur date.</Text></View>
            {historyLoading ? <View style={styles.centerSmall}><ActivityIndicator color={BLUE} /></View> : history.length === 0 ? (
              <View style={styles.centerSmall}><Text style={styles.emptyTitle}>Aucun historique</Text><Text style={styles.muted}>Aucune modification enregistrée.</Text></View>
            ) : history.map((entry) => <HistoryItem key={entry.id} entry={entry} />)}
          </> : <View style={styles.centerSmall}><Text style={styles.emptyTitle}>Sélectionnez une fiche</Text></View>}
        </ScrollView>
      </View>
    </View>
  );
}

function HistoryItem({ entry }: { entry: MedicalHistoryEntry }) {
  return <View style={styles.entry}>
    <View style={styles.entryTop}>
      <View style={styles.action}><Text style={styles.actionText}>{entry.action === "CREATED" ? "Création" : "Modification"}</Text></View>
      <Text style={styles.date}>{dateLabel(entry.createdAt)}</Text>
    </View>
    <Text style={styles.field}>{labels[entry.field] ?? entry.field}</Text>
    <View style={styles.values}>
      <View style={styles.valueBox}><Text style={styles.valueLabel}>Avant</Text><Text style={styles.value}>{entry.previousValue || "—"}</Text></View>
      <Text style={styles.arrow}>→</Text>
      <View style={styles.valueBox}><Text style={styles.valueLabel}>Après</Text><Text style={styles.value}>{entry.newValue || "—"}</Text></View>
    </View>
    <Text style={styles.actor}>Par {entry.actor.firstName} {entry.actor.lastName} · {roleLabel(entry.actor.role, entry.actor.function)}</Text>
  </View>;
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:"colors.background"}, center:{flex:1,alignItems:"center",justifyContent:"center",padding:28,gap:10}, centerSmall:{minHeight:220,alignItems:"center",justifyContent:"center",padding:20}, emptyTitle:{fontSize:16,fontWeight:"900",color:"colors.text",textAlign:"center"},
  lock:{fontSize:34}, title:{fontSize:21,fontWeight:"900",color:"colors.text",textAlign:"center"}, muted:{marginTop:5,color:"colors.textSecondary",fontSize:13,lineHeight:19,textAlign:"center"},
  header:{minHeight:76,paddingHorizontal:18,paddingVertical:12,flexDirection:"row",alignItems:"center",backgroundColor:"colors.surface",borderBottomWidth:1,borderBottomColor:"colors.border"},headerCopy:{flex:1},kicker:{fontSize:10,fontWeight:"900",letterSpacing:1.5,color:BLUE},headerTitle:{fontSize:20,fontWeight:"900",color:"colors.text"},badge:{paddingHorizontal:10,paddingVertical:7,borderRadius:9,backgroundColor:"colors.primarySoft"},badgeText:{color:BLUE,fontSize:11,fontWeight:"900"},
  error:{margin:14,padding:10,borderRadius:9,backgroundColor:"#FEF2F2",color:"colors.danger",fontSize:12},body:{flex:1,flexDirection:"row",gap:14,padding:14},bodyMobile:{flexDirection:"column"},list:{width:330,maxWidth:"38%",padding:12,borderRadius:16,backgroundColor:"colors.surface",borderWidth:1,borderColor:"colors.border"},listMobile:{width:"100%",maxWidth:"100%",height:235},search:{minHeight:44,paddingHorizontal:13,borderRadius:10,backgroundColor:"colors.background",borderWidth:1,borderColor:"colors.border",color:"colors.text"},person:{marginTop:7,padding:10,flexDirection:"row",alignItems:"center",gap:10,borderRadius:11},selected:{backgroundColor:"colors.surfaceMuted"},avatar:{width:38,height:38,borderRadius:19,alignItems:"center",justifyContent:"center",backgroundColor:"colors.border"},avatarText:{color:BLUE,fontSize:12,fontWeight:"900"},personCopy:{flex:1},name:{color:"colors.text",fontSize:13,fontWeight:"800"},meta:{marginTop:3,color:"colors.textSecondary",fontSize:11},
  detail:{flex:1,borderRadius:16,backgroundColor:"colors.surface",borderWidth:1,borderColor:"colors.border"},detailContent:{padding:18,paddingBottom:40},personTitle:{fontSize:23,fontWeight:"900",color:"colors.text"},personSubtitle:{marginTop:5,color:"colors.textSecondary",fontSize:13},info:{marginTop:16,padding:13,borderRadius:11,backgroundColor:"colors.background",borderWidth:1,borderColor:"colors.border"},infoTitle:{fontSize:13,fontWeight:"900",color:"colors.text"},
  entry:{marginTop:12,padding:15,borderRadius:14,borderWidth:1,borderColor:"colors.border",backgroundColor:"colors.surface"},entryTop:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},action:{paddingHorizontal:9,paddingVertical:6,borderRadius:8,backgroundColor:"colors.primarySoft"},actionText:{color:BLUE,fontSize:11,fontWeight:"900"},date:{color:"colors.textSecondary",fontSize:11},field:{marginTop:12,color:"colors.text",fontSize:14,fontWeight:"900"},values:{marginTop:9,flexDirection:"row",alignItems:"stretch",gap:8},valueBox:{flex:1,padding:10,borderRadius:9,backgroundColor:"colors.background"},valueLabel:{color:"colors.textMuted",fontSize:10,fontWeight:"900"},value:{marginTop:5,color:"#334155",fontSize:12,lineHeight:18},arrow:{alignSelf:"center",color:BLUE,fontWeight:"900"},actor:{marginTop:10,color:"colors.textSecondary",fontSize:11}
});
