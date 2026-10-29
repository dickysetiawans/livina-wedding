# Arsip historis — salah penempatan project

Bagian berikut diekstrak tanpa mengubah isinya dari wedding-invitation pada 22 Oktober 2026. Bukan panduan aktif Livina; path, teknologi existing, dan status implementasinya mengacu repository lama. Acuan aktif ada di ../panduan-pengembangan.md.

## 21. Acuan website organizer, Supabase, dan pengelolaan konten — 17 Oktober 2026

### 21.1 Status dan kewajiban membaca

Bagian ini mencatat kebutuhan terbaru pengguna untuk website organizer dengan referensi Verve Organizer. Ini rancangan pengembangan, bukan laporan fitur yang sudah dibuat. Dokumentasi undangan digital sebelumnya tetap dipertahankan. Penetapan Supabase tidak otomatis memigrasikan backend Go, akun, ID, media, maupun database aplikasi undangan yang sudah ada.

Untuk SETIAP penambahan, perubahan, perbaikan, atau permintaan pengembangan lain, wajib membaca berurutan:
1. `stering/panduan-pengembangan.md`, termasuk bagian ini.
2. `stering/design-table.md`, termasuk rancangan organizer pada akhir dokumen.
3. Bagian terkait `stering/pemahaman-backend.md` dan `stering/pemahaman-frontend.md`.
4. Source aktual sebelum coding; selaraskan database, request, response, pengiriman, dan penerimaan frontend.

Kedua file pertama adalah base/acuan utama. Ketika kebutuhan berubah, perbarui keduanya sesuai dampaknya dan bedakan rancangan dengan implementasi. Gunakan bahasa Indonesia untuk dokumentasi, label, tombol, validasi, dan pesan kesalahan. Pertahankan perubahan lokal serta flow/style/tampilan di luar permintaan. Beri tahu pengguna nama, versi, alasan, dan kompatibilitas sebelum menambah dependency. Jangan menjalankan database, migration, seed, atau pengujian data; pengguna yang melakukannya sesuai aturan proyek.

### 21.2 Referensi isi dan interaksi Verve Organizer

Sumber: [Verve Organizer](https://verveorganizer.com/). Pemeriksaan sesi ini menemukan satu halaman panjang, tanpa tautan halaman internal terpisah. Tujuannya referensi struktur dan arah visual; nama, foto, video, dan testimoni pihak lain tidak otomatis menjadi data milik pengguna.

| Bagian | Konten referensi | Kebutuhan website |
| --- | --- | --- |
| Hero | Logo, nama brand, slogan, indikator gulir, elemen video berulang tanpa suara | Data brand, judul, slogan, video teroptimasi dan poster WebP dari database |
| Layanan | Wedding Planner, Wedding Organizer, Sangjit Planner, Engagement, Social Event, Corporate Event | Judul, slug, ringkasan/deskripsi, kalimat penegas, urutan dan status tayang; accordion yang dapat dioperasikan keyboard |
| Tim | Vera, Albert, Venny, Alexa, Regina; nama, julukan peran dan deskripsi karakter | Profil tim nyata, foto opsional, urutan dan status tayang |
| Testimoni | Lima pasangan beserta venue dan potongan ulasan, ditambah satu kolase | Ulasan nyata dengan izin publikasi, foto dan venue; teks disimpan sebagai teks, bukan hanya menempel pada gambar |
| Kontak | Email, WhatsApp, Instagram | Kontak bisnis nyata dan tautan tervalidasi |
| Footer | Hak cipta serta tautan Instagram, TikTok, Threads dan Bridestory | Data brand, tahun dan tautan sosial yang dikelola |

Pasangan referensi: Kevin–Prudence/Park Hyatt, Alvin–Merry/Ayana Mid Plaza, Stephen–Yessy/The Westin, Dicky–Jesselyn/The St. Regis, Aya–Ajeng/Grand Hyatt. Ini catatan referensi, bukan seed/testimoni website pengguna.

Visual teramati pada aset testimoni: foto hitam putih, overlay gelap, teks serif putih besar. Struktur halaman menunjukkan video hero, judul per huruf, accordion, reveal naik/fade, mask teks dan clip-path. Lapisan loading tidak selesai terbuka pada browser pemeriksaan; durasi, urutan, hover, parallax, slider dan kelancaran animasi belum terverifikasi. Jangan mengklaim semuanya telah diamati. Hindari loading yang menahan seluruh halaman; sediakan fallback video, batas waktu loading, serta dukungan prefers-reduced-motion.

### 21.3 Data nyata, modul dan publikasi

Modul rencana: Pengaturan Website/Hero, Layanan, Tim, Testimoni, Tautan Sosial, Pustaka Media, Pengguna, Role dan Permission. Rincian tabel/field/validasi ada di design-table bagian Organizer. Setiap modul konten menyediakan daftar, tambah, detail, ubah, dan hapus sesuai permission; pengaturan tunggal memakai ubah. Media yang masih dipakai tidak boleh dihapus.

Konten publik berasal dari data tersimpan dengan status terbit dan media siap; jangan mengisi fallback nama, angka, testimoni atau foto pelanggan palsu. Data kosong mendapat tampilan kosong yang layak. Preview/admin boleh melihat draft dengan otorisasi. Publik tidak dapat membaca akun, role, draft, log login atau berkas sumber privat. Publikasi testimoni memerlukan izin pemilik.

### 21.4 Backend dan hosting

Target backend organizer: Supabase PostgreSQL, Auth dan Storage. Gunakan Supabase Auth untuk kredensial; profil aplikasi menghubungkan auth.users dengan satu role. Aktifkan RLS pada seluruh tabel terpapar dan kebijakan Storage. Pemeriksaan permission di server/RLS wajib; menyembunyikan tombol frontend saja tidak cukup. Kunci service_role/secret hanya di server, tidak di bundle frontend atau repository.

Frontend dapat memakai build React/Vite yang kompatibel dengan source aktual. Hosting tidak diputuskan dengan asumsi gratis tanpa batas. Vercel hanya kandidat; menurut [ketentuan Vercel](https://vercel.com/legal/terms), Hobby untuk penggunaan pribadi/nonkomersial sehingga tidak menjadi pilihan gratis final untuk bisnis organizer. Pilih hosting yang mengizinkan penggunaan komersial setelah memeriksa ketentuan dan batasnya. Tidak ada deployment atau pembuatan akun dalam tugas dokumentasi ini.

Pemeriksaan dokumentasi resmi pada 17 Oktober 2026: Supabase Free menyediakan Storage 1 GB dan batas unggah per file maksimal 50 MB. Ini batas penyedia, bukan batas aplikasi. Kuota bandwidth/egress, database, Auth, jeda proyek, runtime dan kebijakan dapat berubah; periksa ulang sebelum implementasi/deploy. Sumber: [billing Supabase](https://supabase.com/docs/guides/platform/billing-on-supabase), [batas file](https://supabase.com/docs/guides/storage/uploads/file-limits). Foto dan video bisa disimpan di Storage; kompresi/transcoding bukan otomatis tersedia gratis hanya karena memakai Storage.

Backend Go, worker FFmpeg dan penyimpanan lokal existing bukan layanan yang otomatis berpindah ke Supabase/Vercel. Implementasi migrasi harus memetakan akun, BIGINT ke UUID jika diperlukan, tenant/company, RBAC, URL media dan kompatibilitas data secara terpisah; jangan menghapus implementasi lama.

### 21.5 Tabel admin dan kontrak daftar

Semua daftar modul mendukung sort, filter, pencarian yang relevan, pagination server, halaman sebelumnya/selanjutnya, total halaman, total data dan pilihan per halaman. Label: Cari, Filter, Urutkan, Sebelumnya, Selanjutnya, Halaman X dari Y, Total data, Data per halaman. Kosong tampil sebagai Tidak ada data dan Halaman 0 dari 0; tombol navigasi nonaktif.

Kontrak rencana organizer: page >= 1; per_page pilihan 10/25/50/100 (default 10); search maksimal 100 karakter; sort_by melalui allowlist kolom per modul; sort_order asc/desc. Filter status/role/jenis media sesuai modul, bukan SQL bebas. Urutan default sort_order ASC, id ASC pada konten; created_at DESC, id DESC pada akun/media. Gunakan tie-breaker ID agar konsisten. Filter/pencarian/ubah per halaman mengembalikan page ke 1.

Response rencana: data berupa array dan meta berisi page, per_page, total_data, total_pages, has_previous_page, has_next_page. total_pages = ceil(total_data/per_page), bernilai 0 saat kosong. Total dihitung setelah filter; halaman di luar rentang menghasilkan data kosong dengan metadata konsisten, lalu UI menyesuaikan halaman. Kontrak ini tidak mengganti endpoint legacy diam-diam. Indeks mengikuti filter dan sort aktual.

Form create/update wajib validasi frontend dan backend, trim, panjang, format, enum, FK, unik dan permission. Error field berbahasa Indonesia, pertahankan input ketika gagal, cegah submit ganda. Tampilkan kondisi memuat, kosong, gagal dan coba lagi. Sanitasi HTML bila rich text dipakai, escape teks biasa, tolak URL javascript/data untuk kontak.

### 21.6 Foto, video dan respons media

Foto input rencana: JPG/JPEG, PNG, WebP maksimal 5 MB dan 20 megapiksel; periksa signature/decode, bukan ekstensi saja. Konversi hasil ke .webp dengan MIME image/webp, koreksi orientasi, hapus metadata sensitif, pertahankan transparansi dan rasio. Batas sisi panjang 1920 piksel; target 100–300 KB sesuai penggunaan, kualitas tidak dipaksa hingga gambar rusak. Ukuran hasil wajib lebih kecil atau sudah optimal; tolak/dekati ulang bila melewati batas aplikasi, jangan mengaku kompresi selalu lebih kecil.

Video input rencana MP4/WebM maksimal 40 MB dan 60 detik; validasi container, codec, durasi, resolusi dan ukuran. Hasil MP4 H.264, audio AAC bila diperlukan, fast-start, maksimal 1080p/30fps dan 20 MB; hero tanpa audio dengan target <= 10 MB. Video tidak dikonversi menjadi WebP; poster/thumbnail-nya WebP. Batas ini nilai rancangan awal yang dapat dikonfigurasi sesuai kebutuhan dan kuota, bukan kemampuan existing teruji.

Alur: unggah sumber ke bucket privat lewat otorisasi dan path acak -> catat pending -> worker memvalidasi/kompres -> simpan hasil -> ready atau failed. Hanya hasil ready yang boleh dipublikasi. Jangan menjalankan FFmpeg berat dalam request/serverless dengan asumsi pasti cukup runtime; tentukan worker yang layak dan biayanya sebelum implementasi. Kompresi browser hanya optimasi awal, validasi server tetap wajib. Hapus berkas sementara/sumber setelah sukses sesuai retensi, bersihkan orphan setelah kegagalan; jangan menimpa hasil lama sebelum hasil pengganti siap.

Response media memuat id, status, url hasil, mime_type, size_bytes, width, height, duration_seconds dan poster_url bila video. Foto ready wajib mengembalikan URL berakhiran .webp dan image/webp; URL asli tidak dipakai sebagai hasil. Simpan bucket/path sebagai identitas; signed URL privat dibuat saat akses, bukan disimpan permanen. Media publik boleh dibaca publik hanya setelah publikasi yang sah; sumber dan draft tetap privat. Pantau kuota sebelum unggah, batasi unggah bersamaan dan cegah publish pada status gagal.

### 21.7 Satu user satu role dan keamanan login

Satu users.role_id wajib merujuk satu roles.id; tidak memakai user_roles. Satu role memiliki banyak permission melalui role_permissions yang unik per pasangan. Assignment role/permission hanya oleh pihak berhak, tidak dari input registrasi publik atau metadata yang dapat diedit pengguna. Cegah penghapusan role terpakai dan perubahan yang menghilangkan admin aktif terakhir. RLS juga memeriksa akun/role aktif.

Login menggunakan Supabase Auth dan kontrol server yang sesuai. Rencana limiter aplikasi: maksimal 5 percobaan per menit per IP; setelah 5 kegagalan per akun dalam 15 menit atau 20 kegagalan per IP dalam 15 menit, blokir sementara 15 menit. Gunakan penyimpanan terpusat/atomik dengan TTL bila multi-instance; memory lokal tidak cukup untuk serverless. Aturan final diselaraskan dengan limit bawaan Auth dan diuji pengguna agar tidak menyebabkan penguncian permanen.

Limiter frontend/countdown hanya UX. Lindungi endpoint login langsung dan jalur Auth yang bisa diakses publik; proxy frontend saja bukan perlindungan bila endpoint Auth dapat dilewati. Periksa rate limit/CAPTCHA bawaan Supabase dan batas konfigurasi ketika implementasi. Gunakan IP dari proxy tepercaya, normalisasi email, pesan login gagal generik, HTTP 429 dan Retry-After bila jalur aplikasi memungkinkan. Jangan membocorkan keberadaan akun/password/token atau menyimpan password di log. Lindungi pemulihan password juga. Perubahan role/nonaktif harus berdampak pada akses server, bukan menunggu UI diperbarui.

Source existing sudah memiliki brute_force.go (memory), limiter route serta helper WebP/worker; semuanya perlu dievaluasi sebelum adaptasi, bukan dianggap belum ada atau sudah siap di Supabase.

### 21.8 Mobile dan verifikasi

Website dan panel harus responsif mulai lebar 320 piksel: navigasi mobile, form satu kolom, tombol sentuh memadai, pesan validasi terbaca, modal bisa digulir, tidak ada overflow seluruh halaman. Tabel boleh memakai area scroll horizontal atau kartu dengan label yang jelas; filter, sort dan pagination tetap tersedia. Pilihan per halaman dan tombol sebelumnya/selanjutnya tidak boleh hilang di mobile.

Video memakai poster/fallback, tidak menghambat teks, tidak memaksa autoplay bersuara; gambar responsive/lazy-load di bawah fold dan ukuran eksplisit untuk mengurangi pergeseran layout. Animasi hormati reduced-motion, fokus keyboard dan tidak menyembunyikan konten bila JavaScript gagal.

Saat implementasi, periksa desktop/mobile, kontrak API, validasi, RBAC/RLS lintas role, limiter lintas instance, unggah gagal, WebP hasil, video/poster, kuota, pagination kosong/batas akhir dan fallback animasi. Pengujian data/database tetap oleh pengguna. Tugas 17 Oktober ini hanya memperbarui dua dokumen: tidak menambah dependency, schema, koneksi Supabase, migration, deployment, atau mengubah aplikasi.
### 21.9 Source backend Supabase dan panel TailAdmin — 17 Oktober 2026

Penegasan pengguna: backend dan database memakai Supabase/PostgreSQL; panel admin memakai TailAdmin yang sudah ada. Source implementasi kini tersedia pada supabase/ dan frontend-new/src/organizer/. Status ini menggantikan pernyataan “hanya rancangan/belum ada migration” untuk komponen berikut, tetapi BUKAN klaim sudah terpasang di cloud.

| Bagian | Source yang disediakan | Status verifikasi |
| --- | --- | --- |
| Database | Tiga migration terpisah schema organizer/organizer_private, 10 tabel aplikasi dan 2 tabel limiter, FK/check/unik/indeks/trigger/audit | Pemeriksaan source; tidak dieksekusi ke database |
| Hak akses | Satu user satu role, role_permissions, RLS/grant minimum, admin sistem dan penjagaan admin terakhir, sinkron email Auth | Belum pengujian database/konkurensi pengguna |
| API | RPC session_context, list_data dan public_content; daftar memiliki search/filter/sort allowlist dan metadata pagination | Belum request ke Supabase nyata |
| Login | Edge Function organizer-api, limiter atomik akun/IP, HMAC, CAPTCHA Auth/Turnstile dan sesi refresh frontend | Perlu konfigurasi trusted gateway/header, secrets, Auth dan deployment |
| Akun | Undangan Auth melalui server admin, profil, penerimaan token invite/recovery dan pengaturan kata sandi | Perlu SMTP/Site URL/redirect; pengiriman reset belum ada di panel |
| Media | Bucket staging/hasil privat, signed upload/preview, worker Node+FFmpeg untuk WebP/MP4/poster dan cleanup limiter | Source/sintaks diperiksa; belum proses file atau uji Storage nyata |
| Panel | Route /organizer pada project TailAdmin existing; modul layanan/tim/testimoni/sosial/pengaturan/media/user/role/permission/pemetaan | Build TypeScript/Vite; belum uji login/data/mobile runtime |

Panel organizer memakai sesi Supabase dan sidebar sendiri dalam project/style TailAdmin existing; tidak masuk AuthProvider Go atau mengganti login/route/modul undangan lama. Tidak menggandakan template TailAdmin atau menambah dependency. Frontend mengakses PostgREST dengan publishable key dan RLS; operasi rahasia (Auth invitation, signed upload, limiter) dilakukan Edge Function. Nilai service_role hanya di environment server/worker. Contoh konfigurasi publik: frontend-new/.env.organizer.example, tidak mengubah .env pengguna.

Migration 001 membuat schema, tabel, RLS, validasi media/publikasi dan role/permission sistem; 002 menambah API/Storage/limiter; 003 klaim antrean media SKIP LOCKED. Tidak ada akun, testimoni, foto atau isi brand dummy. Role editor awal tanpa permission; administrator pertama dibuat pengguna melalui Auth Dashboard dan bootstrap-admin.sql.example. Ini website organizer tunggal, bukan migrasi tenant/company aplikasi lama.

Worker harus dijalankan pada host dengan Node/FFmpeg/FFprobe (binary existing dideteksi dari backend-go/tools/ffmpeg/bin atau env). Bukan proses otomatis Supabase Storage atau Edge. Hasil foto kualitas awal 80, iterasi 75/dimensi hingga 640 untuk sasaran <=300KB; hasil yang tidak lebih kecil ditolak sebagai sudah optimal/perlu sumber lain. Video H.264/AAC/fast-start <=20MB/60 detik, poster WebP; target hero 10MB belum batas wajib tersendiri. Failed dapat dihapus/diunggah ulang; pekerjaan processing yang tertinggal dapat diklaim setelah 30 menit. Byte MIME/ukuran/dimensi hasil divalidasi server; target kualitas/performa perlu uji pengguna.

Semua bucket privat, hasil publik hanya via referensi konten terbit dan signed URL TTL 60 detik; draft/source tidak dibuka ke publik. Penghapusan objek memakai Storage API. FK menolak media yang dipakai. Cleanup orphan kegagalan jaringan/worker tetap perlu pemantauan operator. Tidak ada endpoint reset password panel atau website publik Verve pada perubahan ini; public_content siap dipakai integrasi website berikutnya.

Panduan pemasangan dan batas keamanan lengkap ada di supabase/README.md; daftar uji pengguna di supabase/verification.md. Pengguna menjalankan migration/deploy/konfigurasi Auth dan worker. Agen tidak mengakses database, menjalankan migration/seed/pengujian data, menambahkan dependency, atau melakukan deployment.
Verifikasi source implementasi 21.9: build akhir npm.cmd run build berhasil (TypeScript/Vite, 2200 modul), dengan warning ukuran bundle existing. Pemeriksaan TypeScript Edge Function memakai compiler existing dan runtime-check.d.ts berhasil; node --check media-worker.mjs dan git diff --check main.tsx berhasil. Tidak menginstal dependency. SQL ditinjau secara statis, belum diparse/dieksekusi pada PostgreSQL. Tidak menjalankan worker konversi/file, database/API nyata, migration/seed, browser/mobile runtime atau deployment. Karena itu RLS, transaksi/konkurensi admin dan limiter, Auth invitation serta Storage tetap memerlukan matriks uji pengguna sebelum produksi.