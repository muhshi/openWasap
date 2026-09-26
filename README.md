<p align="center">
  <img src="docs/logo/openwa_logo.webp" alt="OpenWA Logo" width="200"/>
</p>

<h1 align="center">OpenWA</h1>
<p align="center">
  <strong>Open Source WhatsApp API Gateway</strong>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-documentation">Docs</a> •
  <a href="#-api-examples">API</a> •
  <a href="#-contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.6-blue.svg" alt="Version"/>
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License"/>
  <img src="https://img.shields.io/badge/node-22_LTS-brightgreen.svg" alt="Node"/>
  <img src="https://img.shields.io/badge/NestJS-11.x-red.svg" alt="NestJS"/>
  <img src="https://img.shields.io/badge/docker-ready-blue.svg" alt="Docker"/>
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6.svg" alt="TypeScript"/>
</p>

---

## ✨ Why OpenWA?

**OpenWA** is a free, open-source WhatsApp API Gateway designed for developers who need full control over their messaging infrastructure—without vendor lock-in or hidden paywalls.

Built on a **pluggable architecture**, OpenWA lets you swap database engines (SQLite/PostgreSQL), storage backends (Local/S3), and cache layers (Memory/Redis) without changing a single line of application code.

|                               |                                                              |
| ----------------------------- | ------------------------------------------------------------ |
| 🔓 **100% Open Source**       | No licensing fees, no feature locks, full source code access |
| 🏗️ **Pluggable Architecture** | Swap adapters for database, storage, and cache via config    |
| 🖥️ **Full Dashboard**         | Modern React UI for session, webhook, and API key management |
| 🔹 **Multi-Session Ready**    | Run multiple WhatsApp sessions concurrently on one instance  |
| 🐳 **Docker Native**          | Production-ready with zero configuration                     |
| 🔗 **n8n Integration**        | Community nodes for workflow automation                      |

---

## 🎯 Features

### Core Features

| Feature       | Status | Description                          |
| ------------- | ------ | ------------------------------------ |
| REST API      | ✅     | Full WhatsApp API via HTTP endpoints |
| Multi-Session | ✅     | Manage multiple WhatsApp accounts    |
| Webhooks      | ✅     | Real-time events with HMAC signature |
| Web Dashboard | ✅     | Visual management interface          |
| API Key Auth  | ✅     | Secure API authentication            |
| Swagger Docs  | ✅     | Interactive API documentation        |

### Messaging

| Feature           | Status | Description                      |
| ----------------- | ------ | -------------------------------- |
| Text Messages     | ✅     | Send/receive text messages       |
| Media Messages    | ✅     | Images, videos, documents, audio |
| Message Reactions | ✅     | React to messages with emoji     |
| Bulk Messaging    | ✅     | Send to multiple recipients      |
| Message Status    | ✅     | Track delivery and read receipts |

### Advanced

| Feature             | Status | Description                        |
| ------------------- | ------ | ---------------------------------- |
| Groups API          | ✅     | Create, manage, and message groups |
| Channels/Newsletter | ✅     | WhatsApp Channels support          |
| Labels Management   | ✅     | Organize chats with labels         |
| Proxy Support       | ✅     | Per-session proxy configuration    |
| Rate Limiting       | ✅     | Configurable request limits        |
| CIDR Whitelisting   | ✅     | IP-based access control            |
| Audit Logging       | ✅     | Track all API operations           |

### Infrastructure

| Feature          | Status | Description                    |
| ---------------- | ------ | ------------------------------ |
| SQLite           | ✅     | Zero-config embedded database  |
| PostgreSQL       | ✅     | Production-grade database      |
| Redis Cache      | ✅     | Optional performance caching   |
| S3/MinIO Storage | ✅     | Scalable media storage         |
| Docker           | ✅     | One-command deployment         |
| Health Checks    | ✅     | Kubernetes-ready probes        |
| Data Migration   | ✅     | Export/import between backends |

---

## 🚀 Quick Start

### Option A: Docker (Recommended)

```bash
# Clone and start
git clone https://github.com/rmyndharis/OpenWA.git
cd OpenWA
docker compose -f docker-compose.dev.yml up -d

# Access
# Dashboard: http://localhost:2886
# API: http://localhost:2785/api
# Swagger: http://localhost:2785/api/docs
```

### Option B: Local Development

```bash
# Clone repository
git clone https://github.com/rmyndharis/OpenWA.git
cd OpenWA

# Install dependencies (includes dashboard)
npm install

# Start API + Dashboard (config is auto-generated on first run)
npm run dev

# Access
# Dashboard: http://localhost:2886
# API: http://localhost:2785/api
# Swagger: http://localhost:2785/api/docs
```

---

## 🏭 Production Deployment

For production, use the main `docker-compose.yml` with optional services:

```bash
# Basic production (SQLite, local storage)
docker compose up -d

# With PostgreSQL database
docker compose --profile postgres up -d

# Full stack (PostgreSQL, Redis, Dashboard, Traefik)
docker compose --profile full up -d
```

| Profile          | Services              |
| ---------------- | --------------------- |
| `postgres`       | PostgreSQL database   |
| `redis`          | Redis cache           |
| `minio`          | S3-compatible storage |
| `with-dashboard` | Web dashboard         |
| `with-proxy`     | Traefik reverse proxy |
| `full`           | All services above    |

> **Development vs Production**
>
> - Development (`docker-compose.dev.yml`): SQLite, local storage, both API & Dashboard included
> - Production (`docker-compose.yml`): Configurable database, profiles for optional services

## 🔌 Ports

| Service   | Port            | Description              |
| --------- | --------------- | ------------------------ |
| API       | `2785`          | REST API endpoints       |
| Dashboard | `2886`          | Web management interface |
| Swagger   | `2785/api/docs` | Interactive API docs     |

---

## 📡 API Examples

### Create a Session

```bash
curl -X POST http://localhost:2785/api/sessions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"name": "my-bot"}'
```

### Start Session & Get QR Code

```bash
# Start the session
curl -X POST http://localhost:2785/api/sessions/{sessionId}/start \
  -H "X-API-Key: YOUR_API_KEY"

# Get QR code (scan with WhatsApp)
curl http://localhost:2785/api/sessions/{sessionId}/qr \
  -H "X-API-Key: YOUR_API_KEY"
```

### Send a Message

```bash
curl -X POST http://localhost:2785/api/sessions/{sessionId}/messages/send-text \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "chatId": "628123456789@c.us",
    "text": "Hello from OpenWA!"
  }'
```

### Setup Webhook

```bash
curl -X POST http://localhost:2785/api/sessions/{sessionId}/webhooks \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "url": "https://your-server.com/webhook",
    "events": ["message.received", "session.status"],
    "secret": "your-hmac-secret"
  }'
```

---

## 🛠 Tech Stack

| Layer         | Technology              |
| ------------- | ----------------------- |
| **Runtime**   | Node.js 22 LTS          |
| **Framework** | NestJS 11.x             |
| **Language**  | TypeScript 5.x          |
| **WA Engine** | whatsapp-web.js         |
| **Database**  | SQLite / PostgreSQL     |
| **Cache**     | Redis (optional)        |
| **Storage**   | Local / S3 / MinIO      |
| **ORM**       | TypeORM                 |
| **Container** | Docker + Docker Compose |

---

## 📁 Project Structure

```
openwa/
├── src/
│   ├── main.ts                 # Application entry point
│   ├── app.module.ts           # Root module
│   ├── config/                 # Configuration
│   ├── common/                 # Shared utilities
│   │   ├── cache/              # Redis caching
│   │   └── storage/            # File storage (Local/S3)
│   ├── core/                   # Core systems
│   │   ├── hooks/              # Plugin hooks
│   │   └── plugins/            # Plugin system
│   ├── engine/                 # WhatsApp engine abstraction
│   └── modules/
│       ├── session/            # Session management
│       ├── message/            # Message handling
│       ├── webhook/            # Webhook management
│       ├── group/              # Groups API
│       ├── contact/            # Contacts API
│       ├── auth/               # API key authentication
│       ├── infra/              # Infrastructure management
│       └── health/             # Health checks
├── dashboard/                  # React web dashboard
├── docs/                      # Documentation
├── docker-compose.yml
├── Dockerfile
└── package.json
```

---

## 📚 Documentation

Comprehensive documentation is available in the `docs/` folder:

| Document                                                | Description                  |
| ------------------------------------------------------- | ---------------------------- |
| [Project Overview](./docs/01-project-overview.md)       | Introduction and goals       |
| [Requirements](./docs/02-requirements-specification.md) | Feature specifications       |
| [Architecture](./docs/03-system-architecture.md)        | System design                |
| [Security](./docs/04-security-design.md)                | Security implementation      |
| [Database](./docs/05-database-design.md)                | Data models and migrations   |
| [API Spec](./docs/06-api-specification.md)              | Complete API reference       |
| [Development](./docs/08-development-guidelines.md)      | Coding standards             |
| [Migration Guide](./docs/14-migration-guide.md)         | Database & storage migration |

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork** the repository
2. **Create** your feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

Please read our [Development Guidelines](./docs/08-development-guidelines.md) for coding standards and best practices.

---

## 📝 Changelog

### [2026-09-26]

- **Pembaruan Footer & Atribusi Pengembang**: Mengubah atribusi footer aplikasi dan README menjadi "Developed by https://github.com/muhshi for BPS Kabupaten Demak" dengan tautan langsung ke GitHub pengembang.

### [2026-06-06] — Master API Key, Database Agnostic Columns & Group Member Blast

- **Master API Key Support**: Menambahkan validasi `API_MASTER_KEY` dari environment variabel `.env` di `AuthService`. Jika kunci yang dikirimkan cocok dengan master key, user otomatis mendapatkan peran `ADMIN` dengan akses global.
- **Database-Agnostic Column Types**: Mengganti PostgreSQL-specific `'timestamptz'` dan `'jsonb'` pada entitas `ApiKey` dan `AuditLog` dengan helper `dateColumnType()` dan `jsonColumnType()` agar skema database lebih fleksibel/database-agnostic (misal SQLite/PostgreSQL/MySQL).
- **Filter Blast WA Per Anggota (Specific Member Blast)**: Memperbarui endpoint `/contact-groups/{id}/blast` dan service `ContactGroupService` agar dapat menerima daftar opsional `memberIds` untuk melakukan blast pesan ke anggota grup tertentu saja (bukan semua anggota).
- **UI Peningkatan Halaman Kontak (Contacts Page)**:
  - Menambahkan pagination untuk daftar anggota grup dalam detail grup (`groupPageSize` dan `currentGroupPage`).
  - Menambahkan modal "Tambahkan Kontak ke Group" dari daftar kontak terpilih (multi-select), lengkap dengan opsi membuat grup baru secara instan.
  - Mendukung blast pesan ke anggota grup tertentu yang dipilih langsung dari UI detail grup.

### [2026-05-29] — Production PostgreSQL Deployment Fix

- **Switch Database ke PostgreSQL**: Migrasi konfigurasi production dari MySQL ke PostgreSQL eksternal yang sudah tersedia (`postgres-stack_ai_net`). Update `docker-compose.prod.yml` dan `.env.example` untuk menggunakan koneksi PostgreSQL.
- **Auto-Create Database via Container**: Menambahkan service `db-init` di `docker-compose.prod.yml` menggunakan image `postgres:alpine` yang otomatis membuat database `openwa` jika belum ada sebelum API container dijalankan. Tidak perlu install `psql` di server.
- **Full MySQL Support di Kode**: Menambahkan MySQL datasource di `data-source.ts` dan branch `mysql` di kedua koneksi TypeORM (`main` & `data`) di `app.module.ts`.
- **Fix Bootstrap `.env.generated`**: Memperbaiki `main.ts` agar saat generate file konfigurasi awal, nilai `DATABASE_TYPE` dan variabel lainnya dibaca dari `process.env` (Docker Compose) bukan hardcoded `sqlite`.
- **Fix Kompatibilitas TypeORM Entity dengan PostgreSQL**:
  - `column-types.ts`: Ganti `'timestamp'` → `'timestamptz'` untuk kolom tanggal di PostgreSQL (timezone-aware). Tambah helper `arrayColumnType()` yang mengembalikan `'jsonb'` di PostgreSQL dan `'simple-array'` di SQLite/MySQL.
  - `api-key.entity.ts`: Ganti `datetime` → `timestamptz`, `simple-array` → `arrayColumnType()`.
  - `audit-log.entity.ts`: Ganti `simple-json` → `jsonb`.
- **Fix `keyPrefix` VARCHAR Overflow**: Kolom `keyPrefix` di entity `ApiKey` diperbesar dari `varchar(8)` menjadi `varchar(20)`. Nilai aktual yang dihasilkan (`owa_k1_xxxxx`) berukuran 12 karakter — PostgreSQL strict menolak nilai yang melebihi panjang kolom, berbeda dengan SQLite.
- **Fix Dockerfile**: Hapus flag `--ignore-scripts` dari `npm ci --omit=dev` di stage `deps` agar native module `sqlite3` ter-compile dengan benar untuk koneksi `main` database.

### [2026-05-29] — Sebelumnya
- **Optimasi Build Docker (Percepatan Signifikan)**: Refactor `Dockerfile` backend dan `dashboard/Dockerfile` untuk memaksimalkan layer caching Docker:
  - Memisahkan stage instalasi prod-dependencies (`deps`) dari stage build source agar layer `npm ci --omit=dev` ter-cache secara independen—tidak perlu diulang saat source code berubah.
  - Menambahkan flag `--ignore-scripts` di builder stage untuk mencegah `postinstall` memicu instalasi duplikat dependency dashboard.
  - Menambahkan `dashboard/.dockerignore` untuk mengeksklusikan `node_modules` (100MB+) dari build context dashboard—mengurangi waktu transfer context secara dramatis.
  - Mengeksklusikan folder `dashboard/` dari build context backend via root `.dockerignore`.
  - Memindahkan `chown` hanya ke `/app/data` (bukan rekursif ke seluruh `/app`) untuk menghindari operasi chown pada ribuan file `node_modules`.
  - Menghapus key `version` yang obsolete dari `docker-compose.prod.yml`.

- **Fitur Sandbox Multi-Tenancy (Isolasi Data Eksplisit)**: Menambahkan kolom `ownerApiKeyId` ke entitas **Sessions**, **Imported Contacts**, dan **Contact Groups** untuk membatasi akses data. Setiap user (berdasarkan API Key operator/viewer yang login) kini hanya dapat melihat, membuat, mengelola, dan mem-blast sesi/kontak/grup miliknya sendiri secara privat. Peran `ADMIN` tetap memiliki akses global penuh.
- **Dukungan Database MySQL & Dependensi**: Menginstal paket driver `mysql2` untuk memfasilitasi komunikasi backend NestJS dengan database MySQL secara native.
- **Konfigurasi Deployment Docker Production**: Menyediakan file `docker-compose.prod.yml` khusus production dan file dokumentasi panduan deployment `docker-setting.md` siap pakai untuk mempermudah deploy di Ubuntu Server dengan dukungan koneksi ke database MySQL eksternal dan perutean proxy internal Nginx.
- **Pembaruan Fitur Blast WA Personal Terpadu (Unified Blast WA Modal)**: Mengintegrasikan dialog pengiriman pesan massal sehingga mendukung pengiriman ke kontak-kontak yang dipilih via checkbox, maupun ke grup sistem tertentu dari satu modal yang sama. Ditambahkan pula progress bar pengiriman real-time untuk pemantauan status pengiriman ke kontak individual.
- **Fitur Hapus Massal Kontak Terpilih (Bulk Delete)**: Menambahkan fungsionalitas untuk menghapus banyak kontak sekaligus yang dipilih melalui checkbox dengan konfirmasi keamanan sebelum eksekusi.
- **Refactor Contact Page**: Hapus tab auto-sync kontak WhatsApp yang menyebabkan loading berat saat halaman dibuka. Halaman kontak kini hanya menampilkan kontak yang diimport dari database lokal.
- **Hapus Tombol "Clear Imported"**: Tombol yang berbahaya (bisa hapus semua kontak sekaligus) dihapus dari UI. Penghapusan kontak tetap bisa dilakukan satu per satu via tombol ❌ di baris tabel.
- **Fitur System Contact Group**: Menambahkan konsep "Group" baru yang tersimpan di database lokal (bukan WhatsApp Group). Group ini digunakan untuk mengelompokkan kontak untuk keperluan blast WA personal.
  - CRUD Group: buat, edit nama/deskripsi, hapus group
  - Manajemen Anggota: tambah/hapus kontak dari group dengan UI searchable checkbox
  - Backend: Entity `ContactGroup` & `ContactGroupMember`, Service, dan REST Controller (`/contact-groups`)
- **Fitur Blast WA Personal**: Kirim pesan WhatsApp 1-1 (personal/private) ke semua anggota group sekaligus melalui sesi WA aktif. Mendukung variabel `{{name}}` untuk personalisasi nama penerima dan konfigurasi jeda antar pesan (default 3 detik).
- **Hapus Seeder Data Hardcoded**: Hapus 54 data kontak default yang di-seed otomatis saat server pertama kali boot.
- **Perbaikan Import**: Import kontak kini hanya menerima file Excel (.xlsx/.xls), tidak lagi CSV.
### [2026-09-26]
- **Tombol Hentikan Blast & Pembatalan Interaktif**: Menambahkan tombol pembatalan aktif *"⏹️ Hentikan Blast Sekarang"* pada modal pengiriman pesan massal (blast) sehingga pengguna dapat menghentikan proses pengiriman sewaktu-waktu tanpa harus menunggu seluruh antrean selesai atau terhalang tombol disabled.
- **Auto-Abort Sesi Terputus & Deteksi Anti-Spam / Rate-Limit**: Menambahkan mekanisme proteksi penghentian otomatis pada loop blast jika sesi WhatsApp terputus (*disconnected*) atau mengalami 3 kegagalan berturut-turut, melindungi nomor dari flooding error dan memberi tahu pengguna status sesi dengan jelas.
- **Tampilan Live Error Feedback pada Modal Blast**: Menampilkan rincian error spesifik secara langsung di kartu progres modal blast (*⚠️ Error Terakhir: [Nama] - [Pesan Error]*), sehingga pengguna langsung mengetahui penyebab kegagalan pesan (misal: sesi terputus, timeout, atau format file tidak sesuai).
- **Sanitasi Injected File Loader WhatsApp (`mediaInfoToFile`)**: Memperbarui skrip patch `scripts/patch-wwebjs.js` untuk membersihkan prefix Data URL Base64 dan whitespace/newline sebelum dieksekusi oleh `window.atob`, serta memberikan default aman untuk mimetype dan filename dokumen agar pengiriman lampiran file (PDF, Dokumen, Media) stabil tanpa error.
- **Perbaikan Fatal Error Media Memoize Getter & Text Message (Fix 500 / TypeError)**: Memperbaiki bug kritis upstream WhatsApp Web di mana spreading `mediaOptions` menimpa properti `id` pesan menjadi `undefined` yang memicu error `Data passed to getter must include an id property (it's how we memoize) but got undefined`. Menambahkan patch otomatis (`scripts/patch-wwebjs.js`) pada `postinstall`, menambahkan retry loop pada `Msg.get`, mengaktifkan opsi spesifik media (`sendMediaAsDocument: true`), serta menambahkan sanitasi komprehensif nomor telepon Indonesia (`formatChatId`) dan safe fallback ID pada `sendTextMessage` dan `sendMediaMessage` agar tidak crash jika objek pesan belum terindeks seketika.
- **Live Progress & Feedback Real-time Blast WA**: Menambahkan visualisasi progress bar real-time, status nama penerima yang sedang diproses, serta counter langsung jumlah pesan berhasil (✅) dan gagal (❌) pada modal blast kontak maupun grup. Setelah blast selesai, sistem menampilkan feedback notifikasi menyeluruh (jumlah terkirim & gagal) sebelum modal tertutup otomatis.
- **Fitur Attachment Media pada Blast WA**: Menambahkan dukungan lampiran media (gambar JPG/PNG/WebP, dokumen PDF/XLSX/DOCX, video, dan audio) pada fitur Blast WA Personal (baik blast Group maupun Kontak Terseleksi) dengan upload file lokal (drag & drop) atau direct URL. Teks pesan secara otomatis menjadi caption dari media yang dilampirkan dengan tetap mempertahankan variabel personalisasi `{{name}}`.
- **Stabilisasi Pengiriman Blast & Sanitasi Nomor Telepon**: Menambahkan normalisasi otomatis nomor telepon (hanya digit angka `\D`) sebelum penggabungan ke JID `@c.us` untuk mencegah kegagalan pengiriman akibat karakter `+`, spasi, atau tanda minus pada nomor kontak, serta menambahkan logging komprehensif pada blast controller agar status per pesan dapat dipantau di log server secara langsung.
- **Peningkatan Kapasitas Payload Body Parser (50MB)**: Meningkatkan batas payload Express `json` dan `urlencoded` menjadi 50MB di backend NestJS untuk mendukung transfer lampiran media Base64 berukuran besar tanpa terkena error 413 Payload Too Large.
- **Sanitasi Base64 Media Adapter WhatsApp**: Menambahkan pembersihan otomatis prefix Data URL (`data:...;base64,`) pada `WhatsAppWebJsAdapter` sebelum diinisialisasi ke `MessageMedia` guna mencegah data media corrupt saat dikirim via engine WhatsApp.
- **Perbaikan Status Stuck 99% & Optimasi Media Pesan Lama**: Mencegah event `loading_screen` terlambat menurunkan kembali status sesi yang sudah `ready` menjadi `authenticating` baik di backend maupun frontend, menambahkan auto-polling pemulihan pada sesi berstatus pending di dashboard, melewatkan pemanggilan `downloadMedia()` otomatis untuk pesan histori lama saat booting, serta memperbarui teks status UI menjadi *"Menyimpan sesi & sinkronisasi WhatsApp Web"*.
- **Perbaikan Kedipan (Flicker) Antara Loading dan QR Code**: Menggunakan `qrDataRef` pada `Sessions.tsx` untuk mencegah proses polling QR dan event QR mendadak menimpa status sesi yang sedang `authenticating`, serta memastikan `this.qrCode = null` segera saat event `loading_screen` dipicu di `WhatsAppWebJsAdapter`.
- **Perbaikan Modal QR Code & Transisi Sesi Ready**: Memperbaiki `fetchQR` di `Sessions.tsx` agar langsung menutup modal QR dan me-refresh daftar sesi saat polling mendeteksi session `ready`, serta menangani fallback pengecekan status saat getQR mengembalikan 400.
- **Dukungan WebSocket di Vite Dev Server**: Menambahkan konfigurasi proxy `/socket.io` dengan `ws: true` di `dashboard/vite.config.ts` sehingga event real-time Socket.IO terhubung mulus ke backend NestJS pada port 2785 saat pengembangan lokal.
- **Reduksi Noise Log Sinkronisasi WhatsApp**: Mengubah level log kegagalan unduh media dan quoted message histori pesan lama dari `error` menjadi `debug` di `WhatsAppWebJsAdapter` agar konsol tidak dibanjiri pesan error saat sinkronisasi chat.
- **Perbaikan Shutdown Hook TypeORM**: Menambahkan properti identifier koneksi `name: 'main'` dan `name: 'data'` pada objek hasil `useFactory` TypeOrmModule di `app.module.ts` untuk mencegah error `Nest could not find DataSource element` saat aplikasi shutdown.

### [2026-09-25]
- **Indikator Progres Sinkronisasi & Penjelasan Loading Real-time**: Menambahkan event `onLoadingScreen` dari engine WhatsApp Web ke WebSocket (`session.status`) dengan payload `loadingPercent` & `loadingMessage`, serta memperbarui modal QR dan kartu sesi di dashboard agar menampilkan progress bar visual, tahapan proses (verifikasi QR -> unduh chat -> aktivasi koneksi), dan pesan status yang informatif sehingga pengguna memahami alur kerja sinkronisasi.
- **Perbaikan Stuck di Authenticating & Transisi Ready**: Menambahkan `evalOnNewDoc` polyfill untuk mencegah crash WhatsApp Web pada modul `WAWebConnModel.Conn.serialize()`, menyempurnakan watchdog autentikasi agar mengekstrak identitas sesi secara independen dari DOM/storage WhatsApp Web dan langsung memindahkan status sesi ke `READY`.
- **Perbaikan Tombol & Lifecycle Sesi Dashboard**: Menambahkan status `authenticating` ke tipe status sesi dan UI card dashboard sehingga menampilkan spinner autentikasi dan tombol `Stop` (bukan `Reconnect` yang memicu error), serta memperbaiki `SessionService.start` agar membersihkan engine lama yang disconnect/gagal sebelum restart.
- **Perbaikan SSO Login Berulang (Invalid API Key)**: Memperbaiki `AuthService.syncSsoUser` dan `SsoController` agar selalu membuat/merotasi dan mengembalikan `rawKey` (`owa_k1_...`) yang valid ke frontend setiap kali user SSO login ulang (sebelumnya user lama mengembalikan hash SHA-256 yang menyebabkan error double-hash `Invalid API key`).
- **Optimasi Inisialisasi WhatsApp Engine**: Mengganti `webVersionCache` dari remote GitHub (`raw.githubusercontent.com/.../undefined.html`) menjadi local persistent cache (`/app/data/cache`) guna menghilangkan delay jaringan dan timeout saat startup sesi baru di server.
- **Peningkatan Konfigurasi Docker & Puppeteer**: Menambahkan `shm_size: '2gb'` pada container Docker `openwa` dan `openwa-api` serta menyertakan flag anti-throttling Chromium (`--disable-dev-shm-usage`, `--disable-background-timer-throttling`, `--disable-backgrounding-occluded-windows`, `--disable-renderer-backgrounding`) agar proses rendering dan sinkronisasi headless tidak membeku (freeze).
- **Perbaikan Real-time QR Code Modal & Polling Dashboard**: Memperbaiki `useWebSocket` agar subscribe ke room event server dan mendengarkan event `session:qr`, serta memperbaiki `Sessions.tsx` agar langsung membuka modal QR dengan spinner loading saat Start diklik dan tidak menutup modal saat status QR sedang disiapkan (mengatasi race condition frontend).

### [2026-05-26]
- **Perbaikan DTO Grup**: Menambahkan dekorator class-validator pada DTO di `group.controller.ts` untuk mengatasi error 400 Bad Request.
- **Fitur Konten Baru (Contacts Manager)**: Menambahkan halaman Kontak terpadu di React Dashboard yang mendukung import kontak dari file CSV/Excel (.xlsx) secara client-side, standardisasi nomor telepon otomatis (`08` -> `62`), serta memicu pembuatan grup di WhatsApp langsung dari daftar kontak yang dipilih.
- **Dukungan Template & Preload Kontak**: Menambahkan tombol untuk mengunduh template CSV dan Excel dari Contacts Page, serta mem-preload daftar 54 kontak petugas secara default saat halaman dimuat.
- **Penyimpanan Database Server & CRUD Lengkap (SQLite/MySQL/Postgres)**: Menyimpan data kontak secara persisten ke dalam database server menggunakan ORM TypeORM (SQLite saat pengembangan lokal, dan otomatis menggunakan MySQL atau Postgres saat di-deploy ke server). Menambahkan CRUD lengkap via REST API berupa penambahan kontak baru secara manual, penghapusan kontak satu per satu berdasarkan ID UUID, penghapusan semua kontak dengan konfirmasi dialog, auto-seeder database untuk 54 kontak default pada boot awal, serta mengaktifkan kembali validasi role 'user' untuk membuat grup WhatsApp.
- **Pagination Kontak**: Menambahkan fitur pembagian halaman (pagination) yang responsif untuk tabel kontak guna mengelola daftar kontak berskala besar dengan lancar.
- **Peningkatan Ketahanan & Penanganan Error Pembuatan Grup (Fix 502/ECONNREFUSED & findImpl error)**: Mengganti seluruh implementasi `createGroup` dengan pemanggilan langsung ke `pupPage.evaluate` → `WAWebGroupCreateJob.createGroup`, sepenuhnya mem-bypass kode pustaka `whatsapp-web.js` yang rusak akibat pembaruan WhatsApp Web. Ini mengatasi 3 titik kegagalan: (1) loop `queryWidExists` per-peserta yang lambat (N+1), (2) crash `WAWebApiContact.getPhoneNumber` pada peserta LID, dan (3) crash `Chat.find → this.findImpl is not a function` saat mengirim undangan privat. Pembuatan grup kini jauh lebih cepat dan stabil.

---

## 📄 License

This project is licensed under the **MIT License** – free for personal and commercial use.

See [LICENSE](./LICENSE) for details.

---

<div align="center">

**OpenWA** – Free, Open Source WhatsApp API Gateway

[📖 Documentation](./docs/README.md) · [🔌 API Docs](http://localhost:2785/api/docs) · [🐛 Report Bug](https://github.com/rmyndharis/OpenWA/issues) · [💡 Request Feature](https://github.com/rmyndharis/OpenWA/issues)

<br/>

<sub>Developed by <a href="https://github.com/muhshi">https://github.com/muhshi</a> for BPS Kabupaten Demak</sub>

</div>
