package classes

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct{ pool *pgxpool.Pool }

func NewPostgresRepository(pool *pgxpool.Pool) PostgresRepository {
	return PostgresRepository{pool: pool}
}

func (repo PostgresRepository) ListClasses(ctx context.Context, tenantID string) ([]ClassSection, error) {
	rows, err := repo.pool.Query(ctx, `
SELECT class_sections.id::text,
       class_sections.name,
       class_sections.grade_level,
       class_sections.academic_year,
       COALESCE(users.name, ''),
       class_sections.status,
       COALESCE(array_agg(student_class_enrollments.student_id::text) FILTER (WHERE student_class_enrollments.student_id IS NOT NULL AND student_class_enrollments.active), '{}')
FROM class_sections
LEFT JOIN users ON users.id = class_sections.homeroom_teacher_id
LEFT JOIN student_class_enrollments ON student_class_enrollments.tenant_id = class_sections.tenant_id AND student_class_enrollments.class_section_id = class_sections.id AND student_class_enrollments.active = true
WHERE class_sections.tenant_id = $1
GROUP BY class_sections.id, users.name
ORDER BY class_sections.created_at DESC`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []ClassSection{}
	for rows.Next() {
		var item ClassSection
		if err := rows.Scan(&item.ID, &item.Name, &item.GradeLevel, &item.AcademicYear, &item.HomeroomTeacher, &item.Status, &item.StudentIds); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (repo PostgresRepository) CreateClass(ctx context.Context, tenantID string, params ClassSectionParams) (ClassSection, error) {
	var item ClassSection
	err := repo.pool.QueryRow(ctx, `
WITH homeroom AS (
    SELECT id FROM users WHERE lower(name) = lower($5) LIMIT 1
), inserted AS (
    INSERT INTO class_sections (tenant_id, name, grade_level, academic_year, homeroom_teacher_id, status)
    VALUES ($1, $2, $3, $4, (SELECT id FROM homeroom), $6)
    RETURNING id, name, grade_level, academic_year, homeroom_teacher_id, status
)
SELECT inserted.id::text, inserted.name, inserted.grade_level, inserted.academic_year, COALESCE(users.name, $5), inserted.status, '{}'::text[]
FROM inserted
LEFT JOIN users ON users.id = inserted.homeroom_teacher_id
`, tenantID, params.Name, params.GradeLevel, params.AcademicYear, params.HomeroomTeacher, params.Status).Scan(&item.ID, &item.Name, &item.GradeLevel, &item.AcademicYear, &item.HomeroomTeacher, &item.Status, &item.StudentIds)
	return item, err
}

func (repo PostgresRepository) UpdateClass(ctx context.Context, tenantID string, classID string, params ClassSectionParams) (ClassSection, error) {
	var item ClassSection
	err := repo.pool.QueryRow(ctx, `
WITH homeroom AS (
    SELECT id FROM users WHERE lower(name) = lower($5) LIMIT 1
), updated AS (
    UPDATE class_sections
    SET name = $3, grade_level = $4, academic_year = $6, homeroom_teacher_id = (SELECT id FROM homeroom), status = $7, updated_at = now()
    WHERE tenant_id = $1 AND id = $2
    RETURNING id, name, grade_level, academic_year, homeroom_teacher_id, status
)
SELECT updated.id::text, updated.name, updated.grade_level, updated.academic_year, COALESCE(users.name, $5), updated.status,
       COALESCE(array_agg(student_class_enrollments.student_id::text) FILTER (WHERE student_class_enrollments.student_id IS NOT NULL AND student_class_enrollments.active), '{}')
FROM updated
LEFT JOIN users ON users.id = updated.homeroom_teacher_id
LEFT JOIN student_class_enrollments ON student_class_enrollments.tenant_id = $1 AND student_class_enrollments.class_section_id = updated.id AND student_class_enrollments.active = true
GROUP BY updated.id, updated.name, updated.grade_level, updated.academic_year, users.name, updated.status
`, tenantID, classID, params.Name, params.GradeLevel, params.HomeroomTeacher, params.AcademicYear, params.Status).Scan(&item.ID, &item.Name, &item.GradeLevel, &item.AcademicYear, &item.HomeroomTeacher, &item.Status, &item.StudentIds)
	return item, err
}

func (repo PostgresRepository) DeleteClass(ctx context.Context, tenantID string, classID string) error {
	_, err := repo.pool.Exec(ctx, `DELETE FROM class_sections WHERE tenant_id = $1 AND id = $2`, tenantID, classID)
	return err
}
