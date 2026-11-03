import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Reports({ searchParams }: { searchParams?: { from?: string; to?: string; sales?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role,is_active").eq("id", user.id).single();
  if (!profile || profile.is_active === false) redirect("/login");
  const elevated = profile.role === "supervisor" || profile.role === "super_admin";
  const { data: sales } = elevated
    ? await supabase.from("profiles").select("id,full_name").eq("role", "sales").order("full_name")
    : { data: [] as { id: string; full_name: string }[] };

  const query = new URLSearchParams();
  if (searchParams?.from) query.set("from", searchParams.from);
  if (searchParams?.to) query.set("to", searchParams.to);
  if (searchParams?.sales) query.set("sales", searchParams.sales);
  const suffix = query.toString() ? "&" + query.toString() : "";
  const scope = elevated ? "seluruh tim atau sales yang dipilih" : "data milik akun sendiri";

  return <>
    <Header />
    <main className="shell">
      <div className="toolbar"><div><div className="muted">ANALISIS PENJUALAN</div><h1>Laporan Prospek & SPK</h1>
        <p className="muted">Unduh data aktual dari database dalam format Excel. Cakupan: {scope}.</p></div></div>
      <section className="card">
        <h2>Filter Laporan</h2>
        <form method="get">
          <div className="formgrid">
            <label>Tanggal mulai<input type="date" name="from" defaultValue={searchParams?.from || ""}/></label>
            <label>Tanggal akhir<input type="date" name="to" defaultValue={searchParams?.to || ""}/></label>
            {elevated && <label>Sales
              <select name="sales" defaultValue={searchParams?.sales || ""}>
                <option value="">Semua Sales</option>
                {(sales || []).map(person => <option key={person.id} value={person.id}>{person.full_name}</option>)}
              </select>
            </label>}
          </div>
          <div className="actions"><button className="btn primary" type="submit">Terapkan Filter</button><a className="btn" href="/reports">Reset</a></div>
        </form>
      </section>
      <section className="grid">
        <article className="card"><h2>Export Prospek</h2><p className="muted">Data konsumen, sumber, status, follow-up, motor diminati, dan sales.</p><a className="btn primary" href={"/api/export?type=prospects" + suffix}>Download Excel Prospek</a></article>
        <article className="card"><h2>Export SPK</h2><p className="muted">Data SPK, konsumen, unit, DP/cash, leasing, status, dan sales.</p><a className="btn primary" href={"/api/export?type=spk" + suffix}>Download Excel SPK</a></article>
        <article className="card"><h2>Semua Laporan</h2><p className="muted">Satu file Excel dengan lembar Prospek, SPK, dan Ringkasan.</p><a className="btn" href={"/api/export?type=all" + suffix}>Download Semua</a></article>
      </section>
      <p className="muted">File dibuat saat tombol ditekan dari data database terbaru. Tidak menggunakan data contoh.</p>
    </main>
  </>;
}
