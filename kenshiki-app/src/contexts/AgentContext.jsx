import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { processVoiceCommand } from '../services/voiceAgentService';

const AgentContext = createContext(null);

export function useAgent() {
  return useContext(AgentContext);
}

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
  '/app':         'the World News Feed',
  '/app/insight': 'the World News Feed',
  '/app/map':     'the Radar Map',
  '/app/article': 'the Article Brief viewer',
  '/app/security':'the Security Intelligence Feed',
  '/app/economic':'the Economic Intelligence Feed',
  '/app/cultural':'the Cultural Intelligence Feed',
  '/app/sports':  'the Sports Feed',
  '/app/local':   'the Local News Feed',
};

export function AgentProvider({ children }) {
  const [isListening, setIsListening]     = useState(false);
  const [isContinuous, setIsContinuous]   = useState(false);
  const [agentStatus, setAgentStatus]     = useState('idle');
  const [lastTranscript, setLastTranscript] = useState('');
  const [lastReply, setLastReply]           = useState('');
  const [voiceGender, setVoiceGender]       = useState(() => localStorage.getItem('kira_voice_gender') || 'female');

  // App state registry — pages register their data here
  const articleTitlesRef = useRef([]);
  const readArticlesRef  = useRef(new Set());
  const mapSearchHandlerRef = useRef(null);
  
  // Conversation History for natural context
  const chatHistoryRef = useRef([]);

  const recognitionRef = useRef(null);
  const navigate       = useNavigate();
  const location       = useLocation();

  // ── Helper to update last reply and chat history ────────────
  const updateReplyAndHistory = useCallback((replyText) => {
    setLastReply(replyText);
    chatHistoryRef.current.push({ role: 'assistant', content: replyText });
    if (chatHistoryRef.current.length > 30) chatHistoryRef.current = chatHistoryRef.current.slice(-30);
  }, []);

  // ── TTS helper ──────────────────────────────────────────────────────────────
  // onEndCallback: optional fn to call after speech finishes
  const speak = useCallback((text, onEndCallback) => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate   = 1.0;
    utter.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const gender = localStorage.getItem('kira_voice_gender') || 'female';

    let preferred;
    if (gender === 'female') {
      utter.pitch = 1.0;
      utter.rate  = 1.05;
      preferred = voices.find(v => v.name.includes('Aria') && v.name.includes('Natural')) ||
                  voices.find(v => v.name.includes('Jenny') && v.name.includes('Natural')) ||
                  voices.find(v => v.name.includes('Google US English')) ||
                  voices.find(v => v.name.includes('Samantha')) ||
                  voices.find(v => v.name.includes('Zira')) ||
                  voices.find(v => (v.name.toLowerCase().includes('female') && v.lang.startsWith('en'))) ||
                  voices.find(v => (v.lang === 'en-US' && !v.localService));
    } else {
      utter.pitch = 1.0;
      utter.rate  = 1.05;
      preferred = voices.find(v => v.name.includes('Guy') && v.name.includes('Natural')) ||
                  voices.find(v => v.name.includes('Ryan') && v.name.includes('Natural')) ||
                  voices.find(v => v.name.includes('Christopher') && v.name.includes('Natural')) ||
                  voices.find(v => v.name.includes('Google UK English Male')) ||
                  voices.find(v => v.name.includes('Mark')) ||
                  voices.find(v => v.name.includes('David')) ||
                  voices.find(v => (v.name.toLowerCase().includes('male') && v.lang.startsWith('en')));
    }
    if (preferred) utter.voice = preferred;

    setAgentStatus('speaking');
    utter.onstart = () => setAgentStatus('speaking');
    utter.onend   = () => {
      setAgentStatus('idle');
      if (onEndCallback) onEndCallback();
    };
    window.speechSynthesis.speak(utter);
  }, []);

  // ── Tool dispatcher ─────────────────────────────────────────────────────────
  const dispatchToolCall = useCallback((name, args) => {
    switch (name) {
      case 'navigate_to_page': {
        const route = PAGE_ROUTES[args.page];
        if (route) {
          navigate(route);
          const phrases = [
            `Sure! Taking you to the ${args.page} page now.`,
            `On it! Heading over to ${args.page}.`,
            `Got it, switching to the ${args.page} section!`,
          ];
          const reply = phrases[Math.floor(Math.random() * phrases.length)];
          speak(reply);
          updateReplyAndHistory(reply);
        } else {
          speak("Hmm, I don't recognize that page. Could you try a different one?");
        }
        break;
      }

      case 'read_news_feed': {
        const count = args.count || 3;
        const unreadTitles = articleTitlesRef.current.filter(t => !readArticlesRef.current.has(t));

        if (unreadTitles.length === 0) {
          if (articleTitlesRef.current.length === 0) {
            speak("Looks like there's nothing loaded on this feed yet. Want me to take you somewhere else?");
            updateReplyAndHistory("Feed is empty.");
          } else {
            speak("You're all caught up on this feed! Nice. Want to explore another section?");
            updateReplyAndHistory("All headlines have been read.");
          }
          return;
        }

        const titlesToRead = unreadTitles.slice(0, count);
        titlesToRead.forEach(t => readArticlesRef.current.add(t));

        const intro = `Here are ${titlesToRead.length} headlines for you. `;
        const body  = titlesToRead.map((t, i) => `Number ${i + 1}: ${t}.`).join(' ');
        speak(intro + body);
        updateReplyAndHistory(`Reading ${titlesToRead.length} headlines.`);
        break;
      }

      case 'search_map': {
        if (mapSearchHandlerRef.current) {
          mapSearchHandlerRef.current(args.query);
          speak(`Searching the map for ${args.query} right now!`);
          updateReplyAndHistory(`Map search: ${args.query}`);
        } else {
          navigate('/app/map');
          speak(`Opening the map and searching for ${args.query}. One sec!`);
          updateReplyAndHistory(`Opening map for: ${args.query}`);
          sessionStorage.setItem('agent_pending_map_search', args.query);
        }
        break;
      }

      case 'get_current_page_info': {
        const label = PAGE_LABELS[location.pathname] || 'this page';
        const count = articleTitlesRef.current.length;
        let info = `You're currently on ${label}.`;
        if (count > 0) info += ` I can see ${count} articles loaded up on screen.`;
        speak(info);
        updateReplyAndHistory(info);
        break;
      }

      default:
        speak("Hmm, I'm not sure how to do that one. Try asking me differently?");
    }
  }, [navigate, location, speak, updateReplyAndHistory]);

  // ── Process transcript through Groq ────────────────────────────────────────
  const processCommand = useCallback(async (transcript) => {
    if (!transcript.trim()) return;

    setAgentStatus('thinking');
    setLastTranscript(transcript);

    // Save user's speech to history
    chatHistoryRef.current.push({ role: 'user', content: transcript });

    const result = await processVoiceCommand(
      transcript,
      location.pathname,
      articleTitlesRef.current,
      chatHistoryRef.current
    );

    if (result.type === 'tool_call') {
      dispatchToolCall(result.name, result.args);
    } else {
      setAgentStatus('speaking');
      speak(result.content);
      updateReplyAndHistory(result.content);
    }
  }, [location.pathname, dispatchToolCall, speak, updateReplyAndHistory]);

  // ── SpeechRecognition setup ─────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    // Prevent double-starting
    if (agentStatus !== 'idle') return;
    setAgentStatus('starting');

    window.speechSynthesis.cancel();
    const recognition = new SpeechRecognition();
    recognition.lang           = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous     = false;

    recognition.onstart = () => {
      setIsListening(true);
      setAgentStatus('listening');
      setLastReply('');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      processCommand(transcript);
    };

    recognition.onerror = (event) => {
      console.error('[Agent] SpeechRecognition error:', event.error);
      setIsListening(false);
      setAgentStatus('idle');
      if (event.error === 'no-speech' && !isContinuous) {
        speak("I didn't quite catch that — could you say it again?");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setAgentStatus((prev) => (prev === 'listening' || prev === 'starting') ? 'idle' : prev);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [processCommand, speak, agentStatus, isContinuous]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    window.speechSynthesis.cancel();
    setIsListening(false);
    setIsContinuous(false);
    setAgentStatus('idle');
  }, []);

  const toggleAgent = useCallback(() => {
    if (isContinuous || agentStatus !== 'idle') {
      stopListening();
    } else {
      setIsContinuous(true);
      const greetings = [
        "Hey there! I'm Kira. What can I help you with?",
        "Hi! Kira here — ask me anything, I'm all ears!",
        "Hello! I'm Kira. What's on your mind?",
        "Hey! Good to hear from you. What do you need?",
        "Hi there! Kira at your service — go ahead!",
      ];
      const greeting = greetings[Math.floor(Math.random() * greetings.length)];
      // After greeting finishes speaking, start listening automatically
      speak(greeting, () => startListening());
      updateReplyAndHistory(greeting);
    }
  }, [isContinuous, agentStatus, stopListening, speak, startListening, updateReplyAndHistory]);

  // Auto-restart listening if continuous mode is active and we're idle
  useEffect(() => {
    if (isContinuous && agentStatus === 'idle') {
      startListening();
    }
  }, [isContinuous, agentStatus, startListening]);

  // ── Public registration APIs for pages ──────────────────────────────────────
  const registerArticles = useCallback((titles) => {
    articleTitlesRef.current = titles || [];
    readArticlesRef.current = new Set(); // Reset read history when new articles are loaded
  }, []);

  const registerMapSearch = useCallback((handler) => {
    mapSearchHandlerRef.current = handler;
    return () => { mapSearchHandlerRef.current = null; };
  }, []);

  // Load voices on mount (Chrome needs this trigger)
  useEffect(() => {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  const value = {
    isListening,
    agentStatus,
    lastTranscript,
    lastReply,
    toggleAgent,
    startListening,
    stopListening,
    registerArticles,
    registerMapSearch,
    speak,
    voiceGender,
    setVoiceGender,
  };

  return (
    <AgentContext.Provider value={value}>
      {children}
    </AgentContext.Provider>
  );
}
