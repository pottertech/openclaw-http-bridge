# OpenClaw HTTP Completion Bridge

A Dockerized HTTP completion bridge that connects external users to your AI assistant via HTTP API. Supports AI-powered responses, image generation, maps, PDFs, and automatic Discord notifications.

## Features

- **HTTP API** for sending/receiving messages
- **AI Integration** via Ollama (any model)
- **Image Generation** via Pollinations AI (free, no API key)
- **Map Generation** (via URL-based services)
- **PDF Document Creation**
- **Discord Webhook Notifications** — automatically forwards all conversations
- **API Key Authentication** — secure with configurable keys
- **Conversation History** — maintains context across messages
- **Dockerized** — easy deployment anywhere

## Quick Start

### 1. Clone and Configure

```bash
git clone https://github.com/pottertech/openclaw-http-bridge.git
cd openclaw-http-bridge
```

### 2. Set Environment Variables

Create a `.env` file or edit `docker-compose.yml`:

```yaml
environment:
  # Required
  MARY_API_KEY: your-secret-api-key
  
  # Optional - Discord webhook for notifications
  DISCORD_WEBHOOK: https://discord.com/api/webhooks/YOUR_WEBHOOK_URL
  
  # Optional - AI model configuration
  OLLAMA_HOST: http://host.docker.internal:11434
  OLLAMA_MODEL: minimax-m2.7:cloud
  
  # Optional - Image output directory
  IMAGE_OUTPUT_DIR: /app/images
```

### 3. Start the Bridge

```bash
./start.sh
```

Or manually:
```bash
docker-compose up --build -d
```

### 4. Test It

```bash
curl -X POST http://localhost:8080/complete \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-api-key" \
  -d '{"message": "Hello!", "from": "Test User"}'
```

## API Reference

### POST /complete
Send a message to the AI assistant.

**Headers:**
- `Content-Type: application/json`
- `x-api-key: your-api-key`

**Body:**
```json
{
  "message": "Create an image of a sunset",
  "from": "User Name"  // optional, defaults to "Mary Wise"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "1234567890",
  "response": {
    "from": "Arty (AI Assistant)",
    "message": "Here's your sunset image! 🌅",
    "timestamp": "2026-05-26T12:00:00Z"
  },
  "attachments": [
    {
      "type": "image",
      "url": "https://image.pollinations.ai/...",
      "localPath": "/app/images/img_123.jpg",
      "size": 94774
    }
  ]
}
```

### GET /health
Check bridge status.

### GET /messages
View message history (requires API key).

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MARY_API_KEY` | `mary-w…2026` | API key for authentication |
| `DISCORD_WEBHOOK` | (empty) | Discord webhook URL for notifications |
| `OLLAMA_HOST` | `http://host.docker.internal:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `minimax-m2.7:cloud` | AI model name |
| `PORT` | `8080` | HTTP port |

## Image Generation

Images are generated using **Pollinations AI** — completely free, no API key needed!

- Size: 16x16 to 2048x2048 pixels
- Format: JPEG (default) or PNG
- No watermark with `nologo=true`
- ~65-85 seconds generation time

## Discord Notifications

All messages are automatically forwarded to Discord as rich embeds:
- 📝 User message
- 🤖 AI response  
- 📎 Attachment info

## File Structure

```
├── Dockerfile              # Node.js 20 Alpine
├── docker-compose.yml      # Container orchestration
├── server.js              # Main Express app
├── start.sh               # Quick start script
├── forward-to-discord.sh  # Bash notification forwarder
├── forward-to-discord.py  # Python notification forwarder
├── forwarder.py           # Python file watcher
├── notify.py              # Notification utility
├── images/                # Generated images
├── to-discord/            # Notification queue
└── logs/                  # Application logs
```

## License

MIT
