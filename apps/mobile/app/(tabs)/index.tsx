import { ScrollView, StyleSheet, Text, View } from "react-native";
const purple = "#5B4BDB";
function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return <View style={s.stat}><Text style={s.statLabel}>{label}</Text><Text style={s.statValue}>{value}</Text><Text style={s.statNote}>{note}</Text></View>;
}
export default function HomeScreen() {
  return <ScrollView style={s.page} contentContainerStyle={s.content}>
    <Text style={s.eyebrow}>HONDA SALES</Text><Text style={s.title}>Beranda</Text>
    <Text style={s.subtitle}>Pantau aktivitas penjualanmu hari ini.</Text>
    <View style={s.hero}><Text style={s.heroSmall}>RINGKASAN PENJUALAN</Text><Text style={s.heroValue}>Halo, Sales!</Text><Text style={s.heroText}>Semua data penjualan akan tampil di sini setelah akun terhubung.</Text></View>
    <Text style={s.section}>Ringkasan</Text>
    <View style={s.grid}><Stat label="Prospek" value="—" note="Total prospek" /><Stat label="SPK" value="—" note="Total pengajuan" /><Stat label="Closing" value="—" note="Unit terjual" /><Stat label="Target" value="—" note="Pencapaian bulan ini" /></View>
    <Text style={s.section}>Aktivitas terbaru</Text>
    <View style={s.empty}><Text style={s.emptyTitle}>Belum ada aktivitas</Text><Text style={s.emptyText}>Prospek dan SPK terbaru akan muncul di bagian ini.</Text></View>
  </ScrollView>;
}
const s = StyleSheet.create({page:{flex:1,backgroundColor:"#F7F7FB"},content:{padding:22,paddingTop:28,paddingBottom:32},eyebrow:{fontSize:11,fontWeight:"800",letterSpacing:1.5,color:purple},title:{fontSize:29,fontWeight:"800",color:"#202033",marginTop:8},subtitle:{fontSize:14,color:"#77778A",marginTop:5},hero:{backgroundColor:purple,borderRadius:22,padding:22,marginTop:24},heroSmall:{color:"#DCD8FF",fontSize:10,fontWeight:"800",letterSpacing:1.2},heroValue:{color:"#FFFFFF",fontSize:24,fontWeight:"800",marginTop:12},heroText:{color:"#E9E7FF",fontSize:13,lineHeight:20,marginTop:6},section:{fontSize:17,fontWeight:"800",color:"#242438",marginTop:26,marginBottom:13},grid:{flexDirection:"row",flexWrap:"wrap",gap:12},stat:{width:"48%",flexGrow:1,backgroundColor:"#FFFFFF",borderRadius:17,padding:16,borderWidth:1,borderColor:"#EEEEF5"},statLabel:{fontSize:12,color:"#77778A",fontWeight:"600"},statValue:{fontSize:25,fontWeight:"800",color:"#26263B",marginTop:8},statNote:{fontSize:11,color:"#9A9AAA",marginTop:4},empty:{backgroundColor:"#FFFFFF",padding:20,borderRadius:17,borderWidth:1,borderColor:"#EEEEF5"},emptyTitle:{fontWeight:"700",color:"#29293D"},emptyText:{color:"#89899A",fontSize:12,marginTop:5,lineHeight:18}});
