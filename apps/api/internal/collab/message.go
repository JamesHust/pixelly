package collab

// MessageType defines the type of WebSocket message
type MessageType int

const (
	// YjsSync is a Y.js document sync message (binary)
	MsgYjsSync MessageType = iota
	// YjsUpdate is a Y.js incremental update (binary)
	MsgYjsUpdate
	// Awareness is a Y.js awareness update (cursor, presence)
	MsgAwareness
	// Join signals a user joining the room
	MsgJoin
	// Leave signals a user leaving the room
	MsgLeave
)

// Message represents a WebSocket message in a collaboration room
type Message struct {
	Type    MessageType
	RoomID  string
	Payload []byte
	// Sender is used to avoid echoing back to the original sender
	Sender *Client
}
