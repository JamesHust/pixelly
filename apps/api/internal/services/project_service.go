package services

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/pixelly/api/internal/dto"
	"github.com/pixelly/api/internal/models"
	"github.com/pixelly/api/internal/repository"
)

type ProjectService struct {
	projectRepo *repository.ProjectRepository
	pageRepo    *repository.PageRepository
}

func NewProjectService(projectRepo *repository.ProjectRepository, pageRepo *repository.PageRepository) *ProjectService {
	return &ProjectService{projectRepo: projectRepo, pageRepo: pageRepo}
}

func (s *ProjectService) Create(ctx context.Context, ownerID uuid.UUID, req *dto.CreateProjectRequest) (*models.Project, error) {
	project := &models.Project{
		ID:          uuid.New(),
		Name:        req.Name,
		Description: req.Description,
		OwnerID:     ownerID,
	}

	if err := s.projectRepo.Create(ctx, project); err != nil {
		return nil, err
	}

	// Create a default first page
	page := &models.Page{
		ID:        uuid.New(),
		ProjectID: project.ID,
		Name:      "Page 1",
		Order:     0,
	}
	if err := s.pageRepo.Create(ctx, page); err != nil {
		return nil, err
	}

	return project, nil
}

func (s *ProjectService) ListByOwner(ctx context.Context, ownerID uuid.UUID) ([]*models.Project, error) {
	return s.projectRepo.FindByOwner(ctx, ownerID)
}

func (s *ProjectService) GetByID(ctx context.Context, id uuid.UUID, userID uuid.UUID) (*models.Project, error) {
	project, err := s.projectRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if project.OwnerID != userID {
		return nil, errors.New("access denied")
	}

	return project, nil
}

func (s *ProjectService) Update(ctx context.Context, id uuid.UUID, userID uuid.UUID, req *dto.UpdateProjectRequest) (*models.Project, error) {
	project, err := s.projectRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if project.OwnerID != userID {
		return nil, errors.New("access denied")
	}

	if req.Name != nil {
		project.Name = *req.Name
	}
	if req.Description != nil {
		project.Description = req.Description
	}

	if err := s.projectRepo.Update(ctx, project); err != nil {
		return nil, err
	}

	return project, nil
}

func (s *ProjectService) Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	project, err := s.projectRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}

	if project.OwnerID != userID {
		return errors.New("access denied")
	}

	return s.projectRepo.Delete(ctx, id)
}
