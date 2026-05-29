# 🐳 Panduan Deployment OpenWA dengan Docker & MySQL (Ubuntu Server)

Panduan ini dibuat khusus untuk memudahkan Anda men-deploy **OpenWA** ke server Ubuntu Anda dengan database **MySQL** eksternal dan konfigurasi **Docker Network**.

---

## 1. Persiapan Environment (`.env`)

Buat file `.env` di direktori root project server Anda. Salin template di bawah ini dan sesuaikan dengan konfigurasi MySQL serta port yang ingin Anda gunakan:

```env
# ===== PORT CONFIGURATION =====
API_PORT=2785
DASHBOARD_PORT=2886

# ===== DATABASE CONFIGURATION (MYSQL) =====
DATABASE_TYPE=mysql
DATABASE_HOST=nama-container-mysql-anda  # Contoh: "mysql-db" atau IP Server
DATABASE_PORT=3306
DATABASE_NAME=openwa_db
DATABASE_USERNAME=user_mysql_anda
DATABASE_PASSWORD=password_mysql_anda
DATABASE_SYNCHRONIZE=true               # Otomatis membuat & meng-alter tabel secara aman

# ===== DOCKER NETWORK ECOSYSTEM =====
# Tentukan nama Docker Network eksternal tempat MySQL Anda berjalan
EXTERNAL_NETWORK=mysql-network
```

---

## 2. Docker Network Setup

Agar container **OpenWA API** dapat berkomunikasi dengan container **MySQL** Anda, keduanya harus berada dalam jaringan (network) yang sama.

Jika MySQL Anda berjalan di dalam container Docker lain:
1. Pastikan Anda sudah tahu nama network tempat MySQL tersebut berjalan (misalnya `mysql-network`).
2. Jika belum ada network bersama, Anda bisa membuatnya secara manual terlebih dahulu:
   ```bash
   docker network create mysql-network
   ```
3. Hubungkan container MySQL Anda ke network tersebut jika belum:
   ```bash
   docker network connect mysql-network nama-container-mysql-anda
   ```

---

## 3. Langkah-Langkah Deployment

Jalankan perintah berikut di terminal server Ubuntu Anda dari direktori root project:

### Langkah A: Build & Start Container
Gunakan file `docker-compose.prod.yml` untuk mem-build image backend dan frontend dashboard secara bersamaan, kemudian jalankan dalam mode background (*detached*):
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Langkah B: Periksa Log Sistem
Untuk memantau proses inisialisasi backend, jalankan perintah berikut:
```bash
docker logs -f openwa-api
```

Saat startup pertama kali selesai, Anda akan melihat banner selamat datang di log dengan **Default API Key** yang digenerate otomatis:
```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  🟢 Welcome to OpenWA - WhatsApp API Gateway

  📊 Dashboard: http://localhost:2886
  📚 API Docs:  http://localhost:2785/api/docs

  🔑 API Key:
     owa_k1_xxxxxx...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 4. Cara Mengakses Aplikasi
Setelah container menyala dengan sukses:
- **React Dashboard UI**: Akses melalui browser di `http://IP_SERVER_ANDA:2886`
- **REST API & Swagger Docs**: Akses di `http://IP_SERVER_ANDA:2785/api/docs`

Masukkan **API Key** yang digenerate di atas untuk login ke Dashboard Anda.

---

## 5. Mengelola Banyak User (Multi-Tenancy)
1. **Login sebagai Admin**: Gunakan API Key default (Admin) yang tercetak di log backend untuk masuk ke Dashboard.
2. **Buat Akun Teman (API Keys)**:
   - Masuk ke menu **API Keys** di Dashboard.
   - Klik **Create API Key**.
   - Isi nama teman Anda (misal: "Andi" atau "Budi"), pilih role `OPERATOR`, lalu klik simpan.
   - Berikan API Key yang digenerate tersebut kepada Andi/Budi.
3. **Isolasi Mandiri**: Andi dan Budi sekarang dapat login sendiri menggunakan kunci mereka. Seluruh WhatsApp session, kontak impor, dan grup blast yang mereka buat hanya akan terlihat dan dapat diakses oleh akun mereka masing-masing.
