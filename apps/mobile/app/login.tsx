import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert("Data belum lengkap", "Masukkan email dan password.");
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
      router.replace("/");
    } catch (error) {
      Alert.alert("Login gagal", error instanceof Error ? error.message : "Periksa email dan password kamu.");
    } finally {
      setBusy(false);
    }
  }

  return <KeyboardAvoidingView style={s.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <View style={s.brand}><Text style={s.brandMark}>H</Text><Text style={s.brandName}>HONDA SALES</Text><Text style={s.tagline}>Sales Report & Management</Text></View>
    <View style={s.card}>
      <Text style={s.title}>Selamat datang</Text><Text style={s.subtitle}>Masuk menggunakan akun yang diberikan administrator.</Text>
      <Text style={s.label}>Email</Text>
      <TextInput value={email} onChangeText={setEmail} placeholder="nama@email.com" placeholderTextColor="#A1A1B0" autoCapitalize="none" keyboardType="email-address" autoCorrect={false} style={s.input} />
      <Text style={s.label}>Password</Text>
      <TextInput value={password} onChangeText={setPassword} placeholder="Masukkan password" placeholderTextColor="#A1A1B0" secureTextEntry autoCapitalize="none" style={s.input} />
      <Pressable onPress={handleLogin} disabled={busy} style={({ pressed }) => [s.button, pressed && s.pressed, busy && s.disabled]}>
        {busy ? <ActivityIndicator color="#FFF" /> : <Text style={s.buttonText}>Masuk</Text>}
      </Pressable>
      <Text style={s.help}>Belum punya akun? Hubungi administrator Honda Sales.</Text>
    </View>
    <Text style={s.footer}>Akses khusus tim penjualan</Text>
  </KeyboardAvoidingView>;
}
const s = StyleSheet.create({
  page:{flex:1,backgroundColor:"#F7F7F7",justifyContent:"center",padding:24},
  brand:{alignItems:"center",marginBottom:28},
  brandMark:{width:58,height:58,borderRadius:19,backgroundColor:"#D71920",color:"#FFF",textAlign:"center",textAlignVertical:"center",fontSize:30,fontWeight:"900",overflow:"hidden"},
  brandName:{fontSize:12,fontWeight:"900",letterSpacing:2,color:"#D71920",marginTop:13},
  tagline:{fontSize:13,color:"#858597",marginTop:5},
  card:{backgroundColor:"#FFF",borderRadius:24,padding:22,borderWidth:1,borderColor:"#EEEEEE"},
  title:{fontSize:24,fontWeight:"800",color:"#242438"},
  subtitle:{fontSize:13,color:"#858597",lineHeight:19,marginTop:7,marginBottom:22},
  label:{fontSize:12,fontWeight:"700",color:"#45455A",marginBottom:8,marginTop:12},
  input:{height:50,borderWidth:1,borderColor:"#E8E8E8",borderRadius:13,paddingHorizontal:14,fontSize:14,color:"#25253A",backgroundColor:"#FCFCFC"},
  button:{height:52,borderRadius:14,backgroundColor:"#D71920",alignItems:"center",justifyContent:"center",marginTop:24},
  buttonText:{fontSize:15,fontWeight:"800",color:"#FFF"},
  pressed:{opacity:0.88},disabled:{opacity:0.6},
  help:{fontSize:11,color:"#9292A3",textAlign:"center",lineHeight:17,marginTop:16},
  footer:{fontSize:11,color:"#A0A0AE",textAlign:"center",marginTop:22}
});
