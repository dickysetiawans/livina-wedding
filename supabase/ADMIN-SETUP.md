# Mengaktifkan admin Livina

## Crew bertugas di testimoni dan portal modal — 6 November 2026

Layout Paket: baris kategori di kiri, Unduh semua paket di kanan; subkategori dan jenis di baris bawah, sejajar area card. Pada mobile susunan ditumpuk agar tombol tetap mudah ditekan. Tombol PDF tersembunyi bila tidak ada paket untuk diunduh.

Modal bersama sekarang memakai createPortal ke document.body sehingga fixed overlay tidak lagi mengikuti transform/filter/overflow kartu yang dianimasikan. Perbaikan berlaku untuk pertanyaan WhatsApp, cerita Client dan dialog admin. Focus trap, Escape, klik backdrop, scroll lock dan pemulihan fokus tetap memakai implementasi existing. Cursor dekoratif disembunyikan ketika dialog terbuka. Verifikasi langsung localhost Style 1 berhasil: Tanyakan Paket Ini membuka dialog terpusat dengan backdrop seluruh viewport dan dua pilihan kontak aktif. Tidak ada tautan WhatsApp yang dikirim/dibuka oleh agen.

Penugasan Crew berada di form Client & Testimoni sebagai daftar berulang: pilih Crew, pilih Jabatan saat event (default jabatan Crew, dapat diganti), foto event opsional, video event opsional. Maksimal 50, Crew tidak boleh duplikat dalam satu event. Memilih Crew tidak mengubah jabatan utama Crew. Untuk memakai selector, akun memerlukan team_members.read (dan testimonials.read/update/create sesuai aksi); pilihan Jabatan mengikuti izin posisi existing. Foto/video memerlukan media.read dan unggah memerlukan media.create. Upload/crop tetap lokal sampai Simpan; resolver media kini menelusuri nilai bertingkat dan memakai upload berhasil saat retry.

Tabel baru organizer.testimonial_crew: id, testimonial_id (FK testimonials, cascade delete), crew_id (FK team_members, restrict), position_id (FK positions, restrict), position_name (snapshot), photo_media_id nullable, video_media_id nullable, sort_order. UNIQUE(testimonial_id,crew_id). Kolom testimonials.crew_assignments JSONB menjadi DTO form/list; trigger BEFORE memvalidasi/mengisi snapshot/nama dan AFTER menyinkronkan tabel relasi dalam transaksi parent yang sama. Client tidak dapat memalsukan nama snapshot (payload API membuangnya, trigger memperoleh dari master). Jabatan dengan ID tetap mempertahankan snapshot saat master diganti namanya; mengganti pilihan jabatan memperoleh snapshot baru. Tabel anak tidak menerima mutasi langsung authenticated; izin parent dan publish existing tetap berlaku. Crew/jabatan yang direferensikan tidak dapat dihapus sebelum penugasan dilepas.

Detail cerita kedua style/root memakai komponen StoryDialog bersama dan menampilkan nama Crew, jabatan event, foto dan video opsional. Tanpa foto event, gunakan foto profil Crew bila ready; tanpa foto profil, nama/jabatan tetap tampil. Hanya penugasan pada testimoni published + publication_consent dan Crew published yang masuk proyeksi publik. Crew draft disembunyikan. Foto/video baru diperiksa require_media; media publik dan poster video dikenali media_published sehingga endpoint media permanen bekerja. Tidak ada tabel anak yang diberi SELECT anon langsung.

Penerapan: setelah SQL 202611060001_package_inquiry_template sukses, jalankan seluruh supabase/migrations/202611060002_testimonial_crew.sql lalu deploy frontend. Tidak perlu deploy ulang Edge Function, secret baru atau seed. SQL belum diterapkan otomatis ke cloud; testimoni lama tetap memiliki penugasan kosong. Setelah penerapan isi Crew dari form Client, simpan, lalu uji dialog publik.

Verifikasi: build produksi, TypeScript dan lint seluruh file perubahan lulus. 137 tes existing lulus, 4 tes baru lulus (total 141): validasi/whitelist penugasan, media bertingkat/saat Simpan/retry, portal ke body, dan detail Crew dengan/tanpa foto/video. Dialog WhatsApp juga diverifikasi visual langsung di localhost. Trigger/RLS migration belum dieksekusi pada engine PostgreSQL lokal/cloud oleh agen; pengujian CRUD database setelah SQL dijalankan tetap diperlukan.

## Pesan WhatsApp Paket, PDF Poppins dan filter — 6 November 2026

Berlaku pada kedua template dan root /. The Owner ditampilkan sekali sebagai judul bagian; label Owner/The Owner di jabatan/biografi tampilan dibersihkan tanpa mengubah database. Navigasi Style 2 memakai Pendiri. Daftar Client, Crew dan Paket diberi animasi naik/fade saat filter berubah; reduced-motion menonaktifkan animasi. Harga card disingkat Rp. 1Rb/Rp. 1jt/Rp. 1,5jt, database dan pesan WhatsApp/PDF tetap memakai rupiah penuh.

Tombol setiap card kini Tanyakan Paket Ini. Dialog menampilkan kontak WhatsApp aktif dari Pengaturan Website, sesuai urutan admin (tidak dibatasi hardcode dua kontak). Pilih kontak membuka wa.me dengan pesan terisi, tidak mengirim otomatis. Sapaan mengikuti jam perangkat pengunjung saat klik: 05–10 pagi, 11–14 siang, 15–17 sore, selebihnya malam. Kontak kosong mendapat pemberitahuan, tidak memakai nomor contoh. Template pesan pertanyaan paket dapat diubah di Pengaturan Website; kosong memakai pesan bawaan. Penanda yang didukung: {sapaan}, {nama_kontak}, {kategori}, {subkategori}, {jenis_paket}, {nama_paket}, {harga}, {benefit}. Maksimal 4000 karakter; penanda tidak dikenal ditolak API. Semua substitusi berupa teks, bukan evaluasi kode.

Unduh PDF sekarang satu tombol untuk seluruh paket published pada semua kategori/jenis, tidak mengikuti filter aktif dan tidak ada lagi unduhan per paket. Endpoint menolak parameter query lama. Paket dikelompokkan kategori/subkategori/jenis; layout berupa blok rounded putih di atas kertas ivory, header hijau, harga emas dan benefit terurut, tanpa tabel. Font Poppins Regular/SemiBold resmi dari google/fonts disematkan bersama lisensi OFL, ikut bundel Vercel melalui outputFileTracingIncludes. Tidak menambah package. Harga pada PDF tetap penuh; font standar sebelumnya diganti. PDF panjang dipaginasi, nomor halaman tersedia. Foto belum dimasukkan PDF.

Penerapan: jalankan seluruh `supabase/migrations/202611060001_package_inquiry_template.sql` setelah migration Paket 004 sukses, lalu deploy frontend terbaru. Tidak perlu mengubah organizer-api/index.ts, secret atau seed. Migration menambah satu kolom nullable ke site_settings; proyeksi setting publik existing sudah membaca kolom baru melalui to_jsonb, sehingga tidak perlu menyalin ulang public_content. SQL belum dijalankan pada proyek cloud oleh agen.

Verifikasi: 132 tes existing/PDF lulus, 5 tes tambahan harga, sapaan/template, Owner dan dialog kontak/draf pesan lulus (total 137). Build produksi dan TypeScript lulus; font Poppins terverifikasi masuk manifest tracing deployment. PDF Poppins panjang dirender dengan Poppler dan halaman pertama diperiksa visual (font, warna, wrapping, card, footer). Tidak ada pesan WhatsApp yang dikirim atau perubahan data cloud. Interaksi browser live belum diverifikasi untuk pembaruan ini.

## Tampilan Paket, foto, dan unduh PDF — 6 November 2026

Berlaku bersama pada /style-1, /style-2, dan root / sesuai template aktif. Kartu harga putih, rounded, daftar benefit dengan tanda centang, berubah hijau gelap/aksen emas saat hover atau fokus pada tombol PDF, serta naik ringan. Tidak menambahkan label Paling Laris karena belum ada data penanda tersebut. Filter kategori/subkategori/jenis menggunakan pill seperti referensi. Foto Crew Style 1 diperkecil dalam card; Style 2 dibatasi 9rem. Tombol foto mendukung hover, fokus dan active naik, dengan preferensi reduced-motion dihormati. Galeri Paket memakai foto lebih kecil, nama selalu ditampilkan di bawahnya dan caption opsional menjadi teks tambahan; animasi foto juga mendukung fokus/klik.

Efek blur animasi masuk Style 2 dihapus. Gambar publik tetap memakai sumber asli (unoptimized), tidak dikompresi ulang Next.js. Crop baru dinaikkan dari maksimal 1600px/WebP 0.90 menjadi 1920px/0.95, sesuai batas validator Edge Function 1920px; tidak memperbesar sumber kecil. Foto lama tidak berubah otomatis: unggah ulang sumber resolusi tinggi bila berkas lama kurang tajam. Tidak menjanjikan pemulihan detail yang tidak ada pada sumber.

Tombol Generate PDF paket mengunduh seluruh Paket pada filter kategori/subkategori/jenis aktif, bukan hanya 4 card yang sedang terlihat. Tiap card juga memiliki Unduh PDF paket ini. Endpoint GET /api/wedding/packages/pdf memvalidasi UUID/jenis, membaca ulang konten published dari provider server dan menolak kombinasi/ID di luar filter; tidak menerima harga/benefit kiriman browser. PDF teks berisi brand, kategori/jenis, nama paket, harga rupiah, daftar benefit, nomor halaman dan pemisahan halaman otomatis. Generator memakai font PDF standar tanpa package/dependensi/layanan pihak ketiga baru; belum menyertakan foto atau reproduksi desain card dalam PDF.

Penerapan: deploy frontend terbaru saja. Tidak ada migration SQL, secret, Edge Function atau seed baru pada pembaruan ini; migration Paket 003/004 sebelumnya tetap harus sudah diterapkan. Kualitas crop baru berlaku pada foto baru/unggahan ulang.

Verifikasi: 129 tes existing lulus dan 3 tes PDF tambahan lulus; build produksi/TypeScript dan lint file perubahan lulus. PDF panjang 10 halaman berhasil dirender menggunakan Poppler dan halaman pertama diperiksa secara visual; tidak ada clipping teks pada hasil yang diperiksa. Pengujian UI live browser belum dilakukan pada pembaruan ini.

## Paket publik — 6 November 2026

Route `/` langsung merender StyleOneWebsite atau StyleTwoWebsite sesuai template aktif admin. Perubahan Client/Crew/Owner sebelumnya sudah memakai komponen yang sama di `/`, `/style-1` dan `/style-2`; tidak ada salinan halaman root yang harus disinkronkan terpisah.

Bagian Paket kini tampil setelah Layanan/Film dan sebelum Owner, memakai tema gelap editorial pada Style 1 dan terang champagne pada Style 2. Kategori dan subkategori terurut dari admin, kategori tanpa konten tidak tampil. Pilihan utama mereset subkategori; subkategori pertama yang tersedia dipilih otomatis. Pilihan All In/Non Venue hanya muncul bila ada paket terbit pada kombinasi tersebut. Awal 4 harga, tombol Tunjukkan lebih banyak harga menambah 4 sampai habis, pergantian filter mengulang dari 4. Jika paket lebih sedikit, hanya jumlah yang ada ditampilkan. Harga dalam rupiah penuh dan benefit mengikuti urutan admin. Galeri bawah mengikuti kategori/subkategori, tetap sama ketika jenis paket diganti; foto kosong tidak membuat blok galeri. Katalog sepenuhnya kosong tidak menampilkan bagian atau navigasi Paket.

**Penerapan:** jalankan seluruh `supabase/migrations/202611050004_public_packages.sql` setelah 003 sukses, lalu deploy frontend terbaru. Tidak perlu mengubah Edge Function atau secret. Kategori/subkategori harus aktif; Paket/Galeri harus published. Foto galeri harus berstatus ready. Jika 003 belum dijalankan, jalankan terlebih dahulu. Jangan mengulang seed produksi. Migration 004 belum dijalankan otomatis pada proyek cloud.

Migration menambah RPC public_packages dengan proyeksi kolom publik eksplisit; hanya paket/galeri terbit pada master aktif. public_content menyertakan package_catalog, serta media_published mengenali foto galeri terbit pada master aktif sehingga endpoint `/api/wedding/media/[id]` dapat menandatangani fotonya. Draft, master nonaktif, dan foto belum ready tidak termasuk proyeksi publik. Konten publik lain, persetujuan Client dan pengurutan Client terbaru dipertahankan. Tabel master/Paket/Galeri tetap ber-RLS dan tidak diberikan SELECT langsung ke anon. Frontend kompatibel dengan proyeksi lama tanpa package_catalog: bagian lain tetap berjalan, bagian Paket tersembunyi sampai 004 diterapkan.

Validasi: build produksi/TypeScript dan lint file perubahan lulus. Tes existing 125 lulus; empat tes Paket publik tambahan lulus, mencakup reset pilihan, 4/8/sisa di dua tema, galeri tidak mengikuti jenis paket, data kosong dan kontrak provider. Pemeriksaan tampilan fixture melalui browser belum dapat dilakukan karena koneksi ke server preview timeout; CRUD dan proyeksi cloud belum diuji sesudah migration karena SQL belum diterapkan oleh agen.

## Admin Paket — 5 November 2026

Tahap ini hanya menambah sisi admin. Style 1/2 dan public_content tidak menampilkan Paket/Galeri baru dulu.

1. Jalankan seluruh `supabase/migrations/202611050003_admin_packages.sql` melalui SQL Editor setelah migration 001 dan 002 sukses. Migration berada dalam transaksi dan tidak menghapus/mengisi ulang data lama. Belum dijalankan pada cloud oleh agen.
2. Deploy frontend terbaru ke Vercel. Tidak perlu mengubah organizer-api/index.ts, secret, atau menjalankan seed lama. Refresh halaman admin; bila menu baru belum muncul, login ulang agar daftar izin terbaru dimuat.
3. Administrator melihat Kategori Paket, Subkategori Paket, Paket, dan Galeri Paket. Role lain memerlukan izin read/create/update/delete pada modul terkait, serta packages.publish/package_gallery.publish untuk publikasi. Memilih dan mengunggah foto tetap memerlukan media.read/media.create. Izin membaca Paket/Galeri memberi akses baca master untuk dropdown, tanpa otomatis memberi izin mengelola master.
4. Isi Kategori: Nasional (tanpa subkategori), Internasional (menggunakan subkategori), Adat (menggunakan subkategori), Intimate (tanpa subkategori). Atur urutan dan status aktif. Contoh ini tidak dimasukkan otomatis ke produksi.
5. Isi Subkategori pada kategori yang menggunakan subkategori, misalnya China pada Internasional dan Batak pada Adat. Nama unik dalam masing-masing kategori; nama kategori unik tanpa membedakan case/spasi luar. Pengaturan menggunakan subkategori tidak dapat diubah setelah kategori digunakan.
6. Isi Paket: nama, kategori, subkategori jika digunakan, All In/Non Venue, harga rupiah penuh (190000000), 1–50 baris benefit (maksimal 500 karakter per baris), urutan, draft/published. Benefit ditambah/hapus dan digeser Naik/Turun. Daftar benefit disimpan JSONB terurut bersama Paket dalam satu operasi atomik, bukan tabel anak terpisah, agar Simpan tidak meninggalkan paket/benefit setengah jadi.
7. Isi Galeri Paket: nama, kategori/subkategori, foto wajib, keterangan opsional, urutan, draft/published. Galeri tidak memiliki jenis All In/Non Venue, sesuai pembacaan wireframe. Pilih–crop lokal lalu upload saat Simpan memakai alur media existing. Foto untuk publikasi harus ready dan dapat digunakan oleh akun tersebut.

Kategori berganti mereset pilihan subkategori; dropdown anak hanya menampilkan milik induk tersebut. FK gabungan mencegah relasi silang kategori bahkan dari request langsung. Trigger mewajibkan subkategori untuk kategori bertingkat, melarang subkategori pada kategori datar, dan menolak perubahan konfigurasi yang sudah digunakan. Hapus master yang dipakai ditolak; nonaktifkan bila ingin menyembunyikan pilihan baru. Data yang sedang nonaktif tetap dapat dikenali ketika mengedit referensi existing.

Pencarian, pagination, tambah, detail, edit, hapus, izin publikasi, modal lebar desktop dan responsif mobile memakai pola admin existing. Harga diformat rupiah pada daftar/detail, relasi ditampilkan dengan nama, benefit detail ditampilkan sebagai daftar terurut. Belum ada integrasi pemesanan/pembayaran atau galeri Paket publik pada tahap ini.

Build produksi, TypeScript dan lint seluruh file perubahan lulus. Validasi: 125 tes lokal lulus (termasuk payload/UUID/harga/benefit, API JWT, filter anak dan reset pilihan, serta editor urutan benefit). Migration SQL belum diuji pada engine PostgreSQL lokal karena tidak tersedia; penerapan dan CRUD Supabase memerlukan langkah SQL di atas.

## Filter publik Client dan Crew (5 November 2026, lanjutan)

Kedua template memakai pill putih dengan pilihan aktif hijau gelap. Client: Semua + Acara yang mempunyai testimoni terbit/berizin; awal 6 data, tombol Tunjukkan lebih banyak menambah 6 sampai habis, pergantian filter mengulang 6. Data lebih sedikit tetap tampil sesuai jumlah yang tersedia. Urutan terbaru memakai created_at, bukan sort_order manual. Data lama tanpa Acara tetap di Semua.

The Owner menjadi section tersendiri di atas The Crew, memakai tema masing-masing. Founder tidak masuk Crew atau pilihan Jabatan. Crew non-founder memakai filter Semua/Jabatan; badge jabatan tampil pada Semua. Style 1 memakai card foto/nama/biografi responsif. Owner dan Crew yang kosong tidak membuat section atau link navigasi kosong.

**Penerapan:** setelah migration 202611050001 sukses, jalankan seluruh `supabase/migrations/202611050002_public_gallery_order.sql` pada SQL Editor Supabase lalu deploy frontend terbaru ke Vercel. File 002 hanya memperbarui proyeksi baca public_content untuk created_at Client dan urutan Jabatan; tidak mengubah baris konten. Tidak perlu seed, secret baru, atau deploy ulang Edge Function. Migration belum dijalankan otomatis pada cloud.

Validasi lokal: 117 tes lulus, mencakup urutan tanggal, 6/12/18/sisa, reset saat pindah filter, jumlah kurang dari 6, pemisahan Owner dan jabatan tanpa founder. Build produksi dan lint file yang berubah lulus. Pratinjau Style 1/2 berhasil dibuka: Owner terpisah, Crew 5 anggota dapat difilter ke 1 Leader lalu kembali Semua; 2 Client existing tampil dan tombol tambah tidak muncul karena belum lebih dari 6. Client existing belum membawa relasi Acara pada data publik sehingga hanya Semua terlihat; uji multi-Acara/6-12-18 dilakukan dengan fixture lokal, bukan menambah konten cloud. Lint seluruh repo masih menemukan masalah di file bawaan yang tidak disentuh (jsvectormap.d.ts, CalendarEventModal, SidebarContext, ThemeContext, auth-boundary.test.mjs).

## Modul Acara dan Jabatan (5 November 2026)

Source menyediakan /admin/events dan /admin/positions. Kedua master memiliki form nama dan urutan, pencarian, pagination, detail/edit/hapus, serta izin read/create/update/delete sendiri. Nama unik tanpa membedakan huruf besar/kecil atau spasi luar; urutan integer >=0. Bukan role akun: Jabatan adalah posisi Crew, sementara role/permission pengguna tetap modul akses yang terpisah.

### Penerapan pada proyek Livina existing

1. Jalankan seluruh **migration baru** `migrations/202611050001_events_positions.sql` di SQL Editor Supabase. Jalankan sekali setelah migration 202610290001. Jangan menjalankan ulang pembuat schema atau seed produksi. Migration berada dalam transaksi; jika gagal, selesaikan pesan error sebelum deployment frontend.
2. Deploy source frontend terbaru ke Vercel (commit/push sesuai integrasi Git Anda). Tidak ada perubahan Edge Function, secret atau package baru untuk fitur ini. Refresh tab admin setelah penerapan.
3. Administrator dapat membuka Acara dan Jabatan. Untuk pengguna lain, atur izin baru events.read/create/update/delete dan positions.read/create/update/delete melalui Role Permission sesuai kebutuhan. Akun yang bisa membaca Crew/Client tetap dapat membaca pilihan master yang diperlukan tanpa otomatis memperoleh hak mengelola master tersebut.
4. Isi Acara beserta urutannya. Pada setiap Client, pilih satu Acara lalu simpan; data terbit dengan persetujuan akan masuk filter testimoni. Acara digunakan banyak Client. Pada Crew, pilih satu Jabatan dari dropdown; satu jabatan digunakan banyak Crew. Founder tetap checkbox terpisah, dengan batas satu founder existing.
5. Uji filter Semua dan setiap acara pada /style-1, /style-2 dan template terpilih di /. Hanya acara yang memiliki testimoni terbit ditampilkan sebagai filter, mengikuti sort_order Acara. Menghapus master yang masih dipakai ditolak FK; pindahkan Client/Crew ke master lain terlebih dahulu.

### Pelestarian dan kontrak data

Migration membuat posisi dari role_title Crew lama dan menghubungkan semua Crew melalui position_id. Varian nama dengan perbedaan case/spasi luar digabungkan. Tidak menghapus nama/profil/foto/penanda founder/status Crew, dan tidak membuat kategori acara fiktif untuk testimoni existing. Acara testimoni lama tetap null, tetap terlihat pada Semua. Saat menambah atau mengedit Client, pilihan Acara wajib diisi. CHECK NOT VALID melindungi baris baru/update tanpa menghapus baris lama yang belum diklasifikasikan.

role_title disimpan sebagai snapshot kompatibilitas, bukan input bebas. Trigger memperoleh namanya dari position_id. RPC list Crew dan proyeksi publik join ke nama Jabatan terkini; perubahan nama master langsung dipakai saat data dibaca ulang, tanpa mass-update konten terbit. Endpoint Crew juga memvalidasi dan membatasi payload, membuang role_title/account role/audit kiriman klien. Foto/video, consent publikasi, izin publish dan perlindungan founder tetap berlaku.

public_content memberi event_id, event_name dan event_sort_order untuk testimoni terbit yang mendapat persetujuan. Filter kedua template berbagi helper dan kontrol yang sama, dengan warna sesuai template, tombol aria-pressed, kontrol keyboard bawaan tombol, serta pengumuman jumlah hasil. Data tanpa acara tidak diberi kategori baru dan tetap muncul pada Semua. Pilihan master dibaca lewat REST ber-RLS, urut sort_order/name/id dan pagination, bukan daftar contoh hardcoded.

seed.sql sudah disesuaikan untuk fondasi baru tetapi tetap **opsional untuk proyek demo**; tidak perlu dijalankan pada proyek Anda yang sudah terisi.

### Verifikasi

Build produksi, typecheck dan lint file fitur yang diperiksa lulus; 113 tes lokal lulus, termasuk master payload/validasi, UUID relasi, batas izin/sesi, pagination pilihan, pesan penghapusan data terpakai, urutan acara, mempertahankan testimoni lama, dan klik filter pada kedua template. Migration/RLS/FK belum dieksekusi pada database cloud oleh agen; pengujian database setelah penerapan tetap diperlukan. Tidak ada akun, seed atau data cloud yang diubah agen.


## Task 4-5 selesai (30 Oktober 2026)

Style 1 menampilkan film_title sebagai blok h2 tersendiri sebelum section video, di luar lapisan sticky/mask. Teks tidak lagi absolute/menimpa video. Panjang teks dapat membungkus, tautan scroll menuju judul jika tersedia, dan animasi/loop video tetap dipertahankan. Style 2 tidak berubah.

Service tidak lagi meminta input slug manual. Judul otomatis dinormalisasi menjadi slug lowercase dengan tanda hubung, termasuk trimming, aksen dan tanda baca. Slug dibuat pada validasi/payload klien dan server, jadi request tambah tanpa slug tetap valid. Edit yang tidak mengubah judul mempertahankan slug existing; perubahan judul pada form membuat slug baru. API menangani benturan unique slug secara atomik memakai constraint database dan retry suffix -2 sampai -11, tanpa read/grant baru. Konflik lain dan kegagalan izin tidak diulang. Tidak ada data existing diregenerasi massal, SQL baru atau perubahan Edge Function.

Verifikasi: build produksi, lint fitur dan 104 tes lokal lulus. Tes meliputi teks di luar section video, title kosong, slug tanpa input, normalisasi judul, suffix collision, JWT/payload dan penolakan retry untuk kegagalan lain. CRUD Service di cloud tidak dilakukan agen. Deploy frontend terbaru di Vercel untuk domain produksi.


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
