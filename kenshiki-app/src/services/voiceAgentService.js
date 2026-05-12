// Voice agent — all Groq calls proxied through backend.
// The GROQ_API_KEY never leaves the server environment.

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

/**
 * Send a user voice command to the backend (Groq) and get back either a
 * tool call or a text reply.
 *
 * @param {string}   transcript     - User's spoken command as text.
 * @param {string}   currentPage    - Current page path e.g. '/app/map'.
 * @param {string[]} articleTitles  - Titles currently visible on screen.
 * @param {object[]} history        - [{role, content}] conversation history.
 * @returns {{ type: 'tool_call', name, args } | { type: 'text', content }}
 */
export const processVoiceCommand = async (
  transcript,
  currentPage = '/app',
  articleTitles = [],
  history = [],
) => {
  // If backend is not configured, return a friendly mock
  if (!BACKEND_URL) {
    if (import.meta.env.DEV) {
      console.warn('[VoiceAgent] No VITE_BACKEND_URL configured. Using mock response.');
    }
    return {
      type: 'text',
      content: "Hey! I'm Kira. Set the VITE_BACKEND_URL environment variable to connect me to the intelligence backend.",
    };
  }

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

    if (!res.ok) {
      throw new Error(`Voice backend returned ${res.status}`);
    }

    const data = await res.json();
    return data; // { type: 'tool_call', name, args } | { type: 'text', content }
  } catch (err) {
    if (import.meta.env.DEV) console.error('[VoiceAgent] Backend error:', err);
    const fallbacks = [
      "Oops, something went wrong on my end. Could you try asking again?",
      "I hit a little snag there — sorry! Give me another shot?",
      "There was a connection hiccup. Try again in a sec!",
    ];
    return {
      type: 'text',
      content: fallbacks[Math.floor(Math.random() * fallbacks.length)],
    };
  }
};
