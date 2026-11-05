import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import OnboardingGuide from "@/components/OnboardingGuide";
import Link from "next/link";
import { redirect } from "next/navigation";

type DashboardProps = { searchParams?: { sales?: string } };

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function Home({ searchParams }: DashboardProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles")
    .select("id,full_name,role,is_active").eq("id", user.id).single();
  if (!profile || profile.is_active === false) redirect("/login");

  const isSupervisor = profile.role === "supervisor";
  const isSuperAdmin = profile.role === "super_admin";
  const elevated = isSupervisor || isSuperAdmin;

  const { data: teamSales } = elevated
    ? await (() => {
        let query = supabase.from("profiles").select("id,full_name")
          .eq("role", "sales").eq("is_active", true).order("full_name");
        if (isSupervisor) query = query.eq("supervisor_id", user.id);
        return query;
      })()
    : { data: [] as { id: string; full_name: string }[] };

  const allowedSalesIds = (teamSales || []).map(person => person.id);
  const requestedSales = searchParams?.sales || "";
  const selectedSales = requestedSales && allowedSalesIds.includes(requestedSales) ? requestedSales : "";
  const scopeIds = elevated
    ? (selectedSales ? [selectedSales] : allowedSalesIds)
    : [user.id];

  const today = new Date();
  const todayKey = dateKey(today);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const weekKey = dateKey(weekStart);
  const monthKey = dateKey(monthStart);
  const idsForQuery = scopeIds.length ? scopeIds : ["00000000-0000-0000-0000-000000000000"];

  const [
    { data: prospects },
    { data: spkRows },
    { data: recent },
    { data: logs },
  ] = await Promise.all([
    supabase.from("prospects")
      .select("id,user_id,prospect_date,customer_name,phone,unit_interest,status,follow_up,notes,updated_at")
      .in("user_id", idsForQuery).order("created_at", { ascending: false }).limit(1000),
    supabase.from("spk_records")
      .select("id,user_id,spk_date,customer_name,unit_type,status,updated_at")
      .in("user_id", idsForQuery).order("created_at", { ascending: false }).limit(1000),
    supabase.from("prospects")
      .select("id,customer_name,unit_interest,status,created_at,user_id")
      .in("user_id", idsForQuery).order("created_at", { ascending: false }).limit(5),
    elevated
      ? supabase.from("activity_logs")
          .select("id,table_name,record_id,actor_id,action,created_at")
          .in("actor_id", idsForQuery).order("created_at", { ascending: false }).limit(12)
      : Promise.resolve({ data: [] as { id: number; table_name: string; record_id: string; actor_id: string; action: string; created_at: string }[] }),
  ]);

  const prospectRows = prospects || [];
  const spkList = spkRows || [];
  const pending = prospectRows.filter(row => !["Deal", "Tidak Berminat"].includes(row.status || ""));
  const lateFollowUps = pending.filter(row => row.follow_up && row.follow_up < todayKey);
  const noFollowUp = pending.filter(row => !row.follow_up);
  const todayProspects = prospectRows.filter(row => row.prospect_date === todayKey).length;
  const weekProspects = prospectRows.filter(row => row.prospect_date >= weekKey && row.prospect_date <= todayKey).length;
  const monthProspects = prospectRows.filter(row => row.prospect_date >= monthKey && row.prospect_date <= todayKey).length;
  const todaySpk = spkList.filter(row => row.spk_date === todayKey).length;
  const weekSpk = spkList.filter(row => row.spk_date >= weekKey && row.spk_date <= todayKey).length;
  const monthSpk = spkList.filter(row => row.spk_date >= monthKey && row.spk_date <= todayKey).length;

  const salesSummary = (teamSales || []).filter(person => !selectedSales || person.id === selectedSales)
    .map(person => ({
      ...person,
      prospects: prospectRows.filter(row => row.user_id === person.id).length,
      spk: spkList.filter(row => row.user_id === person.id).length,
      overdue: lateFollowUps.filter(row => row.user_id === person.id).length,
      pending: pending.filter(row => row.user_id === person.id).length,
    }));

  const logActorIds = Array.from(new Set((logs || []).map(row => row.actor_id)));
  const { data: logActors } = elevated && logActorIds.length
    ? await supabase.from("profiles").select("id,full_name").in("id", logActorIds)
    : { data: [] as { id: string; full_name: string }[] };
  const actorNames = new Map((logActors || []).map(person => [person.id, person.full_name]));
  const roleLabel = isSuperAdmin ? "SUPER ADMIN" : isSupervisor ? "SUPERVISOR" : "SALES";
  const scopeLabel = isSuperAdmin ? "Seluruh tim" : isSupervisor ? "Sales dalam tim Anda" : "Data pribadi";

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
        <article className="card"><div className="muted">Total Prospek</div><div className="metric">{prospectRows.length}</div><div className="muted">{scopeLabel}</div></article>
        <article className="card"><div className="muted">Total SPK</div><div className="metric">{spkList.length}</div><div className="muted">SPK tercatat</div></article>
        <article className="card"><div className="muted">Follow-up Terlambat</div><div className="metric">{lateFollowUps.length}</div><div className="muted">Perlu segera ditindaklanjuti</div></article>
        <article className="card"><div className="muted">Prospek Belum Ditindaklanjuti</div><div className="metric">{noFollowUp.length}</div><div className="muted">Belum memiliki jadwal follow-up</div></article>
      </section>

      {elevated && <>
        <section className="card" style={{marginBottom:20}}>
          <div className="toolbar" style={{marginTop:0}}>
            <div><h2 style={{marginBottom:4}}>Pengawasan Tim</h2><p className="muted">Filter data dan pantau kedisiplinan input setiap Sales.</p></div>
            <Link className="btn" href="/team">Kelola Pengguna</Link>
          </div>
          <form method="get" className="actions" style={{marginBottom:16}}>
            <label>Filter nama Sales
              <select name="sales" defaultValue={selectedSales}>
                <option value="">Semua Sales dalam cakupan</option>
                {(teamSales || []).map(person => <option key={person.id} value={person.id}>{person.full_name}</option>)}
              </select>
            </label>
            <button className="btn primary" type="submit">Terapkan</button>
            <Link className="btn" href="/">Reset</Link>
          </form>
          <div className="tablewrap">
            <table><thead><tr><th>Nama Sales</th><th>Prospek</th><th>SPK</th><th>Belum Ditindaklanjuti</th><th>Follow-up Terlambat</th></tr></thead>
              <tbody>{salesSummary.map(person => <tr key={person.id}>
                <td><strong>{person.full_name}</strong></td><td>{person.prospects}</td><td>{person.spk}</td><td>{person.pending}</td><td>{person.overdue}</td>
              </tr>)}
              {!salesSummary.length && <tr><td colSpan={5}>Belum ada Sales pada cakupan tim ini.</td></tr>}</tbody>
            </table>
          </div>
        </section>

        <section className="grid" style={{marginBottom:20}}>
          <article className="card"><h2>Laporan Harian</h2><div className="metric">{todayProspects} / {todaySpk}</div><p className="muted">Prospek / SPK hari ini</p><Link className="btn" href={`/reports?from=${todayKey}&to=${todayKey}`}>Buka laporan harian</Link></article>
          <article className="card"><h2>Laporan Mingguan</h2><div className="metric">{weekProspects} / {weekSpk}</div><p className="muted">Prospek / SPK sejak Senin</p><Link className="btn" href={`/reports?from=${weekKey}&to=${todayKey}`}>Buka laporan mingguan</Link></article>
          <article className="card"><h2>Laporan Bulanan</h2><div className="metric">{monthProspects} / {monthSpk}</div><p className="muted">Prospek / SPK bulan ini</p><Link className="btn" href={`/reports?from=${monthKey}&to=${todayKey}`}>Buka laporan bulanan</Link></article>
        </section>

        <section className="card" style={{marginBottom:20}}>
          <div className="toolbar" style={{marginTop:0}}><div><h2 style={{marginBottom:4}}>Pengawasan Perubahan Data</h2><p className="muted">Aktivitas terbaru pada data prospek dan SPK dalam cakupan Anda.</p></div></div>
          <div className="tablewrap"><table><thead><tr><th>Waktu</th><th>Pengguna</th><th>Jenis Data</th><th>Aktivitas</th><th>Catatan</th></tr></thead>
            <tbody>{(logs || []).map(log => <tr key={log.id}>
              <td>{new Date(log.created_at).toLocaleString("id-ID")}</td>
              <td>{actorNames.get(log.actor_id) || "Sales"}</td>
              <td>{log.table_name === "prospects" ? "Prospek" : log.table_name === "spk_records" ? "SPK" : log.table_name}</td>
              <td>{log.action}</td>
              <td><Link className="btn" href={log.table_name === "spk_records" ? `/spk/${log.record_id}` : `/prospects/${log.record_id}`}>Periksa data</Link></td>
            </tr>)}
            {!logs?.length && <tr><td colSpan={5}>Belum ada catatan perubahan pada cakupan tim.</td></tr>}</tbody>
          </table></div>
        </section>
      </>}

      <section className="card" style={{marginBottom:20}}>
        <div className="toolbar" style={{marginTop:0,marginBottom:8}}>
          <div><h2 style={{marginBottom:4}}>Akses Cepat</h2><div className="muted">Mulai pencatatan atau buka data penjualan.</div></div>
          <div className="actions"><Link className="btn primary" href="/prospects/new">+ Input Prospek</Link><Link className="btn" href="/spk/new">+ Input SPK</Link>{elevated && <Link className="btn" href="/reports">Laporan & Excel</Link>}</div>
        </div>
      </section>

      <section className="card">
        <div className="toolbar" style={{marginTop:0}}><div><h2 style={{marginBottom:4}}>Prospek Terbaru</h2><div className="muted">Lima data prospek terakhir dalam cakupan akses Anda.</div></div><Link className="btn" href="/prospects">Lihat semua</Link></div>
        <div className="tablewrap"><table><thead><tr><th>Nama Konsumen</th><th>Motor</th><th>Status</th><th>Tanggal</th></tr></thead>
          <tbody>{(recent || []).map(row => <tr key={row.id}><td><strong>{row.customer_name}</strong></td><td>{row.unit_interest || "-"}</td><td><span className="badge">{row.status}</span></td><td>{new Date(row.created_at).toLocaleDateString("id-ID")}</td></tr>)}
          {!recent?.length && <tr><td colSpan={4}>Belum ada data prospek.</td></tr>}</tbody>
        </table></div>
      </section>
      <div className="footer">DANA HONDA · Sistem pencatatan prospek dan SPK tim Honda.</div>
    </main>
  </>;
}
