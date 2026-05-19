/**
 * AgentHUD — KIRA voice assistant floating UI
 *
 * Phases: idle | listening | processing | speaking
 * - Blob blob pulses according to phase
 * - Reply bubble shows transcript + reply
 * - Stop button appears when active
 */

import React, { useEffect, useState, useRef } from 'react';
import { useAgent } from '../../contexts/AgentContext';
import { MicOff, Mic } from 'lucide-react';

/* ── Phase configurations ─────────────────────────────────────────── */
const PHASE_CFG = {
  idle:       { label: 'Activate KIRA',  color: '#8b5cf6', grad: 'linear-gradient(135deg,#c084fc,#6366f1)', blobSpeed: '4s',   morphSpeed: '3s'   },
  listening:  { label: 'Listening…',     color: '#06b6d4', grad: 'linear-gradient(135deg,#00f5d4,#3b82f6)', blobSpeed: '1.5s', morphSpeed: '2.5s' },
  processing: { label: 'Thinking…',      color: '#f59e0b', grad: 'linear-gradient(135deg,#fcd34d,#ec4899)', blobSpeed: '0.5s', morphSpeed: '0.8s' },
  speaking:   { label: 'Speaking…',      color: '#ec4899', grad: 'linear-gradient(135deg,#f472b6,#8b5cf6)', blobSpeed: '1s',   morphSpeed: '1.5s' },
};

export default function AgentHUD() {
  const {
    phase,
    toggleAgent,
    stopListening,
    lastTranscript,
    lastReply,
    interimText,
  } = useAgent();

  const [bubbleVisible, setBubbleVisible] = useState(false);
  const hideTimerRef = useRef(null);
  const isActive = phase !== 'idle';
  const cfg = PHASE_CFG[phase] || PHASE_CFG.idle;

  /* Show bubble on new transcript/reply; auto-hide after 9s */
  useEffect(() => {
    if (!lastReply && !lastTranscript) return;
    setBubbleVisible(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setBubbleVisible(false), 9000);
    return () => clearTimeout(hideTimerRef.current);
  }, [lastReply, lastTranscript]);

  /* Hide bubble when session ends */
  useEffect(() => {
    if (phase === 'idle') {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setBubbleVisible(false), 3000);
    }
  }, [phase]);

  return (
    <>
      {/* ── Reply Bubble ───────────────────────────────────────────── */}
      {bubbleVisible && (lastReply || lastTranscript || interimText) && (
        <div
          style={{
            position: 'fixed', bottom: 130, right: 32, zIndex: 9998,
            maxWidth: 340, minWidth: 220,
            padding: '16px 20px',
            background: 'rgba(10,10,18,0.92)',
            backdropFilter: 'blur(32px) saturate(180%)',
            WebkitBackdropFilter: 'blur(32px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
            boxShadow: '0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)',
            animation: 'kiraSlideUp 0.45s cubic-bezier(0.16,1,0.3,1)',
            color: '#fff',
          }}
        >
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div
              className="kira-mini-blob"
              style={{ background: cfg.grad, animationDuration: `${cfg.morphSpeed}, ${cfg.blobSpeed}` }}
            />
            <span style={{
              fontSize: 9, fontWeight: 800, letterSpacing: '0.22em',
              textTransform: 'uppercase', color: cfg.color,
              textShadow: `0 0 10px ${cfg.color}90`,
              fontFamily: "'Inter', sans-serif",
              transition: 'color 0.3s',
            }}>
              KIRA
            </span>
            <span style={{
              marginLeft: 'auto',
              fontSize: 9, fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: '#475569',
              fontFamily: "'Inter', sans-serif",
            }}>
              {cfg.label}
            </span>
          </div>

          {/* Live interim (while user is speaking) */}
          {interimText && (
            <div style={{
              fontSize: 12.5, color: '#38bdf8', fontStyle: 'italic',
              lineHeight: 1.55, marginBottom: 6, opacity: 0.9,
              fontFamily: "'Inter', sans-serif",
            }}>
              {interimText}…
            </div>
          )}

          {/* Final user transcript */}
          {!interimText && lastTranscript && (
            <div style={{
              fontSize: 12, color: '#64748b', fontStyle: 'italic',
              lineHeight: 1.5, marginBottom: lastReply ? 10 : 0,
              fontFamily: "'Inter', sans-serif",
            }}>
              "{lastTranscript}"
            </div>
          )}

          {/* KIRA reply */}
          {lastReply && (
            <div style={{
              fontSize: 13.5, color: '#e2e8f0', fontWeight: 400,
              lineHeight: 1.65, fontFamily: "'Inter', sans-serif",
            }}>
              {lastReply}
            </div>
          )}
        </div>
      )}

      {/* ── Floating Button Cluster ───────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 32, right: 32, zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
      }}>

        {/* Status chip — visible only when active */}
        <div style={{
          padding: '5px 13px',
          background: 'rgba(10,10,18,0.65)',
          backdropFilter: 'blur(16px)',
          borderRadius: 20,
          border: `1px solid ${cfg.color}28`,
          opacity: isActive ? 1 : 0,
          transform: isActive ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.95)',
          transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
          pointerEvents: 'none',
        }}>
          <span style={{
            fontSize: 9.5, fontWeight: 800, letterSpacing: '0.16em',
            textTransform: 'uppercase', color: cfg.color,
            textShadow: `0 0 8px ${cfg.color}70`,
            fontFamily: "'Inter', sans-serif",
            transition: 'color 0.3s',
          }}>
            {cfg.label}
          </span>
        </div>

        {/* Button row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

          {/* Stop button — only when active */}
          <div style={{
            opacity: isActive ? 1 : 0,
            transform: isActive ? 'scale(1) translateX(0)' : 'scale(0.7) translateX(20px)',
            transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
            pointerEvents: isActive ? 'auto' : 'none',
          }}>
            <button
              onClick={stopListening}
              title="Stop KIRA"
              style={{
                width: 42, height: 42, borderRadius: '50%',
                background: 'rgba(239,68,68,0.12)',
                border: '1.5px solid rgba(239,68,68,0.35)',
                color: '#f87171', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.28)'; e.currentTarget.style.transform = 'scale(1.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <MicOff size={15} />
            </button>
          </div>

          {/* Main blob button */}
          <button
            onClick={toggleAgent}
            title={isActive ? 'Deactivate KIRA' : 'Activate KIRA'}
            style={{
              width: 68, height: 68,
              position: 'relative',
              background: 'none', border: 'none',
              cursor: 'pointer', outline: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transform: isActive ? 'scale(1.18)' : 'scale(1)',
              transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.transform = 'scale(1.1)'; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {/* Diffuse glow ring */}
            <div style={{
              position: 'absolute', inset: -18,
              background: cfg.grad,
              filter: 'blur(24px)',
              opacity: isActive ? 0.55 : 0.12,
              borderRadius: '50%',
              transition: 'opacity 0.5s',
              animation: isActive ? `kiraGlow ${cfg.blobSpeed} alternate infinite` : 'none',
            }} />

            {/* Blob layer 1 */}
            <div
              className="kira-blob kira-blob-1"
              style={{ background: cfg.grad, animationDuration: `${cfg.morphSpeed}, ${cfg.blobSpeed}` }}
            />

            {/* Blob layer 2 (offset) */}
            <div
              className="kira-blob kira-blob-2"
              style={{ background: cfg.grad, animationDuration: `${cfg.morphSpeed}, ${cfg.blobSpeed}`, animationDirection: 'reverse' }}
            />

            {/* White core */}
            <div style={{
              position: 'absolute',
              width: isActive ? 24 : 16,
              height: isActive ? 24 : 16,
              background: '#fff',
              borderRadius: '50%',
              filter: 'blur(3px)',
              opacity: isActive ? 0.95 : 0.5,
              transition: 'all 0.4s',
              animation: isActive ? `kiraGlow ${cfg.blobSpeed} alternate infinite` : 'none',
            }} />

            {/* Mic icon when idle */}
            {!isActive && (
              <div style={{
                position: 'absolute', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.7)',
              }}>
                <Mic size={18} />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* ── Keyframes + blob classes ─────────────────────────────────── */}
      <style>{`
        @keyframes kiraSlideUp {
          from { opacity:0; transform:translateY(20px) scale(0.94); }
          to   { opacity:1; transform:translateY(0)    scale(1); }
        }
        @keyframes kiraGlow {
          0%   { opacity:0.45; transform:scale(0.93); }
          100% { opacity:0.8;  transform:scale(1.07); }
        }
        @keyframes kiraMorph {
          0%   { border-radius:60% 40% 30% 70% / 60% 30% 70% 40%; }
          50%  { border-radius:30% 60% 70% 40% / 50% 60% 30% 60%; }
          100% { border-radius:60% 40% 30% 70% / 60% 30% 70% 40%; }
        }
        @keyframes kiraSpin {
          from { transform:rotate(0deg); }
          to   { transform:rotate(360deg); }
        }

        .kira-blob {
          position: absolute;
          inset: 0;
          mix-blend-mode: hard-light;
          opacity: 0.82;
          animation-name: kiraMorph, kiraSpin;
          animation-timing-function: ease-in-out, linear;
          animation-iteration-count: infinite, infinite;
          transition: background 0.4s ease;
        }
        .kira-blob-2 {
          opacity: 0.6;
          animation-delay: -1.5s, 0s;
        }

        .kira-mini-blob {
          width: 16px;
          height: 16px;
          border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
          animation-name: kiraMorph, kiraSpin;
          animation-timing-function: ease-in-out, linear;
          animation-iteration-count: infinite, infinite;
          flex-shrink: 0;
          opacity: 0.9;
        }
      `}</style>
    </>
  );
}
