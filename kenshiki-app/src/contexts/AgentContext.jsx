/**
 * AgentContext — KIRA Voice Interface
 *
 * State Machine (single source of truth via useReducer):
 *
 *   IDLE ──[toggleAgent]──► GREETING (TTS plays)
 *   GREETING ──[tts_end]──► LISTENING (mic starts)
 *   LISTENING ──[speech]──► PROCESSING (mic stops, API call)
 *   PROCESSING ──[reply]──► SPEAKING (TTS plays)
 *   SPEAKING ──[tts_end]──► LISTENING (mic starts again)
 *   ANY ──[stopAgent]──► IDLE
 *
 * Rules:
 * - The mic ONLY starts from: tts_end callback after GREETING or SPEAKING.
 * - The mic NEVER auto-restarts from onend — only from TTS completion.
 * - All side-effects (mic, TTS) are triggered imperatively inside handlers.
 * - No useEffect watching state to drive transitions.
 */

import React, { createContext, useContext, useReducer, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { processVoiceCommand, cancelPendingVoiceRequest } from '../services/voiceAgentService';

/* ─── Context ───────────────────────────────────────────────────────── */
const AgentContext = createContext(null);
export const useAgent = () => useContext(AgentContext);

/* ─── State Machine ─────────────────────────────────────────────────── */
const INITIAL_STATE = {
  phase: 'idle',          // idle | listening | processing | speaking
  lastTranscript: '',
  lastReply: '',
  interimText: '',
  voiceGender: typeof window !== 'undefined'
    ? (localStorage.getItem('kira_voice_gender') || 'female')
    : 'female',
};

function reducer(state, action) {
  switch (action.type) {
    case 'START_LISTENING':
      return { ...state, phase: 'listening', interimText: '' };
    case 'INTERIM':
      return { ...state, interimText: action.text };
    case 'GOT_TRANSCRIPT':
      return { ...state, phase: 'processing', lastTranscript: action.text, interimText: '' };
    case 'GOT_REPLY':
      return { ...state, phase: 'speaking', lastReply: action.text };
    case 'DONE_SPEAKING':
      return { ...state, phase: 'listening' };
    case 'STOP':
      return { ...state, phase: 'idle', interimText: '' };
    case 'SET_VOICE_GENDER':
      return { ...state, voiceGender: action.gender };
    default:
      return state;
  }
}

/* ─── Navigation mappings ───────────────────────────────────────────── */
const PAGE_ROUTES = {
  feed:     '/app/insight',
  map:      '/app/map',
  article:  '/app/article',
  security: '/app/security',
  economic: '/app/economic',
  cultural: '/app/cultural',
  sports:   '/app/sports',
  local:    '/app/local',
};
const PAGE_LABELS = {
  '/app':           'World News',
  '/app/insight':   'World News',
  '/app/map':       'Radar Map',
  '/app/article':   'Article Brief',
  '/app/security':  'Security Feed',
  '/app/economic':  'Economic Feed',
  '/app/cultural':  'Cultural Feed',
  '/app/sports':    'Sports Feed',
  '/app/local':     'Local News Feed',
};

/* ─── Local keyword shortcuts (zero latency, no API) ───────────────── */
const LOCAL_COMMANDS = [
  { patterns: ['sports','sport','football','cricket','basketball'],    tool: 'navigate_to_page', args: { page: 'sports'   } },
  { patterns: ['local','local news','my area','nearby'],              tool: 'navigate_to_page', args: { page: 'local'    } },
  { patterns: ['security','threat','military','defense'],             tool: 'navigate_to_page', args: { page: 'security' } },
  { patterns: ['economic','economy','finance','market','business'],   tool: 'navigate_to_page', args: { page: 'economic' } },
  { patterns: ['cultural','culture','art','entertainment'],           tool: 'navigate_to_page', args: { page: 'cultural' } },
  { patterns: ['world','global','world news','home','feed'],          tool: 'navigate_to_page', args: { page: 'feed'     } },
  { patterns: ['map','radar','location','show map'],                  tool: 'navigate_to_page', args: { page: 'map'      } },
  { patterns: ['brief','article','analysis','deep dive','summary'],   tool: 'navigate_to_page', args: { page: 'article'  } },
  { patterns: ['read news','read headlines','headlines','read me',"what's the news"], tool: 'read_news_feed', args: { count: 3 } },
  { patterns: ['where am i','current page','what page'],             tool: 'get_current_page_info', args: {} },
  { patterns: ['stop','quit','exit','goodbye','bye'],                 tool: 'stop', args: {} },
];

function matchLocalCommand(text) {
  const lower = text.toLowerCase().trim();
  for (const cmd of LOCAL_COMMANDS) {
    if (cmd.patterns.some(p => lower.includes(p))) return cmd;
  }
  return null;
}

/* ─── TTS helper ────────────────────────────────────────────────────── */
function pickVoice(gender) {
  const voices = window.speechSynthesis.getVoices();
  if (gender === 'female') {
    return (
      voices.find(v => /aria.*natural/i.test(v.name))     ||
      voices.find(v => /jenny.*natural/i.test(v.name))    ||
      voices.find(v => v.name === 'Google US English')     ||
      voices.find(v => v.name.includes('Samantha'))        ||
      voices.find(v => v.lang === 'en-US')
    );
  }
  return (
    voices.find(v => /guy.*natural/i.test(v.name))             ||
    voices.find(v => /ryan.*natural/i.test(v.name))            ||
    voices.find(v => v.name.includes('Google UK English Male')) ||
    voices.find(v => v.lang === 'en-US')
  );
}

/* ─── Provider ──────────────────────────────────────────────────────── */
export function AgentProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const navigate          = useNavigate();
  const location          = useLocation();

  // Stable refs — updated on every render so callbacks never go stale
  const navigateRef       = useRef(navigate);
  const locationRef       = useRef(location);
  const stateRef          = useRef(state);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);
  useEffect(() => { locationRef.current = location; }, [location]);
  useEffect(() => { stateRef.current    = state;    }, [state]);

  // Data refs (don't need to trigger re-renders)
  const chatHistoryRef      = useRef([]);
  const articleTitlesRef    = useRef([]);
  const fullArticlesRef     = useRef([]);
  const readArticlesRef     = useRef(new Set());
  const mapSearchHandlerRef = useRef(null);

  // Recognition ref
  const recognitionRef = useRef(null);

  // Flag: are we in a continuous session?
  const activeRef = useRef(false);

  /* ── Preload voices on mount ──────────────────────────────────────── */
  useEffect(() => {
    window.speechSynthesis.getVoices();
    if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  /* ── TTS: speak text, call onDone when finished ───────────────────── */
  const speakText = useCallback((text, onDone) => {
    if (!text) { onDone?.(); return; }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utter        = new SpeechSynthesisUtterance(text);
    utter.rate         = 1.05;
    utter.pitch        = 1.0;
    utter.volume       = 1.0;
    const gender       = localStorage.getItem('kira_voice_gender') || 'female';
    const voice        = pickVoice(gender);
    if (voice) utter.voice = voice;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearInterval(watchdog);
      onDone?.();
    };

    // Chrome stall watchdog: resume if paused (known Chrome bug)
    const watchdog = setInterval(() => {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    }, 4000);

    utter.onend   = finish;
    utter.onerror = (e) => {
      // 'interrupted' fires when we call cancel() — safe to ignore
      if (e.error !== 'interrupted') console.warn('[KIRA TTS]', e.error);
      finish();
    };

    window.speechSynthesis.speak(utter);
  }, []);

  /* ── Start a single mic session ───────────────────────────────────── */
  const startMic = useCallback(() => {
    if (!activeRef.current) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('Speech recognition is not supported. Please use Chrome or Edge.');
      return;
    }

    // Clean up any lingering session
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
      recognitionRef.current = null;
    }

    const rec          = new SR();
    rec.lang           = 'en-US';
    rec.continuous     = false;   // single-shot is far more reliable in Chrome
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    recognitionRef.current = rec;

    let finalSent = false; // ensure we only process one final result per session

    rec.onstart = () => dispatch({ type: 'START_LISTENING' });

    rec.onresult = (event) => {
      if (finalSent) return;
      let interim = '';
      let final   = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else                          interim += t;
      }
      if (interim) dispatch({ type: 'INTERIM', text: interim });
      if (final.trim()) {
        finalSent = true;
        dispatch({ type: 'GOT_TRANSCRIPT', text: final.trim() });
        processTranscript(final.trim());
      }
    };

    rec.onerror = (e) => {
      console.warn('[KIRA mic]', e.error);
      if (e.error === 'not-allowed' || e.error === 'audio-capture' || e.error === 'service-not-allowed') {
        activeRef.current = false;
        dispatch({ type: 'STOP' });
        speakText('Microphone access was blocked. Please allow microphone access in your browser settings.');
        return;
      }
      // Recoverable (no-speech, aborted) — restart mic if still active
      if (activeRef.current) {
        setTimeout(startMic, 300);
      }
    };

    rec.onend = () => {
      recognitionRef.current = null;
      // Only restart if active AND no final transcript was sent yet (i.e. no-speech)
      // If finalSent=true, processTranscript() will restart after it's done.
      if (activeRef.current && !finalSent) {
        setTimeout(startMic, 200);
      }
    };

    try { rec.start(); }
    catch (e) { console.warn('[KIRA] rec.start():', e.message); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speakText]);

  /* ── Dispatch a tool call from KIRA ──────────────────────────────── */
  const execTool = useCallback((tool, args) => {
    switch (tool) {
      case 'navigate_to_page': {
        const route = PAGE_ROUTES[args.page];
        if (!route) break;
        if (args.page === 'article') {
          const art = fullArticlesRef.current[0] || (() => {
            try { return JSON.parse(localStorage.getItem('kenshiki_saved_articles') || '[]')[0]; } catch { return null; }
          })();
          if (art) {
            navigateRef.current(route, { state: { article: art } });
            return `Opening: ${art.title}`;
          }
          navigateRef.current('/app');
          return "I couldn't find any loaded articles. Going to the news feed instead.";
        }
        navigateRef.current(route);
        return `Going to ${args.page}!`;
      }
      case 'read_news_feed': {
        const unread = articleTitlesRef.current.filter(t => !readArticlesRef.current.has(t));
        if (!unread.length) return "All caught up! Want to switch to another feed?";
        const toRead = unread.slice(0, args.count || 3);
        toRead.forEach(t => readArticlesRef.current.add(t));
        return `Here are ${toRead.length} headlines. ` + toRead.map((t, i) => `${i + 1}: ${t}.`).join(' ');
      }
      case 'search_map': {
        if (mapSearchHandlerRef.current) {
          mapSearchHandlerRef.current(args.query);
        } else {
          navigateRef.current('/app/map');
          sessionStorage.setItem('agent_pending_map_search', args.query);
        }
        return `Searching for ${args.query} on the map!`;
      }
      case 'get_current_page_info': {
        const label = PAGE_LABELS[locationRef.current.pathname] || 'this page';
        const cnt   = articleTitlesRef.current.length;
        return `You're on ${label}.${cnt > 0 ? ` ${cnt} articles loaded.` : ''}`;
      }
      case 'stop':
        return '__STOP__';
      default:
        return "I'm not sure how to do that. Try saying 'go to sports' or 'read headlines'.";
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Process a transcript: local → API ────────────────────────────── */
  const processTranscript = useCallback(async (text) => {
    if (!activeRef.current) return;

    // Add to history
    chatHistoryRef.current.push({ role: 'user', content: text });
    if (chatHistoryRef.current.length > 16) chatHistoryRef.current = chatHistoryRef.current.slice(-16);

    // 1. Try local keyword match first (instant)
    const localCmd = matchLocalCommand(text);
    let replyText;

    if (localCmd) {
      const result = execTool(localCmd.tool, localCmd.args);
      if (result === '__STOP__') { stopAgent(); return; }
      replyText = result || "Done!";
    } else {
      // 2. Call Groq / backend
      const result = await processVoiceCommand(
        text,
        locationRef.current.pathname,
        articleTitlesRef.current,
        chatHistoryRef.current,
      );

      if (!result) {
        // Request was cancelled (user stopped) — don't restart mic
        if (activeRef.current) { dispatch({ type: 'STOP' }); activeRef.current = false; }
        return;
      }

      if (result.type === 'tool_call') {
        const toolResult = execTool(result.name, result.args);
        if (toolResult === '__STOP__') { stopAgent(); return; }
        replyText = toolResult || "Done!";
      } else {
        replyText = result.content || "I'm not sure how to help with that.";
      }
    }

    // Save assistant reply to history
    chatHistoryRef.current.push({ role: 'assistant', content: replyText });

    if (!activeRef.current) return; // Stopped while processing

    // Dispatch speaking state, then speak and restart mic when done
    dispatch({ type: 'GOT_REPLY', text: replyText });
    speakText(replyText, () => {
      if (!activeRef.current) return;
      dispatch({ type: 'DONE_SPEAKING' });
      setTimeout(startMic, 200); // Brief pause before mic reopens
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execTool, speakText, startMic]);

  /* ── Stop everything ─────────────────────────────────────────────── */
  const stopAgent = useCallback(() => {
    activeRef.current = false;
    cancelPendingVoiceRequest();
    window.speechSynthesis.cancel();
    try { recognitionRef.current?.abort(); } catch (_) {}
    recognitionRef.current = null;
    dispatch({ type: 'STOP' });
  }, []);

  /* ── Toggle KIRA on/off ──────────────────────────────────────────── */
  const toggleAgent = useCallback(() => {
    if (activeRef.current || stateRef.current.phase !== 'idle') {
      stopAgent();
      return;
    }

    activeRef.current = true;
    const greetings = [
      "Hey! I'm Kira. What can I help with?",
      "Hi, Kira here! Go ahead.",
      "Hey! What do you need?",
    ];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    chatHistoryRef.current = []; // Fresh history each session

    // Push a "speaking" phase visually while greeting plays
    dispatch({ type: 'GOT_REPLY', text: greeting });
    speakText(greeting, () => {
      if (!activeRef.current) return;
      dispatch({ type: 'DONE_SPEAKING' });
      setTimeout(startMic, 200);
    });
  }, [stopAgent, speakText, startMic]);

  /* ── Public speak() for external use ────────────────────────────── */
  const speak = useCallback((text, onDone) => {
    speakText(text, onDone);
  }, [speakText]);

  /* ── Article / Map registration ─────────────────────────────────── */
  const registerArticles = useCallback((articles) => {
    fullArticlesRef.current  = articles || [];
    articleTitlesRef.current = (articles || []).map(a => (typeof a === 'string' ? a : a.title)).filter(Boolean);
    readArticlesRef.current  = new Set();
  }, []);

  const registerMapSearch = useCallback((handler) => {
    mapSearchHandlerRef.current = handler;
    return () => { mapSearchHandlerRef.current = null; };
  }, []);

  /* ── Voice gender setter ─────────────────────────────────────────── */
  const setVoiceGender = useCallback((gender) => {
    localStorage.setItem('kira_voice_gender', gender);
    dispatch({ type: 'SET_VOICE_GENDER', gender });
  }, []);

  return (
    <AgentContext.Provider value={{
      // State
      phase:          state.phase,
      isListening:    state.phase === 'listening',
      isContinuous:   activeRef.current,
      agentStatus:    state.phase,           // alias for HUD compatibility
      lastTranscript: state.lastTranscript,
      lastReply:      state.lastReply,
      interimText:    state.interimText,
      voiceGender:    state.voiceGender,
      // Actions
      toggleAgent,
      stopListening: stopAgent,
      speak,
      registerArticles,
      registerMapSearch,
      setVoiceGender,
    }}>
      {children}
    </AgentContext.Provider>
  );
}
