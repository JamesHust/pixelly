package collab

import (
	"sync"

	"github.com/fasthttp/websocket"
	"github.com/google/uuid"
)

// Client represents a connected WebSocket user in a collaboration room
type Client struct {
	ID     uuid.UUID
	RoomID string
	Conn   *websocket.Conn
	Send   chan []byte
	Hub    *Hub
	mu     sync.Mutex
}

func NewClient(conn *websocket.Conn, roomID string, hub *Hub) *Client {
	return &Client{
		ID:     uuid.New(),
		RoomID: roomID,
		Conn:   conn,
		Send:   make(chan []byte, 256),
		Hub:    hub,
	}
}

// ReadPump reads messages from the WebSocket connection and forwards to hub
func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}

		c.Hub.Broadcast <- &Message{
			RoomID:  c.RoomID,
			Payload: message,
			Sender:  c,
		}
	}
}

// WritePump writes messages from the send channel to the WebSocket connection
func (c *Client) WritePump() {
	defer c.Conn.Close()

	for {
		message, ok := <-c.Send
		if !ok {
			c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
			return
		}

		c.mu.Lock()
		err := c.Conn.WriteMessage(websocket.BinaryMessage, message)
		c.mu.Unlock()

		if err != nil {
			return
		}
	}
}
