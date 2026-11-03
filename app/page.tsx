import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const isAdmin = profile?.role === "supervisor";
  const { count: prospects } = await supabase.from("prospects").select("*", { count: "exact", head: true });
  const { count: spk } = await supabase.from("spk_records").select("*", { count: "exact", head: true });
  const { data: recent } = await supabase.from("prospects")
    .select("id,customer_name,unit_interest,status,created_at")
    .order("created_at", { ascending: false }).limit(5);

  return <>
    <Header />
    <main className="shell">
      <section className="toolbar">
        <div>
          <div className="muted">HONDA SALES REPORT / RINGKASAN</div>
          <h1>Selamat datang, {profile?.full_name || "Sales"}</h1>
          <div className="muted">Pantau aktivitas penjualan dan kelola data harian tim Anda.</div>
        </div>
        <span className={isAdmin ? "badge red" : "badge"}>{isAdmin ? "SUPERVISOR" : "SALES"}</span>
      </section>

      <section className="grid" aria-label="Ringkasan data">
        <article className="card">
          <div className="muted">Total Prospek</div>
          <div className="metric">{prospects || 0}</div>
          <div className="muted">Data prospek yang dapat diakses</div>
        </article>
        <article className="card">
          <div className="muted">Total SPK</div>
          <div className="metric">{spk || 0}</div>
          <div className="muted">Pencatatan surat pemesanan</div>
        </article>
        <article className="card">
          <div className="muted">Cakupan Data</div>
          <div className="metric" style={{fontSize:21}}>{isAdmin ? "Seluruh Tim" : "Pribadi"}</div>
          <div className="muted">{isAdmin ? "Akses supervisor" : "Akses akun Anda"}</div>
        </article>
        <article className="card">
          <div className="muted">Arsip Laporan</div>
          <div className="metric" style={{fontSize:21}}>17.00 WIB</div>
          <div className="muted">Jadwal arsip harian</div>
        </article>
      </section>

      <section className="card" style={{marginBottom:20}}>
        <div className="toolbar" style={{marginTop:0,marginBottom:8}}>
          <div><h2 style={{marginBottom:4}}>Akses Cepat</h2><div className="muted">Mulai pencatatan atau buka data penjualan.</div></div>
          <div className="actions">
            <Link className="btn primary" href="/prospects/new">+ Input Prospek</Link>
            <Link className="btn" href="/spk/new">+ Input SPK</Link>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="toolbar" style={{marginTop:0}}>
          <div><h2 style={{marginBottom:4}}>Prospek Terbaru</h2><div className="muted">Lima data prospek yang terakhir dicatat.</div></div>
          <Link className="btn" href="/prospects">Lihat semua</Link>
        </div>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Nama Konsumen</th><th>Motor</th><th>Status</th><th>Tanggal</th></tr></thead>
            <tbody>
              {(recent || []).map((r: any) => <tr key={r.id}>
                <td><strong>{r.customer_name}</strong></td><td>{r.unit_interest || "-"}</td>
                <td><span className="badge">{r.status}</span></td>
                <td>{new Date(r.created_at).toLocaleDateString("id-ID")}</td>
              </tr>)}
              {!recent?.length && <tr><td colSpan={4}>Belum ada data prospek.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <div className="footer">HONDA SALES REPORT · Sistem pencatatan prospek dan SPK tim Honda.</div>
    </main>
  </>;
}
