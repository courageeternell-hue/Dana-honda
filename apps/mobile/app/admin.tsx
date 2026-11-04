import { Redirect, router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminDashboard() {
  const { profile } = useAuth();
  if (profile?.role !== "admin" && profile?.role !== "supervisor") return <Redirect href="/(tabs)" />;
  return <View style={s.page}>
    <Pressable onPress={() => router.back()}><Text style={s.back}>‹ Kembali ke Profil</Text></Pressable>
    <Text style={s.title}>Dasbor {profile.role === "admin" ? "Admin" : "Supervisor"}</Text>
    <Text style={s.subtitle}>Ringkasan tim dan pengelolaan penjualan.</Text>
    <View style={s.card}><Text style={s.cardTitle}>Ringkasan tim</Text><Text style={s.cardText}>Data prospek, SPK, dan target tim akan ditampilkan di sini.</Text></View>
    {profile.role === "admin" && <View style={s.card}><Text style={s.cardTitle}>Manajemen pengguna</Text><Text style={s.cardText}>Pengelolaan akun dan role hanya tersedia untuk admin.</Text></View>}
  </View>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:"#F7F7FB",padding:22,paddingTop:30},back:{fontSize:13,color:"#5B4BDB",fontWeight:"700",marginBottom:25},title:{fontSize:26,fontWeight:"800",color:"#202033"},subtitle:{fontSize:13,color:"#858597",marginTop:6},card:{backgroundColor:"#FFF",borderRadius:18,padding:19,marginTop:20,borderWidth:1,borderColor:"#EEEEF5"},cardTitle:{fontSize:15,fontWeight:"800",color:"#29293D"},cardText:{fontSize:12,color:"#858597",lineHeight:18,marginTop:7}});
