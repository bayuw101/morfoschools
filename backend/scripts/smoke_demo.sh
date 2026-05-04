#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SEED_SQL="$ROOT_DIR/backend/seeds/demo.sql"

export MORFOSIS_DEMO_TENANT_ID="00000000-0000-4000-8000-000000000001"
export MORFOSIS_DEMO_TEACHER_ID="00000000-0000-4000-8000-000000000102"
export MORFOSIS_DEMO_STUDENT_ID="00000000-0000-4000-8000-000000000301"
export MORFOSIS_DEMO_EXAM_ID="00000000-0000-4000-8000-000000000801"
export MORFOSIS_DEMO_ATTEMPT_ID="00000000-0000-4000-8000-000000000901"
export MORFOSIS_DEMO_RECEIPT_ID="00000000-0000-4000-8000-000000000911"
export MORFOSIS_DEMO_GATE_PASSWORD="demo123"

cd "$ROOT_DIR"

echo "[demo] applying seed data..."
docker compose exec -T postgres psql -U morfosis -d morfosis -v ON_ERROR_STOP=1 < "$SEED_SQL" >/dev/null

echo "[demo] validating seeded graph..."
docker compose exec -T postgres psql -U morfosis -d morfosis -v ON_ERROR_STOP=1 -tAc "
WITH checks AS (
    SELECT 'tenant' AS name, COUNT(*) AS count FROM tenants WHERE id = '$MORFOSIS_DEMO_TENANT_ID' AND slug = 'morfosis-demo-school'
    UNION ALL SELECT 'students', COUNT(*) FROM students WHERE tenant_id = '$MORFOSIS_DEMO_TENANT_ID'
    UNION ALL SELECT 'course', COUNT(*) FROM courses WHERE tenant_id = '$MORFOSIS_DEMO_TENANT_ID'
    UNION ALL SELECT 'exam_questions', COUNT(*) FROM exam_questions WHERE tenant_id = '$MORFOSIS_DEMO_TENANT_ID' AND exam_id = '$MORFOSIS_DEMO_EXAM_ID'
    UNION ALL SELECT 'exam_eligible_students', COUNT(*) FROM exam_eligible_students WHERE tenant_id = '$MORFOSIS_DEMO_TENANT_ID' AND exam_id = '$MORFOSIS_DEMO_EXAM_ID' AND eligibility_status = 'eligible'
    UNION ALL SELECT 'exam_gate_windows', COUNT(*) FROM exam_gate_windows WHERE tenant_id = '$MORFOSIS_DEMO_TENANT_ID' AND exam_id = '$MORFOSIS_DEMO_EXAM_ID' AND password = '$MORFOSIS_DEMO_GATE_PASSWORD'
    UNION ALL SELECT 'manual-grading', COUNT(*) FROM exam_grade_results WHERE tenant_id = '$MORFOSIS_DEMO_TENANT_ID' AND exam_id = '$MORFOSIS_DEMO_EXAM_ID' AND status = 'waiting_for_grading'
)
SELECT CASE WHEN bool_and(count > 0) THEN 'ok' ELSE 'failed: ' || string_agg(name || '=' || count, ', ') END FROM checks;
" | tee /tmp/morfosis-demo-smoke.txt

if ! grep -q '^ok$' /tmp/morfosis-demo-smoke.txt; then
    echo "[demo] smoke validation failed" >&2
    exit 1
fi

cat <<SUMMARY
[demo] ready
  MORFOSIS_DEMO_TENANT_ID=$MORFOSIS_DEMO_TENANT_ID
  MORFOSIS_DEMO_STUDENT_ID=$MORFOSIS_DEMO_STUDENT_ID
  MORFOSIS_DEMO_EXAM_ID=$MORFOSIS_DEMO_EXAM_ID
  MORFOSIS_DEMO_ATTEMPT_ID=$MORFOSIS_DEMO_ATTEMPT_ID
  MORFOSIS_DEMO_RECEIPT_ID=$MORFOSIS_DEMO_RECEIPT_ID
  MORFOSIS_DEMO_GATE_PASSWORD=$MORFOSIS_DEMO_GATE_PASSWORD

Suggested API surfaces to try with these IDs:
  POST /api/v1/exams/$MORFOSIS_DEMO_EXAM_ID/gate/check
  GET  /api/v1/exams/$MORFOSIS_DEMO_EXAM_ID/attempts/$MORFOSIS_DEMO_ATTEMPT_ID/result
  GET  /api/v1/exams/$MORFOSIS_DEMO_EXAM_ID/manual-grading
  POST /api/v1/exams/$MORFOSIS_DEMO_EXAM_ID/attempts/$MORFOSIS_DEMO_ATTEMPT_ID/manual-grade
SUMMARY
