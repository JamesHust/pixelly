package handlers

import (
	"bufio"

	"github.com/gofiber/fiber/v2"
	"github.com/pixelly/api/internal/services"
)

type AIHandler struct {
	aiService *services.AIService
}

func NewAIHandler(aiService *services.AIService) *AIHandler {
	return &AIHandler{aiService: aiService}
}

// Generate is kept for backwards compatibility.
func (h *AIHandler) Generate(c *fiber.Ctx) error {
	var req struct {
		Prompt string `json:"prompt"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.Prompt == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "prompt is required"})
	}

	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("Transfer-Encoding", "chunked")

	c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
		_ = h.aiService.GenerateStream(c.Context(), req.Prompt, w)
		w.Flush()
	})

	return nil
}

// Chat handles multi-turn conversation with optional skill context.
func (h *AIHandler) Chat(c *fiber.Ctx) error {
	var req struct {
		Messages []services.ChatMessage  `json:"messages"`
		Skills   []services.SkillContext `json:"skills"`
		Model    string                  `json:"model"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if len(req.Messages) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "messages are required"})
	}

	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("Transfer-Encoding", "chunked")

	chatReq := services.ChatRequest{
		Messages: req.Messages,
		Skills:   req.Skills,
		Model:    req.Model,
	}

	c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
		_ = h.aiService.ChatStream(c.Context(), chatReq, w)
		w.Flush()
	})

	return nil
}

// FetchSkill proxies a GitHub skill content fetch to avoid CORS in the browser.
func (h *AIHandler) FetchSkill(c *fiber.Ctx) error {
	repo := c.Query("repo")
	if repo == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "repo query param is required"})
	}

	result, err := h.aiService.FetchSkill(c.Context(), repo)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(result)
}
