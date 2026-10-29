# Pemeriksaan backend Livina — 24 Oktober 2026

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

Revisi publik terbaru: `weddingPageContent()` selalu memakai RPC `public_content`, tanpa fallback JSON/URL referensi. React cache hanya berbagi hasil dalam request SSR; request publik tetap no-store pada transport. `/` membaca `public_template` dan merender desain langsung tanpa mengubah URL. Upload crop tetap melalui signed upload dan worker existing, dengan pemantauan ID berkas baru sampai ready; tidak ada perubahan SQL atau aksi Edge untuk task upload/beranda. Build dan 68 tes lokal lulus. Pembacaan HTTP publik dilakukan tanpa mengubah data cloud.

Tindak lanjut: login sudah dikonfirmasi berhasil oleh pengguna. Edge Function menambahkan `change-password` dan `reset-password` melalui proxy ber-cookie dengan CSRF/origin guard. Reset khusus role admin sistem dan target selain diri sendiri; kedua aksi memverifikasi password aktor saat ini memakai Auth/limiter dan mencocokkan ID aktor. Target reset harus ada pada profil aplikasi. Update hanya berisi password melalui Auth API, tidak mengirim recovery email. Sesi reautentikasi sementara ditutup dan cookie aplikasi dicabut setelah ganti password sendiri berhasil. Source salinan paste harus di-deploy ulang; tidak ada SQL baru. 57 tes mock, typecheck Edge, lint fitur dan build lulus; password nyata belum diganti oleh agen.

Edge Function meneruskan email/password ke Auth tanpa `gotrue_meta_security` atau token CAPTCHA. Limiter akun/IP serta JWT/profil tetap diperiksa. Salinan `supabase/organizer-api-paste.txt` identik dengan source. Sesuai instruksi pengguna, CAPTCHA Auth perlu dimatikan lewat Authentication → Attack Protection → Enable Captcha protection → Save changes di proyek Supabase. Source lokal tidak mengubah konfigurasi Auth cloud tersebut; login nyata belum diuji ulang. 45 tes lokal dan typecheck Edge Function lulus.

## Pembaruan 26 Oktober 2026

Source admin lengkap kini tersedia. Migration tambahan (belum diterapkan) mempertahankan schema/akun existing, menambah founder unik, video client, judul film, tabel katalog/selector template, RPC template publik/pemilihan berizin dan mapping role-permission atomik. RLS fondasi tetap berlaku. API Next.js membatasi collection/field dan mutasi satu ID, menolak mutasi akun/hak akses oleh non-admin, serta meneruskan JWT user. Edge Function memverifikasi akun Auth existing ketika dihubungkan; kegagalan profil tidak lagi menghapus akun Auth. `/api/auth/activate` memverifikasi token/konteks sebelum mengubah kata sandi akun itu dan memasang cookie sesi. Tidak ada secret service role baru di Next.js.

`/api/wedding/content` adalah GET publik untuk kontrak JSON pratinjau atau proyeksi konten terbit; tidak membaca akun/admin. `WEDDING_CONTENT_SOURCE` menggantikan `WEDDING_CREW_SOURCE`. `seed.sql` opsional hanya mengisi draft, role editor dan mapping konten, tanpa akun Auth/password atau media palsu. Penerapan cloud, SMTP, policy/RPC runtime dan worker belum diuji agen. Panduan lengkap ada di `supabase/ADMIN-SETUP.md`.

Simulasi tim beranda: fixture `src/data/wedding/crew.json` menggunakan bentuk respons `{ meta: { source, total }, data: [...] }`, dibaca adapter server untuk keperluan desain atas instruksi pengguna. Tidak membuat endpoint palsu, menulis data cloud, atau mengubah CRUD admin. `photo_url` dan `is_founder` adalah field presentasi JSON; mode Supabase tetap memakai media UUID serta proyeksi publik yang sudah ada. Pilihan sumber diatur oleh environment server `WEDDING_CREW_SOURCE`.

Tidak ada migration baru. Next.js menambah endpoint `/api/auth/session`, `/api/auth/logout`, `/api/organizer/[...path]`, dan `/api/wedding/media/[id]`. Sesi HttpOnly diverifikasi melalui Auth dan RPC konteks, bukan hasil decode cookie. Jalur proxy hanya mengizinkan tabel/RPC/aksi yang dipakai modul; JWT pengguna diteruskan agar RLS tetap berlaku. Origin mutasi harus sama dengan origin aplikasi. Respons privat tidak dicache. Media publik diperiksa terhadap proyeksi `public_content` sebelum dibuatkan signed URL pendek dengan publishable key dan kebijakan Storage.

Enam unit test otorisasi memakai mock lokal: cookie palsu, perbedaan ID Auth/profil, konteks role tidak aktif, konteks sah, atribut cookie, serta penolakan origin asing. Tidak ada autentikasi menggunakan kredensial pengguna atau mutasi cloud yang dilakukan agen. Pengujian gateway IP, login akun nyata, refresh konkuren dan worker tetap diperlukan pada deployment. Catatan sessionStorage di riwayat sebelumnya telah digantikan cookie.

Pada awal pekerjaan repository hanya berisi template Next.js/TailAdmin; belum ada folder Supabase, koneksi cloud, atau source API Livina. Folder `D:/wedding-invitation/supabase` yang diinventaris serah-terima tersedia dan dibaca sebagai referensi source, bukan backend Livina aktif.

## Source yang disiapkan

Tiga migration fondasi, Edge Function, dan worker diadaptasi ke folder `supabase/` lokal. Tidak membawa `.env`, akun, data pelanggan, atau binary dari proyek lama. Fondasi menyediakan schema `organizer` dan `organizer_private`, UUID, Supabase Auth/profil, RBAC satu pengguna satu role, RLS, metadata media, bucket privat, limiter atomik, dan RPC daftar.

Migration `202610240001_crew.sql` menyediakan proyeksi publik eksplisit untuk anggota tim terbit serta lookup foto hanya jika direferensikan tim terbit. Validasi nama/peran/kata-kata dan FK sudah tersedia di migration fondasi. Field kata-kata tetap menggunakan `biography`; tidak membuat kolom duplikat. Foto opsional sesuai desain aktif.

Source lama diperbaiki pada validasi trigger lintas tabel, allowlist origin, validasi deskripsi unggah dan path worker yang semula mengarah backend Go. Optimasi foto tidak menolak sumber kecil hanya demi hasil lebih kecil. SQL/keamanan tetap memerlukan uji runtime pengguna; tinjauan source tidak membuktikan aman pada deployment.

Frontend memakai REST/Edge Function dengan key publik dan JWT sesi. Endpoint gambar Next.js hanya memakai key publik dan RLS; service_role hanya di Edge Function/worker. Login tidak memakai endpoint Auth langsung dari form; CAPTCHA/limiter native Auth tetap wajib dikonfigurasi untuk mencegah bypass aplikasi.

## Status

Tidak ada migration/seed/pengujian database, koneksi Supabase nyata, pengiriman email akun, worker konversi, atau deployment yang dijalankan agen. Skema dan endpoint dalam dokumen ini merupakan **source siap ditinjau**, bukan layanan aktif. Rincian setup dan matriks uji berada di `supabase/README.md`.

Pemeriksaan lokal yang berhasil: `tsc -p supabase/functions/tsconfig.json`, `node --check supabase/worker/media-worker.mjs`, serta enam unit test validasi frontend/payload di memori tanpa database. Ini tidak menguji efektivitas policy RLS, RPC SQL, limiter, IP gateway, transaksi admin terakhir, atau proses file sebenarnya.
