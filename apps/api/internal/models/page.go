package models

import (
	"time"

	"github.com/google/uuid"
)

type Page struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	ProjectID   uuid.UUID  `json:"project_id" db:"project_id"`
	Name        string     `json:"name" db:"name"`
	Order       int        `json:"order" db:"order"`
	// YjsState is the raw Y.js document binary snapshot for persistence
	YjsState    []byte     `json:"-" db:"yjs_state"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
}
