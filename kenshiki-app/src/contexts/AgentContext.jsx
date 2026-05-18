import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { processVoiceCommand, cancelPendingVoiceRequest } from '../services/voiceAgentService';

const AgentContext = createContext(null);
export function useAgent() { return useContext(AgentContext); }

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

// Prevent GC of active utterances in Chromium
const activeUtterances = [];

export function AgentProvider({ children }) {
  const [isListening, setIsListening]       = useState(false);
  const [isContinuous, setIsContinuous]     = useState(false);
  const [agentStatus, setAgentStatus]       = useState('idle');
  const [lastTranscript, setLastTranscript] = useState('');
  const [lastReply, setLastReply]           = useState('');
  const [interimText, setInterimText]       = useState('');
  const [voiceGender, setVoiceGender]       = useState(() => localStorage.getItem('kira_voice_gender') || 'female');

  const articleTitlesRef    = useRef([]);
  const readArticlesRef     = useRef(new Set());
  const mapSearchHandlerRef = useRef(null);
  const chatHistoryRef      = useRef([]);
  const recognitionRef      = useRef(null);
  const isSpeakingRef       = useRef(false);
  const isContinuousRef     = useRef(false); // sync ref for recognition callbacks

  const navigate  = useNavigate();
  const location  = useLocation();

  const updateReplyAndHistory = useCallback((replyText) => {
    setLastReply(replyText);
    chatHistoryRef.current.push({ role: 'assistant', content: replyText });
    if (chatHistoryRef.current.length > 20) chatHistoryRef.current = chatHistoryRef.current.slice(-20);
  }, []);

  // ── Fast TTS: speak immediately, restart mic when done ─────────────────────
  const speak = useCallback((text, onEndCallback) => {
    window.speechSynthesis.cancel();
    isSpeakingRef.current = true;

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate   = 1.15; // Slightly faster = feels more alive
    utter.pitch  = 1.0;
    utter.volume = 1.0;

    activeUtterances.push(utter);
    if (activeUtterances.length > 5) activeUtterances.shift();

    // Pick best voice
    const voices = window.speechSynthesis.getVoices();
    const gender = localStorage.getItem('kira_voice_gender') || 'female';
    let preferred;
    if (gender === 'female') {
      preferred = voices.find(v => v.name.includes('Aria') && v.name.includes('Natural'))
               || voices.find(v => v.name.includes('Jenny') && v.name.includes('Natural'))
               || voices.find(v => v.name.includes('Google US English'))
               || voices.find(v => v.name.includes('Samantha'))
               || voices.find(v => v.name.includes('Zira'))
               || voices.find(v => v.lang === 'en-US');
    } else {
      preferred = voices.find(v => v.name.includes('Guy') && v.name.includes('Natural'))
               || voices.find(v => v.name.includes('Ryan') && v.name.includes('Natural'))
               || voices.find(v => v.name.includes('Google UK English Male'))
               || voices.find(v => v.name.includes('David'))
               || voices.find(v => v.lang === 'en-US');
    }
    if (preferred) utter.voice = preferred;

    const done = () => {
      isSpeakingRef.current = false;
      setAgentStatus('idle');
      const idx = activeUtterances.indexOf(utter);
      if (idx > -1) activeUtterances.splice(idx, 1);
      if (onEndCallback) onEndCallback();
    };

    utter.onend   = done;
    utter.onerror = (e) => { console.warn('[KIRA] TTS error:', e.error); done(); };

    setAgentStatus('speaking');
    window.speechSynthesis.speak(utter);
  }, []);

  // ── Tool dispatcher ─────────────────────────────────────────────────────────
  const dispatchToolCall = useCallback((name, args) => {
    switch (name) {
      case 'navigate_to_page': {
        const route = PAGE_ROUTES[args.page];
        if (route) {
          navigate(route);
          const reply = `Taking you to ${args.page}!`;
          speak(reply);
          updateReplyAndHistory(reply);
        }
        break;
      }
      case 'read_news_feed': {
        const count = args.count || 3;
        const unread = articleTitlesRef.current.filter(t => !readArticlesRef.current.has(t));
        if (unread.length === 0) {
          const reply = "You're all caught up! Want to explore another section?";
          speak(reply); updateReplyAndHistory(reply);
          return;
        }
        const toRead = unread.slice(0, count);
        toRead.forEach(t => readArticlesRef.current.add(t));
        const reply = toRead.map((t, i) => `${i + 1}: ${t}.`).join(' ');
        speak(reply); updateReplyAndHistory(`Reading ${toRead.length} headlines.`);
        break;
      }
      case 'search_map': {
        if (mapSearchHandlerRef.current) {
          mapSearchHandlerRef.current(args.query);
        } else {
          navigate('/app/map');
          sessionStorage.setItem('agent_pending_map_search', args.query);
        }
        const reply = `Searching the map for ${args.query}!`;
        speak(reply); updateReplyAndHistory(reply);
        break;
      }
      case 'get_current_page_info': {
        const label = PAGE_LABELS[location.pathname] || 'this page';
        const count = articleTitlesRef.current.length;
        const info  = `You're on ${label}.${count > 0 ? ` I see ${count} articles.` : ''}`;
        speak(info); updateReplyAndHistory(info);
        break;
      }
      default:
        speak("Try asking me differently?");
    }
  }, [navigate, location, speak, updateReplyAndHistory]);

  // ── Process voice command ───────────────────────────────────────────────────
  const processCommand = useCallback(async (transcript) => {
    if (!transcript.trim()) return;
    setAgentStatus('thinking');
    setLastTranscript(transcript);
    setInterimText('');
    chatHistoryRef.current.push({ role: 'user', content: transcript });

    const result = await processVoiceCommand(
      transcript, location.pathname,
      articleTitlesRef.current, chatHistoryRef.current,
    );

    if (!result) return; // Cancelled

    if (result.type === 'tool_call') {
      dispatchToolCall(result.name, result.args);
    } else {
      speak(result.content);
      updateReplyAndHistory(result.content);
    }
  }, [location.pathname, dispatchToolCall, speak, updateReplyAndHistory]);

  // ── Continuous SpeechRecognition: always listening, instant restart ─────────
  const startRecognitionSession = useCallback(() => {
    if (!isContinuousRef.current) return;
    if (isSpeakingRef.current) return; // Don't listen while speaking
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.lang             = 'en-US';
    rec.continuous       = false; // One utterance at a time (more reliable cross-browser)
    rec.interimResults   = true;  // Show live text while speaking
    rec.maxAlternatives  = 1;

    rec.onstart = () => {
      setIsListening(true);
      setAgentStatus('listening');
    };

    rec.onresult = (event) => {
      let interim = '';
      let final   = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      if (interim) setInterimText(interim);
      if (final) {
        setInterimText('');
        // Cancel any in-flight request for previous utterance
        cancelPendingVoiceRequest();
        processCommand(final.trim());
      }
    };

    rec.onerror = (event) => {
      setIsListening(false);
      if (event.error === 'not-allowed' || event.error === 'audio-capture' || event.error === 'service-not-allowed') {
        isContinuousRef.current = false;
        setIsContinuous(false);
        setAgentStatus('idle');
        speak("Microphone blocked. Please allow mic access in your browser.");
        return;
      }
      // For no-speech or network errors, just restart silently
      setAgentStatus('idle');
    };

    rec.onend = () => {
      setIsListening(false);
      // Only restart if we're still in continuous mode and not speaking/processing
      if (isContinuousRef.current && !isSpeakingRef.current) {
        setTimeout(() => {
          if (isContinuousRef.current) startRecognitionSession();
        }, 100); // Tiny delay to avoid tight loops
      } else {
        setAgentStatus('idle');
      }
    };

    recognitionRef.current = rec;
    try { rec.start(); } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processCommand, speak]);

  // Restart mic after KIRA finishes speaking
  useEffect(() => {
    if (agentStatus === 'idle' && isContinuous && !isSpeakingRef.current) {
      setTimeout(() => {
        if (isContinuousRef.current && !isSpeakingRef.current) startRecognitionSession();
      }, 150);
    }
  }, [agentStatus, isContinuous, startRecognitionSession]);

  const startListening = useCallback(() => {
    isContinuousRef.current = true;
    startRecognitionSession();
  }, [startRecognitionSession]);

  const stopListening = useCallback(() => {
    isContinuousRef.current = false;
    setIsContinuous(false);
    cancelPendingVoiceRequest();
    window.speechSynthesis.cancel();
    isSpeakingRef.current = false;
    try { recognitionRef.current?.stop(); } catch {}
    setIsListening(false);
    setAgentStatus('idle');
    setInterimText('');
  }, []);

  const toggleAgent = useCallback(() => {
    if (isContinuous || agentStatus !== 'idle') {
      stopListening();
    } else {
      setIsContinuous(true);
      isContinuousRef.current = true;
      const greetings = [
        "Hey! I'm Kira. What can I help with?",
        "Hi, Kira here — go ahead!",
        "Hey! What's up?",
      ];
      const greeting = greetings[Math.floor(Math.random() * greetings.length)];
      updateReplyAndHistory(greeting);
      // Speak greeting, then start mic
      speak(greeting, () => startRecognitionSession());
    }
  }, [isContinuous, agentStatus, stopListening, speak, startRecognitionSession, updateReplyAndHistory]);

  // Load voices on mount
  useEffect(() => {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  const registerArticles  = useCallback((titles) => {
    articleTitlesRef.current = titles || [];
    readArticlesRef.current  = new Set();
  }, []);

  const registerMapSearch = useCallback((handler) => {
    mapSearchHandlerRef.current = handler;
    return () => { mapSearchHandlerRef.current = null; };
  }, []);

  return (
    <AgentContext.Provider value={{
      isListening, agentStatus, lastTranscript, lastReply, interimText,
      toggleAgent, startListening, stopListening,
      registerArticles, registerMapSearch, speak,
      voiceGender, setVoiceGender,
    }}>
      {children}
    </AgentContext.Provider>
  );
}
