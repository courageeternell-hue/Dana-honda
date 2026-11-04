"use client";

import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const posOptions = ["POS Dayeuh", "POS Bengkel Plus", "POS Griya Alam Sentosa"];
const socialOptions = ["Facebook", "TikTok", "Instagram", "CRM"];
const tiktokOptions = ["Live TikTok", "Video TikTok"];

export default function NewSPK() {
  const router = useRouter();
  const [v, setV] = useState<any>({
    spk_date: new Date().toISOString().slice(0, 10),
    status: "Proses",
    source: "",
    source_detail: "",
    source_channel: "",
  });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  function ch(e: any) {
    const { name, value } = e.target;
    setV((current: any) => {
      const next = { ...current, [name]: value };
      if (name === "source") {
        next.source_detail = "";
        next.source_channel = "";
      }
      if (name === "source_detail") next.source_channel = "";
      return next;
    });
  }

  function sourceValue() {
    if (v.source === "POS") return `POS - ${v.source_detail}`;
    if (v.source === "Medsos") {
      return v.source_detail === "TikTok"
        ? `Medsos - TikTok - ${v.source_channel}`
        : `Medsos - ${v.source_detail}`;
    }
    return "";
  }

  async function save(e: any) {
    e.preventDefault();
    if (saving) return;
    if (!v.source || !v.source_detail || (v.source === "Medsos" && v.source_detail === "TikTok" && !v.source_channel)) {
      setErr("Lengkapi pilihan sumber SPK terlebih dahulu.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const s = createClient();
      const { data: { user }, error: authError } = await s.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: profile, error: profileError } = await s.from("profiles").select("full_name,is_active").eq("id", user.id).maybeSingle();
      if (profileError || !profile || profile.is_active === false) throw new Error("Akun tidak aktif atau profil tidak tersedia.");
      const { source_detail, source_channel, ...formValues } = v;
      const { error } = await s.from("spk_records").insert({
        ...formValues,
        source: sourceValue(),
        user_id: user.id,
        sales_name: profile.full_name || "Sales",
      });
      if (error) throw error;
      router.push("/spk");
    } catch {
      setErr("Data SPK gagal disimpan. Periksa isian dan koneksi, lalu coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Header />
      <main className="shell">
        <h1>Tambah SPK</h1>
        <form className="card" onSubmit={save}>
          <div className="formgrid">
            {[
              ["spk_date", "Tanggal SPK", "date"],
              ["customer_name", "Nama Konsumen", "text"],
              ["phone", "No. HP", "tel"],
              ["address", "Alamat Konsumen", "text"],
            ].map(([n, l, t]: any) => (
              <label key={n}>{l}<input name={n} type={t} required={["customer_name", "phone"].includes(n)} value={v[n] || ""} onChange={ch} /></label>
            ))}
            <label>Sumber SPK
              <select name="source" value={v.source} onChange={ch} required>
                <option value="">Pilih sumber</option>
                <option value="POS">POS</option>
                <option value="Medsos">Medsos</option>
              </select>
            </label>
            {v.source === "POS" && (
              <label>Lokasi POS
                <select name="source_detail" value={v.source_detail} onChange={ch} required>
                  <option value="">Pilih lokasi POS</option>
                  {posOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            )}
            {v.source === "Medsos" && (
              <>
                <label>Platform
                  <select name="source_detail" value={v.source_detail} onChange={ch} required>
                    <option value="">Pilih platform</option>
                    {socialOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                {v.source_detail === "TikTok" && (
                  <label>Jenis Konten TikTok
                    <select name="source_channel" value={v.source_channel} onChange={ch} required>
                      <option value="">Pilih jenis TikTok</option>
                      {tiktokOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </label>
                )}
              </>
            )}
            {[
              ["unit_type", "Type Unit", "text"],
              ["dp_cash", "DP / Harga Cash", "text"],
              ["leasing", "Leasing", "text"],
            ].map(([n, l, t]: any) => (
              <label key={n}>{l}<input name={n} type={t} required={n === "unit_type"} value={v[n] || ""} onChange={ch} /></label>
            ))}
            <label>Status SPK<select name="status" value={v.status} onChange={ch}>{["Jual", "Proses", "Indent", "Tolak", "Batal"].map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Keterangan<textarea name="notes" value={v.notes || ""} onChange={ch} /></label>
          </div>
          {err && <div className="alert">{err}</div>}
          <div className="actions"><button className="btn primary" disabled={saving}>{saving ? "Menyimpan..." : "Simpan SPK"}</button></div>
        </form>
      </main>
    </>
  );
}
