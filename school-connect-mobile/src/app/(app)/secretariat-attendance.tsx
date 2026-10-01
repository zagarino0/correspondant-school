import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { getStudentAttendance } from "../../services/secretariat/secretariat.service";
import { getStudents } from "../../services/students/student.service";
import type { StudentListItem } from "../../services/students/student.types";
import { hasPermission } from "../../features/secretariat/access";
import { useAuthStore } from "../../stores/authStore";

export default function SecretariatAttendanceScreen(){
  const router=useRouter(); const user=useAuthStore(s=>s.user);
  const [students,setStudents]=useState<StudentListItem[]>([]); const [selected,setSelected]=useState<string|null>(null);
  const [records,setRecords]=useState<Awaited<ReturnType<typeof getStudentAttendance>>["attendance"]>([]); const [loading,setLoading]=useState(true); const [loadingRecords,setLoadingRecords]=useState(false);
  useEffect(()=>{getStudents({status:"ACTIVE",page:1,pageSize:100}).then(r=>{setStudents(r.students);setSelected(r.students[0]?.id??null);}).catch(()=>Alert.alert("Erreur","Impossible de charger les élèves.")).finally(()=>setLoading(false));},[]);
  useEffect(()=>{if(!selected)return;setLoadingRecords(true);getStudentAttendance(selected).then(r=>setRecords(r.attendance)).catch(()=>Alert.alert("Erreur","Impossible de charger les présences.")).finally(()=>setLoadingRecords(false));},[selected]);
  if(!hasPermission(user,"attendance.read"))return <View style={styles.center}><Text style={styles.title}>Accès non autorisé</Text><Pressable style={styles.primary} onPress={()=>router.back()}><Text style={styles.primaryText}>Retour</Text></Pressable></View>;
  if(loading)return <View style={styles.center}><ActivityIndicator/><Text style={styles.muted}>Chargement…</Text></View>;
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <View style={styles.header}><Pressable onPress={()=>router.back()}><Text style={styles.back}>‹</Text></Pressable><View><Text style={styles.title}>Présences</Text><Text style={styles.muted}>Consultation uniquement</Text></View></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{students.map(s=><Pressable key={s.id} onPress={()=>setSelected(s.id)} style={[styles.chip,selected===s.id&&styles.active]}><Text style={styles.chipText}>{s.lastName} {s.firstName}</Text></Pressable>)}</ScrollView>
    {loadingRecords?<ActivityIndicator/>:records.length===0?<View style={styles.card}><Text style={styles.muted}>Aucun pointage enregistré pour cet élève.</Text></View>:records.map(r=><View key={r.id} style={styles.card}><View style={styles.row}><Text style={styles.cardTitle}>{new Date(r.date).toLocaleDateString("fr-FR")}</Text><Text style={styles.status}>{r.status}</Text></View>{r.arrivalTime?<Text style={styles.body}>Arrivée : {new Date(r.arrivalTime).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</Text>:null}{r.reason?<Text style={styles.body}>Motif : {r.reason}</Text>:null}{r.note?<Text style={styles.muted}>{r.note}</Text>:null}</View>)}
  </ScrollView>;
}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:"#F8FAFC"},content:{padding:16,paddingBottom:36,gap:12},center:{flex:1,alignItems:"center",justifyContent:"center",padding:24,gap:12},header:{flexDirection:"row",alignItems:"center",gap:12},back:{fontSize:34,color:"#111827"},title:{fontSize:24,fontWeight:"800",color:"#111827"},muted:{fontSize:12,color:"#6B7280"},chips:{gap:7},chip:{paddingHorizontal:11,paddingVertical:9,borderRadius:999,borderWidth:1,borderColor:"#D1D5DB",backgroundColor:"#fff"},active:{backgroundColor:"#EEF2F7",borderColor:"#344976"},chipText:{fontSize:11,fontWeight:"700",color:"#374151"},card:{padding:15,borderRadius:14,backgroundColor:"#fff",borderWidth:1,borderColor:"#E5E7EB",gap:6},row:{flexDirection:"row",justifyContent:"space-between",gap:8},cardTitle:{fontSize:15,fontWeight:"800",color:"#111827"},status:{fontSize:11,fontWeight:"800",color:"#344976"},body:{fontSize:13,color:"#374151"},primary:{minHeight:44,paddingHorizontal:16,borderRadius:11,backgroundColor:"#111827",alignItems:"center",justifyContent:"center"},primaryText:{color:"#fff",fontWeight:"800"}});
