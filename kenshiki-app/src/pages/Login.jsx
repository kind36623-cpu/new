import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import DotWaveBackground from '../components/ui/DotWaveBackground';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const { login, signup, loginWithGoogle, loginWithApple } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      if (isRegistering) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/onboarding'); // Redirect to onboarding
      }, 800);
    } catch(err) {
      setErrorMsg(err.message || (isRegistering ? 'Failed to create an account' : 'Failed to sign in'));
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      await loginWithGoogle();
      setIsSuccess(true);
      setTimeout(() => navigate('/onboarding'), 800);
    } catch(err) {
      setErrorMsg(err.message || 'Failed to sign in with Google');
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      await loginWithApple();
      setIsSuccess(true);
      setTimeout(() => navigate('/onboarding'), 800);
    } catch(err) {
      setErrorMsg(err.message || 'Failed to sign in with Apple');
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Background Interactive Layer */}
      <DotWaveBackground />

      {/* Main Login Card - Glassmorphism */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: 440,
        margin: '0 24px',
        padding: '56px 48px',
        background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)',
        backdropFilter: 'blur(48px)',
        WebkitBackdropFilter: 'blur(48px)',
        border: '1px solid rgba(255, 255, 255, 0.8)',
        borderRadius: 32,
        boxShadow: '0 32px 96px rgba(30, 27, 75, 0.1), inset 0 2px 8px rgba(255,255,255,0.8)',
        animation: 'slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-block',
            width: 64, height: 64,
            borderRadius: 20,
            background: 'linear-gradient(135deg, #1e1b4b 0%, #6d28d9 100%)',
            boxShadow: '0 16px 40px rgba(109, 40, 217, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            animation: 'float 6s ease-in-out infinite',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            <span style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 26, fontWeight: 800,
              color: '#fff', letterSpacing: '-0.02em'
            }}>K</span>
          </div>
          
          <h1 style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 28, fontWeight: 700,
            letterSpacing: '0.04em',
            background: 'linear-gradient(135deg, #1e1b4b 0%, #6d28d9 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: '0 0 8px 0',
          }}>
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 500,
            color: '#64748b'
          }}>
            {isRegistering ? 'Register to access global intelligence' : 'Sign in to access global intelligence'}
          </p>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {errorMsg && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              color: '#ef4444', padding: '12px 16px', borderRadius: 12,
              fontSize: 13, fontWeight: 500, textAlign: 'center'
            }}>
              {errorMsg}
            </div>
          )}

          {/* Email Input */}
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)',
              color: '#94a3b8', pointerEvents: 'none'
            }}>
              <Mail size={18} />
            </div>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="login-input"
              style={{
                width: '100%',
                padding: '16px 16px 16px 48px',
                background: 'rgba(248, 250, 252, 0.8)',
                border: '1.5px solid rgba(226, 232, 240, 0.9)',
                borderRadius: 18,
                fontSize: 14,
                fontWeight: 500,
                color: '#0f172a',
                outline: 'none',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onFocus={e => {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.borderColor = '#6d28d9';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(109, 40, 217, 0.12)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onBlur={e => {
                e.currentTarget.style.background = 'rgba(248, 250, 252, 0.8)';
                e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.9)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            />
          </div>

          {/* Password Input */}
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)',
              color: '#94a3b8', pointerEvents: 'none'
            }}>
              <Lock size={18} />
            </div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="login-input"
              style={{
                width: '100%',
                padding: '16px 16px 16px 48px',
                background: 'rgba(248, 250, 252, 0.8)',
                border: '1.5px solid rgba(226, 232, 240, 0.9)',
                borderRadius: 18,
                fontSize: 14,
                fontWeight: 500,
                color: '#0f172a',
                outline: 'none',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onFocus={e => {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.borderColor = '#6d28d9';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(109, 40, 217, 0.12)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onBlur={e => {
                e.currentTarget.style.background = 'rgba(248, 250, 252, 0.8)';
                e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.9)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            />
          </div>

          {!isRegistering && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -4 }}>
              <a href="#" style={{ fontSize: 13, fontWeight: 600, color: '#6d28d9', textDecoration: 'none' }}>
                Forgot password?
              </a>
            </div>
          )}

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={isLoading || isSuccess}
            style={{
              width: '100%',
              marginTop: 16,
              padding: '16px',
              borderRadius: 18,
              background: isSuccess ? '#10b981' : 'linear-gradient(135deg, #3730a3 0%, #7c3aed 100%)',
              color: '#fff',
              border: 'none',
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: '0.02em',
              cursor: (isLoading || isSuccess) ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              boxShadow: isSuccess 
                ? '0 16px 32px rgba(16, 185, 129, 0.3)' 
                : '0 16px 32px rgba(109, 40, 217, 0.3)',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              transform: isSuccess ? 'scale(1.02)' : 'scale(1)',
            }}
            onMouseEnter={e => {
              if (!isLoading && !isSuccess) {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 24px 48px rgba(109, 40, 217, 0.4)';
              }
            }}
            onMouseLeave={e => {
              if (!isLoading && !isSuccess) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 16px 32px rgba(109, 40, 217, 0.3)';
              }
            }}
          >
            {isLoading ? (
              <span style={{
                display: 'inline-block',
                width: 18, height: 18,
                border: '2.5px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></span>
            ) : isSuccess ? (
              <>
                <CheckCircle2 size={18} />
                Authenticated
              </>
            ) : (
              <>
                {isRegistering ? 'Sign Up' : 'Sign In'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', opacity: 0.6 }}>
          <div style={{ flex: 1, height: 1, background: '#cbd5e1' }} />
          <span style={{ padding: '0 12px', fontSize: 12, fontWeight: 600, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Or</span>
          <div style={{ flex: 1, height: 1, background: '#cbd5e1' }} />
        </div>

        {/* Google Auth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading || isSuccess}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: 18,
            background: 'rgba(255, 255, 255, 0.9)',
            color: '#334155',
            border: '1.5px solid rgba(226, 232, 240, 0.8)',
            fontSize: 14,
            fontWeight: 600,
            cursor: (isLoading || isSuccess) ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            marginBottom: 12,
          }}
          onMouseEnter={e => {
            if (!isLoading && !isSuccess) {
              e.currentTarget.style.background = '#fff';
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 16px 32px rgba(0, 0, 0, 0.08)';
            }
          }}
          onMouseLeave={e => {
            if (!isLoading && !isSuccess) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
              e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.8)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.04)';
            }
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* Apple Auth Button */}
        <button
          type="button"
          onClick={handleAppleSignIn}
          disabled={isLoading || isSuccess}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: 18,
            background: '#000000',
            color: '#ffffff',
            border: 'none',
            fontSize: 14,
            fontWeight: 600,
            cursor: (isLoading || isSuccess) ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseEnter={e => {
            if (!isLoading && !isSuccess) {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 16px 32px rgba(0, 0, 0, 0.2)';
            }
          }}
          onMouseLeave={e => {
            if (!isLoading && !isSuccess) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.1)';
            }
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.92 14.61c-.02-3.32 2.72-4.91 2.84-4.99-1.54-2.26-3.95-2.57-4.81-2.61-2.06-.21-4.04 1.22-5.09 1.22-1.06 0-2.68-1.19-4.38-1.16-2.22.03-4.27 1.29-5.41 3.28-2.31 4-1.39 10.38.87 13.65 1.1 1.59 2.42 3.37 4.14 3.31 1.66-.07 2.29-1.08 4.31-1.08 2.01 0 2.58 1.08 4.33 1.05 1.79-.03 2.92-1.63 4.02-3.23 1.27-1.85 1.79-3.65 1.81-3.74-.04-.02-3.61-1.38-3.63-5.7zm-2.9-8.47c.92-1.11 1.54-2.66 1.37-4.19-1.32.05-2.93.88-3.87 1.99-.76.88-1.49 2.46-1.29 3.96 1.48.11 2.91-.68 3.79-1.76z"/>
          </svg>
          Continue with Apple
        </button>

        <div style={{
          marginTop: 24, paddingTop: 24,
          borderTop: '1px solid rgba(226, 232, 240, 0.8)',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: 13, color: '#64748b', fontWeight: 500, margin: 0 }}>
            {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button 
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              style={{ 
                background: 'none', border: 'none', padding: 0,
                color: '#6d28d9', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
              }}
            >
              {isRegistering ? 'Sign In' : 'Register Here'}
            </button>
          </p>
        </div>

      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(40px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); box-shadow: 0 16px 40px rgba(109, 40, 217, 0.4); }
          50% { transform: translateY(-6px); box-shadow: 0 24px 48px rgba(109, 40, 217, 0.5); }
        }
        .login-input::placeholder {
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s;
        }
        .login-input:focus::placeholder {
          transform: translateX(6px);
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}
