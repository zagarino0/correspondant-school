import { useCallback, useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { getSchoolAdminDashboard } from "../../services/school-admin/school-admin.service";
import type { SchoolAdminDashboardResponse } from "../../services/school-admin/school-admin.types";

type Category = "PRIMAIRE" | "PREMIER_CYCLE" | "SECOND_CYCLE" | "AUTRE";
const labels: Record<Category, string> = {
  PRIMAIRE: "Primaire",
  PREMIER_CYCLE: "Premier cycle",
  SECOND_CYCLE: "Deuxième cycle",
  AUTRE: "Autres",
};

function category(level: string | null) {
  const value = (level ?? "").toLowerCase();
  if (value.includes("primaire") || /^(cp|ce1|ce2|ce3|ce4|cm1|cm2)\b/.test(value)) return "PRIMAIRE" as const;
  if (value.includes("premier cycle") || value.includes("collège") || /^(6e|5e|4e|3e)\b/.test(value)) return "PREMIER_CYCLE" as const;
  if (value.includes("second cycle") || value.includes("lycée") || /^(2nde|seconde|1re|1ère|première|terminale)\b/.test(value)) return "SECOND_CYCLE" as const;
  return "AUTRE" as const;
}

export default function ClassesScreen() {
  const [data, setData] = useState<SchoolAdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setData(await getSchoolAdminDashboard()); } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const groups = useMemo(() => {
    const map = new Map<Category, SchoolAdminDashboardResponse["classes"]>();
    for (const item of data?.classes ?? []) {
      const key = category(item.level);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return (Object.keys(labels) as Category[]).filter((key) => map.has(key)).map((key) => ({ key, items: map.get(key)! }));
  }, [data]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#344976" /></View>;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Classes actives</Text>
          <Text style={styles.subtitle}>{data?.classes.length ?? 0} classe(s) · année active</Text>
        </View>
        <Pressable style={styles.addButton} onPress={() => router.push("/(app)/class-create")}>
          <Text style={styles.addButtonText}>+ Ajouter</Text>
        </Pressable>
      </View>

      {groups.map((group) => (
        <View key={group.key} style={styles.group}>
          <View style={styles.groupHeader}>
            <Text style={styles.groupTitle}>{labels[group.key]}</Text>
            <Text style={styles.groupCount}>{group.items.length}</Text>
          </View>
          {group.items.map((item) => (
            <View key={item.id} style={styles.classRow}>
              <View style={styles.main}>
                <Text style={styles.className}>{item.name}</Text>
                <Text style={styles.level}>{item.level || "Niveau non renseigné"}</Text>
              </View>
              <Text style={styles.studentCount}>{item.studentCount} élève(s)</Text>
            </View>
          ))}
        </View>
      ))}

      {groups.length === 0 ? <Text style={styles.empty}>Aucune classe active pour l'année scolaire en cours.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:{flex:1,backgroundColor:"#F8FAFC"},content:{padding:16,paddingBottom:32},
  center:{flex:1,alignItems:"center",justifyContent:"center"},header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:18},
  headerText:{flex:1},title:{fontSize:24,fontWeight:"800",color:"#344976"},subtitle:{marginTop:4,fontSize:13,color:"#6B7280"},
  addButton:{paddingHorizontal:14,paddingVertical:10,borderRadius:12,backgroundColor:"#344976"},addButtonText:{color:"#FFF",fontWeight:"800",fontSize:13},
  group:{marginBottom:16,borderRadius:16,borderWidth:1,borderColor:"#D9DEE5",backgroundColor:"#FFF",overflow:"hidden"},
  groupHeader:{padding:14,backgroundColor:"#EEF2F7",flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
  groupTitle:{fontSize:17,fontWeight:"800",color:"#344976"},groupCount:{minWidth:28,textAlign:"center",paddingVertical:5,borderRadius:14,backgroundColor:"#344976",color:"#FFF",fontWeight:"800"},
  classRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",padding:14,borderTopWidth:1,borderTopColor:"#E5E7EB"},
  main:{flex:1,paddingRight:12},className:{fontSize:15,fontWeight:"800",color:"#111827"},level:{marginTop:3,fontSize:12,color:"#6B7280"},studentCount:{fontSize:12,fontWeight:"700",color:"#344976"},
  empty:{padding:24,textAlign:"center",color:"#6B7280"},
});