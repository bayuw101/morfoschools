package exams

import (
	"context"
	"encoding/json"
)

type eligibilityTargetStudent struct {
	StudentID string
	Name      string
}

type eligibilityPrerequisite struct {
	PrerequisiteType string
	RequiredID       string
}

func (repo PostgresSubmissionRepository) ListEligibility(ctx context.Context, tenantID, examID string) ([]ExamEligibilityRow, error) {
	rows, err := repo.pool.Query(ctx, `
SELECT eligibility.exam_id::text, eligibility.student_id::text, students.name, eligibility.eligibility_status, eligibility.blocking_reasons, eligibility.calculated_at
FROM exam_eligible_students eligibility
JOIN students ON students.id = eligibility.student_id AND students.tenant_id = eligibility.tenant_id
WHERE eligibility.tenant_id = $1 AND eligibility.exam_id = $2
ORDER BY students.name ASC`, tenantID, examID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []ExamEligibilityRow{}
	for rows.Next() {
		var item ExamEligibilityRow
		var raw []byte
		if err := rows.Scan(&item.ExamID, &item.StudentID, &item.StudentName, &item.EligibilityStatus, &raw, &item.CalculatedAt); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(raw, &item.BlockingReasons)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (repo PostgresSubmissionRepository) RecalculateEligibility(ctx context.Context, tenantID, examID string) (EligibilityRecalculationResult, error) {
	prereqs, err := repo.fetchEligibilityPrerequisites(ctx, tenantID, examID)
	if err != nil {
		return EligibilityRecalculationResult{}, err
	}
	targets, err := repo.fetchTargetStudents(ctx, tenantID, examID)
	if err != nil {
		return EligibilityRecalculationResult{}, err
	}

	tx, err := repo.pool.Begin(ctx)
	if err != nil {
		return EligibilityRecalculationResult{}, err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `DELETE FROM exam_eligible_students WHERE tenant_id=$1 AND exam_id=$2`, tenantID, examID); err != nil {
		return EligibilityRecalculationResult{}, err
	}
	result := EligibilityRecalculationResult{ExamID: examID, TotalCount: len(targets)}
	for _, target := range targets {
		reasons, err := repo.blockingReasonsForStudent(ctx, tenantID, target.StudentID, prereqs)
		if err != nil {
			return EligibilityRecalculationResult{}, err
		}
		status := "eligible"
		if len(reasons) > 0 {
			status = "blocked"
			result.BlockedCount++
		} else {
			result.EligibleCount++
		}
		reasonsJSON, _ := json.Marshal(reasons)
		if _, err := tx.Exec(ctx, `
INSERT INTO exam_eligible_students (tenant_id, exam_id, student_id, eligibility_status, blocking_reasons, calculated_at)
VALUES ($1,$2,$3,$4,$5,now())
ON CONFLICT (tenant_id, exam_id, student_id) DO UPDATE SET eligibility_status=EXCLUDED.eligibility_status, blocking_reasons=EXCLUDED.blocking_reasons, calculated_at=now()`, tenantID, examID, target.StudentID, status, reasonsJSON); err != nil {
			return EligibilityRecalculationResult{}, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return EligibilityRecalculationResult{}, err
	}
	return result, nil
}

func (repo PostgresSubmissionRepository) fetchEligibilityPrerequisites(ctx context.Context, tenantID, examID string) ([]eligibilityPrerequisite, error) {
	rows, err := repo.pool.Query(ctx, `SELECT prerequisite_type, required_id::text FROM exam_prerequisites WHERE tenant_id=$1 AND exam_id=$2 ORDER BY created_at ASC`, tenantID, examID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []eligibilityPrerequisite{}
	for rows.Next() {
		var item eligibilityPrerequisite
		if err := rows.Scan(&item.PrerequisiteType, &item.RequiredID); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (repo PostgresSubmissionRepository) fetchTargetStudents(ctx context.Context, tenantID, examID string) ([]eligibilityTargetStudent, error) {
	rows, err := repo.pool.Query(ctx, `
WITH targets AS (
    SELECT target_type, target_id FROM exam_targets WHERE tenant_id=$1 AND exam_id=$2
), students_from_classes AS (
    SELECT DISTINCT students.id, students.name
    FROM targets
    JOIN student_class_enrollments enrollments ON targets.target_type = 'class_section' AND enrollments.class_section_id = targets.target_id AND enrollments.tenant_id = $1 AND enrollments.active
    JOIN students ON students.id = enrollments.student_id AND students.tenant_id = $1 AND students.status = 'active'
), students_from_groups AS (
    SELECT DISTINCT students.id, students.name
    FROM targets
    JOIN subject_group_members members ON targets.target_type = 'subject_group' AND members.group_id = targets.target_id AND members.tenant_id = $1 AND members.status = 'active'
    JOIN students ON students.id = members.student_id AND students.tenant_id = $1 AND students.status = 'active'
), individual_students AS (
    SELECT DISTINCT students.id, students.name
    FROM targets
    JOIN students ON targets.target_type = 'student' AND students.id = targets.target_id AND students.tenant_id = $1 AND students.status = 'active'
)
SELECT id::text, name FROM students_from_classes
UNION
SELECT id::text, name FROM students_from_groups
UNION
SELECT id::text, name FROM individual_students
ORDER BY name ASC`, tenantID, examID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []eligibilityTargetStudent{}
	for rows.Next() {
		var item eligibilityTargetStudent
		if err := rows.Scan(&item.StudentID, &item.Name); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (repo PostgresSubmissionRepository) blockingReasonsForStudent(ctx context.Context, tenantID, studentID string, prereqs []eligibilityPrerequisite) ([]string, error) {
	reasons := []string{}
	for _, prereq := range prereqs {
		var exists bool
		switch prereq.PrerequisiteType {
		case "course_completed":
			err := repo.pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM course_progress_events WHERE tenant_id=$1 AND student_id=$2 AND course_id=$3 AND event_type='completed')`, tenantID, studentID, prereq.RequiredID).Scan(&exists)
			if err != nil {
				return nil, err
			}
		case "exam_completed":
			err := repo.pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM exam_attempts WHERE tenant_id=$1 AND student_id=$2 AND exam_id=$3 AND status IN ('completed','submitted'))`, tenantID, studentID, prereq.RequiredID).Scan(&exists)
			if err != nil {
				return nil, err
			}
		default:
			exists = false
		}
		if !exists {
			reasons = append(reasons, prereq.PrerequisiteType+":"+prereq.RequiredID)
		}
	}
	return reasons, nil
}
