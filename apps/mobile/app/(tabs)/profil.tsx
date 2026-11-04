import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

const roleLabel = { admin: "Administrator", supervisor: "Supervisor", sales: "Sales" } as const;

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();
  const canManage = profile?.role === "admin" || profile?.role === "supervisor";
  async function confirmSignOut() {
    Alert.alert("Keluar akun", "Yakin ingin keluar dari aplikasi?", [
      { text: "Batal", style: "cancel" },
      { text: "Keluar", style: "destructive", onPress: async () => { try { await signOut(); router.replace("/login"); } catch { Alert.alert("Gagal keluar", "Coba lagi."); } } }
    ]);
  }
  return <View style={s.page}>
    <Text style={s.title}>Profil</Text>
    <View style={s.profile}>
      <View style={s.avatar}><Text style={s.avatarText}>{(profile?.full_name || "HS").slice(0,1).toUpperCase()}</Text></View>
      <View style={{flex:1}}><Text style={s.name}>{profile?.full_name || "Pengguna Honda Sales"}</Text><Text style={s.role}>{roleLabel[profile?.role ?? "sales"]}</Text><Text style={s.email}>{profile?.email || ""}</Text></View>
    </View>
    <Text style={s.section}>Menu akun</Text>
    <View style={s.menu}>
      {canManage && <Pressable style={s.menuItem} onPress={() => router.push("/admin")}><Text style={s.menuText}>Dasbor Admin / Supervisor</Text><Text style={s.chevron}>›</Text></Pressable>}
      <Pressable style={s.menuItem} onPress={() => Alert.alert("Informasi akun", `Nama: ${profile?.full_name || "-"}\nEmail: ${profile?.email || "-"}\nRole: ${roleLabel[profile?.role ?? "sales"]}`, [{ text: "Tutup" }])}><Text style={s.menuText}>Informasi akun</Text><Text style={s.chevron}>›</Text></Pressable>
    </View>
    <Pressable onPress={confirmSignOut} style={s.logout}><Text style={s.logoutText}>Keluar akun</Text></Pressable>
    <Text style={s.note}>Hak akses mengikuti role yang ditetapkan administrator.</Text>
  </View>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:"#F7F7FB",padding:22,paddingTop:30},title:{fontSize:28,fontWeight:"800",color:"#202033"},profile:{marginTop:22,backgroundColor:"#FFF",padding:18,borderRadius:18,flexDirection:"row",alignItems:"center",gap:14,borderWidth:1,borderColor:"#EEEEF5"},avatar:{width:48,height:48,borderRadius:16,backgroundColor:"#ECEAFF",alignItems:"center",justifyContent:"center"},avatarText:{fontSize:18,fontWeight:"800",color:"#5B4BDB"},name:{fontSize:15,fontWeight:"800",color:"#25253A"},role:{fontSize:12,color:"#5B4BDB",fontWeight:"700",marginTop:3},email:{fontSize:11,color:"#858597",marginTop:3},section:{fontSize:16,fontWeight:"800",color:"#242438",marginTop:26,marginBottom:12},menu:{backgroundColor:"#FFF",borderRadius:18,paddingHorizontal:18,borderWidth:1,borderColor:"#EEEEF5"},menuItem:{minHeight:52,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderBottomWidth:1,borderBottomColor:"#F0F0F5"},menuText:{fontSize:14,color:"#333348",fontWeight:"600"},chevron:{fontSize:24,color:"#A0A0AE"},logout:{marginTop:24,backgroundColor:"#FFF",borderColor:"#F0DCDC",borderWidth:1,borderRadius:14,padding:16,alignItems:"center"},logoutText:{fontSize:14,fontWeight:"800",color:"#C44545"},note:{fontSize:12,color:"#858597",lineHeight:18,marginTop:12}});
