import { useState } from "react";
import { Alert, ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx-js-style";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

const roleLabel = { admin: "Administrator", supervisor: "Supervisor", sales: "Sales" } as const;

export default function ProfileScreen() {
  const { profile, signOut, reloadProfile } = useAuth();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const canManage = profile?.role === "admin" || profile?.role === "supervisor";

  async function chooseProfilePhoto() {
    if (!profile || uploadingPhoto) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.82,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert("Foto tidak terbaca", "Pilih foto lain dari galeri.");
        return;
      }
      if (asset.fileSize && asset.fileSize > 3 * 1024 * 1024) {
        Alert.alert("Ukuran foto terlalu besar", "Pilih foto dengan ukuran maksimal 3 MB.");
        return;
      }
      const mimeType = asset.mimeType || "image/jpeg";
      const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
      const filePath = `${profile.id}/avatar-${Date.now()}.${extension}`;
      setUploadingPhoto(true);
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, decode(asset.base64), {
          contentType: mimeType,
          cacheControl: "3600",
          upsert: false,
        });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const avatarUrl = data.publicUrl;
      const { error: updateError } = await supabase
        .from("profile_avatars")
        .upsert({ user_id: profile.id, avatar_url: avatarUrl, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (updateError) throw updateError;
      await reloadProfile();
      Alert.alert("Berhasil", "Foto profil berhasil diperbarui.");
    } catch (error) {
      Alert.alert("Gagal mengganti foto", error instanceof Error ? error.message : "Coba lagi beberapa saat.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function exportMyExcel() {
    if (!profile || exportingExcel) return;
    setExportingExcel(true);
    try {
      const [prospects, spks] = await Promise.all([
        supabase.from("prospects")
          .select("prospect_date,customer_name,phone,source,unit_interest,status,deal_status,lead_response,notes,spk_created")
          .eq("user_id", profile.id)
          .order("prospect_date", { ascending: false }),
        supabase.from("spk_records")
          .select("spk_date,sales_name,customer_name,address,source,unit_type,dp_cash,leasing,status,notes")
          .eq("user_id", profile.id)
          .order("spk_date", { ascending: false }),
      ]);
      if (prospects.error) throw prospects.error;
      if (spks.error) throw spks.error;

      const workbook = XLSX.utils.book_new();
      const prospectRows = [
        ["No", "Tanggal", "Nama Konsumen", "No Hp konsumen", "Prospek Up", "Respon", "Tertarik", "Deal", "SPK", "Keterangan"],
        ...(prospects.data ?? []).map((row, index) => [
          index + 1, row.prospect_date || "", row.customer_name || "", row.phone || "",
          row.source || "", row.lead_response || row.status || "",
          row.status === "Tertarik" ? "Ya" : "Tidak", row.deal_status || "",
          row.spk_created ? "Ya" : "Tidak", row.notes || "",
        ]),
      ];
      const spkRows = [
        ["Tanggal", "Nama Sales", "Nama Konsumen", "Alamat Konsumen", "Sumber SPK", "Type Unit", "Harga", "Leasing/ Keterangan", "Status"],
        ...(spks.data ?? []).map(row => [
          row.spk_date || "", row.sales_name || profile.full_name || "", row.customer_name || "",
          row.address || "", row.source || "", row.unit_type || "", row.dp_cash || "",
          [row.leasing, row.notes].filter(Boolean).join(" / "), row.status || "",
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
        sheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rowCount - 1, c: colCount - 1 } }) };
      };
      styleTable(prospectSheet, prospectRows.length, 10, [6, 13, 24, 18, 18, 18, 12, 12, 10, 28]);
      styleTable(spkSheet, spkRows.length, 9, [13, 20, 24, 30, 18, 18, 18, 28, 14]);
      XLSX.utils.book_append_sheet(workbook, prospectSheet, "Buku Prospek");
      XLSX.utils.book_append_sheet(workbook, spkSheet, "Buku SPK");
      const base64 = XLSX.write(workbook, { bookType: "xlsx", type: "base64" });
      const safeName = (profile.full_name || "sales").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const uri = `${FileSystem.cacheDirectory}laporan-${safeName || "sales"}-${Date.now()}.xlsx`;
      await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          dialogTitle: "Download Laporan Excel Saya",
          UTI: "com.microsoft.excel.xlsx",
        });
      } else {
        Alert.alert("Excel siap", "File laporan berhasil dibuat, tetapi fitur berbagi tidak tersedia di perangkat ini.");
      }
    } catch (error) {
      Alert.alert("Gagal membuat Excel", error instanceof Error ? error.message : "Coba lagi beberapa saat.");
    } finally {
      setExportingExcel(false);
    }
  }

  async function confirmSignOut() {
    Alert.alert("Keluar akun", "Yakin ingin keluar dari aplikasi?", [
      { text: "Batal", style: "cancel" },
      { text: "Keluar", style: "destructive", onPress: async () => { try { await signOut(); router.replace("/login"); } catch { Alert.alert("Gagal keluar", "Coba lagi."); } } }
    ]);
  }

  return <View style={s.page}>
    <Text style={s.title}>Profil</Text>
    <View style={s.profile}>
      <Pressable onPress={chooseProfilePhoto} disabled={uploadingPhoto} style={s.avatarWrap} accessibilityRole="button" accessibilityLabel="Ganti foto profil">
        {profile?.avatar_url
          ? <Image source={{ uri: profile.avatar_url }} style={s.avatarImage} />
          : <View style={s.avatar}><Text style={s.avatarText}>{(profile?.full_name || "AS").slice(0,1).toUpperCase()}</Text></View>}
        <View style={s.cameraBadge}><Text style={s.cameraText}>✎</Text></View>
      </Pressable>
      <View style={{flex:1}}>
        <Text style={s.name}>{profile?.full_name || "Pengguna Asisten Sales"}</Text>
        <Text style={s.role}>{roleLabel[profile?.role ?? "sales"]}</Text>
        <Text style={s.email}>{profile?.email || ""}</Text>
        <Pressable onPress={chooseProfilePhoto} disabled={uploadingPhoto} style={s.photoButton}>
          {uploadingPhoto ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={s.photoButtonText}>{profile?.avatar_url ? "Ubah foto profil" : "Tambah foto profil"}</Text>}
        </Pressable>
      </View>
    </View>
    <Text style={s.section}>Menu akun</Text>
    <View style={s.menu}>
      {canManage && <Pressable style={s.menuItem} onPress={() => router.push("/admin")}><Text style={s.menuText}>Kelola Pengguna & Tim</Text><Text style={s.chevron}>›</Text></Pressable>}
      <Pressable style={s.menuItem} onPress={exportMyExcel} disabled={exportingExcel}><Text style={s.menuText}>{exportingExcel ? "Menyiapkan Excel..." : "Download Excel Laporan Saya"}</Text><Text style={s.chevron}>{exportingExcel ? "…" : "↓"}</Text></Pressable>
      <Pressable style={s.menuItem} onPress={() => Alert.alert("Informasi akun", `Nama: ${profile?.full_name || "-"}\nEmail: ${profile?.email || "-"}\nRole: ${roleLabel[profile?.role ?? "sales"]}`, [{ text: "Tutup" }])}><Text style={s.menuText}>Informasi akun</Text><Text style={s.chevron}>›</Text></Pressable>
    </View>
    <Pressable onPress={confirmSignOut} style={s.logout}><Text style={s.logoutText}>Keluar akun</Text></Pressable>
    <Text style={s.note}>Semua pengguna dapat mengganti foto profil melalui galeri. Hak akses mengikuti role yang ditetapkan administrator.</Text>
  </View>;
}

const s=StyleSheet.create({
 page:{flex:1,backgroundColor:"#F7F7F7",padding:22,paddingTop:30},
 title:{fontSize:28,fontWeight:"800",color:"#202033"},
 profile:{marginTop:22,backgroundColor:"#FFF",padding:18,borderRadius:18,flexDirection:"row",alignItems:"center",gap:14,borderWidth:1,borderColor:"#EEEEEE"},
 avatarWrap:{width:62,height:62,position:"relative"},
 avatar:{width:62,height:62,borderRadius:20,backgroundColor:"#FCE8E8",alignItems:"center",justifyContent:"center"},
 avatarImage:{width:62,height:62,borderRadius:20,backgroundColor:"#FCE8E8"},
 avatarText:{fontSize:22,fontWeight:"800",color:"#D71920"},
 cameraBadge:{position:"absolute",right:-4,bottom:-4,width:24,height:24,borderRadius:12,backgroundColor:"#D71920",alignItems:"center",justifyContent:"center",borderWidth:2,borderColor:"#FFF"},
 cameraText:{fontSize:14,color:"#FFF",fontWeight:"800"},
 name:{fontSize:15,fontWeight:"800",color:"#25253A"},
 role:{fontSize:12,color:"#D71920",fontWeight:"700",marginTop:3},
 email:{fontSize:11,color:"#858597",marginTop:3},
 photoButton:{alignSelf:"flex-start",backgroundColor:"#D71920",paddingHorizontal:12,paddingVertical:8,borderRadius:9,marginTop:10,minWidth:112,alignItems:"center"},
 photoButtonText:{fontSize:11,fontWeight:"800",color:"#FFF"},
 section:{fontSize:16,fontWeight:"800",color:"#242438",marginTop:26,marginBottom:12},
 menu:{backgroundColor:"#FFF",borderRadius:18,paddingHorizontal:18,borderWidth:1,borderColor:"#EEEEEE"},
 menuItem:{minHeight:52,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderBottomWidth:1,borderBottomColor:"#F0F0F0"},
 menuText:{fontSize:14,color:"#333348",fontWeight:"600"},chevron:{fontSize:24,color:"#A0A0AE"},
 logout:{marginTop:24,backgroundColor:"#FFF",borderColor:"#F0DCDC",borderWidth:1,borderRadius:14,padding:16,alignItems:"center"},
 logoutText:{fontSize:14,fontWeight:"800",color:"#C44545"},
 note:{fontSize:12,color:"#858597",lineHeight:18,marginTop:12}
});