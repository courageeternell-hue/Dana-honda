import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Reports({ searchParams }: { searchParams: { sales?: string; from?: string; to?: string } }) {
  const s = createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/login");
  const { data: p } = await s.from("profiles").select("role").eq("id", user.id).single();
  if (p?.role !== "supervisor") redirect("/");
  const { data: sales } = await s.from("profiles").select("id,full_name,email").eq("role", "sales").order("full_name");
  const params = new URLSearchParams();
  if (searchParams.sales) params.set("sales", searchParams.sales);
  if (searchParams.from) params.set("from", searchParams.from);
  if (searchParams.to) params.set("to", searchParams.to);
  const suffix = params.toString() ? "&" + params.toString() : "";
  const exportUrl = (type: string) => "/api/export?type=" + type + suffix;
  return <><Header/><main className="shell">
    <h1>Laporan Tim Supervisor</h1><p className="muted">Filter laporan berdasarkan sales dan rentang tanggal, lalu unduh file Excel.</p>
    <form className="card" method="get">
      <div className="formgrid">
        <label>Nama Sales<select name="sales" defaultValue={searchParams.sales || ""}><option value="">Semua Sales</option>{(sales||[]).map((x:any)=><option key={x.id} value={x.id}>{x.full_name||x.email}</option>)}</select></label>
        <label>Dari Tanggal<input type="date" name="from" defaultValue={searchParams.from||""}/></label>
        <label>Sampai Tanggal<input type="date" name="to" defaultValue={searchParams.to||""}/></label>
      </div>
      <div className="actions"><button className="btn primary">Terapkan Filter</button><Link className="btn" href="/reports">Reset</Link></div>
    </form>
    <div className="card"><h2>Download Excel</h2><p className="muted">File mengikuti filter yang dipilih di atas.</p><div className="actions"><a className="btn primary" href={exportUrl("prospects")}>Download Excel Prospek</a><a className="btn primary" href={exportUrl("spk")}>Download Excel SPK</a><a className="btn" href={exportUrl("all")}>Download Semua Laporan</a></div></div>
    <div className="card"><h2>Ringkasan Periode</h2><p>Filter aktif: <strong>{searchParams.sales ? (sales||[]).find((x:any)=>x.id===searchParams.sales)?.full_name || "Sales terpilih" : "Semua Sales"}</strong> · {searchParams.from||"Awal data"} sampai {searchParams.to||"Hari ini"}.</p></div>
    <p className="muted">Laporan harian, mingguan, dan bulanan juga tersedia pada dasbor supervisor.</p>
  </main></>;
}
