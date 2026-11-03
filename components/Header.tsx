"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(user);
      if (user) {
        const { data } = await supabase.from("profiles")
          .select("full_name,role,is_active").eq("id", user.id).maybeSingle();
        if (mounted) setProfile(data);
      }
    }
    loadUser();
    const { data: listener } = supabase.auth.onAuthStateChange(() => { loadUser(); });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  const elevated = profile?.role === "supervisor" || profile?.role === "super_admin";
  const navItems = [
    { href: "/", label: "Dashboard" },
    { href: "/prospects", label: "Prospek" },
    { href: "/spk", label: "SPK" },
    ...(elevated ? [{ href: "/reports", label: "Laporan" }, { href: "/team", label: "Kelola Pengguna" }] : []),
    { href: "/account", label: "Profil" },
  ];

  return <header className="topbar">
    <div className="topinner">
      <Link href="/" className="brand" aria-label="Dana Honda - Dashboard">
        <div className="logo">H</div>
        <div>DANA HONDA<div className="muted">Sales Team Management</div></div>
      </Link>
      {user && <nav className="nav" aria-label="Navigasi utama">
        {navItems.map(item => <Link key={item.href} href={item.href}
          className={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/")) ? "active" : ""}>{item.label}</Link>)}
      </nav>}
      {user && <div className="muted" style={{whiteSpace:"nowrap"}}>{profile?.full_name || user.email} · {profile?.role || "sales"}</div>}
    </div>
  </header>;
}
