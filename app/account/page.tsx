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
  const dashboardLabel = isAdmin ? "Dashboard Admin" : isSupervisor ? "Dashboard Supervisor" : "Dashboard Sales";
  const menu = [
    { title: dashboardLabel, description: isAdmin ? "Pantau ringkasan seluruh data dan performa lintas tim." : isSupervisor ? "Pantau ringkasan prospek, SPK, dan performa tim yang Anda awasi." : "Lihat ringkasan aktivitas dan pencapaian pribadi.", href: "/", action: "Buka Dashboard", group: "Dashboard" },
    { title: "Daftar Prospek", description: "Lihat, cari, dan kelola data calon konsumen sesuai hak akses.", href: "/prospects", action: "Buka Prospek", group: "Sales" },
    { title: "Input Prospek", description: "Catat calon konsumen dan aktivitas follow-up.", href: "/prospects/new", action: "Tambah Prospek", group: "Sales" },
    { title: "Daftar SPK", description: "Lihat dan kelola catatan SPK sesuai hak akses.", href: "/spk", action: "Buka SPK", group: "Sales" },
    { title: "Input SPK", description: "Catat transaksi SPK baru.", href: "/spk/new", action: "Tambah SPK", group: "Sales" },
    { title: "Laporan & Export Excel", description: "Filter data dan unduh laporan Prospek, SPK, atau gabungan dalam Excel.", href: "/reports", action: "Buka Laporan", group: "Laporan" },
    ...(isSupervisor || isAdmin ? [
      { title: "Kelola Pengguna", description: isAdmin ? "Kelola akun, role, status, dan pembagian tim seluruh organisasi." : "Kelola dan pantau akun Sales sesuai kewenangan tim.", href: "/team", action: "Kelola Pengguna", group: "Manajemen" },
    ] : []),
  ];

  return <>
    <Header />
    <main className="shell">
      <div className="toolbar">
        <div><div className="muted">PENGATURAN AKUN</div><h1>Profil Saya</h1>
          <p className="muted">Dashboard dan seluruh fitur sesuai role akun tersusun di sini.</p></div>
        <span className="badge red">{roleLabel}</span>
      </div>
      <section className="card profile-details">
        <div className="profile-avatar large">{(profile.full_name || user.email || "U").trim().charAt(0).toUpperCase()}</div>
        <div><h2>{profile.full_name || "Pengguna"}</h2><p className="muted">{profile.email || user.email || "-"}</p>
          <span className="badge green">Akun aktif · {roleLabel}</span></div>
      </section>
      {["Dashboard", "Sales", "Laporan", "Manajemen"].map(group => {
        const items = menu.filter(item => item.group === group);
        if (!items.length) return null;
        return <section className="profile-menu-section" key={group}>
          <h2>{group}</h2>
          <div className="profile-menu-grid">
            {items.map(item => <article className="card profile-menu-card" key={item.title}>
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
