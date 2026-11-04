"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = { full_name?: string | null; role?: string | null; is_active?: boolean | null };

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    let profileRequest = 0;

    async function loadProfile(userId: string) {
      const request = ++profileRequest;
      const { data } = await supabase.from("profiles")
        .select("full_name,role,is_active").eq("id", userId).maybeSingle();
      if (mounted && request === profileRequest) setProfile(data);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) void loadProfile(session.user.id);
      else setProfile(null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) void loadProfile(session.user.id);
      else { profileRequest++; setProfile(null); }
    });

    return () => {
      mounted = false;
      profileRequest++;
      listener.subscription.unsubscribe();
    };
  }, []);

  const elevated = profile?.role === "supervisor" || profile?.role === "super_admin";
  const navItems = [
    { href: "/prospects", label: "Prospek" },
    { href: "/spk", label: "SPK" },
    ...(elevated ? [{ href: "/team", label: "Pengguna" }] : []),
  ];

  return <header className="topbar">
    <div className="topinner">
      <Link href="/" className="brand" aria-label="Dana Honda">
        <div className="logo">H</div>
        <div>DANA HONDA<div className="muted">Sales Team Management</div></div>
      </Link>
      {user && <nav className="nav" aria-label="Navigasi utama">
        {navItems.map(item => <Link key={item.href} href={item.href}
          prefetch={true}
          className={pathname === item.href || pathname.startsWith(item.href + "/") ? "active" : ""}>{item.label}</Link>)}
      </nav>}
      {user && <Link href="/account" prefetch={true}
        className={"profile-nav" + (pathname === "/account" ? " active" : "")}
        aria-label="Buka profil dan menu">
        <span className="profile-avatar">{(profile?.full_name || user.email || "U").trim().charAt(0).toUpperCase()}</span>
        <span className="profile-copy"><strong>{profile?.full_name || user.email}</strong><small>{profile?.role === "super_admin" ? "Super Admin" : profile?.role === "supervisor" ? "Supervisor" : "Sales"} · Profil</small></span>
      </Link>}
    </div>
  </header>;
}
