import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

type TeamMember = { id: string; full_name: string; role: "admin" | "supervisor" | "sales"; is_active: boolean };
type TeamStat = { prospects: number; spk: number; closing: number };
const zero: TeamStat = { prospects: 0, spk: 0, closing: 0 };
function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [stats, setStats] = useState<Record<string, TeamStat>>({});
  const [totals, setTotals] = useState<TeamStat>(zero);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!profile || (profile.role !== "admin" && profile.role !== "supervisor")) return;
    setError("");
    const now = new Date();
    const start = dateKey(new Date(now.getFullYear(), now.getMonth(), 1));
    const end = dateKey(new Date(now.getFullYear(), now.getMonth() + 1, 1));
    try {
      const [users, prospects, spks] = await Promise.all([
        supabase.from("profiles").select("id,full_name,role,is_active").order("full_name"),
        supabase.from("prospects").select("user_id").gte("prospect_date", start).lt("prospect_date", end),
        supabase.from("spk_records").select("user_id,status").gte("spk_date", start).lt("spk_date", end),
      ]);
      const failed = users.error || prospects.error || spks.error;
      if (failed) throw failed;
      const nextStats: Record<string, TeamStat> = {};
      (users.data ?? []).forEach((u) => { nextStats[u.id] = { ...zero }; });
      (prospects.data ?? []).forEach((p) => {
        if (!nextStats[p.user_id]) nextStats[p.user_id] = { ...zero };
        nextStats[p.user_id].prospects += 1;
      });
      (spks.data ?? []).forEach((row) => {
        if (!nextStats[row.user_id]) nextStats[row.user_id] = { ...zero };
        nextStats[row.user_id].spk += 1;
        if (row.status === "Jual") nextStats[row.user_id].closing += 1;
      });
      const total = Object.values(nextStats).reduce((sum, item) => ({
        prospects: sum.prospects + item.prospects,
        spk: sum.spk + item.spk,
        closing: sum.closing + item.closing,
      }), { ...zero });
      setMembers((users.data ?? []) as TeamMember[]);
      setStats(nextStats);
      setTotals(total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data tim.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile]);

  useEffect(() => { void load(); }, [load]);
  if (profile?.role !== "admin" && profile?.role !== "supervisor") return <Redirect href="/(tabs)" />;

  return <ScrollView style={s.page} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor="#5B4BDB" />}>
    <Pressable onPress={() => router.back()}><Text style={s.back}>‹ Kembali ke Profil</Text></Pressable>
    <Text style={s.title}>Dasbor {profile.role === "admin" ? "Admin" : "Supervisor"}</Text>
    <Text style={s.subtitle}>Performa tim pada bulan berjalan.</Text>
    {loading ? <View style={s.loading}><ActivityIndicator color="#5B4BDB" /><Text style={s.muted}>Memuat data tim...</Text></View> : <>
      <View style={s.summary}>
        <Text style={s.summaryLabel}>TOTAL AKTIVITAS TIM</Text>
        <View style={s.summaryGrid}>
          <View style={s.summaryItem}><Text style={s.summaryValue}>{totals.prospects}</Text><Text style={s.summaryText}>Prospek</Text></View>
          <View style={s.summaryItem}><Text style={s.summaryValue}>{totals.spk}</Text><Text style={s.summaryText}>SPK</Text></View>
          <View style={s.summaryItem}><Text style={s.summaryValue}>{totals.closing}</Text><Text style={s.summaryText}>Closing</Text></View>
        </View>
      </View>
      {!!error && <Text style={s.error}>{error}</Text>}
      <Text style={s.section}>Performa per anggota</Text>
      {members.map(member => {
        const item = stats[member.id] ?? zero;
        return <View key={member.id} style={s.memberCard}>
          <View style={s.memberTop}>
            <View style={{ flex: 1 }}>
              <Text style={s.memberName}>{member.full_name || "Tanpa nama"}</Text>
              <Text style={s.memberRole}>{member.role === "admin" ? "Admin" : member.role === "supervisor" ? "Supervisor" : "Sales"}</Text>
            </View>
            <Text style={[s.active, !member.is_active && s.inactive]}>{member.is_active ? "Aktif" : "Nonaktif"}</Text>
          </View>
          <View style={s.memberStats}>
            <Text style={s.memberStat}>Prospek  <Text style={s.statNumber}>{item.prospects}</Text></Text>
            <Text style={s.memberStat}>SPK  <Text style={s.statNumber}>{item.spk}</Text></Text>
            <Text style={s.memberStat}>Jual  <Text style={s.statNumber}>{item.closing}</Text></Text>
          </View>
        </View>;
      })}
      {members.length === 0 && <Text style={s.muted}>Belum ada anggota tim.</Text>}
    </>}
    <View style={s.notice}><Text style={s.noticeTitle}>Manajemen akun</Text><Text style={s.noticeText}>Pembuatan akun dan perubahan role perlu layanan server yang aman. Menu ini belum diaktifkan agar kredensial administrator tidak disimpan di aplikasi.</Text></View>
  </ScrollView>;
}

const s = StyleSheet.create({
  page:{flex:1,backgroundColor:"#F7F7FB"},content:{padding:22,paddingTop:26,paddingBottom:35},
  back:{fontSize:13,color:"#5B4BDB",fontWeight:"700",marginBottom:22},title:{fontSize:26,fontWeight:"800",color:"#202033"},subtitle:{fontSize:13,color:"#858597",marginTop:6},
  loading:{padding:35,alignItems:"center",gap:10},muted:{fontSize:12,color:"#9292A3"},summary:{backgroundColor:"#5B4BDB",borderRadius:20,padding:19,marginTop:22},
  summaryLabel:{fontSize:10,fontWeight:"800",letterSpacing:1,color:"#E0DDFF"},summaryGrid:{flexDirection:"row",justifyContent:"space-between",marginTop:16},
  summaryItem:{flex:1},summaryValue:{fontSize:27,fontWeight:"800",color:"#FFF"},summaryText:{fontSize:11,color:"#E4E1FF",marginTop:3},
  section:{fontSize:17,fontWeight:"800",color:"#242438",marginTop:26,marginBottom:12},memberCard:{backgroundColor:"#FFF",borderRadius:17,padding:16,marginBottom:11,borderWidth:1,borderColor:"#EEEEF5"},
  memberTop:{flexDirection:"row",alignItems:"center"},memberName:{fontSize:14,fontWeight:"800",color:"#29293D"},memberRole:{fontSize:11,color:"#858597",marginTop:4},
  active:{fontSize:10,color:"#287A54",backgroundColor:"#E8F6EE",paddingHorizontal:9,paddingVertical:5,borderRadius:8,overflow:"hidden"},inactive:{color:"#B74747",backgroundColor:"#FCECEC"},
  memberStats:{flexDirection:"row",gap:18,marginTop:14,paddingTop:12,borderTopWidth:1,borderTopColor:"#F0F0F5"},memberStat:{fontSize:11,color:"#858597"},statNumber:{fontWeight:"800",color:"#29293D"},
  error:{fontSize:12,color:"#B74747",marginTop:12},notice:{backgroundColor:"#FFF",borderRadius:16,padding:16,marginTop:20,borderWidth:1,borderColor:"#EEEEF5"},noticeTitle:{fontSize:13,fontWeight:"800",color:"#29293D"},noticeText:{fontSize:11,color:"#858597",lineHeight:17,marginTop:6}
});
