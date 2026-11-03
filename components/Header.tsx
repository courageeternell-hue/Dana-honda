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
          .select("full_name, role").eq("id", user.id).maybeSingle();
        if (mounted) setProfile(data);
      }
    }
    loadUser();
    return () => { mounted = false; };
  }, []);

  const navItems = [
    { href: "/", label: "Dashboard" },
    { href: "/prospects", label: "Prospek" },
    { href: "/spk", label: "SPK" },
    ...(profile?.role === "supervisor"
      ? [{ href: "/reports", label: "Laporan" }, { href: "/team", label: "Kelola Sales" }]
      : []),
    { href: "/account", label: "Akun" }
  ];

  return (
    <header className="topbar">
      <div className="topinner">
        <Link href="/" className="brand" aria-label="Honda Sales Report - Dashboard">
          <div className="logo">H</div>
          <div>HONDA SALES REPORT<div className="muted">Sales Team Management</div></div>
        </Link>
        {user && <nav className="nav" aria-label="Navigasi utama">
          {navItems.map(item => (
            <Link key={item.href} href={item.href}
              className={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/")) ? "active" : ""}>
              {item.label}
            </Link>
          ))}
        </nav>}
        {user && <div className="muted" style={{whiteSpace:"nowrap"}}>
          {profile?.full_name || user.email} · {profile?.role || "sales"}
        </div>}
      </div>
    </header>
  );
}
