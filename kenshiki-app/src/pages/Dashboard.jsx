import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, MapPin, ArrowRight, Zap, Clock, TrendingUp } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { fetchNewsFeed } from '../services/newsApi';
import { useAgent } from '../contexts/AgentContext';

/* ─── Category meta ─────────────────────────────────────────── */
const CAT_META = {
  world:    { label: 'World',    accent: '#3730a3', light: '#ede9fe', dot: '#6d28d9', grad: 'linear-gradient(135deg,#3730a3,#6d28d9)' },
  security: { label: 'Security', accent: '#5b21b6', light: '#f3f0ff', dot: '#7c3aed', grad: 'linear-gradient(135deg,#5b21b6,#a855f7)' },
  economic: { label: 'Economic', accent: '#065f46', light: '#d1fae5', dot: '#059669', grad: 'linear-gradient(135deg,#065f46,#10b981)' },
  cultural: { label: 'Cultural', accent: '#831843', light: '#fce7f3', dot: '#db2777', grad: 'linear-gradient(135deg,#831843,#ec4899)' },
  sports:   { label: 'Sports',   accent: '#b45309', light: '#fef3c7', dot: '#d97706', grad: 'linear-gradient(135deg,#b45309,#f59e0b)' },
  local:    { label: 'Local',    accent: '#92400e', light: '#fff7ed', dot: '#ea580c', grad: 'linear-gradient(135deg,#92400e,#f97316)' },
};
const VALID_CATEGORIES = new Set(Object.keys(CAT_META));

export default function Dashboard() {
  const [articles, setArticles] = useState([]);
  const [nextPage, setNextPage] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [localQuery, setLocalQuery] = useState(null);
  const observerTarget = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { registerArticles } = useAgent();

  // Strip /app/ prefix to get the category slug
  const rawSlug      = location.pathname.replace(/^\/app\/?/, '') || 'world';
  const categoryPath = VALID_CATEGORIES.has(rawSlug) ? rawSlug : 'world';
  const meta         = CAT_META[categoryPath];

  useEffect(() => { loadNews(categoryPath); }, [categoryPath]);

  // Register article titles into AgentContext for KIRA to read
  useEffect(() => {
    registerArticles(articles.map(a => a.title));
  }, [articles, registerArticles]);

  const loadNews = async (cat) => {
    setLoading(true);
    setNextPage(null);
    setLocalQuery(null);

    if (cat === 'local') {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          try {
            const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
            const data = await res.json();
            const addr = data.address || {};
            const city = addr.city || addr.town || addr.village || addr.suburb || addr.neighbourhood || addr.county || addr.state_district || addr.state || 'Local';
            const query = `"${city}" local news`;
            setLocalQuery(query);
            const result = await fetchNewsFeed('local', query);
            setArticles(result.articles || []);
            setNextPage(result.nextPage || null);
          } catch {
            const result = await fetchNewsFeed('local', 'Local news');
            setArticles(result.articles || []);
            setNextPage(result.nextPage || null);
            setLocalQuery('Local news');
          }
          setLoading(false);
        }, async () => {
          try {
            const ipRes = await fetch('https://ipwho.is/');
            const ipData = await ipRes.json();
            const city = ipData.city || ipData.region || 'Local';
            const query = `"${city}" local news`;
            setLocalQuery(query);
            const result = await fetchNewsFeed('local', query);
            setArticles(result.articles || []);
            setNextPage(result.nextPage || null);
          } catch {
            const result = await fetchNewsFeed('local', 'Local news');
            setArticles(result.articles || []);
            setNextPage(result.nextPage || null);
            setLocalQuery('Local news');
          }
          setLoading(false);
        }, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
        return;
      }
    }
    const result = await fetchNewsFeed(cat);
    setArticles(result.articles || []);
    setNextPage(result.nextPage || null);
    setLoading(false);
  };

  const loadMore = useCallback(async () => {
    if (!nextPage || loadingMore) return;
    setLoadingMore(true);
    try {
      let result;
      if (categoryPath === 'local' && localQuery) {
        result = await fetchNewsFeed('local', localQuery, nextPage);
      } else {
        result = await fetchNewsFeed(categoryPath, null, nextPage);
      }
      if (result && result.articles) {
        setArticles(prev => {
          const existingIds = new Set(prev.map(a => a.id));
          const newArticles = result.articles.filter(a => !existingIds.has(a.id));
          return [...prev, ...newArticles];
        });
        setNextPage(result.nextPage || null);
      }
    } catch (e) {
      console.error("Failed to load more news:", e);
    } finally {
      setLoadingMore(false);
    }
  }, [nextPage, loadingMore, categoryPath, localQuery]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && nextPage && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [nextPage, loadingMore, loadMore]);

  const calcRead   = (item) => Math.max(2, Math.ceil((item?.description?.length || 200) / 100));
  const openArticle = (item) => navigate('/app/article', { state: { article: item } });

  const getRelTime = (d) => {
    if (!d) return '';
    const min = Math.floor(Math.max(0, Date.now() - new Date(d)) / 60000);
    if (min < 60) return `${min}m ago`;
    const h = Math.floor(min / 60);
    if (h  < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const isBreaking = (d) => {
    if (!d) return false;
    return (Date.now() - new Date(d)) / 3600000 <= 7;
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', background: '#f4f5f7', fontFamily: "'Inter', 'Outfit', sans-serif", overflowY: 'auto' }}>
      <div style={{ width: '100%', maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: '100%', paddingBottom: 80 }}>

        {/* ══ Page Hero Header ═══════════════════════════════════ */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 30,
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(226,232,240,0.7)',
          boxShadow: '0 4px 32px rgba(0,0,0,0.03)',
          padding: '20px 40px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Left: live dot + category name in Cinzel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: meta.dot,
                boxShadow: `0 0 8px ${meta.dot}`,
                animation: 'livePulse 1.8s ease-in-out infinite',
                display: 'inline-block',
              }} />
              <span style={{
                fontSize: 10, fontWeight: 800, letterSpacing: '0.22em',
                color: '#94a3b8', textTransform: 'uppercase',
              }}>Live Intelligence Feed</span>
            </div>

            {/* Cinzel category title — matching logo style */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{
                fontFamily: "'Cinzel', 'Trajan Pro', serif",
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: '0.06em',
                background: meta.grad,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: `drop-shadow(0 1px 3px ${meta.accent}22)`,
                lineHeight: 1,
              }}>
                {meta.label}
              </span>
              <span style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 26,
                fontWeight: 400,
                letterSpacing: '0.10em',
                background: 'linear-gradient(135deg,#94a3b8,#64748b)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                lineHeight: 1,
              }}>Sector</span>
            </div>
          </div>

          {/* Right: article count pill + refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {!loading && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 20,
                background: '#f1f5f9', border: '1px solid #e2e8f0',
                fontSize: 11, fontWeight: 800, color: '#64748b',
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                <TrendingUp size={11} />
                {articles.length} stories
              </div>
            )}
            <button
              onClick={() => loadNews(categoryPath)}
              disabled={loading}
              title="Refresh Feed"
              style={{
                width: 42, height: 42, borderRadius: 13, border: '1.5px solid #e2e8f0',
                background: '#fff', color: '#64748b', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)', transition: 'all 0.2s',
                opacity: loading ? 0.5 : 1,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = meta.dot; e.currentTarget.style.color = meta.accent; e.currentTarget.style.boxShadow = `0 4px 16px ${meta.dot}30`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; }}
            >
              <RefreshCw size={17} style={{ animation: loading ? 'spinAnim 0.8s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>
        {/* ══ Category Filter Strip ════════════════════════════════ */}
        <div style={{
          padding: '20px 40px 20px',
          display: 'flex', alignItems: 'center', gap: 10,
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          {Object.entries(CAT_META).map(([slug, m]) => {
            const isActive = slug === categoryPath;
            const to = slug === 'world' ? '/app/insight' : `/app/${slug}`;
            return (
              <Link
                key={slug}
                to={to}
                style={{ textDecoration: 'none', flexShrink: 0 }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: isActive ? '8px 20px' : '7px 18px',
                  borderRadius: 26,
                  background: isActive ? m.grad : '#fff',
                  border: isActive ? 'none' : `1.5px solid ${m.dot}28`,
                  boxShadow: isActive
                    ? `0 6px 20px -4px ${m.dot}55, 0 2px 6px -2px ${m.dot}30`
                    : '0 1px 4px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.22s cubic-bezier(.22,1,.36,1)',
                }}>
                  {/* Dot */}
                  <span style={{
                    width: isActive ? 7 : 6,
                    height: isActive ? 7 : 6,
                    borderRadius: '50%',
                    background: isActive ? 'rgba(255,255,255,0.9)' : m.dot,
                    display: 'inline-block',
                    boxShadow: isActive ? '0 0 8px rgba(255,255,255,0.7)' : `0 0 6px ${m.dot}99`,
                    animation: isActive ? 'livePulse 1.8s ease-in-out infinite' : 'none',
                    flexShrink: 0,
                    transition: 'all 0.22s',
                  }} />
                  {/* Label */}
                  <span style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: isActive ? 11 : 10.5,
                    fontWeight: isActive ? 700 : 600,
                    letterSpacing: '0.13em',
                    textTransform: 'uppercase',
                    color: isActive ? '#fff' : m.accent,
                    transition: 'all 0.22s',
                  }}>{m.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* ══ Content ════════════════════════════════════════════ */}
        <div style={{ padding: '32px 40px', flex: 1 }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 420, gap: 28 }}>
              {/* Spinner */}
              <div style={{ position: 'relative', width: 56, height: 56 }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid #f1f5f9' }} />
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid transparent', borderTopColor: meta.accent, borderRightColor: meta.dot, animation: 'spinAnim 0.9s linear infinite' }} />
                <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', border: '2px solid transparent', borderBottomColor: `${meta.dot}80`, animation: 'spinAnim 0.6s linear infinite reverse' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: 14, fontWeight: 600, letterSpacing: '0.16em', color: '#94a3b8', textTransform: 'uppercase' }}>
                  Synchronizing {meta.label} Feed
                </div>
              </div>
              {/* Skeleton cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, width: '100%', maxWidth: 900 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ height: 220, borderRadius: 20, background: 'linear-gradient(90deg,#f1f5f9 25%,#e8edf2 50%,#f1f5f9 75%)', backgroundSize: '400% 100%', animation: `shimmer 1.5s ${i * 0.15}s infinite` }} />
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22, alignItems: 'start' }}>
              {articles.map((item, idx) => {
                const isHero     = idx === 0;
                const breaking   = isBreaking(item.publishedAt);
                const readTime   = calcRead(item);
                const relTime    = getRelTime(item.publishedAt);

                return (
                  <article
                    key={item.id}
                    style={{
                      gridColumn: isHero ? '1 / -1' : 'span 1',
                      position: 'relative',
                      borderRadius: isHero ? 28 : 22,
                      background: '#fff',
                      border: '1px solid #e8edf2',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: isHero ? 'row' : 'column',
                      minHeight: isHero ? 320 : 0,
                      transition: 'transform 0.28s cubic-bezier(.22,1,.36,1), box-shadow 0.28s',
                      cursor: 'default',
                      boxShadow: '0 2px 20px rgba(0,0,0,0.05)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = `0 20px 48px -8px rgba(0,0,0,0.12), 0 0 0 1.5px ${meta.dot}30`;
                      const img = e.currentTarget.querySelector('.card-img');
                      if (img) img.style.transform = 'scale(1.06)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 20px rgba(0,0,0,0.05)';
                      const img = e.currentTarget.querySelector('.card-img');
                      if (img) img.style.transform = 'scale(1)';
                    }}
                  >
                    {/* Ambient gradient orb */}
                    <div style={{
                      position: 'absolute',
                      width: isHero ? 600 : 280,
                      height: isHero ? 600 : 280,
                      borderRadius: '50%',
                      top: isHero ? -180 : -120,
                      right: isHero ? -120 : -80,
                      background: meta.grad,
                      opacity: 0.06,
                      filter: 'blur(60px)',
                      pointerEvents: 'none',
                    }} />

                    {/* ── Card Thumbnail (Hero or Regular) ── */}
                    <div style={{
                      width: isHero ? 440 : '100%',
                      paddingTop: isHero ? 0 : '56.25%', /* 16:9 aspect ratio for regular cards */
                      height: isHero ? '100%' : 0,
                      flexShrink: 0,
                      position: 'relative',
                      overflow: 'hidden',
                      background: item.thumbnail ? 'transparent' : meta.light,
                      minHeight: isHero ? 320 : 0,
                    }}>
                      {item.thumbnail ? (
                        <>
                          <img
                            className="card-img"
                            src={item.thumbnail}
                            alt=""
                            style={{
                              position: 'absolute', inset: 0,
                              width: '100%', height: '100%',
                              objectFit: 'cover',
                              transition: 'transform 0.55s cubic-bezier(.22,1,.36,1)',
                            }}
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                          {/* Bottom fade overlay */}
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: isHero
                              ? 'linear-gradient(to right, rgba(0,0,0,0.04) 0%, transparent 70%)'
                              : 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 40%, transparent 100%)'
                          }} />
                          {/* Top gradient for badge legibility */}
                          {!isHero && (
                            <div style={{
                              position: 'absolute', top: 0, left: 0, right: 0, height: 64,
                              background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 100%)'
                            }} />
                          )}
                          {/* Overlaid badges on image */}
                          {!isHero && (
                            <div style={{
                              position: 'absolute', top: 12, left: 12, right: 12,
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}>
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '3px 10px', borderRadius: 20,
                                background: 'rgba(255,255,255,0.18)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(255,255,255,0.25)',
                              }}>
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', display: 'inline-block', opacity: 0.9 }} />
                                <span style={{
                                  fontSize: 8, fontWeight: 800, letterSpacing: '0.14em',
                                  textTransform: 'uppercase', color: '#fff',
                                  fontFamily: "'Cinzel', serif",
                                }}>{meta.label}</span>
                              </div>
                              {breaking && (
                                <div style={{
                                  display: 'flex', alignItems: 'center', gap: 4,
                                  padding: '3px 9px', borderRadius: 20,
                                  background: 'rgba(244,63,94,0.88)',
                                  backdropFilter: 'blur(8px)',
                                  border: '1px solid rgba(255,100,120,0.4)',
                                }}>
                                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'livePulse 1.2s ease-in-out infinite' }} />
                                  <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' }}>Breaking</span>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        /* ── Stylish placeholder when no image ── */
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: `linear-gradient(135deg, ${meta.light} 0%, #fff 100%)`,
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center', gap: 10,
                        }}>
                          <div style={{
                            width: isHero ? 64 : 48,
                            height: isHero ? 64 : 48,
                            borderRadius: '50%',
                            background: meta.grad,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: `0 8px 24px ${meta.dot}40`,
                          }}>
                            <span style={{ fontFamily: "'Cinzel', serif", fontSize: isHero ? 24 : 18, fontWeight: 800, color: '#fff' }}>
                              {meta.label.charAt(0)}
                            </span>
                          </div>
                          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: meta.accent, opacity: 0.7 }}>
                            {meta.label} Intelligence
                          </span>
                        </div>
                      )}
                    </div>

                    {/* ── Card Content ── */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: isHero ? '36px 40px' : '24px', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                      <div>
                        {/* Badge / meta row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {/* Category chip — always visible for hero; for cards acts as fallback label */}
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '4px 12px', borderRadius: 20,
                              background: meta.light,
                              border: `1px solid ${meta.accent}20`,
                            }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: meta.dot, display: 'inline-block' }} />
                              <span style={{
                                fontSize: 9, fontWeight: 800, letterSpacing: '0.14em',
                                textTransform: 'uppercase', color: meta.accent,
                                fontFamily: "'Cinzel', serif",
                              }}>{meta.label}</span>
                            </div>

                            {/* Breaking badge — only on hero (non-hero gets image overlay badge) */}
                            {breaking && isHero && (
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '4px 10px', borderRadius: 20,
                                background: '#fff1f2', border: '1px solid #fecdd3',
                              }}>
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f43f5e', animation: 'livePulse 1.2s ease-in-out infinite', display: 'inline-block' }} />
                                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#e11d48' }}>Breaking</span>
                              </div>
                            )}
                          </div>

                          {/* Time + read badges */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {relTime && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                <Clock size={10} />{relTime}
                              </span>
                            )}
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                              <Zap size={10} />{readTime}m
                            </span>
                          </div>
                        </div>

                        {/* Title */}
                        <h3 style={{
                          fontSize: isHero ? 28 : 17,
                          fontWeight: 800,
                          color: '#0f172a',
                          lineHeight: 1.25,
                          letterSpacing: isHero ? '-0.025em' : '-0.015em',
                          marginBottom: 12,
                          transition: 'color 0.2s',
                          fontFamily: "'Inter', sans-serif",
                        }}>
                          {item.title}
                        </h3>

                        {/* Description */}
                        <p style={{
                          fontSize: isHero ? 14.5 : 13.5,
                          color: '#64748b',
                          lineHeight: 1.7,
                          display: '-webkit-box',
                          WebkitLineClamp: isHero ? 3 : 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          fontWeight: 450,
                          marginBottom: 0,
                        }}>
                          {item.description}
                        </p>
                      </div>

                      {/* ── Footer dock ── */}
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginTop: 24, paddingTop: 18,
                        borderTop: '1px solid #f1f5f9',
                      }}>
                        {/* Source pill */}
                        <div style={{
                          fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
                          color: '#94a3b8', background: '#f8fafc', border: '1px solid #e8edf2',
                          padding: '5px 12px', borderRadius: 20,
                          fontFamily: "'Cinzel', serif",
                        }}>
                          {item.source}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {/* Map button */}
                          <button
                            onClick={() => navigate('/app/map', { state: { targetArticle: item } })}
                            title="Locate on Map"
                            style={{
                              width: 38, height: 38, borderRadius: 12,
                              background: '#f8fafc', border: '1.5px solid #e2e8f0',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', color: '#94a3b8',
                              transition: 'all 0.18s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = meta.dot; e.currentTarget.style.color = meta.accent; e.currentTarget.style.background = meta.light; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = '#f8fafc'; }}
                          >
                            <MapPin size={16} />
                          </button>

                          {/* CTA */}
                          <button
                            onClick={() => openArticle(item)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 7,
                              padding: isHero ? '10px 22px' : '9px 18px',
                              borderRadius: 13, border: 'none', cursor: 'pointer',
                              background: meta.grad,
                              color: '#fff',
                              fontSize: isHero ? 13 : 12,
                              fontWeight: 700, letterSpacing: '0.01em',
                              boxShadow: `0 6px 20px -4px ${meta.dot}50`,
                              transition: 'all 0.22s',
                              fontFamily: "'Inter', sans-serif",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = `0 10px 28px -4px ${meta.dot}70`; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 6px 20px -4px ${meta.dot}50`; }}
                          >
                            Intelligence Brief <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Infinite Scroll Observer Target */}
          {nextPage && (
            <div ref={observerTarget} style={{ height: 40, marginTop: 20, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {loadingMore && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <RefreshCw size={16} style={{ animation: 'spinAnim 0.8s linear infinite', color: meta.accent }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: meta.accent, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Loading more...
                  </span>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.75); }
        }
        @keyframes spinAnim {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0%   { background-position: -400% 0; }
          100% { background-position: 400% 0; }
        }
      `}</style>
    </div>
  );
}
