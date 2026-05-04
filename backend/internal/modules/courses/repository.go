package courses

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct{ pool *pgxpool.Pool }

func NewPostgresRepository(pool *pgxpool.Pool) PostgresRepository {
	return PostgresRepository{pool: pool}
}

func (r PostgresRepository) ListCourses(ctx context.Context, tenantID string) ([]Course, error) {
	rows, err := r.pool.Query(ctx, `
SELECT courses.id::text, courses.course_offering_id::text, courses.title, courses.description, courses.status, COUNT(course_modules.id)::int
FROM courses
LEFT JOIN course_modules ON course_modules.course_id = courses.id AND course_modules.tenant_id = courses.tenant_id
WHERE courses.tenant_id = $1
GROUP BY courses.id
ORDER BY courses.updated_at DESC`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []Course{}
	for rows.Next() {
		var item Course
		if err := rows.Scan(&item.ID, &item.CourseOfferingID, &item.Title, &item.Description, &item.Status, &item.ModuleCount); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r PostgresRepository) CreateCourse(ctx context.Context, tenantID string, p CreateCourseParams) (Course, error) {
	var item Course
	err := r.pool.QueryRow(ctx, `
INSERT INTO courses (tenant_id, course_offering_id, title, description, status)
VALUES ($1,$2,$3,$4,$5)
ON CONFLICT (tenant_id, course_offering_id, title) DO UPDATE SET description=EXCLUDED.description, status=EXCLUDED.status, updated_at=now()
RETURNING id::text, course_offering_id::text, title, description, status`, tenantID, p.CourseOfferingID, p.Title, p.Description, p.Status).Scan(&item.ID, &item.CourseOfferingID, &item.Title, &item.Description, &item.Status)
	return item, err
}

func (r PostgresRepository) ListModules(ctx context.Context, tenantID, courseID string) ([]CourseModule, error) {
	rows, err := r.pool.Query(ctx, `SELECT id::text, course_id::text, title, position, status FROM course_modules WHERE tenant_id=$1 AND course_id=$2 ORDER BY position ASC`, tenantID, courseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []CourseModule{}
	for rows.Next() {
		var item CourseModule
		if err := rows.Scan(&item.ID, &item.CourseID, &item.Title, &item.Position, &item.Status); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r PostgresRepository) CreateModule(ctx context.Context, tenantID, courseID string, p CreateCourseModuleParams) (CourseModule, error) {
	var item CourseModule
	err := r.pool.QueryRow(ctx, `
INSERT INTO course_modules (tenant_id, course_id, title, position, status)
VALUES ($1,$2,$3,$4,$5)
ON CONFLICT (tenant_id, course_id, position) DO UPDATE SET title=EXCLUDED.title, status=EXCLUDED.status, updated_at=now()
RETURNING id::text, course_id::text, title, position, status`, tenantID, courseID, p.Title, p.Position, p.Status).Scan(&item.ID, &item.CourseID, &item.Title, &item.Position, &item.Status)
	return item, err
}

func (r PostgresRepository) ListResources(ctx context.Context, tenantID, moduleID string) ([]CourseResource, error) {
	rows, err := r.pool.Query(ctx, `SELECT id::text, module_id::text, resource_type, title, external_url, provider, position, status FROM course_resources WHERE tenant_id=$1 AND module_id=$2 ORDER BY position ASC`, tenantID, moduleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []CourseResource{}
	for rows.Next() {
		var item CourseResource
		if err := rows.Scan(&item.ID, &item.ModuleID, &item.ResourceType, &item.Title, &item.ExternalURL, &item.Provider, &item.Position, &item.Status); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r PostgresRepository) CreateResource(ctx context.Context, tenantID, moduleID string, p CreateCourseResourceParams) (CourseResource, error) {
	var item CourseResource
	err := r.pool.QueryRow(ctx, `
INSERT INTO course_resources (tenant_id, module_id, resource_type, title, external_url, provider, position)
VALUES ($1,$2,$3,$4,$5,$6,$7)
ON CONFLICT (tenant_id, module_id, position) DO UPDATE SET resource_type=EXCLUDED.resource_type, title=EXCLUDED.title, external_url=EXCLUDED.external_url, provider=EXCLUDED.provider, updated_at=now()
RETURNING id::text, module_id::text, resource_type, title, external_url, provider, position, status`, tenantID, moduleID, p.ResourceType, p.Title, p.ExternalURL, p.Provider, p.Position).Scan(&item.ID, &item.ModuleID, &item.ResourceType, &item.Title, &item.ExternalURL, &item.Provider, &item.Position, &item.Status)
	return item, err
}

func (r PostgresRepository) RecordProgressEvent(ctx context.Context, tenantID string, p CreateCourseProgressEventParams) (CourseProgressEvent, error) {
	metadata, err := json.Marshal(p.Metadata)
	if err != nil {
		return CourseProgressEvent{}, err
	}
	var item CourseProgressEvent
	var raw []byte
	err = r.pool.QueryRow(ctx, `
INSERT INTO course_progress_events (tenant_id, course_id, module_id, resource_id, student_id, event_type, metadata)
VALUES ($1,$2,NULLIF($3,'')::uuid,NULLIF($4,'')::uuid,$5,$6,$7)
RETURNING id::text, course_id::text, COALESCE(module_id::text,''), COALESCE(resource_id::text,''), student_id::text, event_type, metadata`, tenantID, p.CourseID, p.ModuleID, p.ResourceID, p.StudentID, p.EventType, metadata).Scan(&item.ID, &item.CourseID, &item.ModuleID, &item.ResourceID, &item.StudentID, &item.EventType, &raw)
	if err != nil {
		return item, err
	}
	_ = json.Unmarshal(raw, &item.Metadata)
	return item, nil
}
