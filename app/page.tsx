import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import OnboardingGuide from "@/components/OnboardingGuide";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles")
    .select("id,full_name,role,is_active").eq("id", user.id).single();
  if (!profile || profile.is_active === false) redirect("/login");

  const isSupervisor = profile.role === "supervisor";
  const isSuperAdmin = profile.role === "super_admin";
  const elevated = isSupervisor || isSuperAdmin;

  const [
    { count: prospects },
    { count: spk },
    { data: recent },
    { data: teamSales }
  ] = await Promise.all([
    supabase.from("prospects").select("id", { count: "exact", head: true }),
    supabase.from("spk_records").select("id", { count: "exact", head: true }),
    supabase.from("prospects").select("id,customer_name,unit_interest,status,created_at")
      .order("created_at", { ascending: false }).limit(5),
    elevated
      ? supabase.from("profiles").select("id,full_name").eq("role", "sales").order("full_name")
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] })
  ]);

  const salesSummary = await Promise.all((teamSales || []).map(async (sales) => {
    const [{ count: salesProspects }, { count: salesSpk }] = await Promise.all([
      supabase.from("prospects").select("id", { count: "exact", head: true }).eq("user_id", sales.id),
      supabase.from("spk_records").select("id", { count: "exact", head: true }).eq("user_id", sales.id)
    ]);
    return { ...sales, prospects: salesProspects || 0, spk: salesSpk || 0 };
  }));

  const roleLabel = isSuperAdmin ? "SUPER ADMIN" : isSupervisor ? "SUPERVISOR" : "SALES";
  const scopeLabel = isSuperAdmin ? "Seluruh cabang / tim" : isSupervisor ? "Tim yang Anda awasi" : "Data pribadi";

  return <>
    <Header />
    <main className="shell">
      <OnboardingGuide userId={user.id} role={profile.role as "sales" | "supervisor" | "super_admin"} />
      <section className="toolbar">
        <div>
          <div className="muted">DANA HONDA / RINGKASAN PENJUALAN</div>
          <h1>Selamat datang, {profile.full_name || "Pengguna"}</h1>
          <div className="muted">Pantau aktivitas penjualan dan kelola data harian.</div>
        </div>
        <span className={elevated ? "badge red" : "badge"}>{roleLabel}</span>
      </section>

      <section className="grid" aria-label="Ringkasan data">
        <article className="card">
          <div className="muted">Total Prospek</div>
          <div className="metric">{prospects || 0}</div>
          <div className="muted">Prospek dalam cakupan akses Anda</div>
        </article>
        <article className="card">
          <div className="muted">Total SPK</div>
          <div className="metric">{spk || 0}</div>
          <div className="muted">SPK dalam cakupan akses Anda</div>
        </article>
        <article className="card">
          <div className="muted">Cakupan Data</div>
          <div className="metric" style={{fontSize:21}}>{elevated ? "Tim" : "Pribadi"}</div>
          <div className="muted">{scopeLabel}</div>
        </article>
        <article className="card">
          <div className="muted">Status Akun</div>
          <div className="metric" style={{fontSize:21}}>Aktif</div>
          <div className="muted">Akses {roleLabel.toLowerCase()}</div>
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

      {elevated && <section className="card" style={{marginBottom:20}}>
        <div className="toolbar" style={{marginTop:0}}>
          <div><h2 style={{marginBottom:4}}>Performa Sales</h2><div className="muted">Rekap prospek dan SPK per Sales yang berada dalam cakupan akses Anda.</div></div>
          <Link className="btn" href="/team">Kelola Pengguna</Link>
        </div>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Nama Sales</th><th>Total Prospek</th><th>Total SPK</th></tr></thead>
            <tbody>
              {salesSummary.map((sales) => <tr key={sales.id}>
                <td><strong>{sales.full_name}</strong></td><td>{sales.prospects}</td><td>{sales.spk}</td>
              </tr>)}
              {!salesSummary.length && <tr><td colSpan={3}>Belum ada Sales di tim ini.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>}

      <section className="card">
        <div className="toolbar" style={{marginTop:0}}>
          <div><h2 style={{marginBottom:4}}>Prospek Terbaru</h2><div className="muted">Lima data prospek terakhir dalam cakupan akses Anda.</div></div>
          <Link className="btn" href="/prospects">Lihat semua</Link>
        </div>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Nama Konsumen</th><th>Motor</th><th>Status</th><th>Tanggal</th></tr></thead>
            <tbody>
              {(recent || []).map((r) => <tr key={r.id}>
                <td><strong>{r.customer_name}</strong></td><td>{r.unit_interest || "-"}</td>
                <td><span className="badge">{r.status}</span></td>
                <td>{new Date(r.created_at).toLocaleDateString("id-ID")}</td>
              </tr>)}
              {!recent?.length && <tr><td colSpan={4}>Belum ada data prospek.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <div className="footer">DANA HONDA · Sistem pencatatan prospek dan SPK tim Honda.</div>
    </main>
  </>;
}
