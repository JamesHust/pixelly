package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/pixelly/api/internal/dto"
	"github.com/pixelly/api/internal/services"
)

type ProjectHandler struct {
	projectService *services.ProjectService
}

func NewProjectHandler(projectService *services.ProjectService) *ProjectHandler {
	return &ProjectHandler{projectService: projectService}
}

func (h *ProjectHandler) Create(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)

	var req dto.CreateProjectRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	project, err := h.projectService.Create(c.Context(), userID, &req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(project)
}

func (h *ProjectHandler) List(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)

	projects, err := h.projectService.ListByOwner(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(projects)
}

func (h *ProjectHandler) Get(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)
	projectID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid project ID"})
	}

	project, err := h.projectService.GetByID(c.Context(), projectID, userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(project)
}

func (h *ProjectHandler) Update(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)
	projectID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid project ID"})
	}

	var req dto.UpdateProjectRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	project, err := h.projectService.Update(c.Context(), projectID, userID, &req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(project)
}

func (h *ProjectHandler) Delete(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)
	projectID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid project ID"})
	}

	if err := h.projectService.Delete(c.Context(), projectID, userID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.SendStatus(fiber.StatusNoContent)
}
