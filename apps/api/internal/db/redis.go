package db

import (
	"github.com/redis/go-redis/v9"
)

func NewRedis(redisURL string) *redis.Client {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		// Fallback to default if URL parsing fails
		opts = &redis.Options{
			Addr: "localhost:6379",
		}
	}

	return redis.NewClient(opts)
}
