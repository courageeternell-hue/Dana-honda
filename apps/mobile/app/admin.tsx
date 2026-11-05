import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Redirect, router } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

type TeamMember = { id: string; full_name: string; email: string | null; role: "admin" | "supervisor" | "sales"; is_active: boolean };
type TeamStat = { prospects: number; spk: number; closing: number };
type DraftUser = { full_name: string; email: string; password: string; role: "sales" | "supervisor" | "admin" };
const zero: TeamStat = { prospects: 0, spk: 0, closing: 0 };
const blankUser: DraftUser = { full_name: "", email: "", password: "", role: "sales" };

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
  const [userModal, setUserModal] = useState(false);
  const [draftUser, setDraftUser] = useState<DraftUser>(blankUser);
  const [savingUser, setSavingUser] = useState(false);

  const load = useCallback(async () => {
    if (!profile || (profile.role !== "admin" && profile.role !== "supervisor")) return;
    setError("");
    const now = new Date();
    const start = dateKey(new Date(now.getFullYear(), now.getMonth(), 1));
    const end = dateKey(new Date(now.getFullYear(), now.getMonth() + 1, 1));
    try {
      const [users, prospects, spks] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email,role,is_active").order("full_name"),
        supabase.from("prospects").select("user_id").gte("prospect_date", start).lt("prospect_date", end),
        supabase.from("spk_records").select("user_id,status").gte("spk_date", start).lt("spk_date", end),
      ]);
      const failed = users.error || prospects.error || spks.error;
      if (failed) throw failed;
      const nextStats: Record<string, TeamStat> = {};
      (users.data ?? []).forEach((u) => { nextStats[u.id] = { ...zero }; });
      (prospects.data ?? []).forEach((p) => { if (!nextStats[p.user_id]) nextStats[p.user_id] = { ...zero }; nextStats[p.user_id].prospects += 1; });
      (spks.data ?? []).forEach((row) => { if (!nextStats[row.user_id]) nextStats[row.user_id] = { ...zero }; nextStats[row.user_id].spk += 1; if (row.status === "Jual") nextStats[row.user_id].closing += 1; });
      const total = Object.values(nextStats).reduce((sum, item) => ({ prospects: sum.prospects + item.prospects, spk: sum.spk + item.spk, closing: sum.closing + item.closing }), { ...zero });
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

  async function exportExcel() {
    if (!members.length) { Alert.alert("Belum ada data", "Tidak ada data pengguna untuk diekspor."); return; }
    try {
      const rows = members.map((m) => ({
        Nama: m.full_name || "-", Email: m.email || "-",
        Role: m.role === "admin" ? "Admin" : m.role === "supervisor" ? "Supervisor" : "Sales",
        Status: m.is_active ? "Aktif" : "Nonaktif",
        Prospek_Bulan_Ini: stats[m.id]?.prospects ?? 0,
        SPK_Bulan_Ini: stats[m.id]?.spk ?? 0,
        Closing_Bulan_Ini: stats[m.id]?.closing ?? 0,
      }));
      const sheet = XLSX.utils.json_to_sheet(rows);
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "Rekap Sales");
      const base64 = XLSX.write(book, { bookType: "xlsx", type: "base64" });
      const uri = `${FileSystem.cacheDirectory}rekap-sales-${Date.now()}.xlsx`;
      await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", dialogTitle: "Download Rekap Sales" });
      else Alert.alert("Excel siap", uri);
    } catch (e) { Alert.alert("Export gagal", e instanceof Error ? e.message : "Gagal membuat file Excel."); }
  }

  function openUserModal() { setDraftUser(blankUser); setUserModal(true); }

  async function createUser() {
    if (!draftUser.full_name.trim() || !draftUser.email.trim() || !draftUser.password) {
      Alert.alert("Data belum lengkap", "Nama, email, dan password wajib diisi."); return;
    }
    setSavingUser(true);
    try {
      const { error } = await supabase.functions.invoke("admin-create-user", {
        body: { full_name: draftUser.full_name.trim(), email: draftUser.email.trim(), password: draftUser.password, role: draftUser.role },
      });
      if (error) throw error;
      setUserModal(false); Alert.alert("Berhasil", "Pengguna berhasil dibuat dan langsung aktif."); await load();
    } catch (e) { Alert.alert("Gagal membuat pengguna", e instanceof Error ? e.message : "Coba lagi."); }
    finally { setSavingUser(false); }
  }

  async function updateMember(member: TeamMember, patch: Partial<Pick<TeamMember, "role" | "is_active">>) {
    try {
      const { error } = await supabase.functions.invoke("admin-manage-user", { body: { user_id: member.id, ...patch } });
      if (error) throw error;
      await load();
      Alert.alert("Berhasil", "Data pengguna berhasil diperbarui.");
    } catch (e) {
      Alert.alert("Gagal memperbarui pengguna", e instanceof Error ? e.message : "Coba lagi.");
    }
  }

  function manageMember(member: TeamMember) {
    const actions = [
      { text: "Batal", style: "cancel" as const },
      { text: member.is_active ? "Nonaktifkan akun" : "Aktifkan akun", onPress: () => updateMember(member, { is_active: !member.is_active }) },
    ];
    if (profile?.role === "admin" && member.role !== "admin") {
      actions.push({ text: member.role === "sales" ? "Jadikan Supervisor" : "Jadikan Sales", onPress: () => updateMember(member, { role: member.role === "sales" ? "supervisor" : "sales" }) } as typeof actions[number]);
    }
    Alert.alert(member.full_name || "Pengguna", "Pilih tindakan", actions);
  }

  if (profile?.role !== "admin" && profile?.role !== "supervisor") return <Redirect href="/(tabs)" />;

  return <ScrollView style={s.page} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor="#D71920" />}>
    <Pressable onPress={() => router.back()}><Text style={s.back}>‹ Kembali ke Profil</Text></Pressable>
    <View style={s.headerRow}><View style={{ flex: 1 }}><Text style={s.title}>Dasbor {profile.role === "admin" ? "Admin" : "Supervisor"}</Text><Text style={s.subtitle}>Performa tim dan manajemen pengguna.</Text></View></View>
    {loading ? <View style={s.loading}><ActivityIndicator color="#D71920" /><Text style={s.muted}>Memuat data tim...</Text></View> : <>
      <View style={s.summary}><Text style={s.summaryLabel}>TOTAL AKTIVITAS TIM</Text><View style={s.summaryGrid}>
        <View style={s.summaryItem}><Text style={s.summaryValue}>{totals.prospects}</Text><Text style={s.summaryText}>Prospek</Text></View>
        <View style={s.summaryItem}><Text style={s.summaryValue}>{totals.spk}</Text><Text style={s.summaryText}>SPK</Text></View>
        <View style={s.summaryItem}><Text style={s.summaryValue}>{totals.closing}</Text><Text style={s.summaryText}>Closing</Text></View>
      </View></View>
      {!!error && <Text style={s.error}>{error}</Text>}
      <View style={s.actionRow}>
        {profile.role === "admin" && <Pressable style={s.primaryButton} onPress={openUserModal}><Text style={s.primaryText}>+ Pengguna</Text></Pressable>}
        <Pressable style={s.exportButton} onPress={() => router.push("/target")}><Text style={s.exportText}>Atur Target</Text></Pressable>
        <Pressable style={s.exportButton} onPress={exportExcel}><Text style={s.exportText}>↓ Excel</Text></Pressable>
      </View>
      <Text style={s.section}>Pengguna & performa</Text>
      {members.map(member => {
        const item = stats[member.id] ?? zero;
        return <View key={member.id} style={s.memberCard}><View style={s.memberTop}><View style={{ flex: 1 }}>
          <Text style={s.memberName}>{member.full_name || "Tanpa nama"}</Text><Text style={s.memberEmail}>{member.email || "-"}</Text>
          <Text style={s.memberRole}>{member.role === "admin" ? "Admin" : member.role === "supervisor" ? "Supervisor" : "Sales"}</Text>
        </View><Pressable onPress={() => manageMember(member)} style={[s.active, !member.is_active && s.inactive]}><Text>{member.is_active ? "Aktif" : "Nonaktif"}</Text></Pressable></View>
        <View style={s.memberStats}><Text style={s.memberStat}>Prospek <Text style={s.statNumber}>{item.prospects}</Text></Text><Text style={s.memberStat}>SPK <Text style={s.statNumber}>{item.spk}</Text></Text><Text style={s.memberStat}>Jual <Text style={s.statNumber}>{item.closing}</Text></Text></View></View>;
      })}
      {members.length === 0 && <Text style={s.muted}>Belum ada anggota tim.</Text>}
    </>}
    <View style={s.notice}><Text style={s.noticeTitle}>Akses pengguna</Text><Text style={s.noticeText}>Admin dapat membuat akun dan mengubah role Sales/Supervisor. Admin dan Supervisor dapat mengaktifkan atau menonaktifkan akun.</Text></View>
    <Modal visible={userModal} animationType="slide" transparent onRequestClose={() => setUserModal(false)}>
      <View style={s.overlay}><View style={s.sheet}><ScrollView keyboardShouldPersistTaps="handled">
        <Text style={s.sheetTitle}>Tambah pengguna</Text>
        <Text style={s.label}>Nama lengkap</Text><TextInput value={draftUser.full_name} onChangeText={(v) => setDraftUser(p => ({ ...p, full_name: v }))} placeholder="Nama sales" placeholderTextColor="#A1A1B0" style={s.input} />
        <Text style={s.label}>Email login</Text><TextInput value={draftUser.email} onChangeText={(v) => setDraftUser(p => ({ ...p, email: v }))} autoCapitalize="none" keyboardType="email-address" placeholder="nama@email.com" placeholderTextColor="#A1A1B0" style={s.input} />
        <Text style={s.label}>Password awal</Text><TextInput value={draftUser.password} onChangeText={(v) => setDraftUser(p => ({ ...p, password: v }))} secureTextEntry placeholder="Minimal 8 karakter" placeholderTextColor="#A1A1B0" style={s.input} />
        <Text style={s.label}>Role</Text><View style={s.choices}>{(["sales","supervisor","admin"] as const).map(role => <Pressable key={role} onPress={() => setDraftUser(p => ({ ...p, role }))} style={[s.choice, draftUser.role === role && s.choiceActive]}><Text style={[s.choiceText, draftUser.role === role && s.choiceTextActive]}>{role === "sales" ? "Sales" : role === "supervisor" ? "Supervisor" : "Admin"}</Text></Pressable>)}</View>
        <Pressable disabled={savingUser} onPress={createUser} style={[s.save, savingUser && { opacity: .6 }]}>{savingUser ? <ActivityIndicator color="#FFF" /> : <Text style={s.saveText}>Buat akun</Text>}</Pressable>
        <Pressable onPress={() => setUserModal(false)} style={s.cancel}><Text style={s.cancelText}>Batal</Text></Pressable>
      </ScrollView></View></View>
    </Modal>
  </ScrollView>;
}

const s = StyleSheet.create({
  page:{flex:1,backgroundColor:"#F7F7FB"},content:{padding:22,paddingTop:26,paddingBottom:35},back:{fontSize:13,color:"#D71920",fontWeight:"700",marginBottom:20},
  headerRow:{flexDirection:"row",alignItems:"center",marginBottom:22},title:{fontSize:25,fontWeight:"800",color:"#202033"},subtitle:{fontSize:12,color:"#858597",marginTop:5},
  loading:{padding:30,alignItems:"center",gap:10},muted:{fontSize:12,color:"#9292A3"},error:{fontSize:12,color:"#B74747",marginVertical:12},
  summary:{backgroundColor:"#D71920",borderRadius:20,padding:20},summaryLabel:{color:"#FFE3E3",fontSize:10,fontWeight:"800",letterSpacing:1},
  summaryGrid:{flexDirection:"row",justifyContent:"space-between",marginTop:16},summaryItem:{alignItems:"center",flex:1},summaryValue:{fontSize:27,fontWeight:"900",color:"#FFF"},summaryText:{fontSize:11,color:"#FFE3E3",marginTop:3},
  actionRow:{flexDirection:"row",gap:10,marginTop:20},primaryButton:{backgroundColor:"#D71920",paddingHorizontal:18,paddingVertical:12,borderRadius:12},primaryText:{fontSize:12,color:"#FFF",fontWeight:"800"},
  exportButton:{backgroundColor:"#FFF",borderWidth:1,borderColor:"#D71920",paddingHorizontal:18,paddingVertical:12,borderRadius:12},exportText:{fontSize:12,color:"#D71920",fontWeight:"800"},
  section:{fontSize:16,fontWeight:"800",color:"#242438",marginTop:25,marginBottom:12},memberCard:{backgroundColor:"#FFF",padding:16,borderRadius:16,borderWidth:1,borderColor:"#EEEEF5",marginBottom:10},
  memberTop:{flexDirection:"row",alignItems:"center",gap:10},memberName:{fontSize:14,fontWeight:"800",color:"#29293D"},memberEmail:{fontSize:11,color:"#858597",marginTop:3},memberRole:{fontSize:10,color:"#D71920",fontWeight:"800",marginTop:5},
  active:{backgroundColor:"#E6F7ED",paddingHorizontal:10,paddingVertical:7,borderRadius:9},inactive:{backgroundColor:"#FDECEC"},memberStats:{flexDirection:"row",gap:18,marginTop:14,borderTopWidth:1,borderTopColor:"#F0F0F5",paddingTop:12},
  memberStat:{fontSize:11,color:"#77778A"},statNumber:{fontWeight:"900",color:"#25253A"},notice:{backgroundColor:"#FFF",borderRadius:14,padding:15,marginTop:18,borderWidth:1,borderColor:"#EEEEF5"},noticeTitle:{fontSize:12,fontWeight:"800",color:"#29293D"},noticeText:{fontSize:11,color:"#858597",lineHeight:17,marginTop:5},
  overlay:{flex:1,backgroundColor:"rgba(20,20,35,.42)",justifyContent:"flex-end"},sheet:{maxHeight:"92%",backgroundColor:"#FFF",borderTopLeftRadius:24,borderTopRightRadius:24,padding:22,paddingBottom:30},sheetTitle:{fontSize:20,fontWeight:"800",color:"#242438",marginBottom:12},
  label:{fontSize:12,fontWeight:"700",color:"#45455A",marginTop:14,marginBottom:7},input:{height:47,borderWidth:1,borderColor:"#E8E8F0",borderRadius:12,paddingHorizontal:13,color:"#25253A",fontSize:13},
  choices:{flexDirection:"row",gap:8,marginTop:4},choice:{paddingHorizontal:12,paddingVertical:10,borderRadius:10,borderWidth:1,borderColor:"#E8E8F0"},choiceActive:{backgroundColor:"#FCE8E8",borderColor:"#D71920"},choiceText:{fontSize:11,color:"#77778A"},choiceTextActive:{color:"#D71920",fontWeight:"800"},
  save:{height:50,backgroundColor:"#D71920",borderRadius:13,alignItems:"center",justifyContent:"center",marginTop:22},saveText:{fontSize:14,color:"#FFF",fontWeight:"800"},cancel:{padding:14,alignItems:"center"},cancelText:{fontSize:13,color:"#77778A",fontWeight:"700"}
});
