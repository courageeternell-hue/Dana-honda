import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

type Spk={id:string;user_id:string;customer_name:string;phone:string;unit_type:string;dp_cash:string|null;leasing:string|null;status:string;spk_date:string};
type Draft={customer_name:string;phone:string;unit_type:string;dp_cash:string;leasing:string;status:string};
const blank:Draft={customer_name:"",phone:"",unit_type:"",dp_cash:"",leasing:"",status:"Proses"};

export default function SpkScreen(){
 const {profile}=useAuth();
 const [items,setItems]=useState<Spk[]>([]);
 const [draft,setDraft]=useState<Draft>(blank);
 const [editing,setEditing]=useState<string|null>(null);
 const [modal,setModal]=useState(false);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const load=useCallback(async()=>{const {data,error}=await supabase.from("spk_records").select("id,user_id,customer_name,phone,unit_type,dp_cash,leasing,status,spk_date").order("created_at",{ascending:false});if(error)setError(error.message);else{setItems((data??[]) as Spk[]);setError("");}setLoading(false);},[]);
 useEffect(()=>{load();},[load]);
 function openNew(){setEditing(null);setDraft(blank);setModal(true);}
 function openEdit(item:Spk){setEditing(item.id);setDraft({customer_name:item.customer_name,phone:item.phone,unit_type:item.unit_type,dp_cash:item.dp_cash??"",leasing:item.leasing??"",status:item.status});setModal(true);}
 async function save(){
  if(!profile)return;
  if(!draft.customer_name.trim()||!draft.phone.trim()||!draft.unit_type.trim()){Alert.alert("Data belum lengkap","Nama pelanggan, nomor HP, dan tipe motor wajib diisi.");return;}
  setSaving(true);
  const payload={customer_name:draft.customer_name.trim(),phone:draft.phone.trim(),unit_type:draft.unit_type.trim(),dp_cash:draft.dp_cash.trim()||null,leasing:draft.leasing.trim()||null,status:draft.status,updated_at:new Date().toISOString()};
  const result=editing?await supabase.from("spk_records").update(payload).eq("id",editing):await supabase.from("spk_records").insert({...payload,user_id:profile.id,sales_name:profile.full_name,spk_date:new Date().toISOString().slice(0,10),prospect_id:null,address:null,source:null,notes:null});
  setSaving(false);if(result.error){Alert.alert("Gagal menyimpan",result.error.message);return;}setModal(false);await load();
 }
 function remove(item:Spk){Alert.alert("Hapus SPK?",`Data SPK ${item.customer_name} akan dihapus.`,[{text:"Batal",style:"cancel"},{text:"Hapus",style:"destructive",onPress:async()=>{const {error}=await supabase.from("spk_records").delete().eq("id",item.id);if(error)Alert.alert("Tidak bisa menghapus",error.message);else load();}}]);}
 const field=(key:keyof Draft,placeholder:string)=> <View style={s.field}><Text style={s.label}>{{customer_name:"Nama pelanggan",phone:"Nomor HP",unit_type:"Tipe motor",dp_cash:"DP / cash",leasing:"Leasing"}[key]??"Status"}</Text><TextInput value={draft[key]} onChangeText={v=>setDraft(p=>({...p,[key]:v}))} placeholder={placeholder} placeholderTextColor="#A1A1B0" style={s.input}/></View>;
 return <View style={s.page}>
  <View style={s.header}><View><Text style={s.title}>SPK</Text><Text style={s.subtitle}>{items.length} data SPK</Text></View><Pressable style={s.add} onPress={openNew}><Text style={s.addText}>+ Tambah</Text></Pressable></View>
  {loading?<View style={s.center}><ActivityIndicator color="#5B4BDB"/><Text style={s.muted}>Memuat SPK...</Text></View>:<ScrollView contentContainerStyle={{paddingBottom:30}}>
   {!!error&&<Text style={s.error}>{error}</Text>}
   {items.length===0&&!error&&<View style={s.empty}><Text style={s.emptyTitle}>Belum ada SPK</Text><Text style={s.muted}>Tekan Tambah untuk mencatat SPK baru.</Text></View>}
   {items.map(item=><View key={item.id} style={s.card}><View style={s.cardTop}><View style={{flex:1}}><Text style={s.customer}>{item.customer_name}</Text><Text style={s.phone}>{item.phone}</Text></View><Text style={s.status}>{item.status}</Text></View><Text style={s.detail}>{item.unit_type}</Text><Text style={s.detail}>Tanggal: {item.spk_date}</Text>{!!item.dp_cash&&<Text style={s.detail}>DP / Cash: {item.dp_cash}</Text>}{!!item.leasing&&<Text style={s.detail}>Leasing: {item.leasing}</Text>}<View style={s.actions}><Pressable onPress={()=>openEdit(item)}><Text style={s.edit}>Edit</Text></Pressable><Pressable onPress={()=>remove(item)}><Text style={s.delete}>Hapus</Text></Pressable></View></View>)}
  </ScrollView>}
  <Modal visible={modal} animationType="slide" transparent onRequestClose={()=>setModal(false)}><View style={s.overlay}><View style={s.sheet}><ScrollView keyboardShouldPersistTaps="handled"><Text style={s.sheetTitle}>{editing?"Edit SPK":"Tambah SPK"}</Text>{field("customer_name","Nama lengkap")}{field("phone","08xxxxxxxxxx")}{field("unit_type","Contoh: Honda Vario 160")}{field("dp_cash","Contoh: Rp1.500.000")}{field("leasing","Contoh: FIF / Adira")}<View style={s.field}><Text style={s.label}>Status SPK</Text><View style={s.statusChoices}>{["Proses","Jual","Indent","Tolak","Batal"].map(v=><Pressable key={v} onPress={()=>setDraft(p=>({...p,status:v}))} style={[s.choice,draft.status===v&&s.choiceActive]}><Text style={[s.choiceText,draft.status===v&&s.choiceTextActive]}>{v}</Text></Pressable>)}</View></View><Pressable disabled={saving} onPress={save} style={[s.save,saving&&{opacity:.6}]}>{saving?<ActivityIndicator color="#FFF"/>:<Text style={s.saveText}>Simpan SPK</Text>}</Pressable><Pressable onPress={()=>setModal(false)} style={s.cancel}><Text style={s.cancelText}>Batal</Text></Pressable></ScrollView></View></View></Modal>
 </View>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:"#F7F7FB",padding:20,paddingTop:30},header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:18},title:{fontSize:28,fontWeight:"800",color:"#202033"},subtitle:{fontSize:12,color:"#858597",marginTop:4},add:{backgroundColor:"#5B4BDB",paddingHorizontal:16,paddingVertical:11,borderRadius:12},addText:{color:"#FFF",fontSize:12,fontWeight:"800"},center:{flex:1,alignItems:"center",justifyContent:"center",gap:10},muted:{fontSize:12,color:"#9292A3"},empty:{backgroundColor:"#FFF",padding:22,borderRadius:18,alignItems:"center",marginTop:20},emptyTitle:{fontSize:15,fontWeight:"800",color:"#29293D",marginBottom:6},card:{backgroundColor:"#FFF",padding:17,borderRadius:17,marginBottom:12,borderWidth:1,borderColor:"#EEEEF5"},cardTop:{flexDirection:"row",alignItems:"flex-start",gap:8},customer:{fontSize:15,fontWeight:"800",color:"#29293D"},phone:{fontSize:12,color:"#858597",marginTop:4},status:{fontSize:10,color:"#5B4BDB",backgroundColor:"#F0EEFF",paddingHorizontal:9,paddingVertical:6,borderRadius:9,overflow:"hidden"},detail:{fontSize:12,color:"#66667A",marginTop:8},actions:{flexDirection:"row",gap:22,marginTop:14,borderTopWidth:1,borderTopColor:"#F0F0F5",paddingTop:12},edit:{fontSize:12,fontWeight:"800",color:"#5B4BDB"},delete:{fontSize:12,fontWeight:"800",color:"#C44545"},error:{color:"#B74747",fontSize:12,marginVertical:12},overlay:{flex:1,backgroundColor:"rgba(20,20,35,.42)",justifyContent:"flex-end"},sheet:{maxHeight:"92%",backgroundColor:"#FFF",borderTopLeftRadius:24,borderTopRightRadius:24,padding:22,paddingBottom:30},sheetTitle:{fontSize:20,fontWeight:"800",color:"#242438",marginBottom:12},field:{marginTop:12},label:{fontSize:12,fontWeight:"700",color:"#45455A",marginBottom:7},input:{height:47,borderWidth:1,borderColor:"#E8E8F0",borderRadius:12,paddingHorizontal:13,color:"#25253A",fontSize:13},statusChoices:{flexDirection:"row",flexWrap:"wrap",gap:7},choice:{paddingHorizontal:10,paddingVertical:8,borderRadius:9,borderWidth:1,borderColor:"#E8E8F0"},choiceActive:{backgroundColor:"#F0EEFF",borderColor:"#5B4BDB"},choiceText:{fontSize:10,color:"#77778A"},choiceTextActive:{color:"#5B4BDB",fontWeight:"800"},save:{height:50,backgroundColor:"#5B4BDB",borderRadius:13,alignItems:"center",justifyContent:"center",marginTop:22},saveText:{fontSize:14,color:"#FFF",fontWeight:"800"},cancel:{padding:14,alignItems:"center"},cancelText:{fontSize:13,color:"#77778A"}});
