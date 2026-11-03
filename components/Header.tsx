"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Header() {
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
        const { data } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .maybeSingle();

        if (mounted) setProfile(data);
      }
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <header className="topbar">
      <div className="topinner">
        <div className="brand">
          <div className="logo">H</div>
          <div>
            HONDA SALES REPORT
            <div className="muted">Sales Team Management</div>
          </div>
        </div>

        {user && (
          <nav className="nav">
            <Link href="/">Dashboard</Link>
            <Link href="/prospects">Prospek</Link>
            <Link href="/spk">SPK</Link>
            {profile?.role === "supervisor" && (
              <>
                <Link href="/reports">Laporan</Link>
                <Link href="/team">Kelola Sales</Link>
              </>
            )}
            <Link href="/account">Akun</Link>
          </nav>
        )}

        {user && (
          <div className="muted">
            {profile?.full_name || user.email} · {profile?.role || "sales"}
          </div>
        )}
      </div>
    </header>
  );
}
