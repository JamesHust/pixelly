package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/joho/godotenv"
	"github.com/pixelly/api/internal/config"
	"github.com/pixelly/api/internal/db"
	"github.com/pixelly/api/internal/server"
)

func main() {
	// Load .env file (ignore error in production where env vars are set directly)
	_ = godotenv.Load("../../.env")
	_ = godotenv.Load(".env")

	cfg := config.Load()

	// Initialize database connections
	pgPool, err := db.NewPostgres(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to postgres: %v", err)
	}
	defer pgPool.Close()

	redisClient := db.NewRedis(cfg.RedisURL)
	defer redisClient.Close()

	// Create and start Fiber app
	app := server.New(cfg, pgPool, redisClient)

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-quit
		log.Println("Shutting down server...")
		if err := app.Shutdown(); err != nil {
			log.Printf("Server shutdown error: %v", err)
		}
	}()

	log.Printf("Starting Pixelly API on port %s", cfg.Port)
	if err := app.Listen(":" + cfg.Port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
