"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Users, FileText, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const items = [
  { href: "/", label: "Beranda", Icon: Home },
  { href: "/prospects", label: "Prospek", Icon: Users },
  { href: "/spk", label: "SPK", Icon: FileText },
  { href: "/account", label: "Profil", Icon: UserRound },
];

export default function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(user);
      if (user) {
        const { data } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle();
        if (mounted) setProfile(data);
      }
    }
    loadUser();
    return () => { mounted = false; };
  }, []);

  if (!user) return null;

  return <>
    <header className="app-header">
      <Link href="/" className="app-brand">
        <span className="app-logo">H</span>
        <span><strong>HONDA SALES</strong><small>Sales Report</small></span>
      </Link>
      <div className="header-user">
        <span className="avatar-mini">{(profile?.full_name || user.email || "S").charAt(0).toUpperCase()}</span>
        <span><strong>{profile?.full_name || "Sales"}</strong><small>{profile?.role === "supervisor" ? "Admin / Supervisor" : "Sales"}</small></span>
      </div>
    </header>
    <nav className="bottom-nav" aria-label="Navigasi utama">
      {items.map(({ href, label, Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
        return <Link key={href} href={href} className={active ? "bottom-nav-item active" : "bottom-nav-item"} aria-current={active ? "page" : undefined}>
          <Icon size={21} strokeWidth={active ? 2.5 : 1.8} />
          <span>{label}</span>
        </Link>;
      })}
    </nav>
  </>;
}
