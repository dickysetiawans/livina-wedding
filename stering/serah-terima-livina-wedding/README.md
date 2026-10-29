# Serah-terima project livina-wedding

Koreksi pemilik pada 22 Oktober 2026: website yang meniru arah tampilan https://verveorganizer.com/ adalah **livina-wedding**, bukan wedding-invitation. Backend memakai proyek Supabase tersendiri untuk PostgreSQL, Auth, teks konten dan Storage foto/video. Panel admin memakai TailAdmin yang tersedia pada project tujuan; periksa dahulu source/versinya. Lokasi folder project Livina belum diberikan atau diperiksa.

## Yang perlu dibawa

Pilihan yang disarankan: salin seluruh folder ini ke `stering/` pada project livina-wedding. Jadikan `panduan-pengembangan.md` dan `design-table.md` di folder ini sebagai bahan untuk panduan utama project tujuan. Bila kedua file sudah ada di tujuan, gabungkan setelah membaca isinya; jangan menimpa.

Dengan dua dokumen aktif ini saja kebutuhan inti sudah cukup untuk membuat ulang implementasi di project yang benar. Arsip membantu menelusuri keputusan dan source lama, tetapi bukan aturan yang otomatis berlaku. Tidak perlu membawa backend Go, database.sql, .env, uploads, akun, data pelanggan, atau seluruh frontend wedding-invitation.

## Source lama yang opsional dipakai ulang

Semua lokasi di bawah relatif terhadap `D:/wedding-invitation`. File tersebut belum disalin ke project tujuan dan belum dihapus dari repository lama.

| Lokasi | Yang tersedia | Tindakan di Livina |
| --- | --- | --- |
| `supabase/migrations/` | Tiga SQL: tabel/RBAC/RLS; API/Storage/limiter; klaim worker/grant | Audit SQL dan kebutuhan baru dahulu; jalankan hanya ke Supabase Livina setelah pengguna menentukan penerapannya |
| `supabase/functions/` dan `supabase/config.toml` | Edge Function login, invitation akun, unggah, preview dan penghapusan media | Sesuaikan Auth, secrets, origin, gateway IP dan konfigurasi project tujuan |
| `supabase/worker/` | Worker Node/FFmpeg untuk WebP, MP4 dan poster | Sesuaikan path binary; path default menunjuk backend-go project lama, bukan dependency Livina |
| `supabase/README.md`, `supabase/verification.md`, `supabase/bootstrap-admin.sql.example` | Setup dan daftar uji manual | Bahan referensi, bukan bukti deployment atau runtime berhasil |
| `frontend-new/src/organizer/` | api.ts, modules.ts, Captcha.tsx dan OrganizerApp.tsx | Adaptasi ke TailAdmin Livina, audit auth/route/style; tidak disalin buta karena mengimpor ThemeContext/style project lama |
| `frontend-new/.env.organizer.example` | Nama variabel frontend tanpa nilai rahasia | Gunakan URL/publishable key Supabase Livina; jangan membawa .env lama |
| `frontend-new/src/main.tsx` | Dua perubahan integrasi: import OrganizerApp dan cabang route /organizer | Contoh integrasi saja; jangan menimpa main.tsx project Livina |

Source tersebut pernah lolos build frontend dan pemeriksaan TypeScript/sintaks pada repository lama. SQL belum dieksekusi, API/Auth/Storage belum diuji ke Supabase nyata, worker belum diuji mengonversi media, dan mobile belum diverifikasi di browser. Website publik yang mirip Verve **belum dibuat**; source lama baru menyediakan backend/panel organizer. Jangan menganggap cukup memindahkan source untuk memperoleh tampilan referensi.

## Instruksi untuk chat di project yang benar

> Ini project livina-wedding, terpisah dari wedding-invitation. Baca panduan-pengembangan.md dan design-table.md dari paket serah-terima ini serta aturan/source aktual project tujuan. Buat website publik Livina dengan arah tampilan, struktur konten dan animasi referensi https://verveorganizer.com/, panel TailAdmin, serta backend Supabase/PostgreSQL/Auth/Storage milik Livina. Kelola teks/foto/video sebagai data nyata. Audit source organizer lama bila tersedia, gunakan ulang bagian yang cocok dan buat ulang bagian yang belum ada. Jangan hubungkan ke database/API/data wedding-invitation. Laporkan mana yang baru source dan mana yang sudah terverifikasi runtime. Jangan menganggap arsip sebagai hasil pemeriksaan project Livina.

Setelah membuka project Livina, path dan source tujuan perlu diperiksa sebelum coding. Tidak perlu mengulang penjelasan kebutuhan dari awal jika paket ini tersedia.
