import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Redirect, router } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx-js-style";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

type TeamMember = { id: string; full_name: string; email: string | null; phone: string | null; role: "admin" | "supervisor" | "sales"; is_active: boolean };
type TeamStat = { prospects: number; spk: number; closing: number };
type DraftUser = { full_name: string; email: string; phone: string; password: string; role: "sales" | "supervisor" | "admin" };
const zero: TeamStat = { prospects: 0, spk: 0, closing: 0 };
const blankUser: DraftUser = { full_name: "", email: "", phone: "", password: "", role: "sales" };

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
        supabase.from("profiles").select("id,full_name,email,phone,role,is_active").order("full_name"),
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
      const [prospects, spks] = await Promise.all([
        supabase.from("prospects")
          .select("user_id,prospect_date,customer_name,phone,source,status,deal_status,lead_response,notes,spk_created")
          .order("prospect_date", { ascending: false }),
        supabase.from("spk_records")
          .select("user_id,spk_date,sales_name,customer_name,address,source,unit_type,dp_cash,leasing,status,notes")
          .order("spk_date", { ascending: false }),
      ]);
      if (prospects.error) throw prospects.error;
      if (spks.error) throw spks.error;

      const book = XLSX.utils.book_new();
      const summaryRows = members.map((m) => ({
        Nama: m.full_name || "-", Email: m.email || "-",
        Role: m.role === "admin" ? "Admin" : m.role === "supervisor" ? "Supervisor" : "Sales",
        Status: m.is_active ? "Aktif" : "Nonaktif",
        Prospek_Bulan_Ini: stats[m.id]?.prospects ?? 0,
        SPK_Bulan_Ini: stats[m.id]?.spk ?? 0,
        Closing_Bulan_Ini: stats[m.id]?.closing ?? 0,
      }));
      const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
      const prospectRows = [
        ["No", "Tanggal", "Nama Konsumen", "No Hp konsumen", "Prospek Up", "Respon", "Tertarik", "Deal", "SPK", "Keterangan"],
        ...(prospects.data ?? []).map((row, index) => [
          index + 1, row.prospect_date || "", row.customer_name || "", row.phone || "",
          row.source || "", row.lead_response || row.status || "",
          row.status === "Tertarik" ? "Ya" : "Tidak", row.deal_status || "",
          row.spk_created ? "Ya" : "Tidak", row.notes || "",
        ]),
      ];
      const memberNames = new Map(members.map(member => [member.id, member.full_name]));
      const spkRows = [
        ["Tanggal", "Nama Sales", "Nama Konsumen", "Alamat Konsumen", "Sumber SPK", "Type Unit", "Harga", "Leasing/ Keterangan", "Status"],
        ...(spks.data ?? []).map(row => [
          row.spk_date || "", row.sales_name || memberNames.get(row.user_id) || "",
          row.customer_name || "", row.address || "", row.source || "", row.unit_type || "",
          row.dp_cash || "", [row.leasing, row.notes].filter(Boolean).join(" / "), row.status || "",
        ]),
      ];
      const prospectSheet = XLSX.utils.aoa_to_sheet(prospectRows);
      const spkSheet = XLSX.utils.aoa_to_sheet(spkRows);
      const styleTable = (sheet: XLSX.WorkSheet, rowCount: number, colCount: number, widths: number[]) => {
        sheet["!cols"] = widths.map(wch => ({ wch }));
        sheet["!rows"] = Array.from({ length: rowCount }, (_, r) => ({ hpt: r === 0 ? 30 : 25 }));
        for (let r = 0; r < rowCount; r++) {
          for (let col = 0; col < colCount; col++) {
            const cell = sheet[XLSX.utils.encode_cell({ r, c: col })] as any;
            if (!cell) continue;
            cell.s = {
              font: { name: "Times New Roman", sz: 11, bold: r === 0 },
              alignment: { horizontal: "center", vertical: "center", wrapText: true },
              border: {
                top: { style: "thin", color: { rgb: "D9D9D9" } },
                bottom: { style: "thin", color: { rgb: "D9D9D9" } },
                left: { style: "thin", color: { rgb: "D9D9D9" } },
                right: { style: "thin", color: { rgb: "D9D9D9" } },
              },
              ...(r === 0 ? { fill: { patternType: "solid", fgColor: { rgb: "FCE8E8" } } } : {}),
            };
          }
        }
      };
      styleTable(summarySheet, summaryRows.length, 7, [24, 30, 16, 14, 18, 16, 18]);
      styleTable(prospectSheet, prospectRows.length, 10, [6, 13, 24, 18, 18, 18, 12, 12, 10, 28]);
      styleTable(spkSheet, spkRows.length, 9, [13, 20, 24, 30, 18, 18, 18, 28, 14]);
      XLSX.utils.book_append_sheet(book, summarySheet, "Rekap Sales");
      XLSX.utils.book_append_sheet(book, prospectSheet, "Buku Prospek");
      XLSX.utils.book_append_sheet(book, spkSheet, "Buku SPK");

      const base64 = XLSX.write(book, { bookType: "xlsx", type: "base64" });
      const uri = `${FileSystem.cacheDirectory}rekap-sales-${Date.now()}.xlsx`;
      await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", dialogTitle: "Download Rekap Sales" });
      else Alert.alert("Excel siap", uri);
    } catch (e) { Alert.alert("Export gagal", e instanceof Error ? e.message : "Gagal membuat file Excel."); }
  }

  function openUserModal() { setDraftUser(blankUser); setUserModal(true); }

  async function createUser() {
    if (!draftUser.full_name.trim() || !draftUser.email.trim() || !draftUser.phone.trim() || !draftUser.password) {
      Alert.alert("Data belum lengkap", "Nama, email, nomor HP, dan password wajib diisi."); return;
    }
    const phoneDigits = draftUser.phone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      Alert.alert("Nomor HP tidak valid", "Masukkan nomor HP dengan 10–15 digit."); return;
    }
    setSavingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { full_name: draftUser.full_name.trim(), email: draftUser.email.trim(), phone: draftUser.phone.trim(), password: draftUser.password, role: draftUser.role },
      });
      if (error) throw error;
      if (!data?.id) throw new Error("Akun dibuat tetapi ID pengguna tidak diterima.");
      const { error: phoneError } = await supabase.from("profiles").update({ phone: draftUser.phone.trim() }).eq("id", data.id);
      if (phoneError) throw phoneError;
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
        <Pressable style={s.primaryButton} onPress={openUserModal} accessibilityRole="button" accessibilityLabel="Tambah pengguna"><Text style={s.primaryText}>+ Tambah Pengguna</Text></Pressable>
        <Pressable style={s.exportButton} onPress={() => router.push("/target")}><Text style={s.exportText}>Atur Target</Text></Pressable>
        <Pressable style={s.exportButton} onPress={exportExcel}><Text style={s.exportText}>↓ Excel</Text></Pressable>
      </View>
      <Text style={s.section}>Pengguna & performa</Text>
      {members.map(member => {
        const item = stats[member.id] ?? zero;
        return <View key={member.id} style={s.memberCard}><View style={s.memberTop}><View style={{ flex: 1 }}>
          <Text style={s.memberName}>{member.full_name || "Tanpa nama"}</Text><Text style={s.memberEmail}>{member.email || "-"}</Text><Text style={s.memberEmail}>{member.phone || "-"}</Text>
          <Text style={s.memberRole}>{member.role === "admin" ? "Admin" : member.role === "supervisor" ? "Supervisor" : "Sales"}</Text>
        </View><View style={s.memberActions}><View style={[s.active, !member.is_active && s.inactive]}><Text style={s.memberStatusText}>{member.is_active ? "Aktif" : "Nonaktif"}</Text></View><Pressable onPress={() => manageMember(member)} style={s.manageButton} accessibilityRole="button" accessibilityLabel={`Kelola ${member.full_name}`}><Text style={s.manageText}>Kelola</Text></Pressable></View></View>
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
        <Text style={s.label}>Nomor HP</Text><TextInput value={draftUser.phone} onChangeText={(v) => setDraftUser(p => ({ ...p, phone: v }))} keyboardType="phone-pad" placeholder="08xxxxxxxxxx" placeholderTextColor="#A1A1B0" style={s.input} />
        <Text style={s.label}>Password awal</Text><TextInput value={draftUser.password} onChangeText={(v) => setDraftUser(p => ({ ...p, password: v }))} secureTextEntry placeholder="Minimal 8 karakter" placeholderTextColor="#A1A1B0" style={s.input} />
        <Text style={s.label}>Role</Text><View style={s.choices}>{(profile.role === "admin" ? (["sales","supervisor"] as const) : (["sales"] as const)).map(role => <Pressable key={role} onPress={() => setDraftUser(p => ({ ...p, role }))} style={[s.choice, draftUser.role === role && s.choiceActive]}><Text style={[s.choiceText, draftUser.role === role && s.choiceTextActive]}>{role === "sales" ? "Sales" : "Supervisor"}</Text></Pressable>)}</View>
        <Pressable disabled={savingUser} onPress={createUser} style={[s.save, savingUser && { opacity: .6 }]}>{savingUser ? <ActivityIndicator color="#FFF" /> : <Text style={s.saveText}>Buat akun</Text>}</Pressable>
        <Pressable onPress={() => setUserModal(false)} style={s.cancel}><Text style={s.cancelText}>Batal</Text></Pressable>
      </ScrollView></View></View>
    </Modal>
  </ScrollView>;
}

const s = StyleSheet.create({
  page:{flex:1,backgroundColor:"#F7F7F7"},content:{padding:22,paddingTop:26,paddingBottom:35},back:{fontSize:13,color:"#D71920",fontWeight:"700",marginBottom:20},
  headerRow:{flexDirection:"row",alignItems:"center",marginBottom:22},title:{fontSize:25,fontWeight:"800",color:"#202033"},subtitle:{fontSize:12,color:"#858597",marginTop:5},
  loading:{padding:30,alignItems:"center",gap:10},muted:{fontSize:12,color:"#9292A3"},error:{fontSize:12,color:"#B74747",marginVertical:12},
  summary:{backgroundColor:"#D71920",borderRadius:20,padding:20},summaryLabel:{color:"#FFE3E3",fontSize:10,fontWeight:"800",letterSpacing:1},
  summaryGrid:{flexDirection:"row",justifyContent:"space-between",marginTop:16},summaryItem:{alignItems:"center",flex:1},summaryValue:{fontSize:27,fontWeight:"900",color:"#FFF"},summaryText:{fontSize:11,color:"#FFE3E3",marginTop:3},
  actionRow:{flexDirection:"row",gap:10,marginTop:20},primaryButton:{backgroundColor:"#D71920",paddingHorizontal:18,paddingVertical:12,borderRadius:12},primaryText:{fontSize:12,color:"#FFF",fontWeight:"800"},
  exportButton:{backgroundColor:"#FFF",borderWidth:1,borderColor:"#D71920",paddingHorizontal:18,paddingVertical:12,borderRadius:12},exportText:{fontSize:12,color:"#D71920",fontWeight:"800"},
  section:{fontSize:16,fontWeight:"800",color:"#242438",marginTop:25,marginBottom:12},memberCard:{backgroundColor:"#FFF",padding:16,borderRadius:16,borderWidth:1,borderColor:"#EEEEEE",marginBottom:10},
  memberTop:{flexDirection:"row",alignItems:"center",gap:10},memberActions:{alignItems:"flex-end",gap:7},manageButton:{minHeight:38,minWidth:76,paddingHorizontal:12,alignItems:"center",justifyContent:"center",backgroundColor:"#FCE8E8",borderRadius:9,borderWidth:1,borderColor:"#D71920"},manageText:{fontSize:11,color:"#D71920",fontWeight:"900"},memberStatusText:{fontSize:10,color:"#D71920",fontWeight:"800"},memberName:{fontSize:14,fontWeight:"800",color:"#29293D"},memberEmail:{fontSize:11,color:"#858597",marginTop:3},memberRole:{fontSize:10,color:"#D71920",fontWeight:"800",marginTop:5},
  active:{backgroundColor:"#FCE8E8",paddingHorizontal:10,paddingVertical:7,borderRadius:9},inactive:{backgroundColor:"#F5F5F5"},memberStats:{flexDirection:"row",gap:18,marginTop:14,borderTopWidth:1,borderTopColor:"#F0F0F0",paddingTop:12},
  memberStat:{fontSize:11,color:"#77778A"},statNumber:{fontWeight:"900",color:"#25253A"},notice:{backgroundColor:"#FFF",borderRadius:14,padding:15,marginTop:18,borderWidth:1,borderColor:"#EEEEEE"},noticeTitle:{fontSize:12,fontWeight:"800",color:"#29293D"},noticeText:{fontSize:11,color:"#858597",lineHeight:17,marginTop:5},
  overlay:{flex:1,backgroundColor:"rgba(20,20,35,.42)",justifyContent:"flex-end"},sheet:{maxHeight:"92%",backgroundColor:"#FFF",borderTopLeftRadius:24,borderTopRightRadius:24,padding:22,paddingBottom:30},sheetTitle:{fontSize:20,fontWeight:"800",color:"#242438",marginBottom:12},
  label:{fontSize:12,fontWeight:"700",color:"#45455A",marginTop:14,marginBottom:7},input:{height:47,borderWidth:1,borderColor:"#E8E8E8",borderRadius:12,paddingHorizontal:13,color:"#25253A",fontSize:13},
  choices:{flexDirection:"row",gap:8,marginTop:4},choice:{paddingHorizontal:12,paddingVertical:10,borderRadius:10,borderWidth:1,borderColor:"#E8E8E8"},choiceActive:{backgroundColor:"#FCE8E8",borderColor:"#D71920"},choiceText:{fontSize:11,color:"#77778A"},choiceTextActive:{color:"#D71920",fontWeight:"800"},
  save:{height:50,backgroundColor:"#D71920",borderRadius:13,alignItems:"center",justifyContent:"center",marginTop:22},saveText:{fontSize:14,color:"#FFF",fontWeight:"800"},cancel:{padding:14,alignItems:"center"},cancelText:{fontSize:13,color:"#77778A",fontWeight:"700"}
});
