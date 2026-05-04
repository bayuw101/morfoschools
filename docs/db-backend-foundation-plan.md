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
- [~] Exam ingestion tables:
  - [x] `exam_attempts`
  - [x] `exam_submission_inbox` partitioned by day
  - [x] `exam_submission_receipts`
  - [ ] `exam_security_events`

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
