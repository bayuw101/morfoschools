# Exam Wiring Checklist

## 0. Audit surface
- [x] Map all exam frontend routes and shared domain helpers.
- [x] Map all backend exam modules, routes, middleware, and permissions.
- [x] Confirm which surfaces are admin-only, teacher-only, and student-only.
- [x] Confirm tenant scoping for every request path.

## 1. Admin flows
- [x] Exam list loads from backend.
- [x] Exam detail loads from backend.
- [ ] Exam builder validates publish readiness.
- [ ] Targeting/assignment data is sourced from backend.
- [ ] Gate rules persist and render correctly.
- [ ] Publish action is blocked when blockers exist.
- [x] Monitor/overview routes show real data.

## 2. Teacher flows
- [ ] Teacher can view assigned exams only.
- [x] Teacher can open monitor view.
- [x] Teacher can view manual grading queue.
- [x] Teacher can save grading decisions.
- [x] Teacher routes are blocked for students by backend permission tests.

## 3. Student flows
- [x] Exam gate validates eligibility and schedule.
- [x] Take-exam loads real exam/question data.
- [x] Autosave persists answers through backend API client.
- [x] Final submit reaches backend API client.
- [x] Result page renders backend receipt/result when available.
- [x] Offline/blocked states are handled safely.

## 4. Security and RBAC
- [x] Backend enforces permission on every sensitive exam route.
- [x] Forged client headers cannot bypass authorization.
- [ ] Frontend route guard matches backend policy for UX only.
- [x] Tenant ID always comes from authenticated session/runtime; demo tenant fallback removed.

## 5. Tests and verification
- [x] Add focused domain tests for helper logic.
- [x] Add endpoint/API tests for exam adapter and backend contracts.
- [x] Run backend test suite for exam-related modules.
- [x] Run frontend tests for exam pages/helpers.
- [x] Run frontend build.
- [ ] Smoke test routes in browser for admin/teacher/student (blocked until backend/auth login is running locally).

## 6. Unplanned follow-up issues
- [ ] Create exam backend module if gaps remain after audit.
- [ ] Add monitoring/observability improvements if needed.
- [ ] Add audit log/event trail if the current path is insufficient.
