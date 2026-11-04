import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

type Metrics = { prospects: number; spk: number; closing: number; prospectTarget: number; spkTarget: number };
const empty: Metrics = { prospects: 0, spk: 0, closing: 0, prospectTarget: 0, spkTarget: 0 };

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return <View style={s.stat}><Text style={s.statLabel}>{label}</Text><Text style={s.statValue}>{value}</Text><Text style={s.statNote}>{note}</Text></View>;
}

export default function HomeScreen() {
  const { profile } = useAuth();
  const [metrics, setMetrics] = useState<Metrics>(empty);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadMetrics = useCallback(async () => {
    if (!profile) return;
    setError("");
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10);
    try {
      const [prospects, spk, closing, targets] = await Promise.all([
        supabase.from("prospects").select("id", { count: "exact", head: true }),
        supabase.from("spk_records").select("id", { count: "exact", head: true }),
        supabase.from("spk_records").select("id", { count: "exact", head: true }).eq("status", "Jual"),
        supabase.from("sales_targets").select("prospect_target, spk_target").gte("target_month", monthStart).lt("target_month", nextMonth),
      ]);
      const failed = [prospects.error, spk.error, closing.error, targets.error].find(Boolean);
      if (failed) throw failed;
      const targetRows = targets.data ?? [];
      setMetrics({
        prospects: prospects.count ?? 0,
        spk: spk.count ?? 0,
        closing: closing.count ?? 0,
        prospectTarget: targetRows.reduce((sum, row) => sum + (row.prospect_target ?? 0), 0),
        spkTarget: targetRows.reduce((sum, row) => sum + (row.spk_target ?? 0), 0),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat ringkasan.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile]);

  useEffect(() => { loadMetrics(); }, [loadMetrics]);
  const refresh = () => { setRefreshing(true); loadMetrics(); };

  return <ScrollView style={s.page} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#5B4BDB" />}>
    <Text style={s.eyebrow}>HONDA SALES</Text><Text style={s.title}>Beranda</Text>
    <Text style={s.subtitle}>Halo, {profile?.full_name || "Sales"}! Ini ringkasan penjualanmu.</Text>
    <View style={s.hero}><Text style={s.heroSmall}>RINGKASAN PENJUALAN</Text><Text style={s.heroValue}>{profile?.role === "sales" ? "Aktivitas Saya" : "Aktivitas Tim"}</Text><Text style={s.heroText}>Tarik layar ke bawah untuk memperbarui data.</Text></View>
    <Text style={s.section}>Ringkasan</Text>
    {loading ? <View style={s.loading}><ActivityIndicator color="#5B4BDB" /><Text style={s.loadingText}>Memuat data...</Text></View> : <>
      <View style={s.grid}>
        <Stat label="Prospek" value={String(metrics.prospects)} note="Total prospek" />
        <Stat label="SPK" value={String(metrics.spk)} note="Total SPK" />
        <Stat label="Closing" value={String(metrics.closing)} note="SPK status jual" />
        <Stat label="Target SPK" value={metrics.spkTarget ? String(metrics.spkTarget) : "—"} note="Target bulan ini" />
      </View>
      {!!error && <Text style={s.error}>Data belum bisa dimuat: {error}</Text>}
    </>}
    <Text style={s.section}>Target bulan ini</Text>
    <View style={s.targetCard}><Text style={s.targetLabel}>Target prospek</Text><Text style={s.targetValue}>{metrics.prospectTarget || "Belum diatur"}</Text><Text style={s.targetHint}>Target ditentukan oleh admin atau supervisor.</Text></View>
  </ScrollView>;
}

const s = StyleSheet.create({
  page:{flex:1,backgroundColor:"#F7F7FB"},content:{padding:22,paddingTop:28,paddingBottom:32},
  eyebrow:{fontSize:11,fontWeight:"800",letterSpacing:1.5,color:"#5B4BDB"},title:{fontSize:29,fontWeight:"800",color:"#202033",marginTop:8},
  subtitle:{fontSize:14,color:"#77778A",marginTop:5},hero:{backgroundColor:"#5B4BDB",borderRadius:22,padding:22,marginTop:24},
  heroSmall:{color:"#DCD8FF",fontSize:10,fontWeight:"800",letterSpacing:1.2},heroValue:{color:"#FFFFFF",fontSize:24,fontWeight:"800",marginTop:12},
  heroText:{color:"#E9E7FF",fontSize:13,lineHeight:20,marginTop:6},section:{fontSize:17,fontWeight:"800",color:"#242438",marginTop:26,marginBottom:13},
  grid:{flexDirection:"row",flexWrap:"wrap",gap:12},stat:{width:"48%",flexGrow:1,backgroundColor:"#FFFFFF",borderRadius:17,padding:16,borderWidth:1,borderColor:"#EEEEF5"},
  statLabel:{fontSize:12,color:"#77778A",fontWeight:"600"},statValue:{fontSize:25,fontWeight:"800",color:"#26263B",marginTop:8},statNote:{fontSize:11,color:"#9A9AAA",marginTop:4},
  loading:{padding:28,alignItems:"center",gap:10},loadingText:{fontSize:12,color:"#858597"},error:{fontSize:12,color:"#B74747",marginTop:12,lineHeight:18},
  targetCard:{backgroundColor:"#FFF",borderRadius:17,padding:18,borderWidth:1,borderColor:"#EEEEF5"},targetLabel:{fontSize:12,color:"#77778A"},targetValue:{fontSize:24,fontWeight:"800",color:"#26263B",marginTop:7},targetHint:{fontSize:11,color:"#9A9AAA",marginTop:4}
});
