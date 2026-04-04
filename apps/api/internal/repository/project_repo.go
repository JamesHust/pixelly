package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/pixelly/api/internal/models"
)

type ProjectRepository struct {
	db *pgxpool.Pool
}

func NewProjectRepository(db *pgxpool.Pool) *ProjectRepository {
	return &ProjectRepository{db: db}
}

func (r *ProjectRepository) Create(ctx context.Context, project *models.Project) error {
	query := `
		INSERT INTO projects (id, name, description, owner_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
		RETURNING created_at, updated_at
	`
	return r.db.QueryRow(ctx, query,
		project.ID, project.Name, project.Description, project.OwnerID,
	).Scan(&project.CreatedAt, &project.UpdatedAt)
}

func (r *ProjectRepository) FindByOwner(ctx context.Context, ownerID uuid.UUID) ([]*models.Project, error) {
	query := `
		SELECT id, name, description, thumbnail_url, owner_id, created_at, updated_at
		FROM projects WHERE owner_id = $1
		ORDER BY updated_at DESC
	`
	rows, err := r.db.Query(ctx, query, ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []*models.Project
	for rows.Next() {
		p := &models.Project{}
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.ThumbnailURL, &p.OwnerID, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		projects = append(projects, p)
	}
	return projects, nil
}

func (r *ProjectRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.Project, error) {
	p := &models.Project{}
	query := `SELECT id, name, description, thumbnail_url, owner_id, created_at, updated_at FROM projects WHERE id = $1`
	err := r.db.QueryRow(ctx, query, id).Scan(
		&p.ID, &p.Name, &p.Description, &p.ThumbnailURL, &p.OwnerID, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("project not found: %w", err)
	}
	return p, nil
}

func (r *ProjectRepository) Update(ctx context.Context, project *models.Project) error {
	query := `
		UPDATE projects SET name = $2, description = $3, updated_at = NOW()
		WHERE id = $1
		RETURNING updated_at
	`
	return r.db.QueryRow(ctx, query, project.ID, project.Name, project.Description).Scan(&project.UpdatedAt)
}

func (r *ProjectRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM projects WHERE id = $1`, id)
	return err
}
