package auth

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) PostgresRepository {
	return PostgresRepository{pool: pool}
}

func (repo PostgresRepository) FindUserByEmail(ctx context.Context, tenantID, email string) (*UserCredentials, error) {
	var user UserCredentials
	err := repo.pool.QueryRow(ctx, `
SELECT
    u.id::text,
    u.email::text,
    u.name,
    tu.role,
    COALESCE(u.password_hash, '') AS password_hash
FROM users u
JOIN tenant_users tu ON tu.user_id = u.id
WHERE tu.tenant_id = $1 AND u.email = $2
`, tenantID, email).Scan(&user.ID, &user.Email, &user.Name, &user.Role, &user.PasswordHash)
	if err != nil {
		if err.Error() == "no rows in result set" {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (repo PostgresRepository) CreateSession(ctx context.Context, params CreateSessionParams) (Session, error) {
	expiresAt := time.Now().Add(params.Duration)
	var sess Session
	err := repo.pool.QueryRow(ctx, `
INSERT INTO sessions (tenant_id, user_id, token, role, expires_at)
VALUES ($1, $2, $3, $4, $5)
RETURNING id::text, tenant_id::text, user_id::text, token, role, expires_at
`, params.TenantID, params.UserID, params.Token, params.Role, expiresAt).
		Scan(&sess.ID, &sess.TenantID, &sess.UserID, &sess.Token, &sess.Role, &sess.ExpiresAt)
	return sess, err
}

func (repo PostgresRepository) FindSessionByToken(ctx context.Context, token string) (*Session, error) {
	var sess Session
	err := repo.pool.QueryRow(ctx, `
SELECT id::text, tenant_id::text, user_id::text, token, role, expires_at
FROM sessions
WHERE token = $1 AND expires_at > now()
`, token).Scan(&sess.ID, &sess.TenantID, &sess.UserID, &sess.Token, &sess.Role, &sess.ExpiresAt)
	if err != nil {
		if err.Error() == "no rows in result set" {
			return nil, nil
		}
		return nil, err
	}
	return &sess, nil
}

func (repo PostgresRepository) DeleteSession(ctx context.Context, token string) error {
	_, err := repo.pool.Exec(ctx, `DELETE FROM sessions WHERE token = $1`, token)
	return err
}
