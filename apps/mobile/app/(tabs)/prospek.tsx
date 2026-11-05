import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

type Prospect = { id:string; user_id:string; customer_name:string; phone:string; unit_interest:string|null; source:string|null; status:string; deal_status:string; notes:string|null; follow_up:string|null; created_at:string };
type Draft = { customer_name:string; phone:string; unit_interest:string; source:string; status:string; notes:string; follow_up:string };
const blank:Draft={customer_name:"",phone:"",unit_interest:"",source:"",status:"Belum Respon",notes:"",follow_up:""};

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

  const load=useCallback(async()=>{
    const {data,error}=await supabase.from("prospects").select("id,user_id,customer_name,phone,unit_interest,source,status,deal_status,notes,follow_up,created_at").order("created_at",{ascending:false});
    if(error) setError(error.message); else {setItems((data??[]) as Prospect[]);setError("");}
    setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);

  function openNew(){setEditing(null);setDraft(blank);setModal(true);}
  function openEdit(item:Prospect){setEditing(item.id);setDraft({customer_name:item.customer_name,phone:item.phone,unit_interest:item.unit_interest??"",source:item.source??"",status:item.status,notes:item.notes??"",follow_up:item.follow_up??""});setModal(true);}
  async function save(){
    if(!profile) return;
    if(!draft.customer_name.trim()||!draft.phone.trim()){Alert.alert("Data belum lengkap","Nama pelanggan dan nomor HP wajib diisi.");return;}
    const phoneDigits=draft.phone.replace(/\D/g,"");
    if(phoneDigits.length<10||phoneDigits.length>15){Alert.alert("Nomor HP tidak valid","Masukkan nomor HP dengan 10–15 digit.");return;}
    if(draft.follow_up.trim()&&!/^\d{4}-\d{2}-\d{2}$/.test(draft.follow_up.trim())){Alert.alert("Tanggal tidak valid","Isi jadwal follow-up dengan format YYYY-MM-DD.");return;}
    setSaving(true);
    const payload={customer_name:draft.customer_name.trim(),phone:draft.phone.trim(),unit_interest:draft.unit_interest.trim()||null,source:draft.source.trim()||null,status:draft.status,notes:draft.notes.trim()||null,follow_up:draft.follow_up.trim()||null,updated_at:new Date().toISOString()};
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
  const field=(label:keyof Draft,placeholder:string,multiline=false)=> <View style={s.field}><Text style={s.label}>{({customer_name:"Nama pelanggan",phone:"Nomor HP",unit_interest:"Motor yang diminati",source:"Sumber prospek",status:"Status",notes:"Catatan",follow_up:"Jadwal follow-up"} as Record<string,string>)[label]}</Text><TextInput value={draft[label]} onChangeText={v=>setDraft(p=>({...p,[label]:v}))} placeholder={placeholder} placeholderTextColor="#A1A1B0" style={[s.input,multiline&&s.multiline]} multiline={multiline} keyboardType={label==="phone"?"phone-pad":"default"}/></View>;

  const filteredItems=items.filter(item=>{const q=search.trim().toLowerCase();const matchesSearch=!q||[item.customer_name,item.phone,item.unit_interest??"",item.source??""].some(v=>v.toLowerCase().includes(q));const statusMatch=statusFilter==="Semua"||(statusFilter==="Baru"&&item.status==="Belum Respon")||(statusFilter==="Proses"&&item.status==="Follow Up")||(statusFilter==="Deal"&&(item.deal_status==="Deal"||item.status==="Tertarik"));return matchesSearch&&statusMatch;});
  return <View style={s.page}>
    <View style={s.header}><View><Text style={s.title}>Prospek</Text><Text style={s.subtitle}>{items.length} data pelanggan</Text></View><Pressable style={s.add} onPress={openNew}><Text style={s.addText}>+ Tambah</Text></Pressable></View>
    <TextInput value={search} onChangeText={setSearch} placeholder="Cari nama, nomor HP, motor..." placeholderTextColor="#A1A1B0" style={s.searchInput}/>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>{["Semua","Baru","Proses","Deal"].map(v=><Pressable key={v} onPress={()=>setStatusFilter(v)} style={[s.filterChip,statusFilter===v&&s.filterChipActive]}><Text style={[s.filterText,statusFilter===v&&s.filterTextActive]}>{v}</Text></Pressable>)}</ScrollView>
    {loading?<View style={s.center}><ActivityIndicator color="#E60012"/><Text style={s.muted}>Memuat prospek...</Text></View>:<ScrollView contentContainerStyle={{paddingBottom:30}}>
      {!!error&&<Text style={s.error}>{error}</Text>}
      {filteredItems.length===0&&!error&&<View style={s.empty}><Text style={s.emptyTitle}>{items.length===0?"Belum ada prospek":"Tidak ada hasil"}</Text><Text style={s.muted}>{items.length===0?"Tekan Tambah untuk mencatat calon pelanggan.":"Ubah kata kunci atau filter status."}</Text></View>}
      {filteredItems.map(item=><View key={item.id} style={s.card}>
        <View style={s.cardTop}><View style={{flex:1}}><Text style={s.customer}>{item.customer_name}</Text><Text style={s.phone}>{item.phone}</Text></View><Text style={[s.status,item.deal_status==="Deal"?s.statusDeal:item.status==="Belum Respon"?s.statusNew:item.status==="Follow Up"?s.statusProcess:null]}>{item.deal_status==="Deal"?"Deal":item.status==="Belum Respon"?"Baru":item.status==="Follow Up"?"Proses":item.status}</Text></View>
        {!!item.unit_interest&&<Text style={s.detail}>Minat: {item.unit_interest}</Text>}
        {!!item.source&&<Text style={s.detail}>Sumber: {item.source}</Text>}
        {!!item.follow_up&&<Text style={s.followUp}>Jadwal follow-up: {item.follow_up}{item.follow_up<=new Date().toISOString().slice(0,10)?" • Perlu ditindaklanjuti":""}</Text>}
        <View style={s.actions}><Pressable onPress={()=>openEdit(item)}><Text style={s.edit}>Edit</Text></Pressable><Pressable onPress={()=>remove(item)}><Text style={s.delete}>Hapus</Text></Pressable></View>
      </View>)}
    </ScrollView>}
    <Modal visible={modal} animationType="slide" transparent onRequestClose={()=>setModal(false)}>
      <View style={s.overlay}><View style={s.sheet}><ScrollView keyboardShouldPersistTaps="handled">
        <Text style={s.sheetTitle}>{editing?"Edit Prospek":"Tambah Prospek"}</Text>
        {field("customer_name","Nama lengkap")}{field("phone","08xxxxxxxxxx")}{field("unit_interest","Contoh: Honda Beat")}{field("source","Contoh: Facebook / WhatsApp")}{field("follow_up","YYYY-MM-DD")}
        <View style={s.field}><Text style={s.label}>Status</Text><View style={s.statusChoices}>{["Belum Respon","Follow Up","Tertarik","Tidak Tertarik"].map(v=><Pressable key={v} onPress={()=>setDraft(p=>({...p,status:v}))} style={[s.choice,draft.status===v&&s.choiceActive]}><Text style={[s.choiceText,draft.status===v&&s.choiceTextActive]}>{v}</Text></Pressable>)}</View></View>
        {field("notes","Catatan tambahan",true)}
        <Pressable disabled={saving} onPress={save} style={[s.save,saving&&{opacity:.6}]}>{saving?<ActivityIndicator color="#FFF"/>:<Text style={s.saveText}>Simpan Prospek</Text>}</Pressable>
        <Pressable onPress={()=>setModal(false)} style={s.cancel}><Text style={s.cancelText}>Batal</Text></Pressable>
      </ScrollView></View></View>
    </Modal>
  </View>;
}
const s=StyleSheet.create({
 page:{flex:1,backgroundColor:"#F7F7F7",padding:20,paddingTop:30},searchInput:{height:46,backgroundColor:"#FFF",borderWidth:1,borderColor:"#E8E8E8",borderRadius:12,paddingHorizontal:13,color:"#25253A",fontSize:13,marginBottom:10},filterRow:{gap:7,paddingBottom:13},filterChip:{paddingHorizontal:12,paddingVertical:8,borderRadius:10,backgroundColor:"#FFF",borderWidth:1,borderColor:"#E8E8E8"},filterChipActive:{backgroundColor:"#FFF0F1",borderColor:"#E60012"},filterText:{fontSize:10,color:"#77778A"},filterTextActive:{color:"#E60012",fontWeight:"800"},followUp:{fontSize:11,color:"#E60012",fontWeight:"700",marginTop:8},header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:18},title:{fontSize:28,fontWeight:"900",fontStyle:"italic",color:"#222229"},subtitle:{fontSize:12,color:"#858597",marginTop:4},add:{backgroundColor:"#E60012",paddingHorizontal:16,paddingVertical:11,borderRadius:12},addText:{color:"#FFF",fontSize:12,fontWeight:"800"},
 center:{flex:1,alignItems:"center",justifyContent:"center",gap:10},muted:{fontSize:12,color:"#9292A3"},empty:{backgroundColor:"#FFF",padding:22,borderRadius:18,alignItems:"center",marginTop:20},emptyTitle:{fontSize:15,fontWeight:"800",color:"#29293D",marginBottom:6},
 card:{backgroundColor:"#FFF",padding:17,borderRadius:17,marginBottom:12,borderWidth:1,borderColor:"#EEEEEE"},cardTop:{flexDirection:"row",alignItems:"flex-start",gap:8},customer:{fontSize:15,fontWeight:"800",color:"#29293D"},phone:{fontSize:12,color:"#858597",marginTop:4},status:{fontSize:10,color:"#E60012",backgroundColor:"#FFF0F1",paddingHorizontal:9,paddingVertical:6,borderRadius:9,overflow:"hidden",fontWeight:"800"},statusNew:{color:"#2876C7",backgroundColor:"#EAF3FF"},statusProcess:{color:"#C87917",backgroundColor:"#FFF3E2"},statusDeal:{color:"#168653",backgroundColor:"#E8F7EF"},detail:{fontSize:12,color:"#66667A",marginTop:9},actions:{flexDirection:"row",gap:22,marginTop:14,borderTopWidth:1,borderTopColor:"#F0F0F0",paddingTop:12},edit:{fontSize:12,fontWeight:"800",color:"#E60012"},delete:{fontSize:12,fontWeight:"800",color:"#C44545"},error:{color:"#B74747",fontSize:12,marginVertical:12},
 overlay:{flex:1,backgroundColor:"rgba(20,20,35,.42)",justifyContent:"flex-end"},sheet:{maxHeight:"92%",backgroundColor:"#FFF",borderTopLeftRadius:24,borderTopRightRadius:24,padding:22,paddingBottom:30},sheetTitle:{fontSize:20,fontWeight:"800",color:"#25252B",marginBottom:12},field:{marginTop:12},label:{fontSize:12,fontWeight:"700",color:"#45455A",marginBottom:7},input:{height:47,borderWidth:1,borderColor:"#E8E8E8",borderRadius:12,paddingHorizontal:13,color:"#25253A",fontSize:13},multiline:{height:80,textAlignVertical:"top",paddingTop:12},statusChoices:{flexDirection:"row",flexWrap:"wrap",gap:7},choice:{paddingHorizontal:10,paddingVertical:8,borderRadius:9,borderWidth:1,borderColor:"#E8E8E8"},choiceActive:{backgroundColor:"#FFF0F1",borderColor:"#E60012"},choiceText:{fontSize:10,color:"#77778A"},choiceTextActive:{color:"#E60012",fontWeight:"800"},save:{height:50,backgroundColor:"#E60012",borderRadius:13,alignItems:"center",justifyContent:"center",marginTop:22},saveText:{fontSize:14,color:"#FFF",fontWeight:"800"},cancel:{padding:14,alignItems:"center"},cancelText:{fontSize:13,color:"#77778A",fontWeight:"700"}
});
