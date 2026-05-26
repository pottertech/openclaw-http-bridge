#!/usr/bin/env python3
"""
Mary Bridge Discord Notifier
Polls the bridge API and forwards messages to Discord.
Runs as a standalone script, can be added to cron or LaunchAgent.
"""

import json
import time
import os
import sys
import urllib.request
import urllib.error

# Config
BRIDGE_URL = "http://100.92.224.65:8080"
API_KEY = "mary-wise-access-2026"
LAST_ID_FILE = os.path.expanduser("~/.openclaw/workspace/mary-bridge/.last_id")
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

def send_discord_message(message_data):
    """Send notification to Discord using the message tool via OpenClaw"""
    msg_text = f"**Message from Mary Wise**\n> {message_data['message'][:500]}"
    
    if message_data.get('response'):
        msg_text += f"\n\n**Arty responded:**\n{message_data['response'][:800]}"
    
    # Write to notification file for OpenClaw to pick up
    notification = {
        "action": "send",
        "target": "discord",
        "channel": "1474777507554267237",
        "message": msg_text,
        "timestamp": time.time()
    }
    
    # Save to a notifications directory that can be polled
    notifications_dir = os.path.expanduser("~/.openclaw/workspace/mary-bridge/discord-notifications")
    os.makedirs(notifications_dir, exist_ok=True)
    
    filename = f"{notifications_dir}/msg_{message_data['id']}.json"
    with open(filename, 'w') as f:
        json.dump(notification, f, indent=2)
    
    print(f"Notification saved: {filename}")
    return True

def main():
    print("Mary Bridge Discord Notifier started")
    print(f"Polling: {BRIDGE_URL}/messages")
    
    last_id = get_last_id()
    
    while True:
        data = fetch_messages()
        if data and 'messages' in data:
            new_messages = []
            for msg in data['messages']:
                if msg['id'] > last_id:
                    new_messages.append(msg)
                    last_id = msg['id']
            
            for msg in new_messages:
                print(f"New message from {msg['from']}: {msg['message'][:80]}...")
                send_discord_message(msg)
            
            if new_messages:
                set_last_id(last_id)
        
        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nNotifier stopped")
        sys.exit(0)
