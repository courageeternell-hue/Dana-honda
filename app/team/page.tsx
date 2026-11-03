import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SalesAccountForm from "./SalesAccountForm";

export default async function TeamPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,is_active")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "supervisor" || profile?.is_active === false) redirect("/");

  const { data: sales, error } = await supabase
    .from("profiles")
    .select("id,full_name,email,is_active,created_at")
    .eq("role", "sales")
    .order("created_at", { ascending: false });

  return (
    <>
      <Header />
      <main className="shell">
        <div className="toolbar">
          <div>
            <h1>Kelola Akun Sales</h1>
            <p className="muted">Supervisor dapat membuat akun login untuk anggota tim sales.</p>
          </div>
          <span className="badge">{sales?.length || 0} akun sales</span>
        </div>
        <SalesAccountForm />
        <section style={{ marginTop: 22 }}>
          <h2>Daftar Akun Sales</h2>
          {error ? <div className="alert">Gagal memuat daftar akun: {error.message}</div> : (
            <div className="tablewrap">
              <table>
                <thead><tr><th>Nama Sales</th><th>Email Login</th><th>Status</th><th>Dibuat</th></tr></thead>
                <tbody>
                  {(sales || []).map((salesAccount) => (
                    <tr key={salesAccount.id}>
                      <td>{salesAccount.full_name || "-"}</td>
                      <td>{salesAccount.email || "-"}</td>
                      <td><span className={salesAccount.is_active === false ? "badge red" : "badge green"}>{salesAccount.is_active === false ? "Nonaktif" : "Aktif"}</span></td>
                      <td>{salesAccount.created_at ? new Date(salesAccount.created_at).toLocaleDateString("id-ID") : "-"}</td>
                    </tr>
                  ))}
                  {!sales?.length && <tr><td colSpan={4}>Belum ada akun sales.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
