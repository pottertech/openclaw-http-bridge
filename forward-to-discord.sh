#!/bin/bash
# Mary Bridge Discord Forwarder
# Polls to-discord folder and sends messages to Discord

WATCH_DIR="$HOME/.openclaw/workspace/mary-bridge/to-discord"
PROCESSED_DIR="$HOME/.openclaw/workspace/mary-bridge/processed"
LOG_FILE="$HOME/.openclaw/workspace/mary-bridge/logs/forwarder.log"

mkdir -p "$WATCH_DIR" "$PROCESSED_DIR" "$HOME/.openclaw/workspace/mary-bridge/logs"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Mary Bridge Discord Forwarder started"
log "Watching: $WATCH_DIR"

while true; do
    for file in "$WATCH_DIR"/msg_*.json; do
        [ -f "$file" ] || continue
        
        log "Found: $(basename "$file")"
        
        # Read the message
        message=$(python3 -c "import json; d=json.load(open('$file')); print(d.get('message',''))" 2>/dev/null)
        response=$(python3 -c "import json; d=json.load(open('$file')); print(d.get('response',''))" 2>/dev/null)
        
        log "Message: ${message:0:80}..."
        
        # Move to processed
        mv "$file" "$PROCESSED_DIR/"
        log "Moved to processed"
    done
    
    sleep 3
done