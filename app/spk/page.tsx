import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function SPK() {
  const s = createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await s.from("spk_records").select("*").order("created_at", { ascending: false });

  return <>
    <Header />
    <main className="shell">
      <div className="toolbar">
        <div><h1>Daftar SPK</h1><p className="muted">Data SPK yang tercatat di akun Anda.</p></div>
        <Link className="btn primary" href="/spk/new">+ Tambah SPK</Link>
      </div>
      <div className="mobile-records" aria-label="Daftar SPK versi mobile">
        {(data || []).map((r: any) => <article className="record-card card" key={r.id}>
          <div className="record-top"><span className="badge">{r.status}</span><span className="muted">{r.spk_date}</span></div>
          <h3>{r.customer_name}</h3>
          <a className="record-phone" href={`tel:${r.phone}`}>{r.phone}</a>
          <div className="record-meta"><span>Unit</span><strong>{r.unit_type}</strong></div>
          <div className="record-meta"><span>DP / Cash</span><strong>{r.dp_cash || "-"}</strong></div>
          <div className="record-meta"><span>Leasing</span><strong>{r.leasing || "-"}</strong></div>
          <Link className="btn primary record-action" href={`/spk/${r.id}`}>Lihat Detail SPK</Link>
        </article>)}
        {!data?.length && <div className="card muted">Belum ada SPK.</div>}
      </div>
      <div className="tablewrap desktop-records">
        <table><thead><tr><th>Tanggal</th><th>Nama Konsumen</th><th>No. HP</th><th>Unit</th><th>DP / Cash</th><th>Leasing</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>{(data || []).map((r: any) => <tr key={r.id}><td>{r.spk_date}</td><td>{r.customer_name}</td><td>{r.phone}</td><td>{r.unit_type}</td><td>{r.dp_cash || "-"}</td><td>{r.leasing || "-"}</td><td><span className="badge">{r.status}</span></td><td><Link className="btn" href={`/spk/${r.id}`}>Detail / Edit</Link></td></tr>)}
            {!data?.length && <tr><td colSpan={8}>Belum ada SPK.</td></tr>}</tbody>
        </table>
      </div>
    </main>
  </>;
}
