import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
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
    catch (error) { Alert.alert("Login gagal", error instanceof Error ? error.message : "Periksa email dan password kamu."); }
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

  return <KeyboardAvoidingView style={s.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <View style={s.redHeader}>
      <View style={s.brandRow}>
        <View style={s.logo}><Text style={s.logoText}>AS</Text><View style={s.logoSwoosh}/></View>
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
      <Pressable onPress={handleLogin} disabled={busy} style={({pressed})=>[s.button,pressed&&{opacity:.88},busy&&{opacity:.6}]}>
        {busy?<ActivityIndicator color="#FFF"/>:<Text style={s.buttonText}>Login</Text>}
      </Pressable>
      <Text style={s.help}>Belum punya akun? Hubungi administrator Honda Sales.</Text>
    </View>
    <Text style={s.footer}>ASISTEN SALES • AKSES KHUSUS TIM PENJUALAN</Text>
  </KeyboardAvoidingView>;
}
const s=StyleSheet.create({
 page:{flex:1,backgroundColor:"#F6F6F7"},
 redHeader:{height:290,backgroundColor:"#E60012",paddingTop:58,paddingHorizontal:25,overflow:"hidden"},
 brandRow:{flexDirection:"row",alignItems:"center",gap:12},
 logo:{width:54,height:54,borderRadius:17,backgroundColor:"#FFF",alignItems:"center",justifyContent:"center",overflow:"hidden"},
 logoText:{fontSize:21,fontWeight:"900",fontStyle:"italic",color:"#E60012"},
 logoSwoosh:{position:"absolute",width:42,height:7,backgroundColor:"#E60012",borderRadius:9,transform:[{rotate:"-22deg"}],bottom:10,right:2},
 brandName:{fontSize:15,fontWeight:"900",fontStyle:"italic",letterSpacing:1,color:"#FFF"},
 brandSub:{fontSize:9,fontWeight:"700",letterSpacing:1.5,color:"#FFE4E6",marginTop:4},
 headerTitle:{fontSize:29,fontWeight:"900",fontStyle:"italic",color:"#FFF",marginTop:30,lineHeight:34},
 headerSub:{fontSize:12,color:"#FFE4E6",marginTop:8,lineHeight:18,maxWidth:260},
 headerOrb:{position:"absolute",width:210,height:210,borderRadius:105,borderWidth:30,borderColor:"rgba(255,255,255,.08)",right:-85,bottom:-100},
 sheet:{flex:1,marginTop:-25,backgroundColor:"#FFF",borderTopLeftRadius:28,borderTopRightRadius:28,paddingHorizontal:24,paddingTop:27},
 title:{fontSize:25,fontWeight:"900",color:"#202027"},subtitle:{fontSize:12,color:"#85858F",lineHeight:18,marginTop:7,marginBottom:19},
 label:{fontSize:12,fontWeight:"800",color:"#41414A",marginBottom:8,marginTop:12},
 inputWrap:{height:52,flexDirection:"row",alignItems:"center",gap:10,borderWidth:1,borderColor:"#E8E8EB",borderRadius:14,paddingHorizontal:14,backgroundColor:"#FCFCFD"},
 input:{flex:1,fontSize:14,color:"#25252C",paddingVertical:0},
 forgot:{alignSelf:"flex-end",paddingVertical:13},forgotText:{fontSize:12,fontWeight:"800",color:"#E60012"},
 button:{height:54,borderRadius:15,backgroundColor:"#E60012",alignItems:"center",justifyContent:"center",marginTop:7,shadowColor:"#E60012",shadowOpacity:.2,shadowRadius:10,shadowOffset:{width:0,height:5},elevation:4},
 buttonText:{fontSize:15,fontWeight:"900",color:"#FFF"},
 help:{fontSize:11,color:"#92929A",textAlign:"center",lineHeight:17,marginTop:17},
 footer:{fontSize:9,fontWeight:"700",letterSpacing:1,color:"#A0A0A8",textAlign:"center",paddingVertical:15}
});