# Rancangan Database Livina Wedding

Revisi admin 26 Oktober 2026: migration tambahan `202610260001_admin_console.sql` melanjutkan tabel existing. `team_members.is_founder` boolean default false memakai indeks unik parsial maksimum satu founder; `testimonials.video_media_id` menunjuk video siap dan foto wajib ketika published, opsional ketika draft; `site_settings.film_title` opsional. Dua tabel baru: `templates(code,name,description)` berkode tetap `style-1/style-2` dan `template_selection(singleton_key,template_code,updated_by,updated_at)`. Browser hanya mendapat SELECT katalog; pemilihan melalui RPC berizin. `set_role_permissions(uuid,uuid[])` mengganti mapping dalam satu transaksi, khusus admin sistem; satu user tetap satu `users.role_id`, tidak membuat user_roles. Seed draft terpisah dan tidak menimpa data. SQL ini belum diterapkan agen.

Penambahan `/style-2` memakai loader konten dan JSON tim yang sama dengan `/style-1`. Variasi desain tidak membuat data atau tabel duplikat. Kontrak Supabase tetap sama.

Pemindahan tampilan publik ke `/style-1` hanya mengubah routing Next.js; tidak mengubah kontrak data, schema, atau migration.

Revisi interaksi tim 26 Oktober 2026: perubahan tata letak sejajar, posisi foto pada pusat kursor, radius 15px, redup/geser profil lain dan lapisan teks hanya mengubah presentasi frontend. Kontrak JSON dan struktur database tidak berubah.

Penyesuaian pratinjau tim 26 Oktober 2026: atas permintaan pengguna, beranda memakai fixture JSON lokal dengan `is_founder`, `sort_order`, dan `photo_url` untuk satu founder dan tiga anggota contoh. Ini kontrak presentasi sementara, bukan kolom baru pada database. Tidak ada seed atau migration; struktur `team_members` cloud tetap sama. Backend dapat diaktifkan kembali dengan `WEDDING_CREW_SOURCE=supabase`.

Pembaruan 26 Oktober 2026: perubahan beranda dan proteksi admin tidak menambah tabel atau migration. Konten terbit dibaca melalui `public_content`; foto/video publik tetap melewati pemeriksaan referensi konten terbit dan policy Storage. Token Auth disimpan sebagai cookie HttpOnly pada website Next.js dan diverifikasi ke Supabase Auth serta `session_context`, bukan memakai profil yang dipercaya dari browser. Media eksternal hanya fallback presentasi sesuai instruksi pengguna, tidak menjadi baris media/database palsu.

Pembaruan 24 Oktober 2026: modul **The Crew** memakai tabel `team_members` yang dirancang di bawah. UI memetakan posisi ke `role_title` dan kata-kata ke `biography` (wajib, maksimal 2000 karakter). Foto `photo_media_id` tetap opsional dan hanya menerima media image siap; tanpa foto tampil inisial. Source SQL fondasi dan RPC `public_crew`/`public_crew_photo` kini tersedia di `supabase/migrations/` repository Livina, **belum dijalankan**. Tidak ada perubahan skema cloud atau data nyata yang diverifikasi.

Status: bahan implementasi project livina-wedding terpisah, 22 Oktober 2026. Target Supabase/PostgreSQL dan Auth/Storage milik Livina. Bukan skema database undangan digital yang sudah berjalan. Source SQL lama dapat diaudit sebagai awal, bukan langsung dianggap benar/terpasang.

## Konvensi

Tabel aplikasi dapat memakai schema organizer untuk memanfaatkan source lama, atau schema lain setelah audit project tujuan. Tentukan satu pilihan dan selaraskan API, RLS serta frontend. Jangan menggabungkan database/akun/customer wedding-invitation.

ID UUID PK; users.id berasal dari auth.users.id, tabel lain dapat memakai gen_random_uuid(). created_at/updated_at TIMESTAMPTZ wajib, update timestamp melalui server/trigger. Konten memiliki created_by/updated_by FK users bila diperlukan. Semua validasi input diulang server/database; seluruh tabel terpapar dilindungi RLS/default-deny dan grant minimum.

## Akun dan hak akses

| Tabel | Field utama | Aturan |
| --- | --- | --- |
| roles | id, code, name, description, is_active | code unik; nama wajib; role yang dipakai tidak boleh dihapus |
| permissions | id, code, name, module, description | code unik dengan pola modul.aksi; hanya aksi yang benar-benar diperiksa backend memberi akses |
| users | id → auth.users.id, role_id → roles.id, name, email, phone, is_active | role_id NOT NULL: **1 user 1 role**; email unik ternormalisasi/sinkron Auth; tidak menyimpan password aplikasi |
| role_permissions | id, role_id, permission_id | UNIQUE(role_id, permission_id); role memiliki banyak permission dan sebaliknya |

Tidak memakai user_roles. Assignment role/permission hanya oleh pengelola berhak; profil/metadata yang bisa diedit user bukan sumber otorisasi. Lindungi admin aktif terakhir dengan transaksi/lock yang diuji konkurensi. Kredensial ditangani Supabase Auth.

## Konten

Konten berstatus draft/published. Koleksi mempunyai sort_order integer >=0. Media menggunakan FK, bukan URL asal bebas. Publik hanya menerima konten published yang valid, tanpa audit akun/bukti izin privat.

| Tabel | Field kebutuhan | Validasi utama |
| --- | --- | --- |
| site_settings | singleton_key, brand_name, hero_title, hero_subtitle, logo_media_id, hero_video_id, hero_poster_id, contact_email, whatsapp_number, copyright_start_year, status | satu pengaturan aktif; brand/judul/slogan/kontak/tahun wajib; logo/poster foto ready; video ready dan mempunyai poster; email/nomor internasional valid |
| services | title, slug, summary, description, highlight, image_media_id opsional, status, sort_order | title <=150, slug unik <=160 lowercase angka/hubung, summary <=500, description 1–10000, highlight <=300 karakter |
| team_members | name, role_title, biography, photo_media_id opsional, status, sort_order | nama/peran <=150, bio <=2000; field utama wajib, foto harus image ready |
| testimonials | couple_name, venue, excerpt, full_review, photo_media_id, publication_consent, consent_recorded_at, status, sort_order | pasangan/venue <=200, excerpt <=1000, review <=10000; foto wajib; terbit membutuhkan izin publikasi serta waktu izin yang valid |
| social_links | platform, label, url, status, sort_order | platform allowlist, label <=100, URL <=2048 HTTPS tanpa kredensial/javascript/data; host sesuai platform dikenal |

Nama Livina/layanan/foto/tim/kontak/testimoni diisi pemilik dengan data nyata. Jangan membawa data Verve atau data undangan pelanggan lama sebagai seed.

## Media dan Storage

media_files: id, kind (image/video), status (pending/processing/ready/failed), original_name, source_path privat, storage_bucket, storage_path hasil, mime_type, source_size_bytes, size_bytes, width, height, duration_seconds untuk video, poster_media_id untuk video, alt_text, is_decorative, error_code aman, uploaded_by FK users, created_at/updated_at.

- Foto ready wajib WebP dan MIME image/webp; video ready MP4 dengan poster WebP. Batas file/dimensi/durasi mengikuti panduan-pengembangan.md dan pemeriksaan file nyata di worker.
- media_files.poster_media_id menunjuk image ready, tidak dirinya sendiri; relasi media konten menggunakan ON DELETE RESTRICT.
- alt_text wajib untuk foto bermakna saat publikasi; dekoratif ditandai eksplisit. Sumber/hash/token/audit tidak dikirim ke publik.
- Simpan bucket/path, bukan signed URL permanen. Bucket sumber/draft privat; kebijakan akses hasil mengikuti status publikasi. Signed URL harus pendek TTL-nya.
- Pengubahan/penghapusan file yang dipakai harus aman terhadap race dan referensi. Database dan Storage bukan satu transaksi atomik: butuh cleanup/retry dan pengawasan orphan.
- Unggah/hasil teroptimasi diverifikasi server. Browser tidak diberi kuasa menetapkan ready, MIME hasil, ukuran, role atau path bebas.

## Limiter login privat

Rancangan login_rate_limits: scope account/ip, key_hash HMAC, window_started_at, attempt_count, failure_count, blocked_until, expires_at; unik (scope,key_hash). Bila memakai jendela menit terpisah, login_ip_minutes: key_hash PK, window_started_at, attempt_count.

Counter harus atomik dan memakai TTL/cleanup; hanya server bisa membaca/menulis. Ini bukan perlindungan lengkap tanpa integrasi endpoint login dan konfigurasi rate limit/CAPTCHA Supabase Auth. Jangan simpan password/token/IP mentah tanpa kebutuhan.

## Query daftar dan indeks

| Modul | Filter/pencarian | Sort |
| --- | --- | --- |
| Pengguna | nama/email, role, aktif | name, email, created_at |
| Role | nama/kode, aktif | name, code, created_at |
| Permission | nama/kode, module | name, code, module |
| Role–Permission | role, module, kode permission | code, module, created_at |
| Layanan | judul, status | title, sort_order, created_at |
| Tim | nama/peran, status | name, sort_order, created_at |
| Testimoni | pasangan/venue, status, izin | couple_name, venue, sort_order, created_at |
| Sosial | label, platform, status | label, platform, sort_order |
| Media | nama file, jenis, status | original_name, size_bytes, created_at |

Pagination server dan metadata mengikuti panduan. site_settings singleton tidak membutuhkan pagination. Sort/filter wajib allowlist dan parameter binding. Indeks pada FK, email/kode/slug unik, pasangan role-permission, status/urutan/id konten, pemilik/jenis/status/waktu media serta expiry limiter. Tambahkan indeks pencarian berdasarkan query aktual, bukan asumsi.

## Sebelum penerapan

Audit source project Livina, versi PostgreSQL/Supabase, kebutuhan konten dan deployment. Susun migration, policy dan kontrak API yang konsisten. Uji otorisasi lintas role, publik/draft, SQL validation, duplikasi, pagination, upload/kompresi/gagal, admin terakhir serta limiter sesuai izin pengujian pengguna. Riwayat SQL terdahulu ada di arsip dan inventaris source pada README.md; belum ada database Livina yang diterapkan oleh agen.
