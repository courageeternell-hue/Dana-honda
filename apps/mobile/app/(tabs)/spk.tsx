import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LiquidPressable as Pressable } from "@/components/LiquidPressable";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx-js-style";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

type Spk={id:string;user_id:string;customer_name:string;phone:string;unit_type:string;dp_cash:string|null;leasing:string|null;address:string|null;source:string|null;status:string;spk_date:string};
type Draft={customer_name:string;phone:string;unit_type:string;dp_cash:string;leasing:string;address:string;source:string;status:string};
const blank:Draft={customer_name:"",phone:"",unit_type:"",dp_cash:"",leasing:"",address:"",source:"",status:"Proses"};

export default function SpkScreen(){
 const {profile}=useAuth();
 const [items,setItems]=useState<Spk[]>([]);
 const [draft,setDraft]=useState<Draft>(blank);
 const [editing,setEditing]=useState<string|null>(null);
 const [modal,setModal]=useState(false);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [search,setSearch]=useState("");
 const [statusFilter,setStatusFilter]=useState("Semua");
 const load=useCallback(async()=>{const {data,error}=await supabase.from("spk_records").select("id,user_id,customer_name,phone,unit_type,dp_cash,leasing,address,source,status,spk_date").order("created_at",{ascending:false});if(error)setError(error.message);else{setItems((data??[]) as Spk[]);setError("");}setLoading(false);},[]);
 useEffect(()=>{load();},[load]);
 function openNew(){setEditing(null);setDraft(blank);setModal(true);}
 function openEdit(item:Spk){setEditing(item.id);setDraft({customer_name:item.customer_name,phone:item.phone,unit_type:item.unit_type,dp_cash:item.dp_cash??"",leasing:item.leasing??"",address:item.address??"",source:item.source??"",status:item.status});setModal(true);}
 async function save(){
  if(!profile)return;
  if(!draft.customer_name.trim()||!draft.phone.trim()||!draft.unit_type.trim()){Alert.alert("Data belum lengkap","Nama pelanggan, nomor HP, dan tipe motor wajib diisi.");return;}
  const phoneDigits=draft.phone.replace(/\D/g,"");
  if(phoneDigits.length<10||phoneDigits.length>15){Alert.alert("Nomor HP tidak valid","Masukkan nomor HP dengan 10–15 digit.");return;}
  setSaving(true);
  const payload={customer_name:draft.customer_name.trim(),phone:draft.phone.trim(),unit_type:draft.unit_type.trim(),dp_cash:draft.dp_cash.trim()||null,leasing:draft.leasing.trim()||null,address:draft.address.trim()||null,source:draft.source.trim()||null,status:draft.status,updated_at:new Date().toISOString()};
  const result=editing?await supabase.from("spk_records").update(payload).eq("id",editing):await supabase.from("spk_records").insert({...payload,user_id:profile.id,sales_name:profile.full_name,spk_date:new Date().toISOString().slice(0,10),prospect_id:null,notes:null});
  setSaving(false);if(result.error){Alert.alert("Gagal menyimpan",result.error.message);return;}setModal(false);await load();
 }
 function remove(item:Spk){Alert.alert("Hapus SPK?",`Data SPK ${item.customer_name} akan dihapus.`,[{text:"Batal",style:"cancel"},{text:"Hapus",style:"destructive",onPress:async()=>{const {error}=await supabase.from("spk_records").delete().eq("id",item.id);if(error)Alert.alert("Tidak bisa menghapus",error.message);else load();}}]);}
  async function exportSpkExcel(){
    if(!profile)return;
    try{
      const {data,error}=await supabase.from("spk_records").select("spk_date,sales_name,customer_name,address,source,unit_type,dp_cash,leasing,notes,status").eq("user_id",profile.id).order("spk_date",{ascending:false});
      if(error)throw error;
      const rows=[["Tanggal","Nama Sales","Nama Konsumen","Alamat Konsumen","Sumber SPK","Type Unit","Harga","Leasing/ Keterangan","Status"],...(data??[]).map(x=>[x.spk_date||"",x.sales_name||profile.full_name||"",x.customer_name||"",x.address||"",x.source||"",x.unit_type||"",x.dp_cash||"",[x.leasing,x.notes].filter(Boolean).join(" / "),x.status||""])];
      const ws=XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"]=[13,20,24,30,18,18,18,28,14].map(wch=>({wch}));
      ws["!rows"]=Array.from({length:rows.length},(_,i)=>({hpt:i===0?30:25}));
      for(let r=0;r<rows.length;r++)for(let c=0;c<9;c++){const cell=ws[XLSX.utils.encode_cell({r,c})] as any;if(cell)cell.s={font:{name:"Times New Roman",sz:11,bold:r===0},alignment:{horizontal:"center",vertical:"center",wrapText:true},border:{top:{style:"thin",color:{rgb:"D9D9D9"}},bottom:{style:"thin",color:{rgb:"D9D9D9"}},left:{style:"thin",color:{rgb:"D9D9D9"}},right:{style:"thin",color:{rgb:"D9D9D9"}}},...(r===0?{fill:{patternType:"solid",fgColor:{rgb:"FCE8E8"}}}:{})};}
      if(rows.length>1)ws["!autofilter"]={ref:XLSX.utils.encode_range({s:{r:0,c:0},e:{r:rows.length-1,c:8}})};
      const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Buku SPK");
      const base64=XLSX.write(wb,{bookType:"xlsx",type:"base64"});const uri=`${FileSystem.cacheDirectory}buku-spk-${Date.now()}.xlsx`;
      await FileSystem.writeAsStringAsync(uri,base64,{encoding:FileSystem.EncodingType.Base64});
      if(await Sharing.isAvailableAsync())await Sharing.shareAsync(uri,{mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",dialogTitle:"Download Buku SPK",UTI:"com.microsoft.excel.xlsx"});else Alert.alert("Excel siap","Buku SPK berhasil dibuat.");
    }catch(e){Alert.alert("Gagal membuat Excel SPK",e instanceof Error?e.message:"Coba lagi.");}
  }
 const labels:Record<keyof Draft,string>={customer_name:"Nama pelanggan",phone:"Nomor HP",unit_type:"Tipe motor",dp_cash:"DP / cash",leasing:"Leasing",address:"Alamat konsumen",source:"Sumber SPK",status:"Status"};
 const field=(key:keyof Draft,placeholder:string)=> <View style={s.field}><Text style={s.label}>{labels[key]}</Text><TextInput value={draft[key]} onChangeText={v=>setDraft(p=>({...p,[key]:v}))} placeholder={placeholder} placeholderTextColor="#A1A1B0" style={s.input}/></View>;
 const filteredItems=items.filter(item=>{const q=search.trim().toLowerCase();const matchesSearch=!q||[item.customer_name,item.phone,item.unit_type,item.leasing??""].some(v=>v.toLowerCase().includes(q));const statusMatch=statusFilter==="Semua"||(statusFilter==="Selesai"&&item.status==="Jual")||item.status===statusFilter;return matchesSearch&&statusMatch;});
 return <View style={s.page}>
  <View style={s.header}><View><Text style={s.title}>SPK</Text><Text style={s.subtitle}>{items.length} data SPK</Text></View><View style={s.headerActions}><Pressable style={s.excelBtn} onPress={exportSpkExcel}><Text style={s.excelText}>Excel</Text></Pressable><Pressable style={s.add} onPress={openNew}><Text style={s.addText}>+ Tambah</Text></Pressable></View></View>
  <TextInput value={search} onChangeText={setSearch} placeholder="Cari nama, nomor HP, tipe motor..." placeholderTextColor="#A1A1B0" style={s.searchInput}/>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>{["Semua","Proses","Selesai","Batal"].map(v=><Pressable key={v} onPress={()=>setStatusFilter(v)} style={[s.filterChip,statusFilter===v&&s.filterChipActive]}><Text style={[s.filterText,statusFilter===v&&s.filterTextActive]}>{v}</Text></Pressable>)}</ScrollView>
  {loading?<View style={s.center}><ActivityIndicator color="#E60012"/><Text style={s.muted}>Memuat SPK...</Text></View>:<ScrollView contentContainerStyle={{paddingBottom:30}}>
   {!!error&&<Text style={s.error}>{error}</Text>}
   {filteredItems.length===0&&!error&&<View style={s.empty}><Text style={s.emptyTitle}>{items.length===0?"Belum ada SPK":"Tidak ada hasil"}</Text><Text style={s.muted}>{items.length===0?"Tekan Tambah untuk mencatat SPK baru.":"Ubah kata kunci atau filter status."}</Text></View>}
   {filteredItems.map(item=><View key={item.id} style={s.card}><View style={s.cardTop}><View style={{flex:1}}><Text style={s.customer}>{item.customer_name}</Text><Text style={s.phone}>{item.phone}</Text></View><Text style={[s.status,item.status==="Jual"?s.statusDone:item.status==="Proses"?s.statusProcess:item.status==="Batal"?s.statusCancel:null]}>{item.status==="Jual"?"Selesai":item.status}</Text></View><Text style={s.detail}>{item.unit_type}</Text><Text style={s.detail}>Tanggal: {item.spk_date}</Text>{!!item.dp_cash&&<Text style={s.detail}>DP / Cash: {item.dp_cash}</Text>}{!!item.leasing&&<Text style={s.detail}>Leasing: {item.leasing}</Text>}{!!item.source&&<Text style={s.detail}>Sumber SPK: {item.source}</Text>}{!!item.address&&<Text style={s.detail}>Alamat: {item.address}</Text>}<View style={s.actions}><Pressable onPress={()=>openEdit(item)}><Text style={s.edit}>Edit</Text></Pressable><Pressable onPress={()=>remove(item)}><Text style={s.delete}>Hapus</Text></Pressable></View></View>)}
  </ScrollView>}
  <Modal visible={modal} animationType="slide" transparent onRequestClose={()=>setModal(false)}><View style={s.overlay}><View style={s.sheet}><ScrollView keyboardShouldPersistTaps="handled"><Text style={s.sheetTitle}>{editing?"Edit SPK":"Tambah SPK"}</Text>{field("customer_name","Nama lengkap")}{field("phone","08xxxxxxxxxx")}{field("unit_type","Contoh: Honda Vario 160")}{field("dp_cash","Contoh: Rp1.500.000")}{field("leasing","Contoh: FIF / Adira")}{field("address","Alamat lengkap konsumen")}
  <View style={s.field}>
    <Text style={s.label}>Sumber SPK</Text>
    <View style={s.sourcePanel}>
      <Text style={s.sourceHint}>Pilih asal pelanggan atau SPK</Text>
      <View style={s.sourceChoices}>{["Facebook","WhatsApp","TikTok","Instagram","Walk-in","Referensi","Repeat Order","Lainnya"].map(v=><Pressable key={v} onPress={()=>setDraft(p=>({...p,source:v}))} style={[s.choice,s.sourceChoice,draft.source===v&&s.choiceActive]}><Text style={[s.choiceText,draft.source===v&&s.choiceTextActive]}>{v}</Text></Pressable>)}</View>
      <TextInput value={draft.source} onChangeText={v=>setDraft(p=>({...p,source:v}))} placeholder="Atau tulis sumber lainnya..." placeholderTextColor="#A1A1B0" style={s.sourceInput}/>
    </View>
  </View><View style={s.field}><Text style={s.label}>Status SPK</Text><View style={s.statusChoices}>{["Proses","Jual","Indent","Tolak","Batal"].map(v=><Pressable key={v} onPress={()=>setDraft(p=>({...p,status:v}))} style={[s.choice,draft.status===v&&s.choiceActive]}><Text style={[s.choiceText,draft.status===v&&s.choiceTextActive]}>{v}</Text></Pressable>)}</View></View><Pressable disabled={saving} onPress={save} style={[s.save,saving&&{opacity:.6}]}>{saving?<ActivityIndicator color="#FFF"/>:<Text style={s.saveText}>Simpan SPK</Text>}</Pressable><Pressable onPress={()=>setModal(false)} style={s.cancel}><Text style={s.cancelText}>Batal</Text></Pressable></ScrollView></View></View></Modal>
 </View>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:"#F4F5F7",paddingHorizontal:20,paddingTop:26,paddingBottom:28},searchInput:{height:54,backgroundColor:"#FFF",borderWidth:1,borderColor:"#E8E8E8",borderRadius:14,paddingHorizontal:15,color:"#25253A",fontSize:14,marginBottom:10},filterRow:{gap:10,paddingBottom:16},filterChip:{paddingHorizontal:14,paddingVertical:10,borderRadius:10,backgroundColor:"#FFF",borderWidth:1,borderColor:"#E8E8E8"},filterChipActive:{backgroundColor:"#FFF0F1",borderColor:"#E60012"},filterText:{fontSize:12,color:"#77778A"},filterTextActive:{color:"#E60012",fontWeight:"800"},header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:22},title:{fontSize:29,fontWeight:"900",fontStyle:"italic",color:"#222229"},subtitle:{fontSize:14,color:"#858597",marginTop:4},headerActions:{flexDirection:"row",alignItems:"center",gap:10},excelBtn:{minHeight:48,backgroundColor:"#FFF",borderWidth:1,borderColor:"#E60012",paddingHorizontal:14,paddingVertical:12,borderRadius:14,alignItems:"center",justifyContent:"center"},excelText:{color:"#E60012",fontSize:13,fontWeight:"900"},add:{minHeight:48,backgroundColor:"#E60012",paddingHorizontal:18,paddingVertical:13,borderRadius:14,alignItems:"center",justifyContent:"center"},addText:{color:"#FFF",fontSize:14,fontWeight:"800"},center:{flex:1,alignItems:"center",justifyContent:"center",gap:11},muted:{fontSize:14,color:"#9292A3"},empty:{backgroundColor:"#FFF",padding:24,borderRadius:20,alignItems:"center",marginTop:20},emptyTitle:{fontSize:16,fontWeight:"800",color:"#29293D",marginBottom:6},card:{backgroundColor:"#FFF",padding:20,borderRadius:20,marginBottom:16,borderWidth:1,borderColor:"#E8EAF0",shadowColor:"#172033",shadowOpacity:0.045,shadowRadius:11,shadowOffset:{width:0,height:4},elevation:2},cardTop:{flexDirection:"row",alignItems:"flex-start",gap:9},customer:{fontSize:16,fontWeight:"800",color:"#29293D"},phone:{fontSize:14,color:"#858597",marginTop:4},status:{fontSize:12,color:"#E60012",backgroundColor:"#FFF0F1",paddingHorizontal:11,paddingVertical:8,borderRadius:9,overflow:"hidden",fontWeight:"800"},statusDone:{color:"#168653",backgroundColor:"#E8F7EF"},statusProcess:{color:"#C87917",backgroundColor:"#FFF3E2"},statusCancel:{color:"#C33B48",backgroundColor:"#FCE9EB"},detail:{fontSize:14,color:"#66667A",marginTop:11,lineHeight:20},actions:{flexDirection:"row",gap:18,marginTop:16,borderTopWidth:1,borderTopColor:"#F0F0F0",paddingTop:14},edit:{fontSize:14,fontWeight:"800",color:"#E60012"},delete:{fontSize:14,fontWeight:"800",color:"#C44545"},error:{color:"#B74747",fontSize:14,marginVertical:12},overlay:{flex:1,backgroundColor:"rgba(20,20,35,.42)",justifyContent:"flex-end"},sheet:{maxHeight:"92%",backgroundColor:"#FFF",borderTopLeftRadius:24,borderTopRightRadius:24,padding:24,paddingBottom:30},sheetTitle:{fontSize:21,fontWeight:"800",color:"#25252B",marginBottom:12},field:{marginTop:16},sourcePanel:{padding:14,borderRadius:13,borderWidth:1,borderColor:"#E8E8ED",backgroundColor:"#FAFAFB"},sourceHint:{fontSize:13,color:"#858597",marginBottom:10},sourceChoices:{flexDirection:"row",flexWrap:"wrap",gap:9},sourceChoice:{paddingHorizontal:14,paddingVertical:11,borderRadius:10},sourceInput:{height:49,borderWidth:1,borderColor:"#E8E8ED",borderRadius:10,paddingHorizontal:13,color:"#25253A",fontSize:14,marginTop:10,backgroundColor:"#FFF"},label:{fontSize:14,fontWeight:"700",color:"#45455A",marginBottom:8},input:{height:54,borderWidth:1,borderColor:"#E8E8E8",borderRadius:14,paddingHorizontal:15,color:"#25253A",fontSize:14},statusChoices:{flexDirection:"row",flexWrap:"wrap",gap:8},choice:{paddingHorizontal:12,paddingVertical:10,borderRadius:9,borderWidth:1,borderColor:"#E8E8E8"},choiceActive:{backgroundColor:"#FFF0F1",borderColor:"#E60012"},choiceText:{fontSize:12,color:"#77778A"},choiceTextActive:{color:"#E60012",fontWeight:"800"},save:{height:56,backgroundColor:"#E60012",borderRadius:14,alignItems:"center",justifyContent:"center",marginTop:26},saveText:{fontSize:15,color:"#FFF",fontWeight:"800"},cancel:{padding:16,alignItems:"center"},cancelText:{fontSize:14,color:"#77778A"}});
