import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { LiquidPressable as Pressable } from "@/components/LiquidPressable";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
type P={id:string;customer_name:string;phone:string;unit_interest:string|null;status:string;follow_up:string|null};
export default function FollowUp(){const {profile}=useAuth();const [items,setItems]=useState<P[]>([]);const [loading,setLoading]=useState(true);
 const load=useCallback(async()=>{if(!profile)return;const {data}=await supabase.from("prospects").select("id,customer_name,phone,unit_interest,status,follow_up").not("follow_up","is",null).order("follow_up",{ascending:true});setItems((data??[]) as P[]);setLoading(false);},[profile]);useEffect(()=>{load();},[load]);
 const today=new Date().toISOString().slice(0,10),due=items.filter(x=>(x.follow_up||"")<=today),upcoming=items.filter(x=>(x.follow_up||"")>today);
 return (
  <ScrollView
   style={s.page}
   contentContainerStyle={s.content}
   refreshControl={
    <RefreshControl
     refreshing={false}
     onRefresh={load}
     tintColor="#E60012"
    />
   }
  >
   <Header />
   <Text style={s.section}>Perlu ditindaklanjuti</Text>
   {loading ? (
    <ActivityIndicator color="#E60012" />
   ) : due.length ? (
    due.map(x => <Follow key={x.id} item={x} />)
   ) : (
    <Empty text="Tidak ada follow-up yang jatuh tempo." />
   )}
   <Text style={s.section}>Jadwal berikutnya</Text>
   {upcoming.length ? (
    upcoming.map(x => <Follow key={x.id} item={x} />)
   ) : (
    <Empty text="Belum ada jadwal follow-up." />
   )}
  </ScrollView>
 );
function Header(){return <View style={s.header}><Pressable glass={false} onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#24242A"/></Pressable><View><Text style={s.title}>Follow-up</Text><Text style={s.sub}>Jadwal kontak pelanggan</Text></View></View>}
function Follow({item}:{item:P}){return <Pressable glass={false} style={s.item} onPress={()=>router.push("/(tabs)/prospek")}><View style={s.icon}><Ionicons name="time-outline" size={20} color="#E60012"/></View><View style={s.body}><Text style={s.name}>{item.customer_name}</Text><Text style={s.meta}>{item.unit_interest||"Motor belum ditentukan"} • {item.status}</Text><Text style={s.date}>{item.follow_up}</Text></View><Ionicons name="chevron-forward" size={18} color="#A0A0A8"/></Pressable>}
function Empty({text}:{text:string}){return <View style={s.empty}><Ionicons name="checkmark-circle-outline" size={26} color="#B0B0B8"/><Text style={s.emptyText}>{text}</Text></View>}
const s=StyleSheet.create({page:{flex:1,backgroundColor:"#F4F5F7"},content:{padding:20,paddingBottom:40},header:{flexDirection:"row",alignItems:"center",gap:12,marginBottom:18},back:{width:44,height:44,borderRadius:14,backgroundColor:"#FFF",alignItems:"center",justifyContent:"center"},title:{fontSize:25,fontWeight:"900",color:"#24242A"},sub:{fontSize:12,color:"#888891",marginTop:3},section:{fontSize:16,fontWeight:"900",color:"#24242A",marginTop:14,marginBottom:10},item:{backgroundColor:"#FFF",borderRadius:17,padding:15,flexDirection:"row",alignItems:"center",borderWidth:1,borderColor:"#E8EAF0",marginBottom:10},icon:{width:39,height:39,borderRadius:12,backgroundColor:"#FFF0F1",alignItems:"center",justifyContent:"center"},body:{flex:1,marginLeft:12},name:{fontSize:14,fontWeight:"900",color:"#292930"},meta:{fontSize:11,color:"#85858E",marginTop:3},date:{fontSize:11,fontWeight:"800",color:"#E60012",marginTop:5},empty:{backgroundColor:"#FFF",borderRadius:17,padding:20,alignItems:"center",borderWidth:1,borderColor:"#E8EAF0"},emptyText:{fontSize:12,color:"#92929A",marginTop:7,textAlign:"center"}});
