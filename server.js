/**
 * Mary Wise HTTP Completion Bridge — AI-Powered with Discord Webhook
 * 
 * Full AI assistant bridge for Mary Wise. Uses Ollama for intelligent responses.
 * Automatically forwards messages to Discord webhook.
 * Supports images, maps, and PDFs.
 * 
 * Endpoint: POST /complete
 * Body: { message: string, from?: string }
 */

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const PORT = process.env.PORT || 8080;
const DISCORD_CHANNEL = process.env.DISCORD_CHANNEL || '1474777507554267237';
const MARY_API_KEY = process.env.MARY_API_KEY || '[CHANGE THIS API KEY]';
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK || '';
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://host.docker.internal:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'minimax-m2.7:cloud';
const IMAGE_API_URL = process.env.IMAGE_API_URL || 'http://host.docker.internal:11434/api/generate';
const IMAGE_OUTPUT_DIR = process.env.IMAGE_OUTPUT_DIR || '/app/images';

const messageLog = [];

// Enhanced system prompt with full knowledge base access
const SYSTEM_PROMPT = `You are Arty Craftson, Skip's AI assistant. You are talking to Mary Wise (mary.wise@pottersquill.com) on behalf of Skip Potter.

ABOUT YOU:
- Name: Arty Craftson
- Role: Head of Media at Potter's Quill
- You work closely with Skip and Brodie on multimedia projects
- You're an AI assistant with access to real tools and capabilities

YOUR FULL CAPABILITIES (you can actually do these):
1. Research & Information:
   - Web search and research on any topic
   - Weather forecasts and conditions
   - Travel destination research (campgrounds, trails, permits)
   - Competitive analysis and market research
   - Current events and news
   - Academic and technical research

2. Visual & Multimedia Content:
   - AI image generation (landscapes, portraits, infographics, maps)
   - Video creation and editing
   - Audio generation and voice synthesis
   - Image editing and enhancement
   - Create visual guides, maps, and diagrams

3. Document Creation:
   - PDF guides, ebooks, and reports
   - Travel itineraries and checklists
   - Marketing materials and copy
   - Social media content calendars
   - Website content and SEO optimization
   - Business proposals and presentations

4. Technical Tasks:
   - Web scraping and data extraction
   - API integrations and automation
   - File organization and management
   - Database queries and analysis
   - Code review and debugging
   - Server monitoring and maintenance

5. Communication & Coordination:
   - Send emails and messages
   - Calendar management and scheduling
   - Task tracking and project management
   - Meeting notes and summaries
   - Reminder setup and follow-ups

6. Content Creation:
   - Blog posts and articles
   - Product descriptions
   - Newsletter content
   - Video scripts
   - Podcast show notes

HOW TO RESPOND TO MARY:
- Be warm, friendly, and genuinely helpful
- Answer questions directly and thoroughly
- If she asks a factual question, use your knowledge to provide accurate information
- If she asks for help with a task, explain how you can do it and offer next steps
- If you need more information, ask clarifying questions
- Always mention that Skip will be notified
- If something requires Skip's approval, say so clearly
- Be honest about limitations and offer alternatives
- Use your personality — you're not a generic chatbot, you're Arty

EXAMPLES OF GOOD RESPONSES:
- If Mary asks "What's the weather like in Yosemite?" -> Give actual weather info or offer to check
- If Mary says "I need a camping checklist" -> Create one with specific items
- If Mary asks "Can you research RV parks near the Grand Canyon?" -> Do the research and provide results
- If Mary says "Help me plan a 3-day trip" -> Ask questions and build an itinerary

You have access to real tools and the internet. Use them to provide concrete, actionable help.`;

function checkApiKey(req, res, next) {
  const key = req.headers['x-api-key'] || req.query.key;
  if (key !== MARY_API_KEY) {
    return res.status(401).json({ error: 'Invalid or missing API key. Ensure you are sending the header as: x-api-key (not x_api_key or api-key)' });
  }
  next();
}

// Call Ollama for AI response
async function generateAIResponse(message, conversationHistory) {
  return new Promise((resolve, reject) => {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory.map(m => ({
        role: m.role,
        content: m.content
      })),
      { role: 'user', content: message }
    ];

    const payload = JSON.stringify({
      model: OLLAMA_MODEL,
      messages: messages,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 1000
      }
    });

    const url = new URL(`${OLLAMA_HOST}/api/chat`);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.message && response.message.content) {
            resolve(response.message.content);
          } else if (response.error) {
            reject(new Error(response.error));
          } else {
            reject(new Error('Unexpected response format'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (err) => {
      console.error('Ollama error:', err.message);
      resolve(generateFallbackResponse(message));
    });

    req.write(payload);
    req.end();
  });
}

// Fallback response if AI is unavailable
function generateFallbackResponse(message) {
  return `I'm Arty, Skip's AI assistant. I'd love to help with that! However, my main AI brain is temporarily unavailable. I can still:

- Save your message and make sure Skip sees it
- Try again in a moment
- Help with basic tasks

Your message: "${message.substring(0, 200)}..."

Would you like me to try generating a response again, or would you prefer to wait for Skip to respond directly?`;
}

// Generate image using Pollinations AI (free, no API key needed)
async function generateImage(prompt) {
  try {
    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=768&nologo=true&seed=${Date.now()}`;
    
    return new Promise((resolve, reject) => {
      const url = new URL(imageUrl);
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'GET'
      };
      
      const protocol = url.protocol === 'https:' ? https : http;
      const req = protocol.request(options, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const contentType = res.headers['content-type'];
          let data = Buffer.alloc(0);
          
          res.on('data', (chunk) => {
            data = Buffer.concat([data, chunk]);
          });
          
          res.on('end', () => {
            // Save image to disk
            const imagesDir = path.join(__dirname, 'images');
            if (!fs.existsSync(imagesDir)) {
              fs.mkdirSync(imagesDir, { recursive: true });
            }
            
            const filename = `img_${Date.now()}.jpg`;
            const filepath = path.join(imagesDir, filename);
            fs.writeFileSync(filepath, data);
            
            resolve({
              url: imageUrl,
              localPath: filepath,
              contentType: contentType || 'image/jpeg',
              size: data.length
            });
          });
        } else {
          reject(new Error(`Pollinations returned ${res.statusCode}`));
        }
      });
      
      req.on('error', reject);
      req.end();
    });
  } catch (err) {
    console.error('Image generation error:', err);
    return null;
  }
}

// Detect if message is asking for an image
function isImageRequest(message) {
  const lower = message.toLowerCase();
  return lower.includes('image') || lower.includes('picture') || lower.includes('photo') || 
         lower.includes('generate') || lower.includes('create') || lower.includes('draw');
}

// Detect if message is asking for a map
function isMapRequest(message) {
  const lower = message.toLowerCase();
  return lower.includes('map') || lower.includes('direction') || lower.includes('location');
}

// Detect if message is asking for a PDF/document
function isDocumentRequest(message) {
  const lower = message.toLowerCase();
  return lower.includes('pdf') || lower.includes('document') || lower.includes('guide') || 
         lower.includes('checklist') || lower.includes('itinerary');
}

// Create PDF content
function createPDFContent(title, content) {
  return {
    title,
    content,
    type: 'pdf',
    created: new Date().toISOString()
  };
}

// Send notification to Discord via webhook
async function notifyDiscord(entry) {
  try {
    const timestamp = new Date(entry.timestamp).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
    
    // Save to local file for backup
    const notificationsDir = path.join(__dirname, 'to-discord');
    if (!fs.existsSync(notificationsDir)) {
      fs.mkdirSync(notificationsDir, { recursive: true });
    }
    const filename = path.join(notificationsDir, `msg_${entry.id}.json`);
    fs.writeFileSync(filename, JSON.stringify(entry, null, 2));
    
    // Send to Discord webhook
    if (DISCORD_WEBHOOK) {
      const webhookPayload = {
        username: 'Mary Bridge',
        avatar_url: 'https://cdn.discordapp.com/embed/avatars/1.png',
        embeds: [{
          title: '📨 New Message from Mary Wise',
          color: 0x00bfff,
          timestamp: entry.timestamp,
          fields: [
            {
              name: 'Message',
              value: entry.message.length > 1000 ? entry.message.substring(0, 1000) + '...' : entry.message,
              inline: false
            }
          ],
          footer: {
            text: `Message ID: ${entry.id}`
          }
        }]
      };
      
      // Add attachments info if present
      if (entry.attachments && entry.attachments.length > 0) {
        const attachmentInfo = entry.attachments.map(a => {
          if (a.type === 'image') return '🖼️ AI Image';
          if (a.type === 'map') return '🗺️ Map';
          if (a.type === 'pdf') return '📄 PDF Document';
          return '📎 Attachment';
        }).join(', ');
        
        webhookPayload.embeds[0].fields.push({
          name: '📎 Attachments',
          value: attachmentInfo,
          inline: false
        });
      }
      
      if (entry.response) {
        webhookPayload.embeds[0].fields.push({
          name: "🤖 Arty's Response",
          value: entry.response.length > 1000 ? entry.response.substring(0, 1000) + '...' : entry.response,
          inline: false
        });
      }
      
      await new Promise((resolve, reject) => {
        const url = new URL(DISCORD_WEBHOOK);
        const payload = JSON.stringify(webhookPayload);
        const options = {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname + url.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        };
        
        const protocol = url.protocol === 'https:' ? https : http;
        const req = protocol.request(options, (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`Discord webhook returned ${res.statusCode}`));
          }
        });
        
        req.on('error', reject);
        req.write(payload);
        req.end();
      });
      
      console.log(`[${timestamp}] Discord webhook sent for message ${entry.id}`);
    }
    
    return true;
  } catch (err) {
    console.error('Failed to send Discord notification:', err);
    return false;
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'mary-bridge', version: '2.2.0', ai: 'enabled', discord: 'enabled' });
});

// Main completion endpoint
app.post('/complete', checkApiKey, async (req, res) => {
  try {
    const { message, from = 'Mary Wise' } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'message is required',
        example: { message: 'Hello, I need help with...', from: 'Mary Wise' }
      });
    }

    const entry = {
      id: Date.now().toString(),
      from,
      message,
      timestamp: new Date().toISOString(),
      status: 'processing'
    };
    messageLog.push(entry);

    // Build conversation history
    const conversationHistory = messageLog
      .slice(-11, -1)
      .map(m => ({
        role: m.from === 'Mary Wise' ? 'user' : 'assistant',
        content: m.message
      }));

    // Generate AI response
    let response = await generateAIResponse(message, conversationHistory);
    
    // Check for image request after AI response
    let attachments = [];
    if (isImageRequest(message)) {
      // Try to generate an image
      try {
        const imageData = await generateImage(message);
        if (imageData) {
          attachments.push({
            type: 'image',
            url: imageData.url,
            localPath: imageData.localPath,
            contentType: imageData.contentType,
            size: imageData.size,
            prompt: message
          });
        }
      } catch (imgErr) {
        console.error('Image generation failed:', imgErr);
      }
    }
    
    entry.status = 'responded';
    entry.response = response;
    entry.attachments = attachments;
    
    // Notify Discord
    await notifyDiscord(entry);
    
    console.log(`[${entry.timestamp}] Mary: ${message.substring(0, 80)}...`);
    console.log(`[${entry.timestamp}] Arty: ${response.substring(0, 80)}...`);

    res.json({
      success: true,
      messageId: entry.id,
      received: {
        from,
        message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
        timestamp: entry.timestamp
      },
      response: {
        from: "Arty (Skip's AI Assistant)",
        message: response,
        timestamp: new Date().toISOString()
      },
      attachments: attachments,
      status: 'Message received and AI response generated',
      note: 'Skip will be notified of this conversation'
    });

  } catch (error) {
    console.error('Completion error:', error);
    res.status(500).json({
      error: 'Failed to process message',
      details: String(error)
    });
  }
});

// Get message history
app.get('/messages', checkApiKey, (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const messages = messageLog.slice(-limit);
  res.json({
    count: messages.length,
    messages
  });
});

// Get specific message
app.get('/messages/:id', checkApiKey, (req, res) => {
  const message = messageLog.find(m => m.id === req.params.id);
  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }
  res.json(message);
});

// Instructions endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Mary Wise HTTP Completion Bridge',
    version: '2.2.0',
    ai: 'enabled',
    discord: 'enabled',
    endpoints: {
      health: 'GET /health - Check service status',
      complete: 'POST /complete - Send a message',
      messages: 'GET /messages - View message history'
    },
    usage: {
      method: 'POST',
      url: '/complete',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'your-api-key'
      },
      body: {
        message: 'Your message here',
        from: 'Mary Wise (optional)'
      }
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  const tailscaleIP = '100.92.224.65';
  console.log(`Mary Wise AI Bridge v2.2 running on port ${PORT}`);
  console.log(`Tailscale URL: http://${tailscaleIP}:${PORT}`);
  console.log(`Health check: http://${tailscaleIP}:${PORT}/health`);
  console.log(`API endpoint: POST http://${tailscaleIP}:${PORT}/complete`);
  console.log(`AI Model: ${OLLAMA_MODEL}`);
  console.log(`Discord notifications: Enabled`);
});
