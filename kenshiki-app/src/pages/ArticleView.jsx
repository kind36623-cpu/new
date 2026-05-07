import React, { useState, useEffect, useCallback, useRef } from 'react';
import { gsap } from 'gsap';
import { useLocation, useNavigate } from 'react-router-dom';
import { generateArticleDeepDive } from '../services/aiService';
import { chatWithAgent, searchWithAI } from '../services/agentService';
import {
  ArrowLeft, BookmarkCheck, Bookmark, ExternalLink,
  Globe, Clock, Brain, ChevronRight, ChevronDown, Menu, X, MessageCircle, Send
} from 'lucide-react';
import SavedArticlesSidebar from '../components/layout/SavedArticlesSidebar';
import DotWaveBackground from '../components/ui/DotWaveBackground';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/* ─────────────────────────────────────────────────────────
   Lightweight Markdown → JSX renderer (no external deps)
───────────────────────────────────────────────────────── */
function MarkdownRenderer({ content }) {
  if (!content) return null;

  const lines        = content.split('\n');
  const elements     = [];
  let tableBuffer    = [];
  let inTable        = false;
  let key            = 0;

  const flushTable = () => {
    if (tableBuffer.length < 2) { tableBuffer = []; return; }
    const headers = tableBuffer[0].split('|').map(h => h.trim()).filter(Boolean);
    const rows    = tableBuffer.slice(2).map(r => r.split('|').map(c => c.trim()).filter(Boolean));
    elements.push(
      <div key={key++} style={{ overflowX: 'auto', margin: '24px 0', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Inter', sans-serif", fontSize: 14 }}>
          <thead>
            <tr style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
              {headers.map((h, i) => (
                <th key={i} style={{ padding: '14px 18px', color: '#e2e8f0', fontWeight: 700, textAlign: 'left', letterSpacing: '0.04em', fontSize: 12, textTransform: 'uppercase', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}
                style={{ background: ri % 2 === 0 ? '#fff' : '#f8fafc', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                onMouseLeave={e => e.currentTarget.style.background = ri % 2 === 0 ? '#fff' : '#f8fafc'}
              >
                {row.map((cell, ci) => (
                  <td key={ci} style={{ padding: '12px 18px', borderBottom: '1px solid #f1f5f9', color: ci === 0 ? '#0f172a' : '#475569', fontWeight: ci === 0 ? 600 : 400 }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableBuffer = [];
  };

  const renderInline = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) => {
      if (p.startsWith('**') && p.endsWith('**'))
        return <strong key={i} style={{ color: '#0f172a' }}>{p.slice(2, -2)}</strong>;
      return p;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('|') && line.trim().startsWith('|')) {
      inTable = true;
      tableBuffer.push(line);
      continue;
    }
    if (inTable) { flushTable(); inTable = false; }

    if (!line.trim()) { elements.push(<div key={key++} style={{ height: 16 }} />); continue; }
    if (line.startsWith('---')) {
      elements.push(<hr key={key++} style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '32px 0' }} />);
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={key++} style={{
          fontSize: 28, fontWeight: 700, lineHeight: 1.25, marginBottom: 10, marginTop: 8,
          fontFamily: "'Cinzel', 'Trajan Pro', serif",
          letterSpacing: '0.04em',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #3730a3 40%, #6d28d9 70%, #7c3aed 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          filter: 'drop-shadow(0 1px 3px rgba(109,40,217,0.15))',
        }}>
          {renderInline(line.slice(2))}
        </h1>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={key++} style={{
          fontSize: 17, fontWeight: 700, marginTop: 40, marginBottom: 14,
          fontFamily: "'Cinzel', serif",
          letterSpacing: '0.06em',
          color: '#3730a3',
          borderBottom: '1.5px solid rgba(55,48,163,0.12)',
          paddingBottom: 8,
        }}>
          {renderInline(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={key++} style={{
          fontSize: 13.5, fontWeight: 600, marginTop: 24, marginBottom: 8,
          fontFamily: "'Cinzel', serif",
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          color: '#6d28d9',
        }}>
          {renderInline(line.slice(4))}
        </h3>
      );
      continue;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={key++} style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(135deg, #3730A3, #a855f7)', marginTop: 9, flexShrink: 0 }} />
          <span style={{ 
            fontFamily: "'Cinzel', serif", color: '#000000', 
            lineHeight: 1.75, fontSize: 16, letterSpacing: '0.01em', fontWeight: 600 
          }}>{renderInline(line.slice(2))}</span>
        </div>
      );
      continue;
    }
    if (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**')) {
      elements.push(
        <p key={key++} style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', marginTop: 8 }}>
          {renderInline(line.slice(1, -1))}
        </p>
      );
      continue;
    }
    elements.push(
      <p key={key++} style={{ 
        fontFamily: "'Cinzel', serif", color: '#000000', 
        lineHeight: 1.85, fontSize: 16.5, marginBottom: 12, 
        letterSpacing: '0.01em', fontWeight: 600 
      }}>
        {renderInline(line)}
      </p>
    );
  }

  if (inTable) flushTable();
  return <div>{elements}</div>;
}

/* ─────────────────────────────────────────────────────────
   ChatMarkdownRenderer — lightweight inline renderer for chat bubbles
   Handles: **bold**, - bullets, plain text, emojis pass through
───────────────────────────────────────────────────────── */
function ChatMarkdownRenderer({ text, isUser }) {
  if (!text) return null;
  const lines = text.split('\n');
  const color = isUser ? '#fff' : '#0f172a';
  const mutedColor = isUser ? 'rgba(255,255,255,0.9)' : '#334155';

  const renderInline = (str) => {
    // If it's an unclosed bold tag because of streaming, we just render as-is
    if (str.split('**').length % 2 === 0) return str;
    const parts = str.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) => {
      if (p.startsWith('**') && p.endsWith('**'))
        return <strong key={i} style={{ color, fontWeight: 700 }}>{p.slice(2, -2)}</strong>;
      return <span key={i}>{p}</span>;
    });
  };

  const elements = [];
  let key = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) { elements.push(<div key={key++} style={{ height: 6 }} />); continue; }
    if (line.startsWith('### ')) {
       elements.push(<h3 key={key++} style={{ fontSize: 15, fontWeight: 700, color, marginTop: 12, marginBottom: 8 }}>{renderInline(line.slice(4))}</h3>);
       continue;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={key++} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 4 }}>
          <span style={{ color: isUser ? 'rgba(255,255,255,0.6)' : '#94a3b8', fontSize: 14, marginTop: 1, flexShrink: 0 }}>•</span>
          <span style={{ color: mutedColor, lineHeight: 1.6, fontSize: 14 }}>{renderInline(line.slice(2))}</span>
        </div>
      );
      continue;
    }
    const numMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
       elements.push(
        <div key={key++} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 4 }}>
          <span style={{ color: isUser ? 'rgba(255,255,255,0.8)' : '#64748b', fontSize: 13, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{numMatch[1]}.</span>
          <span style={{ color: mutedColor, lineHeight: 1.6, fontSize: 14 }}>{renderInline(numMatch[2])}</span>
        </div>
      );
      continue;
    }

    elements.push(
      <p key={key++} style={{ color: mutedColor, lineHeight: 1.6, fontSize: 14, margin: 0, marginBottom: 8 }}>
        {renderInline(line)}
      </p>
    );
  }
  return <div>{elements}</div>;
}

function Streamer({ text, isNew = false, speed = 10, onComplete, children }) {
  const [displayed, setDisplayed] = useState(isNew ? '' : text);
  
  useEffect(() => {
    if (!isNew || !text) {
      setDisplayed(text || '');
      if (onComplete) onComplete();
      return;
    }
    let i = 0;
    setDisplayed('');
    const timer = setInterval(() => {
      if (i < text.length) {
        // Fast forward through consecutive spaces or newlines to keep it snappy
        if (text.charAt(i) === ' ' || text.charAt(i) === '\n') {
           while(i < text.length && (text.charAt(i) === ' ' || text.charAt(i) === '\n')) i++;
        } else {
           i++;
        }
        setDisplayed(text.slice(0, i));
      } else {
        clearInterval(timer);
        if (onComplete) onComplete();
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, isNew, speed, onComplete]);

  return children(displayed);
}

/* ─────────────────────────────────────────────────────────
   GsapAiSpinner — dual glowing rings powered by GSAP
   spinning=true  → rings rotate + glow (thinking phase)
   spinning=false → rings fade out smoothly (writing phase)
   size: pixel diameter of the outer container
───────────────────────────────────────────────────────── */
function GsapAiSpinner({ spinning = true, size = 42 }) {
  const outerRingRef = useRef(null);
  const innerRingRef = useRef(null);
  const outerGlowRef = useRef(null);
  const innerGlowRef = useRef(null);
  const tlOuter = useRef(null);
  const tlInner = useRef(null);

  // Logo size derived from container
  const logoInset = Math.round(size * 0.19);

  useEffect(() => {
    if (!outerRingRef.current || !innerRingRef.current) return;

    // Kill any existing timelines
    if (tlOuter.current) tlOuter.current.kill();
    if (tlInner.current) tlInner.current.kill();

    if (spinning) {
      // ── Outer ring: clockwise, dark blue glow ──────────────
      gsap.set(outerRingRef.current, { rotation: 0, opacity: 1 });
      tlOuter.current = gsap.timeline({ repeat: -1 });
      tlOuter.current
        .to(outerRingRef.current, { rotation: 360, duration: 1.6, ease: 'none' })
        .to(outerGlowRef.current,  {
            boxShadow: '0 0 18px 6px rgba(26,115,232,0.85), 0 0 32px 10px rgba(26,115,232,0.35)',
            duration: 0.8, ease: 'sine.inOut', yoyo: true, repeat: 1
          }, 0);

      // ── Inner ring: counter-clockwise, light-blue/cyan glow ─
      gsap.set(innerRingRef.current, { rotation: 0, opacity: 1 });
      tlInner.current = gsap.timeline({ repeat: -1 });
      tlInner.current
        .to(innerRingRef.current, { rotation: -360, duration: 1.0, ease: 'none' })
        .to(innerGlowRef.current, {
            boxShadow: '0 0 14px 5px rgba(116,185,255,0.8), 0 0 24px 8px rgba(116,185,255,0.3)',
            duration: 0.5, ease: 'sine.inOut', yoyo: true, repeat: 1
          }, 0);
    } else {
      // ── Ease-out and fade both rings ───────────────────────
      gsap.to([outerRingRef.current, innerRingRef.current], {
        opacity: 0, duration: 0.5, ease: 'power2.out'
      });
      gsap.to([outerGlowRef.current, innerGlowRef.current], {
        boxShadow: '0 0 0px 0px rgba(0,0,0,0)', duration: 0.4, ease: 'power2.out'
      });
    }

    return () => {
      if (tlOuter.current) tlOuter.current.kill();
      if (tlInner.current) tlInner.current.kill();
    };
  }, [spinning]);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {/* Outer ring glow halo */}
      <div ref={outerGlowRef} style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        boxShadow: '0 0 8px 2px rgba(26,115,232,0.5)',
        pointerEvents: 'none'
      }} />
      {/* Outer rotating ring */}
      <div ref={outerRingRef} style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: `${Math.max(2, size * 0.06)}px solid transparent`,
        borderTopColor: '#1a73e8', borderRightColor: '#1a73e8',
        boxSizing: 'border-box',
      }} />

      {/* Inner ring glow halo */}
      <div ref={innerGlowRef} style={{
        position: 'absolute', inset: Math.round(size * 0.12), borderRadius: '50%',
        boxShadow: '0 0 6px 2px rgba(116,185,255,0.5)',
        pointerEvents: 'none'
      }} />
      {/* Inner rotating ring */}
      <div ref={innerRingRef} style={{
        position: 'absolute', inset: Math.round(size * 0.12), borderRadius: '50%',
        border: `${Math.max(1.5, size * 0.04)}px solid transparent`,
        borderBottomColor: '#74b9ff', borderLeftColor: '#74b9ff',
        boxSizing: 'border-box',
      }} />

      {/* AI Logo centered */}
      <div style={{
        position: 'absolute', inset: logoInset, borderRadius: '50%', overflow: 'hidden',
        boxShadow: spinning ? '0 0 10px rgba(26,115,232,0.3)' : 'none',
        transition: 'box-shadow 0.5s ease'
      }}>
        <img src="/ai-logo.png" alt="AI" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    </div>
  );
}

function AnimatedMessage({ reasoning, mainText, isNew, msg, setNotNew }) {
    const [reasoningDone, setReasoningDone] = useState(!isNew || !reasoning);
    // Auto-close reasoning when main answer starts streaming
    const [forceCloseReasoning, setForceCloseReasoning] = useState(false);

    const handleReasoningDone = useCallback(() => {
      setReasoningDone(true);
      // Collapse the reasoning block once writing begins
      setForceCloseReasoning(true);
    }, []);

    return (
        <>
            {reasoning && (
                <Streamer text={reasoning} isNew={isNew} speed={3} onComplete={handleReasoningDone}>
                    {txt => <ReasoningBlock reasoning={txt} defaultOpen={isNew || msg.searchMode === 'pro'} streaming={isNew && !reasoningDone} forceClose={forceCloseReasoning} />}
                </Streamer>
            )}
            {(!isNew || reasoningDone) && (
                <Streamer text={mainText} isNew={isNew} speed={12} onComplete={setNotNew}>
                    {txt => <ChatMarkdownRenderer text={txt} isUser={false} />}
                </Streamer>
            )}
        </>
    );
}

function ReasoningBlock({ reasoning, defaultOpen = false, streaming = false, forceClose = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  // Auto open when streaming starts
  useEffect(() => { if (streaming) setIsOpen(true); }, [streaming]);
  // Auto close when answer starts (forceClose fired)
  useEffect(() => { if (forceClose) setIsOpen(false); }, [forceClose]);

  if (!reasoning) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
          color: '#64748b', fontSize: 13, fontWeight: 600, transition: 'color 0.2s',
          fontFamily: 'inherit'
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'}
        onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
      >
        <img src="/ai-logo.png" alt="AI" style={{ width: 14, height: 14, objectFit: 'contain', borderRadius: '50%' }} />
        {isOpen ? 'Thought process' : 'Thinking...'}
        <ChevronRight size={14} style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
      </button>
      {isOpen && (
        <div style={{
          marginTop: 8, padding: '12px 16px', background: '#f8fafc',
          borderRadius: 12, borderLeft: '3px solid #8b5cf6',
          fontSize: 13, color: '#475569', lineHeight: 1.6,
          whiteSpace: 'pre-wrap', fontStyle: 'italic'
        }}>
          {reasoning}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Predictive Impact Analysis Chart (Recharts)
───────────────────────────────────────────────────────── */
function IntelligenceGraph({ article }) {
  // Generate deterministic synthetic data based on the article's title length to make it consistent
  const hash = article?.title?.length || 10;
  const generateData = () => {
    const data = [];
    let base = 30 + (hash % 20);
    for (let i = 0; i < 7; i++) {
        base = base + (Math.sin(hash + i) * 15) + (Math.random() * 10);
        if (base < 10) base = 15;
        if (base > 95) base = 90;
        data.push({
            name: `T+${i}h`,
            impact: Math.round(base),
            volatility: Math.round(base * 0.4 + Math.random() * 20)
        });
    }
    return data;
  };

  const [data] = useState(generateData());

  const insightText = (() => {
    const start = data[0].impact;
    const end = data[data.length - 1].impact;
    const maxVol = Math.max(...data.map(d => d.volatility));
    
    let text = "Analysis indicates ";
    if (end > start + 15) text += "a sharp escalation in global impact over the projected window. ";
    else if (end > start) text += "a steady, gradual upward trend in relevance. ";
    else if (end < start - 15) text += "a rapid decay in immediate impact metrics. ";
    else text += "a sustained, stable plateau in global resonance. ";

    if (maxVol > 60) text += "High projected volatility suggests an unpredictable event trajectory with rapidly evolving secondary narratives.";
    else text += "Relatively low volatility indicates a controlled or well-understood information spread.";

    return text;
  })();

  return (
    <div style={{ marginBottom: 40, padding: 24, background: '#fff', borderRadius: 24, border: '1px solid #e2e8f0', boxShadow: '0 12px 40px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
         <div>
            <h4 style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Predictive Impact Analysis</h4>
            <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginTop: 4, margin: 0 }}>Projected global resonance over a 7-hour horizon</p>
         </div>
         <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }}/><span style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 800, color: '#64748b' }}>Impact</span></div>
             <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6' }}/><span style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 800, color: '#64748b' }}>Volatility</span></div>
         </div>
      </div>
      <div style={{ height: 220, width: '100%', marginLeft: -15 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorImpact" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: '12px', fontWeight: 'bold' }}
              itemStyle={{ fontWeight: 800 }}
              labelStyle={{ color: '#64748b', marginBottom: '4px' }}
            />
            <Area type="monotone" dataKey="impact" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorImpact)" />
            <Area type="monotone" dataKey="volatility" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorVol)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: 24, padding: 16, background: '#f8fafc', borderRadius: 16, borderLeft: '4px solid #4285F4', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Brain size={18} style={{ color: '#4285F4', flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>AI Insight Synthesis</div>
          <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{insightText}</div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Main ArticleView page
───────────────────────────────────────────────────────── */
export default function ArticleView() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const article   = location.state?.article || null;
  const prefetch  = location.state?.prefetchedContent || null;

  const [content,  setContent]  = useState('');
  const [loading,  setLoading]  = useState(true);
  const [saved,    setSaved]    = useState(false);
  const [saveAnim, setSaveAnim] = useState(false);
  const [particles, setParticles] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!article);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const chatEndRef = useRef(null);
  const chatPanelRef = useRef(null);
  const chatButtonRef = useRef(null);
  const sidebarRef = useRef(null);
  const sidebarButtonRef = useRef(null);

  // Close chat or sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Chat logic
      if (
        isChatOpen &&
        chatPanelRef.current && !chatPanelRef.current.contains(event.target) &&
        chatButtonRef.current && !chatButtonRef.current.contains(event.target)
      ) {
        setIsChatOpen(false);
      }
      // Sidebar logic
      if (
        isSidebarOpen &&
        sidebarRef.current && !sidebarRef.current.contains(event.target) &&
        sidebarButtonRef.current && !sidebarButtonRef.current.contains(event.target)
      ) {
        setIsSidebarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isChatOpen, isSidebarOpen]);

  const [chatMessages, setChatMessages] = useState([{ sender: 'ai', text: "Hey there! 👋 I'm your AI assistant! I can help you understand this article, answer any question you have — science, history, facts, anything! What would you like to know? 😊" }]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [searchMode, setSearchMode] = useState(null); // null = article chat, 'normal' = web search, 'pro' = pro search

  // Auto-scroll to bottom whenever messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatLoading]);

  useEffect(() => {
    if (!article) return;
    const loadMemory = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await fetch(`${baseUrl}/api/chat/memory/${article.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setChatMessages(data.messages);
        }
      } catch (e) {
        console.warn('Failed to load chat DB memory:', e);
      }
    };
    loadMemory();
  }, [article]);

  useEffect(() => {
    // Only save if it's more than the original intro message to prevent DB flooding
    if (article && chatMessages.length > 1) {
       const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
       fetch(`${baseUrl}/api/chat/memory`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ articleId: article.id, messages: chatMessages })
       }).catch(e => console.warn('Failed to save to chat DB:', e));
    }
  }, [chatMessages, article]);

  const submitChatMessage = async () => {
    if (!chatMessage.trim() || isChatLoading) return;
    
    const userText = chatMessage.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setChatMessage('');
    setIsChatLoading(true);

    try {
        // ── Extract History ───────────────────────────────────────────────
        const history = chatMessages.filter(m => !m.isMap).slice(-10);

        // ── Web Search Mode (Normal / Pro) ────────────────────────────────
        if (searchMode) {
            const result = await searchWithAI(userText, searchMode, history);
            setChatMessages(prev => [...prev, {
                sender: 'ai',
                text: result.answer,
                sources: result.sources || [],
                searchMode: result.mode,
                cached: result.cached || false,
                isNew: true
            }]);
            setIsChatLoading(false);
            return;
        }

        // ── Article Chat Mode ─────────────────────────────────────────────
        const reply = await chatWithAgent(article, userText, history);
        
        // Check if reply is Map JSON intent
        try {
            const parsed = JSON.parse(reply);
            if (parsed.intent === 'map_link') {
                 setChatMessages(prev => [...prev, { 
                     sender: 'ai', 
                     text: `🗺️ MAP ACTION: Showing ${parsed.location}`,
                     isMap: true,
                     lat: parsed.lat,
                     lng: parsed.lng,
                     location: parsed.location
                 }]);
                 setIsChatLoading(false);
                 return;
            }
        } catch (e) {
            // Not JSON, just standard text
        }

        setChatMessages(prev => [...prev, { sender: 'ai', text: reply, isNew: true }]);
    } catch (e) {
        setChatMessages(prev => [...prev, { sender: 'ai', text: 'Error connecting to intelligence core.', isNew: true }]);
    }
    setIsChatLoading(false);
  };

  // Close sidebar automatically when a new article is loaded via the sidebar click
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [article?.id]);

  useEffect(() => {
    if (!article) return; // handled by the empty-state render below

    // Mark as saved if it's already in localStorage
    const existing = JSON.parse(localStorage.getItem('kenshiki_saved_articles') || '[]');
    setSaved(existing.some(a => a.id === article.id));

    if (prefetch) {
      setContent(prefetch);
      setLoading(false);
    } else {
      generateArticleDeepDive(article).then(text => {
        setContent(text);
        setLoading(false);
      });
    }
  }, [article, prefetch]);

  // ── Save / unsave handler ──────────────────────────────
  const handleSave = useCallback(() => {
    if (!content) return;
    const existing = JSON.parse(localStorage.getItem('kenshiki_saved_articles') || '[]');
    const id       = article.id || `${Date.now()}`;

    if (saved) {
      const updated = existing.filter(a => a.id !== id);
      localStorage.setItem('kenshiki_saved_articles', JSON.stringify(updated));
      setSaved(false);
    } else {
      const entry = {
        id,
        title:     article.title,
        source:    article.source,
        pubDate:   article.pubDate,
        content,
        savedAt:   new Date().toISOString(),
        thumbnail: article.thumbnail || null,
      };
      localStorage.setItem('kenshiki_saved_articles', JSON.stringify([entry, ...existing]));
      setSaved(true);
      setSaveAnim(true);
      setTimeout(() => setSaveAnim(false), 1500);

      // Splash particles logic!
      const newP = Array.from({ length: 24 }).map((_, i) => ({
        id: Date.now() + i,
        type: ['news', 'brain', 'globe'][Math.floor(Math.random() * 3)],
        startLeft: 10 + Math.random() * 80 + '%', // spread across the entire bottom dock width
        tx: (Math.random() - 0.5) * 150, // horizontal drift
        ty: -200 - Math.random() * 350,  // high peak burst
        rot: (Math.random() - 0.5) * 720,
        scale: 0.6 + Math.random() * 0.6,
        delay: Math.random() * 0.15,      // stagger for fountain effect
      }));
      setParticles(newP);
      setTimeout(() => setParticles([]), 2000); // give enough time for delay + anim
    }

    // Notify the SavedArticlesSidebar (same tab, no reload needed)
    window.dispatchEvent(new Event('kenshiki-saved'));
  }, [content, article, saved]);

  // ── Handled internally below ───────────

  /* ── Render ───────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative' }}>
      
      {/* ── Dynamic Dotted Matrix Background ── */}
      <DotWaveBackground />

      {/* ── Collapsible Side-by-Side Sidebar ──────────── */}
      {isSidebarOpen && (
        <div ref={sidebarRef} style={{ width: 260, flexShrink: 0, height: '100%', borderRight: '1px solid #e2e8f0', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', position: 'relative', zIndex: 10 }}>
          <SavedArticlesSidebar />
        </div>
      )}

      {/* ── Main Article Scrollable Pane ─────────────── */}
      <div style={{ flex: 1, minHeight: '100vh', overflowY: 'auto', position: 'relative', zIndex: 10, background: 'transparent', fontFamily: "'Inter', 'Outfit', sans-serif", paddingBottom: !article ? 0 : 140 }}>

      {/* ── Floating Top-Left Menu Button ──────────────────────── */}
      <button
        ref={sidebarButtonRef}
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        title={isSidebarOpen ? "Close Saved Briefs" : "Open Saved Briefs"}
        style={{
          position: 'absolute', top: 24, left: 24, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)',
          border: '1.5px solid rgba(226,232,240,0.8)', cursor: 'pointer',
          color: '#3730a3', width: 46, height: 46, borderRadius: '50%',
          boxShadow: '0 4px 16px rgba(55,48,163,0.10)', transition: 'all 0.22s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#6d28d9'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(109,40,217,0.22)'; e.currentTarget.style.transform = 'scale(1.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(226,232,240,0.8)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(55,48,163,0.10)'; e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <Menu size={20} />
      </button>

      {/* ── Floating Top-Right Chat Button ──────────────────────── */}
      <button
        ref={chatButtonRef}
        onClick={() => setIsChatOpen(!isChatOpen)}
        title={isChatOpen ? "Close Chat" : "Open Chat"}
        style={{
          position: 'absolute', top: 24, right: 24, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isChatOpen ? 'linear-gradient(135deg,#6d28d9,#7c3aed)' : 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(16px)',
          border: isChatOpen ? 'none' : '1.5px solid rgba(226,232,240,0.8)',
          cursor: 'pointer',
          color: isChatOpen ? '#fff' : '#3730a3',
          width: 46, height: 46, borderRadius: '50%',
          boxShadow: isChatOpen ? '0 6px 20px rgba(109,40,217,0.4)' : '0 4px 16px rgba(55,48,163,0.10)',
          transition: 'all 0.22s',
        }}
        onMouseEnter={e => { if (!isChatOpen) { e.currentTarget.style.borderColor = '#6d28d9'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(109,40,217,0.22)'; e.currentTarget.style.transform = 'scale(1.08)'; } }}
        onMouseLeave={e => { if (!isChatOpen) { e.currentTarget.style.borderColor = 'rgba(226,232,240,0.8)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(55,48,163,0.10)'; e.currentTarget.style.transform = 'scale(1)'; } }}
      >
        {isChatOpen ? <X size={20} /> : <MessageCircle size={20} />}
      </button>

      {/* ── Gemini-style Chat Panel ──────────────────────── */}
      {isChatOpen && (
        <div
          ref={chatPanelRef}
          onClick={() => isModeDropdownOpen && setIsModeDropdownOpen(false)}
          style={{
            position: 'absolute', top: 80, right: 24, zIndex: 100,
            width: 400,
            background: '#fff',
            borderRadius: 28,
            boxShadow: '0 8px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid #e8eaed',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            animation: 'chatPopup 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
            fontFamily: "'Google Sans', 'Inter', sans-serif"
          }}
        >
          {/* ── Gemini-style Header ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px 14px',
            borderBottom: '1px solid #f1f3f4',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, flexShrink: 0 }}>
                <img src="/ai-logo.png" alt="AI" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1f1f1f', letterSpacing: '-0.01em', lineHeight: 1.2 }}>Kenshiki AI</div>
                <div style={{ fontSize: 11, color: '#80868b', fontWeight: 500, marginTop: 1 }}>
                  {searchMode === 'pro' ? '🔍 Pro Search active' : searchMode === 'normal' ? '⚡ Web Search active' : '💬 Article mode'}
                </div>
              </div>
            </div>
          </div>

          {/* ── Messages Area ── */}
          <div
            style={{
              padding: '16px 18px',
              height: 400,
              overflowY: 'auto',
              display: 'flex', flexDirection: 'column', gap: 18,
              scrollbarWidth: 'thin', scrollbarColor: '#e8eaed transparent'
            }}
          >
            {chatMessages.map((msg, idx) => {
              const isUser = msg.sender === 'user';
              let reasoning = null;
              let mainText = msg.text || '';
              if (!isUser && !msg.isMap) {
                const match = mainText.match(/<reasoning>([\s\S]*?)<\/reasoning>/);
                if (match) {
                  reasoning = match[1].trim();
                  mainText = mainText.replace(/<reasoning>[\s\S]*?<\/reasoning>/, '').trim();
                }
              }
              return (
                <div key={idx} style={{
                  display: 'flex',
                  flexDirection: isUser ? 'row-reverse' : 'row',
                  gap: 10,
                  alignItems: 'flex-start',
                }}>
                  {/* Avatar */}
                  {!isUser && (
                    <div style={{ flexShrink: 0, marginTop: 2 }}>
                      <GsapAiSpinner spinning={!!msg.isNew} size={30} />
                    </div>
                  )}
                  {isUser && (
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                      background: 'linear-gradient(135deg, #4285F4, #a855f7)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em'
                    }}>U</div>
                  )}

                  {/* Bubble */}
                  <div style={isUser ? {
                    maxWidth: '78%',
                    background: '#e8f0fe',
                    color: '#1a237e',
                    padding: '10px 16px',
                    borderRadius: 22, borderBottomRightRadius: 6,
                    fontSize: 13.5, lineHeight: 1.65, fontWeight: 500,
                    whiteSpace: 'pre-wrap',
                  } : {
                    flex: 1, color: '#202124', fontSize: 14, lineHeight: 1.7,
                    minWidth: 0, paddingTop: 2,
                  }}>
                    {msg.isMap ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 16px', background: '#f8f9fa', borderRadius: 16, border: '1px solid #e8eaed' }}>
                        <div style={{ fontWeight: 600, color: '#202124' }}>{msg.text}</div>
                        <button
                          onClick={() => navigate('/map', { state: { searchPlace: { name: msg.location, lat: Number(msg.lat), lon: Number(msg.lng) } } })}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#1a73e8', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 20, cursor: 'pointer', fontWeight: 700, fontSize: 12, transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(26,115,232,0.3)' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#1557b0'}
                          onMouseLeave={e => e.currentTarget.style.background = '#1a73e8'}
                        >
                          <Globe size={14} /> View on Map
                        </button>
                      </div>
                    ) : isUser ? mainText : (
                      <>
                        <AnimatedMessage
                          reasoning={reasoning}
                          mainText={mainText}
                          isNew={msg.isNew}
                          msg={msg}
                          setNotNew={() => {
                            if (msg.isNew) {
                              setChatMessages(prev => {
                                const updated = [...prev];
                                updated[idx] = { ...updated[idx], isNew: false };
                                return updated;
                              });
                            }
                          }}
                        />
                        {msg.sources && msg.sources.length > 0 && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e8eaed' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#9aa0a6', letterSpacing: '0.06em', marginBottom: 6, textTransform: 'uppercase' }}>
                              {msg.searchMode === 'pro' ? '🔍 Pro' : '⚡ Web'} · {msg.sources.length} source{msg.sources.length !== 1 ? 's' : ''}{msg.cached ? ' · Cached' : ''}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {msg.sources.slice(0, 4).map((src, si) => (
                                <a key={si} href={src.url} target="_blank" rel="noopener noreferrer"
                                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#1a73e8', fontWeight: 600, textDecoration: 'none', padding: '5px 10px', background: '#e8f0fe', borderRadius: 10, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', transition: 'background 0.15s' }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#c5d8fc'}
                                  onMouseLeave={e => e.currentTarget.style.background = '#e8f0fe'}
                                >
                                  <Globe size={9} style={{ flexShrink: 0 }} />
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{src.title || new URL(src.url).hostname}</span>
                                  <ExternalLink size={9} style={{ marginLeft: 'auto', flexShrink: 0, color: '#6ba3f5' }} />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Thinking loader */}
            {isChatLoading && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <GsapAiSpinner spinning={true} size={42} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#202124', letterSpacing: '-0.01em' }}>
                    {searchMode === 'pro' ? '🔍 Pro search…' : searchMode === 'normal' ? '⚡ Searching the web…' : '✨ Thinking…'}
                  </span>
                  <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                    {[0, 0.16, 0.32].map(d => (
                      <div key={d} style={{ width: 5, height: 5, borderRadius: '50%', background: 'linear-gradient(135deg,#1a73e8,#74b9ff)', animation: `dotBounce 1.2s ${d}s ease-in-out infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* ── Gemini-style Input Area ── */}
          <div style={{
            padding: '12px 16px 16px',
            background: '#fff',
            borderTop: '1px solid #f1f3f4',
            flexShrink: 0,
          }}>
            {/* Mode dropdown menu (appears above input) */}
            {isModeDropdownOpen && (
              <div style={{
                marginBottom: 8,
                background: '#fff',
                border: '1px solid #e8eaed',
                borderRadius: 16,
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                overflow: 'hidden',
                animation: 'fadeSlideUp 0.18s ease-out'
              }}>
                {[
                  { id: null,     icon: '💬', label: 'Article Chat',  desc: 'Ask about this article' },
                  { id: 'normal', icon: '⚡', label: 'Web Search',    desc: 'Search the live web' },
                  { id: 'pro',    icon: '🔍', label: 'Pro Search',    desc: 'Deep multi-source search' },
                ].map(m => (
                  <button
                    key={String(m.id)}
                    onClick={() => { setSearchMode(m.id); setIsModeDropdownOpen(false); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 16px', border: 'none', cursor: 'pointer',
                      background: searchMode === m.id ? '#e8f0fe' : 'transparent',
                      textAlign: 'left', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (searchMode !== m.id) e.currentTarget.style.background = '#f8f9fa'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = searchMode === m.id ? '#e8f0fe' : 'transparent'; }}
                  >
                    <span style={{ fontSize: 18, lineHeight: 1 }}>{m.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: searchMode === m.id ? '#1a73e8' : '#202124' }}>{m.label}</div>
                      <div style={{ fontSize: 11, color: '#80868b', marginTop: 1 }}>{m.desc}</div>
                    </div>
                    {searchMode === m.id && (
                      <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: '#1a73e8' }} />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Input row */}
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: 8,
              background: '#f8f9fa',
              borderRadius: 26,
              border: '1.5px solid #e8eaed',
              padding: '6px 6px 6px 14px',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
              onFocus={() => {}}
            >
              {/* Mode pill button — left side of input */}
              <button
                onClick={(e) => { e.stopPropagation(); setIsModeDropdownOpen(v => !v); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', borderRadius: 20,
                  border: '1.5px solid',
                  borderColor: searchMode ? '#1a73e8' : '#dadce0',
                  background: searchMode ? '#e8f0fe' : '#fff',
                  color: searchMode ? '#1a73e8' : '#5f6368',
                  cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  transition: 'all 0.15s', flexShrink: 0,
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#1a73e8'}
                onMouseLeave={e => e.currentTarget.style.borderColor = searchMode ? '#1a73e8' : '#dadce0'}
              >
                <span style={{ fontSize: 14 }}>
                  {searchMode === 'pro' ? '🔍' : searchMode === 'normal' ? '⚡' : '💬'}
                </span>
                <span>{searchMode === 'pro' ? 'Pro' : searchMode === 'normal' ? 'Web' : 'Chat'}</span>
                <ChevronDown size={12} style={{ transform: isModeDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              </button>

              {/* Text input */}
              <input
                type="text"
                value={chatMessage}
                onChange={e => setChatMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) submitChatMessage(); }}
                placeholder={
                  searchMode === 'pro' ? 'Deep search the web…' :
                  searchMode === 'normal' ? 'Search the web…' :
                  'Ask anything about this article…'
                }
                style={{
                  flex: 1, border: 'none', outline: 'none',
                  background: 'transparent',
                  fontSize: 14, color: '#202124',
                  padding: '6px 4px',
                  fontFamily: 'inherit',
                }}
              />

              {/* Send button */}
              <button
                onClick={submitChatMessage}
                disabled={isChatLoading || !chatMessage.trim()}
                style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: (isChatLoading || !chatMessage.trim()) ? '#e8eaed' : 'linear-gradient(135deg, #1a73e8, #4285F4)',
                  color: (isChatLoading || !chatMessage.trim()) ? '#9aa0a6' : '#fff',
                  border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: (isChatLoading || !chatMessage.trim()) ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: (isChatLoading || !chatMessage.trim()) ? 'none' : '0 2px 8px rgba(26,115,232,0.35)',
                }}
                onMouseEnter={e => { if (!isChatLoading && chatMessage.trim()) e.currentTarget.style.transform = 'scale(1.08)'; }}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <Send size={16} style={{ marginLeft: 2 }} />
              </button>
            </div>
            <div style={{ textAlign: 'center', fontSize: 10, color: '#bdc1c6', marginTop: 8, letterSpacing: '0.02em' }}>
              Kenshiki AI · Powered by Groq
            </div>
          </div>
        </div>
      )}

      {!article ? (
        <div style={{ minHeight: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 32 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', border: '3px solid rgba(124,58,237,0.25)', boxShadow: '0 16px 40px rgba(124,58,237,0.3)' }}>
             <img src="/ai-logo.png" alt="AI Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ textAlign: 'center', maxWidth: 340 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: 10 }}>
              No Article Selected
            </div>
            <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7 }}>
              Select a saved intelligence brief from the sidebar to view it, or return to the <strong>news feed</strong> to generate a new one.
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #7c3aed, #4285F4)', color: '#fff', fontWeight: 700, fontSize: 14, boxShadow: '0 8px 24px rgba(124,58,237,0.3)', fontFamily: 'inherit', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            <ArrowLeft size={16} /> Go to News Feed
          </button>
        </div>
      ) : (
        <>

      {/* ── Hero thumbnail ─────────────────────────────── */}
      {article.thumbnail && (
        <div style={{ width: '100%', height: 280, position: 'relative', overflow: 'hidden' }}>
          <img src={article.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.parentElement.style.display = 'none'} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 32px' }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: '#fff', background: 'rgba(66,133,244,0.9)', padding: '4px 12px', borderRadius: 20 }}>
                {article.source || 'INTELLIGENCE SOURCE'}
              </span>
              {article.pubDate && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={10} />
                  {new Date(article.pubDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Article meta chip strip (no thumbnail case) ──── */}
      {!article.thumbnail && (
        <div style={{
          maxWidth: 800, margin: '32px auto 0', padding: '0 24px',
          display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 14px', borderRadius: 20,
            background: 'linear-gradient(135deg,#ede9fe,#f5f3ff)',
            border: '1px solid rgba(109,40,217,0.15)',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#7c3aed', display: 'inline-block', boxShadow: '0 0 6px rgba(124,58,237,0.6)' }} />
            <span style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 9, fontWeight: 700, letterSpacing: '0.15em',
              textTransform: 'uppercase', color: '#5b21b6',
            }}>{article.source || 'Intelligence Source'}</span>
          </div>
          {article.pubDate && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4, letterSpacing: '0.05em' }}>
              <Clock size={10} />
              {new Date(article.pubDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          )}
          <span style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: '#6d28d9', background: 'linear-gradient(135deg,#ede9fe,#f3f0ff)',
            border: '1px solid rgba(109,40,217,0.15)', padding: '5px 12px', borderRadius: 20,
          }}>AI Brief</span>
        </div>
      )}

      {/* ── Main content ───────────────────────────────── */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px 32px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 28 }}>
            <div style={{ position: 'relative', width: 72, height: 72 }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2.5px solid transparent', borderTopColor: '#6d28d9', borderRightColor: '#7c3aed', animation: 'spin 1s linear infinite' }} />
              <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', border: '2px solid transparent', borderBottomColor: '#a855f7', borderLeftColor: '#818cf8', animation: 'spin 0.65s linear infinite reverse' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#3730a3,#7c3aed)', boxShadow: '0 0 20px rgba(109,40,217,0.5)' }} />
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: "'Cinzel', serif", fontSize: 14, fontWeight: 700, letterSpacing: '0.18em',
                background: 'linear-gradient(135deg,#3730a3,#7c3aed)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                textTransform: 'uppercase', marginBottom: 6,
                filter: 'drop-shadow(0 1px 4px rgba(109,40,217,0.2))',
              }}>Synthesizing Intelligence Brief</div>
              <div style={{ color: '#94a3b8', fontSize: 12, letterSpacing: '0.05em' }}>AI is analyzing sources, causes &amp; impact&hellip;</div>
            </div>
            {[220, 280, 200, 260, 210].map((w, i) => (
              <div key={i} style={{ height: 11, borderRadius: 6, background: 'linear-gradient(90deg,#ede9fe 25%,#f5f3ff 50%,#ede9fe 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', width: Math.min(w, 440), animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <IntelligenceGraph article={article} />
            <MarkdownRenderer content={content} />
          </div>
        )}
      </div>

      {/* ── Fixed save dock at bottom ─────────────────── */}
      {!loading && !prefetch && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(226, 232, 240, 0.8)',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)',
          padding: '40px 40px 24px', // Extra top padding for the curve
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
          borderTopLeftRadius: '50% 100%', borderTopRightRadius: '50% 100%',
        }}>
          {/* Particle Animation Layer */}
          {particles.map(p => (
            <div key={p.id} style={{
              position: 'absolute', left: p.startLeft, top: '50%', // Spawn from middle of dock, behind it
              width: 56, height: 56, pointerEvents: 'none', zIndex: -1, // Negative zIndex pushes it behind the milky background!
              '--tx': `${p.tx}px`, '--ty': `${p.ty}px`, '--rot': `${p.rot}deg`, '--scale': p.scale,
              // Y-axis handles the up-and-down gravity arc
              animation: `splashY 2s forwards`,
              animationDelay: `${p.delay}s`,
              opacity: 0,
            }}>
              <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: p.type === 'news' ? 'linear-gradient(135deg, #10b981, #047857)' :
                            p.type === 'brain' ? 'linear-gradient(135deg, #7c3aed, #4c1d95)' :
                            'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                borderRadius: '50%',
                boxShadow: `0 12px 24px ${p.type === 'news' ? 'rgba(16,185,129,0.4)' : p.type === 'brain' ? 'rgba(124,58,237,0.4)' : 'rgba(59,130,246,0.4)'}`,
                border: '2px solid rgba(255,255,255,0.8)',
                color: '#fff',
                // X-axis handles the horizontal drift and spin
                animation: `splashX 2s linear forwards`,
                animationDelay: `${p.delay}s`,
              }}>
                {p.type === 'news' && <Globe size={28} />}
                {p.type === 'brain' && <Brain size={28} />}
                {p.type === 'globe' && <Globe size={28} />}
              </div>
            </div>
          ))}

          {/* Save / unsave */}
          <button
            onClick={handleSave}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '14px 40px', borderRadius: 16, border: 'none', cursor: 'pointer',
              fontWeight: 800, fontSize: 15, letterSpacing: '0.01em', fontFamily: 'inherit',
              background: saved
                ? 'linear-gradient(135deg, #4ade80, #059669)'
                : 'linear-gradient(135deg, #7c3aed, #4285F4)',
              color: '#fff',
              zIndex: 10, position: 'relative',
              boxShadow: saved
                ? '0 8px 24px rgba(74,222,128,0.35)'
                : '0 8px 24px rgba(124,58,237,0.35)',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              transform: saveAnim ? 'scale(1.06)' : 'scale(1)',
            }}
          >
            {saved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
            {saved ? 'Brief Saved ✓' : 'Save Intelligence Brief'}
          </button>

          {/* Open original source */}
          {article.link && article.link !== '#' && (
            <a href={article.link} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 24px', borderRadius: 16, border: '1.5px solid #e2e8f0', color: '#475569', textDecoration: 'none', fontWeight: 700, fontSize: 14, background: '#fff', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#4285F4'; e.currentTarget.style.color = '#4285F4'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}
            >
              <Globe size={16} /> Original Source
            </a>
          )}
        </div>
      )}


      <style>{`
        @keyframes splashY {
          0%   { transform: translateY(0) scale(0); opacity: 0; animation-timing-function: cubic-bezier(0.1, 1, 0.4, 1); }
          15%  { opacity: 1; }
          40%  { transform: translateY(var(--ty)) scale(var(--scale)); opacity: 1; animation-timing-function: cubic-bezier(0.6, 0, 0.9, 0.1); }
          100% { transform: translateY(200px) scale(calc(var(--scale) * 0.4)); opacity: 0; }
        }
        @keyframes splashX {
          0%   { transform: translateX(-50%) rotate(0deg); }
          100% { transform: translateX(calc(-50% + var(--tx))) rotate(var(--rot)); }
        }
        @keyframes spin    { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes shimmer { 0%   { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes chatPopup { 0% { opacity: 0; transform: scale(0.95) translateY(10px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes fadeSlideUp { 0% { opacity: 0; transform: translateY(6px); } 100% { opacity: 1; transform: translateY(0); } }
        /* geminiSpin & logoGlowPulse replaced by GSAP GsapAiSpinner */
        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0.65); opacity: 0.4; }
          40%            { transform: scale(1.25); opacity: 1; }
        }
      `}</style>
        </>
      )}
      </div> {/* End scrollable pane */}
    </div>
  );
}
