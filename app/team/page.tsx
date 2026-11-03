import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SalesAccountForm from "./SalesAccountForm";
import UsersManager from "./UsersManager";

export default async function TeamPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles")
    .select("role,is_active").eq("id", user.id).single();
  if (!["supervisor", "super_admin"].includes(profile?.role || "") || profile?.is_active === false) redirect("/");

  const { data: users, error } = await supabase.from("profiles")
    .select("id,full_name,email,role,is_active,created_at")
    .in("role", ["sales", "supervisor", "super_admin"])
    .order("created_at", { ascending: false });

  const canChangeRole = profile?.role === "super_admin";
  return <>
    <Header />
    <main className="shell">
      <div className="toolbar">
        <div><div className="muted">MANAJEMEN TIM</div><h1>Kelola Pengguna</h1>
          <p className="muted">Kelola akun, status aktif, dan pembagian akses berdasarkan role.</p></div>
        <span className="badge">{users?.length || 0} pengguna</span>
      </div>
      <SalesAccountForm allowSupervisor={canChangeRole} />
      <section style={{ marginTop: 24 }}>
        <h2>Daftar Pengguna</h2>
        {error ? <div className="alert">Gagal memuat pengguna: {error.message}</div>
          : <UsersManager users={(users || []) as any[]} canChangeRole={canChangeRole} />}
      </section>
    </main>
  </>;
}
