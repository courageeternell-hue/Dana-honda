import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
export default async function Header() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("profiles").select("full_name,role").eq("id",user.id).maybeSingle() : {data:null};
  return <header className="topbar"><div className="topinner">
    <div className="brand"><div className="logo">H</div><div>HONDA SALES REPORT<div className="muted">Sales Team Management</div></div></div>
    {user && <nav className="nav"><Link href="/">Dashboard</Link><Link href="/prospects">Prospek</Link><Link href="/spk">SPK</Link>{profile?.role==="supervisor"&&<Link href="/reports">Laporan</Link>}<Link href="/account">Akun</Link></nav>}
    {user && <div className="muted">{profile?.full_name || user.email} · {profile?.role || "sales"}</div>}
  </div></header>;
}
