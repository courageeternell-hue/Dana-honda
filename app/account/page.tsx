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

  const isAdmin = profile.role === "super_admin";
  const isSupervisor = profile.role === "supervisor";
  const roleLabel = isAdmin ? "Super Admin" : isSupervisor ? "Supervisor" : "Sales";
  const menu = [
    { title: "Dashboard", description: "Ringkasan aktivitas dan performa sesuai hak akses akun.", href: "/", action: "Buka Dashboard", group: "Umum" },
    { title: "Laporan & Export Excel", description: "Filter data dan unduh laporan Prospek maupun SPK.", href: "/reports", action: "Buka Laporan", group: "Sales" },
    { title: "Input Prospek", description: "Catat calon konsumen dan aktivitas follow-up.", href: "/prospects/new", action: "Tambah Prospek", group: "Sales" },
    { title: "Input SPK", description: "Catat transaksi SPK baru.", href: "/spk/new", action: "Tambah SPK", group: "Sales" },
    ...(isSupervisor || isAdmin ? [
      { title: "Dashboard Supervisor", description: "Pantau aktivitas dan performa anggota tim.", href: "/", action: "Buka Dashboard Tim", group: "Manajemen" },
      { title: "Kelola Pengguna", description: "Kelola akun Sales dan pembagian tim sesuai kewenangan.", href: "/team", action: "Kelola Pengguna", group: "Manajemen" },
    ] : []),
    ...(isAdmin ? [
      { title: "Kontrol Super Admin", description: "Kelola struktur role dan akses pengguna seluruh tim.", href: "/team", action: "Buka Kontrol Admin", group: "Manajemen" },
    ] : []),
  ];

  return <>
    <Header />
    <main className="shell">
      <div className="toolbar">
        <div><div className="muted">PENGATURAN AKUN</div><h1>Profil Saya</h1>
          <p className="muted">Semua dashboard dan fitur akun tersedia di sini.</p></div>
        <span className="badge red">{roleLabel}</span>
      </div>
      <section className="card profile-details">
        <div className="profile-avatar large">{(profile.full_name || user.email || "U").trim().charAt(0).toUpperCase()}</div>
        <div><h2>{profile.full_name || "Pengguna"}</h2><p className="muted">{profile.email || user.email || "-"}</p>
          <span className="badge green">Akun aktif · {roleLabel}</span></div>
      </section>
      {["Umum", "Sales", "Manajemen"].map(group => {
        const items = menu.filter(item => item.group === group);
        if (!items.length) return null;
        return <section className="profile-menu-section" key={group}>
          <h2>{group}</h2>
          <div className="profile-menu-grid">
            {items.map((item, index) => <article className="card profile-menu-card" key={item.title + index}>
              <div><h3>{item.title}</h3><p className="muted">{item.description}</p></div>
              <Link className="btn" href={item.href}>{item.action}<span aria-hidden="true"> →</span></Link>
            </article>)}
          </div>
        </section>;
      })}
      <form action="/auth/signout" method="post" className="actions"><button className="btn danger" type="submit">Keluar</button></form>
    </main>
  </>;
}
