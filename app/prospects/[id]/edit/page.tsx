"use client";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditProspect() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [v, setV] = useState<any>(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      const s = createClient();
      const { data: { user } } = await s.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data, error } = await s.from("prospects").select("*").eq("id", params.id).single();
      if (!alive) return;
      if (error || !data) { setErr(error?.message || "Prospek tidak ditemukan."); return; }
      setV(data);
    })();
    return () => { alive = false; };
  }, [params.id, router]);
  function ch(e: any) { setV((old: any) => ({ ...old, [e.target.name]: e.target.value })); }
  async function save(e: any) {
    e.preventDefault(); setSaving(true); setErr("");
    const s = createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) { router.replace("/login"); return; }
    const { error } = await s.from("prospects").update({
      prospect_date: v.prospect_date, customer_name: v.customer_name, phone: v.phone,
      source: v.source || null, unit_interest: v.unit_interest || null, follow_up: v.follow_up || null,
      lead_response: v.lead_response || null, deal_status: v.deal_status, status: v.status, notes: v.notes || null
    }).eq("id", params.id);
    setSaving(false);
    if (error) setErr(error.message); else router.push("/prospects/" + params.id);
  }
  return <><Header/><main className="shell"><h1>Edit Prospek</h1>{!v && !err && <p>Memuat data...</p>}{err && <div className="alert">{err}</div>}{v && <form className="card" onSubmit={save}><div className="formgrid">
    <label>Tanggal<input name="prospect_date" type="date" required value={v.prospect_date || ""} onChange={ch}/></label>
    <label>Nama Konsumen<input name="customer_name" required value={v.customer_name || ""} onChange={ch}/></label>
    <label>No. HP<input name="phone" type="tel" required value={v.phone || ""} onChange={ch}/></label>
    <label>Sumber Prospek<input name="source" value={v.source || ""} onChange={ch}/></label>
    <label>Motor yang diminati<input name="unit_interest" value={v.unit_interest || ""} onChange={ch}/></label>
    <label>Follow Up<input name="follow_up" value={v.follow_up || ""} onChange={ch}/></label>
    <label>Lead / Respon Tertarik<input name="lead_response" value={v.lead_response || ""} onChange={ch}/></label>
    <label>Deal<select name="deal_status" value={v.deal_status || "Belum"} onChange={ch}><option>Belum</option><option>Deal</option><option>Tidak Deal</option></select></label>
    <label>Status Prospek<select name="status" value={v.status || "Belum Respon"} onChange={ch}><option>Belum Respon</option><option>Follow Up</option><option>Tertarik</option><option>Deal</option><option>Tidak Berminat</option></select></label>
    <label>Keterangan<textarea name="notes" value={v.notes || ""} onChange={ch}/></label>
  </div><div className="actions"><button className="btn primary" disabled={saving}>{saving ? "Menyimpan..." : "Simpan Perubahan"}</button><button type="button" className="btn" onClick={() => router.back()}>Batal</button></div></form>}</main></>;
}
