"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");

    try {
      const supabase = createClient();
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (authError) {
        const code = (authError as { code?: string }).code;
        if (code === "email_not_confirmed") {
          setError("Email akun belum dikonfirmasi. Hubungi supervisor untuk bantuan.");
        } else if (code === "invalid_credentials" || /invalid login credentials/i.test(authError.message)) {
          setError("Email atau password salah. Pastikan memakai akun yang dibuat supervisor dan password yang benar.");
        } else if (/network|fetch/i.test(authError.message)) {
          setError("Koneksi ke server bermasalah. Periksa internet lalu coba lagi.");
        } else {
          setError("Login belum berhasil. Coba lagi beberapa saat atau hubungi supervisor.");
        }
        return;
      }

      if (!data.user) {
        setError("Sesi login belum terbentuk. Silakan coba lagi.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        await supabase.auth.signOut();
        setError("Profil akun tidak dapat diverifikasi. Hubungi supervisor.");
        return;
      }

      if (!profile || profile.is_active === false) {
        await supabase.auth.signOut();
        setError("Akun belum aktif atau belum terdaftar di sistem. Hubungi supervisor.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="login card">
    <div className="brand"><div className="logo">H</div><div>HONDA SALES REPORT<div className="muted">Sales Team Management</div></div></div>
    <h1>Selamat datang</h1>
    <p className="muted">Masuk untuk melanjutkan pengelolaan prospek dan SPK tim Honda.</p>
    <form onSubmit={submit}>
      <div className="formgrid">
        <label>Email<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="nama@email.com" /></label>
        <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Masukkan password" /></label>
      </div>
      {error && <div className="alert" role="alert">{error}</div>}
      <div className="actions"><button className="btn primary" disabled={busy}>{busy ? "Memproses..." : "Masuk ke Dashboard"}</button></div>
    </form>
    <p className="muted" style={{marginTop:14}}><a href="/forgot-password">Lupa password?</a></p>\n    <p className="muted" style={{marginTop:8}}>Akun dibuat oleh supervisor. Pendaftaran publik dinonaktifkan.</p>
  </main>;
}
