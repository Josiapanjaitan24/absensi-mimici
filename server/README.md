# Panduan Sistem Absensi Mimici

Panduan ini menjelaskan penggunaan aplikasi oleh karyawan dan admin. Sistem tidak menyediakan registrasi mandiri: akun harus disiapkan oleh pengelola dan menggunakan data yang tersimpan di database.

## 1. Mulai sebagai karyawan

### Persiapan akun

Sebelum masuk, pastikan akun telah dibuat oleh operator menggunakan prosedur [Membuat akun karyawan](#4-membuat-akun-karyawan), lalu terima nama pengguna dan kata sandi melalui kanal yang aman. Akun harus aktif dan terhubung dengan profil karyawan aktif. Jika belum memiliki akses atau login gagal, hubungi admin; jangan membuat akun sendiri.

### Masuk dan navigasi

1. Buka alamat aplikasi yang diberikan pengelola. Untuk penggunaan lokal, lihat bagian [Menjalankan aplikasi lokal](#menjalankan-aplikasi-lokal).
2. Masuk melalui halaman awal menggunakan akun karyawan.
3. Gunakan menu berikut:
   - **Beranda** (`/`) untuk membuka ringkasan akun dan riwayat absensi terbaru.
   - **Absensi** (`/absensi`) untuk memilih salah satu dari enam cabang dan mencatat masuk atau pulang.
   - **Riwayat** (`/riwayat`) untuk melihat catatan absensi yang tersimpan.
   - **Pengajuan** (`/pengajuan`) untuk mengirim pengajuan izin/sakit atau perubahan jadwal.
   - **Profil** (`/profil`) untuk melihat profil akun.
4. Pilih **Keluar** setelah selesai menggunakan akun, terutama pada perangkat bersama.

### Memilih cabang dan melakukan absensi

1. Buka **Absensi**, pilih Pakuan, Botani, Azimar, ATS, Warung Nangka, atau Ciapus. Halaman cabang langsung meminta izin kamera.
2. Ambil foto. Foto digunakan di perangkat sebagai langkah verifikasi dan tidak dikirim atau disimpan.
3. Setelah foto, browser meminta lokasi perangkat. Backend membandingkan koordinat aktual dengan koordinat cabang di database.
4. Jarak sampai dengan 100 meter diterima; jarak lebih dari 100 meter ditolak. Absen pertama pada cabang/tanggal menjadi absen masuk, absen berikutnya menjadi absen pulang.
5. Tunggu konfirmasi server dan periksa hasilnya di **Riwayat**.

Lokasi validasi menggunakan koordinat titik cabang yang diambil dari tautan Google Maps yang diberikan. Sebelum memakai absensi tanpa jadwal di deployment lain, jalankan migrasi `server/migrations/20261011_branch_attendance.sql` pada database yang dituju. Migrasi menambahkan kolom absensi cabang/karyawan/tanggal/jam yang belum ada, mengisi data lama dari jadwal, membuat `absensi.id_jadwal` nullable, dan mengisi koordinat enam cabang hanya bila koordinatnya masih kosong.

### Mengirim pengajuan

- Pada **Pengajuan**, pilih izin atau sakit, isi tanggal dan alasan yang diminta, lalu kirim.
- Untuk perubahan jadwal, isi informasi perubahan dan jadwal terkait jika diminta.
- Pengajuan yang berhasil disimpan berstatus **menunggu persetujuan**. Pengajuan belum dianggap disetujui dan perubahan jadwal belum berlaku sampai diproses admin.
- Periksa daftar pengajuan pada halaman yang sama untuk melihat statusnya.

## 2. Menggunakan akses admin

Masuk dengan akun admin melalui `/admin`. Halaman dan endpoint admin dilindungi oleh autentikasi serta pemeriksaan peran di backend.

- **Dashboard** (`/admin`) menampilkan ringkasan yang tersedia dari database. Nilai kosong atau nol bukan data perkiraan.
- **Cabang** (`/admin/cabang`) menampilkan nama, slug, radius GPS, dan status aktif. Admin dapat mengubah status atau radius (1–100 meter). Jangan menambahkan koordinat GPS berdasarkan perkiraan; gunakan hanya koordinat yang telah diverifikasi.
- **Pengajuan** (`/admin/pengajuan`) menampilkan daftar pengajuan izin/sakit dan perubahan jadwal yang dikirim karyawan. Admin dapat membuka **Lihat**, menambahkan catatan, lalu menyetujui atau menolak pengajuan yang masih menunggu. Keputusan perubahan jadwal memperbarui status permohonan saja; jadwal kerja tidak diubah otomatis.
- **Rekap Bulanan** (`/admin/rekap-bulanan`) menampilkan pratinjau hingga 20 catatan untuk seluruh cabang dan mengunduh satu file Excel per periode. Rekap mencakup absensi yang tercatat (termasuk absensi cabang tanpa jadwal) serta satu baris per tanggal dari pengajuan izin/sakit yang telah disetujui; jadwal tanpa catatan tidak otomatis dijadikan alfa.

Endpoint laporan, untuk integrasi atau pemeriksaan oleh admin terautentikasi:

- `GET /api/admin/rekap-bulanan?bulan=10&tahun=2026` mengambil pratinjau seluruh cabang.
- `GET /api/admin/rekap-bulanan.xlsx?bulan=10&tahun=2026` mengunduh satu file Excel seluruh cabang.

Bulan harus 1–12 dan tahun menggunakan empat digit. Jika tidak ada catatan untuk filter yang dipilih, pratinjau menampilkan kondisi kosong dan unduhan tidak dibuat.

## 3. Menjalankan aplikasi lokal

Pastikan dependensi sudah terpasang dan konfigurasi koneksi database yang disediakan untuk lingkungan lokal telah disiapkan. Jangan menaruh kredensial di source code, README, atau argumen perintah.

Jalankan backend dari terminal pertama:

```sh
cd server
npm install
npm run dev
```

Jalankan frontend dari terminal kedua:

```sh
cd client
npm install
npm run dev
```

Buka alamat lokal yang ditampilkan oleh Vite (umumnya `http://localhost:5173`). Vite meneruskan request `/api` ke backend lokal pada port `5001`. Backend juga menyediakan `GET /`, `GET /api/health`, dan `GET /api/cabang`.

Untuk lingkungan production, frontend menggunakan `/api` secara default. Jika API berada di origin atau path lain, atur `VITE_API_BASE_URL` saat build/deployment. Jangan memasukkan rahasia ke variabel frontend karena nilainya dapat terlihat oleh browser. Pada deployment Vercel, atur Root Directory ke `client` dan sediakan routing backend `/api/*` pada domain yang sama atau tetapkan API base URL yang sesuai.

## 4. Membuat akun karyawan

Pembuatan akun karyawan dilakukan operator melalui terminal server, bukan endpoint pendaftaran publik. Dari folder `server`, jalankan:

```sh
npm run bootstrap:karyawan
```

Skrip akan memeriksa struktur aktual tabel `pengguna` dan `karyawan` sebelum membuat akun. Ikuti prompt untuk nama pengguna, nama lengkap, kode karyawan dan ID cabang utama jika kolom tersebut tersedia, lalu masukkan kata sandi dua kali. Password tidak ditampilkan atau diberikan sebagai argumen perintah. Gunakan kata sandi sekurangnya 12 karakter dan maksimal 72 byte.

Skrip hanya mendukung kolom yang sudah diketahui aplikasi. Jika database memiliki kolom wajib tambahan atau skema berbeda, proses berhenti tanpa membuat akun; minta pengelola meninjau skema dan sesuaikan implementasi terlebih dahulu. Jika ID cabang dimasukkan, cabang harus ada dan aktif. Username/kode yang bentrok atau kegagalan pembuatan profil akan membatalkan seluruh transaksi. Akun `pengguna` dan profil `karyawan` dibuat bersama, sama-sama aktif, dan role ditetapkan `karyawan` oleh skrip.

Perintah ini membuat akun untuk orang yang sudah memiliki data karyawan yang valid sesuai kebutuhan operasional. Skrip tidak membuat jadwal, koordinat, cabang, atau data absensi.

## 5. Membuat admin pertama

Pembuatan admin pertama adalah tugas operator database dan bukan pendaftaran publik. Jalankan dari folder `server` di terminal interaktif yang terhubung ke database yang memang dituju:

```sh
npm run bootstrap:admin
```

Masukkan nama pengguna saat diminta, lalu ketik kata sandi dua kali. Kata sandi tidak ditampilkan, tidak diberikan sebagai argumen perintah, dan hanya disimpan sebagai hash bcrypt. Gunakan kata sandi sekurangnya 12 karakter (maksimal 72 byte). Proses menolak bootstrap jika akun admin sudah ada.

Bootstrap hanya membuat akun pada tabel `pengguna`; proses ini tidak membuat profil karyawan, tidak mengubah skema, dan tidak mengisi data operasional. Jangan menjalankan perintah ini pada database yang salah dan jangan mencatat password di file atau log.

## 6. Batasan dan keamanan penggunaan

- Jangan membagikan kata sandi atau membiarkan sesi terbuka pada perangkat bersama.
- Login membutuhkan akun yang valid dan aktif; menu yang terlihat bukan pengganti otorisasi backend.
- Data jadwal, cabang, koordinat, absensi, dan pengajuan harus berasal dari data yang diverifikasi. Jangan menganggap contoh dokumentasi sebagai data operasional.
- Jika terjadi masalah, catat halaman, waktu kejadian, dan pesan error yang aman untuk dibagikan. Jangan mengirim token, password, file konfigurasi rahasia, atau kredensial database.
