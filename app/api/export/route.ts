import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const s = createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: p } = await s.from("profiles").select("role").eq("id", user.id).single();
  if (p?.role !== "supervisor") return NextResponse.json({ error: "Hanya supervisor" }, { status: 403 });
  const q = req.nextUrl.searchParams;
  const type = q.get("type") || "all";
  const sales = q.get("sales");
  const from = q.get("from");
  const to = q.get("to");
  const wb = XLSX.utils.book_new();

  if (type === "prospects" || type === "all") {
    let query = s.from("prospects").select("*").order("prospect_date");
    if (sales) query = query.eq("user_id", sales);
    if (from) query = query.gte("prospect_date", from);
    if (to) query = query.lte("prospect_date", to);
    const [{ data, error }, { data: profiles }] = await Promise.all([
      query, s.from("profiles").select("id,full_name")
    ]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const names = new Map((profiles || []).map((x:any) => [x.id, x.full_name]));
    const rows = (data || []).map((r:any, i:number) => ({
      "No": i+1, "Tanggal": r.prospect_date, "Nama Konsumen": r.customer_name,
      "No HP konsumen": r.phone, "Sumber Prospek": r.source, "Follow Up": r.follow_up,
      "Lead/Respon Tertarik": r.lead_response, "Deal": r.deal_status,
      "SPK": r.spk_created ? "Ya" : "Tidak", "Keterangan": r.notes,
      "Nama Sales": names.get(r.user_id) || "Tidak diketahui"
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Buku Prospek");
  }

  if (type === "spk" || type === "all") {
    let query = s.from("spk_records").select("*").order("spk_date");
    if (sales) query = query.eq("user_id", sales);
    if (from) query = query.gte("spk_date", from);
    if (to) query = query.lte("spk_date", to);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const rows = (data || []).map((r:any) => ({
      "Tanggal": r.spk_date, "Nama Sales": r.sales_name, "Nama Konsumen": r.customer_name,
      "No Hp konsumen": r.phone, "Alamat Konsumen": r.address, "Sumber SPK": r.source,
      "Type Unit": r.unit_type, "DP / Harga Cash": r.dp_cash, "Leasing": r.leasing,
      "Keterangan": r.notes, "Status SPK": r.status
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Detail SPK");
  }
  if (!wb.SheetNames.length) return NextResponse.json({ error: "Jenis export tidak dikenal" }, { status: 400 });
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buffer, { headers: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="Honda-Sales-Report-${type}-${new Date().toISOString().slice(0,10)}.xlsx"`
  }});
}
