"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) {
        if (/rate limit|email rate limit/i.test(error.message)) {
          setError("Pengiriman email sedang dibatasi Supabase. Tunggu sampai batasnya pulih, lalu coba sekali lagi.");
        } else {
          setError("Permintaan reset belum berhasil. Periksa alamat email dan konfigurasi Auth.");
        }
      } else {
        setMessage("Jika email terdaftar, tautan pemulihan akan dikirim. Periksa Inbox dan Spam.");
      }
    } catch {
      setError("Koneksi bermasalah. Periksa internet lalu coba lagi.");
    } finally { setBusy(false); }
  }

  return <main className="login card">
    <div className="brand"><div className="logo">H</div><div>HONDA SALES REPORT<div className="muted">Pemulihan akun</div></div></div>
    <h1>Lupa password?</h1>
    <p className="muted">Masukkan email akun supervisor untuk meminta tautan pemulihan.</p>
    <form onSubmit={submit}>
      <div className="formgrid"><label>Email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="nama@email.com" /></label></div>
      {error && <div className="alert" role="alert">{error}</div>}
      {message && <div className="alert" role="status">{message}</div>}
      <div className="actions"><button className="btn primary" disabled={busy}>{busy ? "Mengirim..." : "Kirim tautan pemulihan"}</button></div>
    </form>
    <p className="muted" style={{marginTop:18}}><Link href="/login">Kembali ke login</Link></p>
  </main>;
}
