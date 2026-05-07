import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import MapViewer from './pages/MapViewer';
import ArticleView from './pages/ArticleView';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AgentProvider } from './contexts/AgentContext';

function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AgentProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={
              <ProtectedRoute><Onboarding /></ProtectedRoute>
            } />
            <Route path="/" element={
              <ProtectedRoute><Layout /></ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="map" element={<MapViewer />} />
              <Route path="insight" element={<Dashboard />} />
              <Route path="article" element={<ArticleView />} />
              <Route path="security" element={<Dashboard />} />
              <Route path="economic" element={<Dashboard />} />
              <Route path="cultural" element={<Dashboard />} />
              <Route path="sports" element={<Dashboard />} />
              <Route path="local" element={<Dashboard />} />
            </Route>
          </Routes>
        </AgentProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;
