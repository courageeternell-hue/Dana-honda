import { useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LiquidPressable as Pressable } from "@/components/LiquidPressable";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) { Alert.alert("Data belum lengkap", "Masukkan email dan password."); return; }
    setBusy(true);
    try { await signIn(email, password); router.replace("/"); }
    catch (error) { const message = error instanceof Error ? error.message : ""; Alert.alert("Login gagal", /invalid login credentials|user not found|akun belum tersedia/i.test(message) ? "Akun belum tersedia atau email/password salah. Hubungi Admin/Supervisor." : message || "Periksa email dan password kamu."); }
    finally { setBusy(false); }
  }

  async function forgotPassword() {
    if (!email.trim()) { Alert.alert("Masukkan email", "Isi email akun terlebih dahulu untuk menerima tautan reset password."); return; }
    setResetBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setResetBusy(false);
    if (error) Alert.alert("Tidak dapat mengirim tautan", error.message);
    else Alert.alert("Periksa email", "Jika email terdaftar, tautan pemulihan akan dikirim.");
  }

  return <KeyboardAvoidingView style={s.page} behavior={Platform.OS === "ios" ? "padding" : "height"}><ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <View style={s.redHeader}>
      <View style={s.brandRow}>
        <View style={s.logo}><Image source={require("../assets/dana-honda-icon.png")} style={s.logoImage} resizeMode="contain" /></View>
        <View><Text style={s.brandName}>ASISTEN SALES</Text><Text style={s.brandSub}>SALES MANAGEMENT APP</Text></View>
      </View>
      <Text style={s.headerTitle}>Kelola penjualan{ "\n" }lebih mudah.</Text>
      <Text style={s.headerSub}>Satu aplikasi untuk prospek, SPK, dan aktivitas tim.</Text>
      <View style={s.headerOrb}/>
    </View>
    <View style={s.sheet}>
      <Text style={s.title}>Selamat Datang</Text>
      <Text style={s.subtitle}>Masuk menggunakan akun yang diberikan administrator.</Text>
      <Text style={s.label}>Email</Text>
      <View style={s.inputWrap}><Ionicons name="mail-outline" size={18} color="#9B9BA5"/><TextInput value={email} onChangeText={setEmail} placeholder="nama@email.com" placeholderTextColor="#A1A1B0" autoCapitalize="none" keyboardType="email-address" autoCorrect={false} style={s.input}/></View>
      <Text style={s.label}>Password</Text>
      <View style={s.inputWrap}><Ionicons name="lock-closed-outline" size={18} color="#9B9BA5"/><TextInput value={password} onChangeText={setPassword} placeholder="Masukkan password" placeholderTextColor="#A1A1B0" secureTextEntry={!showPassword} autoCapitalize="none" style={s.input}/><Pressable onPress={()=>setShowPassword(v=>!v)} accessibilityRole="button" accessibilityLabel={showPassword?"Sembunyikan password":"Tampilkan password"} hitSlop={10}><Ionicons name={showPassword?"eye-off-outline":"eye-outline"} size={19} color="#777783"/></Pressable></View>
      <Pressable onPress={forgotPassword} disabled={resetBusy} style={s.forgot}><Text style={s.forgotText}>{resetBusy?"Mengirim...":"Lupa Password?"}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Masuk ke aplikasi" onPress={handleLogin} disabled={busy} style={({pressed})=>[s.button,pressed&&{opacity:.88},busy&&{opacity:.6}]}>
        {busy?<ActivityIndicator color="#FFF"/>:<Text style={s.buttonText}>MASUK</Text>}
      </Pressable>
      <Text style={s.help}>Belum punya akun? Hubungi administrator Honda Sales.</Text>
    </View>
    <Text style={s.footer}>ASISTEN SALES • AKSES KHUSUS TIM PENJUALAN</Text>
    </ScrollView></KeyboardAvoidingView>;
}
const s=StyleSheet.create({
 page:{flex:1,backgroundColor:"#F6F6F7"},
 scrollContent:{flexGrow:1},
 redHeader:{height:260,backgroundColor:"#E60012",paddingTop:58,paddingHorizontal:27,overflow:"hidden"},
 brandRow:{flexDirection:"row",alignItems:"center",gap:13},
 logo:{width:54,height:60,borderRadius:17,backgroundColor:"#FFF",alignItems:"center",justifyContent:"center",overflow:"hidden"},
 logoImage:{width:46,height:52},
 
 brandName:{fontSize:16,fontWeight:"900",fontStyle:"italic",letterSpacing:1,color:"#FFF"},
 brandSub:{fontSize:11,fontWeight:"700",letterSpacing:1.5,color:"#FFE4E6",marginTop:4},
 headerTitle:{fontSize:30,fontWeight:"900",fontStyle:"italic",color:"#FFF",marginTop:30,lineHeight:36},
 headerSub:{fontSize:14,color:"#FFE4E6",marginTop:8,lineHeight:20,maxWidth:260},
 headerOrb:{position:"absolute",width:210,height:210,borderRadius:105,borderWidth:30,borderColor:"rgba(255,255,255,.08)",right:-85,bottom:-100},
 sheet:{flexGrow:1,marginTop:-25,backgroundColor:"#FFF",borderTopLeftRadius:28,borderTopRightRadius:28,paddingHorizontal:26,paddingTop:27},
 title:{fontSize:26,fontWeight:"900",color:"#202027"},subtitle:{fontSize:14,color:"#85858F",lineHeight:20,marginTop:7,marginBottom:19},
 label:{fontSize:14,fontWeight:"800",color:"#41414A",marginBottom:8,marginTop:12},
 inputWrap:{height:58,flexDirection:"row",alignItems:"center",gap:11,borderWidth:1,borderColor:"#E8E8EB",borderRadius:14,paddingHorizontal:16,backgroundColor:"#FCFCFD"},
 input:{flex:1,fontSize:15,color:"#25252C",paddingVertical:2},
 forgot:{alignSelf:"flex-end",paddingVertical:15},forgotText:{fontSize:14,fontWeight:"800",color:"#E60012"},
 button:{height:60,borderRadius:15,backgroundColor:"#E60012",alignItems:"center",justifyContent:"center",marginTop:7,shadowColor:"#E60012",shadowOpacity:.2,shadowRadius:10,shadowOffset:{width:0,height:5},elevation:4},
 buttonText:{fontSize:16,fontWeight:"900",color:"#FFF"},
 help:{fontSize:13,color:"#92929A",textAlign:"center",lineHeight:19,marginTop:17},
 footer:{fontSize:11,fontWeight:"700",letterSpacing:1,color:"#A0A0A8",textAlign:"center",paddingVertical:17}
});