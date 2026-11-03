"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SalesAccountForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, email, password })
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Akun gagal dibuat.");
        return;
      }
      setSuccess("Akun sales berhasil dibuat. Berikan email dan password awal kepada sales tersebut secara pribadi.");
      setFullName("");
      setEmail("");
      setPassword("");
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2>Buat Akun Sales Baru</h2>
      <p className="muted">Akun langsung aktif dengan role Sales. Role Supervisor tidak bisa dipilih dari formulir ini.</p>
      <form onSubmit={submit}>
        <div className="formgrid">
          <label>Nama lengkap<input value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} maxLength={80} placeholder="Nama sales" /></label>
          <label>Email login<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} placeholder="sales@email.com" /></label>
          <label>Password awal<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={72} autoComplete="new-password" placeholder="Minimal 8 karakter" /></label>
        </div>
        {error && <div className="alert">{error}</div>}
        {success && <div className="alert success">{success}</div>}
        <div className="actions"><button className="btn primary" disabled={busy}>{busy ? "Membuat akun..." : "Buat Akun Sales"}</button></div>
      </form>
    </section>
  );
}
