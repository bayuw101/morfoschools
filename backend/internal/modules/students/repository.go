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
LEFT JOIN student_class_enrollments enrollments
  ON enrollments.tenant_id = students.tenant_id
 AND enrollments.student_id = students.id
 AND enrollments.active = true
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
WITH inserted AS (
    INSERT INTO students (tenant_id, nisn, name, status, guardian_name, guardian_contact)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, user_id, nisn, name, status, guardian_name, guardian_contact
), enrollment AS (
    INSERT INTO student_class_enrollments (tenant_id, student_id, class_section_id, academic_year, active)
    SELECT $1, inserted.id, class_sections.id, class_sections.academic_year, true
    FROM inserted
    JOIN class_sections ON class_sections.tenant_id = $1 AND (class_sections.id::text = $7 OR class_sections.name = $8)
    ON CONFLICT DO NOTHING
)
SELECT inserted.id::text, COALESCE(inserted.user_id::text, ''), inserted.nisn, inserted.name, $9::text AS email, inserted.status, inserted.guardian_name, inserted.guardian_contact,
       COALESCE(class_sections.id::text, ''), COALESCE(class_sections.name, '')
FROM inserted
LEFT JOIN class_sections ON class_sections.tenant_id = $1 AND (class_sections.id::text = $7 OR class_sections.name = $8)
`, tenantID, params.NISN, params.Name, params.Status, params.GuardianName, params.GuardianContact, params.ClassSectionID, params.ClassSection, params.Email).Scan(&item.ID, &item.UserID, &item.NISN, &item.Name, &item.Email, &item.Status, &item.GuardianName, &item.GuardianContact, &item.ClassSectionID, &item.ClassSection)
	return item, err
}

func (repo PostgresRepository) UpdateStudent(ctx context.Context, tenantID string, studentID string, params StudentParams) (Student, error) {
	var item Student
	err := repo.pool.QueryRow(ctx, `
WITH updated AS (
    UPDATE students
    SET nisn = $3, name = $4, status = $5, guardian_name = $6, guardian_contact = $7, updated_at = now()
    WHERE tenant_id = $1 AND id = $2
    RETURNING id, user_id, nisn, name, status, guardian_name, guardian_contact
), deactivate AS (
    UPDATE student_class_enrollments SET active = false WHERE tenant_id = $1 AND student_id = $2
), enrollment AS (
    INSERT INTO student_class_enrollments (tenant_id, student_id, class_section_id, academic_year, active)
    SELECT $1, updated.id, class_sections.id, class_sections.academic_year, true
    FROM updated
    JOIN class_sections ON class_sections.tenant_id = $1 AND (class_sections.id::text = $8 OR class_sections.name = $9)
    ON CONFLICT DO NOTHING
)
SELECT updated.id::text, COALESCE(updated.user_id::text, ''), updated.nisn, updated.name, $10::text AS email, updated.status, updated.guardian_name, updated.guardian_contact,
       COALESCE(class_sections.id::text, ''), COALESCE(class_sections.name, '')
FROM updated
LEFT JOIN class_sections ON class_sections.tenant_id = $1 AND (class_sections.id::text = $8 OR class_sections.name = $9)
`, tenantID, studentID, params.NISN, params.Name, params.Status, params.GuardianName, params.GuardianContact, params.ClassSectionID, params.ClassSection, params.Email).Scan(&item.ID, &item.UserID, &item.NISN, &item.Name, &item.Email, &item.Status, &item.GuardianName, &item.GuardianContact, &item.ClassSectionID, &item.ClassSection)
	return item, err
}

func (repo PostgresRepository) DeleteStudent(ctx context.Context, tenantID string, studentID string) error {
	_, err := repo.pool.Exec(ctx, `DELETE FROM students WHERE tenant_id = $1 AND id = $2`, tenantID, studentID)
	return err
}
