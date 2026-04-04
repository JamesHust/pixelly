package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/pixelly/api/internal/models"
)

type PageRepository struct {
	db *pgxpool.Pool
}

func NewPageRepository(db *pgxpool.Pool) *PageRepository {
	return &PageRepository{db: db}
}

func (r *PageRepository) Create(ctx context.Context, page *models.Page) error {
	query := `
		INSERT INTO pages (id, project_id, name, "order", yjs_state, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
		RETURNING created_at, updated_at
	`
	return r.db.QueryRow(ctx, query,
		page.ID, page.ProjectID, page.Name, page.Order, page.YjsState,
	).Scan(&page.CreatedAt, &page.UpdatedAt)
}

func (r *PageRepository) FindByProject(ctx context.Context, projectID uuid.UUID) ([]*models.Page, error) {
	query := `
		SELECT id, project_id, name, "order", created_at, updated_at
		FROM pages WHERE project_id = $1
		ORDER BY "order" ASC
	`
	rows, err := r.db.Query(ctx, query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pages []*models.Page
	for rows.Next() {
		p := &models.Page{}
		if err := rows.Scan(&p.ID, &p.ProjectID, &p.Name, &p.Order, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		pages = append(pages, p)
	}
	return pages, nil
}

func (r *PageRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.Page, error) {
	p := &models.Page{}
	query := `SELECT id, project_id, name, "order", yjs_state, created_at, updated_at FROM pages WHERE id = $1`
	err := r.db.QueryRow(ctx, query, id).Scan(
		&p.ID, &p.ProjectID, &p.Name, &p.Order, &p.YjsState, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("page not found: %w", err)
	}
	return p, nil
}

func (r *PageRepository) SaveYjsState(ctx context.Context, pageID uuid.UUID, state []byte) error {
	query := `UPDATE pages SET yjs_state = $2, updated_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(ctx, query, pageID, state)
	return err
}

func (r *PageRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM pages WHERE id = $1`, id)
	return err
}
