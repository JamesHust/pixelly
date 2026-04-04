package models

import (
	"time"

	"github.com/google/uuid"
)

type Project struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	Name        string     `json:"name" db:"name"`
	Description *string    `json:"description,omitempty" db:"description"`
	ThumbnailURL *string   `json:"thumbnail_url,omitempty" db:"thumbnail_url"`
	OwnerID     uuid.UUID  `json:"owner_id" db:"owner_id"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
}

type ProjectMember struct {
	ProjectID uuid.UUID `json:"project_id" db:"project_id"`
	UserID    uuid.UUID `json:"user_id" db:"user_id"`
	Role      string    `json:"role" db:"role"` // owner, editor, viewer
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}
