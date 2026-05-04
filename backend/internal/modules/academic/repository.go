package academic

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) PostgresRepository {
	return PostgresRepository{pool: pool}
}

func (repo PostgresRepository) ListSubjects(ctx context.Context, tenantID string) ([]Subject, error) {
	rows, err := repo.pool.Query(ctx, `
SELECT id::text, code, name, group_name, status
FROM subjects
WHERE tenant_id = $1
ORDER BY name ASC
`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Subject, 0)
	for rows.Next() {
		var item Subject
		if err := rows.Scan(&item.ID, &item.Code, &item.Name, &item.GroupName, &item.Status); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (repo PostgresRepository) CreateSubject(ctx context.Context, tenantID string, params CreateSubjectParams) (Subject, error) {
	var item Subject
	err := repo.pool.QueryRow(ctx, `
INSERT INTO subjects (tenant_id, code, name, group_name)
VALUES ($1, $2, $3, $4)
ON CONFLICT (tenant_id, code) DO UPDATE
    SET name = EXCLUDED.name,
        group_name = EXCLUDED.group_name,
        updated_at = now()
RETURNING id::text, code, name, group_name, status
`, tenantID, params.Code, params.Name, params.GroupName).Scan(&item.ID, &item.Code, &item.Name, &item.GroupName, &item.Status)
	return item, err
}

func (repo PostgresRepository) ListCourseOfferings(ctx context.Context, tenantID string) ([]CourseOffering, error) {
	rows, err := repo.pool.Query(ctx, `
SELECT
    course_offerings.id::text,
    course_offerings.subject_id::text,
    subjects.name,
    course_offerings.class_section_id::text,
    class_sections.name,
    course_offerings.academic_year,
    course_offerings.term,
    course_offerings.status
FROM course_offerings
JOIN subjects ON subjects.id = course_offerings.subject_id AND subjects.tenant_id = course_offerings.tenant_id
JOIN class_sections ON class_sections.id = course_offerings.class_section_id AND class_sections.tenant_id = course_offerings.tenant_id
WHERE course_offerings.tenant_id = $1
ORDER BY course_offerings.academic_year DESC, course_offerings.term ASC, subjects.name ASC, class_sections.name ASC
`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]CourseOffering, 0)
	for rows.Next() {
		var item CourseOffering
		if err := rows.Scan(&item.ID, &item.SubjectID, &item.SubjectName, &item.ClassSectionID, &item.ClassName, &item.AcademicYear, &item.Term, &item.Status); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (repo PostgresRepository) CreateCourseOffering(ctx context.Context, tenantID string, params CreateCourseOfferingParams) (CourseOffering, error) {
	var item CourseOffering
	err := repo.pool.QueryRow(ctx, `
INSERT INTO course_offerings (tenant_id, subject_id, class_section_id, academic_year, term)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (tenant_id, subject_id, class_section_id, academic_year, term) DO UPDATE
    SET status = 'active',
        updated_at = now()
RETURNING id::text, subject_id::text, class_section_id::text, academic_year, term, status
`, tenantID, params.SubjectID, params.ClassSectionID, params.AcademicYear, params.Term).Scan(&item.ID, &item.SubjectID, &item.ClassSectionID, &item.AcademicYear, &item.Term, &item.Status)
	return item, err
}

func (repo PostgresRepository) ListTeachingAssignments(ctx context.Context, tenantID string) ([]TeachingAssignment, error) {
	rows, err := repo.pool.Query(ctx, `
SELECT
    teaching_assignments.id::text,
    teaching_assignments.course_offering_id::text,
    teaching_assignments.teacher_id::text,
    users.name,
    teaching_assignments.role,
    teaching_assignments.status
FROM teaching_assignments
JOIN users ON users.id = teaching_assignments.teacher_id
WHERE teaching_assignments.tenant_id = $1
ORDER BY users.name ASC
`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]TeachingAssignment, 0)
	for rows.Next() {
		var item TeachingAssignment
		if err := rows.Scan(&item.ID, &item.CourseOfferingID, &item.TeacherID, &item.TeacherName, &item.Role, &item.Status); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (repo PostgresRepository) CreateTeachingAssignment(ctx context.Context, tenantID string, params CreateTeachingAssignmentParams) (TeachingAssignment, error) {
	var item TeachingAssignment
	err := repo.pool.QueryRow(ctx, `
INSERT INTO teaching_assignments (tenant_id, course_offering_id, teacher_id, role)
VALUES ($1, $2, $3, $4)
ON CONFLICT (tenant_id, course_offering_id, teacher_id) DO UPDATE
    SET role = EXCLUDED.role,
        status = 'active',
        updated_at = now()
RETURNING id::text, course_offering_id::text, teacher_id::text, role, status
`, tenantID, params.CourseOfferingID, params.TeacherID, params.Role).Scan(&item.ID, &item.CourseOfferingID, &item.TeacherID, &item.Role, &item.Status)
	return item, err
}
