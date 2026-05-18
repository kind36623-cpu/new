import express from 'express';
import fs from 'fs';
import path from 'path';
import Groq from 'groq-sdk';
import { pipeline, env } from '@xenova/transformers';

// Important: Configure transformers.js to not try to access the browser's filesystem
env.localModelPath = './models';
env.allowLocalModels = false;

const router = express.Router();

const DB_PATH = path.join(process.cwd(), 'database.json');
const CHAT_DB_PATH = path.join(process.cwd(), 'chat_history.json');

// --- Chat DB Utility + Cleanup ---
function getChatMemoryDb() {
    if (!fs.existsSync(CHAT_DB_PATH)) return {};
    try {
        return JSON.parse(fs.readFileSync(CHAT_DB_PATH, 'utf-8'));
    } catch {
        return {};
    }
}

function saveChatMemoryDb(db) {
    fs.writeFileSync(CHAT_DB_PATH, JSON.stringify(db, null, 2));
}

function cleanOldChats() {
    const db = getChatMemoryDb();
    const now = Date.now();
    let changed = false;
    // 5 * 24 * 60 * 60 * 1000 = 432000000
    for (const [articleId, session] of Object.entries(db)) {
        if (now - session.timestamp >= 432000000) {
            delete db[articleId];
            changed = true;
        }
    }
    if (changed) {
        saveChatMemoryDb(db);
        console.log('Cleaned up chat memory older than 5 days.');
    }
    return db;
}

// Helper function to calculate Cosine Similarity between two vectors
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// --- Embedding Pipeline ---
let embedder = null;
const getEmbedder = async () => {
    if (!embedder) {
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
            quantized: true,
        });
    }
    return embedder;
};

async function getEmbedding(text) {
    const generator = await getEmbedder();
    const output = await generator(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
}

const SYSTEM_PROMPT = `You are Kenshiki AI, a highly capable, professional, and elegant AI assistant. You are embedded inside a news article page, but you can answer any question the user asks.

# Core Persona
- Tone: Professional, highly articulate, calm, and intellectually rigorous.
- Style: Minimalist and elegant. Write clear, concise prose. 
- Constraint: **NEVER USE EMOJIS.** Do not use exclamation points unnecessarily. Do not use overly enthusiastic or colloquial language.
- Capability: You can discuss the provided article context or any general knowledge topic (science, history, coding, etc.).

# Article Context
You will receive an Article Title and Article Context. Use this when the user is asking about the article. If they ask a general question, answer it directly without referencing the article.

# Formatting Rules
1. **CRITICAL:** Before you answer, you MUST write your internal, step-by-step thinking inside <reasoning>...</reasoning> tags.
2. After the reasoning block, provide your final response.
3. Structure your response cleanly using Markdown (headers, bullet points, and bold text for emphasis).
4. Do not use emojis in your response.

# Examples

User: "hi"
You: "<reasoning>The user is greeting me. I will respond politely and ask how I can assist them.</reasoning>
Hello. I am Kenshiki AI. How can I assist you today?"

User: "what is photosynthesis?"
You: "<reasoning>The user is asking for an explanation of photosynthesis. I will provide a clear, step-by-step explanation without emojis.</reasoning>
Photosynthesis is the process by which green plants and certain other organisms transform light energy into chemical energy. 

The primary steps are:
- Plants absorb sunlight through their leaves.
- They take in water from the soil and carbon dioxide from the air.
- They synthesize these components to produce glucose for energy and release oxygen as a byproduct.

Let me know if you would like a more detailed biochemical breakdown."

# Map Feature
If the user asks to show a location or place on the map (e.g., "show India", "where is Tokyo?"), return ONLY this exact JSON — no text or reasoning before or after:
{
  "intent": "map_link",
  "location": "<place name>",
  "lat": "<latitude as number>",
  "lng": "<longitude as number>"
}

# Navigation
If the user wants to navigate to a different section of the Kenshiki app (e.g., "take me to the map", "open news feed"), return ONLY this exact JSON — no text or reasoning before or after:
{
  "intent": "nav_command",
  "destination": "/map",
  "action": "none",
  "spokenResponse": "Navigating to the map."
}

Remember: Be exceptionally clear, professional, and entirely free of emojis.`;

router.post('/chat', async (req, res) => {
    const { articleTitle, articleContent, message, history = [] } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        console.log(`Searching zero-dependency embeddings for message: ${message}`);
        
        let relatedContext = '';
        
        // 1. Convert user message to embedding vector
        const queryVector = await getEmbedding(message);

        // 2. Query Local JSON DB for related context
        try {
            if (fs.existsSync(DB_PATH)) {
                const rawData = fs.readFileSync(DB_PATH, 'utf-8');
                const memoryDb = JSON.parse(rawData);
                
                // Calculate similarity for all stored vectors
                const scoredVectors = memoryDb.vectors.map(entry => {
                    const score = cosineSimilarity(queryVector, entry.vector);
                    return { ...entry, score };
                });

                // Sort by highest score first and take top 3
                scoredVectors.sort((a, b) => b.score - a.score);
                const topResults = scoredVectors.slice(0, 3);
                
                relatedContext = topResults.map(res => res.payload.content).join('\n\n');
            } else {
                console.warn('database.json not found. Run ingestNews.js first.');
            }
        } catch (e) {
            console.warn('Local database search failed.', e.message);
        }

        // Always include the current article content we are looking at!
        const fullContext = (articleContent || '') + '\n\n--- Retrived Past Context ---\n' + relatedContext;

        // 3. Construct the User Prompt dynamically
        const contextualUserMessage = `
Article Title:
${articleTitle || 'No title provided'}

Article Context:
${fullContext}

User Message:
${message}
        `;

        const API_KEY = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;

        // 4. Send to Mistral/Meta via Groq
        if (!API_KEY) {
             return res.json({ reply: 'Mock Agent: I am alive, but Groq API key is missing from backend memory! DB retrieved: ' + relatedContext.substring(0,50) });
        }

        const groq = new Groq({ apiKey: API_KEY });

        const formattedHistory = history.map(msg => ({
            role: msg.sender === 'ai' ? 'assistant' : 'user',
            content: String(msg.text || '')
        }));

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                ...formattedHistory,
                { role: 'user', content: contextualUserMessage }
            ],
            temperature: 0.7, // Warmer temp for friendly, natural ChatGPT-style replies
        });

        const reply = completion.choices[0]?.message?.content || "";

        // Send reply
        res.json({ reply });

    } catch (error) {
        console.error('Chat API Error:', error);
        res.status(500).json({ error: 'Failed to process chat request' });
    }
});

router.get('/chat/memory/:articleId', (req, res) => {
    const db = cleanOldChats();
    const session = db[req.params.articleId];
    if (session) {
        return res.json({ messages: session.messages });
    }
    res.json({ messages: null });
});

router.post('/chat/memory', (req, res) => {
    const { articleId, messages } = req.body;
    if (!articleId || !messages) return res.status(400).json({ error: 'Missing target or messages' });
    
    cleanOldChats(); // trigger cleanup on activity
    const db = getChatMemoryDb();
    db[articleId] = {
        messages,
        timestamp: Date.now()
    };
    saveChatMemoryDb(db);
    res.json({ success: true });
});

// ── POST /api/ai/brief ────────────────────────────────────────────────────────
// Generates an intelligence brief for a news article using Groq.
// GROQ_API_KEY stays on the server — never exposed to the browser.
router.post('/ai/brief', async (req, res) => {
    const { title, description, source } = req.body;
    if (!title) return res.status(400).json({ error: 'Article title is required' });

    const API_KEY = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;

    const prompt = `You are an elite geopolitical and economic intelligence analyst for Kenshiki, a professional intelligence platform.
Your task is to write a comprehensive 'Deep Dive' intelligence brief based on the following news event.

TITLE: ${title}
DESCRIPTION: ${description || ''}
SOURCE: ${source || 'Global News'}

Format the output STRICTLY in standard Markdown using this exact structure:

# [Create an Engaging, Professional Title for the intelligence brief]

**Source Intelligence:** ${source || 'Global News'} | **Region:** [infer region] | **Classification:** OPEN SOURCE

---

## 🌐 Overview & Context
[Write 1-2 rich paragraphs explaining the historical or geographic background leading to this event. Be authoritative and precise.]

## 🔍 Direct Causes & Triggers
[Bullet points (3-5) outlining the specific reasons this is happening now. Each bullet should begin with a bold label like **Economic Pressure:** or **Policy Shift:**]

## 📊 Statistical & Data Analysis
[Create a clean markdown table with at minimum 5 rows synthesizing projected data, financial impact, index scores, or regional metrics. Headers: Metric | Current Status | Projected (90-day)]

## ⚡ Predictive Impact
[Write 1 authoritative paragraph on the medium-to-long-term global or regional consequences of this event.]

---
*Brief generated by Kenshiki Intelligence Engine — Groq × LLaMA 3.3*`;

    if (!API_KEY) {
        // Return a structured mock so the UI doesn't break
        return res.json({
            content: `# Intelligence Brief: ${title}\n\n**Source Intelligence:** ${source || 'Global News'} | **Region:** Global | **Classification:** OPEN SOURCE\n\n---\n\n## 🌐 Overview & Context\n\nAI assistant is temporarily unavailable. The backend GROQ_API_KEY environment variable is not set. Configure it in your Render dashboard to enable live intelligence briefs.\n\n## 🔍 Direct Causes & Triggers\n\n- **Configuration Required:** Add GROQ_API_KEY to the Render environment variables.\n\n## 📊 Statistical & Data Analysis\n\n| Metric | Current Status | Projected (90-day) |\n|---|---|---|\n| AI Status | Offline | Pending key configuration |\n\n## ⚡ Predictive Impact\n\nOnce configured, this section will contain AI-generated predictive analysis.\n\n---\n*Brief generated by Kenshiki Intelligence Engine · Configuration Required*`,
        });
    }

    try {
        const groq = new Groq({ apiKey: API_KEY });
        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: 'You are an elite intelligence analyst. Always respond in clean Markdown. Never wrap your response in code fences.' },
                { role: 'user', content: prompt },
            ],
            temperature: 0.65,
            max_tokens: 2048,
        });
        const content = completion.choices[0]?.message?.content?.trim() || '# Error\n\nEmpty response from AI.';
        res.json({ content });
    } catch (err) {
        console.error('[/ai/brief] Groq error:', err.message);
        res.status(500).json({ error: 'AI generation failed', details: err.message });
    }
});

// ── POST /api/ai/voice ────────────────────────────────────────────────────────
// Proxies KIRA voice agent tool-calling through the backend.
// Returns { type: 'text', content } or { type: 'tool_call', name, args }.
const VOICE_TOOLS = [
    { type: 'function', function: { name: 'navigate_to_page', description: 'Navigate the user to a specific page in the Kenshiki app.', parameters: { type: 'object', properties: { page: { type: 'string', enum: ['feed', 'map', 'article', 'security', 'economic', 'cultural', 'sports', 'local'] } }, required: ['page'] } } },
    { type: 'function', function: { name: 'read_news_feed', description: 'Read current news headlines aloud.', parameters: { type: 'object', properties: { count: { type: 'number' } }, required: [] } } },
    { type: 'function', function: { name: 'search_map', description: 'Search for a location on the radar map.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } },
    { type: 'function', function: { name: 'get_current_page_info', description: 'Get information about what is currently on screen.', parameters: { type: 'object', properties: {} } } },
];

const VOICE_SYSTEM_PROMPT = `You are KIRA — a warm, friendly, brilliantly smart AI voice assistant inside the Kenshiki intelligence platform. You are like a best friend who knows everything. Use casual, natural language. Contractions are fine. You're upbeat but never fake. Use light humour when appropriate. Keep answers concise for voice — 2-4 sentences for simple questions. For app navigation/actions, USE THE TOOLS. For everything else, talk naturally. NEVER refuse to answer general knowledge questions.`;

router.post('/ai/voice', async (req, res) => {
    const { transcript, currentPage = '/app', articleTitles = [], history = [] } = req.body;
    if (!transcript) return res.status(400).json({ error: 'transcript is required' });

    const API_KEY = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;

    if (!API_KEY) {
        return res.json({
            type: 'text',
            content: "Hey! I'm Kira. I'd love to help, but the AI backend isn't configured yet. Ask your admin to add the GROQ_API_KEY.",
        });
    }

    const pageLabels = {
        '/app': 'the World News Feed', '/app/insight': 'the World News Feed',
        '/app/map': 'the Radar Map', '/app/article': 'the Article Brief viewer',
        '/app/security': 'the Security Intelligence Feed', '/app/economic': 'the Economic Intelligence Feed',
        '/app/cultural': 'the Cultural Intelligence Feed', '/app/sports': 'the Sports Feed',
        '/app/local': 'the Local News Feed',
    };
    const contextMsg = [
        `Context: The user is on ${pageLabels[currentPage] || currentPage}.`,
        articleTitles.length > 0
            ? `Current headlines: ${articleTitles.slice(0, 6).join(' | ')}.`
            : 'No headlines loaded.',
        `Time: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.`,
    ].join(' ');

    try {
        const groq = new Groq({ apiKey: API_KEY });
        const trimmedHistory = history.slice(-20);

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: VOICE_SYSTEM_PROMPT },
                { role: 'system', content: contextMsg },
                ...trimmedHistory,
                { role: 'user', content: transcript },
            ],
            tools: VOICE_TOOLS,
            tool_choice: 'auto',
            temperature: 0.7,
            max_tokens: 512,
        });

        const choice = completion.choices[0];
        const message = choice.message;

        if (message.tool_calls && message.tool_calls.length > 0) {
            const tc = message.tool_calls[0];
            return res.json({
                type: 'tool_call',
                name: tc.function.name,
                args: JSON.parse(tc.function.arguments || '{}'),
            });
        }

        const content = message.content?.trim() || "I'm not sure how to help with that — feel free to ask anything else!";
        res.json({ type: 'text', content });
    } catch (err) {
        console.error('[/ai/voice] Groq error:', err.message);
        res.status(500).json({ error: 'Voice processing failed', details: err.message });
    }
});

// ── POST /api/ai/location ────────────────────────────────────────────────────
// Extracts precise location from a news article
router.post('/ai/location', async (req, res) => {
    const { title, description, content, fallback } = req.body;
    const API_KEY = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;

    if (!API_KEY) {
        return res.json({ location: fallback || 'Global' });
    }

    const prompt = `You are a geographic entity extractor. 
Extract the most specific city, state, or precise location where this news event occurred based on the provided text.
Return ONLY the place name formatted as "City, State, Country" (or as close as possible).
Do NOT include words like "in" or "near". Do NOT use markdown.
If no specific place is mentioned, return exactly "${fallback || 'Global'}".

Title: ${title}
Description: ${description || ''}
Content: ${content || ''}`;

    try {
        const groq = new Groq({ apiKey: API_KEY });
        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            max_tokens: 50,
        });
        let place = completion.choices[0]?.message?.content?.trim();
        // Fallback clean up
        if (place) {
             place = place.replace(/['"]/g, '').trim();
             if (place.length > 0 && place.length < 50) {
                 return res.json({ location: place });
             }
        }
        res.json({ location: fallback || 'Global' });
    } catch (err) {
        console.error('[/ai/location] Groq error:', err.message);
        res.status(500).json({ error: 'AI generation failed', location: fallback || 'Global' });
    }
});

export default router;

