#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEED = ROOT / "seeds" / "demo.sql"
SMOKE = ROOT / "scripts" / "smoke_demo.sh"

REQUIRED_SEED_TOKENS = [
    "morfosis-demo-school",
    "exam_eligible_students",
    "exam_gate_windows",
    "exam_questions",
    "answer_key",
    "exam_attempts",
]

REQUIRED_SMOKE_TOKENS = [
    "MORFOSIS_DEMO_TENANT_ID",
    "MORFOSIS_DEMO_EXAM_ID",
    "MORFOSIS_DEMO_ATTEMPT_ID",
    "manual-grading",
    "monitor",
]


def test_demo_seed_exists_and_covers_exam_flow():
    content = SEED.read_text()
    missing = [token for token in REQUIRED_SEED_TOKENS if token not in content]
    assert not missing, f"demo seed missing tokens: {missing}"


def test_smoke_script_exists_and_checks_demo_flow():
    content = SMOKE.read_text()
    missing = [token for token in REQUIRED_SMOKE_TOKENS if token not in content]
    assert not missing, f"smoke script missing tokens: {missing}"
    assert "set -euo pipefail" in content


if __name__ == "__main__":
    test_demo_seed_exists_and_covers_exam_flow()
    test_smoke_script_exists_and_checks_demo_flow()
    print("demo seed validation passed")
