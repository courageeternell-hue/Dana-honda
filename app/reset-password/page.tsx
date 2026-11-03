"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (password.length < 10) { setError("Password minimal 10 karakter."); return; }
    if (password !== confirm) { setError("Konfirmasi password belum sama."); return; }
    setBusy(true); setError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError("Tautan pemulihan tidak valid atau sudah kedaluwarsa. Minta tautan baru.");
        return;
      }
      setDone(true);
      await supabase.auth.signOut();
    } catch {
      setError("Koneksi bermasalah. Coba lagi.");
    } finally { setBusy(false); }
  }

  return <main className="login card">
    <div className="brand"><div className="logo">H</div><div>HONDA SALES REPORT<div className="muted">Keamanan akun</div></div></div>
    {done ? <>
      <h1>Password berhasil diperbarui</h1>
      <p className="muted">Silakan masuk kembali menggunakan password baru.</p>
      <div className="actions"><button className="btn primary" onClick={() => router.replace("/login")}>Ke halaman login</button></div>
    </> : <>
      <h1>Buat password baru</h1>
      <p className="muted">Gunakan password baru minimal 10 karakter.</p>
      <form onSubmit={submit}>
        <div className="formgrid">
          <label>Password baru<input type="password" autoComplete="new-password" required minLength={10} value={password} onChange={e => setPassword(e.target.value)} /></label>
          <label>Ulangi password<input type="password" autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
        </div>
        {error && <div className="alert" role="alert">{error}</div>}
        <div className="actions"><button className="btn primary" disabled={busy}>{busy ? "Menyimpan..." : "Simpan password baru"}</button></div>
      </form>
      <p className="muted" style={{marginTop:18}}><Link href="/login">Kembali ke login</Link></p>
    </>}
  </main>;
}
