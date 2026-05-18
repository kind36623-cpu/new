import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { processVoiceCommand, cancelPendingVoiceRequest } from '../services/voiceAgentService';

const AgentContext = createContext(null);
export function useAgent() { return useContext(AgentContext); }

// ── Local keyword shortcuts (NO API needed — instant response) ─────────────
const LOCAL_COMMANDS = [
  { patterns: ['sports','sport','football','cricket','basketball'],     tool: 'navigate_to_page', args: { page: 'sports' } },
  { patterns: ['local','local news','my area','nearby'],               tool: 'navigate_to_page', args: { page: 'local' } },
  { patterns: ['security','threat','military','defense'],              tool: 'navigate_to_page', args: { page: 'security' } },
  { patterns: ['economic','economy','finance','market','business'],    tool: 'navigate_to_page', args: { page: 'economic' } },
  { patterns: ['cultural','culture','art','entertainment'],            tool: 'navigate_to_page', args: { page: 'cultural' } },
  { patterns: ['world','global','world news','home','feed'],           tool: 'navigate_to_page', args: { page: 'feed' } },
  { patterns: ['map','radar','location','show map'],                   tool: 'navigate_to_page', args: { page: 'map' } },
  { patterns: ['read news','read headlines','what\'s the news','headlines','read me'], tool: 'read_news_feed', args: { count: 3 } },
  { patterns: ['where am i','current page','what page'],              tool: 'get_current_page_info', args: {} },
  { patterns: ['stop','quit','exit','goodbye','bye'],                  tool: 'stop', args: {} },
];

function matchLocalCommand(transcript) {
  const lower = transcript.toLowerCase().trim();
  for (const cmd of LOCAL_COMMANDS) {
    if (cmd.patterns.some(p => lower.includes(p))) return cmd;
  }
  return null;
}

const PAGE_ROUTES = {
  feed: '/app/insight', map: '/app/map', article: '/app/article',
  security: '/app/security', economic: '/app/economic', cultural: '/app/cultural',
  sports: '/app/sports', local: '/app/local',
};
const PAGE_LABELS = {
  '/app': 'World News', '/app/insight': 'World News', '/app/map': 'Radar Map',
  '/app/article': 'Article Brief', '/app/security': 'Security Feed',
  '/app/economic': 'Economic Feed', '/app/cultural': 'Cultural Feed',
  '/app/sports': 'Sports Feed', '/app/local': 'Local News Feed',
};

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

  // All control flags as refs to avoid stale closures in recognition callbacks
  const stateRef = useRef({
    isContinuous: false,
    isSpeaking: false,
    isProcessing: false,
  });

  const navigate = useNavigate();
  const location = useLocation();

  const updateReplyAndHistory = useCallback((replyText) => {
    setLastReply(replyText);
    chatHistoryRef.current.push({ role: 'assistant', content: replyText });
    if (chatHistoryRef.current.length > 16) chatHistoryRef.current = chatHistoryRef.current.slice(-16);
  }, []);

  // ── TTS ────────────────────────────────────────────────────────────────────
  const speak = useCallback((text, onEndCallback) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    stateRef.current.isSpeaking = true;
    setAgentStatus('speaking');

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate   = 1.1;
    utter.pitch  = 1.0;
    utter.volume = 1.0;
    activeUtterances.push(utter);
    if (activeUtterances.length > 5) activeUtterances.shift();

    const voices = window.speechSynthesis.getVoices();
    const gender = localStorage.getItem('kira_voice_gender') || 'female';
    let preferred;
    if (gender === 'female') {
      preferred = voices.find(v => /aria.*natural/i.test(v.name))
               || voices.find(v => /jenny.*natural/i.test(v.name))
               || voices.find(v => v.name === 'Google US English')
               || voices.find(v => v.name.includes('Samantha'))
               || voices.find(v => v.lang === 'en-US');
    } else {
      preferred = voices.find(v => /guy.*natural/i.test(v.name))
               || voices.find(v => /ryan.*natural/i.test(v.name))
               || voices.find(v => v.name.includes('Google UK English Male'))
               || voices.find(v => v.lang === 'en-US');
    }
    if (preferred) utter.voice = preferred;

    const done = () => {
      stateRef.current.isSpeaking = false;
      setAgentStatus('idle');
      const i = activeUtterances.indexOf(utter);
      if (i > -1) activeUtterances.splice(i, 1);
      if (onEndCallback) onEndCallback();
    };
    utter.onend = done;
    utter.onerror = () => done();
    window.speechSynthesis.speak(utter);
  }, []);

  // ── Dispatch tool calls ─────────────────────────────────────────────────────
  // Using a ref to dispatch so recognition callbacks always have the latest version
  const navigateRef = useRef(navigate);
  const locationRef = useRef(location);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);
  useEffect(() => { locationRef.current = location; }, [location]);

  const dispatchToolCall = useCallback((tool, args) => {
    switch (tool) {
      case 'navigate_to_page': {
        const route = PAGE_ROUTES[args.page];
        if (route) {
          navigateRef.current(route);
          const reply = `Going to ${args.page}!`;
          speak(reply); updateReplyAndHistory(reply);
        }
        break;
      }
      case 'read_news_feed': {
        const unread = articleTitlesRef.current.filter(t => !readArticlesRef.current.has(t));
        if (unread.length === 0) {
          speak("All caught up! Want to switch to another feed?");
          updateReplyAndHistory("All read.");
          return;
        }
        const toRead = unread.slice(0, args.count || 3);
        toRead.forEach(t => readArticlesRef.current.add(t));
        const reply = `Here are ${toRead.length} headlines. ` + toRead.map((t, i) => `${i + 1}: ${t}.`).join(' ');
        speak(reply); updateReplyAndHistory(`Reading ${toRead.length} headlines.`);
        break;
      }
      case 'search_map': {
        if (mapSearchHandlerRef.current) mapSearchHandlerRef.current(args.query);
        else { navigateRef.current('/app/map'); sessionStorage.setItem('agent_pending_map_search', args.query); }
        const reply = `Searching for ${args.query}!`;
        speak(reply); updateReplyAndHistory(reply);
        break;
      }
      case 'get_current_page_info': {
        const label = PAGE_LABELS[locationRef.current.pathname] || 'this page';
        const cnt   = articleTitlesRef.current.length;
        const info  = `You're on ${label}.${cnt > 0 ? ` ${cnt} articles loaded.` : ''}`;
        speak(info); updateReplyAndHistory(info);
        break;
      }
      case 'stop':
        stopListeningRef.current?.();
        break;
      default:
        speak("I'm not sure how to do that. Try saying 'go to sports' or 'read headlines'.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speak, updateReplyAndHistory]);

  // ── Process transcript ─────────────────────────────────────────────────────
  const processCommand = useCallback(async (transcript) => {
    if (!transcript?.trim()) return;
    stateRef.current.isProcessing = true;
    setAgentStatus('thinking');
    setLastTranscript(transcript);
    setInterimText('');

    // 1. Try instant local keyword matching first (zero latency)
    const localCmd = matchLocalCommand(transcript);
    if (localCmd) {
      stateRef.current.isProcessing = false;
      chatHistoryRef.current.push({ role: 'user', content: transcript });
      dispatchToolCall(localCmd.tool, localCmd.args);
      return;
    }

    // 2. Fall back to Groq for natural language
    chatHistoryRef.current.push({ role: 'user', content: transcript });
    const result = await processVoiceCommand(
      transcript, locationRef.current.pathname,
      articleTitlesRef.current, chatHistoryRef.current
    );
    stateRef.current.isProcessing = false;

    if (!result) return; // Cancelled
    if (result.type === 'tool_call') {
      dispatchToolCall(result.name, result.args);
    } else {
      speak(result.content);
      updateReplyAndHistory(result.content);
    }
  }, [dispatchToolCall, speak, updateReplyAndHistory]);

  // ── Recognition — uses refs, not closures, to avoid stale state ───────────
  const processCommandRef = useRef(processCommand);
  useEffect(() => { processCommandRef.current = processCommand; }, [processCommand]);

  const startRecognition = useCallback(() => {
    if (!stateRef.current.isContinuous) return;
    if (stateRef.current.isSpeaking || stateRef.current.isProcessing) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition not supported. Use Chrome or Edge.'); return; }

    // Stop any existing session cleanly
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    const rec = new SR();
    rec.lang             = 'en-US';
    rec.continuous       = false;
    rec.interimResults   = true;
    rec.maxAlternatives  = 1;
    recognitionRef.current = rec;

    rec.onstart  = () => { setIsListening(true); setAgentStatus('listening'); };
    rec.onspeechstart = () => setAgentStatus('listening');

    rec.onresult = (event) => {
      let interim = '', final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      if (interim) setInterimText(interim);
      if (final.trim()) {
        setInterimText('');
        cancelPendingVoiceRequest();
        processCommandRef.current(final.trim());
      }
    };

    rec.onerror = (e) => {
      setIsListening(false);
      console.warn('[KIRA] Mic error:', e.error);
      if (e.error === 'not-allowed' || e.error === 'audio-capture' || e.error === 'service-not-allowed') {
        stateRef.current.isContinuous = false;
        setIsContinuous(false);
        setAgentStatus('idle');
        speak('Microphone blocked. Please allow microphone access in your browser settings, then try again.');
        return;
      }
      setAgentStatus('idle');
      // Restart after brief delay for recoverable errors (no-speech, network, etc.)
      if (stateRef.current.isContinuous) {
        setTimeout(() => startRecognition(), 300);
      }
    };

    rec.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      if (stateRef.current.isContinuous && !stateRef.current.isSpeaking && !stateRef.current.isProcessing) {
        setAgentStatus('idle');
        setTimeout(() => startRecognition(), 120);
      }
    };

    try { rec.start(); } catch (e) { console.warn('[KIRA] rec.start() error:', e); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speak]);

  // Restart mic when idle (e.g. after speaking)
  useEffect(() => {
    if (agentStatus === 'idle' && stateRef.current.isContinuous && !stateRef.current.isSpeaking && !stateRef.current.isProcessing) {
      const t = setTimeout(() => startRecognition(), 200);
      return () => clearTimeout(t);
    }
  }, [agentStatus, startRecognition]);

  // Keep a ref to stopListening so dispatchToolCall can call it
  const stopListeningRef = useRef(null);
  const stopListening = useCallback(() => {
    stateRef.current.isContinuous  = false;
    stateRef.current.isSpeaking    = false;
    stateRef.current.isProcessing  = false;
    setIsContinuous(false);
    cancelPendingVoiceRequest();
    window.speechSynthesis.cancel();
    try { recognitionRef.current?.abort(); } catch {}
    recognitionRef.current = null;
    setIsListening(false);
    setAgentStatus('idle');
    setInterimText('');
  }, []);
  useEffect(() => { stopListeningRef.current = stopListening; }, [stopListening]);

  const toggleAgent = useCallback(() => {
    if (stateRef.current.isContinuous || agentStatus !== 'idle') {
      stopListening();
    } else {
      stateRef.current.isContinuous = true;
      setIsContinuous(true);
      const greetings = ["Hey! I'm Kira. What can I help with?", "Hi! Kira here. Go ahead!", "Hey! What do you need?"];
      const greeting = greetings[Math.floor(Math.random() * greetings.length)];
      updateReplyAndHistory(greeting);
      speak(greeting, () => startRecognition());
    }
  }, [agentStatus, stopListening, speak, startRecognition, updateReplyAndHistory]);

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
      toggleAgent, startListening: startRecognition, stopListening,
      registerArticles, registerMapSearch, speak,
      voiceGender, setVoiceGender,
    }}>
      {children}
    </AgentContext.Provider>
  );
}
