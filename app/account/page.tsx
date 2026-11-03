import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Account() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles")
    .select("full_name,email,role,is_active,created_at").eq("id", user.id).single();
  if (!profile || profile.is_active === false) redirect("/login");

  const roleLabel = profile.role === "super_admin" ? "Super Admin" : profile.role === "supervisor" ? "Supervisor" : "Sales";
  return <>
    <Header />
    <main className="shell">
      <div className="toolbar"><div><div className="muted">PENGATURAN AKUN</div><h1>Profil Saya</h1>
        <p className="muted">Informasi akun dan pintasan dashboard sesuai hak akses.</p></div><span className="badge red">{roleLabel}</span></div>
      <section className="card">
        <h2>Informasi Pengguna</h2>
        <p><b>Nama:</b> {profile.full_name || "-"}</p>
        <p><b>Email:</b> {profile.email || user.email || "-"}</p>
        <p><b>Role:</b> {roleLabel}</p>
        <p><b>Status:</b> {profile.is_active ? "Aktif" : "Nonaktif"}</p>
      </section>
      <section style={{marginTop:22}}>
        <h2>Dashboard dan Menu</h2>
        <div className="grid">
          <article className="card"><h3>Dashboard Saya</h3><p className="muted">Ringkasan pekerjaan sesuai akun.</p><Link className="btn primary" href="/">Buka Dashboard</Link></article>
          {profile.role !== "sales" && <article className="card"><h3>Dashboard Supervisor</h3><p className="muted">Pantau tim, prospek, SPK, dan laporan.</p><Link className="btn" href="/team">Kelola Pengguna</Link></article>}
          {profile.role === "super_admin" && <article className="card"><h3>Kontrol Super Admin</h3><p className="muted">Kelola role dan akses seluruh pengguna.</p><Link className="btn" href="/team">Buka Manajemen Pengguna</Link></article>}
        </div>
      </section>
      <form action="/auth/signout" method="post" className="actions"><button className="btn danger" type="submit">Keluar</button></form>
    </main>
  </>;
}
