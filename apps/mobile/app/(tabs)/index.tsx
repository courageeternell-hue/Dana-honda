import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

type Metrics = { prospects: number; spk: number; closing: number; prospectTarget: number; spkTarget: number };
const empty: Metrics = { prospects: 0, spk: 0, closing: 0, prospectTarget: 0, spkTarget: 0 };

function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

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
    const monthStart = dateKey(new Date(now.getFullYear(), now.getMonth(), 1));
    const nextMonth = dateKey(new Date(now.getFullYear(), now.getMonth() + 1, 1));
    try {
      const [prospects, spk, closing, targets] = await Promise.all([
        supabase.from("prospects").select("id", { count: "exact", head: true }).gte("prospect_date", monthStart).lt("prospect_date", nextMonth),
        supabase.from("spk_records").select("id", { count: "exact", head: true }).gte("spk_date", monthStart).lt("spk_date", nextMonth),
        supabase.from("spk_records").select("id", { count: "exact", head: true }).eq("status", "Jual").gte("spk_date", monthStart).lt("spk_date", nextMonth),
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
  const prospectProgress = metrics.prospectTarget > 0 ? Math.min(100, Math.round(metrics.prospects / metrics.prospectTarget * 100)) : 0;
  const spkProgress = metrics.spkTarget > 0 ? Math.min(100, Math.round(metrics.spk / metrics.spkTarget * 100)) : 0;

  return <ScrollView style={s.page} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#D71920" />}>
    <Text style={s.eyebrow}>HONDA SALES</Text><Text style={s.title}>Beranda</Text>
    <Text style={s.subtitle}>Halo, {profile?.full_name || "Sales"}! Ini ringkasan penjualanmu.</Text>
    {(profile?.role === "admin" || profile?.role === "supervisor") && <Pressable onPress={() => router.push("/admin")} style={s.manageShortcut} accessibilityRole="button" accessibilityLabel="Buka pengelolaan pengguna dan tim"><Text style={s.manageShortcutText}>Kelola Pengguna & Tim ›</Text></Pressable>}
    <View style={s.hero}><Text style={s.heroSmall}>RINGKASAN BULAN INI</Text><Text style={s.heroValue}>{profile?.role === "sales" ? "Aktivitas Saya" : "Aktivitas Tim"}</Text><Text style={s.heroText}>Tarik layar ke bawah untuk memperbarui data.</Text></View>
    <Text style={s.section}>Ringkasan</Text>
    {loading ? <View style={s.loading}><ActivityIndicator color="#D71920" /><Text style={s.loadingText}>Memuat data...</Text></View> : <>
      <View style={s.grid}>
        <Stat label="Prospek" value={String(metrics.prospects)} note="Bulan ini" />
        <Stat label="SPK" value={String(metrics.spk)} note="Bulan ini" />
        <Stat label="Closing" value={String(metrics.closing)} note="SPK status jual" />
        <Stat label="Target SPK" value={metrics.spkTarget ? String(metrics.spkTarget) : "—"} note="Target bulan ini" />
      </View>
      {!!error && <Text style={s.error}>Data belum bisa dimuat: {error}</Text>}
    </>}
    <Text style={s.section}>Target bulan ini</Text>
    <View style={s.targetCard}>
      <View style={s.progressHeader}><Text style={s.targetLabel}>Target prospek</Text><Text style={s.progressPercent}>{metrics.prospectTarget ? `${prospectProgress}%` : "—"}</Text></View>
      <Text style={s.targetValue}>{metrics.prospects} / {metrics.prospectTarget || "Belum diatur"}</Text>
      <View style={s.progressTrack}><View style={[s.progressFill,{width:`${prospectProgress}%`}]}/></View>
      <Text style={s.targetHint}>Pencapaian prospek bulan ini</Text>
      <View style={[s.progressHeader,{marginTop:18}]}><Text style={s.targetLabel}>Target SPK</Text><Text style={s.progressPercent}>{metrics.spkTarget ? `${spkProgress}%` : "—"}</Text></View>
      <Text style={s.targetValue}>{metrics.spk} / {metrics.spkTarget || "Belum diatur"}</Text>
      <View style={s.progressTrack}><View style={[s.progressFill,{width:`${spkProgress}%`}]}/></View>
      <Text style={s.targetHint}>Pencapaian SPK bulan ini</Text>
      <Text style={[s.targetHint,{marginTop:12}]}>Target ditentukan oleh Admin atau Supervisor.</Text>
    </View>
  </ScrollView>;
}

const s = StyleSheet.create({
  page:{flex:1,backgroundColor:"#F7F7F7"},content:{padding:22,paddingTop:28,paddingBottom:32},
  eyebrow:{fontSize:11,fontWeight:"800",letterSpacing:1.5,color:"#D71920"},title:{fontSize:29,fontWeight:"800",color:"#202033",marginTop:8},
  subtitle:{fontSize:14,color:"#77778A",marginTop:5},manageShortcut:{alignSelf:"flex-start",backgroundColor:"#D71920",paddingHorizontal:15,paddingVertical:11,borderRadius:11,marginTop:14},manageShortcutText:{fontSize:12,fontWeight:"800",color:"#FFFFFF"},hero:{backgroundColor:"#D71920",borderRadius:22,padding:22,marginTop:24},
  heroSmall:{color:"#FFE3E3",fontSize:10,fontWeight:"800",letterSpacing:1.2},heroValue:{color:"#FFFFFF",fontSize:24,fontWeight:"800",marginTop:12},
  heroText:{color:"#FFE3E3",fontSize:13,lineHeight:20,marginTop:6},section:{fontSize:17,fontWeight:"800",color:"#242438",marginTop:26,marginBottom:13},
  grid:{flexDirection:"row",flexWrap:"wrap",gap:12},stat:{width:"48%",flexGrow:1,backgroundColor:"#FFFFFF",borderRadius:17,padding:16,borderWidth:1,borderColor:"#EEEEEE"},
  statLabel:{fontSize:12,color:"#77778A",fontWeight:"600"},statValue:{fontSize:25,fontWeight:"800",color:"#26263B",marginTop:8},statNote:{fontSize:11,color:"#9A9AAA",marginTop:4},
  loading:{padding:28,alignItems:"center",gap:10},loadingText:{fontSize:12,color:"#858597"},error:{fontSize:12,color:"#B74747",marginTop:12,lineHeight:18},
  targetCard:{backgroundColor:"#FFF",borderRadius:17,padding:18,borderWidth:1,borderColor:"#EEEEEE"},progressHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},targetLabel:{fontSize:12,color:"#77778A",fontWeight:"700"},progressPercent:{fontSize:12,color:"#D71920",fontWeight:"900"},targetValue:{fontSize:24,fontWeight:"800",color:"#26263B",marginTop:7},progressTrack:{height:9,backgroundColor:"#F0F0F0",borderRadius:9,overflow:"hidden",marginTop:10},progressFill:{height:9,backgroundColor:"#D71920",borderRadius:9},targetHint:{fontSize:11,color:"#9A9AAA",marginTop:4}
});
