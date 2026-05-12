import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, CheckCircle2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import DotWaveBackground from '../components/ui/DotWaveBackground';
import { useAuth } from '../contexts/AuthContext';

// mode: 'login' | 'register' | 'forgot'
export default function Login() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState(searchParams.get('signup') === '1' ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();
  const { login, signup, loginWithGoogle, resetPassword } = useAuth();

  // Switch mode resets messages
  const switchMode = (newMode) => {
    setMode(newMode);
    setErrorMsg('');
    setSuccessMsg('');
    setPassword('');
    setConfirmPassword('');
  };

  // Friendly Firebase error messages
  const friendlyError = (code) => {
    const map = {
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/invalid-credential': 'Invalid email or password.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/too-many-requests': 'Too many attempts. Please wait a moment.',
      'auth/network-request-failed': 'Network error. Check your connection.',
    };
    return map[code] || 'Something went wrong. Please try again.';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (mode === 'forgot') {
      if (!email) { setErrorMsg('Please enter your email address.'); return; }
      setIsLoading(true);
      try {
        await resetPassword(email);
        setSuccessMsg('Password reset link sent! Check your inbox (and spam folder).');
      } catch (err) {
        setErrorMsg(friendlyError(err.code));
      }
      setIsLoading(false);
      return;
    }

    if (mode === 'register') {
      if (password.length < 6) { setErrorMsg('Password must be at least 6 characters.'); return; }
      if (password !== confirmPassword) { setErrorMsg('Passwords do not match.'); return; }
    }

    setIsLoading(true);
    try {
      if (mode === 'register') {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      setIsSuccess(true);
      setTimeout(() => navigate('/app'), 800);
    } catch (err) {
      setErrorMsg(friendlyError(err.code));
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      await loginWithGoogle();
      setIsSuccess(true);
      setTimeout(() => navigate('/app'), 800);
    } catch (err) {
      setErrorMsg(friendlyError(err.code));
      setIsLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '16px 16px 16px 48px',
    background: 'rgba(248,250,252,0.8)',
    border: '1.5px solid rgba(226,232,240,0.9)',
    borderRadius: 18, fontSize: 14, fontWeight: 500,
    color: '#0f172a', outline: 'none',
    transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
    boxSizing: 'border-box',
  };
  const inputFocus = (e) => {
    e.currentTarget.style.background = '#fff';
    e.currentTarget.style.borderColor = '#6d28d9';
    e.currentTarget.style.boxShadow = '0 4px 16px rgba(109,40,217,0.12)';
    e.currentTarget.style.transform = 'translateY(-2px)';
  };
  const inputBlur = (e) => {
    e.currentTarget.style.background = 'rgba(248,250,252,0.8)';
    e.currentTarget.style.borderColor = 'rgba(226,232,240,0.9)';
    e.currentTarget.style.boxShadow = 'none';
    e.currentTarget.style.transform = 'translateY(0)';
  };

  const iconStyle = {
    position: 'absolute', left: 18, top: '50%',
    transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none',
  };

  return (
    <div style={{
      position: 'relative', minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <DotWaveBackground />

      {/* Back to home */}
      <Link to="/" style={{
        position: 'absolute', top: 24, left: 24, zIndex: 20,
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 13, fontWeight: 600, color: '#64748b',
        textDecoration: 'none', padding: '8px 14px', borderRadius: 20,
        background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(226,232,240,0.8)',
        transition: 'all 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.color = '#6d28d9'; e.currentTarget.style.borderColor = '#6d28d9'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = 'rgba(226,232,240,0.8)'; }}
      >
        <ArrowLeft size={14} /> Home
      </Link>

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: 440, margin: '0 24px',
        padding: '48px 40px',
        background: 'linear-gradient(145deg,rgba(255,255,255,0.9),rgba(255,255,255,0.6))',
        backdropFilter: 'blur(48px)', WebkitBackdropFilter: 'blur(48px)',
        border: '1px solid rgba(255,255,255,0.8)', borderRadius: 32,
        boxShadow: '0 32px 96px rgba(30,27,75,0.1),inset 0 2px 8px rgba(255,255,255,0.8)',
        animation: 'slideUpFade 0.6s cubic-bezier(0.16,1,0.3,1)',
      }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64, borderRadius: 20, margin: '0 auto 20px',
            background: 'linear-gradient(135deg,#1e1b4b,#6d28d9)',
            boxShadow: '0 16px 40px rgba(109,40,217,0.4)',
            animation: 'float 6s ease-in-out infinite',
          }}>
            <span style={{ fontFamily:"'Cinzel',serif", fontSize: 26, fontWeight: 800, color: '#fff' }}>K</span>
          </div>
          <h1 style={{
            fontFamily: "'Cinzel',serif", fontSize: 26, fontWeight: 700,
            letterSpacing: '0.04em', margin: '0 0 8px',
            background: 'linear-gradient(135deg,#1e1b4b,#6d28d9)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            {mode === 'forgot' ? 'Reset Password' : mode === 'register' ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: '#64748b', fontWeight: 500 }}>
            {mode === 'forgot'
              ? 'Enter your email and we\'ll send a reset link'
              : mode === 'register'
              ? 'Join Kenshiki — access global intelligence'
              : 'Sign in to access global intelligence'}
          </p>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div role="alert" style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            color: '#dc2626', padding: '12px 16px', borderRadius: 12,
            fontSize: 13, fontWeight: 500, textAlign: 'center', marginBottom: 16,
          }}>
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div role="status" style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            color: '#16a34a', padding: '12px 16px', borderRadius: 12,
            fontSize: 13, fontWeight: 500, textAlign: 'center', marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <CheckCircle2 size={16} /> {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Email */}
          <div style={{ position: 'relative' }}>
            <label htmlFor="email" style={{ display: 'none' }}>Email Address</label>
            <div style={iconStyle}><Mail size={18} /></div>
            <input
              id="email"
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              aria-label="Email Address"
              style={inputStyle}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </div>

          {/* Password (hidden in forgot mode) */}
          {mode !== 'forgot' && (
            <div style={{ position: 'relative' }}>
              <label htmlFor="password" style={{ display: 'none' }}>Password</label>
              <div style={iconStyle}><Lock size={18} /></div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password (min. 6 characters)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                aria-label="Password"
                style={{ ...inputStyle, paddingRight: 48 }}
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#94a3b8', padding: 4, display: 'flex',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          )}

          {/* Confirm password (register only) */}
          {mode === 'register' && (
            <div style={{ position: 'relative' }}>
              <label htmlFor="confirmPassword" style={{ display: 'none' }}>Confirm Password</label>
              <div style={iconStyle}><Lock size={18} /></div>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                aria-label="Confirm Password"
                style={inputStyle}
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
            </div>
          )}

          {/* Forgot password link (login only) */}
          {mode === 'login' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -4 }}>
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  fontSize: 13, fontWeight: 600, color: '#6d28d9',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || isSuccess}
            aria-label={mode === 'forgot' ? 'Send reset link' : mode === 'register' ? 'Create account' : 'Sign in'}
            style={{
              width: '100%', marginTop: 8,
              padding: '16px',
              borderRadius: 18,
              background: isSuccess
                ? '#10b981'
                : 'linear-gradient(135deg,#3730a3,#7c3aed)',
              color: '#fff', border: 'none', fontSize: 15, fontWeight: 600,
              letterSpacing: '0.02em', cursor: isLoading || isSuccess ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: isSuccess ? '0 12px 32px rgba(16,185,129,0.3)' : '0 12px 32px rgba(109,40,217,0.3)',
              transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
            }}
            onMouseEnter={e => {
              if (!isLoading && !isSuccess) {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 20px 48px rgba(109,40,217,0.4)';
              }
            }}
            onMouseLeave={e => {
              if (!isLoading && !isSuccess) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(109,40,217,0.3)';
              }
            }}
          >
            {isLoading ? (
              <span style={{
                display: 'inline-block', width: 18, height: 18,
                border: '2.5px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff', borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
            ) : isSuccess ? (
              <><CheckCircle2 size={18} /> Authenticated</>
            ) : (
              <>
                {mode === 'forgot' ? 'Send Reset Link' : mode === 'register' ? 'Create Account' : 'Sign In'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Back to login (forgot mode) */}
        {mode === 'forgot' && (
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => switchMode('login')}
              style={{
                background: 'none', border: 'none', padding: 0,
                fontSize: 13, fontWeight: 600, color: '#6d28d9',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              ← Back to Sign In
            </button>
          </div>
        )}

        {/* OAuth (login/register only) */}
        {mode !== 'forgot' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', opacity: 0.6 }}>
              <div style={{ flex: 1, height: 1, background: '#cbd5e1' }} />
              <span style={{ padding: '0 12px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Or</span>
              <div style={{ flex: 1, height: 1, background: '#cbd5e1' }} />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading || isSuccess}
              aria-label="Continue with Google"
              style={{
                width: '100%', padding: '14px',
                borderRadius: 18, background: 'rgba(255,255,255,0.9)',
                color: '#334155', border: '1.5px solid rgba(226,232,240,0.8)',
                fontSize: 14, fontWeight: 600,
                cursor: isLoading || isSuccess ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (!isLoading && !isSuccess) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; } }}
              onMouseLeave={e => { if (!isLoading && !isSuccess) { e.currentTarget.style.background = 'rgba(255,255,255,0.9)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; } }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            {/* Terms */}
            {mode === 'register' && (
              <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
                By creating an account you agree to our{' '}
                <a href="#" style={{ color: '#6d28d9', fontWeight: 600, textDecoration: 'none' }}>Terms of Service</a>
                {' '}and{' '}
                <a href="#" style={{ color: '#6d28d9', fontWeight: 600, textDecoration: 'none' }}>Privacy Policy</a>.
              </p>
            )}
          </>
        )}

        {/* Toggle login / register */}
        {mode !== 'forgot' && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(226,232,240,0.8)', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#64748b', fontWeight: 500, margin: 0 }}>
              {mode === 'register' ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => switchMode(mode === 'register' ? 'login' : 'register')}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  color: '#6d28d9', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {mode === 'register' ? 'Sign In' : 'Register Free'}
              </button>
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(40px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes float {
          0%,100% { transform: translateY(0); box-shadow: 0 16px 40px rgba(109,40,217,0.4); }
          50%      { transform: translateY(-6px); box-shadow: 0 24px 48px rgba(109,40,217,0.5); }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
    </div>
  );
}
