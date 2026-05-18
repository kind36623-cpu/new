// Voice agent — calls Groq directly, optimized for minimal latency.
const GROQ_KEY    = import.meta.env.VITE_GROQ_API_KEY || '';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL   || '';

const SYSTEM_PROMPT = `You are KIRA, a fast AI voice assistant for Kenshiki news intelligence app.
Current page: {currentPage}
Visible headlines: {articleTitles}

RULES:
- Reply in MAX 1-2 SHORT sentences. Never be verbose.
- If the user wants to navigate, read news, or search the map, respond with ONLY valid JSON:
  {"tool":"navigate_to_page","args":{"page":"feed|map|security|economic|cultural|sports|local"}}
  {"tool":"read_news_feed","args":{"count":3}}
  {"tool":"search_map","args":{"query":"location name"}}
  {"tool":"get_current_page_info","args":{}}
- Otherwise reply naturally. Be energetic, concise, and friendly.`;

let currentController = null; // Allow cancellation of in-flight requests

export const cancelPendingVoiceRequest = () => {
  if (currentController) {
    currentController.abort();
    currentController = null;
  }
};

export const processVoiceCommand = async (
  transcript,
  currentPage = '/app',
  articleTitles = [],
  history = [],
) => {
  // Cancel any previous in-flight request immediately
  cancelPendingVoiceRequest();
  currentController = new AbortController();
  const signal = currentController.signal;
  const timeout = setTimeout(() => currentController?.abort(), 8000); // 8s hard timeout

  const systemMessage = SYSTEM_PROMPT
    .replace('{currentPage}', currentPage)
    .replace('{articleTitles}', articleTitles.slice(0, 5).join('; ') || 'none');

  // Only last 4 messages for speed (less tokens = faster)
  const messages = [
    { role: 'system', content: systemMessage },
    ...history.slice(-4),
    { role: 'user', content: transcript },
  ];

  // Direct Groq call (fastest path — no backend hop)
  if (GROQ_KEY) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant', // Fastest Groq model ~200-400ms
          messages,
          max_tokens: 80,   // Short replies = faster
          temperature: 0.6,
          stream: false,
        }),
        signal,
      });
      clearTimeout(timeout);
      currentController = null;

      if (!res.ok) throw new Error(`Groq ${res.status}`);
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim() || '';

      // Check if it's a tool call JSON
      if (content.startsWith('{')) {
        try {
          const parsed = JSON.parse(content);
          if (parsed.tool) return { type: 'tool_call', name: parsed.tool, args: parsed.args || {} };
        } catch { /* not json */ }
      }
      return { type: 'text', content };

    } catch (err) {
      clearTimeout(timeout);
      currentController = null;
      if (err.name === 'AbortError') return null; // Cancelled — don't do anything
      if (import.meta.env.DEV) console.warn('[KIRA] Groq direct failed, trying backend:', err.message);
    }
  }

  // Fallback: backend proxy
  if (BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, currentPage, articleTitles, history: history.slice(-4) }),
      });
      if (!res.ok) throw new Error(`Backend ${res.status}`);
      return await res.json();
    } catch (err) {
      if (import.meta.env.DEV) console.error('[KIRA] Backend error:', err);
    }
  }

  if (!GROQ_KEY && !BACKEND_URL) {
    return { type: 'text', content: "Add VITE_GROQ_API_KEY to your Vercel settings to activate me!" };
  }
  return { type: 'text', content: "Sorry, I had a connection issue. Try again!" };
};
