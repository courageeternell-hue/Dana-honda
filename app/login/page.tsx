"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

function HondaMark() {
  return <div className="honda-mark" aria-label="Honda Sales">
    <svg viewBox="0 0 120 100" role="img" aria-hidden="true">
      <path d="M12 35 91 4 75 23 22 48 12 35Zm7 18 73-29-13 17-52 24-8-12Zm8 17 59-24-12 17-40 18-7-11Z" fill="#d71920"/>
      <path d="M28 76h65l-5 8H33z" fill="#d71920"/>
    </svg>
    <strong>HONDA</strong><small>SALES</small>
  </div>;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.push("/");
    } catch {
      setError("Tidak dapat masuk. Periksa koneksi internet lalu coba lagi.");
    } finally { setBusy(false); }
  }

  return <main className="login-screen">
    <section className="login-hero">
      <div className="login-brand"><HondaMark/><div><strong>ASISTEN SALES</strong><span>SALES MANAGEMENT APP</span></div></div>
      <div className="login-headline">Kelola penjualan<br/>lebih mudah.</div>
      <p>Satu aplikasi untuk prospek, SPK, dan<br className="desktop-break"/> aktivitas tim.</p>
      <div className="hero-orbit" aria-hidden="true"/>
    </section>
    <section className="login-panel">
      <h1>Selamat Datang</h1>
      <p className="login-subtitle">Masuk menggunakan akun yang diberikan administrator.</p>
      <form onSubmit={submit} className="login-form">
        <label htmlFor="email">Email</label>
        <div className="login-input-wrap"><span aria-hidden="true">✉</span><input id="email" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="nama@email.com"/></div>
        <label htmlFor="password">Password</label>
        <div className="login-input-wrap"><span aria-hidden="true">♙</span><input id="password" type={showPassword?"text":"password"} autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Masukkan password"/><button type="button" className="password-toggle" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Sembunyikan password":"Tampilkan password"}>{showPassword?"Sembunyikan":"Lihat"}</button></div>
        {error && <div className="alert" role="alert">{error}</div>}
        <button className="login-submit" type="submit" disabled={busy}>{busy?"Memproses...":"MASUK"}<span aria-hidden="true">›</span></button>
      </form>
      <p className="forgot-link"><a href="/forgot-password">Lupa Password?</a></p>
      <p className="login-help">Belum punya akun? Hubungi administrator Honda Sales.</p>
    </section>
    <footer className="login-footer">ASISTEN SALES • AKSES KHUSUS TIM PENJUALAN</footer>
  </main>;
}
