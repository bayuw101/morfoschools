# Morfosis LMS - Next Phase Development Plan

## 1. Product Requirements Document (PRD)

### 1.1 Objective
Membangun antarmuka utama (Dashboard & CRUD) serta alur inti pelaksanaan ujian ("Exam Gate" & "Exam Taking") untuk Morfosis LMS. LMS ini fokus pada multitenancy dan *extreme exam reliability* yang dapat dijalankan di VPS spesifikasi rendah.

### 1.2 Scope
*   **Opsi 1 (Frontend UI & CRUD):**
    *   **Demo Login:** Tombol login instan untuk berbagai role (Admin, Teacher, Student) di halaman login untuk mempermudah testing.
    *   **Layout Utama:** Sidebar, Header, dan sistem navigasi berbasis role.
    *   **Manajemen Tenant & Akademik:** UI untuk melihat tenant, kursus, dan mata pelajaran sesuai dengan estetika `morfostocks_v2` (OKLCH, Space Grotesk/Manrope).
*   **Opsi 2 (Alur Ujian Extreme Reliability):**
    *   **Materialized Eligibility:** Backend pre-calculates peserta ujian yang valid saat ujian dipublikasikan (`exam_eligible_students`) untuk mencegah JOIN berat saat traffic spike.
    *   **Exam Gate:** Endpoint & UI untuk memvalidasi token peserta sebelum ujian dimulai.
    *   **Exam Taking UI:** Halaman pengerjaan ujian yang kebal terhadap *offline-drops* (akan dipadukan dengan NATS Inbox pattern yang sudah ada di backend).

## 2. Kanban Issues (TDD Plan)

### FE-01: Demo Login Helper
*   **Goal:** Mempermudah QA dengan one-click login buttons.
*   **Tasks:**
    *   Tambahkan tombol "Login as Admin", "Login as Teacher", "Login as Student" di `/frontend/src/app/(auth)/login/page.tsx`.
    *   Saat diklik, otomatis mengisi form email & password, lalu submit.

### FE-02: Dashboard Layout & Navigation
*   **Goal:** Membuat layout utama aplikasi setelah login.
*   **Tasks:**
    *   Buat `DashboardLayout` component dengan Sidebar dan Header.
    *   Sidebar menampilkan menu sesuai Role (didapat dari Auth Context).

### FE-03: Administrative CRUD Pages (Read-Only/Basic List)
*   **Goal:** Menampilkan data Tenants dan Courses di frontend.
*   **Tasks:**
    *   Buat halaman `/admin/tenants`.
    *   Buat halaman `/academic/courses`.
    *   Desain tabel menyerupai morfostocks pixel-perfect (header disejajarkan dengan action buttons).

### BE-21: Exam Eligibility Materialization
*   **Goal:** Tabel `exam_eligible_students` yang diisi saat publish ujian.
*   **Tasks:**
    *   Buat skema SQL & migrasi untuk `exam_eligible_students (exam_id, student_id, token)`.
    *   Buat endpoint POST `/api/v1/exams/:id/publish` yang memicu proses materialisasi kepesertaan.

### BE-22: Exam Gate Endpoint
*   **Goal:** Validasi siswa boleh masuk ujian.
*   **Tasks:**
    *   Buat endpoint POST `/api/v1/exams/:id/gate` yang mengecek `exam_eligible_students`.
    *   Return session JWT spesifik ujian.

### FE-04: Exam Gate & Taking UI
*   **Goal:** UI Siswa untuk persiapan dan pengerjaan ujian.
*   **Tasks:**
    *   Halaman Exam Gate (Konfirmasi identitas & aturan).
    *   Halaman Mengerjakan Soal (menyimpan jawaban secara periodik via NATS backend pipeline).
