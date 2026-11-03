# HONDA SALES REPORT

Starter aplikasi web responsif untuk tim 5 sales + supervisor. Dibuat dengan Next.js, Supabase, dan Vercel.

## Fitur dalam source ini
- Login email/password.
- Role `sales` dan `supervisor`.
- RLS untuk membatasi data prospek/SPK berdasarkan `user_id`.
- Input prospek dan SPK.
- Konversi prospek menjadi SPK.
- Export Excel untuk supervisor.
- Endpoint laporan terjadwal dan konfigurasi Vercel Cron.
- Tampilan merah-putih mobile-first dan PWA manifest.

> Penting: ini adalah source awal yang perlu dikonfigurasi dan dites sebelum dipakai dengan data konsumen sungguhan. Audit log otomatis untuk setiap edit, edit form, pengelolaan akun supervisor, dan penyimpanan arsip membutuhkan penyelesaian lanjutan. Jangan menganggap semua fitur produksi sudah selesai hanya karena build berhasil.

## 1. Buat project Supabase
1. Buat project di https://supabase.com
2. Buka SQL Editor dan jalankan seluruh `supabase/schema.sql`.
3. Buka Project Settings > API. Salin Project URL dan anon/public key.
4. Buat Storage bucket bernama `daily-reports`, set **Private**.
5. Di Authentication > Users, buat akun untuk 5 sales dan 1 supervisor (invite atau set password dengan aman).
6. Setelah akun dibuat, buat profile untuk tiap user lewat SQL Editor:

```sql
insert into public.profiles (id, full_name, role)
values
('UUID-SALES-1','Nama Sales 1','sales'),
('UUID-SALES-2','Nama Sales 2','sales'),
('UUID-SALES-3','Nama Sales 3','sales'),
('UUID-SALES-4','Nama Sales 4','sales'),
('UUID-SALES-5','Nama Sales 5','sales'),
('UUID-SUPERVISOR','Nama Supervisor','supervisor');
```

Ganti UUID dengan User UID dari Authentication > Users. Jangan membagikan akun supervisor.

## 2. Jalankan lokal
```bash
npm install
cp .env.example .env.local
```
Isi `.env.local` dengan:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (khusus server, jangan pernah beri awalan NEXT_PUBLIC)
- `CRON_SECRET` (token acak panjang)

Kemudian:
```bash
npm run dev
```
Buka http://localhost:3000

## 3. Deploy ke Vercel
1. Upload folder project ini ke GitHub.
2. Di Vercel pilih Add New > Project, import repository.
3. Tambahkan Environment Variables sesuai `.env.local`.
4. Deploy.
5. Pastikan project plan Vercel mendukung Cron Jobs yang digunakan. Cron schedule `0 10 * * *` adalah pukul 17.00 WIB (UTC+7).
6. Uji endpoint cron dari server dengan header `Authorization: Bearer <CRON_SECRET>`. Jangan bagikan token ke sales.

## 4. Keamanan data
- RLS SQL adalah lapisan wajib. Jangan menonaktifkan RLS.
- `anon key` boleh dipakai di browser dengan RLS aktif.
- `service_role` hanya boleh di environment server.
- Uji menggunakan dua akun sales berbeda: akun A tidak boleh membaca data akun B.
- Supervisor harus dapat melihat seluruh data.
- Buat backup database dan uji restore.

## 5. Catatan pengembangan sebelum produksi
Versi ini menyediakan kerangka kerja awal. Sebelum operasional, lengkapi:
- Halaman edit prospek/SPK dan audit log trigger.
- Validasi konversi prospek-SPK agar tidak dapat dibuat dua kali (constraint `prospect_id` sudah disiapkan).
- Pengelolaan user oleh supervisor melalui server-side admin API.
- Template Excel final yang dicocokkan dengan file Excel supervisor asli.
- Penyimpanan versi laporan jika data dikoreksi setelah jam 17.00.
- Uji scheduler, RLS, dan export di deployment.
