// Voice agent — calls Groq directly from the browser using VITE_GROQ_API_KEY
// This means no backend is required for the voice interface to work.

const GROQ_KEY    = import.meta.env.VITE_GROQ_API_KEY || '';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL   || '';

const SYSTEM_PROMPT = `You are KIRA, the intelligent voice assistant for Kenshiki, a geopolitical and news intelligence platform.
You help users navigate the app, read news, search the map, and answer questions.
Current page: {currentPage}
Visible article titles: {articleTitles}

You can call these tools by responding with ONLY a JSON object in this exact format:
{"tool": "navigate_to_page", "args": {"page": "feed|map|article|security|economic|cultural|sports|local"}}
{"tool": "read_news_feed", "args": {"count": 3}}
{"tool": "search_map", "args": {"query": "location name"}}
{"tool": "get_current_page_info", "args": {}}

If no tool is needed, respond naturally as KIRA. Keep responses SHORT (1-2 sentences max). Be friendly and energetic.`;

/**
 * Send a user voice command to Groq and get back either a tool call or text reply.
 */
export const processVoiceCommand = async (
  transcript,
  currentPage = '/app',
  articleTitles = [],
  history = [],
) => {
  const systemMessage = SYSTEM_PROMPT
    .replace('{currentPage}', currentPage)
    .replace('{articleTitles}', articleTitles.slice(0, 10).join('; ') || 'none loaded');

  const messages = [
    { role: 'system', content: systemMessage },
    ...history.slice(-10), // Keep last 10 turns for context
    { role: 'user', content: transcript },
  ];

  // Try direct Groq API first (works everywhere — no backend needed)
  if (GROQ_KEY) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages,
          max_tokens: 150,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`Groq returned ${res.status}`);

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim() || '';

      // Try parsing as a tool call
      if (content.startsWith('{')) {
        try {
          const parsed = JSON.parse(content);
          if (parsed.tool) {
            return { type: 'tool_call', name: parsed.tool, args: parsed.args || {} };
          }
        } catch {
          // Not JSON — treat as text
        }
      }

      return { type: 'text', content };

    } catch (err) {
      if (import.meta.env.DEV) console.warn('[VoiceAgent] Groq direct call failed, trying backend:', err.message);
    }
  }

  // Fallback: try backend proxy (if VITE_BACKEND_URL is set)
  if (BACKEND_URL) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const res = await fetch(`${BACKEND_URL}/api/ai/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, currentPage, articleTitles, history }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`Voice backend returned ${res.status}`);

      const data = await res.json();
      return data;
    } catch (err) {
      if (import.meta.env.DEV) console.error('[VoiceAgent] Backend error:', err);
    }
  }

  // Final fallback: neither Groq key nor backend — show setup message
  if (!GROQ_KEY && !BACKEND_URL) {
    return {
      type: 'text',
      content: "Hey! I'm Kira. Add your Groq API key as VITE_GROQ_API_KEY in your Vercel environment settings to activate me.",
    };
  }

  // Generic error fallback
  const fallbacks = [
    "Oops, something went wrong on my end. Could you try asking again?",
    "I hit a little snag there — sorry! Give me another shot?",
    "There was a connection hiccup. Try again in a sec!",
  ];
  return {
    type: 'text',
    content: fallbacks[Math.floor(Math.random() * fallbacks.length)],
  };
};
