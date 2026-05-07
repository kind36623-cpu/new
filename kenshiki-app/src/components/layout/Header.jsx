import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, ChevronDown, Activity, Map as MapIcon, FileText, Settings, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAgent } from '../../contexts/AgentContext';

export default function Header() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { logout, currentUser } = useAuth();
  const { voiceGender, setVoiceGender } = useAgent();
  const navigate = useNavigate();

  const userInitial = currentUser?.displayName 
    ? currentUser.displayName.charAt(0).toUpperCase() 
    : (currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : 'U');

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch(err) {
      console.error(err);
    }
  }

  useEffect(() => {
    const handle = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsProfileOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  /* ── shared nav pill style ─────────────────────────────── */
  const navPill = (active, color = '#6d28d9', bg = '#ede9fe') => ({
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '8px 16px', borderRadius: 22,
    background: active ? bg : 'transparent',
    border: active ? `1.5px solid ${color}20` : '1.5px solid transparent',
    boxShadow: active ? `0 4px 16px -4px ${color}30` : 'none',
    cursor: 'pointer', transition: 'all 0.22s cubic-bezier(.22,1,.36,1)',
    textDecoration: 'none', whiteSpace: 'nowrap',
  });

  return (
    <header style={{
      height: 72,
      borderBottom: '1px solid rgba(226,232,240,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 40px',
      background: 'rgba(255,255,255,0.82)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      position: 'sticky', top: 0, zIndex: 50,
      boxShadow: '0 1px 24px rgba(55,48,163,0.05)',
    }}>

      {/* ── LEFT: Logo + Nav ───────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

        {/* Kenshiki Logo */}
        <NavLink to="/" style={{ textDecoration: 'none', marginRight: 18 }}>
          <span style={{
            fontFamily: "'Cinzel', 'Trajan Pro', serif",
            fontSize: 26, fontWeight: 700, letterSpacing: '0.08em',
            background: 'linear-gradient(135deg,#1e1b4b 0%,#3730a3 35%,#6d28d9 65%,#7c3aed 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            filter: 'drop-shadow(0 1px 2px rgba(109,40,217,0.15))',
            lineHeight: 1,
          }}>
            Ken<span style={{
              background: 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#a855f7 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              fontWeight: 400, letterSpacing: '0.14em',
            }}>shiki</span>
          </span>
        </NavLink>

        {/* ── FEED ── */}
        <NavLink to="/insight" style={({ isActive }) => ({
          ...navPill(isActive, '#6d28d9', '#ede9fe'),
          background: isActive ? 'linear-gradient(135deg,#ede9fe,#f3f0ff)' : 'transparent',
        })}>
          {({ isActive }) => (
            <>
              <Activity size={14} style={{ color: isActive ? '#6d28d9' : '#94a3b8' }} />
              <span style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 11, fontWeight: isActive ? 700 : 600,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: isActive ? '#6d28d9' : '#64748b',
              }}>Feed</span>
            </>
          )}
        </NavLink>

        {/* ── RADAR ── */}
        <NavLink to="/map" style={({ isActive }) => ({
          ...navPill(isActive, '#059669', '#d1fae5'),
          background: isActive ? 'linear-gradient(135deg,#d1fae510,#ecfdf5)' : 'transparent',
        })}>
          {({ isActive }) => (
            <>
              <MapIcon size={14} style={{ color: isActive ? '#059669' : '#94a3b8' }} />
              <span style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 11, fontWeight: isActive ? 700 : 600,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: isActive ? '#065f46' : '#64748b',
              }}>Radar</span>
            </>
          )}
        </NavLink>

        {/* ── BRIEF ── */}
        <NavLink to="/article" style={({ isActive }) => ({
          ...navPill(isActive, '#7c3aed', '#f3f0ff'),
          background: isActive ? 'linear-gradient(135deg,#f3f0ff,#ede9fe)' : 'transparent',
        })}>
          {({ isActive }) => (
            <>
              <FileText size={14} style={{ color: isActive ? '#7c3aed' : '#94a3b8' }} />
              <span style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 11, fontWeight: isActive ? 700 : 600,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: isActive ? '#6d28d9' : '#64748b',
              }}>Brief</span>
            </>
          )}
        </NavLink>

      </div>{/* end LEFT */}

      {/* ── RIGHT: Profile ─────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>

        {/* Profile Dropdown */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setIsProfileOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 12px 4px 4px',
              background: isProfileOpen ? 'rgba(109,40,217,0.06)' : 'transparent',
              border: `1.5px solid ${isProfileOpen ? 'rgba(109,40,217,0.2)' : 'rgba(226,232,240,0.7)'}`,
              borderRadius: 40, cursor: 'pointer', transition: 'all 0.22s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(109,40,217,0.2)'; e.currentTarget.style.background = 'rgba(109,40,217,0.04)'; }}
            onMouseLeave={e => {
              if (!isProfileOpen) {
                e.currentTarget.style.borderColor = 'rgba(226,232,240,0.7)';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg,#3730a3,#7c3aed)',
              border: '2px solid #fff',
              boxShadow: '0 2px 8px rgba(109,40,217,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em',
            }}>{userInitial}</div>
            <ChevronDown size={13} style={{
              color: '#6d28d9',
              transform: isProfileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.25s',
            }} />
          </button>

          {/* Dropdown panel */}
          {isProfileOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 12px)',
              width: 300,
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(48px)',
              WebkitBackdropFilter: 'blur(48px)',
              border: '1px solid rgba(255,255,255,0.6)',
              borderRadius: 28,
              boxShadow: '0 32px 80px rgba(30,27,75,0.15), 0 0 0 1px rgba(109,40,217,0.05)',
              overflow: 'hidden', zIndex: 200,
              animation: 'dropdownIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
              {/* User info */}
              <div style={{ padding: '24px 24px 16px', background: 'linear-gradient(180deg, rgba(248,250,252,0.6) 0%, transparent 100%)', borderBottom: '1px solid rgba(226,232,240,0.5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#3730a3,#7c3aed)',
                    boxShadow: '0 4px 12px rgba(109,40,217,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 800, color: '#fff',
                  }}>{userInitial}</div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>{currentUser?.displayName || 'Operator'}</div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#64748b', marginTop: 2 }}>{currentUser?.email || 'intel@kenshiki.ai'}</div>
                  </div>
                </div>
                <div style={{
                  display: 'inline-block',
                  fontFamily: "'Cinzel', serif",
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
                  background: 'rgba(109,40,217,0.1)', color: '#6d28d9',
                  padding: '4px 10px', borderRadius: 20,
                  border: '1px solid rgba(109,40,217,0.2)'
                }}>Authenticated User</div>
              </div>

              {/* Menu items */}
              <div style={{ padding: 12 }}>
                
                {/* Voice Settings Toggle */}
                <div style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: 16, marginBottom: 4,
                  background: 'transparent',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(109,40,217,0.06)', border: '1px solid rgba(109,40,217,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Settings size={16} style={{ color: '#6d28d9' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Kira Voice</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        {voiceGender === 'female' ? 'Female (Default)' : 'Male'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const newGender = voiceGender === 'female' ? 'male' : 'female';
                      setVoiceGender(newGender);
                      localStorage.setItem('kira_voice_gender', newGender);
                    }}
                    style={{
                      padding: '6px 12px', borderRadius: 20, border: '1px solid rgba(109,40,217,0.3)',
                      background: 'linear-gradient(135deg,#f3f0ff,#ede9fe)',
                      color: '#6d28d9', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    Switch
                  </button>
                </div>

                <div style={{ height: 1, background: 'rgba(226,232,240,0.6)', margin: '4px 14px 8px' }} />

                <button onClick={handleLogout} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 16,
                  background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                  onMouseEnter={e => { 
                    e.currentTarget.style.background = '#fff1f2'; 
                    e.currentTarget.style.transform = 'translateX(6px)';
                  }}
                  onMouseLeave={e => { 
                    e.currentTarget.style.background = 'transparent'; 
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: '#fff1f2', border: '1px solid #fecdd3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <LogOut size={16} style={{ color: '#e11d48' }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e11d48' }}>Secure Logout</span>
                </button>
              </div>

              {/* Footer */}
              <div style={{
                padding: '10px 20px', borderTop: '1px solid rgba(226,232,240,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'rgba(248,250,252,0.5)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.6)', animation: 'livePulse 2s ease-in-out infinite', display: 'inline-block' }} />
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: 8.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#94a3b8' }}>Nodes Synced</span>
                </div>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, fontWeight: 600, color: '#cbd5e1', letterSpacing: '0.08em' }}>V2.4.1</span>
              </div>
            </div>
          )}
        </div>

      </div>{/* end RIGHT */}

      <style>{`
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-16px) scale(0.95); filter: blur(4px); }
          to   { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.75); }
        }
      `}</style>
    </header>
  );
}
