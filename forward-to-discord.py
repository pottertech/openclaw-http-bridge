#!/usr/bin/env python3
"""
Mary Bridge → Discord Forwarder
Polls the bridge /messages endpoint and sends new messages to Discord
using the OpenClaw message tool (via shell command or direct API).
"""

import json
import time
import os
import sys
import urllib.request
import urllib.error
import subprocess

# Config
BRIDGE_URL = "http://100.92.224.65:8080"
API_KEY = "mary-wise-access-2026"
LAST_ID_FILE = os.path.expanduser("~/.openclaw/workspace/mary-bridge/.last_id")
DISCORD_CHANNEL = "1474777507554267237"
POLL_INTERVAL = 30  # seconds

def get_last_id():
    try:
        with open(LAST_ID_FILE, 'r') as f:
            return f.read().strip()
    except:
        return "0"

def set_last_id(last_id):
    with open(LAST_ID_FILE, 'w') as f:
        f.write(str(last_id))

def fetch_messages():
    req = urllib.request.Request(
        f"{BRIDGE_URL}/messages?limit=50",
        headers={"x-api-key": API_KEY}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        print(f"Error fetching messages: {e}")
        return None

def forward_to_discord(message_data):
    """Forward a Mary message to Discord using OpenClaw's message tool"""
    # Build message text
    msg_parts = [f"📨 **Mary Wise sent a message**"]
    msg_parts.append(f"> {message_data['message'][:500]}")
    
    if message_data.get('response'):
        msg_parts.append(f"\n🤖 **Arty responded:**")
        msg_parts.append(f"{message_data['response'][:1000]}")
    
    msg_text = "\n".join(msg_parts)
    
    # Write to a file that OpenClaw can detect
    # We'll use a notifications directory
    notifications_dir = os.path.expanduser("~/.openclaw/workspace/mary-bridge/to-discord")
    os.makedirs(notifications_dir, exist_ok=True)
    
    notification = {
        "channel": "discord",
        "target": DISCORD_CHANNEL,
        "message": msg_text,
        "timestamp": time.time(),
        "mary_message_id": message_data['id']
    }
    
    filename = f"{notifications_dir}/msg_{message_data['id']}.json"
    with open(filename, 'w') as f:
        json.dump(notification, f, indent=2)
    
    print(f"Queued for Discord: {filename}")
    return True

def main():
    print("Mary → Discord Forwarder started")
    print(f"Bridge: {BRIDGE_URL}")
    print(f"Discord Channel: {DISCORD_CHANNEL}")
    
    last_id = get_last_id()
    print(f"Starting from message ID: {last_id}")
    
    while True:
        data = fetch_messages()
        if data and 'messages' in data:
            new_messages = []
            for msg in data['messages']:
                if msg['id'] > last_id:
                    new_messages.append(msg)
                    last_id = msg['id']
            
            for msg in new_messages:
                print(f"\n[{time.strftime('%H:%M:%S')}] New message from {msg['from']}")
                print(f"  → {msg['message'][:80]}...")
                forward_to_discord(msg)
            
            if new_messages:
                set_last_id(last_id)
        
        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nForwarder stopped")
        sys.exit(0)
