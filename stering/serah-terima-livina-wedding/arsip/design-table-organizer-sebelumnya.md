# Arsip historis — rancangan organizer sebelumnya

Diekstrak dari wedding-invitation pada 22 Oktober 2026. Bukan skema yang sudah dipasang di Supabase Livina. Acuan aktif ada di ../design-table.md; source SQL lama perlu diaudit sebelum dipakai.

## Rancangan Organizer berbasis Supabase — 17 Oktober 2026

### Status, cakupan dan konvensi

Baca panduan-pengembangan.md bagian 21 terlebih dahulu. Bagian ini adalah desain TARGET untuk website organizer, bukan migration/skema aktif aplikasi undangan di bagian sebelumnya. Tidak menimpa tabel users/roles existing yang memakai BIGINT dan backend Go. Implementasi berdampingan atau migrasi wajib ditentukan setelah audit source, termasuk company/tenant dan mapping ID; jangan menjalankan SQL berikut sebagai pengganti skema lama.

Seluruh tabel target memakai schema aplikasi khusus organizer (misalnya organizer), agar nama users/roles tidak bertabrakan dengan public existing atau auth.users. Nama schema final mengikuti konfigurasi Supabase yang diperiksa saat implementasi. Semua tabel mempunyai id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_at dan updated_at TIMESTAMPTZ NOT NULL DEFAULT now(); updated_at diperbarui trigger/server. Konten memiliki created_by/updated_by UUID nullable FK users.id ON DELETE SET NULL. Waktu disimpan sebagai instan UTC dan ditampilkan sesuai zona yang dipilih. Relasi media memakai FK ke media_files.id, bukan URL mentah.

Untuk tabel berstatus publikasi: status TEXT NOT NULL DEFAULT 'draft' CHECK IN ('draft','published'), sort_order INTEGER NOT NULL DEFAULT 0 CHECK >= 0. Hanya published dengan media ready dan izin publikasi yang sah boleh dibaca publik. Field teks wajib harus terisi setelah trim. Batas panjang divalidasi server dan constraint yang sesuai; validasi relasional lintas tabel memakai transaksi/trigger/service, bukan CHECK lintas tabel. Unik slug/kode/email memakai normalisasi yang konsisten.

### A. Akun dan hak akses

| Tabel | Kolom khusus | Constraint dan aturan create |
| --- | --- | --- |
| roles | code VARCHAR(50), name VARCHAR(100), description VARCHAR(500) nullable, is_active BOOLEAN default true | code/name wajib; code unik lowercase sesuai [a-z0-9_]; hanya pihak berhak; role terpakai tidak boleh dihapus |
| permissions | code VARCHAR(100), name VARCHAR(100), module VARCHAR(50), description VARCHAR(500) nullable | code unik, name/module wajib; pola module.action melalui allowlist; permission harus didukung kebijakan server |
| users | id UUID PK FK auth.users.id, role_id UUID NOT NULL FK roles.id, name VARCHAR(150), email VARCHAR(254), phone VARCHAR(20) nullable, is_active BOOLEAN default true | id memakai identitas Auth, bukan default UUID baru; name/email/role wajib; email unik ternormalisasi dan sinkron melalui alur Auth; role harus aktif |
| role_permissions | role_id UUID NOT NULL FK roles.id, permission_id UUID NOT NULL FK permissions.id | UNIQUE(role_id, permission_id); role dihapus hanya jika tak dipakai; mapping boleh cascade saat role/permission dihapus secara sah |

**Satu user tepat satu role** melalui users.role_id NOT NULL. Tidak ada tabel user_roles. Satu role untuk banyak user; role dan permission banyak-ke-banyak. Tidak menyimpan password/password_hash pada users aplikasi; Supabase Auth menangani kredensial. Create user melalui operasi server yang berhak/invite Auth, lalu profil; tangani kegagalan parsial tanpa meninggalkan akun berhak tidak sengaja. Email tidak dapat diubah melalui update profil biasa tanpa alur verifikasi Auth.

Contoh kode permission target: services.read/create/update/delete/publish, team_members.*, testimonials.*, site_settings.read/update, social_links.*, media.read/create/delete, users.*, roles.*, permissions.read dan role_permissions.update. Tanda * di sini singkatan dokumentasi, bukan wildcard yang diterima otomatis. Definisikan setiap aksi eksplisit; pengelola konten tidak otomatis boleh mengubah akses. role_permissions tidak memakai endpoint CRUD publik bebas.

RLS default-deny: akun hanya profil sendiri bila diizinkan; administrasi akun/role sesuai permission; konten privat sesuai aksi dan status akun; publik hanya kolom konten terbit. Jangan mengizinkan pengguna mengubah role_id/is_active sendiri. Lindungi admin aktif terakhir dalam transaksi. Jika target melayani banyak company, wajib putuskan dan tambahkan company_id serta isolasi RLS sebelum implementasi; desain ini tidak boleh menghilangkan isolasi company existing.

### B. Konten website

| Tabel | Kolom khusus dan kebutuhan create | Validasi |
| --- | --- | --- |
| site_settings | singleton_key VARCHAR(30) UNIQUE DEFAULT 'main', brand_name VARCHAR(150), hero_title VARCHAR(200), hero_subtitle VARCHAR(300), logo_media_id UUID nullable, hero_video_id UUID nullable, hero_poster_id UUID nullable, contact_email VARCHAR(254), whatsapp_number VARCHAR(20), copyright_start_year SMALLINT | Satu baris: CHECK singleton_key='main'; nama/judul/email/WhatsApp/tahun wajib; email valid; nomor format internasional + dan 8–15 digit; tahun 1900–tahun berjalan (server); logo/poster foto ready; hero_video video ready, poster wajib jika video dipakai |
| services | title VARCHAR(150), slug VARCHAR(160) UNIQUE, summary VARCHAR(500), description TEXT, highlight VARCHAR(300) nullable, image_media_id UUID nullable, status, sort_order | title/slug/summary/description wajib; slug lowercase a-z/0-9 dengan tanda hubung; description maksimal 10000 karakter; gambar harus foto ready |
| team_members | name VARCHAR(150), role_title VARCHAR(150), biography VARCHAR(2000), photo_media_id UUID nullable, status, sort_order | nama/peran/bio wajib; foto harus ready; teks biasa di-escape |
| testimonials | couple_name VARCHAR(200), venue VARCHAR(200), excerpt VARCHAR(1000), full_review TEXT nullable, photo_media_id UUID, publication_consent BOOLEAN default false, consent_recorded_at TIMESTAMPTZ nullable, status, sort_order | nama/venue/excerpt/foto wajib; ulasan lengkap maksimal 10000 karakter; published memerlukan consent true, waktu persetujuan dan foto ready; bukti izin disimpan privat bila diperlukan, bukan response publik |
| social_links | platform VARCHAR(30), label VARCHAR(100), url VARCHAR(2048), status, sort_order | platform/label/url wajib; platform allowlist instagram/tiktok/threads/bridestory/website/other; hanya HTTPS, hostname sesuai platform bila dikenal; tolak javascript/data dan URL kredensial |

Seluruh *_media_id di atas FK media_files.id ON DELETE RESTRICT. Hero video opsional agar halaman tetap berfungsi ketika belum ada video; terbit tanpa video menampilkan poster/fallback yang sah. Tidak otomatis membuat halaman detail layanan/testimoni; bila full_review tersedia dapat ditampilkan melalui modal yang aksesibel. Kolase referensi tidak memerlukan tabel galeri baru tanpa permintaan.

Data awal enam layanan boleh diinput pemilik dengan isi miliknya; profil Vera dkk., pasangan, venue, foto dan ulasan dari situs referensi tidak otomatis di-seed. Wajib memakai konten nyata milik pengguna dan hak publikasinya.

### C. Pustaka media

| Kolom media_files | Tipe / constraint | Keterangan |
| --- | --- | --- |
| kind | TEXT NOT NULL CHECK IN ('image','video') | Jenis berkas |
| status | TEXT NOT NULL DEFAULT 'pending' CHECK IN ('pending','processing','ready','failed') | Hanya ready boleh dipakai publik |
| original_name | VARCHAR(255) NOT NULL | Nama tampilan yang disanitasi, bukan path penyimpanan |
| source_path | TEXT nullable | Sumber di bucket privat; hapus/null-kan setelah retensi |
| storage_bucket, storage_path | TEXT nullable, pasangan unik | Lokasi hasil; wajib saat ready; bukan signed URL |
| mime_type | VARCHAR(100) nullable | image/webp atau video/mp4 saat ready |
| source_size_bytes | BIGINT NOT NULL CHECK > 0 | Ukuran sebelum pemrosesan |
| size_bytes | BIGINT nullable CHECK > 0 | Ukuran hasil; wajib saat ready |
| width, height | INTEGER nullable CHECK > 0 | Dimensi hasil, wajib saat ready |
| duration_seconds | NUMERIC nullable CHECK > 0 | Wajib untuk video ready, NULL untuk foto |
| poster_media_id | UUID nullable FK media_files.id RESTRICT | Video menunjuk foto WebP ready; tidak boleh menunjuk dirinya |
| alt_text | VARCHAR(300) nullable | Deskripsi foto bermakna; wajib saat penggunaan publik kecuali dekoratif |
| error_code | VARCHAR(100) nullable | Kode kegagalan aman, jangan kirim detail internal kepada publik |
| uploaded_by | UUID NOT NULL FK users.id RESTRICT | Pemilik unggahan untuk audit dan otorisasi |

Media menggunakan kolom waktu/ID umum; uploaded_by menggantikan created_by bila tidak diperlukan duplikasi. Relasi poster harus divalidasi sebagai image ready dan tidak melingkar. Metadata source/hash/path tidak dikirim dalam response publik. Batas foto 5 MB/20 MP; hasil WebP sisi panjang <= 1920. Video input <= 40 MB/60 detik; hasil MP4 <= 20 MB, hero target <= 10 MB. Rincian pemrosesan dan MIME ada di panduan 21.6. Semua nilai size dihitung server dari file nyata, bukan dipercaya dari input.

Bucket staging privat untuk sumber/draft; bucket publik hanya hasil yang sudah disetujui terbit. Pemindahan/publikasi diatur server, sebab metadata published saja tidak menutup akses file yang sudah berada di bucket publik. Bucket privat disajikan signed URL berumur terbatas untuk admin/preview. Hapus media berreferensi ditolak; penggantian memakai hasil baru ready sebelum relasi dialihkan. Tangani transaksi database vs Storage dengan cleanup/retry terukur, sebab keduanya tidak satu transaksi atomik.

### D. Penyimpanan limiter login

| Tabel target | Kolom khusus | Aturan |
| --- | --- | --- |
| login_rate_limits | scope TEXT ('account','ip'), key_hash TEXT, window_started_at TIMESTAMPTZ, attempt_count INTEGER default 0, failure_count INTEGER default 0, blocked_until TIMESTAMPTZ nullable, expires_at TIMESTAMPTZ | UNIQUE(scope,key_hash); counter nonnegatif; akses hanya server, indeks expires_at untuk cleanup |

Ini pilihan penyimpanan terpusat bila memakai PostgreSQL; jika penyimpanan atomik lain dipilih, jangan membuat tabel duplikat tanpa kebutuhan. Key akun/IP dinormalisasi lalu HMAC memakai rahasia server; jangan simpan password/token. Update counter atomik, cleanup TTL, cegah penciptaan baris tanpa batas. Tidak boleh ada akses baca/tulis anon ke tabel ini. Batas dan perlindungan endpoint Supabase Auth mengikuti panduan 21.7; desain tabel saja tidak menjamin brute force teratasi.

### E. Daftar, filter, indeks dan form

| Modul | Pencarian/filter | Kolom sort yang diizinkan |
| --- | --- | --- |
| Pengguna | name/email; role_id, is_active | name, email, created_at |
| Role | name/code; is_active | name, code, created_at |
| Permission | name/code; module | name, code, module |
| Pemetaan role-permission | role_id; module/code permission | code permission, module |
| Layanan | title; status | title, sort_order, created_at |
| Tim | name/role_title; status | name, sort_order, created_at |
| Testimoni | couple_name/venue; status, publication_consent | couple_name, venue, sort_order, created_at |
| Tautan sosial | label; platform, status | label, platform, sort_order |
| Media | original_name; kind, status | original_name, size_bytes, created_at |

Pengaturan singleton tidak memerlukan pagination; semua daftar koleksi mengikuti kontrak page/per_page/search/sort/meta panduan 21.5. Daftar permission dalam form role tetap bisa dicari/filter dan dipaginasi tanpa menghilangkan pilihan di halaman lain. Pilihan FK wajib server-side lookup yang terotorisasi.

Indeks target: users(role_id), unik lower(email), unik kode role/permission, role_permissions unik pasangan serta permission_id, setiap FK media, konten(status,sort_order,id), media_files(uploaded_by,created_at), media_files(kind,status,created_at). Tambahkan indeks pencarian hanya menurut query nyata. Jangan memakai interpolasi input sebagai SQL ORDER BY.

Setiap form create memakai field wajib pada tabel, nilai default aman (draft, aktif sesuai kewenangan), batas panjang/ukuran, validasi duplikasi/FK/URL/media, pesan error per field dan submit nonaktif saat proses. Backend memvalidasi ulang semua aturan; create tidak menerima audit fields, counters, storage_path atau role bebas dari klien. Update memiliki validasi yang sama dan menjaga data lama bila gagal. Penghapusan dan publikasi diperiksa permission/relasinya.

### F. Kriteria implementasi dan batas dokumentasi

Pastikan FK/unik/check, RLS, policy Storage, transaksi role terakhir, sinkronisasi Auth/profil, kontra bypass login, output foto WebP, status worker, data draft/published, kontrak pagination dan mobile sesuai panduan. Ini rancangan untuk data nyata, tanpa migration/seed/SQL eksekusi, tanpa dependency baru dan tanpa akses database pada tugas ini. Dokumentasi lama tetap berlaku untuk aplikasi undangan; implementasi Supabase membutuhkan penyesuaian eksplisit, bukan klaim sudah terpasang.
### G. Realisasi source Supabase/TailAdmin — 17 Oktober 2026

Bagian F menggambarkan status saat rancangan pertama ditulis. Kini tersedia migration source pada supabase/migrations/202610170001_organizer.sql, 202610170002_organizer_api.sql dan 202610170003_media_worker.sql. Belum dijalankan pada Supabase/database mana pun oleh agen. Struktur BIGINT/public aplikasi undangan lama tidak diganti; schema target final organizer dan organizer_private, satu organisasi.

Penyesuaian implementasi terhadap rancangan:
- site_settings memakai status draft/published untuk mencegah pengaturan belum siap terbaca publik.
- media_files menambah is_decorative BOOLEAN NOT NULL DEFAULT false; alt_text wajib saat foto nondekoratif dipublikasikan, divalidasi trigger. Media yang direferensikan dibuat immutable (buat hasil baru untuk penggantian).
- login_rate_limits berada di organizer_private dan menambah login_ip_minutes (key_hash PK, window_started_at, attempt_count) agar jendela 1 menit/IP dan kegagalan 15 menit tidak tercampur.
- Role admin sistem memperoleh seluruh permission melalui helper database; editor awal kosong. Permission sistem dimasukkan sebagai metadata migration, tanpa seed akun/konten pelanggan.
- users.id FK auth.users ON DELETE RESTRICT; media.uploaded_by RESTRICT; FK konten media RESTRICT; audit created_by/updated_by SET NULL; role_permissions unik pasangan dan FK CASCADE.
- Semua 12 tabel dilindungi RLS; anon tidak diberi akses tabel langsung. RPC public_content memberi proyeksi konten terbit tanpa data akun/audit/sumber/izin privat. RPC list_data security invoker, filter JSON terikat parameter dan ORDER BY allowlist, total setelah filter, tie-breaker ID.
- Pemetaan role-permission dapat dicari/filter berdasarkan kode/module melalui join permissions; sort code/module/created_at. Panel menampilkan nama role melalui lookup.
- Akses media lewat bucket privat organizer-staging dan organizer-media. Browser tidak menulis metadata hasil atau objek Storage langsung; server mengeluarkan signed upload dan worker menulis hasil. Signed preview mengembalikan URL WebP/MP4, MIME, ukuran, dimensi, durasi dan poster.
- Proteksi admin terakhir memakai advisory transaction lock dan trigger; wajib diuji konkurensi pengguna. Service role tetap memerlukan otorisasi pada endpoint server.
- Counter limiter melalui RPC khusus service_role; cleanup TTL oleh worker tiap lima menit atau scheduler server. Endpoint Auth langsung tetap memerlukan limiter/CAPTCHA bawaan.
- Fungsi claim_media hanya service_role dan menggunakan FOR UPDATE SKIP LOCKED; processing kedaluwarsa setelah 30 menit boleh diklaim ulang. Path hasil unik tiap proses; tidak ada overwrite media existing.

Panel /organizer dalam TailAdmin existing menggunakan schema/RPC ini dengan sesi Supabase sendiri. Form required/length/format/media/consent/publikasi, daftar search/filter/sort/pagination/per halaman dan pesan Indonesia disediakan. Update email Auth, penghapusan identitas Auth dan pengiriman reset password dilakukan melalui Dashboard/alur Auth, bukan CRUD profil bebas. Pengujian data/database/Storage oleh pengguna; SQL belum dinyatakan lulus runtime. Panduan setup di supabase/README.md dan matriks uji di supabase/verification.md.