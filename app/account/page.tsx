import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import { LayoutDashboard, FileSpreadsheet, Settings, LogOut, ChevronRight, ShieldCheck, UserRound } from "lucide-react";

export default async function Account() {
  const s = createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await s.from("profiles").select("*").eq("id", user.id).single();
  const isSupervisor = profile?.role === "supervisor";

  return <><Header /><main className="shell profile-page">
    <div className="page-heading"><p className="eyebrow">AKUN SAYA</p><h1>Profil</h1><p className="muted">Kelola akun dan akses aplikasi Anda.</p></div>
    <section className="profile-card">
      <div className="profile-avatar"><UserRound size={30}/></div>
      <div className="profile-info"><h2>{profile?.full_name || "Pengguna Honda"}</h2><p>{user.email}</p><span className={isSupervisor ? "role-chip supervisor" : "role-chip"}>{isSupervisor ? "ADMIN / SUPERVISOR" : "SALES"}</span></div>
    </section>

    <p className="section-label">MENU AKUN</p>
    <section className="menu-card">
      {isSupervisor && <Link href="/reports" className="profile-menu-link">
        <span className="menu-icon purple"><LayoutDashboard size={20}/></span><span className="menu-copy"><strong>Dasbor Admin & Supervisor</strong><small>Kelola laporan dan pantau performa tim</small></span><ChevronRight size={19} className="menu-chevron"/>
      </Link>}
      {isSupervisor && <Link href="/reports" className="profile-menu-link">
        <span className="menu-icon lilac"><FileSpreadsheet size={20}/></span><span className="menu-copy"><strong>Laporan Penjualan</strong><small>Unduh rekap prospek dan SPK</small></span><ChevronRight size={19} className="menu-chevron"/>
      </Link>}
      <div className="profile-menu-link static">
        <span className="menu-icon soft"><ShieldCheck size={20}/></span><span className="menu-copy"><strong>Hak Akses</strong><small>{isSupervisor ? "Akses seluruh data tim" : "Akses data milik sendiri"}</small></span>
      </div>
      <div className="profile-menu-link static">
        <span className="menu-icon soft"><Settings size={20}/></span><span className="menu-copy"><strong>Pengaturan Akun</strong><small>Informasi akun yang sedang digunakan</small></span>
      </div>
    </section>
    <form action="/auth/signout" method="post" className="logout-form"><button className="logout-button"><LogOut size={18}/> Keluar dari akun</button></form>
    <p className="profile-footnote">Honda Sales Report · Akses menu disesuaikan dengan role akun.</p>
  </main></>;
}
