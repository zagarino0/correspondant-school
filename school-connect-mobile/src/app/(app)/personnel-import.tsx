import { useState } from "react";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as XLSX from "xlsx";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { bulkCreateSchoolPersonnel } from "../../services/school-admin/school-admin.service";
import type { BulkPersonnelInput, StaffFunction } from "../../services/school-admin/school-admin.types";

const normalize=(v:unknown)=>String(v??"").trim().toLowerCase();
const getValue=(row:Record<string,unknown>,keys:string[])=>Object.entries(row).find(([k])=>keys.includes(normalize(k)))?.[1];
const functions=["ADMINISTRATION","SURVEILLANT","SECRETARIAT","COMPTABILITE","INFIRMIER"] as const;

export default function PersonnelImportScreen(){
  const [fileName,setFileName]=useState(""); const [rows,setRows]=useState<BulkPersonnelInput[]>([]); const [loading,setLoading]=useState(false);
  const pickFile=async()=>{
    const result=await DocumentPicker.getDocumentAsync({type:["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","application/vnd.ms-excel","text/csv"],copyToCacheDirectory:true,multiple:false});
    if(result.canceled||!result.assets?.[0])return;
    try{
      const asset=result.assets[0]; const buffer=await (await fetch(asset.uri)).arrayBuffer();
      const workbook=XLSX.read(buffer,{type:"array"}); const sheet=workbook.Sheets[workbook.SheetNames[0]];
      if(!sheet)throw new Error("Aucune feuille Excel trouvée.");
      const raw: Array<Record<string, unknown>> = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet,{defval:""});
      const parsed: BulkPersonnelInput[] = raw.map((row: Record<string, unknown>): BulkPersonnelInput=>{
        const rawFn=String(getValue(row,["function","fonction"])??"").trim().toLowerCase();
        const aliases:Record<string,StaffFunction>={administration:"ADMINISTRATION",surveillance:"SURVEILLANT",surveillant:"SURVEILLANT",secrétariat:"SECRETARIAT",secretariat:"SECRETARIAT",comptabilité:"COMPTABILITE",comptabilite:"COMPTABILITE",infirmerie:"INFIRMIER",infirmier:"INFIRMIER"};
        return {
          firstName:String(getValue(row,["firstname","prénom","prenom"])??"").trim(),
          lastName:String(getValue(row,["lastname","nom"])??"").trim(),
          email:String(getValue(row,["email","e-mail"])??"").trim(),
          password:String(getValue(row,["password","motdepasse","mot de passe"])??"").trim(),
          function:aliases[rawFn]??rawFn.toUpperCase() as StaffFunction,
        };
      });
      const invalid=parsed.findIndex((r: BulkPersonnelInput)=>!r.firstName||!r.lastName||!r.email||r.password.length<6||!functions.includes(r.function));
      if(invalid>=0)throw new Error(`Ligne ${invalid+2}: prénom, nom, email, mot de passe (6+) et fonction valide sont obligatoires.`);
      if(!parsed.length)throw new Error("Le fichier ne contient aucune ligne.");
      setRows(parsed);setFileName(asset.name);
    }catch(error:any){Alert.alert("Fichier invalide",error?.message??"Impossible de lire le fichier Excel.");setRows([]);setFileName("");}
  };
  const importRows=async()=>{
    try{setLoading(true);const response=await bulkCreateSchoolPersonnel(rows);Alert.alert("Import terminé",`${response.created} membre(s) du personnel ont été ajoutés.`,[{text:"OK",onPress:()=>router.replace("/(app)/personnel")}]);}
    catch(error:any){Alert.alert("Import impossible",error?.response?.data?.error?.message??"Une erreur est survenue.");}
    finally{setLoading(false);}
  };
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Text style={styles.title}>Ajouter le personnel par groupe</Text><Text style={styles.subtitle}>Importez plusieurs membres du personnel en une seule opération avec Excel.</Text>
    <View style={styles.info}><Text style={styles.infoTitle}>Colonnes attendues</Text><Text style={styles.infoText}>firstName · lastName · email · password · function</Text><Text style={styles.infoHint}>Les fonctions françaises ou les codes ADMINISTRATION, SURVEILLANT, SECRETARIAT, COMPTABILITE, INFIRMIER sont acceptés.</Text></View>
    <Pressable style={styles.pick} onPress={()=>void pickFile()}><Text style={styles.pickText}>{fileName?"Changer le fichier":"Choisir un fichier Excel"}</Text></Pressable>
    {fileName?<Text style={styles.file}>{fileName} · {rows.length} ligne(s)</Text>:null}
    {rows.length?<View style={styles.preview}><Text style={styles.previewTitle}>Aperçu</Text>{rows.slice(0,5).map((r,i)=><View key={`${r.email}-${i}`} style={styles.row}><Text style={styles.name}>{r.lastName} {r.firstName}</Text><Text style={styles.meta}>{r.email} · {r.function}</Text></View>)}{rows.length>5?<Text style={styles.more}>+ {rows.length-5} autre(s)</Text>:null}</View>:null}
    <Pressable disabled={!rows.length||loading} onPress={()=>void importRows()} style={[styles.action,(!rows.length||loading)&&styles.disabled]}>{loading?<ActivityIndicator color="#FFF"/>:<Text style={styles.actionText}>Importer {rows.length||""} membre(s)</Text>}</Pressable>
    <Pressable onPress={()=>router.back()} style={styles.cancel}><Text>Annuler</Text></Pressable>
  </ScrollView>;
}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:"#F8FAFC"},content:{width:"100%",maxWidth:900,alignSelf:"center",padding:20,paddingBottom:40},title:{fontSize:25,fontWeight:"800",color:"#344976"},subtitle:{marginTop:5,lineHeight:20,color:"#6B7280"},info:{marginTop:20,padding:16,borderRadius:15,backgroundColor:"#EEF2F7",borderWidth:1,borderColor:"#D9DEE5"},infoTitle:{fontWeight:"800",color:"#344976"},infoText:{marginTop:8,lineHeight:20,color:"#111827"},infoHint:{marginTop:7,fontSize:12,lineHeight:18,color:"#6B7280"},pick:{marginTop:18,padding:15,borderRadius:12,borderWidth:1,borderColor:"#344976",backgroundColor:"#FFF",alignItems:"center"},pickText:{color:"#344976",fontWeight:"800"},file:{marginTop:10,color:"#374151",fontWeight:"700"},preview:{marginTop:18,borderRadius:15,borderWidth:1,borderColor:"#E5E7EB",backgroundColor:"#FFF",overflow:"hidden"},previewTitle:{padding:14,backgroundColor:"#F1F5F9",fontWeight:"800",color:"#344976"},row:{padding:13,borderTopWidth:1,borderTopColor:"#EEF2F7"},name:{fontWeight:"800",color:"#111827"},meta:{marginTop:3,fontSize:12,color:"#6B7280"},more:{padding:12,color:"#6B7280"},action:{marginTop:22,minHeight:50,borderRadius:12,backgroundColor:"#344976",alignItems:"center",justifyContent:"center"},actionText:{color:"#FFF",fontWeight:"800"},disabled:{opacity:0.45},cancel:{marginTop:14,padding:14,alignItems:"center"}});
