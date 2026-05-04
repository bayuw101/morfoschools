# PRD — Exam Backend/Frontend Wiring Audit

## Overview
Menyelaraskan seluruh alur exam di Morfoschools agar backend dan frontend terhubung end-to-end untuk tiga peran utama: **admin**, **teacher**, dan **student**. Fokusnya adalah audit menyeluruh, checklist fitur, wiring satu per satu, lalu verifikasi bahwa setiap jalur kerja berjalan sesuai RBAC dan tenant scoping.

## Goals
- Memastikan semua layar dan API exam saling terhubung.
- Memastikan boundary keamanan di backend tetap menjadi source of truth.
- Memastikan admin, teacher, dan student hanya melihat dan mengakses fitur yang sesuai role.
- Memastikan setiap route exam punya data flow, permission, dan test coverage yang jelas.

## In Scope
### Admin
- Exam listing
- Exam detail
- Exam builder / configuration
- Publish readiness
- Targeting peserta
- Gate rules
- Monitoring ringkas
- Manual grading overview

### Teacher
- Melihat exam yang dikelola
- Monitoring attempt dan submission
- Manual grading queue
- Grading individual attempt
- Melihat readiness/publish constraints

### Student
- Exam gate
- Take exam
- Autosave submission
- Final submit
- Result / receipt / feedback
- Retry/blocked state handling

## Technical Requirements
- Frontend exam pages harus memakai adapter API, bukan mock state sebagai fallback.
- Backend harus menjadi source of truth untuk authorization dan tenant scoping.
- Semua route sensitif harus dicek lewat middleware permission.
- Data flow exam harus dipetakan dari domain frontend ke endpoint backend yang nyata.
- Jika endpoint belum ada, harus dibuat atau diputuskan sebagai out of scope secara eksplisit.
- Student exam path tidak boleh bergantung pada external API pihak ketiga.
- UI state awal harus empty/loading state sampai data asli datang.

## Existing Known Facts
- Frontend sudah punya domain helpers untuk:
  - exam list
  - exam detail
  - exam grading
  - exam monitor
  - exam gate
  - take exam
  - exam result
- Backend belum punya modul `internal/modules/exam` yang aktif.
- Frontend sudah punya `frontend/src/lib/exam-api.ts` sebagai kandidat adapter, tetapi wiring halaman belum selesai.

## Risks
- Field/domain mismatch antara frontend dan backend.
- Route permission yang terlalu longgar.
- Peran teacher dan admin bercampur tanpa guard yang jelas.
- Student path mengandalkan data lokal padahal semestinya live.
- Kurangnya regression tests untuk gate, submit, result, grading, monitor.

## Out of Scope
- Refactor besar seluruh platform di luar exam.
- Perubahan design system global.
- External proctoring vendor integration.

## Acceptance Criteria
- Semua halaman exam utama punya data flow nyata atau keputusan eksplisit jika masih placeholder.
- Admin/teacher/student routes diverifikasi satu per satu.
- Backend tests dan frontend tests lolos.
- Build frontend lolos.
- Browser smoke test untuk route inti exam berhasil.

## Next Execution Plan
1. Audit semua file exam FE yang ada.
2. Audit backend routes/middleware/permissions yang relevan.
3. Buat checklist feature-by-feature.
4. Tentukan endpoint gap dan wiring order.
5. Implement satu slice kecil per langkah.
6. Verifikasi dengan test/build/smoke.
