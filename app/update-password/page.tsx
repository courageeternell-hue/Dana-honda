"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" && session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) setReady(true);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setMessage("");
    if (password.length < 8) {
      setError("Gunakan password minimal 8 karakter.");
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi password belum sama.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setReady(false);
        setError("Sesi pemulihan tidak ditemukan atau sudah kedaluwarsa. Minta tautan reset baru.");
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError("Password belum berhasil diperbarui. Coba lagi atau minta tautan pemulihan baru.");
        return;
      }
      await supabase.auth.signOut();
      setPassword("");
      setConfirm("");
      setReady(false);
      setMessage("Password berhasil diperbarui. Silakan masuk menggunakan password baru.");
    } catch {
      setError("Koneksi bermasalah. Periksa internet lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="login card">
    <div className="brand"><div className="logo">H</div><div>HONDA SALES REPORT<div className="muted">Keamanan akun</div></div></div>
    <h1>Buat password baru</h1>
    <p className="muted">Gunakan password baru yang kuat dan jangan bagikan kepada siapa pun.</p>
    {ready ? <form onSubmit={submit}>
      <div className="formgrid">
        <label>Password baru<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimal 8 karakter" /></label>
        <label>Ulangi password<input type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Masukkan ulang password" /></label>
      </div>
      {error && <div className="alert" role="alert">{error}</div>}
      {message && <div className="alert success" role="status">{message}</div>}
      <div className="actions"><button className="btn primary" disabled={busy}>{busy ? "Menyimpan..." : "Simpan password baru"}</button></div>
    </form> : <div className="alert">Sesi pemulihan belum terdeteksi. Buka tautan dari email pemulihan di perangkat ini, atau minta tautan baru.</div>}
    {message && <p style={{marginTop:18}}><Link href="/login">Kembali ke halaman masuk</Link></p>}
    {!ready && <p className="muted" style={{marginTop:18}}><Link href="/forgot-password">Minta tautan pemulihan</Link></p>}
  </main>;
}
