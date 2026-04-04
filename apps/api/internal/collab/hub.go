package collab

import (
	"sync"

	"github.com/rs/zerolog/log"
)

// Room represents a collaborative editing session (one per project page)
type Room struct {
	ID      string
	clients map[*Client]bool
	// yjsState stores the latest Y.js document state for new joiners
	yjsState []byte
	mu       sync.RWMutex
}

func newRoom(id string) *Room {
	return &Room{
		ID:      id,
		clients: make(map[*Client]bool),
	}
}

func (r *Room) addClient(c *Client) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.clients[c] = true
}

func (r *Room) removeClient(c *Client) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.clients, c)
}

func (r *Room) clientCount() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.clients)
}

// Hub manages all active collaboration rooms
type Hub struct {
	rooms      map[string]*Room
	mu         sync.RWMutex
	Register   chan *Client
	Unregister chan *Client
	Broadcast  chan *Message
}

func NewHub() *Hub {
	return &Hub{
		rooms:      make(map[string]*Room),
		Register:   make(chan *Client, 64),
		Unregister: make(chan *Client, 64),
		Broadcast:  make(chan *Message, 256),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.registerClient(client)

		case client := <-h.Unregister:
			h.unregisterClient(client)

		case msg := <-h.Broadcast:
			h.broadcastToRoom(msg)
		}
	}
}

func (h *Hub) registerClient(c *Client) {
	h.mu.Lock()
	room, exists := h.rooms[c.RoomID]
	if !exists {
		room = newRoom(c.RoomID)
		h.rooms[c.RoomID] = room
	}
	h.mu.Unlock()

	room.addClient(c)
	log.Info().Str("room", c.RoomID).Str("client", c.ID.String()).Msg("Client joined room")

	// Send existing Y.js state to new client so they can sync
	room.mu.RLock()
	if len(room.yjsState) > 0 {
		c.Send <- room.yjsState
	}
	room.mu.RUnlock()
}

func (h *Hub) unregisterClient(c *Client) {
	h.mu.RLock()
	room, exists := h.rooms[c.RoomID]
	h.mu.RUnlock()

	if !exists {
		return
	}

	room.removeClient(c)
	close(c.Send)

	log.Info().Str("room", c.RoomID).Str("client", c.ID.String()).Msg("Client left room")

	// Clean up empty rooms
	if room.clientCount() == 0 {
		h.mu.Lock()
		delete(h.rooms, c.RoomID)
		h.mu.Unlock()
		log.Info().Str("room", c.RoomID).Msg("Room closed (empty)")
	}
}

func (h *Hub) broadcastToRoom(msg *Message) {
	h.mu.RLock()
	room, exists := h.rooms[msg.RoomID]
	h.mu.RUnlock()

	if !exists {
		return
	}

	room.mu.RLock()
	defer room.mu.RUnlock()

	for client := range room.clients {
		// Don't echo back to sender
		if client == msg.Sender {
			continue
		}

		select {
		case client.Send <- msg.Payload:
		default:
			// Client buffer full — drop message (they'll re-sync on next join)
			log.Warn().Str("client", client.ID.String()).Msg("Client send buffer full, dropping message")
		}
	}
}

// GetRoom returns the room state for a given room ID (for persistence)
func (h *Hub) GetRoom(roomID string) *Room {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.rooms[roomID]
}

// UpdateRoomState updates the cached Y.js state for a room (called by persistence layer)
func (h *Hub) UpdateRoomState(roomID string, state []byte) {
	h.mu.RLock()
	room, exists := h.rooms[roomID]
	h.mu.RUnlock()

	if !exists {
		return
	}

	room.mu.Lock()
	room.yjsState = state
	room.mu.Unlock()
}
