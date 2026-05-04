# DB + Backend Foundation — LMS Morfosis

## Objective
Build the low-spec friendly backend foundation for a multi-tenant Indonesian school LMS using Go modular monolith, PostgreSQL, PgBouncer, NATS JetStream, Valkey, and ClickHouse later for analytics.

## Guardrails

- Exam critical path must not depend on Google, AI, ClickHouse, or other external APIs.
- All operational data carries `tenant_id`.
- Prefer shared-schema multitenancy for low-spec VPS efficiency.
- Keep exam submission write path append-only and cheap.
- Use Docker Compose for reproducible local/VPS deployment.
- Backend implementation should use TDD where possible; DB migrations must be reviewed through repeatable integration checks.

## Phase BE-0 — Infrastructure Skeleton

- [x] Add root Docker Compose with:
  - [x] PostgreSQL
  - [x] PgBouncer
  - [x] NATS JetStream
  - [x] Valkey
  - [x] Backend Go API service
- [x] Add backend Dockerfile using Go image so local host does not need Go installed.
- [x] Add backend folder structure:
  - [x] `cmd/api`
  - [x] `internal/platform/config`
  - [x] `internal/platform/http`
  - [x] `internal/platform/db`
  - [x] `internal/modules/tenancy`
  - [x] `internal/modules/identity`
  - [x] `internal/modules/academic`
  - [x] `internal/modules/exams`
  - [x] `migrations`

## Phase DB-1 — Core Schema

- [x] Tenancy tables:
  - [x] `tenants`
  - [x] `tenant_users`
- [~] Identity tables:
  - [x] `users`
  - [ ] `user_roles`
- [~] Academic tables:
  - [x] `students`
  - [x] `class_sections`
  - [x] `student_class_enrollments`
  - [x] `subjects`
  - [x] `course_offerings`
  - [x] `teaching_assignments`
  - [x] `subject_groups`
  - [x] `subject_group_members`
- [x] Course tables:
  - [x] `courses`
  - [x] `course_modules`
  - [x] `course_resources`
  - [x] `course_progress_events`
- [x] Exam core tables:
  - [x] `exams`
  - [x] `exam_questions`
  - [x] `exam_targets`
  - [x] `exam_gate_windows`
  - [x] `exam_prerequisites`
  - [x] `exam_eligible_students`
- [x] Exam ingestion/runtime tables:
  - [x] `exam_attempts`
  - [x] `exam_submission_inbox` partitioned by day
  - [x] `exam_submission_receipts`
  - [x] `exam_security_events`

## Phase BE-1 — API Vertical Slice

Start small with tenancy + health.

- [x] `GET /healthz`
- [x] `GET /readyz`
- [x] `GET /api/v1/tenants`
- [x] `POST /api/v1/tenants`
- [x] tenant context middleware from `X-Tenant-ID` header
- [x] DB connection through PgBouncer in app runtime

## Phase BE-2 — Exam Critical Path

- [x] `POST /api/v1/exams/{exam_id}/attempts/{attempt_id}/autosave`
- [x] `POST /api/v1/exams/{exam_id}/attempts/{attempt_id}/submit`
- [x] write submit payload to `exam_submission_inbox`
- [x] return digital receipt immediately
- [x] `GET /api/v1/receipts/{receipt_id}` verifies a tenant-scoped digital receipt without touching external services
- [x] relay inbox rows to NATS JetStream asynchronously

## Phase BE-3 — Identity Foundation

- [x] `GET /api/v1/users` lists tenant-scoped users
- [x] `POST /api/v1/users` creates or updates a global user and tenant membership role
- [ ] authentication/session tokens
- [x] role authorization middleware

## Phase BE-4 — Academic Foundation

- [x] `GET /api/v1/academic/subjects` lists tenant-scoped subjects
- [x] `POST /api/v1/academic/subjects` creates/updates subjects by tenant + code
- [x] `GET /api/v1/academic/course-offerings` lists subject-to-class offerings per academic year/term
- [x] `POST /api/v1/academic/course-offerings` creates/activates course offerings
- [x] `GET /api/v1/academic/teaching-assignments` lists teacher assignments
- [x] `POST /api/v1/academic/teaching-assignments` assigns teachers to course offerings
- [x] `GET /api/v1/academic/subject-groups` lists flexible academic groups
- [x] `POST /api/v1/academic/subject-groups` creates/activates subject groups by subject/year/term
- [x] `GET /api/v1/academic/subject-groups/{group_id}/members` lists cross-class group members
- [x] `POST /api/v1/academic/subject-groups/{group_id}/members` adds/reactivates a student membership

## Phase BE-5 — Course Foundation

- [x] `GET /api/v1/courses` lists tenant-scoped courses with module counts
- [x] `POST /api/v1/courses` creates/updates courses linked to `course_offerings`
- [x] `GET /api/v1/courses/{course_id}/modules` lists course modules
- [x] `POST /api/v1/courses/{course_id}/modules` creates/updates ordered modules
- [x] `GET /api/v1/course-modules/{module_id}/resources` lists module resources
- [x] `POST /api/v1/course-modules/{module_id}/resources` creates/updates metadata-only resources
- [x] `POST /api/v1/course-progress-events` records low-cost evidence trail events for prerequisites/monitoring

## Phase BE-6 — Exam Management Foundation

- [x] `GET /api/v1/exams` lists tenant-scoped exams with question counts
- [x] `POST /api/v1/exams` creates exam profile/configuration
- [x] `GET /api/v1/exams/{exam_id}/questions` lists ordered exam questions
- [x] `POST /api/v1/exams/{exam_id}/questions` creates/updates questions with MC/short-answer/essay support
- [x] `GET /api/v1/exams/{exam_id}/targets` lists target rules
- [x] `POST /api/v1/exams/{exam_id}/targets` creates class/group/student targets
- [x] `GET /api/v1/exams/{exam_id}/gate-windows` lists publish/open/close windows
- [x] `POST /api/v1/exams/{exam_id}/gate-windows` creates gate windows with close-after-open validation
- [x] `GET /api/v1/exams/{exam_id}/prerequisites` lists prerequisite rules
- [x] `POST /api/v1/exams/{exam_id}/prerequisites` creates course/exam completion prerequisites

## Phase BE-7 — Eligibility Materialization

- [x] `GET /api/v1/exams/{exam_id}/eligibility` lists materialized eligibility rows from `exam_eligible_students`
- [x] `POST /api/v1/exams/{exam_id}/eligibility/recalculate` recalculates tenant-scoped target students from class/group/student target rules
- [x] Course completion prerequisites use `course_progress_events` evidence, keeping Google/YouTube outside the exam critical path
- [x] Exam completion prerequisites use existing `exam_attempts` completion/submission state
- [x] Runtime exam access remains designed to read `exam_eligible_students`, not join targets/prerequisites during spikes

## Phase BE-8 — Exam Gate & Security Events

- [x] `POST /api/v1/exams/{exam_id}/gate/check` validates materialized eligibility plus gate-window/password access before students enter the exam client
- [x] Gate checks use `exam_eligible_students` and `exam_gate_windows`, preserving the low-cost runtime path for exam spikes
- [x] `POST /api/v1/exams/{exam_id}/attempts/{attempt_id}/security-events` records fullscreen/tab/window/network/copy-paste violations as append-only tenant-scoped events
- [x] `exam_security_events` indexes support attempt-level audit and teacher monitoring dashboards

## Phase BE-9 — Async Grading Worker

- [x] `exam_questions.answer_key` stores MC answer keys for automatic grading
- [x] `exam_grade_results` stores idempotent per-receipt grading outcomes, auto score, max score, manual-grading flag, and question-level result JSON
- [x] Background grading worker polls ungraded final submissions from the inbox path and records `completed` for fully auto-gradable MC exams
- [x] Mixed/essay exams move attempts to `waiting_for_grading` while preserving the automatically scored portion

## Phase BE-10 — Manual Grading API

- [x] `GET /api/v1/exams/{exam_id}/manual-grading` lists attempts waiting for manual essay/short-answer review
- [x] `POST /api/v1/exams/{exam_id}/attempts/{attempt_id}/manual-grade` records teacher manual score, feedback, grader identity, and final score
- [x] Manual grading completion updates `exam_grade_results` and moves the attempt to `completed`
- [x] Queue index keeps teacher grading dashboard reads scoped by tenant/exam and ordered by oldest pending item

## Phase BE-11 — Demo Seed + Smoke Test

- [x] `backend/seeds/demo.sql` provides idempotent low-spec demo data for one tenant, teacher, students, class, subject, course, module/resource, exam, target, gate window, materialized eligibility, attempt, receipt, and manual-grading queue item
- [x] Demo seed keeps exam runtime dependencies local to PostgreSQL and does not require Google/YouTube/AI/ClickHouse on the critical path
- [x] `backend/scripts/validate_demo_seed.py` verifies the seed/smoke artifacts cover the expected exam flow contract
- [x] `backend/scripts/smoke_demo.sh` applies the seed through Docker Compose PostgreSQL and validates the seeded graph with deterministic demo IDs for manual API testing

## Verification

- [x] `docker compose config`
- [x] `docker compose up -d postgres pgbouncer nats valkey backend`
- [x] migrations apply cleanly for `000001_core_foundation.sql`
- [x] backend tests run via Docker Go image
- [x] `docker compose build backend`
- [x] `GET /healthz` works
- [x] `GET /readyz` verifies DB connectivity
- [x] `POST /api/v1/tenants` creates a tenant with low-spec defaults
- [x] `GET /api/v1/tenants` returns DB-backed tenants

## Progress Log

- 2026-05-04: Completed BE-1 tenancy vertical slice. Added `internal/platform/db`, `internal/platform/tenantctx`, and `internal/modules/tenancy`; wired `cmd/api` to health/readiness plus DB-backed tenant list/create endpoints; verified Docker Go tests, backend image build, full compose runtime, health/readiness, and tenant CRUD smoke test.
- 2026-05-04: Started BE-2 exam critical path. Added TDD coverage and implementation for `POST /api/v1/exams/{exam_id}/attempts/{attempt_id}/submit`, storing raw payloads in `exam_submission_inbox`, recording `exam_submission_receipts`, and returning an immediate `202 Accepted` digital receipt. Verified backend tests, backend image build, compose runtime, and submit smoke test.
- 2026-05-04: Added autosave ingestion slice. `POST /api/v1/exams/{exam_id}/attempts/{attempt_id}/autosave` now reuses the same append-only inbox path with `submission_kind = 'autosave'`, returns an immediate digital receipt, and keeps final submit distinguishable as `final_submit` for downstream workers.
- 2026-05-04: Added tenant-scoped receipt verification endpoint. `GET /api/v1/receipts/{receipt_id}` returns accepted receipt metadata, submission kind, received timestamp, and relay status so students/operators can verify proof-of-submission independently from async grading/relay state.
- 2026-05-04: Completed first asynchronous NATS JetStream relay. Backend now connects to `NATS_URL`, auto-creates the file-backed `MORFOSIS_EXAM_SUBMISSIONS` stream if missing, polls unrelayed inbox rows, prioritizes `final_submit` before `autosave`, publishes events to `morfosis.exam.submissions.{kind}`, then marks rows relayed only after successful publish.
- 2026-05-04: Started BE-3 identity foundation. Added TDD coverage and implementation for `GET /api/v1/users` and `POST /api/v1/users`, with tenant context required, email/name/role validation, global `users` upsert, and tenant membership role assignment through `tenant_users`.
- 2026-05-04: Added lightweight auth context and role authorization middleware. `authctx.Middleware` reads `X-User-ID`/`X-User-Role`, stores the authenticated user in request context, and `RequireRoles(...)` returns `401 user_required` or `403 role_forbidden` for protected routes. This is a temporary boundary until proper session/JWT tokens are implemented.
- 2026-05-04: Completed BE-4 academic foundation slice. Added `subjects`, `course_offerings`, and `teaching_assignments` migration plus TDD-covered academic handlers/repository for subject CRUD, subject-to-class course offerings, and teacher assignments. This preserves the administrative-vs-academic model: `class_sections` remain administrative, while `course_offerings` link classes to subjects for learning/exam targeting.
- 2026-05-04: Completed subject group membership backend. Added `subject_groups` and `subject_group_members` migration plus TDD-covered APIs for flexible cross-class academic groups and student membership, enabling lintas minat/remedial/enrichment targeting without changing administrative class enrollment.
- 2026-05-04: Completed BE-5 course foundation. Added `courses`, `course_modules`, `course_resources`, and `course_progress_events` migration plus TDD-covered APIs for course/module/resource management and progress evidence events. Resources store metadata/external URLs only so Google Drive/YouTube remain outside LMS critical path.
- 2026-05-04: Completed BE-6 exam management foundation. Added `exam_questions`, `exam_targets`, `exam_gate_windows`, and `exam_prerequisites` migration plus TDD-covered APIs for exam profiles, authoring, target rules, gate scheduling, and prerequisite rules. Ingestion endpoints remain routed through the same `/api/v1/exams/.../attempts/...` path for the exam critical path.
- 2026-05-04: Completed BE-7 eligibility materialization API. Added TDD-covered `GET /api/v1/exams/{exam_id}/eligibility` and `POST /api/v1/exams/{exam_id}/eligibility/recalculate`, using exam targets + prerequisites to materialize `exam_eligible_students` before runtime exam spikes.
- 2026-05-04: Completed BE-8 exam gate and security events. Added TDD-covered `POST /api/v1/exams/{exam_id}/gate/check` for materialized eligibility + gate-window/password checks, plus `POST /api/v1/exams/{exam_id}/attempts/{attempt_id}/security-events` and `exam_security_events` for append-only exam-mode violation audit.
- 2026-05-04: Completed BE-9 async grading worker. Added MC answer keys, `exam_grade_results`, TDD-covered grading logic for final submissions, auto-score completion for MC-only exams, and `waiting_for_grading` status for essay/mixed exams.
- 2026-05-04: Completed BE-10 manual grading API. Added TDD-covered queue and grading endpoints for essay/manual review, teacher feedback/scoring fields, final score calculation, and attempt completion after manual grading.
- 2026-05-04: Completed BE-11 demo seed and smoke validation. Added idempotent local demo data plus deterministic smoke checks so the backend can be tried without hand-crafting UUID graph data.
