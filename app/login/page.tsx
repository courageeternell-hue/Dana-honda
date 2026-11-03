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
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Email atau password tidak sesuai. Periksa kembali lalu coba lagi.");
    else router.push("/");
    setBusy(false);
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
    <p className="muted" style={{marginTop:18}}>Akun dibuat oleh supervisor. Pendaftaran publik dinonaktifkan.</p>
  </main>;
}
