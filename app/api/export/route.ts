import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

function dateParam(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
}
function safeCell(value: unknown) {
  if (typeof value !== "string") return value ?? "";
  const normalized = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ");
  return /^[\s]*[=+@-]/.test(normalized) ? "'" + normalized : normalized;
}
function parseSource(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return { category: "", detail: "", channel: "", full: "" };
  const parts = raw.split(" - ").map((part) => part.trim());
  if (parts[0] === "POS") {
    return { category: "POS", detail: parts[1] || "", channel: "", full: raw };
  }
  if (parts[0] === "Medsos") {
    return {
      category: "Medsos",
      detail: parts[1] || "",
      channel: parts[1] === "TikTok" ? parts[2] || "" : "",
      full: raw,
    };
  }
  // Keep historical/custom source labels visible instead of dropping them.
  return { category: "Lainnya / Data Lama", detail: raw, channel: "", full: raw };
}
function styleSheet(sheet: XLSX.WorkSheet, rows: Record<string, unknown>[]) {
  const keys = rows.length ? Object.keys(rows[0]) : [];
  const sampleRows = rows.slice(0, 200);
  const compactColumns = new Set(["No", "Tanggal Prospek", "Tanggal SPK", "Sudah SPK", "Status", "Status Deal", "Status Prospek", "Status SPK", "Kategori Sumber"]);
  const wideColumns = new Set(["Nama Konsumen", "Nama Sales", "Alamat", "Catatan", "Respon Konsumen", "Sumber Lengkap", "Jadwal Follow-up"]);
  sheet["!cols"] = keys.map((key) => {
    const headerWidth = key.length + 2;
    const contentWidth = sampleRows.reduce((max, row) => {
      const value = row[key];
      const length = value == null ? 0 : String(value).length;
      return Math.max(max, length);
    }, 0);
    const min = compactColumns.has(key) ? 10 : 12;
    const max = wideColumns.has(key) ? 30 : compactColumns.has(key) ? 18 : 24;
    return { wch: Math.min(max, Math.max(min, headerWidth, contentWidth + 2)) };
  });
  if (sheet["!ref"]) sheet["!autofilter"] = { ref: sheet["!ref"] };
  sheet["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
}

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesi login tidak ditemukan." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles")
    .select("role,is_active,full_name").eq("id", user.id).maybeSingle();
  if (!profile || profile.is_active === false) return NextResponse.json({ error: "Akun tidak aktif." }, { status: 403 });

  const elevated = profile.role === "supervisor" || profile.role === "super_admin";
  const params = request.nextUrl.searchParams;
  const type = params.get("type") || "all";
  if (!["prospects", "spk", "all"].includes(type)) return NextResponse.json({ error: "Jenis laporan tidak dikenal." }, { status: 400 });
  const rawFrom = params.get("from");
  const rawTo = params.get("to");
  const from = dateParam(rawFrom);
  const to = dateParam(rawTo);
  if ((rawFrom && !from) || (rawTo && !to)) return NextResponse.json({ error: "Format tanggal tidak valid." }, { status: 400 });
  if (from && to && from > to) return NextResponse.json({ error: "Tanggal mulai tidak boleh melewati tanggal akhir." }, { status: 400 });
  const salesId = params.get("sales") || "";
  const prospectStatus = params.get("prospectStatus") || "";
  const spkStatus = params.get("spkStatus") || "";
  if (salesId && !/^[0-9a-f-]{36}$/i.test(salesId)) return NextResponse.json({ error: "Filter Sales tidak valid." }, { status: 400 });
  if (salesId && elevated) {
    const { data: selectedSales } = await supabase.from("profiles").select("id,role").eq("id", salesId).maybeSingle();
    if (!selectedSales || selectedSales.role !== "sales") return NextResponse.json({ error: "Sales tidak ditemukan dalam cakupan akses Anda." }, { status: 403 });
  }
  if (prospectStatus.length > 60 || spkStatus.length > 60) return NextResponse.json({ error: "Filter status terlalu panjang." }, { status: 400 });
  if (salesId && !elevated && salesId !== user.id) return NextResponse.json({ error: "Tidak boleh mengunduh data sales lain." }, { status: 403 });

  const workbook = XLSX.utils.book_new();
  let totalProspects = 0;
  let totalSpk = 0;

  if (type === "prospects" || type === "all") {
    let query = supabase.from("prospects").select("id,user_id,prospect_date,customer_name,phone,source,unit_interest,status,deal_status,follow_up,lead_response,spk_created,notes").order("prospect_date", { ascending: true });
    if (from) query = query.gte("prospect_date", from);
    if (to) query = query.lte("prospect_date", to);
    if (elevated && salesId) query = query.eq("user_id", salesId);
    if (prospectStatus) query = query.eq("status", prospectStatus);
    const allRows: any[] = [];
    let offset = 0;
    while (true) {
      const { data: batch, error } = await query.range(offset, offset + 999);
      if (error) return NextResponse.json({ error: "Data prospek gagal dibaca." }, { status: 500 });
      allRows.push(...(batch || []));
      if (!batch || batch.length < 1000) break;
      offset += 1000;
    }
    const data = allRows;
    const ids = Array.from(new Set((data || []).map((row) => row.user_id)));
    const { data: people } = await supabase.from("profiles").select("id,full_name").in("id", ids.length ? ids : [user.id]);
    const names = new Map((people || []).map((person) => [person.id, person.full_name]));
    const rows = (data || []).map((row, index) => {
      const source = parseSource(row.source);
      return {
        "No": index + 1, "Tanggal Prospek": row.prospect_date, "Nama Sales": names.get(row.user_id) || "-",
        "Nama Konsumen": row.customer_name, "Nomor HP": row.phone,
        "Kategori Sumber": source.category, "Detail Sumber": source.detail,
        "Jenis TikTok": source.channel, "Sumber Lengkap": source.full,
        "Motor Diminati": row.unit_interest || "", "Status Prospek": row.status,
        "Status Deal": row.deal_status, "Jadwal Follow-up": row.follow_up || "",
        "Respon Konsumen": row.lead_response || "", "Sudah SPK": row.spk_created ? "Ya" : "Belum",
        "Catatan": row.notes || "",
      };
    }).map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, safeCell(value)])));
    totalProspects = rows.length;
    const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ "Informasi": "Tidak ada data pada periode yang dipilih." }]);
    styleSheet(sheet, rows);
    XLSX.utils.book_append_sheet(workbook, sheet, "Laporan Prospek");
  }

  if (type === "spk" || type === "all") {
    let query = supabase.from("spk_records").select("id,user_id,spk_date,customer_name,phone,address,source,unit_type,dp_cash,leasing,status,notes").order("spk_date", { ascending: true });
    if (from) query = query.gte("spk_date", from);
    if (to) query = query.lte("spk_date", to);
    if (elevated && salesId) query = query.eq("user_id", salesId);
    if (spkStatus) query = query.eq("status", spkStatus);
    const allRows: any[] = [];
    let offset = 0;
    while (true) {
      const { data: batch, error } = await query.range(offset, offset + 999);
      if (error) return NextResponse.json({ error: "Data SPK gagal dibaca." }, { status: 500 });
      allRows.push(...(batch || []));
      if (!batch || batch.length < 1000) break;
      offset += 1000;
    }
    const data = allRows;
    const ids = Array.from(new Set((data || []).map((row) => row.user_id)));
    const { data: people } = await supabase.from("profiles").select("id,full_name").in("id", ids.length ? ids : [user.id]);
    const names = new Map((people || []).map((person) => [person.id, person.full_name]));
    const rows = (data || []).map((row, index) => {
      const source = parseSource(row.source);
      return {
        "No": index + 1, "Tanggal SPK": row.spk_date, "Nama Sales": names.get(row.user_id) || "-",
        "Nama Konsumen": row.customer_name, "Nomor HP": row.phone, "Alamat": row.address || "",
        "Kategori Sumber": source.category, "Detail Sumber": source.detail,
        "Jenis TikTok": source.channel, "Sumber Lengkap": source.full,
        "Tipe Motor": row.unit_type, "DP / Harga Cash": row.dp_cash || "",
        "Leasing": row.leasing || "", "Status SPK": row.status, "Catatan": row.notes || "",
      };
    }).map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, safeCell(value)])));
    totalSpk = rows.length;
    const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ "Informasi": "Tidak ada data pada periode yang dipilih." }]);
    styleSheet(sheet, rows);
    XLSX.utils.book_append_sheet(workbook, sheet, "Laporan SPK");
  }

  const summary = [
    { "Jenis Laporan": "Prospek", "Jumlah Data": totalProspects },
    { "Jenis Laporan": "SPK", "Jumlah Data": totalSpk },
    { "Jenis Laporan": "Periode Mulai", "Jumlah Data": from || "Semua tanggal" },
    { "Jenis Laporan": "Periode Akhir", "Jumlah Data": to || "Semua tanggal" },
    { "Jenis Laporan": "Dibuat Oleh", "Jumlah Data": profile.full_name || user.email || "-" },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summary);
  styleSheet(summarySheet, summary);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Ringkasan");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const filename = `Dana-Honda-${type}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
