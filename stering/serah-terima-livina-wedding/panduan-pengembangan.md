# Panduan Pengembangan Livina Wedding

## Pembaruan kebutuhan — 26 Oktober 2026

Admin lengkap disiapkan sesuai instruksi lanjutan: `/admin/users`, `/roles`, `/permissions`, `/role-permissions`, `/crew`, `/clients`, `/services`, `/website`, `/templates` (seluruhnya berawalan `/admin/`). Login existing tetap `/admin`, ditambah penerimaan undangan. Skema satu pengguna satu role tetap memakai `users.role_id`; perubahan role-permission disimpan atomik. Migration tambahan menambah founder unik, video client, judul film dan selector template. Seed opsional berisi draft dan tidak membuat kredensial Auth/media siap. Petunjuk penerapan ada di `supabase/ADMIN-SETUP.md`; belum ada SQL atau deploy cloud yang dijalankan agen.

Tindak lanjut desain dan JSON: foto Style 2 diperkecil (founder desktop 224×280, anggota 160×200, hero maksimal 320×400). Lingkaran kursor Style 1 disembunyikan saat interaksi crew, sementara foto hover tetap muncul. Hero, layanan, tim dan testimoni kini berasal dari empat JSON lokal dengan kontrak `{meta,data}` melalui provider bersama dan `/api/wedding/content`; testimoni mencakup foto, nama pasangan, venue, kutipan dan ulasan lengkap. Label pratinjau menjelaskan bahwa itu contoh. Pilih `WEDDING_CONTENT_SOURCE=supabase` untuk menghubungkan tampilan publik ke konten terbit yang dikelola admin; mode JSON tetap default untuk pratinjau.

Pengaturan template terbaru menggantikan redirect tetap di catatan sebelumnya: `/` membaca `public_template()` dan mengarah sesuai pilihan Style 1 atau Style 2. Kedua URL langsung tetap tersedia. Katalog bukan CRUD bebas, hanya dua pilihan tetap. Jika SQL baru belum diterapkan, fallback Style 1.

Varian `/style-2` ditambahkan atas permintaan pengguna: isi layanan, tim, video, galeri/testimoni dan kontak sama dengan `/style-1`, tetapi presentasi mewah modern dengan palet ivory/espresso/champagne, font Cormorant Garamond dan Manrope, hero dua kolom dengan gambar lengkung, layanan berbentuk daftar pilihan/detail, founder besar dan foto anggota langsung terlihat, galeri asimetris, serta kontak gelap. Animasi memakai blur/fade hero, pembukaan mask gambar, reveal lembut, zoom foto hover dan progress gulir; bukan cursor foto atau mask lingkaran dari style-1. Video yang sama tersedia dengan kontrol pemutaran. Route `/` tetap menuju `/style-1`. Tidak ada dependency, migration, atau deployment baru.

Perubahan URL terbaru: tampilan publik yang sudah disetujui dipindahkan ke `/style-1`, tetap pada route group full-width di dalam `[locale]`. URL `/` mengarahkan sementara (307) ke `/style-1`. Komponen, konten JSON, interaksi tim dan autentikasi admin tetap memakai implementasi yang sama.

Penyesuaian tim setelah peninjauan bersama: pengguna mengizinkan data JSON sebagai simulasi backend. Beranda kini memakai `src/data/wedding/crew.json` secara default: satu founder contoh dan tiga anggota, dengan kontrak `{ meta, data }`. Data ini ditandai sebagai pratinjau pada bagian tim, tidak disimpan ke Supabase. `WEDDING_CREW_SOURCE=supabase` mengembalikan pembacaan profil terbit; mode ini memprioritaskan posisi yang menyebut Founder/Pendiri. Halaman `/the-crew` dan pengelolaan admin tetap memakai backend yang tersedia.

Arahan terbaru: profil founder dan anggota beranda tersusun sejajar pada desktop (posisi, nama kapital besar, kata-kata), dengan jarak antarbagian tanpa karakter `|` atau garis vertikal. Pada ponsel susunan tetap vertikal agar terbaca. Foto desktop memakai portal fixed dengan titik tengah foto pada kursor dan border radius tepat 15px. Baris teks berada pada z-index 20, di atas foto pada z-index 10. Ketika satu profil aktif, profil lain bertransisi ke opacity 0,22 dan bergeser 28px ke kiri; semuanya pulih saat interaksi berakhir. Keyboard membuka foto saat fokus; Escape/blur menutupnya. Pada layar kecil atau perangkat tanpa hover, ketukan membuka/menutup foto di bawah profil. Preferensi reduced motion tetap dihormati. Tidak ada migration atau dependency baru.

Pengguna meminta URL `/` menjadi website publik mengikuti tampilan dan animasi `https://verveorganizer.com/`, serta mengizinkan URL foto/video pihak lain sebagai materi sementara. Beranda kini memakai hero huruf animasi, font Playfair Display/Montserrat, video dengan mask lingkaran, layanan accordion, tim dari konten terbit, galeri bergerak saat gulir, kontak dan footer. Video serta gambar referensi tetap URL eksternal; gambar testimoni referensi diberi keterangan, tidak di-seed sebagai pelanggan Livina. Layanan contoh berupa copy presentasi sementara sampai data terbit tersedia.

`/admin` sekarang pintu login, login berhasil menuju `/dashboard`. Seluruh route pada grup `(admin)` diperiksa di server menggunakan identitas Supabase Auth dan konteks akun/role aktif. Cookie sesi HttpOnly menggantikan sessionStorage; API pengelolaan juga diperiksa terpisah. Pratinjau pengelolaan tidak lagi terbuka untuk pengunjung tanpa login. Pengguna melaporkan penyiapan schema, akun admin dan Edge Function melalui Dashboard; agen tidak menjalankan migration atau pengujian data cloud.

Verifikasi akhir: build produksi dan lint file yang berubah lulus; 12 tes validasi dan batas autentikasi lulus dengan mock. Akses anonim ke `/dashboard` serta `/admin/crew` diarahkan ke `/admin`; API privat memberi 401. Beranda dan login diperiksa pada layar ponsel 320 px tanpa overflow horizontal. Login memakai akun asli belum dicoba; konfigurasi header IP Edge Function tetap perlu diverifikasi pada lingkungan deploy. Pratinjau desktop tersimpan di `livina-home-preview.png`.

## Pembaruan di repository Livina — 24 Oktober 2026

Project tujuan kini diperiksa di `D:/Dicky/livina-wedding`: Next.js/TailAdmin dengan locale aktif `en` saja, belum ada konfigurasi Supabase. Pengguna menetapkan pengelolaan data memakai layout TailAdmin dan bagian publik **The Crew** berisi foto, nama, posisi, serta kata-kata tiap anggota. Kata-kata memakai `team_members.biography`, foto opsional dengan fallback inisial, urutan dan draft/terbit tetap berlaku.

Source `/admin/crew`, `/the-crew`, integrasi REST/Auth/Storage dan worker/migration lokal telah disiapkan. Beranda demo template belum diganti. Belum ada penerapan Supabase atau uji database/worker nyata; pengguna tetap menjalankannya. Hasil audit source ada pada `../pemahaman-frontend.md`, `../pemahaman-backend.md`, dan setup pada `../../supabase/README.md`. Keterangan “belum dibuka” di catatan 22 Oktober di bawah adalah status historis.

Status: kebutuhan serah-terima, 22 Oktober 2026. Project tujuan `livina-wedding` belum dibuka/diperiksa. Dokumen ini memisahkan kebutuhan dari repository wedding-invitation; bukan klaim Livina sudah diimplementasikan.

## Identitas dan batas project

- Livina adalah website bisnis wedding organizer dengan referensi https://verveorganizer.com/.
- Buat halaman publik yang mendekati arah visual, struktur, dan interaksi referensi dengan identitas/konten Livina. Bukan hanya membuat dashboard admin.
- Backend memakai proyek Supabase **khusus Livina**: PostgreSQL, Auth, Storage, serta fungsi server bila dibutuhkan.
- Panel pengelolaan memakai TailAdmin yang tersedia di project tujuan. Audit source aktual terlebih dahulu; arsitektur Go dan company/tenant project undangan lama tidak dibawa otomatis.
- Teks, foto, video, layanan, tim, testimoni dan kontak mengambil data nyata yang dikelola admin. Jangan mengarang pelanggan atau memakai testimoni/foto Verve sebagai milik Livina.

## Aturan setiap pekerjaan

1. Untuk setiap penambahan, perubahan atau perbaikan, baca panduan ini lalu design-table.md. Keduanya base project.
2. Baca dokumentasi backend/frontend yang tersedia di project Livina lalu cocokkan dengan source aktual. Bila belum ada, dokumentasikan hasil pemeriksaan, jangan menyalin pemahaman project lain sebagai fakta.
3. Selaraskan database, validasi, request/response, penerimaan dan pengiriman frontend. Pertahankan perubahan lokal dan batasi perubahan sesuai kebutuhan.
4. Semua komunikasi, dokumentasi, label dan pesan validasi memakai bahasa Indonesia. Identifier teknis dapat tetap mengikuti source.
5. Periksa versi dan kompatibilitas; beri tahu pengguna sebelum menambah dependency.
6. Pisahkan status rencana, source tersedia, sudah diterapkan dan teruji. Jangan mengklaim migration/deploy/pengujian berhasil tanpa bukti.
7. Aturan pengujian database yang dicatat sebelumnya: migration, seed dan pengujian data dilakukan pengguna. Jangan menjalankannya tanpa instruksi baru yang jelas dari pengguna di project tujuan.

## Isi website dan referensi

Hasil penelusuran 17 Oktober 2026 menemukan satu halaman panjang: hero → layanan → tim → testimoni → kontak → footer. Tidak ditemukan tautan internal menuju halaman detail terpisah. Navigasi final Livina mengikuti kebutuhan dan pemeriksaan project tujuan.

| Bagian | Kebutuhan Livina |
| --- | --- |
| Hero | Logo, nama Livina, judul/slogan, video latar teroptimasi, poster/fallback, indikator gulir |
| Layanan | Judul, ringkasan, deskripsi, kalimat penegas, status dan urutan; accordion aksesibel |
| Tim | Nama, peran, biografi, foto bila tersedia, status dan urutan |
| Testimoni | Nama pasangan, venue, ringkasan/ulasan lengkap, foto, izin publikasi, status dan urutan |
| Kontak | Email, WhatsApp serta akun sosial Livina |
| Footer | Identitas, tahun hak cipta dan tautan sosial |

Enam layanan referensi: Wedding Planner, Wedding Organizer, Sangjit Planner, Engagement, Social Event dan Corporate Event. Pilihan layanan Livina harus dikonfirmasi lewat data nyata, bukan diasumsikan sama.

Visual aset testimoni yang terlihat: foto hitam putih, overlay gelap, tipografi serif putih berukuran besar. Struktur halaman menunjukkan video hero berulang tanpa suara, judul per huruf, accordion, reveal naik/fade, mask teks dan clip-path. Namun lapisan loading tidak selesai terbuka pada browser pemeriksaan saat itu: urutan/durasi/hover/slider/parallax belum terverifikasi. Periksa ulang referensi melalui browser saat membangun visual Livina; jangan menebak efek tersebut sebagai hasil observasi.

Terapkan fallback yang membuat konten tetap terbaca, loading berbatas waktu, fokus keyboard, reduced-motion, dan video yang tidak memaksa suara. Foto/video Verve tidak otomatis boleh digunakan sebagai aset Livina.

## Modul admin dan data nyata

Modul: Pengaturan Website/Hero, Layanan, Tim, Testimoni, Tautan Sosial, Pustaka Media, Pengguna, Role, Permission dan Role–Permission. Satu user tepat satu role; role memiliki banyak permission. Pemeriksaan permission wajib di server/RLS, bukan hanya menyembunyikan tombol.

Setiap modul koleksi memerlukan daftar/tambah/detail/ubah/hapus sesuai izin; pengaturan tunggal memakai form pengaturan. Publik hanya membaca konten terbit. Draft, profil akun, bukti izin, sumber media privat dan limiter tidak boleh bocor. Media yang masih digunakan tidak boleh dihapus.

Form wajib mendefinisikan field required/opsional, panjang, format, FK, unik, validasi berbahasa Indonesia, kegagalan server dan pencegahan submit ganda. Validasi frontend dan backend; tidak percaya ukuran/MIME/permission dari klien. Simpan teks biasa atau sanitasi rich text yang memang diperlukan.

## Daftar dan mobile

Daftar memiliki pencarian, sort allowlist, filter relevan dan pagination server. Label: Cari, Filter, Urutkan, Sebelumnya, Selanjutnya, Total data, Halaman X dari Y dan Data per halaman. Pilihan 10/25/50/100; default 10. Reset halaman ke 1 setelah filter/search/per_page berubah. Total dihitung setelah filter, pengurutan mempunyai tie-breaker ID. Data kosong menampilkan Tidak ada data dan Halaman 0 dari 0.

Response rencana `{data, meta}`: page, per_page, total_data, total_pages, has_previous_page, has_next_page. Jangan interpolasi sort/filter sebagai SQL bebas. Batas search 100 karakter.

Website/panel responsif mulai lebar 320 piksel: menu mobile, form satu kolom, tombol sentuh memadai, modal dapat digulir, tabel lokal scroll/kartu dan seluruh kontrol pagination tetap tersedia. Periksa desktop/mobile di browser ketika implementasi.

## Media

- Foto: input JPG/JPEG/PNG/WebP; batas awal 5 MB dan 20 megapiksel. Verifikasi signature/decode, koreksi orientasi, buang metadata sensitif, pertahankan rasio/transparansi. Hasil berformat **.webp / image/webp**, termasuk URL hasil yang dikembalikan ke frontend. Target sisi panjang <=1920 dan sekitar 100–300 KB jika kualitas memungkinkan.
- Video: validasi container/codec/durasi/resolusi. Rencana input <=40 MB/60 detik; hasil MP4 H.264/AAC fast-start <=1080p/30fps/20 MB, target hero <=10 MB. Poster/thumbnail WebP. Nilai ini rancangan awal, bukan batas yang telah disetujui lewat pengujian Livina.
- Gunakan pending/processing/ready/failed. Konversi/kompresi memerlukan worker yang kompatibel; Supabase Storage hanya menyimpan berkas. Jangan menjanjikan FFmpeg berat berjalan otomatis/gratis di Edge.
- Publik hanya menerima media siap. Sumber/draft privat; URL hasil/signed URL sesuai kebijakan publikasi. Tangani gagal, retry, timeout, kuota dan orphan. File yang sudah optimal tidak dijanjikan selalu bisa dibuat lebih kecil tanpa dampak kualitas.

## Keamanan login dan konfigurasi

Supabase Auth menangani password. Profil user menghubungkan auth.users ke satu role. Aktifkan RLS dan kebijakan Storage, secret/service_role hanya server. Lindungi admin terakhir dan cegah pengguna mengubah role sendiri.

Rencana limiter server: 5 percobaan/menit/IP, blokir 15 menit setelah 5 kegagalan akun atau 20 kegagalan IP dalam 15 menit. Gunakan penyimpanan atomik terpusat dan IP dari gateway tepercaya, HMAC identitas limiter, TTL, pesan generik serta 429/Retry-After. Rate limit/CAPTCHA bawaan Auth juga diperlukan untuk mencegah bypass endpoint login aplikasi. Pengaturan ini harus diaudit/diuji pada deployment Livina.

Prioritas biaya gratis sebisa mungkin, tetapi periksa ulang kuota/ketentuan Supabase dan hosting sebelum memilih. Angka kuota dan batas penggunaan hosting di arsip adalah catatan 17 Oktober 2026, bukan jaminan saat implementasi. Vercel hanya kandidat hosting; kesesuaiannya untuk website bisnis perlu diperiksa. Tidak membuat/menghubungkan proyek cloud pada tahap pemisahan ini.

## Status pekerjaan sebelumnya

Backend/panel organizer sempat dibuat di repository yang salah. Source tersebut opsional untuk diaudit/dipakai ulang; lihat README.md. Website publik yang menyerupai Verve belum dibuat. Tidak ada proyek Supabase Livina, konten Livina, migration live atau deployment yang diverifikasi dalam sesi ini.
