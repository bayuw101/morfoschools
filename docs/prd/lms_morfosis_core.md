# Master PRD - LMS Morfosis

## 1. Overview
LMS Multitenant yang dirancang khusus untuk sekolah di Indonesia dengan fokus pada **ekstrem reliabilitas** saat ujian (CBT) meskipun dijalankan di infrastruktur terbatas (low-spec VPS, 2GB RAM). 

Proyek ini menggunakan filosofi "Bring Your Own" (BYO) untuk Resource (Storage/AI) guna meminimalkan beban infrastruktur server pusat.

## 2. Target User & Goals
*   **Sekolah:** Mengelola data akademik lintas kelas dan rombongan belajar.
*   **Guru:** Membuat materi, ujian harian, dan CBT dengan alat bantu AI.
*   **Murid:** Mengakses materi dan ujian secara lancar di kondisi internet tidak stabil (Offline-First).

## 3. Tech Stack (Low-Spec Optimized)
*   **Backend:** Go (Modular Monolith) - Hemat RAM, konkurensi tinggi.
*   **Frontend:** Next.js (App Router + Tailwind v4) - Modern UI, dioptimalkan untuk performa.
*   **Primary DB:** PostgreSQL + PgBouncer (Connection Pooler).
*   **Message Broker:** NATS JetStream (Shock Absorber untuk lonjakan submission).
*   **Cache:** Valkey (High performance alternative to Redis).
*   **Storage:** Google Drive & YouTube API (Metadata-only storage).
*   **AI:** BYO AI Agents (OAuth Google Antigravity/ChatGPT API).

## 4. Academic Structure (Administrative vs Academic)
Untuk menangani kasus "Rombongan Belajar" (misal: Agama yang lintas kelas):
*   **Class Sections (Administratif):** Kelas tetap murid (10-A, 11-B).
*   **Subject Groups (Akademik/Rombel):** Kelompok belajar fleksibel. Murid dari berbagai Class Section bisa masuk ke satu Subject Group yang sama.
*   **Eligibility Targeting:** Resource (Course/Exam) bisa ditargetkan ke: `ClassSectionID`, `SubjectGroupID`, atau `StudentID`.

## 5. Module Phase 1: Courses & Exams

### 5.1 Courses
*   Materi pembelajaran berupa Teks, Link Video (YouTube), atau File (Drive).
*   Tracking progres per modul materi.

### 5.2 Exams
*   Tipe Soal: Pilihan Ganda (Auto-grade) dan Essay (Manual-grade).
*   **Digital Receipt:** Murid langsung mendapat kode bukti submit meskipun nilai belum keluar.

### 5.3 Relationship & Prerequisites
*   Relasi antar resource: Course -> Exam, Exam -> Exam, Course -> Course.
*   **Prerequisite Logic:** Murid tidak bisa membuka Exam A sebelum menyelesaikan Course A atau lulus Exam B.

### 5.4 Visibility: Published vs Opened
*   **Published:** Resource muncul di dashboard murid (Visible).
*   **Opened:** Resource bisa dikerjakan/diklik (Startable).
*   **Granular Scheduling:** Waktu Publish dan Open diset per target (Kelas/Rombel/Murid), bukan global per ujian.
    *   *Contoh:* Ujian Matematika Publish jam 07:00 untuk Kelas A, tapi jam 08:00 untuk Kelas B.

## 6. Critical Engineering Patterns

### 6.1 Ingestion Shock Absorber (Inbox Pattern)
*   Menggunakan PostgreSQL sebagai primary storage untuk jawaban siswa (ClickHouse ditunda untuk efisiensi RAM).
*   **Process:** Submit -> `submission_inbox` (Append-only) -> NATS JetStream -> Async Worker -> Final Tables.
*   Menjamin server tidak crash saat 1000+ murid submit bersamaan.

### 6.2 Materialized Eligibility
*   Daftar murid yang berhak mengakses ujian dihitung saat Guru mem-publish ujian (Pre-calculated).
*   Menghindari Join tabel berat saat ribuan murid melakukan request secara simultan.

### 6.3 Offline-First Sync
*   Penyimpanan lokal di browser menggunakan IndexedDB (Dexie.js).
*   **Jittered Background Sync:** Sinkronisasi ke server dengan delay acak (15-30 detik) untuk mencegah "Thundering Herd" saat koneksi internet sekolah kembali online serentak.

## 7. Out of Scope (Phase 1)
*   Video Conference internal (Gunakan link Zoom/Meet).
*   Direct File Hosting (Gunakan Drive/YouTube).
*   Sistem Finansial/SPP.

## 8. Success Metrics
*   Mampu menangani 500-1000 murid submit ujian serentak di server 1 vCPU / 2GB RAM.
*   Data loss 0% untuk jawaban yang sudah masuk ke local storage murid.

## 9. UI & Design System
*   **Gold Standard:** Menggunakan UI/UX dari `morfostocks_v2` sebagai referensi utama.
*   **Components:** Mengadopsi library komponen custom dari `/home/bayw/Documents/Morfosis/morfostocks/src/components/ui`, termasuk:
    *   `FloatingInput`, `FloatingSelect` (Floating label pattern).
    *   `CustomDatePicker` dan `CustomTimePicker` (Seragam dan selaras).
    *   `ConfirmDialog`, `Modal`, `Toast`, `Alert` (No native HTML alerts).
*   **Design Tokens:** OKLCH-based color palette, font 'Space Grotesk' (Display) & 'Manrope' (Body).
*   **Validation:** Menggunakan **Zod** untuk semua skema validasi. Tidak ada pesan error native HTML; semua validasi ditampilkan menggunakan UI component yang selaras.
*   **Consistency:** Semua interaksi (confirmation, success, error) harus menggunakan dialog/toast yang sudah disediakan, bukan browser native.
