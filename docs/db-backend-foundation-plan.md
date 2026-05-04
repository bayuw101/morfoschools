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
  - [ ] `internal/modules/identity`
  - [ ] `internal/modules/academic`
  - [ ] `internal/modules/exams`
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
  - [ ] `subjects`
  - [ ] `course_offerings`
  - [ ] `teaching_assignments`
  - [ ] `subject_group_memberships`
- [ ] Course tables:
  - [ ] `courses`
  - [ ] `course_modules`
  - [ ] `course_resources`
  - [ ] `course_progress_events`
- [~] Exam core tables:
  - [x] `exams`
  - [ ] `exam_questions`
  - [ ] `exam_targets`
  - [ ] `exam_gate_windows`
  - [ ] `exam_prerequisites`
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
