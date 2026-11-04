"use client";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
export default function ConvertProspect(){
 const params=useParams<{id:string}>();const router=useRouter();const [form,setForm]=useState<any>(null);const [err,setErr]=useState("");const [saving,setSaving]=useState(false);const [ownerId,setOwnerId]=useState("");
 useEffect(()=>{let alive=true;(async()=>{const s=createClient();const {data:{user}}=await s.auth.getUser();if(!user){router.replace("/login");return;}const {data,error}=await s.from("prospects").select("*").eq("id",params.id).single();if(!alive)return;if(error||!data){setErr(error?.message||"Prospek tidak ditemukan.");return;}if(data.spk_created){setErr("Prospek ini sudah pernah dikonversi menjadi SPK.");return;}setOwnerId(data.user_id);setForm({spk_date:new Date().toISOString().slice(0,10),customer_name:data.customer_name,phone:data.phone,source:data.source||"",unit_type:data.unit_interest||"",notes:data.notes||"",status:"Proses"});})();return()=>{alive=false};},[params.id,router]);
 function ch(e:any){setForm((old:any)=>({...old,[e.target.name]:e.target.value}));}
 async function save(e:any){
  e.preventDefault();
  if(saving)return;
  setSaving(true);setErr("");
  try{
   const s=createClient();
   const {data:{user},error:authError}=await s.auth.getUser();
   if(authError)throw authError;
   if(!user){router.replace("/login");return;}
   if(user.id!==ownerId){setErr("Hanya Sales pemilik prospek yang dapat mengonversinya menjadi SPK.");return;}
   const {error}=await s.rpc("convert_prospect_to_spk",{
    p_prospect_id:params.id,
    p_spk_date:form.spk_date,
    p_customer_name:form.customer_name,
    p_phone:form.phone,
    p_address:form.address||null,
    p_source:form.source||null,
    p_unit_type:form.unit_type||null,
    p_dp_cash:form.dp_cash||null,
    p_leasing:form.leasing||null,
    p_notes:form.notes||null,
    p_status:form.status||"Proses"
   });
   if(error)throw error;
   router.push("/spk");
  }catch(error:any){
   setErr("Konversi gagal disimpan. Pastikan data valid dan akun memiliki akses, lalu coba lagi.");
  }finally{setSaving(false);}
 }
 return <><Header/><main className="shell"><h1>Konversi Prospek ke SPK</h1><p className="muted">Data konsumen diambil dari prospek dan bisa disesuaikan sebelum disimpan.</p>{err&&<div className="alert">{err}</div>}{form&&<form className="card" onSubmit={save}><div className="formgrid">
 <label>Tanggal SPK<input type="date" name="spk_date" required value={form.spk_date||""} onChange={ch}/></label><label>Nama Konsumen<input name="customer_name" required value={form.customer_name||""} onChange={ch}/></label><label>No. HP<input name="phone" required value={form.phone||""} onChange={ch}/></label><label>Alamat Konsumen<input name="address" value={form.address||""} onChange={ch}/></label><label>Sumber SPK<input name="source" value={form.source||""} onChange={ch}/></label><label>Type Unit<input name="unit_type" required value={form.unit_type||""} onChange={ch}/></label><label>DP / Harga Cash<input name="dp_cash" value={form.dp_cash||""} onChange={ch}/></label><label>Leasing<input name="leasing" value={form.leasing||""} onChange={ch}/></label><label>Status SPK<select name="status" value={form.status||"Proses"} onChange={ch}>{["Jual","Proses","Indent","Tolak","Batal"].map(x=><option key={x}>{x}</option>)}</select></label><label>Keterangan<textarea name="notes" value={form.notes||""} onChange={ch}/></label>
 </div><div className="actions"><button className="btn primary" disabled={saving}>{saving?"Menyimpan...":"Simpan sebagai SPK"}</button><button type="button" className="btn" onClick={()=>router.back()}>Batal</button></div></form>}</main></>;
}
