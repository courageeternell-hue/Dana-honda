"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const [queryError, setQueryError] = useState("");
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("error");
    if (value === "not-allowed") setQueryError("Akun Google ini bukan Super Admin yang diizinkan.");
    else if (value) setQueryError("Proses login Google tidak berhasil. Coba lagi.");
  }, []);

  async function googleLogin() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/auth/google-callback" },
      });
      if (error) throw error;
    } catch {
      setError("Login Google belum dapat dimulai. Periksa konfigurasi Google Provider di Supabase.");
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), password,
      });
      if (authError) {
        setError(/invalid login credentials/i.test(authError.message)
          ? "Email atau password salah."
          : "Login belum berhasil. Periksa data akun atau hubungi Super Admin.");
        return;
      }
      if (!data.user) { setError("Sesi login belum terbentuk. Coba lagi."); return; }
      const { data: profile, error: profileError } = await supabase.from("profiles")
        .select("role,is_active").eq("id", data.user.id).maybeSingle();
      if (profileError || !profile || profile.is_active === false) {
        await supabase.auth.signOut();
        setError("Email ini belum terdaftar atau akun sedang nonaktif. Hubungi Super Admin.");
        return;
      }
      router.replace("/"); router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi internet.");
    } finally { setBusy(false); }
  }

  return <main className="login card">
    <div className="brand"><div className="logo">H</div><div>HONDA SALES REPORT<div className="muted">Sales Team Management</div></div></div>
    <h1>Selamat datang</h1>
    <p className="muted">Sales dan Supervisor masuk dengan akun yang didaftarkan. Google hanya untuk Super Admin utama.</p>
    {queryError && <div className="alert" role="alert">{queryError}</div>}
    <button type="button" className="btn" style={{width:"100%",marginBottom:18}} disabled={busy} onClick={googleLogin}>
      {busy ? "Menghubungkan..." : "Lanjutkan dengan Google · Super Admin"}
    </button>
    <div className="muted" style={{textAlign:"center",marginBottom:18}}>— atau login Sales / Supervisor —</div>
    <form onSubmit={submit}>
      <div className="formgrid">
        <label>Email<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="nama@email.com" /></label>
        <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Masukkan password" /></label>
      </div>
      {error && <div className="alert" role="alert">{error}</div>}
      <div className="actions"><button className="btn primary" disabled={busy}>{busy ? "Memproses..." : "Masuk ke Dashboard"}</button></div>
    </form>
    <p className="muted" style={{marginTop:14}}><a href="/forgot-password">Lupa password?</a></p>
    <p className="muted" style={{marginTop:8}}>Akun hanya dapat dibuat oleh pengelola yang berwenang.</p>
  </main>;
}
