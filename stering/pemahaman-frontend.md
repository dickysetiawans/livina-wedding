# Pemeriksaan frontend Livina — 24 Oktober 2026

## Task 4-5 selesai (30 Oktober 2026)

Style 1 menampilkan film_title sebagai blok h2 tersendiri sebelum section video, di luar lapisan sticky/mask. Teks tidak lagi absolute/menimpa video. Panjang teks dapat membungkus, tautan scroll menuju judul jika tersedia, dan animasi/loop video tetap dipertahankan. Style 2 tidak berubah.

Service tidak lagi meminta input slug manual. Judul otomatis dinormalisasi menjadi slug lowercase dengan tanda hubung, termasuk trimming, aksen dan tanda baca. Slug dibuat pada validasi/payload klien dan server, jadi request tambah tanpa slug tetap valid. Edit yang tidak mengubah judul mempertahankan slug existing; perubahan judul pada form membuat slug baru. API menangani benturan unique slug secara atomik memakai constraint database dan retry suffix -2 sampai -11, tanpa read/grant baru. Konflik lain dan kegagalan izin tidak diulang. Tidak ada data existing diregenerasi massal, SQL baru atau perubahan Edge Function.

Verifikasi: build produksi, lint fitur dan 104 tes lokal lulus. Tes meliputi teks di luar section video, title kosong, slug tanpa input, normalisasi judul, suffix collision, JWT/payload dan penolakan retry untuk kegagalan lain. CRUD Service di cloud tidak dilakukan agen. Deploy frontend terbaru di Vercel untuk domain produksi.


## Task 1-3: foto publik, loop Style 1, judul Owner/Crew

Perbaikan terbaru 29 Oktober 2026. Endpoint foto Crew sekarang membaca storage_path dari RPC public_crew_photo, dengan kompatibilitas path dari schema lama. Sebelumnya frontend meminta photo.path yang undefined pada schema terbaru sehingga 503. Kontrol hanya media ready milik crew published tetap berada di RPC/policy; tidak memakai service key atau membuka foto draft.

Video Style 1 tetap muted/autoplay/loop dan tidak dipause hanya karena keluar viewport. Penolakan autoplay browser membuka kontrol, tidak dianggap sebagai file video rusak. Preferensi reduced-motion tetap dihormati. Endpoint media publik men-stream video melalui URL aplikasi dengan dukungan single Range dan pemeriksaan published setiap request; signed URL 60 detik tidak lagi diberikan sebagai redirect video sehingga permintaan loop/range berikutnya mendapat tanda tangan baru. Style 2 tetap memakai kontrol tanpa autoplay/loop. Foto pada endpoint media umum tetap redirect seperti sebelumnya.

Kedua style menambahkan judul The Owner sebelum profil is_founder dan The Crew sebelum anggota lain. Judul kelompok kosong tidak ditampilkan. Urutan/profil/foto/hover/layout baris lama dipertahankan; batas satu founder tetap constraint existing. Task ini tidak mengubah posisi teks film atau slug Service.

Verifikasi: 100 tes lokal, lint fitur dan build produksi lulus. Foto yang dilaporkan pengguna menghasilkan 302 dan file Storage WebP terbaca 206. Video terbit merespons dua Range berturut-turut dengan 206 video/mp4 tanpa redirect. Tidak ada mutasi data cloud. Cukup deploy frontend terbaru ke Vercel; tidak perlu SQL atau Edge Function baru. Refresh lokal sudah memakai source ini.


## Perbaikan terbaru: WebP ICC dan video direct (29 Oktober 2026)

Pengguna menyatakan deployment sebelumnya sudah dilakukan. Foto 422 direproduksi pada WebP valid berprofil ICC: validator sekarang menerima ICC (warna dipertahankan), membuang EXIF/XMP/chunk tambahan, tetap menolak animasi/struktur rusak/ukuran/dimensi berlebih. Log organizer_media_rejected dan kode PHOTO_INVALID/VIDEO_FORMAT/VIDEO_LIMIT/VIDEO_POSTER membedakan kesalahan tanpa rahasia.

VideoPicker tidak lagi memakai polling/worker. Pilih MP4 H.264 <=20 MB, <=60 detik, <=Full HD, buat poster dari frame lokal, stage keduanya dalam PendingPhotos, upload saat Simpan. Edge upload-video/finish-video memeriksa berkas MP4 sebenarnya dan poster ready milik aktor sebelum menandai ready di bucket privat. Website otomatis mengisi poster utama; Client memakai poster media video. Jalur worker lama tetap kompatibel, video lama ready tetap dapat dibaca. WebM/HEVC/fragmented MP4 perlu diekspor ulang, bukan dibiarkan menunggu. Hook useDirectMediaUpload tidak dipakai lagi dan dihapus.

Tidak ada SQL/dependency/secret baru untuk perbaikan ini; deploy ulang organizer-api-paste.txt terbaru dan frontend. Refresh/batalkan pilihan lama lalu pilih ulang file. 91 tes lokal, lint fitur, typecheck Edge dan build lulus; MP4 nyata MDN diuji di memori. Upload akun/cloud belum dijalankan agen. Lihat supabase/ADMIN-SETUP.md.


## Pembaruan terbaru: simpan foto dan Website tunggal (29 Oktober 2026)

Catatan upload foto/worker sebelumnya digantikan. Pilih foto/crop hanya menyiapkan File dan preview dalam memori form. Simpan memanggil PendingPhotos.prepare, upload-photo, signed PUT dan finish-photo, lalu menyimpan record. Edge memeriksa container WebP, dimensi, ukuran, izin dan pemilik; foto siap tanpa worker/polling. Tidak ada upload jika form/crop dibatalkan sebelum Simpan. Upload sukses di-cache untuk retry simpan record. Video masih memakai worker. Belum ada data/deployment cloud yang diubah agen.

WebsiteSettings menggantikan tabel singleton dengan satu form berizin. Kontak WhatsApp berupa detail JSONB tervalidasi (nama, nomor, pesan, urutan, aktif); boleh kosong. Nomor lama dipindahkan menjadi kontak pertama. Kedua style membaca public_content yang sama, hanya kontak aktif berurutan; pesan di-encode. Film title yang sama juga dirender di Style 1. Terapkan migration baru 202610290001_direct_photos_website_contacts.sql lalu deploy organizer-api dari index.ts/paste yang identik; tidak ada secret baru. Panduan lengkap: supabase/ADMIN-SETUP.md. 79 tes lokal lulus; cloud belum diuji.


## Pembaruan 29 Oktober 2026 — login tanpa CAPTCHA

Revisi terbaru upload/beranda: `CrewPhotoPicker` dan `VideoPicker` memakai alur pilih/ganti langsung, tanpa pustaka, pagination atau filter media. `PhotoCropDialog` menyediakan drag, zoom, keyboard dan export crop canvas lokal; `useDirectMediaUpload` serta `waitForMedia` menunggu ID baru sampai ready dan memblokir penyimpanan form selama pilihan belum siap. Modal bertingkat menjaga body scroll lock dan Escape hanya menutup modal teratas. Halaman akar sekarang merender `StyleOneWebsite`/`StyleTwoWebsite` langsung dari pilihan admin. Kedua route style menggunakan komponen yang sama. Provider publik hanya membaca Supabase, tanpa fixture/URL gambar contoh; bagian kosong dan tautan navigasi terkait disembunyikan. Build dan 68 tes lokal lulus; `/` HTTP 200 tanpa redirect dan content API Supabase terverifikasi. Rincian ada pada `supabase/ADMIN-SETUP.md`.

Tindak lanjut pada hari yang sama: pengguna mengonfirmasi login berhasil (password sebelumnya salah). Modal tambah/edit menggunakan varian `size="form"` pada `CrewDialog`: lebar desktop maksimum 6xl dan grid form dua kolom mulai breakpoint lg, mobile satu kolom. ID label dialog dibuat unik dengan `useId`. Header admin menyediakan `PasswordDialog` untuk akun sendiri; tabel Users menyediakan reset pengguna lain bagi admin sistem. `PasswordField` memisahkan kontrol password dan tombol lihat/sembunyikan. Build, lint fitur, typecheck Edge dan 57 tes lokal lulus; tidak ada password cloud diubah oleh agen. Source Edge terbaru perlu di-deploy sebelum aksi password dapat dipakai. Pengujian visual lewat Chrome belum selesai karena pengguna sedang mengoperasikan jendela itu.

Atas permintaan pengguna, `CrewSignIn` tidak lagi memuat widget/script Turnstile atau menunggu token sebelum tombol Masuk aktif. Komponen `CrewCaptcha` yang tidak terpakai dihapus. Transport login hanya mengirim action, email dan password; password tidak diubah. Variabel site key lama tidak digunakan meskipun masih ada pada `.env.local`. Jika Supabase tetap meminta CAPTCHA, pesan UI mengarahkan ke toggle Auth yang harus dimatikan. 45 tes lokal dan typecheck Edge Function lulus; login cloud belum terkonfirmasi. Pengaturan cloud belum diubah oleh agen.

## Pembaruan 26 Oktober 2026

Verifikasi akhir admin: `npm run build` lulus; typecheck Edge Function dan lint source fitur admin/konten yang diperiksa lulus; 32 tes lokal berbasis mock lulus. HTTP tanpa sesi: sembilan modul admin menuju `/admin` (307), API privat menjawab 401, `/signin` dan `/signup` menuju `/admin`. Login/CRUD cloud dan penerapan SQL belum diuji. `npm run lint` seluruh repository masih gagal pada enam error lama: `jsvectormap.d.ts` (any), `CalendarEventModal`, `SidebarContext` dan `ThemeContext` (set-state-in-effect), serta variabel `module` pada `tests/auth-boundary.test.mjs`; ada satu warning unused variable pada ThemeContext. Catatan historis di bawah bukan hasil verifikasi terakhir.

Implementasi terbaru: seluruh bagian hero/services/crew/testimonials pada dua style memakai `weddingPageContent()` dan sumber JSON lokal default. Kontrak publik yang sama tersedia lewat `/api/wedding/content`; mode `WEDDING_CONTENT_SOURCE=supabase` memakai konten published. Testimoni kini berupa data foto dan teks, termasuk dialog ulasan lengkap/video opsional, bukan gambar testimoni Verve yang berisi teks. Foto Style 2 diperkecil dan lingkaran kursor Style 1 disembunyikan pada hover crew.

Admin: sidebar TailAdmin kini menampilkan modul sebenarnya sesuai akses. Route dinamis `/admin/[module]` menangani users, roles, permissions, clients, services dan website; role-permissions serta templates memakai pengelola khusus. Crew existing ditambah penanda founder. UI umum dipisah menjadi manager, table, editor dan field control; media memakai picker foto serta picker video dengan antrean ready. Semua route admin tetap diperiksa server. Undangan dapat diselesaikan di `/admin/accept-invite`; token fragment hanya disimpan sementara di memori, dibersihkan dari URL, lalu diverifikasi server saat aktivasi. Tidak ada password default yang ditanamkan.

Root `/` kini membaca template aktif dari RPC Supabase dengan allowlist dua kode dan fallback Style 1. Selector admin tidak mempunyai aksi tambah/hapus. Panduan setup incremental, seed dan perpindahan sumber data ada pada `supabase/ADMIN-SETUP.md`.

Varian kedua tersedia di `/style-2`, pada grup `[locale]/(full-width-pages)`. Komponen mandiri berada di `src/components/wedding-luxe/` (header, hero, layanan, film, tim, galeri, kontak, motion), dengan CSS module tersendiri dan token `luxe-*` pada globals.css. Memakai `weddingContent`, `weddingCrewContent`, `referenceMedia` dan terjemahan konten yang sama; namespace `luxe` hanya menambah label navigasi dan presentasi. Font serif Cormorant Garamond dipadukan Manrope melalui next/font yang sudah tersedia. Tidak mengubah komponen style-1 atau route admin. Data contoh tetap diberi keterangan, media referensi tetap diberi kredit. Video tidak autoplay; pengunjung dapat memutarnya dengan kontrol native. Animasi dinonaktifkan pada reduced motion; konten tetap terlihat tanpa JavaScript.

URL tampilan publik terbaru adalah `/style-1`: source halaman dipindahkan ke `src/app/[locale]/(full-width-pages)/style-1/page.tsx`. Halaman akar kini memakai redirect server melalui `@/i18n/navigation` menuju `/style-1` (307), sehingga tautan website yang masih menuju `/` tetap berfungsi. Tampilan dan animasi yang disetujui tetap sama.

Revisi terbaru menggantikan susunan vertikal desktop pada catatan berikut: `WeddingCrewRow` kini memakai grid tiga kolom untuk posisi/nama/bio tanpa pemisah vertikal. Portal foto berpusat pada koordinat pointer, radius 15px, z-index 10 di bawah baris teks z-index 20. Atribut `data-active` mengendalikan selector CSS `:has()` untuk meredupkan profil lain ke 0,22 dan menggesernya 28px ke kiri, dengan transisi pulih ketika hover/fokus berakhir. Transform ini diterapkan pada trigger agar tidak menimpa animasi reveal baris. Ponsel tetap satu kolom dan foto inline, tanpa geser horizontal.

Tambahan hasil peninjauan: bagian tim beranda telah diubah menjadi susunan vertikal rata tengah. `WeddingCrew` mengurutkan founder lebih dahulu lalu `sort_order`, dan setiap `WeddingCrewRow` mengendalikan foto portal fixed yang mengikuti pointer dengan animasi geser, fokus keyboard/Escape, serta foto inline yang dibuka dengan ketukan pada layar kecil. Data contoh beranda dibaca dari `src/data/wedding/crew.json` melalui adapter server bertipe `WeddingCrewResponse`; default sumber `preview`, pilihan `WEDDING_CREW_SOURCE=supabase` membaca tim terbit kembali. Tampilan member tidak berisi percabangan sumber data. Label pratinjau membedakan nama/foto contoh dari tim nyata.

`/` telah diganti dengan halaman publik Livina pada grup full-width. Source terpisah pada `src/components/wedding/`: hero, layanan, tim, galeri, kontak, pengendali animasi dan CSS module dengan token warna global. Referensi dibuka langsung di browser: hero gelap, judul Playfair Display, heading Montserrat, video bermask lingkaran, layanan putih dua kolom, profil tim gelap, gambar testimoni dengan skala/parallax, serta kontak/footer gelap. URL video dan enam gambar referensi digunakan sementara atas instruksi pengguna; identitas/kontak/tim Livina tidak dikarang.

`/admin` menjadi pintu login tersendiri; `/dashboard` dan semua route grup `(admin)` memerlukan sesi server. Layout TailAdmin dipisah menjadi server guard dan client `AdminShell`, menampilkan nama akun sebenarnya dan tombol keluar. Menu Dashboard kini menuju `/dashboard`. Halaman The Crew tetap `/admin/crew`, menerima konteks terverifikasi dari server. Implementasi cookie menggantikan sessionStorage; pengguna perlu login kembali setelah perubahan ini.

Pemeriksaan: build berhasil; 12 unit test validasi dan otorisasi berbasis mock lulus, tanpa koneksi database pada unit test. HTTP tanpa cookie: `/dashboard` dan `/admin/crew` mengembalikan 307 ke `/admin`, `/admin` 200, API sesi/pengelolaan 401. Browser memverifikasi hero, accordion berganti panel, pemutaran video muted, dan pemuatan gambar referensi. Login akun nyata, CRUD cloud dan worker belum diuji. Catatan 24 Oktober di bawah adalah riwayat sebelum perubahan routing/sesi.

Source aktual memakai Next.js App Router (package.json `^16.3.4`), React `^19.2.8`, TypeScript strict, Tailwind v4, dan next-intl. Berbeda dari ringkasan AGENTS.md, source saat diperiksa **hanya mengaktifkan locale `en`** dan hanya memiliki `src/messages/en.json`. Copy modul Livina berbahasa Indonesia disimpan dalam namespace `crew` di dictionary tersebut; tidak mengaktifkan bahasa baru atau menggandakan dictionary tanpa kebutuhan.

Sebelumnya belum ditemukan integrasi Supabase atau environment Livina. Halaman awal `/` adalah demo ecommerce TailAdmin, bukan website publik wedding organizer. Layout sidebar/header template dipakai kembali untuk `/admin/crew` dan diberi menu The Crew. Margin shell memakai token/logical property yang selaras dengan breakpoint sidebar agar halaman 320 piksel tidak terdorong margin desktop.

## Source modul The Crew

- UI berada pada `src/components/crew/`, dipisah menjadi pengelola state, daftar, kontrol pencarian, form, detail, pustaka foto, login, CAPTCHA, dialog, dan bagian publik.
- `src/lib/crew/` memuat tipe kontrak, validasi, transport Supabase dan pembacaan publik server. Tidak menambahkan dependency.
- `/admin/crew`: form nama, posisi, kata-kata, foto opsional, urutan, draft/terbit. Login terintegrasi pada modul ini; `/signin` template belum diubah menjadi login Livina.
- `/the-crew`: halaman publik tersendiri; `CrewSection` siap dikomposisi pada beranda nantinya. Menampilkan data kosong yang jujur tanpa nama/foto palsu.
- Form menahan input saat server gagal; validasi panjang/required/urutan, pencegahan submit ganda, konfirmasi hapus, status memuat/kosong/gagal, fokus dialog dan reduced-motion gambar.
- Foto unggahan menunggu worker dan harus siap sebelum dipilih. Menghapus anggota tidak menghapus foto.
- Deklarasi default export SVG diselaraskan dengan SVGR yang sudah dipakai webpack/Turbopack; deklarasi lama menganggap SVG sebagai string sehingga typecheck komponen ikon gagal.

## Batas status

Source implementasi tersedia. Belum ada konfigurasi Supabase dan data nyata; interaksi Auth/CRUD/worker/RLS membutuhkan pengujian pengguna setelah penyiapan pada `supabase/README.md`.

Verifikasi lokal 24 Oktober 2026: `npm run build`, `tsc --noEmit`, typecheck Edge Function, pemeriksaan sintaks worker, lint direktori modul baru dan enam unit test validasi/payload berhasil. Browser memverifikasi halaman admin dan form pada desktop 1440 piksel serta mobile 320 piksel, pengembalian fokus sesudah dialog ditutup, dan halaman publik kosong. Lebar konten publik 320 piksel sama dengan viewport, tanpa overflow. Pemeriksaan browser memakai mode belum terkonfigurasi/pratinjau, bukan akun atau data Supabase nyata. Tidak menguji konversi media, CRUD database, SQL, CAPTCHA, atau login cloud.

Pratinjau lokal harus menggunakan host `localhost` yang konsisten (`npm run dev -- --hostname localhost`). Bind `127.0.0.1` pada pemeriksaan ini memicu loop rewrite/redirect Next.js/next-intl; tidak ada kebijakan locale yang diubah untuk mengatasinya. Sandbox Windows juga menolak canonicalization path SWC; build/pratinjau yang berhasil dijalankan di luar sandbox melalui mekanisme persetujuan tool.
