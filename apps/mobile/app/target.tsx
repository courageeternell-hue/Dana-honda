import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LiquidPressable as Pressable } from "@/components/LiquidPressable";
import { Redirect, router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

type Member = { id: string; full_name: string; role: string };
type TargetRow = { user_id: string; prospect_target: number; spk_target: number };
const month = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`; };

export default function TargetScreen() {
 const { profile } = useAuth();
 const [members,setMembers]=useState<Member[]>([]);
 const [values,setValues]=useState<Record<string,{prospect:string;spk:string}>>({});
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const load=useCallback(async()=>{
  const [u,t]=await Promise.all([
   supabase.from("profiles").select("id,full_name,role").eq("is_active",true).order("full_name"),
   supabase.from("sales_targets").select("user_id,prospect_target,spk_target").eq("target_month",month())
  ]);
  if(u.error||t.error){setError(u.error?.message||t.error?.message||"Gagal memuat target.");setLoading(false);return;}
  setMembers((u.data||[]) as Member[]);
  const next:Record<string,{prospect:string;spk:string}>={};
  (u.data||[]).forEach(m=>{const row=(t.data||[]).find(x=>x.user_id===m.id);next[m.id]={prospect:String(row?.prospect_target??0),spk:String(row?.spk_target??0)};});
  setValues(next);setLoading(false);
 },[]);
 useEffect(()=>{void load();},[load]);
 if(profile?.role!=="admin"&&profile?.role!=="supervisor") return <Redirect href="/(tabs)"/>;
 async function save(){
  setSaving(true);
  const rows=members.map(m=>({user_id:m.id,target_month:month(),prospect_target:Math.max(0,Math.floor(Number(values[m.id]?.prospect)||0)),spk_target:Math.max(0,Math.floor(Number(values[m.id]?.spk)||0))}));
  const {error}=await supabase.from("sales_targets").upsert(rows,{onConflict:"user_id,target_month"});
  setSaving(false);
  if(error){Alert.alert("Gagal menyimpan target",error.message);return;}
  Alert.alert("Berhasil","Target bulan ini sudah diperbarui.");
 }
 return <ScrollView style={s.page} contentContainerStyle={s.content}>
  <Pressable onPress={()=>router.back()}><Text style={s.back}>‹ Kembali ke Dashboard</Text></Pressable>
  <Text style={s.title}>Atur Target Sales</Text><Text style={s.sub}>Target bulan {month().slice(0,7)}. Isi target prospek dan SPK untuk setiap pengguna.</Text>
  {loading?<ActivityIndicator color="#D71920"/>:members.map(m=><View key={m.id} style={s.card}>
   <Text style={s.name}>{m.full_name||"Tanpa nama"}</Text><Text style={s.role}>{m.role.toUpperCase()}</Text>
   <View style={s.row}><View style={s.field}><Text style={s.label}>Target Prospek</Text><TextInput keyboardType="number-pad" value={values[m.id]?.prospect??"0"} onChangeText={v=>setValues(p=>({...p,[m.id]:{...p[m.id],prospect:v}}))} style={s.input}/></View>
   <View style={s.field}><Text style={s.label}>Target SPK</Text><TextInput keyboardType="number-pad" value={values[m.id]?.spk??"0"} onChangeText={v=>setValues(p=>({...p,[m.id]:{...p[m.id],spk:v}}))} style={s.input}/></View></View>
  </View>)}
  {!!error&&<Text style={s.error}>{error}</Text>}
  <Pressable disabled={saving||loading} onPress={save} style={s.save}>{saving?<ActivityIndicator color="#FFF"/>:<Text style={s.saveText}>Simpan Semua Target</Text>}</Pressable>
 </ScrollView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:"#F4F5F7"},content:{paddingHorizontal:22,paddingTop:26,paddingBottom:44},back:{color:"#D71920",fontWeight:"800",fontSize:14,marginBottom:24},title:{fontSize:26,fontWeight:"900",color:"#202033"},sub:{fontSize:14,color:"#858597",lineHeight:21,marginTop:9,marginBottom:22},card:{backgroundColor:"#FFF",borderRadius:18,padding:20,marginBottom:16,borderWidth:1,borderColor:"#E8EAF0",shadowColor:"#172033",shadowOpacity:0.045,shadowRadius:11,shadowOffset:{width:0,height:4},elevation:2},name:{fontSize:15,fontWeight:"800",color:"#29293D"},role:{fontSize:12,color:"#D71920",fontWeight:"800",marginTop:4},row:{flexDirection:"row",gap:14,marginTop:18},field:{flex:1},label:{fontSize:13,color:"#77778A",fontWeight:"700",marginBottom:6},input:{height:54,borderWidth:1,borderColor:"#E8E8E8",borderRadius:14,paddingHorizontal:12,color:"#25253A"},save:{height:56,backgroundColor:"#D71920",borderRadius:14,alignItems:"center",justifyContent:"center",marginTop:18},saveText:{color:"#FFF",fontWeight:"800"},error:{color:"#B74747",fontSize:14}});
