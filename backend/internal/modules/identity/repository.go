package identity

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

func (repo PostgresRepository) ListUsers(ctx context.Context, tenantID string) ([]User, error) {
	rows, err := repo.pool.Query(ctx, `
SELECT
    users.id::text,
    users.email::text,
    users.name,
    tenant_users.role,
    users.status
FROM tenant_users
JOIN users ON users.id = tenant_users.user_id
WHERE tenant_users.tenant_id = $1
ORDER BY users.created_at DESC
`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]User, 0)
	for rows.Next() {
		var user User
		if err := rows.Scan(&user.ID, &user.Email, &user.Name, &user.Role, &user.Status); err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	return users, rows.Err()
}

func (repo PostgresRepository) CreateUser(ctx context.Context, tenantID string, params CreateUserParams) (User, error) {
	var user User
	err := repo.pool.QueryRow(ctx, `
WITH upsert_user AS (
    INSERT INTO users (email, name, status)
    VALUES ($1, $2, 'invited')
    ON CONFLICT (email) DO UPDATE
        SET name = EXCLUDED.name,
            updated_at = now()
    RETURNING id, email::text, name, status
), membership AS (
    INSERT INTO tenant_users (tenant_id, user_id, role)
    SELECT $3, id, $4
    FROM upsert_user
    ON CONFLICT (tenant_id, user_id) DO UPDATE
        SET role = EXCLUDED.role
)
SELECT id::text, email::text, name, $4 AS role, status
FROM upsert_user
`, params.Email, params.Name, tenantID, params.Role).Scan(&user.ID, &user.Email, &user.Name, &user.Role, &user.Status)
	return user, err
}
