import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const isSupervisor = profile?.role === "supervisor";
  const today = new Date().toISOString().slice(0, 10);

  const [{ count: prospects }, { count: spk }] = await Promise.all([
    supabase.from("prospects").select("*", { count: "exact", head: true }),
    supabase.from("spk_records").select("*", { count: "exact", head: true })
  ]);

  if (!isSupervisor) {
    const { data: recent } = await supabase.from("prospects").select("id,customer_name,unit_interest,status,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5);
    return <><Header/><main className="shell">
      <div className="toolbar"><div><div className="muted">Selamat datang, {profile?.full_name || "Sales"}</div><h1>Dashboard Sales</h1><div className="muted">Ringkasan aktivitas akun Anda.</div></div><span className="badge">AKUN SALES</span></div>
      <section className="grid"><div className="card"><div className="muted">Total Prospek</div><div className="metric">{prospects || 0}</div></div><div className="card"><div className="muted">Total SPK</div><div className="metric">{spk || 0}</div></div></section>
      <div className="toolbar"><h2>Menu Cepat</h2><div className="actions"><Link className="btn primary" href="/prospects/new">+ Input Prospek</Link><Link className="btn" href="/spk/new">+ Input SPK</Link></div></div>
      <section className="card"><h2>Prospek Terbaru</h2><div className="tablewrap"><table><thead><tr><th>Nama Konsumen</th><th>Motor</th><th>Status</th><th>Tanggal</th></tr></thead><tbody>{(recent || []).map((r:any)=><tr key={r.id}><td>{r.customer_name}</td><td>{r.unit_interest || "-"}</td><td><span className="badge">{r.status}</span></td><td>{new Date(r.created_at).toLocaleDateString("id-ID")}</td></tr>)}{!recent?.length&&<tr><td colSpan={4}>Belum ada data prospek.</td></tr>}</tbody></table></div></section>
    </main></>;
  }

  const [{ data: allProspects }, { data: allSpk }, { data: sales }, { data: logs }] = await Promise.all([
    supabase.from("prospects").select("id,user_id,prospect_date,customer_name,phone,unit_interest,status,follow_up,updated_at").order("prospect_date", { ascending: false }),
    supabase.from("spk_records").select("id,user_id,spk_date,customer_name,unit_type,status,sales_name").order("spk_date", { ascending: false }),
    supabase.from("profiles").select("id,full_name,email,is_active").eq("role", "sales").order("full_name"),
    supabase.from("activity_logs").select("id,table_name,record_id,actor_id,action,created_at").order("created_at", { ascending: false }).limit(12)
  ]);
  const ps = allProspects || [];
  const ss = allSpk || [];
  const names = new Map((sales || []).map((x:any) => [x.id, x.full_name || x.email || "Sales"]));
  const overdue = ps.filter((r:any) => r.follow_up && /^\\d{4}-\\d{2}-\\d{2}$/.test(r.follow_up) && r.follow_up < today && !["Deal","Tidak Berminat"].includes(r.status));
  const untouched = ps.filter((r:any) => ["Belum Respon","Belum Ditindaklanjuti"].includes(r.status) || !r.follow_up);
  const todayProspects = ps.filter((r:any) => r.prospect_date === today).length;
  const todaySpk = ss.filter((r:any) => r.spk_date === today).length;
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 6);
  const weekKey = weekStart.toISOString().slice(0,10);
  const weekProspects = ps.filter((r:any) => r.prospect_date >= weekKey && r.prospect_date <= today).length;
  const weekSpk = ss.filter((r:any) => r.spk_date >= weekKey && r.spk_date <= today).length;
  const monthlyKey = today.slice(0,7);
  const monthProspects = ps.filter((r:any) => (r.prospect_date || "").startsWith(monthlyKey)).length;
  const monthSpk = ss.filter((r:any) => (r.spk_date || "").startsWith(monthlyKey)).length;
  const fmt = (d:string) => d ? new Date(d + "T00:00:00").toLocaleDateString("id-ID") : "-";

  return <><Header/><main className="shell">
    <div className="toolbar"><div><div className="muted">Selamat datang, {profile?.full_name || "Supervisor"}</div><h1>Dashboard Supervisor</h1><div className="muted">Pemantauan prospek, SPK, follow-up, dan kedisiplinan tim.</div></div><span className="badge red">SUPERVISOR</span></div>
    <section className="grid">
      <div className="card"><div className="muted">Total Prospek Tim</div><div className="metric">{ps.length}</div></div>
      <div className="card"><div className="muted">Total SPK Tim</div><div className="metric">{ss.length}</div></div>
      <div className="card"><div className="muted">Follow-up Terlambat</div><div className="metric">{overdue.length}</div></div>
      <div className="card"><div className="muted">Belum Ditindaklanjuti</div><div className="metric">{untouched.length}</div></div>
    </section>
    <div className="toolbar"><h2>Pemantauan Tim</h2><div className="actions"><Link className="btn" href="/prospects">Semua Prospek</Link><Link className="btn" href="/spk">Semua SPK</Link><Link className="btn primary" href="/reports">Laporan & Excel</Link></div></div>
    <section className="grid">
      <div className="card"><h3>Laporan Harian</h3><div className="metric">{todayProspects} / {todaySpk}</div><p className="muted">Prospek / SPK hari ini</p></div>
      <div className="card"><h3>Laporan 7 Hari</h3><div className="metric">{weekProspects} / {weekSpk}</div><p className="muted">Prospek / SPK dalam 7 hari terakhir</p></div>
      <div className="card"><h3>Laporan Bulanan</h3><div className="metric">{monthProspects} / {monthSpk}</div><p className="muted">Prospek / SPK bulan ini</p></div>
    </section>
    <section className="card"><div className="toolbar"><h2>Follow-up Terlambat</h2><span className="badge red">{overdue.length} data</span></div><div className="tablewrap"><table><thead><tr><th>Sales</th><th>Konsumen</th><th>Motor</th><th>Jadwal Follow-up</th><th>Status</th></tr></thead><tbody>{overdue.slice(0,30).map((r:any)=><tr key={r.id}><td>{names.get(r.user_id)||"Sales"}</td><td>{r.customer_name}<br/><small>{r.phone}</small></td><td>{r.unit_interest||"-"}</td><td>{fmt(r.follow_up)}</td><td>{r.status}</td></tr>)}{!overdue.length&&<tr><td colSpan={5}>Tidak ada follow-up terlambat.</td></tr>}</tbody></table></div></section>
    <section className="card"><div className="toolbar"><h2>Prospek Belum Ditindaklanjuti</h2><span className="badge">{untouched.length} data</span></div><div className="tablewrap"><table><thead><tr><th>Sales</th><th>Konsumen</th><th>Tanggal Input</th><th>Follow-up</th><th>Status</th></tr></thead><tbody>{untouched.slice(0,30).map((r:any)=><tr key={r.id}><td>{names.get(r.user_id)||"Sales"}</td><td>{r.customer_name}<br/><small>{r.phone}</small></td><td>{fmt(r.prospect_date)}</td><td>{fmt(r.follow_up)}</td><td>{r.status}</td></tr>)}{!untouched.length&&<tr><td colSpan={5}>Semua prospek sudah memiliki jadwal/status tindak lanjut.</td></tr>}</tbody></table></div></section>
    <section className="card"><h2>Performa Sales</h2><div className="tablewrap"><table><thead><tr><th>Nama Sales</th><th>Prospek</th><th>SPK</th><th>Follow-up Terlambat</th></tr></thead><tbody>{(sales||[]).map((person:any)=>{const a=ps.filter((r:any)=>r.user_id===person.id);const b=ss.filter((r:any)=>r.user_id===person.id);const late=a.filter((r:any)=>r.follow_up&&/^\\d{4}-\\d{2}-\\d{2}$/.test(r.follow_up)&&r.follow_up<today&&!["Deal","Tidak Berminat"].includes(r.status));return <tr key={person.id}><td>{person.full_name||person.email||"Sales"}{!person.is_active?" (Nonaktif)":""}</td><td>{a.length}</td><td>{b.length}</td><td>{late.length}</td></tr>})}{!sales?.length&&<tr><td colSpan={4}>Belum ada akun sales.</td></tr>}</tbody></table></div></section>
    <section className="card"><h2>Riwayat Perubahan Data</h2><div className="tablewrap"><table><thead><tr><th>Waktu</th><th>Pengguna</th><th>Data</th><th>Aksi</th></tr></thead><tbody>{(logs||[]).map((r:any)=><tr key={r.id}><td>{new Date(r.created_at).toLocaleString("id-ID")}</td><td>{names.get(r.actor_id)|| (r.actor_id===user.id?profile?.full_name:"Pengguna") || "Pengguna"}</td><td>{r.table_name==="prospects"?"Prospek":"SPK"}</td><td>{r.action==="insert"?"Tambah":r.action==="update"?"Ubah":"Hapus"}</td></tr>)}{!logs?.length&&<tr><td colSpan={4}>Belum ada riwayat perubahan.</td></tr>}</tbody></table></div><p className="muted">Riwayat ditampilkan berdasarkan catatan audit yang tersimpan di database.</p></section>
    <div className="footer">HONDA SALES REPORT · Dasbor supervisor menampilkan data tim sesuai hak akses database.</div>
  </main></>;
}
