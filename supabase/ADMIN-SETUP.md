# Mengaktifkan admin Livina

## Task 1-3: foto publik, loop Style 1, judul Owner/Crew

Perbaikan terbaru 29 Oktober 2026. Endpoint foto Crew sekarang membaca storage_path dari RPC public_crew_photo, dengan kompatibilitas path dari schema lama. Sebelumnya frontend meminta photo.path yang undefined pada schema terbaru sehingga 503. Kontrol hanya media ready milik crew published tetap berada di RPC/policy; tidak memakai service key atau membuka foto draft.

Video Style 1 tetap muted/autoplay/loop dan tidak dipause hanya karena keluar viewport. Penolakan autoplay browser membuka kontrol, tidak dianggap sebagai file video rusak. Preferensi reduced-motion tetap dihormati. Endpoint media publik men-stream video melalui URL aplikasi dengan dukungan single Range dan pemeriksaan published setiap request; signed URL 60 detik tidak lagi diberikan sebagai redirect video sehingga permintaan loop/range berikutnya mendapat tanda tangan baru. Style 2 tetap memakai kontrol tanpa autoplay/loop. Foto pada endpoint media umum tetap redirect seperti sebelumnya.

Kedua style menambahkan judul The Owner sebelum profil is_founder dan The Crew sebelum anggota lain. Judul kelompok kosong tidak ditampilkan. Urutan/profil/foto/hover/layout baris lama dipertahankan; batas satu founder tetap constraint existing. Task ini tidak mengubah posisi teks film atau slug Service.

Verifikasi: 100 tes lokal, lint fitur dan build produksi lulus. Foto yang dilaporkan pengguna menghasilkan 302 dan file Storage WebP terbaca 206. Video terbit merespons dua Range berturut-turut dengan 206 video/mp4 tanpa redirect. Tidak ada mutasi data cloud. Cukup deploy frontend terbaru ke Vercel; tidak perlu SQL atau Edge Function baru. Refresh lokal sudah memakai source ini.


Panduan terbaru 29 Oktober 2026. Frontend Next.js/TailAdmin berjalan lokal atau di Vercel. Supabase menyediakan Auth, database, Storage privat dan Edge Function. SQL, seed, deployment dan perubahan akun cloud belum dijalankan oleh agen. Login telah dikonfirmasi berhasil oleh pengguna; tidak perlu membuat ulang akun.

## Perbaikan terbaru: foto 422 dan video tanpa antrean

Pengguna sudah melaporkan seluruh deployment/migration sebelumnya diterapkan. **Tidak perlu SQL baru atau mengulang migration** untuk perbaikan ini, selama migration 202610290001_direct_photos_website_contacts.sql sudah sukses.

1. Deploy ulang organizer-api dengan seluruh isi organizer-api-paste.txt terbaru (identik dengan functions/organizer-api/index.ts).
2. Deploy frontend terbaru ke Vercel, atau refresh/restart server lokal yang memakai source terbaru.
3. Batalkan pilihan media yang masih menunggu dari form lama, refresh, lalu pilih file kembali. Foto: crop lalu Simpan. Video: pilih MP4, tunggu preview/poster lokal selesai, lalu Simpan.

Error foto 422 berhasil direproduksi pada WebP valid dengan profil warna ICC. Validator diperbaiki untuk menerima profil warna serta metadata WebP yang sah: ICC dipertahankan agar warna tetap benar, EXIF/XMP dan chunk tambahan dibuang dari hasil. Animasi, struktur rusak, dimensi dan ukuran tetap ditolak. Error media memakai kode spesifik dan log organizer_media_rejected hanya memuat jenis serta kategori kegagalan, tanpa token, nama file atau isi berkas.

Video baru sekarang memakai jalur direct seperti foto, bukan worker. Syarat: **MP4 H.264, audio AAC atau tanpa audio, maksimal 20 MB, 60 detik, Full HD** (1920x1080 atau 1080x1920). WebM/HEVC/MP4 terfragmentasi dan file di luar batas harus diekspor ulang. Input memberi pesan jelas. Server memeriksa struktur MP4, track, dimensi, durasi dan referensi data internal sebelum ready; tidak memercayai nama atau metadata klien. Tidak ada transcoding tersembunyi atau perubahan status ready oleh browser.

Poster otomatis dibuat dari frame video lokal. File video/poster tetap di memori sampai Simpan. Pada Website, poster otomatis juga mengisi field poster utama, yang masih boleh diganti foto lain. Client menyimpan poster melalui referensi video. Upload poster selesai dahulu, lalu video, lalu record; upload sukses di-cache untuk retry form. Tidak ada polling media atau ketergantungan worker untuk pilihan baru. Batalkan pilihan saat membaca video menghentikan proses lokal dan membersihkan resource. Video yang sudah ready dari worker lama tetap dapat dibaca; antrean lama tidak dipromosikan otomatis.

Verifikasi: build produksi, lint fitur dan typecheck Edge lulus; 91 tes lokal mencakup regresi WebP ICC/EXIF/XMP yang didekode ulang, poster lokal/cancel, alur client sampai finalisasi, batas/kepemilikan/video rusak dan retry. Parser juga diuji dengan MP4 publik MDN nyata (960x540, 5.056 detik, 1.13 MB), diunduh ke memori tanpa upload cloud. Penerapan function/frontend dan percobaan upload pada akun Supabase pengguna belum dilakukan oleh agen.

## Pembaruan ini: foto langsung dan satu pengaturan website

Terapkan berurutan pada proyek Livina yang sudah dipakai:

1. Buka SQL Editor Supabase dan jalankan seluruh file [migration baru](migrations/202610290001_direct_photos_website_contacts.sql). Jangan menjalankan ulang SQL pembuat schema lama. Migration mempertahankan data serta constraint singleton Website, menambah detail WhatsApp dan memisahkan foto langsung dari antrean worker.
2. Buka Edge Functions > organizer-api > Code. Ganti source dengan **seluruh** isi [organizer-api-paste.txt](organizer-api-paste.txt), lalu Deploy updates. Salinan ini identik dengan [index.ts](functions/organizer-api/index.ts); jangan menempel potongan kode. Tidak ada secret baru. Login dan pengelolaan password tetap tersedia.
3. Refresh aplikasi lokal. Jika source frontend belum berjalan, gunakan `npm run dev -- --hostname localhost`. Untuk domain produksi, deploy versi frontend terbaru ke Vercel setelah SQL dan function diperbarui.
4. Uji foto pada Crew, Client, Service dan Website menggunakan akun sendiri. Foto lama yang masih pending tidak otomatis menjadi ready; pilih/crop ulang untuk memakai jalur baru.

### Cara simpan foto

Pilih foto -> crop/geser/zoom -> Gunakan foto -> preview lokal -> **Simpan**.

Sebelum Simpan, file hanya berada dalam memori form; tidak ada upload atau baris media baru. Menutup form/membatalkan crop tidak menerapkan perubahan pada record. Tombol Simpan aktif setelah crop selesai. Saat Simpan berlangsung, kontrol dikunci dan indikator menyimpan tampil.

Saat Simpan, aplikasi mengunggah hasil crop WebP lewat signed URL, lalu Edge memeriksa ukuran berkas sebenarnya, container, dimensi, metadata/animasi yang tidak diizinkan, izin dan pemilik. Hasil ditempatkan di bucket privat organizer-media dan ditandai ready di server sebelum record disimpan. Foto baru tidak memerlukan polling atau worker. RLS/constraint media siap tetap berlaku; klien tidak diberi hak mengubah status media sendiri.

Jika upload gagal, simpan record tidak dilanjutkan dan form bisa dicoba kembali. Jika upload sukses tetapi record gagal, retry dalam form yang sama memakai ID upload sukses. Berkas yang sudah diunggah bisa tetap menjadi media belum terpakai; record sebelumnya dipertahankan. Penyimpanan file dan record bukan satu transaksi lintas Storage/database.

Foto sumber maksimal 5 MB (JPG/PNG/WebP). Crop menghasilkan WebP dengan sisi panjang maksimal 1600, tanpa memperbesar foto kecil. Browser yang tidak dapat mengekspor WebP menampilkan error crop. Rasio: Crew 3:4, logo 1:1, client/layanan 4:3, poster utama 16:9. Tidak ada pustaka, filter atau daftar foto pada pemilih.

**Catatan alur sebelumnya:** upload video lewat worker telah digantikan jalur MP4 direct pada perbaikan terbaru di atas. Worker tetap tersedia untuk antrean lama. Jangan mengatur ready atau path hasil secara manual.

### Pengaturan website hanya satu form

Modul Website langsung menampilkan form, tanpa daftar/tambah/hapus pengaturan. Database tetap membatasi satu baris dengan singleton_key main. Hak baca/create/update/publish tetap diperiksa.

- Identitas: nama brand, logo, judul dan subjudul hero.
- Video utama: satu video dan satu poster.
- Bagian Cinta dalam setiap detail: satu teks film, dipakai pada kedua style.
- Kontak: email dan daftar WhatsApp yang bisa ditambah/edit/hapus di dalam form.
- Publikasi: tahun hak cipta dan draft/terbit.

Setiap kontak WhatsApp memuat nama/label, nomor dengan +kode negara, pesan awal opsional, urutan dan status aktif. Maksimal 50 kontak, boleh kosong. Migration memindahkan nomor WhatsApp lama menjadi kontak pertama; data lama tidak dihapus. Nilai divalidasi pada frontend, API dan CHECK database. Hanya kontak aktif tampil, urutan terkecil dahulu; pesan awal di-encode pada tautan wa.me.

Style 1 dan Style 2 membaca pengaturan yang sama melalui public_content. Terbitkan pengaturan agar terlihat di website. Teks film Style 1 ditampilkan pada bagian video; Style 2 memakai heading film. Tampilan setiap style tetap mengikuti desainnya.

## Fondasi yang harus sudah tersedia

Untuk proyek yang sudah diisi, jangan menjalankan ulang fondasi. Urutan riwayat migration:

1. 202610170001_organizer.sql
2. 202610170002_organizer_api.sql
3. 202610170003_media_worker.sql
4. 202610240001_crew.sql
5. 202610260001_admin_console.sql
6. 202610290001_direct_photos_website_contacts.sql (baru)

Data API harus expose schema organizer, bukan organizer_private. Auth dan profil organizer.users harus menggunakan UUID yang sama, dengan satu role aktif. Untuk proyek baru, buat akun melalui Auth Dashboard dan sesuaikan bootstrap-admin.sql.example. Tidak ada password awal di source. seed.sql bersifat opsional dan mengisi konten draft; tidak membuat akun Auth atau file media palsu.

Edge organizer-api memakai SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY dan SUPABASE_ANON_KEY bawaan, serta ORGANIZER_ALLOWED_ORIGINS, ORGANIZER_LOGIN_HMAC_SECRET dan ORGANIZER_TRUSTED_IP_HEADER. Origin harus persis (termasuk port lokal), dipisah koma. HMAC acak minimal 32 karakter. Header IP harus ditimpa gateway tepercaya, bukan dipercaya langsung dari input klien. Konfigurasi function verify_jwt mengikuti config.toml karena login belum membawa JWT; aksi selain login memverifikasi JWT, identitas dan profil sendiri.

Frontend hanya memerlukan NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY dari proyek yang sama. Jangan memasukkan service role ke NEXT_PUBLIC_*. Mulai ulang server/deploy setelah mengubah environment. Tambahkan origin Vercel/domain produksi pada ORGANIZER_ALLOWED_ORIGINS.

Atas permintaan pengguna, login tidak memakai CAPTCHA. Pada Authentication > Attack Protection, nonaktifkan Enable Captcha protection dan simpan. NEXT_PUBLIC_TURNSTILE_SITE_KEY tidak dipakai lagi. Limiter akun/IP, validasi JWT/profil dan pemeriksaan origin tetap aktif. Jangan mengubah akun atau reset password hanya karena kesalahan konfigurasi.

## Modul dan akses

Tersedia Users, Roles, Permissions, Role Permission, Crew, Client, Service, Website dan Template. Satu pengguna hanya memiliki satu role. Perubahan pengguna/role/permission serta matriks permission dibatasi administrator sistem. Role editor tidak otomatis memperoleh izin penuh. Admin terakhir dan role admin sistem dilindungi backend.

Crew menyimpan nama, posisi, founder, kata-kata, foto, urutan dan status; hanya satu founder. Client menyimpan foto, ulasan, venue dan video opsional; publikasi memerlukan persetujuan. Service menyimpan konten untuk kedua style. Template adalah dua pilihan tetap, tidak dapat menambah template baru.

Perubahan konten mengikuti izin read/create/update/delete dan publish masing-masing. Foto memerlukan media.read/media.create. Media terpakai dilindungi FK; menghapus crew tidak menghapus file yang mungkin masih dibutuhkan. CRUD PostgREST menggunakan JWT pengguna, bukan service role frontend.

/admin adalah login dan login berhasil menuju /dashboard. Halaman admin diperiksa server. Sesi memakai cookie HttpOnly/SameSite, Secure pada produksi; bukan token di localStorage/sessionStorage. Mutasi API memeriksa origin dan sesi. Keluar mencabut cookie/sesi.

Ganti password tersedia di header: password saat ini, password baru dan konfirmasi. Setelah berhasil pengguna masuk kembali. Reset password pengguna lain hanya untuk administrator, dengan password admin saat ini sebagai konfirmasi. Password baru minimal 12 karakter, mengandung huruf dan angka. Tidak mengirim tautan recovery/invite. Notifikasi perubahan password otomatis, bila diaktifkan pada Supabase Auth, adalah pengaturan terpisah. Tambah user melalui undangan masih dapat mengirim email; alternatifnya hubungkan UUID Auth yang sudah ada.

## Halaman publik dan worker lama

/ langsung merender template yang dipilih admin, tanpa redirect ke /style-1. /style-1 dan /style-2 tetap tersedia dan memakai data terbit yang sama. Semua data publik memakai Supabase, tanpa JSON contoh atau URL referensi sebagai fallback; WEDDING_CONTENT_SOURCE lama diabaikan. Bagian kosong disembunyikan. Jika semuanya kosong, tampil pesan konten sedang dipersiapkan. Data draft tidak tampil.

Worker opsional untuk antrean lama memerlukan Node >=20.9, FFmpeg/FFprobe dengan libwebp/libx264. Atur SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY hanya pada environment worker. Gunakan `node supabase/worker/media-worker.mjs` atau `--once` untuk satu antrean. FFMPEG_PATH/FFPROBE_PATH opsional jika binary tidak di PATH. Tidak ada binary/package baru yang dipasang oleh perubahan ini. Migration baru membuat worker tidak mengambil foto direct.

## Verifikasi

79 tes lokal mencakup foto tetap lokal sebelum Simpan, retry/cancel, WebP nyata, kepemilikan/izin, container rusak/animasi/ukuran/dimensi, kegagalan Storage, daftar WhatsApp dan rendering kedua style; serta validasi, sesi, role dan password sebelumnya. Typecheck Edge Function lulus. Build produksi dan lint file fitur diperiksa terpisah; lint seluruh repository memiliki masalah lama di file template yang tidak terkait.

Pengujian cloud nyata, penerapan migration dan deployment function belum dilakukan agen. Sesudah menerapkan, uji simpan draft/terbit, ganti foto, kegagalan upload, beberapa kontak dengan nama sama, menonaktifkan/menghapus semua kontak, pergantian template dan akses akun tanpa izin. Gunakan akun sendiri; jangan membagikan password atau token.

Pada Windows ini npm run dev menggunakan webpack karena manifest development Turbopack pernah korup. Build produksi tetap npm run build. Gunakan hostname localhost; bind eksplisit 127.0.0.1 pernah menyebabkan loop rewrite next-intl. Cache development lama di .next bukan source aplikasi.
