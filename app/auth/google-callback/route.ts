import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const expectedEmail = (process.env.SUPER_ADMIN_EMAIL || "courageeternell@gmail.com").trim().toLowerCase();
  const response = NextResponse.redirect(new URL("/", url.origin));

  if (!code) return NextResponse.redirect(new URL("/login?error=google", url.origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies: { name: string; value: string; options?: any }[]) =>
          cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const redirect = NextResponse.redirect(new URL("/login?error=google", url.origin));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  const { data: { user } } = await supabase.auth.getUser();
  const email = (user?.email || "").trim().toLowerCase();
  if (!user || email !== expectedEmail) {
    await supabase.auth.signOut();
    response.headers.set("location", new URL("/login?error=not-allowed", url.origin).toString());
    return response;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "super_admin" || profile.is_active === false) {
    await supabase.auth.signOut();
    const redirect = NextResponse.redirect(new URL("/login?error=not-allowed", url.origin));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}
