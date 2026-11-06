import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

const instructions = `Kamu adalah Asisten AI di aplikasi Asisten Sales Honda. Berbicaralah dalam Bahasa Indonesia yang alami, ramah, jelas, dan tidak bertele-tele. Kamu adalah asisten serbaguna seperti chatbot AI umum: jawab pertanyaan umum, bantu berpikir, menjelaskan konsep, menyusun tulisan, dan berdiskusi. Kamu juga memahami konteks pekerjaan sales sepeda motor Honda sehingga dapat membantu membuat caption, materi promosi, menjawab pertanyaan produk secara hati-hati, menyusun strategi pelayanan, dan membuat pesan tindak lanjut yang sopan. Jangan mengarang harga, promo, spesifikasi, stok, tenor, atau kebijakan dealer; minta data terbaru bila diperlukan. Jangan meminta atau mengungkap password, token, atau data pribadi konsumen yang tidak diperlukan. Jika tidak yakin, katakan dengan jujur.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Method tidak diizinkan." }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return reply({ error: "Sesi login tidak ditemukan." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!supabaseUrl || !anonKey) return reply({ error: "Konfigurasi autentikasi server belum lengkap." }, 500);
    if (!openAiKey) return reply({ error: "Asisten AI belum diaktifkan. Admin perlu menambahkan OPENAI_API_KEY di Supabase Secrets." }, 503);

    const token = authHeader.slice(7);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData.user) return reply({ error: "Sesi login tidak valid. Silakan login ulang." }, 401);

    const { data: profile, error: profileError } = await userClient
      .from("profiles").select("is_active").eq("id", authData.user.id).maybeSingle();
    if (profileError || !profile?.is_active) return reply({ error: "Akun tidak aktif atau tidak memiliki akses." }, 403);

    const body = await req.json().catch(() => null);
    const messages = body?.messages;
    if (!Array.isArray(messages) || messages.length < 1 || messages.length > 12) {
      return reply({ error: "Format percakapan tidak valid." }, 400);
    }

    const safeMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
    for (const item of messages) {
      if (!item || !["user", "assistant"].includes(item.role) || typeof item.content !== "string") {
        return reply({ error: "Format pesan tidak valid." }, 400);
      }
      const content = item.content.trim();
      if (!content || content.length > 4000) return reply({ error: "Pesan kosong atau terlalu panjang." }, 400);
      safeMessages.push({ role: item.role, content });
    }
    if (safeMessages[safeMessages.length - 1].role !== "user") {
      return reply({ error: "Pesan terakhir harus berasal dari pengguna." }, 400);
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openAiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini",
        instructions,
        input: safeMessages,
        max_output_tokens: 700,
        store: false,
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("OpenAI request failed", response.status, result?.error?.type || "unknown");
      return reply({ error: response.status === 429 ? "Batas penggunaan AI sedang tercapai. Coba beberapa saat lagi." : "Layanan AI sedang bermasalah. Coba lagi nanti." }, response.status === 429 ? 429 : 502);
    }
    const output = Array.isArray(result.output) ? result.output : [];
    const answer = output.flatMap((item: any) => Array.isArray(item.content) ? item.content : [])
      .filter((part: any) => part.type === "output_text" && typeof part.text === "string")
      .map((part: any) => part.text).join("\n").trim();
    if (!answer) return reply({ error: "AI belum menghasilkan jawaban. Coba kirim ulang." }, 502);
    return reply({ reply: answer });
  } catch (error) {
    console.error("ai-chat unexpected error", error);
    return reply({ error: "Terjadi kesalahan saat memproses pesan." }, 500);
  }
});
