# Pemeriksaan frontend Livina — 24 Oktober 2026

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
