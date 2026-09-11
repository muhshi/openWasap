# Project Rules & Guidelines

## 1. Database Safety
- Saat menjalankan migrasi atau perintah apapun yang berhubungan dengan database: **JANGAN PERNAH** drop, truncate, atau delete apapun terkait database.

## 2. Verifikasi UI & Fitur
- **Verifikasi adalah tugas USER**:
  - Agent **tidak perlu** membuka browser otomatis / browser subagent untuk verifikasi visual atau fungsional aplikasi kecuali secara eksplisit diminta oleh user.
  - Setelah menyelesaikan pekerjaan kode/build, agent **cukup memberikan checklist jelas** mengenai apa saja yang perlu dicek/diuji oleh user.

## 3. Workflow Selesai Fitur / Perbaikan (Setelah User Verifikasi OK)
Setiap kali perbaikan atau penambahan fitur selesai dan sudah OK (terverifikasi oleh user):
1. **Commit & Push**: Lakukan `git add .`, `git commit -m "pesan commit yang jelas"`, dan `git push`.
2. **Update Changelog**: Update file `README.md` di bagian Changelog dengan tanggal hari ini dan list perubahan yang dilakukan.
