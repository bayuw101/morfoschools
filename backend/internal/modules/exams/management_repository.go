package exams

import (
	"context"
	"encoding/json"
)

func (repo PostgresSubmissionRepository) ListExams(ctx context.Context, tenantID string) ([]Exam, error) {
	rows, err := repo.pool.Query(ctx, `
SELECT exams.id::text, exams.title, exams.subject_name, exams.status, exams.duration_minutes, exams.security_mode, COALESCE(exams.created_by::text,''), COUNT(exam_questions.id)::int
FROM exams
LEFT JOIN exam_questions ON exam_questions.exam_id = exams.id AND exam_questions.tenant_id = exams.tenant_id
WHERE exams.tenant_id = $1
GROUP BY exams.id
ORDER BY exams.updated_at DESC`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []Exam{}
	for rows.Next() {
		var item Exam
		if err := rows.Scan(&item.ID, &item.Title, &item.SubjectName, &item.Status, &item.DurationMinutes, &item.SecurityMode, &item.CreatedBy, &item.QuestionCount); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (repo PostgresSubmissionRepository) CreateExam(ctx context.Context, tenantID string, p CreateExamParams) (Exam, error) {
	var item Exam
	err := repo.pool.QueryRow(ctx, `
INSERT INTO exams (tenant_id, title, subject_name, status, duration_minutes, security_mode, created_by)
VALUES ($1,$2,$3,$4,$5,$6,NULLIF($7,'')::uuid)
RETURNING id::text, title, subject_name, status, duration_minutes, security_mode, COALESCE(created_by::text,''), 0`, tenantID, p.Title, p.SubjectName, p.Status, p.DurationMinutes, p.SecurityMode, p.CreatedBy).Scan(&item.ID, &item.Title, &item.SubjectName, &item.Status, &item.DurationMinutes, &item.SecurityMode, &item.CreatedBy, &item.QuestionCount)
	return item, err
}

func (repo PostgresSubmissionRepository) ListQuestions(ctx context.Context, tenantID, examID string) ([]ExamQuestion, error) {
	rows, err := repo.pool.Query(ctx, `SELECT id::text, exam_id::text, question_type, prompt, position, points, options, rubric FROM exam_questions WHERE tenant_id=$1 AND exam_id=$2 ORDER BY position ASC`, tenantID, examID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []ExamQuestion{}
	for rows.Next() {
		var item ExamQuestion
		var raw []byte
		if err := rows.Scan(&item.ID, &item.ExamID, &item.QuestionType, &item.Prompt, &item.Position, &item.Points, &raw, &item.Rubric); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(raw, &item.Options)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (repo PostgresSubmissionRepository) CreateQuestion(ctx context.Context, tenantID, examID string, p CreateExamQuestionParams) (ExamQuestion, error) {
	options, err := json.Marshal(p.Options)
	if err != nil {
		return ExamQuestion{}, err
	}
	var item ExamQuestion
	var raw []byte
	err = repo.pool.QueryRow(ctx, `
INSERT INTO exam_questions (tenant_id, exam_id, question_type, prompt, position, points, options, rubric)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
ON CONFLICT (tenant_id, exam_id, position) DO UPDATE SET question_type=EXCLUDED.question_type, prompt=EXCLUDED.prompt, points=EXCLUDED.points, options=EXCLUDED.options, rubric=EXCLUDED.rubric, updated_at=now()
RETURNING id::text, exam_id::text, question_type, prompt, position, points, options, rubric`, tenantID, examID, p.QuestionType, p.Prompt, p.Position, p.Points, options, p.Rubric).Scan(&item.ID, &item.ExamID, &item.QuestionType, &item.Prompt, &item.Position, &item.Points, &raw, &item.Rubric)
	if err != nil {
		return item, err
	}
	_ = json.Unmarshal(raw, &item.Options)
	return item, nil
}

func (repo PostgresSubmissionRepository) ListTargets(ctx context.Context, tenantID, examID string) ([]ExamTarget, error) {
	rows, err := repo.pool.Query(ctx, `SELECT id::text, exam_id::text, target_type, target_id::text FROM exam_targets WHERE tenant_id=$1 AND exam_id=$2 ORDER BY created_at ASC`, tenantID, examID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []ExamTarget{}
	for rows.Next() {
		var item ExamTarget
		if err := rows.Scan(&item.ID, &item.ExamID, &item.TargetType, &item.TargetID); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
func (repo PostgresSubmissionRepository) CreateTarget(ctx context.Context, tenantID, examID string, p CreateExamTargetParams) (ExamTarget, error) {
	var item ExamTarget
	err := repo.pool.QueryRow(ctx, `INSERT INTO exam_targets (tenant_id, exam_id, target_type, target_id) VALUES ($1,$2,$3,$4) ON CONFLICT (tenant_id, exam_id, target_type, target_id) DO UPDATE SET target_type=EXCLUDED.target_type RETURNING id::text, exam_id::text, target_type, target_id::text`, tenantID, examID, p.TargetType, p.TargetID).Scan(&item.ID, &item.ExamID, &item.TargetType, &item.TargetID)
	return item, err
}

func (repo PostgresSubmissionRepository) ListGateWindows(ctx context.Context, tenantID, examID string) ([]ExamGateWindow, error) {
	rows, err := repo.pool.Query(ctx, `SELECT id::text, exam_id::text, target_type, COALESCE(target_id::text,''), COALESCE(publishes_at::text,''), opens_at::text, closes_at::text, password FROM exam_gate_windows WHERE tenant_id=$1 AND exam_id=$2 ORDER BY opens_at ASC`, tenantID, examID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []ExamGateWindow{}
	for rows.Next() {
		var item ExamGateWindow
		if err := rows.Scan(&item.ID, &item.ExamID, &item.TargetType, &item.TargetID, &item.PublishesAt, &item.OpensAt, &item.ClosesAt, &item.Password); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
func (repo PostgresSubmissionRepository) CreateGateWindow(ctx context.Context, tenantID, examID string, p CreateExamGateWindowParams) (ExamGateWindow, error) {
	var item ExamGateWindow
	err := repo.pool.QueryRow(ctx, `INSERT INTO exam_gate_windows (tenant_id, exam_id, target_type, target_id, publishes_at, opens_at, closes_at, password) VALUES ($1,$2,$3,NULLIF($4,'')::uuid,NULLIF($5,'')::timestamptz,$6,$7,$8) RETURNING id::text, exam_id::text, target_type, COALESCE(target_id::text,''), COALESCE(publishes_at::text,''), opens_at::text, closes_at::text, password`, tenantID, examID, p.TargetType, p.TargetID, p.PublishesAt, p.OpensAt, p.ClosesAt, p.Password).Scan(&item.ID, &item.ExamID, &item.TargetType, &item.TargetID, &item.PublishesAt, &item.OpensAt, &item.ClosesAt, &item.Password)
	return item, err
}

func (repo PostgresSubmissionRepository) ListPrerequisites(ctx context.Context, tenantID, examID string) ([]ExamPrerequisite, error) {
	rows, err := repo.pool.Query(ctx, `SELECT id::text, exam_id::text, prerequisite_type, required_id::text FROM exam_prerequisites WHERE tenant_id=$1 AND exam_id=$2 ORDER BY created_at ASC`, tenantID, examID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []ExamPrerequisite{}
	for rows.Next() {
		var item ExamPrerequisite
		if err := rows.Scan(&item.ID, &item.ExamID, &item.PrerequisiteType, &item.RequiredID); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
func (repo PostgresSubmissionRepository) CreatePrerequisite(ctx context.Context, tenantID, examID string, p CreateExamPrerequisiteParams) (ExamPrerequisite, error) {
	var item ExamPrerequisite
	err := repo.pool.QueryRow(ctx, `INSERT INTO exam_prerequisites (tenant_id, exam_id, prerequisite_type, required_id) VALUES ($1,$2,$3,$4) ON CONFLICT (tenant_id, exam_id, prerequisite_type, required_id) DO UPDATE SET prerequisite_type=EXCLUDED.prerequisite_type RETURNING id::text, exam_id::text, prerequisite_type, required_id::text`, tenantID, examID, p.PrerequisiteType, p.RequiredID).Scan(&item.ID, &item.ExamID, &item.PrerequisiteType, &item.RequiredID)
	return item, err
}
