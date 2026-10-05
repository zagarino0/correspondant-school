import { useState } from "react";
import { router } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { createSchoolClass } from "../../services/school-admin/school-admin.service";
import { colors } from "../../theme";

export default function ClassCreateScreen(){
 const [name,setName]=useState(""); const [level,setLevel]=useState(""); const [saving,setSaving]=useState(false);
 const submit=async()=>{if(!name.trim()||!level.trim()){Alert.alert("Champs requis","Le nom et le niveau sont obligatoires.");return;}try{setSaving(true);await createSchoolClass({name:name.trim(),level:level.trim()});Alert.alert("Classe créée","La classe a été ajoutée à l'année scolaire active.",[{text:"OK",onPress:()=>router.replace("/(app)/classes")}]);}catch(error:any){Alert.alert("Création impossible",error?.response?.data?.error?.message??"Une erreur est survenue.");}finally{setSaving(false);}};
 return <ScrollView style={styles.screen} contentContainerStyle={styles.content}><Text style={styles.title}>Nouvelle classe</Text><Text style={styles.subtitle}>Elle sera ajoutée à l'année scolaire active.</Text><Text style={styles.label}>Nom de la classe</Text><TextInput value={name} onChangeText={setName} placeholder="Ex. CM2 A" style={styles.input}/><Text style={styles.label}>Niveau / cycle</Text><TextInput value={level} onChangeText={setLevel} placeholder="Ex. Primaire" style={styles.input}/><Pressable disabled={saving} onPress={()=>void submit()} style={styles.button}><Text style={styles.buttonText}>{saving?"Création…":"Créer la classe"}</Text></Pressable><Pressable onPress={()=>router.back()} style={styles.cancel}><Text>Annuler</Text></Pressable></ScrollView>;
}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:"colors.background"},content:{padding:20},title:{fontSize:25,fontWeight:"800",color:"colors.primary"},subtitle:{marginTop:5,marginBottom:24,color:"colors.textSecondary"},label:{marginTop:14,marginBottom:7,fontWeight:"700",color:"colors.textSecondary"},input:{height:48,borderWidth:1,borderColor:"colors.border",borderRadius:12,paddingHorizontal:13,backgroundColor:"colors.surface"},button:{marginTop:24,padding:15,borderRadius:12,backgroundColor:"colors.primary",alignItems:"center"},buttonText:{color:"colors.surface",fontWeight:"800"},cancel:{marginTop:14,padding:14,alignItems:"center"}});
