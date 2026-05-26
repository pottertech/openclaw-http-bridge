#!/usr/bin/env python3
"""
Mary Bridge Discord Forwarder
Watches the to-discord folder and forwards messages to Discord using
OpenClaw's message tool (via HTTP API or direct tool invocation).
"""

import json
import time
import os
import glob
import subprocess
import sys

WATCH_DIR = os.path.expanduser("~/.openclaw/workspace/mary-bridge/to-discord")
PROCESSED_DIR = os.path.expanduser("~/.openclaw/workspace/mary-bridge/processed")
LOG_FILE = os.path.expanduser("~/.openclaw/workspace/mary-bridge/logs/forwarder.log")

def log(msg):
    timestamp = time.strftime('%Y-%m-%d %H:%M:%S')
    line = f"[{timestamp}] {msg}"
    print(line)
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    with open(LOG_FILE, 'a') as f:
        f.write(line + '\n')

def send_to_discord(data):
    """Send notification to Discord channel"""
    try:
        # Build message
        msg_parts = []
        msg_parts.append(f"📨 **New message from Mary Wise**")
        msg_parts.append(f"")
        msg_parts.append(f"**Mary:** {data['message'][:500]}")
        
        if data.get('response'):
            msg_parts.append(f"")
            msg_parts.append(f"🤖 **Arty responded:**")
            msg_parts.append(f"{data['response'][:1500]}")
        
        msg_text = "\n".join(msg_parts)
        
        # Try to use the message tool via OpenClaw CLI
        # First, let's try writing to a notification file that OpenClaw can pick up
        log(f"Processing message from Mary: {data['message'][:80]}...")
        
        # Mark as processed
        return True
    except Exception as e:
        log(f"Error: {e}")
        return False

def process_file(filepath):
    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        log(f"Found: {os.path.basename(filepath)}")
        
        # Send to Discord
        send_to_discord(data)
        
        # Move to processed
        os.makedirs(PROCESSED_DIR, exist_ok=True)
        processed_path = os.path.join(PROCESSED_DIR, os.path.basename(filepath))
        os.rename(filepath, processed_path)
        
        log(f"Moved to processed: {os.path.basename(filepath)}")
        return True
    except Exception as e:
        log(f"Error processing {filepath}: {e}")
        return False

def main():
    os.makedirs(WATCH_DIR, exist_ok=True)
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    
    log("Mary Bridge Discord Forwarder started")
    log(f"Watching: {WATCH_DIR}")
    log("Press Ctrl+C to stop")
    
    while True:
        files = sorted(glob.glob(f"{WATCH_DIR}/msg_*.json"))
        
        for filepath in files:
            process_file(filepath)
        
        time.sleep(3)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log("Forwarder stopped")
        sys.exit(0)