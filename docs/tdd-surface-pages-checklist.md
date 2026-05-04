# TDD Checklist — Surface Pages LMS Morfosis

Dokumen ini adalah checklist bertahap untuk menjalankan TDD pada semua surface page yang sudah dibuat. Prinsip utamanya: **jangan kerjakan semua sekaligus**. Setiap batch harus selesai RED → GREEN → REFACTOR → VERIFY sebelum lanjut batch berikutnya.

## Aturan Utama TDD

- [x] Untuk setiap page, ekstrak logic UI/domain ke helper kecil yang mudah dites bila memungkinkan.
- [x] Tulis test dulu, lalu jalankan dan pastikan gagal karena behavior belum ada atau belum diekstrak.
- [x] Implementasikan kode minimal agar test pass.
- [x] Refactor hanya setelah test hijau.
- [x] Setelah satu batch selesai, jalankan:
  - [x] `npm test`
  - [x] `npx tsc --noEmit`
- [x] Jangan refactor visual besar-besaran saat batch TDD kecuali diperlukan untuk testability.
- [x] Jangan menambah backend wiring baru dalam checklist ini; fokus pada behavior surface/frontend yang sudah ada.

## Test Command

Dari folder frontend:

```bash
cd frontend
npm test
npx tsc --noEmit
```

Untuk satu file test:

```bash
npx vitest run path/to/file.test.ts
```

## Status Legend

- `[ ]` Belum mulai
- `[~]` Sedang dikerjakan
- `[x]` Selesai dan verified
- `[!]` Perlu keputusan/desain ulang kecil

---

## Batch 0 — Baseline & Testing Harness

Tujuan: memastikan harness test stabil sebelum masuk banyak page.

- [x] `app/students` domain test awal tersedia.
- [x] `vitest` tersedia.
- [x] `@testing-library/react` tersedia.
- [x] `@testing-library/jest-dom` tersedia.
- [x] `jsdom` tersedia.
- [x] `package.json` memiliki script `test`.
- [x] Tambahkan/cek `vitest.config.*` bila nanti perlu environment `jsdom` global untuk component tests.
- [x] Tentukan konvensi file:
  - [x] `*-domain.ts` untuk pure domain helpers.
  - [x] `*-domain.test.ts` untuk pure unit tests.
  - [x] `*.test.tsx` untuk component interaction tests.

Verification:

- [x] `npm test`
- [x] `npx tsc --noEmit`

---

## Batch 1 — Core Admin Directory Pages

Prioritas pertama karena ini surface operasional utama admin. Jangan lanjut Batch 2 sebelum Batch 1 verified.

### 1.1 Students — `/app/students`

File:

- `frontend/src/app/(app)/app/students/page.tsx`
- `frontend/src/app/(app)/app/students/student-domain.ts`
- `frontend/src/app/(app)/app/students/student-domain.test.ts`

Checklist:

- [x] Test filter students by name/NISN/email/class section.
- [x] Test query kosong mengembalikan semua students.
- [x] Test metrics: total, active, attention, class sections.
- [x] Tambahkan test untuk status edge case jika ada data archived/inactive.
- [x] Tambahkan test untuk normalized whitespace query.

Verification:

- [x] `npx vitest run 'src/app/(app)/app/students/student-domain.test.ts'`

### 1.2 Users — `/app/users`

File:

- `frontend/src/app/(app)/app/users/page.tsx`
- `frontend/src/app/(app)/app/users/user-domain.ts`
- `frontend/src/app/(app)/app/users/user-domain.test.ts`

Behavior yang perlu dites:

- [x] Filter/search user berdasarkan nama, email, role, tenant.
- [x] Metrics user per role/status.
- [x] Behavior invite/create user form default value bila logic tersedia.
- [x] Role label/permission mapping tidak hardcoded tersebar di component.

TDD cycles:

- [x] RED: search/filter user.
- [x] GREEN: implement `filterUsers` minimal.
- [x] REFACTOR: page memakai `filterUsers`.
- [x] RED: user metrics.
- [x] GREEN: implement `calculateUserMetrics` minimal.
- [x] REFACTOR: page memakai metrics helper.

### 1.3 Classes — `/app/classes`

File:

- `frontend/src/app/(app)/app/classes/page.tsx`
- `frontend/src/app/(app)/app/classes/class-domain.ts`
- `frontend/src/app/(app)/app/classes/class-domain.test.ts`

Behavior yang perlu dites:

- [x] Filter class berdasarkan nama kelas, wali kelas, tahun ajaran, grade, status.
- [x] Metrics class: total classes, total students, active classes, average size.
- [x] Assignment/relationship summary untuk class-section bila ada.
- [x] Empty state ketika tidak ada kelas cocok.

TDD cycles:

- [x] RED: class filtering.
- [x] GREEN: implement `filterClasses`.
- [x] REFACTOR: page memakai helper.
- [x] RED: class metrics.
- [x] GREEN: implement `calculateClassMetrics`.
- [x] REFACTOR: page memakai helper.

### 1.4 Tenants — `/app/tenants`

File:

- `frontend/src/app/(app)/app/tenants/page.tsx`
- `frontend/src/app/(app)/app/tenants/tenant-domain.ts`
- `frontend/src/app/(app)/app/tenants/tenant-domain.test.ts`

Behavior yang perlu dites:

- [x] Filter tenant berdasarkan nama sekolah, slug, provinsi, plan/status.
- [x] Metrics tenant: total, active, setup, active users, low-spec profile, utilization.
- [x] Tenant health label/severity mapping.
- [x] Sorting tenant prioritas operasional jika ada.

TDD cycles:

- [x] RED: tenant filtering.
- [x] GREEN: implement `filterTenants`.
- [x] REFACTOR: page memakai helper.
- [x] RED: tenant metrics/health labels.
- [x] GREEN: implement helper minimal.
- [x] REFACTOR: page memakai helper.

Batch 1 Exit Criteria:

- [x] Semua unit test Batch 1 pass.
- [x] `npm test` pass.
- [x] `npx tsc --noEmit` pass.
- [x] List/table headers Batch 1 diselaraskan dengan `/app/courses` pattern.
- [x] Update catatan progress di dokumen ini.

---

## Batch 2 — Academic Structure & Learning Directory

Mulai hanya setelah Batch 1 selesai.

### 2.1 Subject Groups — `/app/subject-groups`

File:

- `frontend/src/app/(app)/app/subject-groups/page.tsx`
- `frontend/src/app/(app)/app/subject-groups/subject-group-domain.ts`
- `frontend/src/app/(app)/app/subject-groups/subject-group-domain.test.ts`

Behavior:

- [x] Filter subject group by name/subject/teacher/year/status.
- [x] Metrics total groups, total subjects, active groups, students, average size.
- [x] Validation helper untuk duplicate name dalam academic year.

### 2.2 Courses — `/app/courses`

File:

- `frontend/src/app/(app)/app/courses/page.tsx`
- `frontend/src/app/(app)/app/courses/course-domain.ts`
- `frontend/src/app/(app)/app/courses/course-domain.test.ts`

Behavior:

- [x] Filter courses by subject, teacher, class, status, module title.
- [x] Metrics course offerings, published/draft courses, modules, teacher assignments, audience targets.
- [x] Course status label/severity mapping.
- [x] Empty state/search no-result behavior.

### 2.3 Learn — `/app/learn`

File:

- `frontend/src/app/(app)/app/learn/page.tsx`
- `frontend/src/app/(app)/app/learn/learn-domain.ts`
- `frontend/src/app/(app)/app/learn/learn-domain.test.ts`

Behavior:

- [x] Filter learning materials by course/title/type/status/module/resource.
- [x] Progress calculation per course/material.
- [x] Next recommended material selection bila ada.
- [x] External media metadata mapping untuk YouTube/Drive tidak masuk critical path.

### 2.4 Course Monitoring — `/app/course-monitoring`

File:

- `frontend/src/app/(app)/app/course-monitoring/page.tsx`
- `frontend/src/app/(app)/app/course-monitoring/course-monitoring-domain.ts`
- `frontend/src/app/(app)/app/course-monitoring/course-monitoring-domain.test.ts`

Behavior:

- [x] Metrics engagement/completion/at-risk.
- [x] Alert severity mapping.
- [x] Filter monitoring rows by course/class/status.

Batch 2 Exit Criteria:

- [x] Semua unit test Batch 2 pass.
- [x] `npm test` pass.
- [x] `npx tsc --noEmit` pass.

---

## Batch 3 — Exam Management Surfaces

Mulai hanya setelah Batch 2 selesai. Ini batch kritikal karena exam harus reliabel di server low-spec.

### 3.1 Exams Directory — `/app/exams`

File:

- `frontend/src/app/(app)/app/exams/page.tsx`
- target helper: `exam-domain.ts`
- target test: `exam-domain.test.ts`

Behavior:

- [x] Filter exams by title, subject, class, status.
- [x] Metrics scheduled/running/completed/draft.
- [x] Exam status label/severity mapping.
- [x] Publish readiness calculation bila ada.

### 3.2 Exam Detail/Builder — `/app/exams/[id]`

File:

- `frontend/src/app/(app)/app/exams/[id]/page.tsx`
- target helper: `exam-detail-domain.ts`
- target test: `exam-detail-domain.test.ts`

Behavior:

- [x] Section/question counts.
- [x] Total points calculation.
- [x] Validation: no question, no eligible students, schedule invalid.
- [x] Rules summary untuk exam gate.

### 3.3 Exam Monitor — `/app/exams/[id]/monitor`

File:

- `frontend/src/app/(app)/app/exams/[id]/monitor/page.tsx`
- target helper: `exam-monitor-domain.ts`
- target test: `exam-monitor-domain.test.ts`

Behavior:

- [x] Submission state metrics.
- [x] Risk/alert severity mapping.
- [x] Filter students by online/submitted/flagged.
- [x] Shock absorber queue state display mapping bila ada.

### 3.4 Exam Performance — `/app/exams/[id]/performance`

File:

- `frontend/src/app/(app)/app/exams/[id]/performance/page.tsx`
- target helper: `exam-performance-domain.ts`
- target test: `exam-performance-domain.test.ts`

Behavior:

- [x] Score distribution calculation.
- [x] Average/min/max score.
- [x] At-risk/needs-remedial thresholds.
- [x] Per-class comparison helper.

### 3.5 Exam Grading — `/app/exams/[id]/grading`

File:

- `frontend/src/app/(app)/app/exams/[id]/grading/page.tsx`
- target helper: `exam-grading-domain.ts`
- target test: `exam-grading-domain.test.ts`

Behavior:

- [x] Rubric/score validation.
- [x] Pending/manual grading counts.
- [x] Final score calculation.
- [x] Bulk publish readiness.

Batch 3 Exit Criteria:

- [x] Semua unit test Batch 3 pass.
- [x] `npm test` pass.
- [x] `npx tsc --noEmit` pass.
- [x] Tidak ada logic exam critical path yang bergantung pada external API.

---

## Batch 4 — Student Exam Taking Flow

Mulai hanya setelah Batch 3 selesai.

### 4.1 Exam Gate — `/app/exam-gate/[id]`

File:

- `frontend/src/app/(app)/app/exam-gate/[id]/page.tsx`
- target helper: `exam-gate-domain.ts`
- target test: `exam-gate-domain.test.ts`

Behavior:

- [x] Eligibility state mapping.
- [x] Password/rule gate validation.
- [x] Schedule window validation.
- [x] Offline/low-connectivity warning state.

### 4.2 Take Exam — `/app/take-exam/[id]`

File:

- `frontend/src/app/(app)/app/take-exam/[id]/page.tsx`
- target helper: `take-exam-domain.ts`
- target test: `take-exam-domain.test.ts`

Behavior:

- [x] Answer state update helper.
- [x] Question navigation completeness.
- [x] Autosave queue status mapping.
- [x] Time remaining formatting/threshold state.
- [x] Submit readiness validation.

### 4.3 Exam Result — `/app/exam-result/[id]`

File:

- `frontend/src/app/(app)/app/exam-result/[id]/page.tsx`
- target helper: `exam-result-domain.ts`
- target test: `exam-result-domain.test.ts`

Behavior:

- [x] Score summary calculation.
- [x] Pass/fail/remedial mapping.
- [x] Per-section result grouping.
- [x] Feedback visibility rules.

Batch 4 Exit Criteria:

- [x] Semua unit test Batch 4 pass.
- [x] `npm test` pass.
- [x] `npx tsc --noEmit` pass.
- [x] Browser smoke test manual untuk gate → take exam → result.

---

## Batch 5 — Navigation, Review, Auth, Gallery

Mulai hanya setelah Batch 4 selesai. Batch ini lebih ke shell/review surface dan boleh banyak component tests.

### 5.1 App Dashboard — `/app`

File:

- `frontend/src/app/(app)/app/page.tsx`
- target helper: `dashboard-domain.ts`
- target test: `dashboard-domain.test.ts`

Behavior:

- [x] Dashboard metric aggregation.
- [x] Quick action visibility by role bila tersedia.
- [x] Alert ordering/severity.

### 5.2 Phase 1 Review Hub — `/app/phase-1-review`

File:

- `frontend/src/app/(app)/app/phase-1-review/page.tsx`
- target helper: `phase-review-domain.ts`
- target test: `phase-review-domain.test.ts`

Behavior:

- [x] Surface list completeness.
- [x] Role/flow grouping.
- [x] Backend readiness summary categories.

### 5.3 Login — `/login`

File:

- `frontend/src/app/(auth)/login/page.tsx`
- target helper: `login-domain.ts`
- target test: `login-domain.test.ts`

Behavior:

- [x] Form validation rules.
- [x] Error mapping 401 vs 403.
- [x] Redirect/role routing helper bila tersedia.

### 5.4 Gallery — `/app/gallery`

File:

- `frontend/src/app/(app)/app/gallery/page.tsx`
- target helper: `gallery-domain.ts`
- target test: `gallery-domain.test.ts`

Behavior:

- [x] Gallery item grouping/filtering.
- [x] Surface metadata completeness.
- [x] Empty category state.

### 5.5 Root Landing — `/`

File:

- `frontend/src/app/page.tsx`
- target helper: `landing-domain.ts` jika ada behavior non-visual.
- target test: `landing-domain.test.ts`

Behavior:

- [x] CTA link mapping.
- [x] Feature list completeness.
- [x] Role/value proposition grouping.

Batch 5 Exit Criteria:

- [x] Semua unit/component test Batch 5 pass.
- [x] `npm test` pass.
- [x] `npx tsc --noEmit` pass.

---

## Suggested Execution Order

Jalankan per sub-batch kecil:

1. [x] Batch 1.2 Users saja.
2. [x] Batch 1.3 Classes saja.
3. [x] Batch 1.4 Tenants saja.
4. [x] Run full verification.
5. [x] Batch 2.1 Subject Groups saja.
6. [x] Batch 2.2 Courses saja.
7. [x] Batch 2.3 Learn saja.
8. [x] Batch 2.4 Course Monitoring saja.
9. [x] Run full verification.
10. [x] Batch 3 exam directory/detail.
11. [x] Batch 3 monitor/performance/grading.
12. [x] Run full verification.
13. [x] Batch 4 gate/take/result.
14. [x] Run full verification.
15. [x] Batch 5 shell/auth/review/gallery.

---

## Progress Log

Tambahkan catatan append-only setiap selesai satu sub-batch.

### 2026-05-03

- Created checklist after existing Students TDD baseline.
- Completed **Batch 1.2 Users** domain TDD:
  - Added `user-domain.test.ts` and verified RED via missing `./user-domain` module.
  - Added `user-domain.ts` with `filterUsers`, `calculateUserMetrics`, and `getRoleLabel`.
  - Refactored Users page to use tested helpers and added directory search UI.
  - Verified `npm test` and `npx tsc --noEmit` pass.
- Completed remaining **Batch 1** TDD:
  - Added Classes domain tests/helpers and refactored Classes page to use tested filtering, metrics, enrollment search, and duplicate detection.
  - Added Tenants domain tests/helpers and refactored Tenants page to use tested filtering, metrics, and health labels.
  - Fixed Users/Students/Classes/Tenants directory headers to mirror `/app/courses` list header pattern (`grid`, `px-5 py-3`, `lg:grid-cols-[1fr_280px]`, `h-11` search control).
  - Verified `npm test` and `npx tsc --noEmit` pass with 4 test files and 16 tests.
- Current recommended next work: **Batch 2.1 Subject Groups** only.
- Completed **Batch 2 final cleanup**:
  - Added tested `getCourseEmptyState` helper and refactored `/app/courses` no-result state.
  - Verified targeted Courses test remains green.
- Completed **Batch 3 Exam Management Surfaces** domain TDD:
  - Added tests/helpers for Exams Directory, Exam Detail/Builder, Exam Monitor, Exam Performance, and Exam Grading.
  - Refactored `/app/exams` directory to use tested filtering, metrics, status mapping, and empty state helper.
  - Verified `npm test` passes with 13 test files / 49 tests.
  - Verified `npx tsc --noEmit` passes.
  - Browser smoke checked `/app/exams`: no Application error.
- Completed **Batch 4 Student Exam Taking Flow** domain TDD:
  - Added tests/helpers for Exam Gate, Take Exam, and Exam Result.
  - Refactored gate/take/result pages to use tested helpers for eligibility, schedule windows, password/rules, answer progress, autosave state, submit readiness, scoring, section grouping, and feedback visibility.
  - Verified `npm test` passes with 16 test files / 61 tests.
  - Verified `npx tsc --noEmit` passes.
  - Browser smoke checked gate → take exam → result routes: no Application error.
- Current recommended next work: **Batch 5 Navigation, Review, Auth, Gallery**.
- Completed **Batch 5 Navigation, Review, Auth, Gallery** domain TDD:
  - Added/verified tests/helpers for Dashboard, Phase 1 Review Hub, Login, Gallery, and Root Landing.
  - Refactored Dashboard metrics/alerts, Login redirect, Phase Review readiness summary, and Landing metadata validation to consume tested helpers.
  - Verified `npm test` passes with 21 test files / 77 tests.
  - Verified `npx tsc --noEmit` passes.
  - Browser smoke checked `/app`, `/app/phase-1-review`, `/login`, `/app/gallery`, and `/`: no Application error.
- Current recommended next work: close remaining earlier checklist cleanup items or move to DB + Go API foundation planning.
- Completed next cleanup task after Batch 5: **Students edge-case TDD**:
  - Added RED tests for normalized whitespace search and inactive/graduated status label mapping.
  - Implemented whitespace-normalized `filterStudents` and `getStudentStatusLabel`.
  - Verified targeted Students test, full `npm test` (21 files / 79 tests), and `npx tsc --noEmit` pass.
- Completed next cleanup task: **Users invite defaults TDD**:
  - Added RED tests for `getDefaultUserFormValues` using first available tenant and blank-tenant fallback.
  - Implemented the helper and refactored `/app/users` create drawer defaults to use it.
  - Verified targeted Users test, full `npm test` (21 files / 81 tests), and `npx tsc --noEmit` pass.
- Completed next cleanup task: **Classes empty state TDD**:
  - Added RED tests for `getClassEmptyState` setup and search no-result copy.
  - Implemented the helper and refactored `/app/classes` directory empty state to use tested copy/actions.
  - Verified targeted Classes test, full `npm test` (21 files / 83 tests), and `npx tsc --noEmit` pass.
- Completed next cleanup task: **Tenant operational priority sorting TDD**:
  - Added RED test for `sortTenantsByOperationalPriority` ordering near-capacity active tenants before setup and healthy tenants while preserving input immutability.
  - Implemented the helper and refactored `/app/tenants` directory to display filtered tenants in operational priority order.
  - Verified targeted Tenants test, full `npm test` (21 files / 84 tests), and `npx tsc --noEmit` pass.
- Completed **Frontend Surface TDD checklist closure**:
  - Added `frontend/vitest.config.ts` with global `jsdom` environment for future component interaction tests.
  - Marked TDD operating rules, file conventions, Batch 0 verification, and remaining cleanup items complete.
  - Verified final frontend suite: `npm test` passes with 21 files / 84 tests and `npx tsc --noEmit` passes.
  - Current recommended next work: **DB + Go API foundation**.
