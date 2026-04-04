package config

import (
	"os"
	"strings"
)

type Config struct {
	Port        string
	DatabaseURL string
	RedisURL    string
	JWTSecret   string
	CORSOrigins []string
	StorageDir  string

	// AI provider config
	AIProvider string // "ollama" (default) or "openai" (Groq, OpenRouter, OpenAI, etc.)
	AIBaseURL  string // e.g. http://localhost:11434 or https://api.groq.com/openai/v1
	AIModel    string // e.g. llama3.2 or llama-3.1-8b-instant
	AIAPIKey   string // required for OpenAI-compatible providers
}

func Load() *Config {
	provider := getEnv("AI_PROVIDER", "ollama")

	// Default base URL depends on provider
	defaultBaseURL := "http://localhost:11434"
	if provider == "openai" {
		defaultBaseURL = "https://api.groq.com/openai/v1"
	}

	// Default model depends on provider
	defaultModel := "llama3.2"
	if provider == "openai" {
		defaultModel = "llama-3.1-8b-instant"
	}

	return &Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://pixelly:pixelly_secret@localhost:5432/pixelly?sslmode=disable"),
		RedisURL:    getEnv("REDIS_URL", "redis://:redis_secret@localhost:6379/0"),
		JWTSecret:   getEnv("JWT_SECRET", "change_me_in_production_min_32_chars"),
		CORSOrigins: strings.Split(getEnv("CORS_ORIGINS", "http://localhost:3000"), ","),
		StorageDir:  getEnv("STORAGE_DIR", "./uploads"),
		AIProvider:  provider,
		AIBaseURL:   getEnv("AI_BASE_URL", defaultBaseURL),
		AIModel:     getEnv("AI_MODEL", defaultModel),
		AIAPIKey:    getEnv("AI_API_KEY", ""),
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
