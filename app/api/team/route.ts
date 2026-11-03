import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function getContext() {
  const session = createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Silakan login kembali." }, { status: 401 }) };
  const { data: actor } = await session.from("profiles").select("role,is_active").eq("id", user.id).single();
  if (!actor || actor.is_active === false || !["supervisor", "super_admin"].includes(actor.role)) {
    return { error: NextResponse.json({ error: "Akses hanya untuk supervisor aktif." }, { status: 403 }) };
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { error: NextResponse.json({ error: "Konfigurasi server belum lengkap. Periksa SUPABASE_SERVICE_ROLE_KEY." }, { status: 500 }) };
  const admin = createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  return { user, actor, admin };
}

export async function POST(request: NextRequest) {
  const ctx = await getContext();
  if ("error" in ctx) return ctx.error;
  let body: { full_name?: string; email?: string; password?: string; role?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Data formulir tidak valid." }, { status: 400 }); }

  const fullName = String(body.full_name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const role = String(body.role || "sales");
  if (fullName.length < 2 || fullName.length > 80) return NextResponse.json({ error: "Nama harus 2–80 karakter." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return NextResponse.json({ error: "Format email tidak valid." }, { status: 400 });
  if (password.length < 8 || password.length > 72) return NextResponse.json({ error: "Password awal harus 8–72 karakter." }, { status: 400 });
  if (!["sales", "supervisor"].includes(role)) return NextResponse.json({ error: "Role tidak valid." }, { status: 400 });
  if (role === "supervisor" && ctx.actor.role !== "super_admin") return NextResponse.json({ error: "Hanya Super Admin yang dapat membuat Supervisor." }, { status: 403 });

  const { data: created, error: createError } = await ctx.admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: fullName }
  });
  if (createError || !created.user) {
    const message = createError?.message || "Akun gagal dibuat.";
    const status = /already|registered|exists/i.test(message) ? 409 : 400;
    return NextResponse.json({ error: status === 409 ? "Email tersebut sudah terdaftar." : message }, { status });
  }
  const { error: profileError } = await ctx.admin.from("profiles").upsert({
    id: created.user.id, full_name: fullName, email, role, is_active: true
  }, { onConflict: "id" });
  if (profileError) {
    await ctx.admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: "Profil gagal disimpan. Pembuatan akun dibatalkan." }, { status: 500 });
  }
  await ctx.admin.from("activity_logs").insert({
    table_name: "profiles", record_id: created.user.id, actor_id: ctx.user.id,
    action: "create_user", new_data: { full_name: fullName, email, role }
  });
  return NextResponse.json({ ok: true, user: { id: created.user.id, full_name: fullName, email, role, is_active: true } }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const ctx = await getContext();
  if ("error" in ctx) return ctx.error;
  let body: { id?: string; role?: string; is_active?: boolean; full_name?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Data perubahan tidak valid." }, { status: 400 }); }
  const id = String(body.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "ID pengguna tidak valid." }, { status: 400 });
  if (id === ctx.user.id) return NextResponse.json({ error: "Perubahan role atau status akun sendiri tidak diizinkan." }, { status: 400 });

  const { data: target } = await ctx.admin.from("profiles").select("id,role,is_active,full_name,email").eq("id", id).maybeSingle();
  if (!target) return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
  if (target.role === "super_admin") return NextResponse.json({ error: "Akun Super Admin utama dilindungi." }, { status: 403 });

  const changes: Record<string, unknown> = {};
  if (body.role !== undefined) {
    if (ctx.actor.role !== "super_admin") return NextResponse.json({ error: "Hanya Super Admin yang dapat mengubah role." }, { status: 403 });
    if (!["sales", "supervisor"].includes(body.role)) return NextResponse.json({ error: "Role tujuan tidak valid." }, { status: 400 });
    changes.role = body.role;
  }
  if (body.is_active !== undefined) {
    if (typeof body.is_active !== "boolean") return NextResponse.json({ error: "Status akun tidak valid." }, { status: 400 });
    if (ctx.actor.role !== "super_admin" && target.role !== "sales") return NextResponse.json({ error: "Supervisor hanya dapat mengelola status akun Sales." }, { status: 403 });
    changes.is_active = body.is_active;
  }
  if (body.full_name !== undefined) {
    const name = String(body.full_name).trim();
    if (name.length < 2 || name.length > 80) return NextResponse.json({ error: "Nama harus 2–80 karakter." }, { status: 400 });
    changes.full_name = name;
  }
  if (!Object.keys(changes).length) return NextResponse.json({ error: "Tidak ada perubahan yang dikirim." }, { status: 400 });

  const { data: updated, error } = await ctx.admin.from("profiles").update(changes).eq("id", id).select("id,full_name,email,role,is_active").single();
  if (error) return NextResponse.json({ error: "Perubahan gagal disimpan." }, { status: 500 });
  await ctx.admin.from("activity_logs").insert({
    table_name: "profiles", record_id: id, actor_id: ctx.user.id,
    action: "update_user", old_data: target, new_data: updated
  });
  return NextResponse.json({ ok: true, user: updated });
}
