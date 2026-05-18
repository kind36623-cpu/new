import React, { useEffect, useState } from 'react';
import { useAgent } from '../../contexts/AgentContext';
import { X } from 'lucide-react';

const STATUS_CONFIG = {
  idle:      { label: 'Tap to activate',   color: '#8b5cf6', gradient: 'linear-gradient(135deg, #c084fc, #6366f1)' },
  listening: { label: 'Listening...',       color: '#06b6d4', gradient: 'linear-gradient(135deg, #00f5d4, #3b82f6)' },
  thinking:  { label: 'Thinking...',        color: '#f59e0b', gradient: 'linear-gradient(135deg, #fcd34d, #ec4899)' },
  speaking:  { label: 'Speaking...',        color: '#ec4899', gradient: 'linear-gradient(135deg, #f472b6, #8b5cf6)' },
  starting:  { label: 'Starting...',        color: '#8b5cf6', gradient: 'linear-gradient(135deg, #c084fc, #6366f1)' },
};

export default function AgentHUD() {
  const { agentStatus, toggleAgent, lastTranscript, lastReply, interimText } = useAgent();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const cfg = STATUS_CONFIG[agentStatus] || STATUS_CONFIG.idle;
  const isActive = agentStatus !== 'idle';

  // Show the reply bubble whenever something happens
  useEffect(() => {
    if (lastReply || lastTranscript) {
      setVisible(true);
      setDismissed(false);
    }
  }, [lastReply, lastTranscript]);

  // Auto-hide the bubble after a bit
  useEffect(() => {
    if (!visible || dismissed) return;
    const t = setTimeout(() => setVisible(false), 8000);
    return () => clearTimeout(t);
  }, [visible, lastReply, dismissed]);

  // Adjust animation speeds based on the agent's current state
  const blobSpeed = agentStatus === 'listening' ? '2s' : agentStatus === 'speaking' ? '1s' : agentStatus === 'thinking' ? '0.5s' : '4s';
  const morphSpeed = agentStatus === 'thinking' ? '1s' : '3s';

  return (
    <>
      {/* ── KIRA Badge bubble ─────────────────────────────────────────── */}
      {visible && !dismissed && (lastReply || lastTranscript) && (
        <div style={{
          position: 'fixed',
          bottom: 120,
          right: 32,
          zIndex: 9998,
          maxWidth: 340,
          padding: '18px 24px',
          background: 'rgba(15, 15, 20, 0.85)',
          backdropFilter: 'blur(40px) saturate(200%)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 24,
          boxShadow: '0 24px 48px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
          animation: 'agentSlideUp 0.5s cubic-bezier(0.16,1,0.3,1)',
          color: '#fff'
        }}>
          {/* Close button */}
          <button
            onClick={() => { setVisible(false); setDismissed(true); }}
            style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4, transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
          >
            <X size={14} />
          </button>

          {/* KIRA label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div className="mini-blob" style={{ background: cfg.gradient, animationDuration: `${morphSpeed}, ${blobSpeed}` }} />
            <span style={{ 
              fontFamily: "'Inter', sans-serif", 
              fontSize: 10, 
              fontWeight: 800, 
              letterSpacing: '0.2em', 
              textTransform: 'uppercase', 
              color: cfg.color, 
              textShadow: `0 0 12px ${cfg.color}80`,
              transition: 'color 0.4s ease'
            }}>KIRA</span>
          </div>

          {/* Live interim transcript while user speaks */}
          {interimText && (
            <div style={{ fontSize: 13, color: '#38bdf8', fontStyle: 'italic', marginBottom: 6, lineHeight: 1.5, opacity: 0.85 }}>
              {interimText}...
            </div>
          )}

          {/* Final transcript */}
          {!interimText && lastTranscript && (
            <div style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic', marginBottom: 10, lineHeight: 1.5 }}>
              "{lastTranscript}"
            </div>
          )}

          {/* KIRA reply */}
          {lastReply && (
            <div style={{ fontSize: 14, color: '#f1f5f9', fontWeight: 400, lineHeight: 1.6 }}>
              {lastReply}
            </div>
          )}
        </div>
      )}

      {/* ── Main Gemini-style Blob Button ──────────────────────────────── */}
      <div style={{
        position: 'fixed',
        bottom: 32,
        right: 32,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
      }}>
        {/* Status chip */}
        <div style={{
          padding: '6px 14px',
          background: 'rgba(15, 15, 20, 0.6)',
          backdropFilter: 'blur(12px)',
          borderRadius: 20,
          border: `1px solid ${cfg.color}30`,
          opacity: isActive ? 1 : 0,
          transform: isActive ? 'translateY(0)' : 'translateY(10px)',
          transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)',
          boxShadow: `0 4px 20px ${cfg.color}20`
        }}>
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: cfg.color,
            textShadow: `0 0 10px ${cfg.color}60`,
            transition: 'color 0.4s ease'
          }}>{cfg.label}</span>
        </div>

        {/* Blob Container */}
        <button
          onClick={toggleAgent}
          title="Activate KIRA"
          style={{
            width: 72,
            height: 72,
            position: 'relative',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            outline: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: isActive ? 'scale(1.15)' : 'scale(1)',
            transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
          onMouseEnter={e => {
            if (!isActive) e.currentTarget.style.transform = 'scale(1.08)';
          }}
          onMouseLeave={e => {
            if (!isActive) e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {/* Outer diffuse glow */}
          <div style={{
            position: 'absolute',
            inset: -20,
            background: cfg.gradient,
            filter: 'blur(28px)',
            opacity: isActive ? 0.6 : 0.15,
            borderRadius: '50%',
            transition: 'all 0.5s ease',
            animation: isActive ? `pulseGlow ${blobSpeed} alternate infinite` : 'none',
          }} />

          {/* Morphing Blob 1 */}
          <div className="gemini-blob blob-1" style={{ 
            background: cfg.gradient, 
            animationDuration: `${morphSpeed}, ${blobSpeed}` 
          }} />
          
          {/* Morphing Blob 2 (Offset) */}
          <div className="gemini-blob blob-2" style={{ 
            background: cfg.gradient, 
            animationDuration: `${morphSpeed}, ${blobSpeed}`,
            animationDirection: 'reverse' 
          }} />

          {/* Solid core to anchor it */}
          <div style={{
            position: 'absolute',
            width: isActive ? 28 : 20,
            height: isActive ? 28 : 20,
            background: '#ffffff',
            borderRadius: '50%',
            filter: 'blur(4px)',
            opacity: isActive ? 0.9 : 0.4,
            transition: 'all 0.4s ease',
            animation: isActive ? `pulseGlow ${blobSpeed} alternate infinite` : 'none',
          }} />
        </button>
      </div>

      <style>{`
        @keyframes agentSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulseGlow {
          0% { opacity: 0.5; transform: scale(0.95); }
          100% { opacity: 0.8; transform: scale(1.05); }
        }
        @keyframes morphBlob {
          0% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
          50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
          100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
        }
        @keyframes spinBlob {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .gemini-blob {
          position: absolute;
          inset: 0;
          mix-blend-mode: hard-light;
          opacity: 0.85;
          animation-name: morphBlob, spinBlob;
          animation-timing-function: ease-in-out, linear;
          animation-iteration-count: infinite, infinite;
          transition: background 0.5s ease;
        }
        
        .blob-2 {
          animation-delay: -1.5s, 0s;
          opacity: 0.65;
        }
        
        .mini-blob {
          width: 18px;
          height: 18px;
          animation-name: morphBlob, spinBlob;
          animation-timing-function: ease-in-out, linear;
          animation-iteration-count: infinite, infinite;
          transition: background 0.5s ease;
          opacity: 0.9;
        }
      `}</style>
    </>
  );
}
