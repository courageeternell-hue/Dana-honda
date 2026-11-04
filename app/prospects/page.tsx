import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Prospects() {
  const s = createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await s.from("prospects").select("*").order("created_at", { ascending: false });

  return <>
    <Header />
    <main className="shell">
      <div className="toolbar">
        <div><h1>Daftar Prospek</h1><p className="muted">Daftar konsumen yang Anda tangani.</p></div>
        <Link className="btn primary" href="/prospects/new">+ Tambah Prospek</Link>
      </div>
      <div className="mobile-records" aria-label="Daftar prospek versi mobile">
        {(data || []).map((r: any) => <article className="record-card card" key={r.id}>
          <div className="record-top"><span className="badge">{r.status}</span><span className="muted">{r.prospect_date}</span></div>
          <h3>{r.customer_name}</h3>
          <a className="record-phone" href={`tel:${r.phone}`}>{r.phone}</a>
          <div className="record-meta"><span>Motor</span><strong>{r.unit_interest || "-"}</strong></div>
          <div className="record-meta"><span>Sumber</span><strong>{r.source || "-"}</strong></div>
          <div className="record-meta"><span>Follow-up</span><strong>{r.follow_up || "-"}</strong></div>
          <Link className="btn primary record-action" href={`/prospects/${r.id}`}>Lihat Detail Prospek</Link>
        </article>)}
        {!data?.length && <div className="card muted">Belum ada prospek.</div>}
      </div>
      <div className="tablewrap desktop-records">
        <table><thead><tr><th>Tanggal</th><th>Nama Konsumen</th><th>No. HP</th><th>Sumber</th><th>Motor</th><th>Follow Up</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>{(data || []).map((r: any) => <tr key={r.id}><td>{r.prospect_date}</td><td>{r.customer_name}</td><td>{r.phone}</td><td>{r.source || "-"}</td><td>{r.unit_interest || "-"}</td><td>{r.follow_up || "-"}</td><td><span className="badge">{r.status}</span></td><td><Link className="btn" href={`/prospects/${r.id}`}>Detail / Edit</Link></td></tr>)}
            {!data?.length && <tr><td colSpan={8}>Belum ada prospek.</td></tr>}</tbody>
        </table>
      </div>
    </main>
  </>;
}
