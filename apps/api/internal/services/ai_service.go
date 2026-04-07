package services

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// AIService supports two provider modes:
//   - "ollama"  — local Ollama server (NDJSON streaming via /api/chat)
//   - "openai"  — any OpenAI-compatible API: Groq, OpenRouter, OpenAI, etc.
type AIService struct {
	provider   string // "ollama" | "openai"
	baseURL    string // e.g. http://localhost:11434 or https://api.groq.com/openai/v1
	model      string
	apiKey     string
	httpClient *http.Client
}

func NewAIService(provider, baseURL, model, apiKey string) *AIService {
	return &AIService{
		provider:   provider,
		baseURL:    baseURL,
		model:      model,
		apiKey:     apiKey,
		httpClient: &http.Client{},
	}
}

// --- Shared chat message types ---

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type SkillContext struct {
	Name    string `json:"name"`
	Content string `json:"content"`
}

type ChatRequest struct {
	Messages []ChatMessage  `json:"messages"`
	Skills   []SkillContext `json:"skills"`
	Model    string         `json:"model"` // optional override, uses config default if empty
}

// --- Skill fetch types ---

type SkillResult struct {
	Name        string `json:"name"`
	Repo        string `json:"repo"`
	Description string `json:"description"`
	Content     string `json:"content"`
}

// GenerateStream is kept for backwards compatibility with the /ai/generate endpoint.
func (s *AIService) GenerateStream(ctx context.Context, prompt string, w *bufio.Writer) error {
	return s.ChatStream(ctx, ChatRequest{
		Messages: []ChatMessage{{Role: "user", Content: prompt}},
	}, w)
}

// ChatStream dispatches to the appropriate provider.
func (s *AIService) ChatStream(ctx context.Context, req ChatRequest, w *bufio.Writer) error {
	systemPrompt := buildSystemPrompt(req.Skills)
	messages := make([]ChatMessage, 0, len(req.Messages)+1)
	messages = append(messages, ChatMessage{Role: "system", Content: systemPrompt})
	messages = append(messages, req.Messages...)

	model := s.model
	if req.Model != "" {
		model = req.Model
	}

	if s.provider == "openai" {
		return s.streamOpenAI(ctx, messages, model, w)
	}
	return s.streamOllama(ctx, messages, model, w)
}

// ── Ollama provider ──────────────────────────────────────────

type ollamaChatRequest struct {
	Model    string         `json:"model"`
	Messages []ChatMessage  `json:"messages"`
	Stream   bool           `json:"stream"`
}

type ollamaChunk struct {
	Message ChatMessage `json:"message"`
	Done    bool        `json:"done"`
}

func (s *AIService) streamOllama(ctx context.Context, messages []ChatMessage, model string, w *bufio.Writer) error {
	body, err := json.Marshal(ollamaChatRequest{Model: model, Messages: messages, Stream: true})
	if err != nil {
		return fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", s.baseURL+"/api/chat", bytes.NewReader(body))
	if err != nil {
		return err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		fmt.Fprintf(w, "data: [Error] Cannot reach Ollama at %s — is it running?\n\n", s.baseURL)
		w.Flush()
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, readErr := io.ReadAll(resp.Body)
		if readErr != nil {
			b = nil
		}
		msg := strings.TrimSpace(string(b))
		if msg == "" {
			msg = fmt.Sprintf("HTTP %d", resp.StatusCode)
		}
		fmt.Fprintf(w, "data: [Ollama error] %s\n\n", msg)
		fmt.Fprintf(w, "data: [DONE]\n\n")
		w.Flush()
		return nil
	}

	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}
		var chunk ollamaChunk
		if err := json.Unmarshal([]byte(line), &chunk); err != nil {
			continue
		}
		fmt.Fprintf(w, "data: %s\n\n", escapeSSE(chunk.Message.Content))
		w.Flush()
		if chunk.Done {
			fmt.Fprintf(w, "data: [DONE]\n\n")
			w.Flush()
			break
		}
	}
	return scanner.Err()
}

// ── OpenAI-compatible provider (Groq, OpenRouter, OpenAI…) ──

type openAIRequest struct {
	Model    string        `json:"model"`
	Messages []ChatMessage `json:"messages"`
	Stream   bool          `json:"stream"`
}

// openAIChunk represents a single SSE chunk from the OpenAI streaming API.
type openAIChunk struct {
	Choices []struct {
		Delta struct {
			Content string `json:"content"`
		} `json:"delta"`
		FinishReason *string `json:"finish_reason"`
	} `json:"choices"`
}

func (s *AIService) streamOpenAI(ctx context.Context, messages []ChatMessage, model string, w *bufio.Writer) error {
	body, err := json.Marshal(openAIRequest{Model: model, Messages: messages, Stream: true})
	if err != nil {
		return fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", s.baseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if s.apiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+s.apiKey)
	}

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		fmt.Fprintf(w, "data: [Error] Cannot reach AI provider at %s\n\n", s.baseURL)
		w.Flush()
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, readErr := io.ReadAll(resp.Body)
		if readErr != nil {
			b = nil
		}
		msg := strings.TrimSpace(string(b))
		if msg == "" {
			msg = fmt.Sprintf("HTTP %d", resp.StatusCode)
		}
		fmt.Fprintf(w, "data: [AI error] %s\n\n", msg)
		fmt.Fprintf(w, "data: [DONE]\n\n")
		w.Flush()
		return nil
	}

	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "data: ") {
			continue
		}
		data := line[6:]
		if data == "[DONE]" {
			fmt.Fprintf(w, "data: [DONE]\n\n")
			w.Flush()
			break
		}
		var chunk openAIChunk
		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			continue
		}
		if len(chunk.Choices) == 0 {
			continue
		}
		content := chunk.Choices[0].Delta.Content
		if content != "" {
			fmt.Fprintf(w, "data: %s\n\n", escapeSSE(content))
			w.Flush()
		}
	}
	return scanner.Err()
}

// ── Skill fetch ──────────────────────────────────────────────

// FetchSkill downloads skill markdown from GitHub raw content.
func (s *AIService) FetchSkill(ctx context.Context, repo string) (*SkillResult, error) {
	parts := strings.SplitN(repo, "/", 2)
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return nil, fmt.Errorf("invalid repo format, expected owner/repo")
	}
	owner, name := parts[0], parts[1]

	candidates := []string{
		fmt.Sprintf("https://raw.githubusercontent.com/%s/%s/main/%s.md", owner, name, name),
		fmt.Sprintf("https://raw.githubusercontent.com/%s/%s/main/skill.md", owner, name),
		fmt.Sprintf("https://raw.githubusercontent.com/%s/%s/main/README.md", owner, name),
		fmt.Sprintf("https://raw.githubusercontent.com/%s/%s/master/%s.md", owner, name, name),
		fmt.Sprintf("https://raw.githubusercontent.com/%s/%s/master/README.md", owner, name),
	}

	var content string
	for _, url := range candidates {
		req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
		if err != nil {
			continue
		}
		resp, err := s.httpClient.Do(req)
		if err != nil || resp.StatusCode != http.StatusOK {
			if resp != nil {
				resp.Body.Close()
			}
			continue
		}
		b, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			continue
		}
		content = string(b)
		break
	}

	if content == "" {
		return nil, fmt.Errorf("could not find skill content for %s — make sure the repo exists on GitHub", repo)
	}

	return &SkillResult{
		Name:        name,
		Repo:        repo,
		Description: extractFirstParagraph(content),
		Content:     content,
	}, nil
}

// ── Helpers ──────────────────────────────────────────────────

// escapeSSE replaces newlines so content stays on a single SSE data line.
func escapeSSE(s string) string {
	return strings.ReplaceAll(s, "\n", "\\n")
}

func buildSystemPrompt(skills []SkillContext) string {
	base := `You are an AI design assistant for Pixelly, a collaborative design editor (like Figma).
You help users create UI/UX designs, generate canvas layouts, and answer design questions.

## Canvas Output Format

When the user asks to generate UI components or layouts, you MUST include a JSON array of canvas objects in your reply:

[{"type":"rect","x":100,"y":100,"width":300,"height":60,"fill":"#6d28d9"},{"type":"text","x":110,"y":120,"text":"Button","fontSize":16}]

Supported object types and their properties:
- rect:    x, y, width, height, fill, stroke, strokeWidth, cornerRadius
- ellipse: x, y, width, height, fill, stroke, strokeWidth
- text:    x, y, text, fontSize, fill, fontFamily
- frame:   x, y, width, height, fill (use for artboards/screens)

Rules:
- Always output the JSON array when drawing or generating designs, even for simple requests.
- Use realistic coordinates and sizes (e.g. a screen is 1440x900, a button is ~120x40).
- Keep JSON valid and well-formed. Place it inline in your response text.`

	if len(skills) == 0 {
		return base
	}

	var sb strings.Builder
	sb.WriteString(base)
	sb.WriteString("\n\n## Active Skills\n\n")
	sb.WriteString("The following skills define design specifications you MUST follow when generating canvas objects.\n")
	sb.WriteString("Apply their colors, typography, spacing, and component guidelines to every JSON object you produce.\n")
	for _, skill := range skills {
		sb.WriteString(fmt.Sprintf("\n### %s\n\n%s\n", skill.Name, skill.Content))
	}
	return sb.String()
}

func extractFirstParagraph(content string) string {
	inFrontmatter := false
	lines := strings.Split(content, "\n")
	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if i == 0 && trimmed == "---" {
			inFrontmatter = true
			continue
		}
		if inFrontmatter {
			if trimmed == "---" {
				inFrontmatter = false
			}
			continue
		}
		if trimmed == "" ||
			strings.HasPrefix(trimmed, "#") ||
			strings.HasPrefix(trimmed, "<!--") ||
			strings.HasPrefix(trimmed, "```") {
			continue
		}
		if len(trimmed) > 150 {
			return trimmed[:147] + "..."
		}
		return trimmed
	}
	return ""
}
