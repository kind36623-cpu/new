import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AgentProvider } from './contexts/AgentContext';

// ── Lazy-load heavy pages to reduce initial bundle ─────────────────
const LandingPage  = lazy(() => import('./pages/LandingPage'));
const AboutPage    = lazy(() => import('./pages/TrustPages').then(m => ({ default: m.AboutPage })));
const PrivacyPage  = lazy(() => import('./pages/TrustPages').then(m => ({ default: m.PrivacyPage })));
const TermsPage    = lazy(() => import('./pages/TrustPages').then(m => ({ default: m.TermsPage })));
const Dashboard    = lazy(() => import('./pages/Dashboard'));
const MapViewer    = lazy(() => import('./pages/MapViewer'));
const ArticleView  = lazy(() => import('./pages/ArticleView'));
const Onboarding   = lazy(() => import('./pages/Onboarding'));

// ── Minimal full-screen spinner shown during lazy load ─────────────
function PageLoader() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(160deg,#08081a,#0f0c2e,#160a3a)',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: '3px solid rgba(109,40,217,0.2)',
        borderTopColor: '#6d28d9',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Protected route guard ──────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  return children;
}

// ── Public-only route (logged-in users go to /app) ─────────────────
function PublicOnlyRoute({ children }) {
  const { currentUser } = useAuth();
  if (currentUser) return <Navigate to="/app" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AgentProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/about"   element={<AboutPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms"   element={<TermsPage />} />
              <Route path="/login" element={
                <PublicOnlyRoute><Login /></PublicOnlyRoute>
              } />

              {/* ── Onboarding (protected, no app layout) ─ */}
              <Route path="/onboarding" element={
                <ProtectedRoute><Onboarding /></ProtectedRoute>
              } />

              {/* ── Protected app routes under /app ──────── */}
              <Route path="/app" element={
                <ProtectedRoute><Layout /></ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="insight"  element={<Dashboard />} />
                <Route path="map"      element={<MapViewer />} />
                <Route path="article"  element={<ArticleView />} />
                <Route path="security" element={<Dashboard />} />
                <Route path="economic" element={<Dashboard />} />
                <Route path="cultural" element={<Dashboard />} />
                <Route path="sports"   element={<Dashboard />} />
                <Route path="local"    element={<Dashboard />} />
              </Route>

              {/* ── Legacy redirects (old / → /app) ─────── */}
              <Route path="/insight"  element={<Navigate to="/app/insight"  replace />} />
              <Route path="/map"      element={<Navigate to="/app/map"      replace />} />
              <Route path="/article"  element={<Navigate to="/app/article"  replace />} />
              <Route path="/security" element={<Navigate to="/app/security" replace />} />
              <Route path="/economic" element={<Navigate to="/app/economic" replace />} />
              <Route path="/cultural" element={<Navigate to="/app/cultural" replace />} />
              <Route path="/sports"   element={<Navigate to="/app/sports"   replace />} />
              <Route path="/local"    element={<Navigate to="/app/local"    replace />} />

              {/* ── Catch-all ─────────────────────────── */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AgentProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;
