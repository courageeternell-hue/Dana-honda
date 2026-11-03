import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const sessionClient = createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan login kembali." }, { status: 401 });

  const { data: supervisor } = await sessionClient
    .from("profiles")
    .select("role,is_active")
    .eq("id", user.id)
    .single();

  if (supervisor?.role !== "supervisor" || supervisor?.is_active === false) {
    return NextResponse.json({ error: "Hanya supervisor aktif yang boleh membuat akun sales." }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Konfigurasi server belum lengkap. Supervisor perlu mengatur SUPABASE_SERVICE_ROLE_KEY di Vercel." }, { status: 500 });
  }

  let body: { full_name?: string; email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Data formulir tidak valid." }, { status: 400 });
  }

  const fullName = String(body.full_name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (fullName.length < 2 || fullName.length > 80) {
    return NextResponse.json({ error: "Nama sales harus 2–80 karakter." }, { status: 400 });
  }
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Format email tidak valid." }, { status: 400 });
  }
  if (password.length < 8 || password.length > 72) {
    return NextResponse.json({ error: "Password awal harus 8–72 karakter." }, { status: 400 });
  }

  const admin = createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  });

  if (createError || !created.user) {
    const message = createError?.message || "Akun sales gagal dibuat.";
    const status = /already|registered|exists/i.test(message) ? 409 : 400;
    return NextResponse.json({ error: status === 409 ? "Email tersebut sudah terdaftar." : message }, { status });
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: created.user.id,
    full_name: fullName,
    email,
    role: "sales",
    is_active: true
  }, { onConflict: "id" });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: "Akun Auth dibuat tetapi profil gagal disimpan. Proses dibatalkan dan akun dibersihkan." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    sales: { id: created.user.id, full_name: fullName, email, role: "sales", is_active: true }
  }, { status: 201 });
}
