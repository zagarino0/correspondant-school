import { useCallback, useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { deleteSchoolPersonnel, getSchoolAdminDashboard } from "../../services/school-admin/school-admin.service";
import type { SchoolAdminDashboardResponse } from "../../services/school-admin/school-admin.types";
import { hasPermission } from "../../features/secretariat/access";
import { useAuthStore } from "../../stores/authStore";

const labels: Record<string,string> = { ADMINISTRATION:"Administration", SURVEILLANT:"Surveillance", SECRETARIAT:"Secrétariat", COMPTABILITE:"Comptabilité", INFIRMIER:"Infirmerie" };

export default function PersonnelScreen(){
  const user = useAuthStore((state) => state.user);
  const [data,setData]=useState<SchoolAdminDashboardResponse|null>(null);
  const [loading,setLoading]=useState(true); const [refreshing,setRefreshing]=useState(false);
  const load=useCallback(async()=>{try{setData(await getSchoolAdminDashboard());}catch(error:any){Alert.alert("Erreur",error?.response?.data?.error?.message??"Impossible de charger le personnel.");}finally{setLoading(false);setRefreshing(false);}},[]);
  useEffect(()=>{void load();},[load]);

  const groups=useMemo(()=>{
    const map=new Map<string,SchoolAdminDashboardResponse["personnel"]>();
    for(const p of data?.personnel??[]){if(!map.has(p.function))map.set(p.function,[]);map.get(p.function)!.push(p);}
    return Array.from(map.entries());
  },[data]);

  const remove=async(assignmentId:string,name:string)=>{
    Alert.alert("Supprimer le personnel",`Désactiver ${name} ? Le compte sera conservé dans l'historique mais ne sera plus actif.`,[
      {text:"Annuler",style:"cancel"},
      {text:"Supprimer",style:"destructive",onPress:async()=>{
        try{await deleteSchoolPersonnel(assignmentId);await load();}
        catch(error:any){Alert.alert("Suppression impossible",error?.response?.data?.error?.message??"Une erreur est survenue.");}
      }},
    ]);
  };

  if(loading)return <View style={styles.center}><ActivityIndicator size="large" color="#344976"/></View>;

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);void load();}}/>}>
    <View style={styles.header}>
      <View style={styles.headerText}><Text style={styles.title}>Personnel</Text><Text style={styles.subtitle}>{data?.personnel.length??0} personne(s) active(s)</Text></View>
      <View style={styles.actions}>
        {hasPermission(user, "user.create") ? <Pressable style={styles.secondaryButton} onPress={()=>router.push("/(app)/personnel-import")}><Text style={styles.secondaryText}>Excel</Text></Pressable> : null}
        {hasPermission(user, "user.create") ? <Pressable style={styles.addButton} onPress={()=>router.push("/(app)/personnel-create")}><Text style={styles.addButtonText}>+ Ajouter</Text></Pressable> : null}
      </View>
    </View>
    {groups.map(([key,items])=><View key={key} style={styles.group}>
      <View style={styles.groupHeader}><Text style={styles.groupTitle}>{labels[key]??key}</Text><Text style={styles.groupCount}>{items.length}</Text></View>
      {items.map(p=><View key={p.assignmentId} style={styles.row}>
        <View style={styles.main}><Text style={styles.name}>{p.lastName} {p.firstName}</Text><Text style={styles.email}>{p.email}</Text></View>
        <Text style={styles.status}>{p.status==="ACTIVE"?"Actif":p.status}</Text>
        <View style={styles.rowActions}>
          {hasPermission(user, "user.update") ? <Pressable style={styles.editButton} onPress={()=>router.push({pathname:"/(app)/personnel-edit",params:{assignmentId:p.assignmentId}})}><Text style={styles.editText}>Modifier</Text></Pressable> : null}
          {hasPermission(user, "user.delete") ? <Pressable style={styles.deleteButton} onPress={()=>void remove(p.assignmentId,`${p.lastName} ${p.firstName}`)}><Text style={styles.deleteText}>Supprimer</Text></Pressable> : null}
        </View>
      </View>)}
    </View>)}
    {groups.length===0?<Text style={styles.empty}>Aucun personnel actif dans cet établissement.</Text>:null}
  </ScrollView>;
}

const styles=StyleSheet.create({
  screen:{flex:1,backgroundColor:"#F8FAFC"},content:{padding:16,paddingBottom:32},center:{flex:1,alignItems:"center",justifyContent:"center"},
  header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:18,gap:12,flexWrap:"wrap"},headerText:{flex:1},title:{fontSize:24,fontWeight:"800",color:"#344976"},subtitle:{marginTop:4,fontSize:13,color:"#6B7280"},
  actions:{flexDirection:"row",gap:8},secondaryButton:{paddingHorizontal:13,paddingVertical:10,borderRadius:12,borderWidth:1,borderColor:"#344976",backgroundColor:"#FFF"},secondaryText:{color:"#344976",fontWeight:"800"},
  addButton:{paddingHorizontal:14,paddingVertical:10,borderRadius:12,backgroundColor:"#344976"},addButtonText:{color:"#FFF",fontWeight:"800"},
  group:{marginBottom:16,borderRadius:16,borderWidth:1,borderColor:"#D9DEE5",backgroundColor:"#FFF",overflow:"hidden"},groupHeader:{padding:14,backgroundColor:"#EEF2F7",flexDirection:"row",justifyContent:"space-between",alignItems:"center"},groupTitle:{fontSize:17,fontWeight:"800",color:"#344976"},
  groupCount:{minWidth:28,textAlign:"center",paddingVertical:5,borderRadius:14,backgroundColor:"#344976",color:"#FFF",fontWeight:"800"},row:{flexDirection:"row",alignItems:"center",padding:14,borderTopWidth:1,borderTopColor:"#E5E7EB",gap:10},main:{flex:1,minWidth:150},name:{fontSize:15,fontWeight:"800",color:"#111827"},email:{marginTop:3,fontSize:12,color:"#6B7280"},status:{fontSize:12,fontWeight:"700",color:"#344976"},
  rowActions:{flexDirection:"row",alignItems:"center",gap:6},editButton:{paddingHorizontal:9,paddingVertical:8,borderRadius:9,backgroundColor:"#EEF2F7"},editText:{fontSize:11,fontWeight:"800",color:"#344976"},deleteButton:{paddingHorizontal:9,paddingVertical:8,borderRadius:9,backgroundColor:"#FEF2F2"},deleteText:{fontSize:11,fontWeight:"800",color:"#B91C1C"},
  empty:{padding:24,textAlign:"center",color:"#6B7280"}
});
