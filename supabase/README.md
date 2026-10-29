# Supabase Livina Wedding — modul The Crew

Pembaruan terakhir: foto 422 pada WebP berprofil ICC diperbaiki. Video baru memakai MP4 H.264 direct (20 MB/60 detik/Full HD) dengan poster lokal otomatis dan upload saat Simpan; tidak menunggu worker. Tidak ada SQL tambahan jika migration 202610290001 sudah sukses. Deploy ulang organizer-api dan frontend; lihat [panduan terbaru](ADMIN-SETUP.md).


## Panduan terbaru 29 Oktober 2026

Lihat [ADMIN-SETUP.md](ADMIN-SETUP.md) untuk langkah yang berlaku. Foto baru: pilih/crop lokal lalu upload saat Simpan, tanpa worker. Website satu form dengan beberapa kontak WhatsApp. Perlu migration 202610290001_direct_photos_website_contacts.sql lalu deploy organizer-api terbaru. Video masih memerlukan worker. Root / merender template langsung, semua konten dari Supabase, tanpa JSON fallback. Login tanpa CAPTCHA. Catatan historis di bawah tentang redirect, preview JSON, CAPTCHA, sessionStorage dan pustaka/upload foto worker telah digantikan.


## Admin lengkap — pembaruan 26 Oktober 2026

Panduan terbaru: [ADMIN-SETUP.md](ADMIN-SETUP.md). Source kini meliputi pengguna, role, permission, matriks role-permission, Crew, Client, Service, pengaturan website dan selector dua template. Gunakan migration tambahan `202610260001_admin_console.sql`, bukan menjalankan ulang pembuat schema lama; seed draft terpisah pada `seed.sql`. Pemilihan template mengatur redirect `/`, sedangkan `WEDDING_CONTENT_SOURCE` menentukan JSON pratinjau atau konten Supabase. Catatan di bawah merupakan tahap sebelumnya. SQL/seed/deployment cloud tetap dijalankan pengguna, belum dijalankan agen.

## Pembaruan 26 Oktober 2026

- Beranda publik lengkap berada di `/`, dengan arah visual Verve, animasi huruf/reveal/parallax, video bermask lingkaran dan URL media eksternal sementara sesuai permintaan pengguna. Data terbit pada `public_content` dipakai jika tersedia. Gambar referensi bukan testimoni Livina dan ditandai pada halaman.
- `/admin` adalah login. Sesudah login berhasil, pengguna diarahkan ke `/dashboard`. Semua halaman grup `(admin)`, termasuk `/admin/crew` dan contoh template, diperiksa pada server. Tidak ada bypass pratinjau untuk pengunjung tanpa sesi.
- Sesi memakai `livina-access` dan `livina-refresh`, cookie HttpOnly/SameSite=Lax, Secure pada produksi. Identitas diperiksa melalui `/auth/v1/user` dan akun/role aktif melalui `session_context`. Keberadaan cookie saja tidak memberi akses. API `/api/organizer/*` memeriksa sesi dan meneruskan JWT pengguna; key service_role tidak ditambahkan ke Next.js.
- Login browser tetap melalui Edge Function existing agar CAPTCHA dan limiter tetap diperiksa pada jalur yang sama. Token hasil login dipertukarkan menjadi cookie melalui `/api/auth/session`; token tidak lagi disimpan di sessionStorage. Refresh ditangani server melalui endpoint sesi/API; jika token halaman sudah kedaluwarsa, halaman login mencoba memulihkan sesi sebelum meminta login ulang. Keluar mencabut sesi dan cookie. Mutasi API menolak origin asing.
- Pengguna melaporkan sudah menyiapkan schema, akun administrator dan function. Agen belum mencoba kredensial akun atau mengeksekusi migration/data cloud. Konfigurasi `ORGANIZER_TRUSTED_IP_HEADER` masih harus diverifikasi sebelum login dinyatakan bekerja pada deployment.
- Untuk Vercel, isi tiga variabel `NEXT_PUBLIC_*` pada environment proyek, tambahkan origin produksi ke `ORGANIZER_ALLOWED_ORIGINS`, dan hostname produksi pada Turnstile. Worker FFmpeg tetap berjalan terpisah dari frontend/Edge Function.

Bagian awal 24 Oktober di bawah merupakan catatan implementasi sebelumnya; mekanisme sesi/pratinjau mengikuti pembaruan ini.

Source disiapkan pada 24 Oktober 2026. Belum diterapkan ke Supabase; tidak ada migration, seed, pengujian data, atau deployment yang dijalankan agen. Jangan gunakan proyek, akun, bucket, atau environment wedding-invitation.

## Yang tersedia

- `/admin/crew`: layout TailAdmin existing, login Supabase, daftar/tambah/detail/edit/hapus anggota. Pencarian nama/posisi, filter status, sort allowlist, pagination server 10/25/50/100, urutan tampil dan draft/terbit.
- Tanpa environment Supabase, daftar kosong dan form dapat ditinjau dalam mode pratinjau; penyimpanan/unggah dinonaktifkan. Tidak memakai localStorage sebagai pengganti database dan tidak mengarang anggota.
- `/the-crew`: halaman publik tanpa layout admin, menampilkan nama, posisi, kata-kata, dan foto anggota terbit. `CrewSection` dapat dipasang pada beranda Livina ketika beranda dibangun. Beranda demo template belum diganti.
- Foto opsional; jika belum ada atau tidak dapat dimuat, tampil inisial. Tidak ada profil, foto, atau testimoni pelanggan contoh.
- Unggah foto sumber, antrean worker, pustaka foto dengan pencarian/pagination. Foto `ready` dengan deskripsi dapat dipilih; foto terpakai dilindungi FK dan tidak dihapus saat anggota dihapus.

## Asal dan cakupan backend

Tiga migration 20261017, Edge Function dan worker diadaptasi dari source organizer lama yang disebut paket serah-terima. Source lama hanya dibaca; tidak ada environment, data, binary FFmpeg, atau kredensial yang disalin. Fondasinya mencakup tabel organizer lain untuk pengembangan berikutnya; antarmuka baru pada pekerjaan ini hanya The Crew.

Penyesuaian Livina: validasi trigger konten tidak membaca field testimoni pada tabel tim, daftar origin kosong ditolak, deskripsi foto divalidasi server, path FFmpeg lama dihilangkan, sumber gambar yang sudah kecil tidak ditolak hanya karena WebP sedikit lebih besar, dan RPC publik The Crew memakai proyeksi eksplisit.

## Penyiapan oleh pengguna

1. Sediakan proyek Supabase khusus Livina. Tinjau empat migration dalam `migrations/` sesuai urutan nama. **Jalankan sendiri hanya pada proyek Livina yang sesuai.** Tiga migration pertama membuat schema baru dan bukan migration idempoten. Bila sudah ada schema `organizer`, audit/gabungkan terlebih dahulu.
2. Pada pengaturan Data API, tambahkan `organizer` sebagai exposed schema. Jangan expose `organizer_private`. Seluruh tabel menggunakan RLS; anon tidak mendapat akses tabel langsung.
3. Buat administrator melalui Supabase Auth Dashboard. Salin dan sesuaikan `bootstrap-admin.sql.example`, periksa UUID/nama serta hasil satu baris. Tidak ada password atau akun awal dalam source.
4. Deploy Edge Function `organizer-api` melalui CLI/Dashboard Anda. Bagian `config.toml` menonaktifkan pemeriksaan JWT gateway agar login dapat dijangkau; function memverifikasi identitas untuk tindakan selain login.
5. Atur secret Edge Function: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` (legacy anon JWT bawaan), `ORGANIZER_ALLOWED_ORIGINS` (origin persis, dipisah koma), `ORGANIZER_LOGIN_HMAC_SECRET` (acak minimal 32 karakter), dan `ORGANIZER_TRUSTED_IP_HEADER`.
6. Header IP wajib berasal dari gateway tepercaya yang **menimpa/menghapus header kiriman klien**. Jangan sekadar memilih `x-forwarded-for` tanpa memastikan perilaku gateway. Login sengaja ditolak 503 bila konfigurasi IP/HMAC tidak tersedia. Limiter akun/IP atomik disiapkan di SQL; konfigurasi serta uji gateway tetap diperlukan.
7. Nonaktifkan pendaftaran publik bila hanya akun undangan/admin yang boleh masuk. Aktifkan CAPTCHA Turnstile dan rate limit Supabase Auth untuk melindungi endpoint Auth langsung. Konfigurasikan Site URL/redirect dan provider CAPTCHA di Dashboard. Domain lokal/produksi harus terdaftar pada Turnstile.
8. Salin `.env.example` menjadi `.env.local`, isi `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, dan `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Hanya URL, publishable key dan site key boleh publik. Jangan isi `service_role`/secret di variabel `NEXT_PUBLIC_*`. Mulai ulang Next.js sesudah mengubah environment.
9. Jalankan worker pada host sendiri yang memiliki Node >=20.9, FFmpeg dan FFprobe dengan encoder `libwebp`/`libx264`. Tidak ada binary atau package baru dipasang. Default binary dari PATH; atau atur `FFMPEG_PATH` dan `FFPROBE_PATH`. Isi `SUPABASE_URL` serta `SUPABASE_SERVICE_ROLE_KEY` di environment **worker**, lalu `node supabase/worker/media-worker.mjs` (atau `--once` untuk satu antrean). Jangan memasukkan secret worker ke frontend.

Storage saja tidak mengubah foto menjadi WebP. Tanpa worker, foto akan tetap menunggu diproses dan tidak bisa dipakai pada profil. Worker menyimpan sumber di bucket privat, memeriksa file nyata, menghapus metadata dan menghasilkan WebP dengan sisi panjang <=1920. Target 100–300 KB mengikuti kualitas; source 5 MB/20 MP. Source worker video ikut tersedia sebagai fondasi, belum menjadi fitur UI The Crew.

Untuk pratinjau lokal gunakan `npm run dev -- --hostname localhost`, lalu buka `/admin/crew` atau `/the-crew`. Pada pemeriksaan versi Next.js ini, bind eksplisit ke `127.0.0.1` menimbulkan loop redirect karena origin rewrite next-intl menjadi `localhost`; bind `localhost` berhasil tanpa mengubah kebijakan locale atau memasang dependency.

## Akses dan kontrak

- Satu akun mempunyai satu role melalui `organizer.users.role_id`. Role admin sistem mengakses semua permission; role editor awal kosong.
- Pengelola tim memerlukan `team_members.read/create/update/delete` sesuai tindakan. Tambahkan `team_members.publish` untuk menerbitkan, menarik ke draft, atau mengubah/menghapus profil yang sedang terbit. Pilih foto memerlukan `media.read`; unggah memerlukan `media.create`. Mapping diberikan pemilik melalui database/dashboard; belum ada UI role pada pekerjaan ini.
- CRUD memakai PostgREST dengan JWT pengguna, bukan service key. RLS dan trigger memeriksa akses dan status akun/role. Payload UI hanya field konten; timestamp/audit diisi trigger.
- Login melalui Edge Function yang memanggil limiter lalu Supabase Auth. Sesi disimpan di `sessionStorage` tab dengan nama khusus Livina, otomatis refresh sebelum kedaluwarsa, dan dihapus saat keluar. Tidak ada pendaftaran publik pada halaman The Crew.
- Daftar memakai `organizer.list_data`: `{data, meta}` dengan `page`, `per_page`, `total_data`, `total_pages`, `has_previous_page`, `has_next_page`. Filter/search/per_page mengembalikan halaman ke 1. Total dihitung setelah filter; ID menjadi pembeda akhir urutan.
- Publik memakai `public_crew` dan `public_crew_photo`, tidak mengirim field audit atau sumber media. Endpoint `/api/crew/photo/[id]` memeriksa bahwa foto direferensikan profil terbit, lalu membuat redirect signed URL TTL 60 detik dengan publishable key dan kebijakan RLS Storage. URL baru dibuat saat gambar diminta sehingga lazy-loading tidak memakai URL yang telah kedaluwarsa. Respons aplikasi `no-store`; signed URL yang sudah terbit tetap berlaku sampai TTL habis.
- Semua konten berupa teks biasa; JSX melakukan escaping. Foto memakai referensi media UUID, bukan URL bebas.

## Verifikasi yang harus dilakukan pengguna setelah konfigurasi

- Terapkan SQL pada lingkungan uji Livina, periksa constraint/RLS/grant; coba akses anonim, akun nonaktif, role tanpa izin, dan pengguna dengan permission terbatas melalui API langsung.
- Tambah/edit/detail/hapus profil draft; terbitkan dan tarik kembali; pastikan draft/audit/akun tidak muncul di RPC publik. Coba mengedit atau menghapus profil terbit tanpa permission publish.
- Uji foto valid/rusak/terlalu besar, orientasi, transparansi, ready/gagal, worker mati/retry, deskripsi foto, dan penggantian foto; pastikan Storage sumber privat serta FK menolak penghapusan foto terpakai.
- Uji limiter akun/IP, CAPTCHA, spoof header, endpoint Auth langsung, refresh token, logout, dan proteksi admin terakhir termasuk transaksi bersamaan.
- Uji lebih dari satu halaman, filter tanpa hasil, urutan nama sama, penghapusan baris terakhir suatu halaman, serta pencarian cepat; periksa desktop dan mobile 320 piksel.

Build/typecheck lokal tidak membuktikan SQL, Auth, Storage, kompresi, atau deployment berhasil. Catatan hasil lokal ada di `stering/pemahaman-frontend.md` dan `stering/pemahaman-backend.md`.

Referensi resmi: [API key](https://supabase.com/docs/guides/getting-started/api-keys), [CAPTCHA Auth](https://supabase.com/docs/guides/auth/auth-captcha), [akses Storage](https://supabase.com/docs/guides/storage/serving/downloads).
