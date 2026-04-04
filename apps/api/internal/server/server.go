package server

import (
	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/pixelly/api/internal/collab"
	"github.com/pixelly/api/internal/config"
	"github.com/pixelly/api/internal/handlers"
	"github.com/pixelly/api/internal/repository"
	"github.com/pixelly/api/internal/server/middleware"
	"github.com/pixelly/api/internal/services"
	"github.com/redis/go-redis/v9"
	"strings"
)

func New(cfg *config.Config, db *pgxpool.Pool, rdb *redis.Client) *fiber.App {
	app := fiber.New(fiber.Config{
		AppName: "Pixelly API",
	})

	// Global middleware
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     strings.Join(cfg.CORSOrigins, ","),
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PUT, PATCH, DELETE, OPTIONS",
		AllowCredentials: true,
	}))

	// Repositories
	userRepo := repository.NewUserRepository(db)
	projectRepo := repository.NewProjectRepository(db)
	pageRepo := repository.NewPageRepository(db)

	// Services
	authService := services.NewAuthService(userRepo, cfg.JWTSecret)
	projectService := services.NewProjectService(projectRepo, pageRepo)
	aiService := services.NewAIService(cfg.AIProvider, cfg.AIBaseURL, cfg.AIModel, cfg.AIAPIKey)

	// Collaboration hub
	hub := collab.NewHub()
	go hub.Run()

	// Handlers
	authHandler := handlers.NewAuthHandler(authService)
	projectHandler := handlers.NewProjectHandler(projectService)
	collabHandler := handlers.NewCollabHandler(hub)
	aiHandler := handlers.NewAIHandler(aiService)

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "service": "pixelly-api"})
	})

	// API v1
	v1 := app.Group("/api/v1")

	// Auth routes (public)
	auth := v1.Group("/auth")
	auth.Post("/register", authHandler.Register)
	auth.Post("/login", authHandler.Login)

	// Protected routes
	protected := v1.Group("", middleware.Auth(cfg.JWTSecret))

	protected.Get("/auth/me", authHandler.Me)

	// Projects
	projects := protected.Group("/projects")
	projects.Post("/", projectHandler.Create)
	projects.Get("/", projectHandler.List)
	projects.Get("/:id", projectHandler.Get)
	projects.Patch("/:id", projectHandler.Update)
	projects.Delete("/:id", projectHandler.Delete)

	// AI generation
	protected.Post("/ai/generate", aiHandler.Generate)
	protected.Post("/ai/chat", aiHandler.Chat)
	protected.Get("/ai/skill-fetch", aiHandler.FetchSkill)

	// WebSocket collaboration (auth via query param for WS)
	app.Use("/ws", collabHandler.Upgrade)
	app.Get("/ws/collab/:roomId", websocket.New(collabHandler.HandleWS))

	return app
}
