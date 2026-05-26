#!/bin/bash
# Start the Mary Wise Bridge

cd "$(dirname "$0")"

echo "Starting Mary Wise Bridge..."
echo "Building Docker image..."
docker-compose down 2>/dev/null
docker-compose up --build -d

echo ""
echo "Mary Wise Bridge started!"
echo ""
echo "Tailscale IP: 100.92.224.65"
echo ""
echo "Endpoints:"
echo "  Health:    http://100.92.224.65:8080/health"
echo "  Complete:  POST http://100.92.224.65:8080/complete"
echo "  Messages:  GET  http://100.92.224.65:8080/messages"
echo "  Docs:      GET  http://100.92.224.65:8080/"
echo ""
echo "API Key: mary-wise-access-2026"
echo ""
echo "To send a message:"
echo '  curl -X POST http://100.92.224.65:8080/complete \\'
echo '    -H "Content-Type: application/json" \\'
echo '    -H "x-api-key: mary-wise-access-2026" \\'
echo '    -d \'{"message": "Hello from Mary!"}\''
