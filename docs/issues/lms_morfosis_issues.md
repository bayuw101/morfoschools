# Development Issues - LMS Morfosis Phase 1 (Exams & Courses)

## Epic 1: Project Bootstrap & UI System
*Tujuan: Membangun fondasi infrastruktur dan mengadopsi UI Morfostocks.*

### ISSUE-001: Backend & Infrastructure Setup
*   Setup Go (Modular Monolith) skeleton.
*   Setup Docker Compose: Postgres, PgBouncer, NATS JetStream, Valkey, Nginx.
*   Implement multi-tenant database middleware (tenant_id context).
*   Implementation note: Added `docs/db-backend-foundation-plan.md`, root `docker-compose.yml`, backend Dockerfile, Go testable config/health foundations, and initial Postgres migration `000001_core_foundation.sql` for shared-schema tenancy, students/classes, exam eligibility, attempts, inbox, and receipts.
*   Implementation note: Completed first DB-backed backend vertical slice: added DB pool package, `X-Tenant-ID` context middleware, tenancy repository/handler tests, `GET/POST /api/v1/tenants`, and wired runtime through PgBouncer. Verified Docker Go tests, backend image build, full compose services, `/healthz`, `/readyz`, and tenant CRUD smoke test.

### ISSUE-002: Frontend Core & Morfostocks UI Migration
*   Setup Next.js with Tailwind v4, Space Grotesk, and Manrope.
*   Copy dan adaptasi semua UI components dari `/home/bayw/Documents/Morfosis/morfostocks/src/components/ui`.
*   Setup Theme (OKLCH palette) agar identik dengan Morfostocks.
*   Setup Zod & React Hook Form integration dengan custom UI fields.

### ISSUE-003: Core Layout & Navigation
*   Implement App Shell (Sidebar, Header) menggunakan style Morfostocks.
*   Implement Custom Toast & Alert system (Global Provider).

### ISSUE-003.1: Login Page Review Surface
*   Tambahkan halaman login awal agar user bisa mereview kualitas UI, typography, form, validation, dan interaction style.
*   Wajib menggunakan komponen custom Morfostocks dan Zod validation, tanpa native browser validation.

### ISSUE-003.2: UI Components Gallery Review Surface
*   Tambahkan halaman gallery yang menampilkan semua UI components hasil copy dari Morfostocks.
*   Tujuan: memastikan semua komponen visual seragam sebelum masuk CRUD Exams/Courses.

### ISSUE-003.3: Morfostocks-Accurate Shell Alignment
*   Sidebar dan header harus mengikuti struktur Morfostocks asli: compact icon sidebar, rounded app canvas, topbar breadcrumb, dan mobile bottom nav.
*   Hindari sidebar custom lebar penuh jika tidak sesuai gold standard Morfostocks.

### ISSUE-003.4: Complete UI Gallery Coverage
*   Gallery harus menampilkan Tabs, Confirmation Dialog, Toast, Modal/Confirm behavior, dan InputGroup dengan icon-leading floating inputs/selects.
*   Tujuan: memastikan semua komponen interaksi custom tersedia sebelum CRUD management pages.

## Epic 2: Academic & Tenancy Foundation
*Tujuan: Mengelola identitas sekolah dan pengelompokan murid.*

### ISSUE-004: Tenant & User Management
*   UI & API untuk pendaftaran Tenant (Sekolah).
*   Role Management (Admin, Guru, Murid).
*   Backend note: Added identity foundation endpoints with TDD: `GET /api/v1/users` and `POST /api/v1/users` require tenant context, validate email/name/role, upsert global users, and assign tenant membership via `tenant_users`.
*   Backend note: Added lightweight auth context + role guard middleware using `X-User-ID` and `X-User-Role` headers for development/internal route protection until real session/JWT tokens are implemented.

### ISSUE-004.1: Fancy Right-Pulled Form Modals
*   Create/Edit Tenant dan Create/Edit User harus pindah dari inline form ke modal drawer modern yang muncul dari kanan.
*   Drawer wajib rounded, punya pull handle di sisi kiri, backdrop blur, sticky header/footer, dan tetap memakai custom Morfostocks floating fields + Zod validation.

### ISSUE-004.2: Student Profile Management
*   Tambahkan halaman Manage Students karena Student profile berbeda dari User account.
*   Student profile harus menyimpan NISN, kelas administratif aktif, kontak wali, status, dan ringkasan assignment akademik.
*   Implementation note: Added `/app/students` review surface with student directory, search, metrics, RightPullSheet create/edit form, guardian contact fields, class-section assignment, and academic eligibility summary. Added Students link to `/app/phase-1-review`.
*   TDD note: Added Vitest and `student-domain.test.ts` covering student filtering and dashboard metrics. Extracted `filterStudents` and `calculateStudentMetrics` into `student-domain.ts` and wired the page to the tested helpers.

### ISSUE-005: Academic Hierarchy (Administrative)
*   Manage Class Sections (e.g., 10-A, 11-B).
*   Student enrollment to Administrative Class.
*   Implementation note: Added `/app/classes` review surface with Class Sections CRUD, RightPullSheet create/edit flow, duplicate class-year guardrail, and student enrollment management with one-active-class warning.
*   Backend note: Added BE-4 academic foundation migration and API slice for `subjects`, `course_offerings`, and `teaching_assignments`. Course offerings explicitly link `class_sections` to `subjects` by academic year/term so administrative classes remain separate from academic teaching/exam targeting.

### ISSUE-006: Subject Groups (Rombongan Belajar)
*   UI & API untuk membuat Subject Groups (Academic Group).
*   Mekanisme memasukkan murid dari berbagai Class Sections ke satu Subject Group.
*   Implementation note: Added `/app/subject-groups` review surface with Subject Group CRUD, cross-section student membership management, class-section filtering, and academic-vs-administrative guardrail copy.

## Epic 3: Courses Module (Vertical Slice)
*Tujuan: Guru bisa membuat materi dan murid bisa membacanya.*

### ISSUE-007: Course Management (Teacher Side)
*   UI & API untuk CRUD Courses dan Modules.
*   BYO Storage Integration: Link Google Drive & YouTube metadata.
*   Gunakan `FloatingInput` dan `FloatingSelect` untuk form management.
*   Implementation note: Added `/app/courses` teacher review surface with Course CRUD, module management drawer, metadata-only YouTube/Google Drive resource linking, BYO storage guardrails, and local mock state.
*   Implementation note: Course audience assignment corrected to support multiple Subject Groups, multiple Class Sections, and individual Students, matching exam targeting expectations.
*   Implementation note: Audience Assignment UI redesigned from chip wall into scalable selector cards with counts and selected-target lists for schools with many classes/users.

### ISSUE-007.1: Google OAuth + Teacher-Owned Uploads
*   Tambahkan OAuth Google agar guru bisa menghubungkan akun Google mereka sendiri.
*   Gunakan OAuth scopes minimal untuk upload file ke Google Drive guru dan upload video ke YouTube guru.
*   Backend wajib menyimpan refresh token secara terenkripsi per user/tenant; client secret tidak boleh masuk frontend atau repository.
*   UI Course Modules harus mendukung mode upload langsung ke Google Drive/YouTube, lalu menyimpan metadata resource hasil upload.
*   Implementation note: Google app credentials provided by user for planning/config only. Secret must be rotated if exposed in chat/logs and stored via environment secret manager.
*   Implementation note: Added Course Modules UI review surface for Google OAuth connection state, Drive/YouTube upload modes, minimal scope badges, and resumable-upload simulation/progress preview.
*   Implementation note: Polished Google connect/upload simulation buttons with larger icon capsules and stronger visual hierarchy.
*   Implementation note: Fixed button icon background distortion by forcing icon containers to `shrink-0` square circles.
*   Implementation note: Reworked Audience Assignment inside course sheet from cramped 3-column cards into stacked full-width selector sections and removed the header icon for consistency with Course Profile.
*   Implementation note: Removed Subject Group from Course Profile form because subject targeting now lives in Audience Assignment below the profile fields.
*   Implementation note: Added Course/Exam Prerequisites UI to Course Management, including table summary counts and full-width prerequisite selectors for courses and exams.

### ISSUE-008: Course Viewer & Progress (Student Side)
*   UI Dashboard murid untuk list courses.
*   Course player (Video embed, doc viewer).
*   "Mark as Complete" logic dengan progress tracking.
*   Implementation note: Added `/app/learn` student review surface with eligible/blocked course states, module player preview, view/watch/download/complete event simulation, and prerequisite visibility.

### ISSUE-008.1: Course Monitoring Dashboard (Teacher/Admin Side)
*   UI monitoring untuk melihat siapa yang sudah membuka course, melihat video, download file, dan menyelesaikan materi.
*   Data monitoring harus mendukung evidence trail untuk prerequisites engine tanpa membuat Google/YouTube menjadi critical path LMS.
*   Implementation note: Added `/app/course-monitoring` review surface with course health, student activity, resource event cards, and low-spec async tracking guardrails.

## Epic 4: Exams Module (High-Concurrency Focus)
*Tujuan: Ujian yang tangguh dengan scheduling granular.*

### ISSUE-009: Exam Authoring (Teacher Side)
*   Question Bank: Multiple Choice & Essay support.
*   Exam setup: Duration, Rules, Prerequisites.
*   Implementation note: Updated Architecture & UI for `/app/exams`. `/app/exams` now aligns with `/app/courses` as a directory/listing page only, with metrics, search/filter, and row actions.
*   Implementation note: Created dedicated `/app/exams/[id]` Exam Manager page. Manager uses a two-column workspace: left column for exam configuration/settings, right column for questions manager, avoiding empty whitespace while keeping the directory clean.
*   Implementation note: Question type form dynamically supports Multiple Choice options + correct-answer selection, Short Answer expected answer, Essay rubric.
*   Implementation note: Added Duplicate Exam action so teachers can clone an exam into a new draft without carrying over submissions.

### ISSUE-010: Granular Visibility & Scheduler
*   UI & Logic untuk set `Published At` dan `Opened At`.
*   Targeting: Per Class, Per Group, atau Per Student.
*   Background worker untuk menghitung Materialized Eligibility.
*   Implementation note: Added Open Gate rules in `/app/exams` with class/group/student scope, optional password, optional publish/open/close scheduling, and student-facing schedule preview cards.
*   Implementation note: In `/app/exams/[id]`, Targeting and Gate Scheduling are merged into `Target & Gate Rules`: target rows each own publish/open/close overrides, with a global publish/open/close control for mass scheduling.

### ISSUE-011: Prerequisites Engine
*   Validasi akses Exam berdasarkan status Course Completion atau Exam sebelumnya.
*   Implementation note: Added `/app/exams/[id]` Eligibility Preview in Exam Manager. Teachers can simulate materialized eligibility from selected course/exam prerequisites, see eligible vs blocked counts, inspect per-student blocking reasons, and trigger a recalculation preview toast.
*   Architecture note: Runtime exam access should read from `exam_eligible_students` materialized at publish/recalculate time, not perform high-cardinality prerequisite joins during exam spikes.

### ISSUE-012: Resilient Exam Client (Offline-First)
*   Exam Interface (Modern UI, timer, question navigation).
*   IndexedDB Integration (Dexie) untuk auto-save jawaban lokal.
*   Jittered Background Sync mechanism.
*   Implementation note: Added `/app/take-exam/[id]` student exam-taking review surface with timer, question navigation, multi-answer MC interaction, autosave/sync state simulation, online/offline queue toggle, submit action, and digital receipt preview.
*   Implementation note: Added `Take` row action from `/app/exams` so reviewers open `/app/exam-gate/[id]` first, then continue to `/app/take-exam/[id]` only after rules/password gate checks pass.
*   Implementation note: Added `/app/exam-gate/[id]` with exam rules, schedule window, target/protection summary, password input simulation, rules acknowledgement, and server-token architecture copy before entering the exam client.
*   Implementation note: Submit now redirects to `/app/exam-result/[id]` instead of only showing a toast. Result page displays digital receipt, submission path/status, and instant score when the exam is fully multiple-choice and teacher policy allows auto-calculation; mixed/essay exams show grading pending copy.
*   Implementation note: Added secure fullscreen shell for gate, take-exam, and receipt pages. The flow uses a centered max-width surface, distinct exam-mode background, lightweight fade/slide animations, auto fullscreen request on mount where browser policy allows it, auto re-enter fullscreen after `Esc`/fullscreen exit when secure mode is required, auto fullscreen exit on back/anchor navigation, and violation logging for fullscreen exit, tab hidden, or window blur events.
*   Implementation note: Added teacher-configurable `securityMode` in Exam Profile: `secure_required` (default; fullscreen forced with violation counter) or `unsecure_allowed` (manual secure mode control allowed for non-strict exams).

### ISSUE-013: Ingestion Shock Absorber (Inbox & Receipt)
*   Implement `exam_submission_inbox` (Postgres append-only).
*   API endpoint untuk submit yang mengembalikan Digital Receipt (receipt_id).
*   Relay submission data ke NATS JetStream.
*   Implementation note: Added `/app/exams/[id]/monitor` live dashboard review surface to visualize the ingestion shock absorber. Includes metrics for active/offline students, NATS inbox queue processing simulation, and a live feed of student submits and security violations.
*   Backend note: Added first exam ingestion API slice with TDD: `POST /api/v1/exams/{exam_id}/attempts/{attempt_id}/submit` now requires tenant context, validates payload, appends raw JSON to `exam_submission_inbox`, records `exam_submission_receipts`, and returns immediate `202 Accepted` digital receipt.
*   Backend note: Added autosave ingestion path `POST /api/v1/exams/{exam_id}/attempts/{attempt_id}/autosave`; `exam_submission_inbox.submission_kind` distinguishes `autosave` vs `final_submit` rows while preserving the same append-only receipt pattern.
*   Backend note: Added tenant-scoped receipt verification endpoint `GET /api/v1/receipts/{receipt_id}` returning receipt metadata, submission kind, received timestamp, and relay status for proof-of-submission checks before async grading completes.
*   Backend note: Added first async NATS JetStream relay for `exam_submission_inbox`; backend auto-creates file-backed stream `MORFOSIS_EXAM_SUBMISSIONS`, publishes to `morfosis.exam.submissions.{kind}`, prioritizes final submits before autosaves, and marks `relayed_at` only after successful publish.

## Epic 5: Grading & Analytics
*Tujuan: Penilaian otomatis dan manual essay.*

### ISSUE-014: Async Grading Worker
*   NATS Consumer untuk auto-grade Multiple Choice.
*   Update final status: `COMPLETED` atau `WAITING_FOR_GRADING`.

### ISSUE-015: Manual Essay Grading Dashboard
*   UI Guru untuk menilai jawaban essay yang tertunda.
*   Final score calculation & notification.
*   Implementation note: Added `/app/exams/[id]/grading` manual essay grading dashboard review surface with submission queue filters, MC worker score summary, essay answer review, rubric panel, manual score input, feedback field, final-score calculation, and links from Exam Directory and Exam Manager.

### ISSUE-016: Final Review & Performance Testing
*   Load test: Simulasi 500-1000 murid submit serentak pada VPS 2GB.
*   Fix bottlenecks di level DB index atau connection pooling.
*   Implementation note: Added `/app/exams/[id]/performance` Exam Load Test Lab review surface with 500/1000/offline-replay scenarios, simulated receipt p95, inbox queue peak, DB CPU, worker lag, bottleneck checklist, pass criteria, and navigation links from Exam Directory and Exam Manager.

## Issue Documentation Protocol
*   Jika selama implementasi ditemukan pekerjaan baru di luar scope issue yang sudah ada, **jangan hapus atau rewrite issue lama**.
*   Tambahkan sub-issue dengan format decimal, contoh: `ISSUE-014.1`, `ISSUE-014.2`, atau `ISSUE-002.1`.
*   Sub-issue harus ditempatkan dekat issue induknya bila relevan, atau di bagian `Unplanned Follow-up Issues` jika lintas modul.
*   Semua update issue harus bersifat append-only atau patch targeted, bukan overwrite keseluruhan file.

## Unplanned Follow-up Issues

### ISSUE-017: Phase 1 Final Product Flow Review
*   Review seluruh UI lifecycle sebelum DB schema dan Backend Foundation Sprint dimulai.
*   Pastikan Admin, Guru, dan Murid bisa menelusuri flow utama: tenancy, academic grouping, courses, exams, gate, take exam, result, monitor, grading, dan performance test.
*   Implementation note: Added `/app/phase-1-review` as the final review hub with links to all review surfaces and a DB/backend readiness checklist. Added sidebar navigation entry `Review`.
