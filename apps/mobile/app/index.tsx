import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";

export default function IndexRoute() {
  const { session, loading, profile } = useAuth();
  if (loading) return <View style={s.page}>
    <View style={s.logo}><Text style={s.logoText}>AS</Text><View style={s.swoosh}/></View>
    <Text style={s.brand}>ASISTEN SALES</Text>
    <Text style={s.tagline}>Sales Management App</Text>
    <ActivityIndicator color="#E60012" size="small" style={{marginTop:30}}/>
    <Text style={s.loading}>Menyiapkan aplikasi...</Text>
  </View>;
  if (!session || !profile) return <Redirect href="/login" />;
  return <Redirect href="/(tabs)" />;
}
const s=StyleSheet.create({
 page:{flex:1,alignItems:"center",justifyContent:"center",backgroundColor:"#FFF"},
 logo:{width:104,height:104,borderRadius:30,backgroundColor:"#E60012",alignItems:"center",justifyContent:"center",overflow:"hidden",elevation:9,shadowColor:"#9B0010",shadowOpacity:.22,shadowRadius:14,shadowOffset:{width:0,height:7}},
 logoText:{fontSize:40,fontWeight:"900",fontStyle:"italic",color:"#FFF"},
 swoosh:{position:"absolute",width:84,height:11,borderRadius:20,backgroundColor:"#FFF",transform:[{rotate:"-23deg"}],bottom:25,right:5},
 brand:{fontSize:20,fontWeight:"900",fontStyle:"italic",letterSpacing:1.5,color:"#17171B",marginTop:22},
 tagline:{fontSize:12,color:"#888891",letterSpacing:.6,marginTop:6},
 loading:{fontSize:11,color:"#9999A1",marginTop:9}
});