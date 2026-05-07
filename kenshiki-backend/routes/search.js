import express from 'express';
import Groq from 'groq-sdk';
import { searchNormal, searchPro } from '../services/searchService.js';
import { extractContent, chunkText } from '../services/extractService.js';
import { upsertChunks, retrieveContext, queryNamespace } from '../services/vectorService.js';

const router = express.Router();

// ── In-memory result cache (30-min TTL) ──────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000;

function getCached(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
    return entry.data;
}
function setCached(key, data) {
    cache.set(key, { data, ts: Date.now() });
}

// ── Groq summarization ────────────────────────────────────────────────────────
async function summarizeWithGroq(query, contextChunks, sources, history = []) {
    const API_KEY = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;
    if (!API_KEY) throw new Error('GROQ API key missing');

    const groq = new Groq({ apiKey: API_KEY });

    const contextText = contextChunks
        .map((c, i) => `[Source ${i + 1}: ${c.title || c.url}]\n${c.text}`)
        .join('\n\n---\n\n');

    const sourceList = sources
        .map((s, i) => `${i + 1}. ${s.title} — ${s.url}`)
        .join('\n');

    const prompt = `You are a helpful AI assistant like ChatGPT. Answer the user's question using the web sources provided below.

USER QUESTION: ${query}

WEB SOURCES:
${contextText}

SOURCES LIST:
${sourceList}

INSTRUCTIONS:
1. **CRITICAL:** BEFORE you answer, you MUST write down your internal, step-by-step thinking inside <reasoning>...</reasoning> tags. Include your logic, facts you are considering from the sources, and how you will structure your answer.
2. AFTER the reasoning block, provide your final answer.
3. Answer in simple, friendly English with emojis where they feel natural
4. Use **bold** for key terms
5. Use bullet points for lists
6. Start with a direct 1-2 sentence answer
7. Then expand with details from the sources
8. End with: "📚 Sources used: [list source numbers and names]"
9. If the sources don't have enough info, say so honestly and answer from general knowledge
10. NEVER make up fake facts`;

    const formattedHistory = history.map(msg => ({
        role: msg.sender === 'ai' ? 'assistant' : 'user',
        content: String(msg.text || '')
    }));

    const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            { role: 'system', content: 'You are a helpful, friendly AI assistant. Be concise, use emojis, simple English and bold for key words. Always include <reasoning> block first.' },
            ...formattedHistory,
            { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 1024,
    });

    return completion.choices[0]?.message?.content?.trim() || 'Sorry, I could not generate an answer.';
}

// ── POST /api/search ──────────────────────────────────────────────────────────
router.post('/search', async (req, res) => {
    const { query, mode = 'normal', history = [] } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
        return res.status(400).json({ error: 'Query is required' });
    }

    const cacheKey = `${mode}:${query.trim().toLowerCase()}`;
    const cached = getCached(cacheKey);
    if (cached) {
        console.log(`⚡ Cache hit for: "${query}"`);
        return res.json({ ...cached, cached: true });
    }

    try {
        console.log(`\n🔍 [${mode.toUpperCase()}] Searching for: "${query}"`);

        // ── Step 1: Web Search ─────────────────────────────────────────────
        let searchResults = [];
        try {
            searchResults = mode === 'pro'
                ? await searchPro(query)
                : await searchNormal(query);
            console.log(`✅ Got ${searchResults.length} search results`);
        } catch (err) {
            console.warn('Search failed:', err.message);
            // If search fails, answer from Groq general knowledge
            const answer = await summarizeWithGroq(query, [], [], history);
            return res.json({ answer, sources: [], mode, fromGeneralKnowledge: true });
        }

        if (searchResults.length === 0) {
            const answer = await summarizeWithGroq(query, [], [], history);
            return res.json({ answer, sources: [], mode, fromGeneralKnowledge: true });
        }

        // ── Step 2: Extract content in parallel ───────────────────────────
        console.log(`📄 Extracting content from ${searchResults.length} URLs…`);
        const extractedResults = await Promise.all(
            searchResults.map(async (result) => {
                const text = await extractContent(result.url);
                return { ...result, text };
            })
        );

        // Filter out pages that returned no/insufficient content
        const validResults = extractedResults.filter(r => r.text && r.text.length >= 300);
        console.log(`✅ Got content from ${validResults.length}/${searchResults.length} pages`);

        // ── Step 3: Chunk all content ─────────────────────────────────────
        const allChunks = [];
        for (const result of validResults) {
            const chunks = chunkText(result.text);
            for (const chunk of chunks) {
                allChunks.push({ text: chunk, url: result.url, title: result.title });
            }
        }
        console.log(`📦 Total chunks: ${allChunks.length}`);

        // ── Step 4: Embed + Upsert to Pinecone ───────────────────────────
        const namespace = queryNamespace(query);
        let contextChunks = [];

        if (allChunks.length > 0) {
            try {
                await upsertChunks(allChunks, namespace);

                // ── Step 5: Retrieve top-5 relevant chunks ─────────────────
                contextChunks = await retrieveContext(query, namespace, 5);
                console.log(`🎯 Retrieved ${contextChunks.length} relevant chunks from Pinecone`);
            } catch (pineconeErr) {
                console.warn('Pinecone error, falling back to direct content:', pineconeErr.message);
                // Fallback: use first chunk from each valid result directly
                contextChunks = validResults.slice(0, 3).map(r => ({
                    text: r.text.slice(0, 500),
                    url: r.url,
                    title: r.title,
                    score: 1,
                }));
            }
        }

        // If Pinecone retrieved nothing useful, fall back to raw extracts
        if (contextChunks.length === 0 && validResults.length > 0) {
            contextChunks = validResults.slice(0, 3).map(r => ({
                text: r.text.slice(0, 600),
                url: r.url,
                title: r.title,
                score: 1,
            }));
        }

        // ── Step 6: LLM Summarization ─────────────────────────────────────
        const sources = [...new Map(validResults.map(r => [r.url, r])).values()]
            .map(r => ({ url: r.url, title: r.title, snippet: r.snippet }));

        const answer = await summarizeWithGroq(query, contextChunks, sources, history);
        console.log(`✅ Answer generated!\n`);

        const responseData = { answer, sources, mode };
        setCached(cacheKey, responseData);
        return res.json(responseData);

    } catch (error) {
        console.error('❌ Search pipeline error:', error);
        return res.status(500).json({ error: 'Search pipeline failed', details: error.message });
    }
});

export default router;
