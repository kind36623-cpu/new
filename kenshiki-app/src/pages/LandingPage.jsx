import React from 'react';
import { Link } from 'react-router-dom';
import {
  Globe, Brain, Map, Mic, Bookmark, Shield,
  ArrowRight, Activity, FileText, Zap,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Globe, title: 'Global News Feed',
    desc: 'Monitor real-time world events — security, economics, culture, sports, and local intelligence in one stream.',
    color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',
  },
  {
    icon: Brain, title: 'AI Intelligence Briefs',
    desc: 'Transform headlines into deep analytical reports with background, causes, impacts, and predictive timelines.',
    color: '#6d28d9', bg: 'rgba(109,40,217,0.1)',
  },
  {
    icon: Map, title: 'Radar Map',
    desc: 'Visualize global events on an interactive intelligence map and see where the world is moving in real-time.',
    color: '#059669', bg: 'rgba(5,150,105,0.1)',
  },
  {
    icon: Mic, title: 'Voice AI — Kira',
    desc: 'Speak naturally with your embedded AI assistant. Ask questions, navigate, and get instant spoken answers.',
    color: '#a855f7', bg: 'rgba(168,85,247,0.1)',
  },
  {
    icon: Bookmark, title: 'Saved Intelligence',
    desc: 'Bookmark critical briefs and build your personal intelligence library accessible at any time.',
    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',
  },
  {
    icon: Shield, title: 'Multi-Domain Monitoring',
    desc: 'Track Security, Economic, Cultural, Sports, and Local feeds — all in one unified command center.',
    color: '#ef4444', bg: 'rgba(239,68,68,0.1)',
  },
];

export default function LandingPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg,#08081a 0%,#0f0c2e 35%,#160a3a 65%,#0a1540 100%)',
      fontFamily: "'Inter','Outfit',sans-serif",
      color: '#f1f5f9',
      overflowX: 'hidden',
    }}>

      {/* ── NAV ────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', height: 72,
        background: 'rgba(8,8,26,0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(109,40,217,0.18)',
      }}>
        <span style={{
          fontFamily: "'Cinzel',serif", fontSize: 24, fontWeight: 700, letterSpacing: '0.06em',
          background: 'linear-gradient(135deg,#a5b4fc 0%,#c084fc 50%,#818cf8 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Kenshiki
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/login" style={{
            padding: '9px 22px', borderRadius: 24,
            border: '1.5px solid rgba(139,92,246,0.4)',
            color: '#c4b5fd', fontSize: 14, fontWeight: 600,
            textDecoration: 'none', transition: 'all 0.2s',
            background: 'transparent',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.background = 'rgba(139,92,246,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)'; e.currentTarget.style.background = 'transparent'; }}
          >
            Sign In
          </Link>
          <Link to="/login?signup=1" style={{
            padding: '9px 22px', borderRadius: 24,
            background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
            color: '#fff', fontSize: 14, fontWeight: 600,
            textDecoration: 'none',
            boxShadow: '0 8px 24px rgba(109,40,217,0.35)',
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(109,40,217,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(109,40,217,0.35)'; }}
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────── */}
      <section style={{ textAlign: 'center', padding: '100px 24px 80px', position: 'relative' }}>

        {/* Glowing orb behind hero */}
        <div style={{
          position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(109,40,217,0.18) 0%,transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '7px 18px', borderRadius: 30,
          border: '1px solid rgba(139,92,246,0.35)',
          background: 'rgba(139,92,246,0.08)',
          marginBottom: 32,
        }}>
          <Activity size={13} style={{ color: '#a78bfa' }} />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: '#a78bfa', textTransform: 'uppercase' }}>
            AI-Powered Global Intelligence
          </span>
        </div>

        <h1 style={{
          fontFamily: "'Cinzel',serif",
          fontSize: 'clamp(36px,6vw,72px)', fontWeight: 800,
          lineHeight: 1.1, letterSpacing: '-0.01em',
          background: 'linear-gradient(135deg,#e2e8f0 0%,#a5b4fc 40%,#c084fc 70%,#818cf8 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          margin: '0 auto 24px', maxWidth: 900,
        }}>
          Monitor the World.<br />Understand It Instantly.
        </h1>

        <p style={{
          fontSize: 'clamp(16px,2vw,20px)', color: '#94a3b8', lineHeight: 1.7,
          maxWidth: 600, margin: '0 auto 48px',
        }}>
          Kenshiki is your AI-powered global intelligence dashboard — combining live news feeds,
          deep AI analysis, an interactive radar map, and a voice assistant into one elegant command center.
        </p>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/login?signup=1" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '16px 36px', borderRadius: 50,
            background: 'linear-gradient(135deg,#3730a3,#6d28d9,#7c3aed)',
            color: '#fff', fontSize: 16, fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 16px 48px rgba(109,40,217,0.45)',
            transition: 'all 0.25s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 24px 64px rgba(109,40,217,0.6)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(109,40,217,0.45)'; }}
          >
            Get Started Free <ArrowRight size={18} />
          </Link>
          <Link to="/login" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '16px 36px', borderRadius: 50,
            border: '1.5px solid rgba(148,163,184,0.25)',
            background: 'rgba(255,255,255,0.04)',
            color: '#cbd5e1', fontSize: 16, fontWeight: 600,
            textDecoration: 'none', transition: 'all 0.25s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)'; e.currentTarget.style.background = 'rgba(139,92,246,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(148,163,184,0.25)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
          >
            Sign In
          </Link>
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 48,
          marginTop: 72, flexWrap: 'wrap',
        }}>
          {[
            { val: '50+', label: 'Global Sources' },
            { val: 'Real-time', label: 'News Updates' },
            { val: 'AI-driven', label: 'Deep Briefs' },
          ].map(s => (
            <div key={s.val} style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: 28, fontWeight: 800,
                background: 'linear-gradient(135deg,#a5b4fc,#c084fc)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>{s.val}</div>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────── */}
      <section style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h2 style={{
            fontFamily: "'Cinzel',serif", fontSize: 'clamp(24px,3vw,36px)',
            fontWeight: 700, color: '#e2e8f0', marginBottom: 16,
          }}>
            Everything You Need to Stay Ahead
          </h2>
          <p style={{ fontSize: 16, color: '#64748b', maxWidth: 500, margin: '0 auto' }}>
            Built for analysts, decision-makers, and curious minds who demand more than headlines.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))',
          gap: 24,
        }}>
          {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
            <div key={title} style={{
              padding: '32px 28px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 24,
              backdropFilter: 'blur(12px)',
              transition: 'all 0.25s',
              cursor: 'default',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.borderColor = `${color}30`;
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = `0 16px 48px ${color}18`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20, border: `1px solid ${color}25`,
              }}>
                <Icon size={24} style={{ color }} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#e2e8f0', marginBottom: 10 }}>{title}</h3>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.65 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── BOTTOM CTA ────────────────────────────── */}
      <section style={{ padding: '80px 24px 100px', textAlign: 'center' }}>
        <div style={{
          maxWidth: 640, margin: '0 auto',
          padding: '60px 48px',
          background: 'linear-gradient(135deg,rgba(79,70,229,0.15),rgba(124,58,237,0.15))',
          border: '1px solid rgba(139,92,246,0.25)',
          borderRadius: 32,
          backdropFilter: 'blur(16px)',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: '0 auto 24px',
            background: 'linear-gradient(135deg,#3730a3,#7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 16px 40px rgba(109,40,217,0.4)',
          }}>
            <Zap size={28} style={{ color: '#fff' }} />
          </div>
          <h2 style={{
            fontFamily: "'Cinzel',serif", fontSize: 28, fontWeight: 700,
            color: '#e2e8f0', marginBottom: 16,
          }}>
            Ready to Monitor the World?
          </h2>
          <p style={{ fontSize: 16, color: '#64748b', marginBottom: 36, lineHeight: 1.6 }}>
            Join Kenshiki and gain access to AI-powered intelligence that keeps you one step ahead.
          </p>
          <Link to="/login?signup=1" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '16px 40px', borderRadius: 50,
            background: 'linear-gradient(135deg,#3730a3,#6d28d9)',
            color: '#fff', fontSize: 15, fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 12px 40px rgba(109,40,217,0.4)',
            transition: 'all 0.25s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 20px 56px rgba(109,40,217,0.55)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(109,40,217,0.4)'; }}
          >
            Create Free Account <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────── */}
      <footer style={{
        textAlign: 'center', padding: '24px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: 13, color: '#334155',
      }}>
        © {new Date().getFullYear()} Kenshiki · AI Global Intelligence Platform ·{' '}
        <Link to="/login" style={{ color: '#475569', textDecoration: 'none' }}>Sign In</Link>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes twinkle {
          0%,100% { opacity:0.3; transform:scale(1); }
          50% { opacity:1; transform:scale(1.8); }
        }
      `}</style>
    </div>
  );
}
