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

func (repo PostgresRepository) ListSubjectGroups(ctx context.Context, tenantID string) ([]SubjectGroup, error) {
	rows, err := repo.pool.Query(ctx, `
SELECT
    subject_groups.id::text,
    subject_groups.subject_id::text,
    subjects.name,
    subject_groups.name,
    subject_groups.academic_year,
    subject_groups.term,
    subject_groups.status,
    COUNT(subject_group_members.id)::int AS member_count
FROM subject_groups
JOIN subjects ON subjects.id = subject_groups.subject_id AND subjects.tenant_id = subject_groups.tenant_id
LEFT JOIN subject_group_members ON subject_group_members.group_id = subject_groups.id
    AND subject_group_members.tenant_id = subject_groups.tenant_id
    AND subject_group_members.status = 'active'
WHERE subject_groups.tenant_id = $1
GROUP BY subject_groups.id, subjects.name
ORDER BY subject_groups.academic_year DESC, subject_groups.term ASC, subject_groups.name ASC
`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]SubjectGroup, 0)
	for rows.Next() {
		var item SubjectGroup
		if err := rows.Scan(&item.ID, &item.SubjectID, &item.SubjectName, &item.Name, &item.AcademicYear, &item.Term, &item.Status, &item.MemberCount); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (repo PostgresRepository) CreateSubjectGroup(ctx context.Context, tenantID string, params CreateSubjectGroupParams) (SubjectGroup, error) {
	var item SubjectGroup
	err := repo.pool.QueryRow(ctx, `
INSERT INTO subject_groups (tenant_id, subject_id, name, academic_year, term)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (tenant_id, subject_id, name, academic_year, term) DO UPDATE
    SET status = 'active',
        updated_at = now()
RETURNING id::text, subject_id::text, name, academic_year, term, status
`, tenantID, params.SubjectID, params.Name, params.AcademicYear, params.Term).Scan(&item.ID, &item.SubjectID, &item.Name, &item.AcademicYear, &item.Term, &item.Status)
	return item, err
}

func (repo PostgresRepository) ListSubjectGroupMembers(ctx context.Context, tenantID string, groupID string) ([]SubjectGroupMember, error) {
	rows, err := repo.pool.Query(ctx, `
SELECT
    subject_group_members.id::text,
    subject_group_members.group_id::text,
    subject_group_members.student_id::text,
    students.name,
    COALESCE(class_sections.name, '') AS class_name,
    subject_group_members.status
FROM subject_group_members
JOIN students ON students.id = subject_group_members.student_id AND students.tenant_id = subject_group_members.tenant_id
LEFT JOIN student_class_enrollments ON student_class_enrollments.student_id = students.id
    AND student_class_enrollments.tenant_id = students.tenant_id
    AND student_class_enrollments.active = true
LEFT JOIN class_sections ON class_sections.id = student_class_enrollments.class_section_id
    AND class_sections.tenant_id = students.tenant_id
WHERE subject_group_members.tenant_id = $1
  AND subject_group_members.group_id = $2
ORDER BY students.name ASC
`, tenantID, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]SubjectGroupMember, 0)
	for rows.Next() {
		var item SubjectGroupMember
		if err := rows.Scan(&item.ID, &item.GroupID, &item.StudentID, &item.StudentName, &item.ClassName, &item.Status); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (repo PostgresRepository) AddSubjectGroupMember(ctx context.Context, tenantID string, groupID string, params AddSubjectGroupMemberParams) (SubjectGroupMember, error) {
	var item SubjectGroupMember
	err := repo.pool.QueryRow(ctx, `
INSERT INTO subject_group_members (tenant_id, group_id, student_id)
VALUES ($1, $2, $3)
ON CONFLICT (tenant_id, group_id, student_id) DO UPDATE
    SET status = 'active',
        updated_at = now()
RETURNING id::text, group_id::text, student_id::text, status
`, tenantID, groupID, params.StudentID).Scan(&item.ID, &item.GroupID, &item.StudentID, &item.Status)
	return item, err
}

func (repo PostgresRepository) UpdateSubject(ctx context.Context, tenantID string, id string, params CreateSubjectParams) (Subject, error) {
	var item Subject
	err := repo.pool.QueryRow(ctx, `
UPDATE subjects 
SET name = $1, code = $2, group_name = $3, updated_at = now()
WHERE tenant_id = $4 AND id = $5
RETURNING id::text, code, name, group_name, status
`, params.Name, params.Code, params.GroupName, tenantID, id).Scan(&item.ID, &item.Code, &item.Name, &item.GroupName, &item.Status)
	return item, err
}

func (repo PostgresRepository) DeleteSubject(ctx context.Context, tenantID string, id string) error {
	_, err := repo.pool.Exec(ctx, "DELETE FROM subjects WHERE tenant_id = $1 AND id = $2", tenantID, id)
	return err
}

func (repo PostgresRepository) UpdateSubjectGroup(ctx context.Context, tenantID string, id string, params CreateSubjectGroupParams) (SubjectGroup, error) {
	var item SubjectGroup
	err := repo.pool.QueryRow(ctx, `
UPDATE subject_groups 
SET name = $1, academic_year = $2, term = $3, updated_at = now()
WHERE tenant_id = $4 AND id = $5
RETURNING id::text, subject_id::text, name, academic_year, term, status
`, params.Name, params.AcademicYear, params.Term, tenantID, id).Scan(&item.ID, &item.SubjectID, &item.Name, &item.AcademicYear, &item.Term, &item.Status)
	return item, err
}

func (repo PostgresRepository) DeleteSubjectGroup(ctx context.Context, tenantID string, id string) error {
	_, err := repo.pool.Exec(ctx, "DELETE FROM subject_groups WHERE tenant_id = $1 AND id = $2", tenantID, id)
	return err
}
