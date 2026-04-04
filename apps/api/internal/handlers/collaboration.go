package handlers

import (
	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/pixelly/api/internal/collab"
)

type CollabHandler struct {
	hub *collab.Hub
}

func NewCollabHandler(hub *collab.Hub) *CollabHandler {
	return &CollabHandler{hub: hub}
}

// Upgrade checks if the request is a WebSocket upgrade request
func (h *CollabHandler) Upgrade(c *fiber.Ctx) error {
	if websocket.IsWebSocketUpgrade(c) {
		return c.Next()
	}
	return fiber.ErrUpgradeRequired
}

// HandleWS handles the WebSocket connection for a collaboration room
func (h *CollabHandler) HandleWS(c *websocket.Conn) {
	roomID := c.Params("roomId")
	if roomID == "" {
		c.Close()
		return
	}

	client := collab.NewClient(c.Conn, roomID, h.hub)
	h.hub.Register <- client

	go client.WritePump()
	client.ReadPump()
}
