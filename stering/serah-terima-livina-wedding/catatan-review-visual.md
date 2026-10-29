# Catatan Peninjauan Visual Livina

Tanggal: 26 Oktober 2026. Referensi: https://verveorganizer.com/.

## Pembaruan konten dan admin

Kedua style kini memakai provider JSON yang sama untuk hero, layanan, crew dan testimoni, dengan pilihan sumber Supabase untuk produksi. Foto Style 2 diperkecil (founder 224 × 280 dan anggota 160 × 200 pada desktop). Hover crew Style 1 tetap menampilkan foto di tengah pointer, sementara lingkaran kursor disembunyikan; pemeriksaan browser memastikan foto terlihat dan opacity lingkaran nol. Dialog testimoni memakai foto, kutipan dan ulasan contoh dari JSON serta mendukung video client bila tersedia. Screenshot lama di bawah mendahului revisi ukuran foto/kursor ini.

Modul admin sudah tersedia pada source, tetapi browser belum login dengan akun nyata. Peninjauan privat berhenti di halaman login dengan CAPTCHA; tidak ada klaim pengujian visual CRUD terautentikasi. Build produksi, lint source fitur dan 32 tes lokal lulus. Panduan penerapan ada di `supabase/ADMIN-SETUP.md`.

## Varian desain kedua

Pengguna meminta `/style-2` dengan konten sama dan gaya mewah modern yang berbeda. Implementasi memakai ivory/espresso/champagne, tipografi serif editorial, gambar lengkung, navigasi sticky, layanan yang dipilih untuk mengganti detail, profil founder besar, foto tim langsung terlihat dan galeri dua kolom asimetris. Animasi memakai reveal mask/fade/zoom yang berbeda dari style-1. Sumber data tidak diduplikasi.

Pemeriksaan awal: build produksi dan lint komponen baru lulus; halaman `/style-2` 200. Browser memverifikasi pergantian layanan, pembukaan/penutupan galeri, foto empat profil termuat, dan menu ponsel menutup setelah navigasi. Layar desktop 1440 px dan ponsel 320 px diperiksa tanpa overflow horizontal (konten mengikuti lebar viewport setelah scrollbar). Screenshot hero desktop tersimpan pada `livina-style-2-preview.png`.

## Arahan pengguna

- Peninjauan dimulai dari website referensi di browser dalam aplikasi. Pengguna melakukan scroll dan mencoba interaksi, kemudian menunjukkan bagian yang perlu dicatat.
- Livina mempunyai satu founder. Founder ditampilkan paling atas, disusul anggota tim.
- Setiap profil memuat nama, posisi, kata-kata, dan foto yang muncul saat profil disorot, mengikuti interaksi bagian “The Visionary Founder / VERA” pada referensi.

## Status

- Tab referensi telah dibuka untuk peninjauan bersama.
- Source Livina saat ini menampilkan baris anggota sesuai urutan data publik; belum ada penandaan founder tersendiri. Efek foto hover/fokus sudah tersedia pada desktop, dan foto tampil langsung pada ponsel.
- Identitas founder Livina belum disebutkan. Nama atau identitas founder tidak ditetapkan dari tebakan.
- Rincian gerakan, posisi foto, dan temuan tambahan menunggu peninjauan pengguna. Catat temuan yang benar-benar diamati, kemudian cocokkan dengan Livina sebelum melakukan penyesuaian.

## Temuan saat referensi ditinjau ulang

Revisi setelah masukan pengguna: desktop kini sejajar (posisi, nama, bio), tanpa `|`. Foto berpusat pada kursor, radius 15px dan berada di bawah teks. Profil lain bergeser 28px ke kiri dan meredup ke opacity 0,22, kemudian kembali ke opacity 1/transform none. Nilai radius, lapisan teks/foto 20/10, efek redup/geser dan pemulihan diperiksa di browser. Tampilan ponsel 320 px tetap tanpa overflow horizontal (viewport/konten 305 px setelah scrollbar). Ini menggantikan susunan desktop vertikal pada riwayat di bawah.

Tindak lanjut sudah diimplementasikan pada Livina: profil rata tengah, founder di urutan pertama, foto melayang mengikuti kursor dengan animasi geser. Data contoh berasal dari JSON sesuai instruksi lanjutan pengguna. Catatan source lama di bawah merupakan keadaan sebelum penyesuaian ini.

Verifikasi perubahan: build produksi dan lint file yang berubah lulus. JSON diperiksa memiliki tepat satu founder, total yang sesuai, ID unik, dan URL foto HTTPS. Browser memuat keempat foto (naturalWidth 640), menampilkan founder di awal, serta memverifikasi fokus keyboard dan Escape. Pada viewport 320 px, ketukan membuka dan menutup foto inline; lebar konten sama dengan viewport (305 px setelah scrollbar), tanpa overflow horizontal. Pratinjau desktop: `livina-crew-preview.png`.

- Pada lebar browser 734 px, setiap profil tersusun vertikal dan rata tengah: posisi/julukan di atas, nama kapital yang lebih besar di tengah, lalu kata-kata di bawah. Founder Vera adalah baris pertama, kemudian Albert dan anggota lainnya. Tidak ada kartu founder terpisah pada tampilan ini.
- Antarprofil diberi ruang cukup luas dan pemisah horizontal tipis, dengan latar hitam dan teks putih.
- Elemen foto referensi menggunakan lapisan `hover-reveal` berposisi fixed, berukuran 240 × 320 px pada viewport yang diperiksa. Gambar berada dalam pembungkus ber-overflow hidden, dengan transform horizontal untuk animasi masuk/keluar. Koordinat lapisan berubah sesuai posisi penunjuk; ini berbeda dari foto Livina yang sekarang ditempatkan tetap pada baris profil.
- Source Livina saat ini memakai grid tiga kolom pada desktop. Susunan dan perilaku foto perlu dicocokkan lagi dengan referensi sebelum penyesuaian; pengamatan viewport 734 px ini tidak dianggap sebagai bukti susunan pada semua ukuran desktop.
- Saat pengamatan pengguna sedang menggulir/mencoba halaman. Jangan mengambil alih scroll ketika pengguna masih melakukan demonstrasi.
