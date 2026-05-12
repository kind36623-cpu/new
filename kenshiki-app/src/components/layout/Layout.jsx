import { Outlet, NavLink } from 'react-router-dom';
import Header from './Header';
import AgentHUD from '../agent/AgentHUD';
import { Globe, Map, FileText, Bookmark, Mic } from 'lucide-react';

// Mobile bottom nav tabs
const MOBILE_TABS = [
  { to: '/app/insight',  icon: Globe,    label: 'Feed'    },
  { to: '/app/map',      icon: Map,      label: 'Radar'   },
  { to: '/app/article',  icon: FileText, label: 'Brief'   },
  { to: '/app/article',  icon: Bookmark, label: 'Saved'   },
];

export default function Layout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc', overflow: 'hidden', fontFamily: "'Inter',sans-serif" }}>
      <Header />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <main style={{ flex: 1, overflowX: 'hidden', overflowY: 'auto', background: '#f4f5f7', display: 'flex', position: 'relative', paddingBottom: 'env(safe-area-inset-bottom, 0)' }}>
          <Outlet />
        </main>
      </div>
      <AgentHUD />

      {/* ── Mobile Bottom Navigation ──────────────────────── */}
      <nav style={{
        display: 'none',
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(226,232,240,0.8)',
        padding: '8px 0 calc(8px + env(safe-area-inset-bottom,0))',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.08)',
      }} className="mobile-bottom-nav">
        {MOBILE_TABS.map(({ to, icon: Icon, label }) => (
          <NavLink key={label} to={to} style={({ isActive }) => ({
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            flex: 1, padding: '6px 0', textDecoration: 'none', transition: 'all .2s',
            color: isActive ? '#6d28d9' : '#94a3b8',
          })}>
            {({ isActive }) => (
              <>
                <div style={{
                  width: 40, height: 32, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isActive ? 'rgba(109,40,217,0.1)' : 'transparent',
                  transition: 'all .2s',
                }}>
                  <Icon size={20} />
                </div>
                <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, letterSpacing: '0.04em' }}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <style>{`
        @media (max-width: 768px) {
          .mobile-bottom-nav { display: flex !important; }
          main { padding-bottom: 72px !important; }
        }
      `}</style>
    </div>
  );
}
