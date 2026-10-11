# Absensi Mimici Client

## Menjalankan lokal

Jalankan backend dari `server` dengan `npm run dev`, lalu frontend dari `client` dengan `npm run dev`. Vite meneruskan request `/api` ke backend lokal pada port `5001`.

API client menggunakan path relatif `/api` secara default. Jika backend produksi berada pada origin/path API berbeda, set `VITE_API_BASE_URL` saat build, misalnya `https://api.example.invalid/api`; jangan memasukkan credential ke variabel frontend.

## URL aplikasi

- Karyawan: `/`, `/absensi`, `/riwayat`, `/pengajuan`, `/profil`.
- Admin: `/admin`, `/admin/cabang`, `/admin/rekap-bulanan`, `/admin/pengajuan`.

Pada layar ponsel, navigasi sidebar diganti tombol menu hamburger di bagian atas; dropdown berisi semua menu sesuai peran dan menutup setelah pilihan atau tombol Escape.

Untuk deployment Vercel, atur Root Directory ke `client`. `vercel.json` mem-rewrite route aplikasi ke SPA entry point tanpa menangkap path `/api`. Agar satu domain melayani API di Vercel, deployment backend/reverse proxy perlu menyediakan `/api/*` pada domain yang sama; jika backend berbeda origin, set `VITE_API_BASE_URL` saat build. Konfigurasi ini tidak mengarang host backend production.

Menu rekap bulanan hanya terlihat untuk admin. Halaman mengambil pratinjau seluruh cabang dari API admin terautentikasi dan mengunduh satu workbook `.xlsx` per bulan. Rekap memuat absensi aktual dan satu catatan per hari untuk setiap izin/sakit yang disetujui, termasuk nama, tanggal, status, serta alasan. Pada halaman pengajuan admin, **Lihat** membuka detail permohonan izin/sakit dan perubahan jadwal; admin dapat memberi catatan serta menyetujui atau menolak permohonan yang masih menunggu. Keputusan perubahan jadwal tidak mengubah jadwal kerja secara otomatis.
