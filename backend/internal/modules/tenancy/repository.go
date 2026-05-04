package tenancy

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

func (repo PostgresRepository) ListTenants(ctx context.Context) ([]Tenant, error) {
	rows, err := repo.pool.Query(ctx, `
		SELECT
			t.id::text,
			t.name,
			t.slug,
			t.province,
			t.plan,
			t.status,
			t.student_cap,
			COUNT(tu.user_id)::int AS active_users
		FROM tenants t
		LEFT JOIN tenant_users tu ON tu.tenant_id = t.id
		GROUP BY t.id
		ORDER BY t.created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tenants := make([]Tenant, 0)
	for rows.Next() {
		var tenant Tenant
		if err := rows.Scan(&tenant.ID, &tenant.Name, &tenant.Slug, &tenant.Province, &tenant.Plan, &tenant.Status, &tenant.StudentCap, &tenant.ActiveUsers); err != nil {
			return nil, err
		}
		tenants = append(tenants, tenant)
	}
	return tenants, rows.Err()
}

func (repo PostgresRepository) CreateTenant(ctx context.Context, params CreateTenantParams) (Tenant, error) {
	var tenant Tenant
	err := repo.pool.QueryRow(ctx, `
		INSERT INTO tenants (name, slug, province, plan, student_cap, status)
		VALUES ($1, $2, $3, $4, $5, 'setup')
		RETURNING id::text, name, slug, province, plan, status, student_cap, 0 AS active_users
	`, params.Name, params.Slug, params.Province, params.Plan, params.StudentCap).Scan(
		&tenant.ID,
		&tenant.Name,
		&tenant.Slug,
		&tenant.Province,
		&tenant.Plan,
		&tenant.Status,
		&tenant.StudentCap,
		&tenant.ActiveUsers,
	)
	return tenant, err
}

func (repo PostgresRepository) UpdateTenant(ctx context.Context, id string, params CreateTenantParams) (Tenant, error) {
	var tenant Tenant
	err := repo.pool.QueryRow(ctx, `
		UPDATE tenants 
		SET name=$1, slug=$2, province=$3, plan=$4, student_cap=$5
		WHERE id=$6
		RETURNING id::text, name, slug, province, plan, status, student_cap, 
			(SELECT COUNT(*)::int FROM tenant_users WHERE tenant_id=tenants.id) AS active_users
	`, params.Name, params.Slug, params.Province, params.Plan, params.StudentCap, id).Scan(
		&tenant.ID,
		&tenant.Name,
		&tenant.Slug,
		&tenant.Province,
		&tenant.Plan,
		&tenant.Status,
		&tenant.StudentCap,
		&tenant.ActiveUsers,
	)
	return tenant, err
}

func (repo PostgresRepository) DeleteTenant(ctx context.Context, id string) error {
	_, err := repo.pool.Exec(ctx, `DELETE FROM tenants WHERE id=$1`, id)
	return err
}
