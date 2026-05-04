package students

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct{ pool *pgxpool.Pool }

func NewPostgresRepository(pool *pgxpool.Pool) PostgresRepository {
	return PostgresRepository{pool: pool}
}

func (repo PostgresRepository) ListStudents(ctx context.Context, tenantID string) ([]Student, error) {
	rows, err := repo.pool.Query(ctx, `
SELECT students.id::text,
       COALESCE(students.user_id::text, ''),
       students.nisn,
       students.name,
       COALESCE(users.email::text, ''),
       students.status,
       students.guardian_name,
       students.guardian_contact,
       COALESCE(class_sections.id::text, ''),
       COALESCE(class_sections.name, '')
FROM students
LEFT JOIN users ON users.id = students.user_id
LEFT JOIN LATERAL (
    SELECT enrollment.class_section_id
    FROM student_class_enrollments enrollment
    WHERE enrollment.tenant_id = students.tenant_id
      AND enrollment.student_id = students.id
      AND enrollment.active = true
    ORDER BY enrollment.created_at DESC, enrollment.id DESC
    LIMIT 1
) enrollments ON true
LEFT JOIN class_sections ON class_sections.id = enrollments.class_section_id
WHERE students.tenant_id = $1
ORDER BY students.created_at DESC`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []Student{}
	for rows.Next() {
		var item Student
		if err := rows.Scan(&item.ID, &item.UserID, &item.NISN, &item.Name, &item.Email, &item.Status, &item.GuardianName, &item.GuardianContact, &item.ClassSectionID, &item.ClassSection); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (repo PostgresRepository) CreateStudent(ctx context.Context, tenantID string, params StudentParams) (Student, error) {
	var item Student
	err := repo.pool.QueryRow(ctx, `
WITH class_match AS (
    SELECT id, name, academic_year
    FROM class_sections
    WHERE tenant_id = $1 AND id::text = $7
), create_candidate AS (
    SELECT class_match.id, class_match.name, class_match.academic_year
    FROM class_match
    WHERE NOT EXISTS (SELECT 1 FROM students WHERE tenant_id = $1 AND nisn = $2)
), inserted_user AS (
    INSERT INTO users (email, name, status)
    SELECT $9, $3, 'active'
    FROM create_candidate
    RETURNING id, email::text, name
), inserted_membership AS (
    INSERT INTO tenant_users (tenant_id, user_id, role)
    SELECT $1, id, 'student'
    FROM inserted_user
    RETURNING user_id
), inserted_student AS (
    INSERT INTO students (tenant_id, user_id, nisn, name, status, guardian_name, guardian_contact)
    SELECT $1, inserted_user.id, $2, $3, $4, $5, $6
    FROM inserted_user
    JOIN inserted_membership ON inserted_membership.user_id = inserted_user.id
    ON CONFLICT (tenant_id, nisn) DO NOTHING
    RETURNING id, user_id, nisn, name, status, guardian_name, guardian_contact
), enrollment AS (
    INSERT INTO student_class_enrollments (tenant_id, student_id, class_section_id, academic_year, active)
    SELECT $1, inserted_student.id, class_match.id, class_match.academic_year, true
    FROM inserted_student
    JOIN class_match ON true
    ON CONFLICT (tenant_id, student_id, academic_year) WHERE active DO UPDATE SET class_section_id = EXCLUDED.class_section_id
)
SELECT s.id::text, COALESCE(s.user_id::text, ''), s.nisn, s.name, u.email::text, s.status, s.guardian_name, s.guardian_contact,
       class_match.id::text, class_match.name
FROM inserted_student s
JOIN inserted_user u ON u.id = s.user_id
JOIN class_match ON true
`, tenantID, params.NISN, params.Name, params.Status, params.GuardianName, params.GuardianContact, params.ClassSectionID, params.ClassSection, params.Email).Scan(&item.ID, &item.UserID, &item.NISN, &item.Name, &item.Email, &item.Status, &item.GuardianName, &item.GuardianContact, &item.ClassSectionID, &item.ClassSection)
	return item, err
}

func (repo PostgresRepository) UpdateStudent(ctx context.Context, tenantID string, studentID string, params StudentParams) (Student, error) {
	var item Student
	err := repo.pool.QueryRow(ctx, `
WITH class_match AS (
    SELECT id, name, academic_year
    FROM class_sections
    WHERE tenant_id = $1 AND id::text = $8
), update_candidate AS (
    SELECT students.id, students.user_id, class_match.id AS class_section_id, class_match.name AS class_section_name, class_match.academic_year
    FROM students
    JOIN class_match ON true
    JOIN tenant_users ON tenant_users.tenant_id = $1 AND tenant_users.user_id = students.user_id AND tenant_users.role = 'student'
    JOIN users ON users.id = students.user_id
    WHERE students.tenant_id = $1 AND students.id = $2
      AND NOT EXISTS (SELECT 1 FROM students duplicate WHERE duplicate.tenant_id = $1 AND duplicate.nisn = $3 AND duplicate.id <> $2)
      AND NOT EXISTS (SELECT 1 FROM users duplicate WHERE duplicate.email = $10 AND duplicate.id <> users.id)
), updated_user AS (
    UPDATE users
    SET name = $4, email = $10, updated_at = now()
    FROM update_candidate
    WHERE users.id = update_candidate.user_id
    RETURNING users.id, users.email::text
), updated_student AS (
    UPDATE students
    SET nisn = $3, name = $4, status = $5, guardian_name = $6, guardian_contact = $7, updated_at = now()
    FROM update_candidate
    JOIN updated_user ON updated_user.id = update_candidate.user_id
    WHERE students.id = update_candidate.id AND students.tenant_id = $1
    RETURNING students.id, students.user_id, students.nisn, students.name, students.status, students.guardian_name, students.guardian_contact
), deactivated_enrollments AS (
    UPDATE student_class_enrollments enrollments
    SET active = false
    FROM updated_student
    JOIN update_candidate ON update_candidate.id = updated_student.id
    WHERE enrollments.tenant_id = $1
      AND enrollments.student_id = updated_student.id
      AND enrollments.academic_year = update_candidate.academic_year
      AND enrollments.active = true
      AND enrollments.class_section_id <> update_candidate.class_section_id
    RETURNING enrollments.id
), enrollment AS (
    INSERT INTO student_class_enrollments (tenant_id, student_id, class_section_id, academic_year, active)
    SELECT $1, updated_student.id, update_candidate.class_section_id, update_candidate.academic_year, true
    FROM updated_student
    JOIN update_candidate ON update_candidate.id = updated_student.id
    ON CONFLICT (tenant_id, student_id, academic_year) WHERE active DO UPDATE SET class_section_id = EXCLUDED.class_section_id
)
SELECT s.id::text, COALESCE(s.user_id::text, ''), s.nisn, s.name, u.email::text, s.status, s.guardian_name, s.guardian_contact,
       update_candidate.class_section_id::text, update_candidate.class_section_name
FROM updated_student s
JOIN updated_user u ON u.id = s.user_id
JOIN update_candidate ON update_candidate.id = s.id
`, tenantID, studentID, params.NISN, params.Name, params.Status, params.GuardianName, params.GuardianContact, params.ClassSectionID, params.ClassSection, params.Email).Scan(&item.ID, &item.UserID, &item.NISN, &item.Name, &item.Email, &item.Status, &item.GuardianName, &item.GuardianContact, &item.ClassSectionID, &item.ClassSection)
	return item, err
}

func (repo PostgresRepository) DeleteStudent(ctx context.Context, tenantID string, studentID string) error {
	_, err := repo.pool.Exec(ctx, `DELETE FROM students WHERE tenant_id = $1 AND id = $2`, tenantID, studentID)
	return err
}
