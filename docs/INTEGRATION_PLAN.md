# Morfosis LMS - Full BE & FE Integration Plan

Melanjutkan fase pengembangan sebelumnya, saat ini UI Frontend (Dashboard, CRUD, Ujian) sudah terbangun dengan *mock data/state*, dan Backend API sudah menyediakan kapabilitas databasenya.
Fase ini fokus pada **penyambungan (wiring) 100%** antara UI dan API.

## Kanban Issues: Full Integration Phase

### INT-1: Tenant Management Integration
- **Backend**: Tambahkan method `PATCH` (Edit) dan `DELETE` ke `/api/v1/tenants/{id}` (saat ini baru ada GET dan POST).
- **Frontend**: Ubah `app/tenants/page.tsx` untuk menghapus `initialTenants` dan menggantinya dengan `fetch` GET ke API. Ubah fungsi simpan/edit/hapus agar menembak endpoint HTTP dengan metode POST/PATCH/DELETE.

### INT-2: Academic & Courses Integration
- **Backend**: Pastikan CRUD untuk `/api/v1/academic/subjects` dan `/api/v1/courses` sudah lengkap.
- **Frontend**: Ubah `app/courses/page.tsx` dan bagian Mata Pelajaran agar menggunakan data real dari database.

### INT-3: Exams Management Integration (Dashboard Guru)
- **Backend**: Endpoint manajemen ujian (`/api/v1/exams`) sudah lengkap.
- **Frontend**: Hubungkan `app/exams/page.tsx` dengan API untuk mengambil daftar ujian, membuat ujian, mengubah status publikasi, dan melihat analitik.

### INT-4: Auth & Global API Client Setup
- **Frontend**: Buat atau sesuaikan utility `fetch` (misal `lib/api-client.ts`) yang otomatis menyertakan kredensial (cookie) dan menangani error (401 Unauthorized redirect ke `/login`).

---

*Status: Dimulai. Berjalan dari INT-1.*
