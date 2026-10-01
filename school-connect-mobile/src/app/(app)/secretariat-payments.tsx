import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { getSecretariatPayments, createSecretariatPayment } from "../../services/secretariat/secretariat.service";
import type { SecretariatPayment } from "../../services/secretariat/secretariat.types";
import { getStudents } from "../../services/students/student.service";
import type { StudentListItem } from "../../services/students/student.types";
import { hasPermission } from "../../features/secretariat/access";
import { useAuthStore } from "../../stores/authStore";

export default function SecretariatPaymentsScreen() {
  const router=useRouter(); const user=useAuthStore((s)=>s.user);
  const [items,setItems]=useState<SecretariatPayment[]>([]); const [students,setStudents]=useState<StudentListItem[]>([]);
  const [loading,setLoading]=useState(true); const [open,setOpen]=useState(false); const [saving,setSaving]=useState(false);
  const [studentId,setStudentId]=useState(""); const [amount,setAmount]=useState(""); const [method,setMethod]=useState(""); const [reference,setReference]=useState(""); const [description,setDescription]=useState("");
  const load=useCallback(async()=>{try{const [p,s]=await Promise.all([getSecretariatPayments(),getStudents({status:"ACTIVE",page:1,pageSize:100})]);setItems(p.payments);setStudents(s.students);}catch{Alert.alert("Erreur","Impossible de charger les paiements.");}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);
  const submit=async()=>{const value=Number(amount.replace(",","."));if(!Number.isFinite(value)||value<=0||!method.trim()){Alert.alert("Données invalides","Montant et mode de paiement sont obligatoires.");return;}try{setSaving(true);const r=await createSecretariatPayment({amount:value,method:method.trim(),...(studentId?{studentId}:{}),...(reference.trim()?{reference:reference.trim()}:{}),...(description.trim()?{description:description.trim()}: {})});setItems(c=>[r.payment,...c]);setAmount("");setMethod("");setReference("");setDescription("");setStudentId("");setOpen(false);}catch(error:any){Alert.alert("Erreur",error?.response?.data?.error?.message??"Enregistrement impossible.");}finally{setSaving(false);}};
  if(!hasPermission(user,"payment.read"))return <AccessDenied onBack={()=>router.back()}/>;
  if(loading)return <View style={styles.center}><ActivityIndicator/><Text style={styles.muted}>Chargement…</Text></View>;
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Header title="Paiements" onBack={()=>router.back()}/>
    {hasPermission(user,"payment.create")?<Pressable style={styles.primary} onPress={()=>setOpen(v=>!v)}><Text style={styles.primaryText}>{open?"Fermer":"+ Enregistrer un paiement"}</Text></Pressable>:null}
    {open?<View style={styles.form}>
      <Text style={styles.label}>Élève (optionnel)</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Pressable style={[styles.chip,!studentId&&styles.active]} onPress={()=>setStudentId("")}><Text style={styles.chipText}>Aucun</Text></Pressable>
        {students.map(s=><Pressable key={s.id} style={[styles.chip,studentId===s.id&&styles.active]} onPress={()=>setStudentId(s.id)}><Text style={styles.chipText}>{s.lastName} {s.firstName}</Text></Pressable>)}
      </ScrollView>
      <TextInput value={amount} onChangeText={setAmount} placeholder="Montant (MGA)" keyboardType="decimal-pad" style={styles.input}/>
      <TextInput value={method} onChangeText={setMethod} placeholder="Mode de paiement" style={styles.input}/>
      <TextInput value={reference} onChangeText={setReference} placeholder="Référence (optionnel)" style={styles.input}/>
      <TextInput value={description} onChangeText={setDescription} placeholder="Description (optionnel)" multiline style={[styles.input,styles.multi]}/>
      <Pressable disabled={saving} style={styles.primary} onPress={()=>void submit()}>{saving?<ActivityIndicator color="#fff"/>:<Text style={styles.primaryText}>Enregistrer</Text>}</Pressable>
    </View>:null}
    {items.length===0?<View style={styles.card}><Text style={styles.muted}>Aucun paiement enregistré.</Text></View>:items.map(item=><View key={item.id} style={styles.card}>
      <Text style={styles.cardTitle}>{Number(item.amount).toLocaleString("fr-FR")} {item.currency}</Text>
      <Text style={styles.body}>{item.method}{item.student?" · "+item.student.lastName+" "+item.student.firstName:""}</Text>
      {item.reference?<Text style={styles.muted}>Réf. {item.reference}</Text>:null}<Text style={styles.muted}>{new Date(item.paidAt).toLocaleString("fr-FR")}</Text>
    </View>)}
  </ScrollView>;
}
function Header({title,onBack}:{title:string;onBack:()=>void}){return <View style={styles.header}><Pressable onPress={onBack}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.title}>{title}</Text></View>;}
function AccessDenied({onBack}:{onBack:()=>void}){return <View style={styles.center}><Text style={styles.cardTitle}>Accès non autorisé</Text><Pressable onPress={onBack} style={styles.primary}><Text style={styles.primaryText}>Retour</Text></Pressable></View>;}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:"#F8FAFC"},content:{padding:16,paddingBottom:36,gap:12},center:{flex:1,alignItems:"center",justifyContent:"center",padding:24,gap:10},header:{flexDirection:"row",alignItems:"center",gap:12},back:{fontSize:34,color:"#111827"},title:{fontSize:24,fontWeight:"800",color:"#111827"},primary:{minHeight:44,paddingHorizontal:15,borderRadius:11,backgroundColor:"#111827",alignItems:"center",justifyContent:"center"},primaryText:{color:"#fff",fontWeight:"800"},form:{padding:14,borderRadius:14,backgroundColor:"#fff",borderWidth:1,borderColor:"#E5E7EB",gap:9},label:{fontSize:12,fontWeight:"800",color:"#374151"},chips:{gap:7},chip:{paddingHorizontal:11,paddingVertical:9,borderRadius:999,borderWidth:1,borderColor:"#D1D5DB",backgroundColor:"#fff"},active:{backgroundColor:"#EEF2F7",borderColor:"#344976"},chipText:{fontSize:11,fontWeight:"700",color:"#374151"},input:{minHeight:44,borderWidth:1,borderColor:"#D1D5DB",borderRadius:10,paddingHorizontal:12,color:"#111827",backgroundColor:"#fff"},multi:{minHeight:80,paddingTop:12,textAlignVertical:"top"},card:{padding:15,borderRadius:14,backgroundColor:"#fff",borderWidth:1,borderColor:"#E5E7EB",gap:6},cardTitle:{fontSize:16,fontWeight:"800",color:"#111827"},body:{fontSize:13,color:"#374151"},muted:{fontSize:12,color:"#6B7280"}});
