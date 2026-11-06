import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LiquidPressable as Pressable } from "@/components/LiquidPressable";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx-js-style";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

type Prospect = { id:string; user_id:string; customer_name:string; phone:string; unit_interest:string|null; source:string|null; address:string|null; status:string; deal_status:string; notes:string|null; follow_up:string|null; created_at:string };
type Draft = { customer_name:string; phone:string; unit_interest:string; source:string; address:string; status:string; notes:string; follow_up:string };
const blank:Draft={customer_name:"",phone:"",unit_interest:"",source:"",address:"",status:"Belum Respon",notes:"",follow_up:""};

export default function ProspekScreen() {
  const { profile } = useAuth();
  const [items,setItems]=useState<Prospect[]>([]);
  const [draft,setDraft]=useState<Draft>(blank);
  const [editing,setEditing]=useState<string|null>(null);
  const [modal,setModal]=useState(false);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [search,setSearch]=useState("");
  const [statusFilter,setStatusFilter]=useState("Semua");
  const [calendarOpen,setCalendarOpen]=useState(false);
  const [calendarMonth,setCalendarMonth]=useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1));

  const load=useCallback(async()=>{
    const {data,error}=await supabase.from("prospects").select("id,user_id,customer_name,phone,unit_interest,source,address,status,deal_status,notes,follow_up,created_at").order("created_at",{ascending:false});
    if(error) setError(error.message); else {setItems((data??[]) as Prospect[]);setError("");}
    setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);

  function openNew(){setEditing(null);setDraft(blank);setModal(true);}
  function openEdit(item:Prospect){setEditing(item.id);setDraft({customer_name:item.customer_name,phone:item.phone,unit_interest:item.unit_interest??"",source:item.source??"",address:item.address??"",status:item.status,notes:item.notes??"",follow_up:item.follow_up??""});setModal(true);}
  const monthNames=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const selectedFollowUpDate=/^\\d{4}-\\d{2}-\\d{2}$/.test(draft.follow_up)?new Date(Number(draft.follow_up.slice(0,4)),Number(draft.follow_up.slice(5,7))-1,Number(draft.follow_up.slice(8,10))):null;
  function openFollowUpCalendar(){
    const selected=/^\\d{4}-\\d{2}-\\d{2}$/.test(draft.follow_up)?new Date(Number(draft.follow_up.slice(0,4)),Number(draft.follow_up.slice(5,7))-1,1):new Date(new Date().getFullYear(),new Date().getMonth(),1);
    setCalendarMonth(selected);setCalendarOpen(true);
  }
  function changeCalendarMonth(offset:number){setCalendarMonth(current=>new Date(current.getFullYear(),current.getMonth()+offset,1));}
  function chooseFollowUpDay(day:number){
    const y=calendarMonth.getFullYear(),m=String(calendarMonth.getMonth()+1).padStart(2,"0"),d=String(day).padStart(2,"0");
    setDraft(current=>({...current,follow_up:`${y}-${m}-${d}`}));setCalendarOpen(false);
  }
  async function save(){
    if(!profile) return;
    if(!draft.customer_name.trim()||!draft.phone.trim()){Alert.alert("Data belum lengkap","Nama pelanggan dan nomor HP wajib diisi.");return;}
    const phoneDigits=draft.phone.replace(/\D/g,"");
    if(phoneDigits.length<10||phoneDigits.length>15){Alert.alert("Nomor HP tidak valid","Masukkan nomor HP dengan 10–15 digit.");return;}
    if(draft.follow_up.trim()&&!/^\d{4}-\d{2}-\d{2}$/.test(draft.follow_up.trim())){Alert.alert("Tanggal tidak valid","Isi jadwal follow-up dengan format YYYY-MM-DD.");return;}
    setSaving(true);
    const payload={customer_name:draft.customer_name.trim(),phone:draft.phone.trim(),unit_interest:draft.unit_interest.trim()||null,source:draft.source.trim()||null,address:draft.address.trim()||null,status:draft.status,notes:draft.notes.trim()||null,follow_up:draft.follow_up.trim()||null,updated_at:new Date().toISOString()};
    const result=editing
      ? await supabase.from("prospects").update(payload).eq("id",editing)
      : await supabase.from("prospects").insert({...payload,user_id:profile.id,prospect_date:new Date().toISOString().slice(0,10),deal_status:"Belum",lead_response:null,spk_created:false});
    setSaving(false);
    if(result.error){Alert.alert("Gagal menyimpan",result.error.message);return;}
    setModal(false);await load();
  }
  function remove(item:Prospect){
    Alert.alert("Hapus prospek?",`Data ${item.customer_name} akan dihapus.`,[
      {text:"Batal",style:"cancel"},
      {text:"Hapus",style:"destructive",onPress:async()=>{
        const {error}=await supabase.from("prospects").delete().eq("id",item.id);
        if(error) Alert.alert("Tidak bisa menghapus",error.message); else load();
      }}
    ]);
  }
  async function exportProspekExcel(){
    if(!profile)return;
    try{
      const {data,error}=await supabase.from("prospects").select("prospect_date,customer_name,phone,source,lead_response,status,deal_status,spk_created,notes").eq("user_id",profile.id).order("prospect_date",{ascending:false});
      if(error)throw error;
      const rows=[["No","Tanggal","Nama Konsumen","No Hp konsumen","Prospek Up","Respon","Tertarik","Deal","SPK","Keterangan"],...(data??[]).map((x,i)=>[i+1,x.prospect_date||"",x.customer_name||"",x.phone||"",x.source||"",x.lead_response||x.status||"",x.status==="Tertarik"?"Ya":"Tidak",x.deal_status||"",x.spk_created?"Ya":"Tidak",x.notes||""])];
      const ws=XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"]=[6,13,24,18,18,18,12,12,10,28].map(wch=>({wch}));
      ws["!rows"]=Array.from({length:rows.length},(_,i)=>({hpt:i===0?30:25}));
      for(let r=0;r<rows.length;r++)for(let c=0;c<10;c++){const cell=ws[XLSX.utils.encode_cell({r,c})] as any;if(cell)cell.s={font:{name:"Times New Roman",sz:11,bold:r===0},alignment:{horizontal:"center",vertical:"center",wrapText:true},border:{top:{style:"thin",color:{rgb:"D9D9D9"}},bottom:{style:"thin",color:{rgb:"D9D9D9"}},left:{style:"thin",color:{rgb:"D9D9D9"}},right:{style:"thin",color:{rgb:"D9D9D9"}}},...(r===0?{fill:{patternType:"solid",fgColor:{rgb:"FCE8E8"}}}:{})};}
      if(rows.length>1)ws["!autofilter"]={ref:XLSX.utils.encode_range({s:{r:0,c:0},e:{r:rows.length-1,c:9}})};
      const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Buku Prospek");
      const base64=XLSX.write(wb,{bookType:"xlsx",type:"base64"});const uri=`${FileSystem.cacheDirectory}buku-prospek-${Date.now()}.xlsx`;
      await FileSystem.writeAsStringAsync(uri,base64,{encoding:FileSystem.EncodingType.Base64});
      if(await Sharing.isAvailableAsync())await Sharing.shareAsync(uri,{mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",dialogTitle:"Download Buku Prospek",UTI:"com.microsoft.excel.xlsx"});else Alert.alert("Excel siap","Buku Prospek berhasil dibuat.");
    }catch(e){Alert.alert("Gagal membuat Excel Prospek",e instanceof Error?e.message:"Coba lagi.");}
  }
  const field=(label:keyof Draft,placeholder:string,multiline=false)=> <View style={s.field}><Text style={s.label}>{({customer_name:"Nama pelanggan",phone:"Nomor HP",unit_interest:"Motor yang diminati",source:"Sumber prospek",address:"Alamat konsumen",status:"Status",notes:"Catatan",follow_up:"Jadwal follow-up"} as Record<string,string>)[label]}</Text><TextInput value={draft[label]} onChangeText={v=>setDraft(p=>({...p,[label]:v}))} placeholder={placeholder} placeholderTextColor="#A1A1B0" style={[s.input,multiline&&s.multiline]} multiline={multiline} keyboardType={label==="phone"?"phone-pad":"default"}/></View>;

  const filteredItems=items.filter(item=>{const q=search.trim().toLowerCase();const matchesSearch=!q||[item.customer_name,item.phone,item.unit_interest??"",item.source??""].some(v=>v.toLowerCase().includes(q));const statusMatch=statusFilter==="Semua"||(statusFilter==="Baru"&&item.status==="Belum Respon")||(statusFilter==="Proses"&&item.status==="Follow Up")||(statusFilter==="Deal"&&(item.deal_status==="Deal"||item.status==="Tertarik"));return matchesSearch&&statusMatch;});
  return <View style={s.page}>
    <View style={s.header}><View><Text style={s.title}>Prospek</Text><Text style={s.subtitle}>{items.length} data pelanggan</Text></View><View style={s.headerActions}><Pressable style={s.excelBtn} onPress={exportProspekExcel}><Text style={s.excelText}>Excel</Text></Pressable><Pressable style={s.add} onPress={openNew}><Text style={s.addText}>+ Tambah</Text></Pressable></View></View>
    <TextInput value={search} onChangeText={setSearch} placeholder="Cari nama, nomor HP, motor..." placeholderTextColor="#A1A1B0" style={s.searchInput}/>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>{["Semua","Baru","Proses","Deal"].map(v=><Pressable key={v} onPress={()=>setStatusFilter(v)} style={[s.filterChip,statusFilter===v&&s.filterChipActive]}><Text style={[s.filterText,statusFilter===v&&s.filterTextActive]}>{v}</Text></Pressable>)}</ScrollView>
    {loading?<View style={s.center}><ActivityIndicator color="#E60012"/><Text style={s.muted}>Memuat prospek...</Text></View>:<ScrollView contentContainerStyle={{paddingBottom:30}}>
      {!!error&&<Text style={s.error}>{error}</Text>}
      {filteredItems.length===0&&!error&&<View style={s.empty}><Text style={s.emptyTitle}>{items.length===0?"Belum ada prospek":"Tidak ada hasil"}</Text><Text style={s.muted}>{items.length===0?"Tekan Tambah untuk mencatat calon pelanggan.":"Ubah kata kunci atau filter status."}</Text></View>}
      {filteredItems.map(item=><View key={item.id} style={s.card}>
        <View style={s.cardTop}><View style={{flex:1}}><Text style={s.customer}>{item.customer_name}</Text><Text style={s.phone}>{item.phone}</Text></View><Text style={[s.status,item.deal_status==="Deal"?s.statusDeal:item.status==="Belum Respon"?s.statusNew:item.status==="Follow Up"?s.statusProcess:null]}>{item.deal_status==="Deal"?"Deal":item.status==="Belum Respon"?"Baru":item.status==="Follow Up"?"Proses":item.status}</Text></View>
        {!!item.unit_interest&&<Text style={s.detail}>Minat: {item.unit_interest}</Text>}
        {!!item.source&&<Text style={s.detail}>Sumber: {item.source}</Text>}{!!item.address&&<Text style={s.detail}>Alamat: {item.address}</Text>}
        {!!item.follow_up&&<Text style={s.followUp}>Jadwal follow-up: {item.follow_up}{item.follow_up<=new Date().toISOString().slice(0,10)?" • Perlu ditindaklanjuti":""}</Text>}
        <View style={s.actions}><Pressable onPress={()=>openEdit(item)}><Text style={s.edit}>Edit</Text></Pressable><Pressable onPress={()=>remove(item)}><Text style={s.delete}>Hapus</Text></Pressable></View>
      </View>)}
    </ScrollView>}
    <Modal visible={modal} animationType="slide" transparent onRequestClose={()=>setModal(false)}>
      <View style={s.overlay}><View style={s.sheet}><ScrollView keyboardShouldPersistTaps="handled">
        <Text style={s.sheetTitle}>{editing?"Edit Prospek":"Tambah Prospek"}</Text>
        {field("customer_name","Nama lengkap")}{field("phone","08xxxxxxxxxx")}{field("unit_interest","Contoh: Honda Beat")}<View style={s.field}>
          <Text style={s.label}>Sumber prospek</Text>
          <View style={s.sourcePanel}>
            <Text style={s.sourceHint}>Pilih sumber yang paling sesuai</Text>
            <View style={s.sourceChoices}>{["Facebook","WhatsApp","TikTok","Instagram","Walk-in","Referensi","Lainnya"].map(v=><Pressable key={v} onPress={()=>setDraft(p=>({...p,source:v}))} style={[s.choice,s.sourceChoice,draft.source===v&&s.choiceActive]}><Text style={[s.choiceText,draft.source===v&&s.choiceTextActive]}>{v}</Text></Pressable>)}</View>
            <TextInput value={draft.source} onChangeText={v=>setDraft(current=>({...current,source:v}))} placeholder="Atau tulis sumber lainnya..." placeholderTextColor="#A1A1B0" style={s.sourceInput}/>
          </View>
        </View>{field("address","Alamat lengkap konsumen")}
        <View style={s.field}>
          <Text style={s.label}>Jadwal follow-up</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Pilih tanggal follow-up dari kalender" onPress={openFollowUpCalendar} style={s.dateButton}>
            <Text style={[s.dateButtonText,!draft.follow_up&&s.datePlaceholder]}>{selectedFollowUpDate?selectedFollowUpDate.toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"}):"Pilih tanggal, bulan, dan tahun"}</Text>
            <Text style={s.calendarIcon}>▦</Text>
          </Pressable>
          {calendarOpen&&<View style={s.calendarPanel}>
            <View style={s.calendarHeader}>
              <Pressable accessibilityLabel="Bulan sebelumnya" onPress={()=>changeCalendarMonth(-1)} style={s.calendarArrow}><Text style={s.calendarArrowText}>‹</Text></Pressable>
              <Text style={s.calendarMonthTitle}>{monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</Text>
              <Pressable accessibilityLabel="Bulan berikutnya" onPress={()=>changeCalendarMonth(1)} style={s.calendarArrow}><Text style={s.calendarArrowText}>›</Text></Pressable>
            </View>
            <View style={s.calendarGrid}>{["Min","Sen","Sel","Rab","Kam","Jum","Sab"].map(day=><Text key={day} style={s.calendarWeekday}>{day}</Text>)}
              {Array.from({length:new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),1).getDay()},(_,i)=><View key={"blank-"+i} style={s.calendarDay}/>)}
              {Array.from({length:new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,0).getDate()},(_,i)=>i+1).map(day=>{
                const isSelected=!!selectedFollowUpDate&&selectedFollowUpDate.getFullYear()===calendarMonth.getFullYear()&&selectedFollowUpDate.getMonth()===calendarMonth.getMonth()&&selectedFollowUpDate.getDate()===day;
                const today=new Date();const isToday=today.getFullYear()===calendarMonth.getFullYear()&&today.getMonth()===calendarMonth.getMonth()&&today.getDate()===day;
                return <Pressable key={day} accessibilityRole="button" accessibilityLabel={day+" "+monthNames[calendarMonth.getMonth()]+" "+calendarMonth.getFullYear()} onPress={()=>chooseFollowUpDay(day)} style={[s.calendarDay,s.calendarDayButton,isSelected&&s.calendarDaySelected,isToday&&!isSelected&&s.calendarDayToday]}><Text style={[s.calendarDayText,isSelected&&s.calendarDaySelectedText]}>{day}</Text></Pressable>;
              })}
            </View>
            <View style={s.calendarFooter}>
              <Pressable onPress={()=>{const now=new Date();const y=now.getFullYear(),m=String(now.getMonth()+1).padStart(2,"0"),d=String(now.getDate()).padStart(2,"0");setCalendarMonth(new Date(y,now.getMonth(),1));setDraft(current=>({...current,follow_up:`${y}-${m}-${d}`}));setCalendarOpen(false);}}><Text style={s.calendarAction}>Hari ini</Text></Pressable>
              <View style={{flexDirection:"row",gap:16}}>
                {!!draft.follow_up&&<Pressable onPress={()=>{setDraft(current=>({...current,follow_up:""}));setCalendarOpen(false);}}><Text style={s.calendarClear}>Hapus tanggal</Text></Pressable>}
                <Pressable onPress={()=>setCalendarOpen(false)}><Text style={s.calendarAction}>Tutup</Text></Pressable>
              </View>
            </View>
          </View>}
        </View>
        <View style={s.field}><Text style={s.label}>Status</Text><View style={s.statusChoices}>{["Belum Respon","Follow Up","Tertarik","Tidak Tertarik"].map(v=><Pressable key={v} onPress={()=>setDraft(p=>({...p,status:v}))} style={[s.choice,draft.status===v&&s.choiceActive]}><Text style={[s.choiceText,draft.status===v&&s.choiceTextActive]}>{v}</Text></Pressable>)}</View></View>
        {field("notes","Catatan tambahan",true)}
        <Pressable disabled={saving} onPress={save} style={[s.save,saving&&{opacity:.6}]}>{saving?<ActivityIndicator color="#FFF"/>:<Text style={s.saveText}>Simpan Prospek</Text>}</Pressable>
        <Pressable onPress={()=>setModal(false)} style={s.cancel}><Text style={s.cancelText}>Batal</Text></Pressable>
      </ScrollView></View></View>
    </Modal>
  </View>;
}
const s=StyleSheet.create({
 page:{flex:1,backgroundColor:"#F7F7F7",paddingHorizontal:20,paddingTop:26,paddingBottom:28},searchInput:{height:52,backgroundColor:"#FFF",borderWidth:1,borderColor:"#E8E8E8",borderRadius:12,paddingHorizontal:15,color:"#25253A",fontSize:14,marginBottom:10},filterRow:{gap:10,paddingBottom:16},filterChip:{paddingHorizontal:14,paddingVertical:10,borderRadius:10,backgroundColor:"#FFF",borderWidth:1,borderColor:"#E8E8E8"},filterChipActive:{backgroundColor:"#FFF0F1",borderColor:"#E60012"},filterText:{fontSize:12,color:"#77778A"},filterTextActive:{color:"#E60012",fontWeight:"800"},followUp:{fontSize:13,color:"#E60012",fontWeight:"700",marginTop:8},header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:22},title:{fontSize:29,fontWeight:"900",fontStyle:"italic",color:"#222229"},subtitle:{fontSize:14,color:"#858597",marginTop:4},headerActions:{flexDirection:"row",alignItems:"center",gap:10},excelBtn:{minHeight:46,backgroundColor:"#FFF",borderWidth:1,borderColor:"#E60012",paddingHorizontal:14,paddingVertical:12,borderRadius:12,alignItems:"center",justifyContent:"center"},excelText:{color:"#E60012",fontSize:13,fontWeight:"900"},add:{minHeight:46,backgroundColor:"#E60012",paddingHorizontal:18,paddingVertical:13,borderRadius:12,alignItems:"center",justifyContent:"center"},addText:{color:"#FFF",fontSize:14,fontWeight:"800"},
 center:{flex:1,alignItems:"center",justifyContent:"center",gap:11},muted:{fontSize:14,color:"#9292A3"},empty:{backgroundColor:"#FFF",padding:24,borderRadius:18,alignItems:"center",marginTop:20},emptyTitle:{fontSize:16,fontWeight:"800",color:"#29293D",marginBottom:6},
 card:{backgroundColor:"#FFF",padding:20,borderRadius:18,marginBottom:16,borderWidth:1,borderColor:"#EEEEEE"},cardTop:{flexDirection:"row",alignItems:"flex-start",gap:9},customer:{fontSize:16,fontWeight:"800",color:"#29293D"},phone:{fontSize:14,color:"#858597",marginTop:4},status:{fontSize:12,color:"#E60012",backgroundColor:"#FFF0F1",paddingHorizontal:11,paddingVertical:8,borderRadius:9,overflow:"hidden",fontWeight:"800"},statusNew:{color:"#2876C7",backgroundColor:"#EAF3FF"},statusProcess:{color:"#C87917",backgroundColor:"#FFF3E2"},statusDeal:{color:"#168653",backgroundColor:"#E8F7EF"},detail:{fontSize:14,color:"#66667A",marginTop:11,lineHeight:20},actions:{flexDirection:"row",gap:18,marginTop:16,borderTopWidth:1,borderTopColor:"#F0F0F0",paddingTop:14},edit:{fontSize:14,fontWeight:"800",color:"#E60012"},delete:{fontSize:14,fontWeight:"800",color:"#C44545"},error:{color:"#B74747",fontSize:14,marginVertical:12},
 overlay:{flex:1,backgroundColor:"rgba(20,20,35,.42)",justifyContent:"flex-end"},sheet:{maxHeight:"92%",backgroundColor:"#FFF",borderTopLeftRadius:24,borderTopRightRadius:24,padding:24,paddingBottom:30},sheetTitle:{fontSize:21,fontWeight:"800",color:"#25252B",marginBottom:12},field:{marginTop:16},dateButton:{minHeight:54,borderWidth:1,borderColor:"#E5E5EA",borderRadius:12,paddingHorizontal:15,flexDirection:"row",alignItems:"center",justifyContent:"space-between",backgroundColor:"#FFF"},dateButtonText:{fontSize:14,color:"#29293D",fontWeight:"600"},datePlaceholder:{color:"#A1A1B0",fontWeight:"400"},calendarIcon:{fontSize:21,color:"#E60012"},calendarPanel:{marginTop:9,padding:14,borderRadius:15,borderWidth:1,borderColor:"#E9E9EE",backgroundColor:"#FBFBFC"},calendarHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:12},calendarArrow:{width:36,height:42,borderRadius:10,backgroundColor:"#FFF0F1",alignItems:"center",justifyContent:"center"},calendarArrowText:{fontSize:26,color:"#E60012",lineHeight:30},calendarMonthTitle:{fontSize:15,fontWeight:"800",color:"#29293D"},calendarGrid:{flexDirection:"row",flexWrap:"wrap"},calendarWeekday:{width:"14.2857%",textAlign:"center",fontSize:12,fontWeight:"800",color:"#888899",paddingVertical:10},calendarDay:{width:"14.2857%",height:46,alignItems:"center",justifyContent:"center"},calendarDayButton:{borderRadius:10},calendarDaySelected:{backgroundColor:"#E60012"},calendarDayToday:{borderWidth:1,borderColor:"#E60012"},calendarDayText:{fontSize:14,color:"#333344"},calendarDaySelectedText:{color:"#FFF",fontWeight:"900"},calendarFooter:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:10,paddingTop:10,borderTopWidth:1,borderTopColor:"#ECECF0"},calendarAction:{fontSize:14,fontWeight:"800",color:"#E60012"},calendarClear:{fontSize:14,fontWeight:"700",color:"#77778A"},sourcePanel:{padding:14,borderRadius:13,borderWidth:1,borderColor:"#E8E8ED",backgroundColor:"#FAFAFB"},sourceHint:{fontSize:13,color:"#858597",marginBottom:10},sourceChoices:{flexDirection:"row",flexWrap:"wrap",gap:9},sourceChoice:{paddingHorizontal:14,paddingVertical:11,borderRadius:10},sourceInput:{height:49,borderWidth:1,borderColor:"#E8E8ED",borderRadius:10,paddingHorizontal:13,color:"#25253A",fontSize:14,marginTop:10,backgroundColor:"#FFF"},label:{fontSize:14,fontWeight:"700",color:"#45455A",marginBottom:8},input:{height:53,borderWidth:1,borderColor:"#E8E8E8",borderRadius:12,paddingHorizontal:15,color:"#25253A",fontSize:14},multiline:{height:80,textAlignVertical:"top",paddingTop:12},statusChoices:{flexDirection:"row",flexWrap:"wrap",gap:8},choice:{paddingHorizontal:12,paddingVertical:10,borderRadius:9,borderWidth:1,borderColor:"#E8E8E8"},choiceActive:{backgroundColor:"#FFF0F1",borderColor:"#E60012"},choiceText:{fontSize:12,color:"#77778A"},choiceTextActive:{color:"#E60012",fontWeight:"800"},save:{height:56,backgroundColor:"#E60012",borderRadius:14,alignItems:"center",justifyContent:"center",marginTop:26},saveText:{fontSize:15,color:"#FFF",fontWeight:"800"},cancel:{padding:16,alignItems:"center"},cancelText:{fontSize:14,color:"#77778A",fontWeight:"700"}
});
