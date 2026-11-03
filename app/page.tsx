import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import Link from "next/link";
import { redirect } from "next/navigation";
export default async function Home() {
  const supabase=createClient(); const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect("/login");
  const {data:profile}=await supabase.from("profiles").select("*").eq("id",user.id).single();
  const isAdmin=profile?.role==="supervisor";
  const {count:prospects}=await supabase.from("prospects").select("*",{count:"exact",head:true});
  const {count:spk}=await supabase.from("spk_records").select("*",{count:"exact",head:true});
  const {data:recent}=await supabase.from("prospects").select("id,customer_name,unit_interest,status,created_at").order("created_at",{ascending:false}).limit(5);
  return <><Header/><main className="shell"><div className="toolbar"><div><div className="muted">Selamat datang, {profile?.full_name||"Sales"}</div><h1>Dashboard {isAdmin?"Supervisor":"Sales"}</h1><div className="muted">Ringkasan data yang dapat Anda akses.</div></div><span className="badge red">{isAdmin?"ADMIN / SUPERVISOR":"AKUN SALES"}</span></div>
  <section className="grid"><div className="card"><div className="muted">Total Prospek</div><div className="metric">{prospects||0}</div></div><div className="card"><div className="muted">Total SPK</div><div className="metric">{spk||0}</div></div><div className="card"><div className="muted">Akses Data</div><div className="metric" style={{fontSize:18}}>{isAdmin?"Seluruh Tim":"Pribadi"}</div></div><div className="card"><div className="muted">Laporan</div><div className="metric" style={{fontSize:18}}>17.00 WIB</div></div></section>
  <div className="toolbar"><h2>Menu Cepat</h2><div className="actions"><Link className="btn primary" href="/prospects/new">+ Input Prospek</Link><Link className="btn" href="/spk/new">+ Input SPK</Link></div></div>
  <section className="card"><h2>Prospek Terbaru</h2><div className="tablewrap"><table><thead><tr><th>Nama Konsumen</th><th>Motor</th><th>Status</th><th>Tanggal</th></tr></thead><tbody>{(recent||[]).map((r:any)=><tr key={r.id}><td>{r.customer_name}</td><td>{r.unit_interest||"-"}</td><td><span className="badge">{r.status}</span></td><td>{new Date(r.created_at).toLocaleDateString("id-ID")}</td></tr>)}{!recent?.length&&<tr><td colSpan={4}>Belum ada data prospek.</td></tr>}</tbody></table></div></section>
  <div className="footer">HONDA SALES REPORT · Data pribadi sales dilindungi oleh kebijakan database.</div></main></>;
}
