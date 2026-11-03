"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SalesAccountForm({ allowSupervisor = false }: { allowSupervisor?: boolean }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("sales");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      const response = await fetch("/api/team", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, email, password, role }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Akun gagal dibuat.");
      setSuccess("Akun berhasil dibuat. Sampaikan email dan password awal secara pribadi.");
      setFullName(""); setEmail(""); setPassword(""); setRole("sales");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tidak dapat terhubung ke server.");
    } finally { setBusy(false); }
  }

  return <section className="card">
    <h2>Tambah Pengguna</h2>
    <p className="muted">Akun dibuat langsung di Supabase Auth dan profil aplikasi.</p>
    <form onSubmit={submit}>
      <div className="formgrid">
        <label>Nama lengkap<input value={fullName} onChange={e => setFullName(e.target.value)} required minLength={2} maxLength={80} placeholder="Nama pengguna" /></label>
        <label>Email login<input type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} placeholder="nama@email.com" /></label>
        <label>Password awal<input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} maxLength={72} autoComplete="new-password" placeholder="Minimal 8 karakter" /></label>
        <label>Role akun<select value={role} onChange={e => setRole(e.target.value)}>
          <option value="sales">Sales</option>
          {allowSupervisor && <option value="supervisor">Supervisor</option>}
        </select></label>
      </div>
      {error && <div className="alert" role="alert">{error}</div>}
      {success && <div className="alert success" role="status">{success}</div>}
      <div className="actions"><button className="btn primary" disabled={busy}>{busy ? "Membuat akun..." : "Buat Pengguna"}</button></div>
    </form>
  </section>;
}
