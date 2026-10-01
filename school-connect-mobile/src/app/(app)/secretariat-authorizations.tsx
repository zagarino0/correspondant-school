import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { getSecretariatAuthorizations, createSecretariatAuthorization, updateSecretariatAuthorization } from "../../services/secretariat/secretariat.service";
import type { SecretariatAuthorization } from "../../services/secretariat/secretariat.service";
import { getStudents, getStudent } from "../../services/students/student.service";
import type { StudentListItem, StudentDetail } from "../../services/students/student.types";
import { hasPermission } from "../../features/secretariat/access";
import { useAuthStore } from "../../stores/authStore";

const TYPES=["Sortie exceptionnelle","Absence exceptionnelle","Autorisation de récupération","Autre"];

export default function SecretariatAuthorizationsScreen(){
  const router=useRouter(); const user=useAuthStore(s=>s.user);
  const [items,setItems]=useState<SecretariatAuthorization[]>([]); const [students,setStudents]=useState<StudentListItem[]>([]);
  const [parents,setParents]=useState<StudentDetail["parents"]>([]);
  const [selectedStudent,setSelectedStudent]=useState(""); const [selectedParent,setSelectedParent]=useState("");
  const [type,setType]=useState(TYPES[0]); const [reason,setReason]=useState(""); const [editing,setEditing]=useState<string|null>(null);
  const [open,setOpen]=useState(false); const [loading,setLoading]=useState(true); const [loadingParents,setLoadingParents]=useState(false); const [saving,setSaving]=useState(false);

  const load=useCallback(async()=>{try{const [a,s]=await Promise.all([getSecretariatAuthorizations(),getStudents({status:"ACTIVE",page:1,pageSize:100})]);setItems(a.authorizations);setStudents(s.students);setSelectedStudent(s.students[0]?.id??"");}catch{Alert.alert("Erreur","Impossible de charger les autorisations.");}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>{if(!selectedStudent){setParents([]);setSelectedParent("");return;}setLoadingParents(true);getStudent(selectedStudent).then(r=>{setParents(r.student.parents);setSelectedParent(r.student.parents[0]?.parent.id??"");}).catch(()=>{setParents([]);setSelectedParent("");}).finally(()=>setLoadingParents(false));},[selectedStudent]);

  const reset=()=>{setEditing(null);setReason("");setType(TYPES[0]);setOpen(false);};
  const submit=async()=>{if(!selectedStudent||!selectedParent||!type.trim()){Alert.alert("Champs requis","Élève, parent et type sont obligatoires.");return;}try{setSaving(true);if(editing){const r=await updateSecretariatAuthorization(editing,{type:type.trim(),reason:reason.trim()||null});setItems(c=>c.map(x=>x.id===editing?r.authorization:x));}else{const r=await createSecretariatAuthorization({studentId:selectedStudent,parentId:selectedParent,type:type.trim(),...(reason.trim()?{reason:reason.trim()}: {})});setItems(c=>[r.authorization,...c]);}reset();}catch(error:any){Alert.alert("Erreur",error?.response?.data?.error?.message??"Opération impossible.");}finally{setSaving(false);}};
  const edit=(item:SecretariatAuthorization)=>{setEditing(item.id);setSelectedStudent(item.studentId);setSelectedParent(item.parentId);setType(item.type);setReason(item.reason??"");setOpen(true);};

  if(!hasPermission(user,"authorization.read"))return <AccessDenied onBack={()=>router.back()}/>;
  if(loading)return <View style={styles.center}><ActivityIndicator/><Text style={styles.muted}>Chargement…</Text></View>;
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <View style={styles.header}><Pressable onPress={()=>router.back()}><Text style={styles.back}>‹</Text></Pressable><View><Text style={styles.title}>Autorisations</Text><Text style={styles.muted}>Suivi administratif — aucune décision</Text></View></View>
    {hasPermission(user,"authorization.create")?<Pressable style={styles.primary} onPress={()=>setOpen(v=>!v)}><Text style={styles.primaryText}>{open?"Fermer":"+ Nouvelle demande"}</Text></Pressable>:null}
    {open?<View style={styles.form}>
      <Text style={styles.label}>Élève</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{students.map(s=><Pressable key={s.id} onPress={()=>setSelectedStudent(s.id)} style={[styles.chip,selectedStudent===s.id&&styles.active]}><Text style={styles.chipText}>{s.lastName} {s.firstName}</Text></Pressable>)}</ScrollView>
      <Text style={styles.label}>Parent</Text>{loadingParents?<ActivityIndicator/>:<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{parents.map(p=><Pressable key={p.parent.id} onPress={()=>setSelectedParent(p.parent.id)} style={[styles.chip,selectedParent===p.parent.id&&styles.active]}><Text style={styles.chipText}>{p.parent.firstName} {p.parent.lastName}</Text></Pressable>)}</ScrollView>}
      <Text style={styles.label}>Type</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{TYPES.map(t=><Pressable key={t} onPress={()=>setType(t)} style={[styles.chip,type===t&&styles.active]}><Text style={styles.chipText}>{t}</Text></Pressable>)}</ScrollView>
      <TextInput value={reason} onChangeText={setReason} placeholder="Motif" multiline style={[styles.input,styles.multi]}/>
      <Pressable disabled={saving} style={styles.primary} onPress={()=>void submit()}>{saving?<ActivityIndicator color="#fff"/>:<Text style={styles.primaryText}>{editing?"Mettre à jour":"Enregistrer"}</Text>}</Pressable>
      {editing?<Pressable style={styles.secondary} onPress={reset}><Text style={styles.secondaryText}>Annuler</Text></Pressable>:null}
    </View>:null}
    {items.length===0?<View style={styles.card}><Text style={styles.muted}>Aucune demande.</Text></View>:items.map(item=><View key={item.id} style={styles.card}>
      <View style={styles.row}><Text style={styles.cardTitle}>{item.student.lastName} {item.student.firstName}</Text><Text style={styles.status}>{item.status}</Text></View>
      <Text style={styles.body}>Parent : {item.parent.firstName} {item.parent.lastName}</Text><Text style={styles.body}>{item.type}</Text>{item.reason?<Text style={styles.muted}>{item.reason}</Text>:null}<Text style={styles.muted}>Demandée le {new Date(item.requestedAt).toLocaleDateString("fr-FR")}</Text>
      {hasPermission(user,"authorization.update")&&item.status==="PENDING"?<Pressable style={styles.secondary} onPress={()=>edit(item)}><Text style={styles.secondaryText}>Modifier</Text></Pressable>:null}
    </View>)}
  </ScrollView>;
}
function AccessDenied({onBack}:{onBack:()=>void}){return <View style={styles.center}><Text style={styles.title}>Accès non autorisé</Text><Pressable style={styles.primary} onPress={onBack}><Text style={styles.primaryText}>Retour</Text></Pressable></View>;}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:"#F8FAFC"},content:{padding:16,paddingBottom:36,gap:12},center:{flex:1,alignItems:"center",justifyContent:"center",padding:24,gap:12},header:{flexDirection:"row",alignItems:"center",gap:12},back:{fontSize:34,color:"#111827"},title:{fontSize:24,fontWeight:"800",color:"#111827"},muted:{fontSize:12,color:"#6B7280"},label:{fontSize:12,fontWeight:"800",color:"#374151"},chips:{gap:7},chip:{paddingHorizontal:11,paddingVertical:9,borderRadius:999,borderWidth:1,borderColor:"#D1D5DB",backgroundColor:"#fff"},active:{backgroundColor:"#EEF2F7",borderColor:"#344976"},chipText:{fontSize:11,fontWeight:"700",color:"#374151"},form:{padding:14,borderRadius:14,backgroundColor:"#fff",borderWidth:1,borderColor:"#E5E7EB",gap:9},input:{minHeight:44,borderWidth:1,borderColor:"#D1D5DB",borderRadius:10,paddingHorizontal:12,color:"#111827",backgroundColor:"#fff"},multi:{minHeight:90,paddingTop:12,textAlignVertical:"top"},primary:{minHeight:44,paddingHorizontal:15,borderRadius:11,backgroundColor:"#111827",alignItems:"center",justifyContent:"center"},primaryText:{color:"#fff",fontWeight:"800"},secondary:{minHeight:40,paddingHorizontal:13,borderRadius:10,borderWidth:1,borderColor:"#CBD5E1",alignItems:"center",justifyContent:"center"},secondaryText:{color:"#344976",fontWeight:"800"},card:{padding:15,borderRadius:14,backgroundColor:"#fff",borderWidth:1,borderColor:"#E5E7EB",gap:6},row:{flexDirection:"row",justifyContent:"space-between",gap:8},cardTitle:{fontSize:15,fontWeight:"800",color:"#111827",flex:1},status:{fontSize:10,fontWeight:"800",color:"#344976"},body:{fontSize:13,color:"#374151"}});
