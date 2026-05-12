import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import DotWaveBackground from '../components/ui/DotWaveBackground';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile } from 'firebase/auth';

const GENRES = [
  'Technology', 'Global Policy', 'Economics', 'Science & Space', 
  'Arts & Culture', 'Cyber Security', 'Environment', 'Financial Markets'
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [isEnlightening, setIsEnlightening] = useState(false);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const handleGenreToggle = (genre) => {
    setSelectedGenres(prev => 
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (name.trim()) setStep(2);
  };

  const handleEnlighten = async () => {
    if (selectedGenres.length === 0) return;
    setIsEnlightening(true);

    try {
      if (currentUser) {
        await updateProfile(currentUser, { displayName: name });
      }
    } catch (err) {
      console.error("Failed to update profile name:", err);
    }
    
    // Fully wait for the CSS fade-out animation to complete (1500ms) before snapping router
    setTimeout(() => {
      navigate('/app');
    }, 1500);
  };

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      background: '#f8fafc',
    }}>
      {/* Shared Interactive Background */}
      <DotWaveBackground />

      {/* Main Container */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: 580,
        margin: '0 24px',
        padding: '64px 48px',
        background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.7) 100%)',
        backdropFilter: 'blur(48px)',
        WebkitBackdropFilter: 'blur(48px)',
        border: '1px solid rgba(255, 255, 255, 0.8)',
        borderRadius: 36,
        boxShadow: '0 32px 96px rgba(30, 27, 75, 0.1), inset 0 2px 8px rgba(255,255,255,0.9)',
        animation: 'slideUpFade 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        textAlign: 'center',
      }}>
        
        {/* Logo Element */}
        <div style={{
          display: 'inline-block',
          width: 56, height: 56,
          borderRadius: 16,
          background: 'linear-gradient(135deg, #1e1b4b 0%, #6d28d9 100%)',
          boxShadow: '0 16px 40px rgba(109, 40, 217, 0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 32px',
          animation: 'float 6s ease-in-out infinite',
        }}>
          <span style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 24, fontWeight: 800,
            color: '#fff', letterSpacing: '-0.02em'
          }}>K</span>
        </div>

        {/* STEP 1: Name Input */}
        {step === 1 && (
          <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <h1 style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 32, fontWeight: 700,
              background: 'linear-gradient(135deg, #1e1b4b 0%, #6d28d9 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              marginBottom: 12,
            }}>
              Welcome to Kenshiki
            </h1>
            <p style={{ fontSize: 15, color: '#64748b', marginBottom: 40, lineHeight: 1.5 }}>
              The future of global intelligence is personalized. <br/> How should we address you?
            </p>

            <form onSubmit={handleNext} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <input
                type="text"
                placeholder="Enter your name..."
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
                className="onboard-input"
                style={{
                  width: '100%',
                  padding: '20px 24px',
                  background: 'rgba(248, 250, 252, 0.8)',
                  border: '1.5px solid rgba(226, 232, 240, 0.9)',
                  borderRadius: 20,
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#0f172a',
                  textAlign: 'center',
                  outline: 'none',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                }}
                onFocus={e => {
                  e.currentTarget.style.background = '#fff';
                  e.currentTarget.style.borderColor = '#6d28d9';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(109, 40, 217, 0.12)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onBlur={e => {
                  e.currentTarget.style.background = 'rgba(248, 250, 252, 0.8)';
                  e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.9)';
                  e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              />
              
              <button
                type="submit"
                disabled={!name.trim()}
                style={{
                  width: '100%',
                  padding: '18px',
                  borderRadius: 20,
                  background: name.trim() ? 'linear-gradient(135deg, #3730a3 0%, #7c3aed 100%)' : '#e2e8f0',
                  color: name.trim() ? '#fff' : '#94a3b8',
                  border: 'none',
                  fontSize: 16, fontWeight: 700, letterSpacing: '0.02em',
                  cursor: name.trim() ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  boxShadow: name.trim() ? '0 16px 32px rgba(109, 40, 217, 0.3)' : 'none',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onMouseEnter={e => {
                  if (name.trim()) e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  if (name.trim()) e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Next
                <ArrowRight size={20} />
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: Topic Selection */}
        {step === 2 && (
          <div style={{ animation: 'fadeIn 0.6s ease-out' }}>
            <h1 style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 28, fontWeight: 700,
              background: 'linear-gradient(135deg, #1e1b4b 0%, #6d28d9 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              marginBottom: 12,
            }}>
              Curate Your Intel
            </h1>
            <p style={{ fontSize: 15, color: '#64748b', marginBottom: 32, lineHeight: 1.5 }}>
              Select the global nodes you want to monitor, <span style={{fontWeight: 700, color: '#3730a3'}}>{name}</span>.
            </p>

            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center',
              marginBottom: 40
            }}>
              {GENRES.map(genre => {
                const isSelected = selectedGenres.includes(genre);
                return (
                  <button
                    key={genre}
                    onClick={() => handleGenreToggle(genre)}
                    style={{
                      padding: '12px 20px',
                      borderRadius: 100,
                      background: isSelected ? 'linear-gradient(135deg, #6d28d9 0%, #a855f7 100%)' : 'rgba(248, 250, 252, 0.8)',
                      border: `1.5px solid ${isSelected ? 'transparent' : 'rgba(226, 232, 240, 0.9)'}`,
                      color: isSelected ? '#fff' : '#475569',
                      fontSize: 14, fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: isSelected ? '0 8px 24px rgba(109, 40, 217, 0.25)' : 'none',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.9)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleEnlighten}
              disabled={selectedGenres.length === 0}
              style={{
                width: '100%',
                padding: '20px',
                borderRadius: 20,
                background: selectedGenres.length > 0 ? 'linear-gradient(135deg, #1e1b4b 0%, #4f46e5 100%)' : '#e2e8f0',
                color: selectedGenres.length > 0 ? '#fff' : '#94a3b8',
                border: 'none',
                fontSize: 16, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                cursor: selectedGenres.length > 0 ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                boxShadow: selectedGenres.length > 0 ? '0 16px 40px rgba(55, 48, 163, 0.4)' : 'none',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onMouseEnter={e => {
                if (selectedGenres.length > 0) {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 24px 48px rgba(55, 48, 163, 0.5)';
                }
              }}
              onMouseLeave={e => {
                if (selectedGenres.length > 0) {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 16px 40px rgba(55, 48, 163, 0.4)';
                }
              }}
            >
              <Sparkles size={20} />
              Enlighten
            </button>
          </div>
        )}

      </div>

      {/* The Enlighten Whiteout Overlay */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#fff',
        zIndex: 9999,
        pointerEvents: 'none',
        opacity: isEnlightening ? 1 : 0,
        transition: 'opacity 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
      }} />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(40px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); box-shadow: 0 16px 40px rgba(109, 40, 217, 0.4); }
          50% { transform: translateY(-6px); box-shadow: 0 24px 48px rgba(109, 40, 217, 0.5); }
        }
        .onboard-input::placeholder {
          transition: opacity 0.25s;
        }
        .onboard-input:focus::placeholder {
          opacity: 0.3;
        }
      `}</style>
    </div>
  );
}
