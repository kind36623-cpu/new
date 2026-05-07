import Groq from 'groq-sdk';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';

// ── Tool definitions exposed to the LLM ───────────────────────────────────────
const KENSHIKI_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'navigate_to_page',
      description: 'Navigate the user to a specific page in the Kenshiki app.',
      parameters: {
        type: 'object',
        properties: {
          page: {
            type: 'string',
            enum: ['feed', 'map', 'article', 'security', 'economic', 'cultural', 'sports', 'local'],
            description: 'The destination page slug.',
          },
        },
        required: ['page'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_news_feed',
      description: 'Read the current news headlines aloud to the user.',
      parameters: {
        type: 'object',
        properties: {
          count: {
            type: 'number',
            description: 'How many headlines to read. Defaults to 3.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_map',
      description: 'Search for a location or topic on the Kenshiki radar map.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The location or topic to search on the map.',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_current_page_info',
      description: 'Get information about what is currently on screen.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

const SYSTEM_PROMPT = `You are KIRA — a warm, friendly, and brilliantly smart AI voice assistant built into the Kenshiki intelligence platform.

Your personality:
- You're like a best friend who happens to know everything. Warm, approachable, and genuinely helpful.
- You use casual, natural language. Contractions are fine ("I'm", "don't", "let's", "you'll").
- You're upbeat and positive, but never fake or over-the-top. Just genuinely friendly.
- You have a sense of humor — light jokes or playful remarks are welcome when appropriate.
- You use "you" naturally, not "Operator" or "Sir". Just talk like a real person.
- You express care and empathy when the user seems stressed or curious.

What you can do:
1. ANYTHING a smart friend can help with — science, history, maths, coding, recipes, advice, trivia, jokes, philosophy, movies, music, sports, relationships — you name it, you're there.
2. App-specific tasks: navigate pages, read news headlines, search the map, explain what's on screen.
3. Small talk, chit-chat, "how are you" type questions — just be natural and fun!
4. Answer questions about current events (using the headlines context provided).

Rules:
- For app actions (navigate, read news, search map, describe screen) — USE THE TOOLS. Don't just talk about it.
- For everything else — just talk naturally and helpfully. No need for tools.
- Keep responses conversational and spoken-word friendly. Avoid bullet lists, markdown, asterisks, or formatting symbols — you're speaking out loud, not writing an email.
- Keep answers reasonably concise for voice — aim for 2-4 sentences for simple questions, a bit longer only if truly needed.
- NEVER say you "can't" answer something because it's off-topic. You can always try to help.
- If you genuinely don't know something, be honest but friendly: "Hmm, I'm not totally sure on that one, but here's what I think..."
- Don't start every response the same way. Vary your openers naturally.`;

/**
 * Send a user voice command to Groq and get back either a tool call or a text reply.
 * @param {string} transcript - The user's spoken command as text.
 * @param {string} currentPage - The current page path (e.g. '/map').
 * @param {string[]} articleTitles - Titles of currently loaded articles.
 * @param {object[]} history - Array of previous chat messages [{role, content}].
 * @returns {{ type: 'tool_call', name: string, args: object } | { type: 'text', content: string }}
 */
export const processVoiceCommand = async (transcript, currentPage = '/', articleTitles = [], history = []) => {
  if (!GROQ_API_KEY) {
    console.warn('[VoiceAgent] No Groq API key. Using mock response.');
    return { type: 'text', content: "Hey! I'm Kira. I'd love to help, but I need a Groq API key to work properly. Could you check the app settings?" };
  }

  const groq = new Groq({ apiKey: GROQ_API_KEY, dangerouslyAllowBrowser: true });

  const pageLabels = {
    '/':         'the World News Feed',
    '/insight':  'the World News Feed',
    '/map':      'the Radar Map',
    '/article':  'the Article Brief viewer',
    '/security': 'the Security Intelligence Feed',
    '/economic': 'the Economic Intelligence Feed',
    '/cultural': 'the Cultural Intelligence Feed',
    '/sports':   'the Sports Feed',
    '/local':    'the Local News Feed',
  };

  const contextMessage = [
    `Context: The user is on ${pageLabels[currentPage] || currentPage}.`,
    articleTitles.length > 0
      ? `Current headlines visible on screen: ${articleTitles.slice(0, 8).join(' | ')}.`
      : 'No headlines are loaded on screen right now.',
    `Current time: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.`,
  ].join(' ');

  try {
    // Trim history to keep context window sane — keep last 20 exchanges
    const trimmedHistory = history.slice(-20);

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: contextMessage },
      ...trimmedHistory,
      { role: 'user', content: transcript },
    ];

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      tools: KENSHIKI_TOOLS,
      tool_choice: 'auto',
      temperature: 0.7,   // More natural, conversational
      max_tokens: 1024,   // Enough for detailed answers
    });

    const choice = completion.choices[0];
    const message = choice.message;

    // Tool call requested by the model
    if (message.tool_calls && message.tool_calls.length > 0) {
      const tc = message.tool_calls[0];
      return {
        type: 'tool_call',
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments || '{}'),
      };
    }

    // Plain text reply
    const content = message.content?.trim() || "I'm not quite sure how to help with that, but feel free to ask me anything else!";
    return { type: 'text', content };

  } catch (err) {
    console.error('[VoiceAgent] Groq error:', err);
    const fallbacks = [
      "Oops, something went wrong on my end. Could you try asking again?",
      "I hit a little snag there — sorry! Give me another shot?",
      "There was a connection hiccup. Try again in a sec!"
    ];
    return { type: 'text', content: fallbacks[Math.floor(Math.random() * fallbacks.length)] };
  }
};
