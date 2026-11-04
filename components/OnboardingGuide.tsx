"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Role = "sales" | "supervisor" | "super_admin";
type Step = { title: string; description: string; href?: string; action?: string };

export default function OnboardingGuide({ userId, role }: { userId: string; role: Role }) {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [ready, setReady] = useState(false);

  const steps = useMemo<Step[]>(() => {
    const common: Step[] = [
      { title: "Dashboard", description: "Ini halaman utama untuk melihat ringkasan prospek dan SPK sesuai hak akses akun. Angka yang tampil berasal dari database, bukan data contoh.", href: "/" },
      { title: "Input Prospek", description: "Catat calon konsumen segera setelah ada calon pembeli. Isi nama, nomor HP, tanggal, motor diminati, status, jadwal follow-up, dan catatan. Pilih sumber POS atau Medsos, lalu pilih rinciannya. Jika memilih TikTok, tentukan Live TikTok atau Video TikTok.", href: "/prospects/new" },
      { title: "Daftar Prospek", description: "Gunakan menu Prospek untuk mencari, melihat detail, dan memperbarui perkembangan calon konsumen. Perbarui status dan jadwal follow-up agar catatan tetap akurat.", href: "/prospects" },
      { title: "Input dan Daftar SPK", description: "Input SPK saat transaksi sudah masuk tahap SPK. Isi data konsumen, unit, tanggal, sumber, DP/cash, leasing, status, dan catatan. Periksa kembali data sebelum menyimpan.", href: "/spk/new" },
      { title: "Laporan Excel", description: "Unduh laporan Prospek, SPK, atau gabungan. Atur filter tanggal dan status sebelum mengunduh. Sales hanya dapat mengunduh data miliknya sendiri.", href: "/reports" },
      { title: "Profil dan keamanan akun", description: "Gunakan menu Profil untuk memeriksa informasi akun. Jangan membagikan password dan selalu keluar dari akun jika memakai perangkat bersama.", href: "/account" },
    ];
    const supervisor: Step[] = [
      { title: "Kelola Pengguna", description: "Supervisor dapat mengelola akun Sales yang berada dalam timnya. Pantau daftar pengguna dan aktivitas tim. Supervisor tidak dapat mengubah role pengguna.", href: "/team" },
      { title: "Pantau laporan tim", description: "Laporan dan ringkasan Supervisor hanya mencakup Sales yang ditugaskan ke timnya. Pastikan filter Sales dan tanggal sesuai saat mengunduh Excel.", href: "/reports" },
    ];
    const admin: Step[] = [
      { title: "Administrasi tim", description: "Super Admin dapat membuat akun Sales dan Supervisor, menetapkan Sales ke Supervisor aktif, serta mengelola role sesuai kewenangan. Pastikan penempatan tim benar.", href: "/team" },
      { title: "Laporan seluruh tim", description: "Gunakan filter laporan untuk melihat seluruh data atau memilih Sales tertentu. File Excel mengikuti filter dan cakupan akses Super Admin.", href: "/reports" },
    ];
    return role === "super_admin" ? [...common, ...admin] : role === "supervisor" ? [...common, ...supervisor] : common;
  }, [role]);

  const storageKey = `dana-honda-guide-v1:${userId}`;

  useEffect(() => {
    try {
      setOpen(localStorage.getItem(storageKey) !== "done");
    } catch {
      setOpen(true);
    }
    setReady(true);
  }, [storageKey]);

  function finish() {
    try { localStorage.setItem(storageKey, "done"); } catch {}
    setOpen(false);
    setStepIndex(0);
  }

  if (!ready) return null;
  const current = steps[stepIndex];

  return <>
    <div style={{ display: "flex", justifyContent: "flex-end", margin: "0 0 12px" }}>
      <button type="button" className="btn" onClick={() => { setStepIndex(0); setOpen(true); }}>Buka Panduan Penggunaan</button>
    </div>
    {open && <div role="dialog" aria-modal="true" aria-labelledby="guide-title" onKeyDown={e => { if (e.key === "Escape") finish(); }}
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(17,24,39,.62)", display: "grid", placeItems: "center", padding: 16 }}>
      <section className="card" style={{ width: "min(560px, 100%)", maxHeight: "90vh", overflowY: "auto", padding: 24, boxShadow: "0 24px 80px rgba(0,0,0,.25)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span className="badge red">PANDUAN PENGGUNAAN</span>
          <span className="muted">Langkah {stepIndex + 1} dari {steps.length}</span>
        </div>
        <div style={{ height: 6, borderRadius: 99, background: "#f0f1f4", overflow: "hidden", margin: "16px 0 22px" }}>
          <div style={{ height: "100%", width: `${((stepIndex + 1) / steps.length) * 100}%`, background: "var(--red)", transition: "width .2s" }} />
        </div>
        <h2 id="guide-title" style={{ fontSize: 23, marginBottom: 10 }}>{current.title}</h2>
        <p style={{ color: "#566174", lineHeight: 1.8, minHeight: 100 }}>{current.description}</p>
        {current.href && <div style={{ margin: "16px 0" }}><Link className="btn" href={current.href} onClick={finish}>Buka halaman ini</Link></div>}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
          <button type="button" className="btn" onClick={finish}>Lewati panduan</button>
          <div className="actions" style={{ marginTop: 0 }}>
            <button type="button" className="btn" disabled={stepIndex === 0} onClick={() => setStepIndex(i => Math.max(0, i - 1))}>Kembali</button>
            {stepIndex < steps.length - 1
              ? <button type="button" className="btn primary" onClick={() => setStepIndex(i => Math.min(steps.length - 1, i + 1))}>Berikutnya</button>
              : <button type="button" className="btn primary" onClick={finish}>Selesai</button>}
          </div>
        </div>
      </section>
    </div>}
  </>;
}
