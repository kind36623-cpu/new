import React, { useRef, useState, useCallback, useEffect } from 'react';
import Map, { NavigationControl, Source, Marker, Popup } from 'react-map-gl/maplibre';
import { useLocation } from 'react-router-dom';
import {
  MapPin, Globe, Search, X, Loader2, Navigation,
  Newspaper, Info, ChevronDown, ExternalLink, Clock,
  Camera, Star, Lightbulb, Activity, Telescope,
  Plus, Minus, Compass, Layers
} from 'lucide-react';
import { getArticleIntelligence } from '../services/newsApi';
import { useAgent } from '../contexts/AgentContext';
import 'maplibre-gl/dist/maplibre-gl.css';




const SATELLITE_STYLE = {
  version: 8,
  sources: { 
    satellite: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256 },
    roads: { type: 'raster', tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}'], tileSize: 256 },
    labels: { type: 'raster', tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'], tileSize: 256 }
  },
  layers: [
    { id: 'satellite-layer', type: 'raster', source: 'satellite' },
    { id: 'roads-layer', type: 'raster', source: 'roads' },
    { id: 'labels-layer', type: 'raster', source: 'labels' }
  ],
};

const STREET_STYLE = {
  version: 8,
  sources: { 
    street: { 
      type: 'raster', 
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'], 
      tileSize: 256,
      attribution: '© Esri — Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom'
    } 
  },
  layers: [{ id: 'street-layer', type: 'raster', source: 'street' }],
};

// ── Data helpers ──────────────────────────────────────────────────────────────
async function fetchSerperImage(query) {
  try {
    const key = import.meta.env.VITE_SERPER_API_KEY;
    if (!key) return null;
    const res = await fetch('https://google.serper.dev/images', {
      method: 'POST',
      headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: 1 })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.images?.[0]?.imageUrl || null;
  } catch {
    return null;
  }
}

async function fetchGoogleNews(placeName) {
  try {
    const rss = `https://news.google.com/rss/search?q=${encodeURIComponent(placeName)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(rss)}`);
    const text = await res.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');
    const items = Array.from(xmlDoc.querySelectorAll('item')).slice(0, 12);
    const parsedItems = items.map(item => {
      const desc = item.querySelector('description')?.textContent || '';
      const imgMatch = desc.match(/img[^>]+src="([^">]+)"/);
      return {
        title: item.querySelector('title')?.textContent || 'Analysis Insight',
        link: item.querySelector('link')?.textContent || '#',
        pubDate: item.querySelector('pubDate')?.textContent || new Date().toISOString(),
        author: item.querySelector('source')?.textContent || 'Google News',
        thumbnail: imgMatch ? imgMatch[1] : null,
      };
    });
    await Promise.all(parsedItems.map(async (item) => {
      if (!item.thumbnail) {
        item.thumbnail = await fetchSerperImage(item.title);
      }
    }));
    return parsedItems;
  } catch (e) { console.error(e); return []; }
}

// Batch-fetch Wikipedia thumbnails for many titles in ONE API call (fast & reliable)
async function fetchWikiThumbsBatch(titles) {
  try {
    const joined = titles.map(t => encodeURIComponent(t)).join('|');
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&titles=${joined}&format=json&origin=*&pithumbsize=500&pilimit=50`;
    const res = await fetch(url);
    const data = await res.json();
    const pages = data.query?.pages || {};
    // build title -> imageUrl map
    const map = {};
    Object.values(pages).forEach(p => {
      if (p.thumbnail?.source) map[p.title] = p.thumbnail.source;
    });
    return map;
  } catch { return {}; }
}

// Rich Dive Deep data: Wikipedia summary + tourist attractions with batch images + travel articles
async function fetchDiveDeep(placeName, lat, lon) {
  try {
    // 1. Main Wikipedia summary
    let summary = null;
    const sr = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(placeName)}`);
    if (sr.ok) summary = await sr.json();
    if (!summary || summary.type === 'disambiguation') {
      const s2 = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(placeName)}&format=json&origin=*&srlimit=1`);
      const sd = await s2.json();
      const t = sd.query?.search?.[0]?.title;
      if (t) {
        const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t)}`);
        if (r.ok) summary = await r.json();
      }
    }

    // 2. Geosearch nearby places + batch-fetch all images in ONE request
    let attractions = [];
    if (lat && lon) {
      const nr = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gsradius=30000&gscoord=${lat}|${lon}&gslimit=25&format=json&origin=*`
      );
      const nd = await nr.json();
      const raw = nd.query?.geosearch || [];
      const slice = raw.slice(0, 15); // take top 15

      // One batch call for all 15 images
      const titles = slice.map(p => p.title);
      const thumbMap = await fetchWikiThumbsBatch(titles);

      attractions = slice.map(place => ({
        ...place,
        thumbnail: thumbMap[place.title] || null,
        wikiUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(place.title)}`,
      }));

      await Promise.all(attractions.map(async (a) => {
        if (!a.thumbnail) {
          a.thumbnail = await fetchSerperImage(`${a.title} ${placeName} landmark`);
        }
      }));
    }

    // 3. Travel articles from Google News RSS (try both proxies)
    let travelArticles = [];
    const tryFetchRSS = async (query) => {
      const rss = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
      const proxies = [
        `https://corsproxy.io/?url=${encodeURIComponent(rss)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(rss)}`,
      ];
      for (const proxy of proxies) {
        try {
          const res = await fetch(proxy);
          if (!res.ok) continue;
          const text = await res.text();
          const parser = new DOMParser();
          const xml = parser.parseFromString(text, 'text/xml');
          const items = Array.from(xml.querySelectorAll('item')).slice(0, 12);
          const parsed = items.map(item => {
            const desc = item.querySelector('description')?.textContent || '';
            const imgMatch = desc.match(/img[^>]+src="([^">]+)"/);
            return {
              title: item.querySelector('title')?.textContent || '',
              link: item.querySelector('link')?.textContent || '#',
              pubDate: item.querySelector('pubDate')?.textContent || '',
              source: item.querySelector('source')?.textContent || 'Travel News',
              thumbnail: imgMatch ? imgMatch[1] : null,
            };
          }).filter(a => a.title.length > 5);
          if (parsed.length > 0) return parsed;
        } catch { /* try next proxy */ }
      }
      return [];
    };

    travelArticles = await tryFetchRSS(`${placeName} tourist attractions travel guide`);
    if (travelArticles.length < 3) {
      const more = await tryFetchRSS(`visit ${placeName} tourism`);
      travelArticles = [...travelArticles, ...more].slice(0, 12);
    }

    await Promise.all(travelArticles.map(async (art) => {
      if (!art.thumbnail) {
        art.thumbnail = await fetchSerperImage(art.title);
      }
    }));

    // 4. Hotels using Nominatim OSM
    let hotels = [];
    try {
      const hRes = await fetch(`https://nominatim.openstreetmap.org/search?q=hotel+in+${encodeURIComponent(placeName)}&format=json&limit=4`);
      if (hRes.ok) {
        hotels = await hRes.json();
        await Promise.all(hotels.map(async (h) => {
          h.thumbnail = await fetchSerperImage(`${h.name} ${placeName} hotel exterior`);
        }));
      }
    } catch {}

    // 5. Restaurants using Nominatim OSM
    let restaurants = [];
    try {
      const rRes = await fetch(`https://nominatim.openstreetmap.org/search?q=restaurant+in+${encodeURIComponent(placeName)}&format=json&limit=4`);
      if (rRes.ok) {
        restaurants = await rRes.json();
        await Promise.all(restaurants.map(async (r) => {
          r.thumbnail = await fetchSerperImage(`${r.name} ${placeName} restaurant food styling`);
        }));
      }
    } catch {}

    return { summary, attractions, travelArticles, hotels, restaurants };
  } catch { return { summary: null, attractions: [], travelArticles: [], hotels: [], restaurants: [] }; }
}

// ── Search Bar ────────────────────────────────────────────────────────────────
function MapSearchBar({ mapRef, onPlaceSelect }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6`, { headers: { 'Accept-Language': 'en' } });
        setSuggestions(await res.json());
      } catch { setSuggestions([]); } finally { setLoading(false); }
    }, 350);
  }, [query]);

  const handleSelect = (lat, lon, displayName) => {
    const name = displayName.split(',')[0];
    mapRef.current?.getMap()?.flyTo({ center: [parseFloat(lon), parseFloat(lat)], zoom: 13, pitch: 55, bearing: 15, duration: 3000, essential: true });
    setSuggestions([]); setQuery(name); setFocused(false); inputRef.current?.blur();
    onPlaceSelect?.({ name, displayName, lat: parseFloat(lat), lon: parseFloat(lon) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    if (suggestions.length > 0) { const s = suggestions[0]; handleSelect(s.lat, s.lon, s.display_name); return; }
    setLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
      const data = await res.json();
      if (data.length > 0) handleSelect(data[0].lat, data[0].lon, data[0].display_name);
    } catch { } finally { setLoading(false); }
  };

  const hasSug = focused && suggestions.length > 0;

  return (
    <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 100, width: 'min(580px, calc(100vw - 40px))', fontFamily: "'Inter',Arial,sans-serif" }}>
      <div style={{
        padding: '2.5px',
        borderRadius: hasSug ? '26.5px' : '26.5px',
        background: 'linear-gradient(135deg, #1e1b4b, #3730a3, #6d28d9, #7c3aed, #a855f7, #6d28d9, #3730a3)',
        backgroundSize: '200% 200%',
        animation: 'gradientShift 3.5s linear infinite',
        boxShadow: focused ? '0 8px 32px rgba(109, 40, 217, 0.45)' : '0 2px 16px rgba(55,48,163,0.25)',
        transition: 'all .3s',
      }}>
        <div style={{ background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', padding: '0 16px', height: 52, gap: 10, flexShrink: 0 }}>
            <Search size={20} style={{ color: focused ? '#4285F4' : '#9aa0a6', flexShrink: 0 }} />
            <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 150)} placeholder="Search places, cities, landmarks..." style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 16, color: '#202124', fontFamily: 'inherit' }} />
            {loading ? <Loader2 size={18} style={{ color: '#4285F4', animation: 'spin 1s linear infinite' }} /> : query ? <button type="button" onClick={() => { setQuery(''); setSuggestions([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#70757a', display: 'flex', padding: 4 }}><X size={18} /></button> : null}
            <div style={{ width: 1, height: 24, background: '#dfe1e5' }} />
            <button type="submit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4285F4', display: 'flex', padding: 6, borderRadius: '50%' }}><Navigation size={18} /></button>
          </form>
          {hasSug && (
            <div style={{ borderTop: '1px solid #e8eaed' }}>
              {suggestions.map((item, i) => (
                <button key={item.place_id} type="button" onMouseDown={() => handleSelect(item.lat, item.lon, item.display_name)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f1f3f4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MapPin size={16} style={{ color: '#70757a' }} />
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#202124', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.display_name.split(',')[0]}</div>
                    <div style={{ fontSize: 12, color: '#70757a', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.display_name.split(',').slice(1).join(',').trim()}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── News Feed Panel ───────────────────────────────────────────────────────────
function NewsFeedPanel({ place, onClose, onDragStart, onDragMove, onDragEnd }) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!place) return;
    setLoading(true); setError(null); setNews([]);
    fetchGoogleNews(place.name).then(items => { setNews(items); if (!items.length) setError('No news found.'); }).catch(() => setError('Failed to load news.')).finally(() => setLoading(false));
  }, [place?.name]);

  const fmt = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  return (
    <div style={{ height: '100%', background: '#ffffff', display: 'flex', flexDirection: 'column', fontFamily: "'Outfit','Inter',Arial,sans-serif" }}>
      {/* Elegant Header */}
      <div 
        onMouseDown={e => onDragStart(e.clientY)} 
        onMouseMove={e => { if (e.buttons > 0) onDragMove(e.clientY); }} 
        onMouseUp={e => onDragEnd(e.clientY)} 
        onMouseLeave={e => { if (e.buttons > 0) onDragEnd(e.clientY); }}
        onTouchStart={e => onDragStart(e.touches[0].clientY)} 
        onTouchMove={e => onDragMove(e.touches[0].clientY)} 
        onTouchEnd={e => onDragEnd(e.changedTouches ? e.changedTouches[0].clientY : e.clientY)}
        style={{ cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 24px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(0,0,0,0.06)', flexShrink: 0, position: 'relative', zIndex: 10, paddingTop: 'max(20px, env(safe-area-inset-top))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 900 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: '14px', background: 'linear-gradient(135deg, #e4efff 0%, #f4f8ff 100%)', boxShadow: 'inset 0 1px 0 #fff, 0 4px 10px rgba(66,133,244,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={22} style={{ color: '#4285F4' }} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', letterSpacing: '.15em', textTransform: 'uppercase' }}>Global Intel</div>
              <div style={{ fontSize: 20, color: '#0f172a', fontWeight: 800, letterSpacing: '-0.02em', marginTop: 2 }}>{place?.name} <span style={{ color: '#4285F4' }}>News</span></div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', cursor: 'pointer', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }} onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; }}><ChevronDown size={22} /></button>
        </div>
      </div>
      {/* Body with Grid */}
      <div style={{ overflowY: 'auto', padding: '32px 24px 60px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {loading && <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 60, gap: 16 }}><Loader2 size={36} style={{ color: '#4285F4', animation: 'spin 1s linear infinite' }} /><span style={{ fontSize: 15, fontWeight: 500, color: '#64748b', letterSpacing: '0.02em' }}>Curating local intelligence…</span></div>}
          {error && !loading && <div style={{ textAlign: 'center', padding: 40, color: '#64748b', fontSize: 15 }}>{error}</div>}
          {!loading && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24, paddingBottom: 40 }}>
            {news.map((item, i) => (
              <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', background: '#fff', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)', transition: 'all .3s cubic-bezier(0.2, 0.8, 0.2, 1)', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 20px 40px -10px rgba(66,133,244,0.15)'; e.currentTarget.style.borderColor = 'rgba(66,133,244,0.2)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 30px -10px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)'; }}>
                <div style={{ position: 'relative', width: '100%', height: 160, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  {item.thumbnail
                    ? <img src={item.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                    : <Newspaper size={36} style={{ color: 'rgba(66,133,244,0.2)' }} />}
                  <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800, color: '#334155', letterSpacing: '0.05em', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                    {item.author?.split(' ')[0] || 'SOURCE'}
                  </div>
                </div>
                <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', lineHeight: 1.45, marginBottom: 16, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.title}</div>
                  <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                    <Clock size={12} style={{ color: '#94a3b8' }} /><span>{fmt(item.pubDate)}</span>
                    <ExternalLink size={12} style={{ marginLeft: 'auto', color: '#cbd5e1' }} />
                  </div>
                </div>
              </a>
            ))}
          </div>}
        </div>
      </div>
    </div>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────────
function SectionHeader({ icon, title, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      <div style={{ width: 36, height: 36, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {React.cloneElement(icon, { size: 18, style: { color } })}
      </div>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', letterSpacing: '.08em', textTransform: 'uppercase' }}>{title}</div>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, #e2e8f0, transparent)' }} />
    </div>
  );
}

// ── Dive Deep Panel ───────────────────────────────────────────────────────────
function AboutPanel({ place, onClose, onDragStart, onDragMove, onDragEnd }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!place) return;
    setLoading(true); setError(null); setData(null);
    fetchDiveDeep(place.name, place.lat, place.lon)
      .then(d => {
        if (!d?.summary && !d?.attractions?.length) setError('No information found for this place.');
        else setData(d);
      })
      .catch(() => setError('Failed to load place information.'))
      .finally(() => setLoading(false));
  }, [place?.name]);

  const facts = data?.summary?.extract?.split('. ').filter(s => s.length > 60 && s.length < 220).slice(1, 5) || [];
  const fmt = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  return (
    <div style={{ height: '100%', background: '#f8fafc', display: 'flex', flexDirection: 'column', fontFamily: "'Outfit','Inter',Arial,sans-serif" }}>

      {/* ── Header ── */}
      <div
        onMouseDown={e => onDragStart(e.clientY)}
        onMouseMove={e => { if (e.buttons > 0) onDragMove(e.clientY); }}
        onMouseUp={e => onDragEnd(e.clientY)}
        onMouseLeave={e => { if (e.buttons > 0) onDragEnd(e.clientY); }}
        onTouchStart={e => onDragStart(e.touches[0].clientY)}
        onTouchMove={e => onDragMove(e.touches[0].clientY)}
        onTouchEnd={e => onDragEnd(e.changedTouches ? e.changedTouches[0].clientY : e.clientY)}
        style={{
          cursor: 'grab', flexShrink: 0, position: 'relative', zIndex: 10,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          padding: 'max(20px, env(safe-area-inset-top)) 24px 20px',
        }}
      >
        {/* drag bar */}
        <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.25)' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 900, margin: '0 auto', paddingTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 16,
              background: 'linear-gradient(135deg, #fbbf24, #f97316)',
              boxShadow: '0 8px 20px rgba(251,188,5,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Telescope size={24} style={{ color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: '.18em', textTransform: 'uppercase' }}>Place Intelligence</div>
              <div style={{ fontSize: 22, color: '#fff', fontWeight: 800, letterSpacing: '-0.02em', marginTop: 2 }}>
                {place?.name} <span style={{ color: '#fbbf24' }}>Dive Deep</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <ChevronDown size={22} />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ overflowY: 'auto', padding: '28px 20px 80px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>

          {/* Loading */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', gap: 20 }}>
              <div style={{ position: 'relative', width: 64, height: 64 }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid #fbbf2430', borderTop: '3px solid #fbbf24', animation: 'spin 1s linear infinite' }} />
                <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', border: '2px solid #f9731630', borderBottom: '2px solid #f97316', animation: 'spin 0.7s linear infinite reverse' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Telescope size={22} style={{ color: '#fbbf24' }} />
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Curating Intelligence…</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Fetching tourist attractions, articles &amp; insights</div>
              </div>
            </div>
          )}

          {error && !loading && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              <Globe size={40} style={{ color: '#cbd5e1', marginBottom: 12 }} />
              <div style={{ fontSize: 16, fontWeight: 600 }}>{error}</div>
            </div>
          )}

          {!loading && data && (
            <>
              {/* ── 1. Hero Overview Card ── */}
              {data.summary && (
                <div style={{
                  borderRadius: 24, overflow: 'hidden', marginBottom: 28,
                  boxShadow: '0 20px 60px -12px rgba(0,0,0,0.15)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  background: '#fff',
                }}>
                  {data.summary.thumbnail && (
                    <div style={{ position: 'relative', width: '100%', height: 280 }}>
                      <img src={data.summary.thumbnail.source} alt={data.summary.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,15,30,0.92) 0%, rgba(10,15,30,0.3) 55%, transparent 100%)' }} />
                      <div style={{ position: 'absolute', bottom: 24, left: 28, right: 28 }}>
                        {data.summary.description && (
                          <span style={{
                            fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
                            color: '#0f172a', background: '#fbbf24', borderRadius: 20,
                            padding: '4px 12px', display: 'inline-block', marginBottom: 10,
                          }}>{data.summary.description.toUpperCase()}</span>
                        )}
                        <div style={{ fontSize: 30, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{data.summary.title}</div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                          <a href={`https://en.wikipedia.org/wiki/${encodeURIComponent(data.summary.title)}`} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '8px 14px', borderRadius: 12, textDecoration: 'none', transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                          >
                            <ExternalLink size={12} /> Wikipedia
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                  <div style={{ padding: '24px 28px' }}>
                    {!data.summary.thumbnail && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>{data.summary.title}</div>
                        {data.summary.description && <span style={{ fontSize: 11, fontWeight: 700, color: '#92600c', background: '#fef9c3', borderRadius: 20, padding: '4px 12px', display: 'inline-block', marginTop: 8 }}>{data.summary.description.toUpperCase()}</span>}
                      </div>
                    )}
                    <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.75, margin: 0, fontWeight: 500 }}>
                      {data.summary.extract?.slice(0, 700)}{data.summary.extract?.length > 700 ? '…' : ''}
                    </p>
                  </div>
                </div>
              )}

              {/* ── 2. Tourist Attractions Grid ── */}
              {data.attractions?.length > 0 && (
                <div style={{ marginBottom: 32 }}>
                  <SectionHeader icon={<Camera />} title={`Tourist Attractions near ${place.name}`} color="#f97316" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
                    {data.attractions.map((attr, i) => (
                      <a
                        key={i}
                        href={attr.wikiUrl} target="_blank" rel="noopener noreferrer"
                        style={{
                          display: 'flex', flexDirection: 'column', textDecoration: 'none',
                          background: '#fff', borderRadius: 20, overflow: 'hidden',
                          border: '1px solid rgba(0,0,0,0.06)',
                          boxShadow: '0 4px 20px -6px rgba(0,0,0,0.08)',
                          transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 16px 40px -8px rgba(249,115,22,0.2)'; e.currentTarget.style.borderColor = 'rgba(249,115,22,0.25)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px -6px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)'; }}
                      >
                        {/* Image */}
                        <div style={{ position: 'relative', width: '100%', height: 150, background: 'linear-gradient(135deg, #fff9e6, #fef3c7)', flexShrink: 0 }}>
                          {attr.thumbnail ? (
                            <img src={attr.thumbnail} alt={attr.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={e => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <img src={`https://picsum.photos/seed/${encodeURIComponent(attr.title + 'attraction')}/400/300`} alt={attr.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          )}
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 60%)' }} />
                          <div style={{
                            position: 'absolute', top: 10, left: 10,
                            background: 'rgba(249,115,22,0.9)', backdropFilter: 'blur(8px)',
                            color: '#fff', fontSize: 9, fontWeight: 800, letterSpacing: '0.08em',
                            padding: '3px 10px', borderRadius: 20,
                          }}>📍 {Math.round(attr.dist)}m away</div>
                        </div>
                        {/* Content */}
                        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{attr.title}</div>
                          <ExternalLink size={13} style={{ color: '#cbd5e1', flexShrink: 0 }} />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 2.5 Hotels Grid ── */}
              {data.hotels?.length > 0 && (
                <div style={{ marginBottom: 32 }}>
                  <SectionHeader icon={<MapPin />} title={`Best Hotels in ${place.name}`} color="#8b5cf6" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
                    {data.hotels.map((hotel, i) => (
                      <a
                        key={`hotel-${i}`}
                        href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(hotel.name || place.name)}`} target="_blank" rel="noopener noreferrer"
                        style={{
                          display: 'flex', flexDirection: 'column', textDecoration: 'none',
                          background: '#fff', borderRadius: 20, overflow: 'hidden',
                          border: '1px solid rgba(0,0,0,0.06)',
                          boxShadow: '0 4px 20px -6px rgba(0,0,0,0.08)',
                          transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 16px 40px -8px rgba(139,92,246,0.2)'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.25)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px -6px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)'; }}
                      >
                        {/* Image */}
                        <div style={{ position: 'relative', width: '100%', height: 150, background: 'linear-gradient(135deg, #f3e8ff, #f5f3ff)', flexShrink: 0 }}>
                          <img src={`https://picsum.photos/seed/${encodeURIComponent(hotel.name + place.name + 'hotel')}/400/300`} alt={hotel.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 60%)' }} />
                          <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(139,92,246,0.9)', backdropFilter: 'blur(8px)', color: '#fff', fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', padding: '3px 10px', borderRadius: 20 }}>🏨 HOTEL</div>
                        </div>
                        {/* Content */}
                        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{hotel.name || 'Local Hotel'}</div>
                          <ExternalLink size={13} style={{ color: '#cbd5e1', flexShrink: 0 }} />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 2.6 Restaurants Grid ── */}
              {data.restaurants?.length > 0 && (
                <div style={{ marginBottom: 32 }}>
                  <SectionHeader icon={<Star />} title={`Food & Dining in ${place.name}`} color="#ef4444" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
                    {data.restaurants.map((rest, i) => (
                      <a
                        key={`rest-${i}`}
                        href={`https://www.tripadvisor.com/Search?q=${encodeURIComponent(rest.name || place.name)}`} target="_blank" rel="noopener noreferrer"
                        style={{
                          display: 'flex', flexDirection: 'column', textDecoration: 'none',
                          background: '#fff', borderRadius: 20, overflow: 'hidden',
                          border: '1px solid rgba(0,0,0,0.06)',
                          boxShadow: '0 4px 20px -6px rgba(0,0,0,0.08)',
                          transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 16px 40px -8px rgba(239,68,68,0.2)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px -6px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)'; }}
                      >
                        {/* Image */}
                        <div style={{ position: 'relative', width: '100%', height: 150, background: 'linear-gradient(135deg, #fee2e2, #fef2f2)', flexShrink: 0 }}>
                          <img src={`https://picsum.photos/seed/${encodeURIComponent(rest.name + place.name + 'food')}/400/300`} alt={rest.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 60%)' }} />
                          <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(239,68,68,0.9)', backdropFilter: 'blur(8px)', color: '#fff', fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', padding: '3px 10px', borderRadius: 20 }}>🍽️ DINING</div>
                        </div>
                        {/* Content */}
                        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{rest.name || 'Local Restaurant'}</div>
                          <ExternalLink size={13} style={{ color: '#cbd5e1', flexShrink: 0 }} />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 3. Positive Travel Articles ── */}
              {data.travelArticles?.length > 0 && (
                <div style={{ marginBottom: 32 }}>
                  <SectionHeader icon={<Newspaper />} title={`Travel &amp; Tourism Articles`} color="#4285F4" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
                    {data.travelArticles.map((art, i) => (
                      <a
                        key={i} href={art.link} target="_blank" rel="noopener noreferrer"
                        style={{
                          display: 'flex', flexDirection: 'column', textDecoration: 'none',
                          background: '#fff', borderRadius: 20, overflow: 'hidden',
                          border: '1px solid rgba(0,0,0,0.06)',
                          boxShadow: '0 4px 20px -6px rgba(0,0,0,0.08)',
                          transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 16px 40px -8px rgba(66,133,244,0.2)'; e.currentTarget.style.borderColor = 'rgba(66,133,244,0.2)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px -6px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)'; }}
                      >
                        {/* Image */}
                        <div style={{ position: 'relative', width: '100%', height: 160, background: '#f1f5f9', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {art.thumbnail ? (
                            <img src={art.thumbnail} alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={e => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <img src={`https://picsum.photos/seed/${encodeURIComponent(art.title)}/400/300`} alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          )}
                          <div style={{
                            position: 'absolute', top: 10, right: 10,
                            background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
                            color: '#334155', fontSize: 9, fontWeight: 800, letterSpacing: '0.06em',
                            padding: '3px 10px', borderRadius: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          }}>{art.source?.split(' ')[0] || 'TRAVEL'}</div>
                        </div>
                        {/* Text */}
                        <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <div style={{
                            fontSize: 14, fontWeight: 700, color: '#0f172a', lineHeight: 1.5,
                            marginBottom: 12,
                            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          }}>{art.title}</div>
                          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                            <Clock size={11} /><span>{fmt(art.pubDate)}</span>
                            <ExternalLink size={11} style={{ marginLeft: 'auto', color: '#cbd5e1' }} />
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 4. Key Facts ── */}
              {facts.length > 0 && (
                <div style={{ marginBottom: 32 }}>
                  <SectionHeader icon={<Lightbulb />} title="Key Facts &amp; Insights" color="#34a853" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {facts.map((fact, i) => (
                      <div key={i} style={{
                        display: 'flex', gap: 14, padding: '18px 20px',
                        background: '#fff', border: '1px solid #e2e8f0',
                        borderRadius: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
                        transition: 'all 0.2s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(52,168,83,0.35)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(52,168,83,0.08)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.03)'; }}
                      >
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, boxShadow: '0 2px 8px rgba(52,168,83,0.2)',
                        }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: '#166534' }}>{i + 1}</span>
                        </div>
                        <span style={{ fontSize: 14, color: '#334155', lineHeight: 1.65, fontWeight: 500 }}>{fact.trim()}.</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 5. Quick Links ── */}
              <div style={{ marginBottom: 20 }}>
                <SectionHeader icon={<ExternalLink />} title="Explore More" color="#a78bfa" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {[
                    { label: '🌍 Wikipedia', url: `https://en.wikipedia.org/wiki/${encodeURIComponent(place.name)}`, color: '#4285F4', bg: '#eff6ff' },
                    { label: '✈️ Book a Trip', url: `https://www.skyscanner.com/transport/flights-from/${encodeURIComponent(place.name)}`, color: '#f97316', bg: '#fff7ed' },
                    { label: '🏨 Find Hotels', url: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(place.name)}`, color: '#e879f9', bg: '#fdf4ff' },
                    { label: '📸 See Photos', url: `https://www.flickr.com/search/?q=${encodeURIComponent(place.name)}`, color: '#fb923c', bg: '#fff7ed' },
                    { label: '🎟️ Tours & Activities', url: `https://www.viator.com/searchResults/all?text=${encodeURIComponent(place.name)}`, color: '#38bdf8', bg: '#f0f9ff' },
                    { label: '🍽️ Restaurants', url: `https://www.tripadvisor.com/Search?q=${encodeURIComponent(place.name)}&searchSessionId=0&geo=1`, color: '#fbbf24', bg: '#fffbeb' },
                    { label: '📰 Latest News', url: `https://news.google.com/search?q=${encodeURIComponent(place.name)}`, color: '#64748b', bg: '#f8fafc' },
                  ].map((lnk, i) => (
                    <a key={i} href={lnk.url} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '13px 16px', borderRadius: 14, textDecoration: 'none',
                        background: lnk.bg, border: `1px solid ${lnk.color}22`,
                        color: lnk.color, fontSize: 13, fontWeight: 700,
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 20px ${lnk.color}25`; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}
                    >
                      {lnk.label}
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Bottom Full-Width Dock ────────────────────────────────────────────────────
function BottomDock({ searchedPlace, activePanel, panelReady, panelOpen, onOpenNews, onOpenAbout, onOpen, onClose, onDragStart, onDragMove, onDragEnd }) {
  const has = !!searchedPlace;

  const btnStyle = (color, active) => ({
    width: 52, height: 52, borderRadius: '50%',
    background: active ? `rgba(${color},.3)` : has ? `rgba(${color},.15)` : 'rgba(0,0,0,.05)',
    border: `${active ? 2 : 1.5}px solid rgba(${color},${active ? .8 : has ? .4 : .1})`,
    cursor: has ? 'pointer' : 'not-allowed',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all .25s',
    boxShadow: active ? `0 0 18px rgba(${color},.4)` : 'none',
  });
  const labelStyle = (color, active) => ({
    fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
    color: has || active ? `rgb(${color})` : '#aaa', fontFamily: "'Inter',sans-serif",
  });

  return (
    <div style={{ position: 'relative', width: '100%', zIndex: 150, pointerEvents: 'none', height: 85 }}>

      {/* Swipe-up hint — shown after wave completes, hidden when panel is open */}
      {panelReady && !panelOpen && (
        <div style={{
          position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          pointerEvents: 'all', cursor: 'pointer', animation: 'hintBob 1.2s ease-in-out infinite',
        }} onMouseDown={e => onDragStart(e.clientY)} onTouchStart={e => onDragStart(e.touches[0].clientY)}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', color: 'rgba(40,100,255,.85)', fontFamily: "'Inter',sans-serif", textTransform: 'uppercase' }}>swipe up</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
            <div style={{ width: 20, height: 3, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '7px solid rgba(40,100,255,.7)' }} />
            <div style={{ width: 20, height: 3, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '7px solid rgba(40,100,255,.4)' }} />
          </div>
        </div>
      )}

      {/* Arch panel — full width, curved top, with swipe detection */}
      <div
        onMouseDown={e => onDragStart(e.clientY)} 
        onMouseMove={e => { if (e.buttons > 0) onDragMove(e.clientY); }} 
        onMouseUp={e => onDragEnd(e.clientY)} 
        onMouseLeave={e => { if (e.buttons > 0) onDragEnd(e.clientY); }}
        onTouchStart={e => onDragStart(e.touches[0].clientY)} 
        onTouchMove={e => onDragMove(e.touches[0].clientY)} 
        onTouchEnd={e => onDragEnd(e.changedTouches ? e.changedTouches[0].clientY : e.clientY)}
        style={{
          width: '100%', height: 85,
          borderRadius: '50% 50% 0 0 / 60px 60px 0 0',
          paddingTop: '5px',
          background: 'linear-gradient(90deg, #1e1b4b, #3730a3, #6d28d9, #a855f7, #7c3aed, #4f46e5, #1e1b4b)',
          backgroundSize: '200% auto',
          animation: 'gradientShift 3.5s linear infinite, swipeBorderGlow 2.5s ease-in-out infinite',
          boxShadow: '0 -10px 32px rgba(109, 40, 217, 0.45), inset 0 2px 5px rgba(255,255,255,0.6)',
          pointerEvents: 'all', cursor: (panelReady || panelOpen) ? 'grab' : 'default',
          userSelect: 'none',
        }}
      >
        <div style={{
          width: '100%', height: 80,
          borderRadius: '50% 50% 0 0 / 60px 60px 0 0',
          background: '#ffffff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 48, paddingTop: 14, position: 'relative',
        }}>
          {/* Drag handle bar */}
          <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,.15)' }} />

          {/* NEWS button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <button
              style={btnStyle('66,133,244', activePanel === 'news')}
              disabled={!has}
              onClick={() => panelOpen ? onClose() : (activePanel === 'news' && panelReady) ? onOpen() : onOpenNews()}
              onMouseEnter={e => has && (e.currentTarget.style.transform = 'scale(1.12)')}
              onMouseLeave={e => has && (e.currentTarget.style.transform = 'scale(1)')}
            >
              <Activity size={22} style={{ color: has ? '#4285F4' : '#aaa', transition: 'color .2s' }} />
            </button>
            <span style={labelStyle('66,133,244', activePanel === 'news')}>News</span>
          </div>

          {/* ABOUT button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <button
              style={btnStyle('251,188,5', activePanel === 'about')}
              disabled={!has}
              onClick={() => panelOpen ? onClose() : (activePanel === 'about' && panelReady) ? onOpen() : onOpenAbout()}
              onMouseEnter={e => has && (e.currentTarget.style.transform = 'scale(1.12)')}
              onMouseLeave={e => has && (e.currentTarget.style.transform = 'scale(1)')}
            >
              <Telescope size={22} style={{ color: has ? '#fbbc05' : '#aaa', transition: 'color .2s' }} />
            </button>
            <span style={labelStyle('251,188,5', activePanel === 'about')}>Dive Deep</span>
          </div>

          {!has && (
            <div style={{ position: 'absolute', right: 20, bottom: 10, fontSize: 8, color: 'rgba(0,0,0,.3)', fontFamily: "'Inter',sans-serif", letterSpacing: '.05em' }}>
              Search a place to unlock
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
// ── Semicircle Edge Wave ──────────────────────────────────────────────────────
// Soft multi-colour rings that emerge from the curved top edge of the dock
// and expand outward BELOW the semicircle. No bright glow.
const WAVE_PALETTES = {
  news: ['#00cfff', '#5b8fff', '#a78bfa', '#c084fc', '#60a5fa', '#38bdf8'],
  about: ['#fbbf24', '#fb923c', '#f97316', '#e879f9', '#facc15', '#fdba74'],
};

// Full-width dock: curved top edge acts like a wide shallow arch.
// The arch apex is ~60px above the bottom edge, so DOCK_R ≈ 60 for wave origin.
const DOCK_R = 60;

function SemicircleWave({ waveType, id }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!waveType) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Full-screen canvas
    const W = canvas.width = window.innerWidth;
    const H = canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const palette = WAVE_PALETTES[waveType] || WAVE_PALETTES.news;

    // Wave origin = screen bottom-centre. A circle of radius 80 (= dock height)
    // here traces the curved arch top of the dock. Rings START at R=80 so they
    // first appear right ON the arch border, then sweep upward across the screen.
    const ARCH_R = 80;   // matches dock height
    const cx = W / 2;
    const cy = H;        // screen bottom

    const maxR = Math.sqrt(cx * cx + H * H) * 1.05;

    const SPEED = 500;  // px/s — fast sweep
    const RING_GAP = 120;  // ms — rings fire quickly one after another
    const LIFE_MS = ((maxR - ARCH_R) / SPEED) * 1000 + RING_GAP * palette.length + 200;

    const rings = palette.map((hex, i) => ({
      hex,
      delayMs: i * RING_GAP,
      lineW: 2.0 - i * 0.08,
    }));

    const t0 = performance.now();
    let rafId;

    function hexAlpha(hex, a) {
      return hex + Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');
    }

    function frame(now) {
      const elapsed = now - t0;
      ctx.clearRect(0, 0, W, H);

      let anyAlive = false;

      rings.forEach(ring => {
        const t = elapsed - ring.delayMs;
        if (t <= 0) { anyAlive = true; return; }

        const radius = ARCH_R + (t / 1000) * SPEED;  // starts ON the arch edge
        if (radius > maxR) return;
        anyAlive = true;

        const progress = (radius - ARCH_R) / (maxR - ARCH_R);  // 0 to 1
        const alpha = 0.7 * Math.pow(1 - progress, 1.6);

        // Upper arc only (π → 0, anticlockwise=false draws the top half)
        ctx.beginPath();
        ctx.arc(cx, cy, radius, Math.PI, 0);
        ctx.lineWidth = 2.0 * (1 - progress * 0.4);
        ctx.strokeStyle = hexAlpha(ring.hex, alpha);
        ctx.stroke();

        // Soft wide halo — no bright core
        ctx.beginPath();
        ctx.arc(cx, cy, radius, Math.PI, 0);
        ctx.lineWidth = 14 * (1 - progress * 0.5);
        ctx.strokeStyle = hexAlpha(ring.hex, alpha * 0.09);
        ctx.stroke();
      });

      if (anyAlive && elapsed < LIFE_MS) rafId = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    }

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [waveType, id]);

  if (!waveType) return null;
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 145,        // sit below dock (zIndex 150) but above map
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  );
}

// ── Map Controls ─────────────────────────────────────────────────────────────
function MapControls({ mapRef, isSatellite, onToggleStyle }) {
  const onZoomIn = () => mapRef.current?.getMap().zoomIn();
  const onZoomOut = () => mapRef.current?.getMap().zoomOut();
  const onReset = () => {
    mapRef.current?.getMap().easeTo({
      bearing: 0,
      pitch: 0,
      duration: 1000,
      essential: true
    });
  };

  const btnStyle = {
    width: 44, height: 44,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    cursor: 'pointer',
    color: '#1e293b',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  return (
    <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
        <button 
          onClick={onZoomIn} 
          style={btnStyle}
          onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#4285F4'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)'; e.currentTarget.style.color = '#1e293b'; }}
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.3)' }} />
        <button 
          onClick={onZoomOut} 
          style={btnStyle}
          onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#4285F4'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)'; e.currentTarget.style.color = '#1e293b'; }}
        >
          <Minus size={20} strokeWidth={2.5} />
        </button>
      </div>

      <button 
        onClick={onReset}
        title="Reset Orientation"
        style={{ 
          ...btnStyle, 
          borderRadius: 14, 
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#4285F4'; e.currentTarget.style.transform = 'scale(1.05)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)'; e.currentTarget.style.color = '#1e293b'; e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <Compass size={20} strokeWidth={2} />
      </button>

      <button 
        onClick={onToggleStyle}
        title={isSatellite ? "Switch to Street Map" : "Switch to Satellite"}
        style={{ 
          ...btnStyle, 
          borderRadius: 14, 
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#4285F4'; e.currentTarget.style.transform = 'scale(1.05)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)'; e.currentTarget.style.color = '#1e293b'; e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <Layers size={20} strokeWidth={2} style={{ color: isSatellite ? '#1e293b' : '#4285F4' }} />
      </button>
    </div>
  );
}

// ── Tourist Place Marker ─────────────────────────────────────────────────────
function TouristMarker({ place, onClick, isSelected }) {
  const categoryColors = {
    Landmark: '#f97316', Heritage: '#a78bfa', Architecture: '#38bdf8',
    Nature: '#34a853', Museum: '#e879f9', Cultural: '#fbbf24',
  };
  const color = categoryColors[place.category] || '#5b8fff';

  return (
    <div
      onClick={() => onClick(place)}
      title={place.name}
      style={{
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        transform: isSelected ? 'scale(1.25)' : 'scale(1)',
        transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        filter: isSelected ? `drop-shadow(0 0 10px ${color})` : 'none',
        userSelect: 'none',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: color,
        border: '3px solid #fff',
        boxShadow: `0 4px 16px ${color}66, 0 2px 6px rgba(0,0,0,0.3)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, lineHeight: 1,
        animation: isSelected ? 'touristPing 1.5s ease-in-out infinite' : 'none',
      }}>
        {place.emoji}
      </div>
      <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `9px solid ${color}`, marginTop: -1 }} />
    </div>
  );
}

// ── Tourist Popup Card ────────────────────────────────────────────────────────
function TouristPopupCard({ place, onClose }) {
  const categoryColors = {
    Landmark: '#f97316', Heritage: '#a78bfa', Architecture: '#38bdf8',
    Nature: '#34a853', Museum: '#e879f9', Cultural: '#fbbf24',
  };
  const color = categoryColors[place.category] || '#5b8fff';

  return (
    <div style={{
      width: 280, background: '#0a0f1e',
      border: `1px solid ${color}44`, borderRadius: 20,
      overflow: 'hidden', boxShadow: `0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px ${color}22`,
      fontFamily: "'Outfit','Inter',Arial,sans-serif",
    }}>
      {/* Image */}
      <div style={{ position: 'relative', width: '100%', height: 160 }}>
        <img
          src={place.image} alt={place.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={e => { e.target.style.display = 'none'; }}
        />
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, #0a0f1e 0%, transparent 55%)` }} />
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 10, right: 10,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50%',
            width: 32, height: 32, cursor: 'pointer', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={14} />
        </button>
        <div style={{
          position: 'absolute', bottom: 12, left: 14, right: 14,
        }}>
          <span style={{
            fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
            background: color, color: '#fff',
            borderRadius: 20, padding: '3px 10px', display: 'inline-block', marginBottom: 6,
          }}>{place.emoji} {place.category.toUpperCase()}</span>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.2 }}>{place.name}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 600, marginTop: 2 }}>📍 {place.country}</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px 16px' }}>
        <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)', lineHeight: 1.65, margin: '0 0 14px', fontWeight: 500 }}>
          {place.description}
        </p>
        <a
          href={place.link} target="_blank" rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: color, color: '#fff', fontSize: 12, fontWeight: 700,
            textDecoration: 'none', borderRadius: 12, padding: '10px 16px',
            transition: 'opacity 0.2s', letterSpacing: '0.02em',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <ExternalLink size={13} /> Learn More on Wikipedia
        </a>
      </div>
    </div>
  );
}

// ── Main MapViewer ────────────────────────────────────────────────────────────
export default function MapViewer() {
  const mapRef = useRef(null);
  const location = useLocation();
  const initialArticle = location.state?.targetArticle;
  const initialPlace = location.state?.searchPlace;

  const [resolvedArticle, setResolvedArticle] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [searchedPlace, setSearchedPlace] = useState(initialPlace || null);
  const [activePanel, setActivePanel] = useState(null); // 'news' | 'about' | null
  const [panelReady, setPanelReady] = useState(false);  // swipe-up hint visible
  const [panelOpen, setPanelOpen] = useState(false);  // panel fully visible
  const [searchPin, setSearchPin] = useState(initialPlace || null);
  const [waveType, setWaveType] = useState(null);
  const [waveId, setWaveId] = useState(0);
  const [showTouristPlaces, setShowTouristPlaces] = useState(true);
  const [selectedTourist, setSelectedTourist] = useState(null);
  const [isSatellite, setIsSatellite] = useState(false); // Default to street view to show streets more easily

  const { registerMapSearch } = useAgent();

  const sheetRef = useRef(null);
  const dragStartY = useRef(null);
  const isDragging = useRef(false);

  useEffect(() => {
    // initialize sheet position below screen
    if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(calc(100vh - 85px))`;
    }
  }, []);

  useEffect(() => {
    if (sheetRef.current && !isDragging.current) {
      sheetRef.current.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)';
      const closedY = window.innerHeight - 85;
      sheetRef.current.style.transform = `translateY(${panelOpen ? 0 : closedY}px)`;
    }
  }, [panelOpen]);

  const handleDragStart = useCallback((clientY) => {
    if (!panelReady && !panelOpen) return;
    dragStartY.current = clientY;
    isDragging.current = true;
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
  }, [panelReady, panelOpen]);

  const handleDragMove = useCallback((clientY) => {
    if (dragStartY.current === null) return;
    if (!panelReady && !panelOpen) return;
    
    const dy = clientY - dragStartY.current;
    const closedY = window.innerHeight - 85;
    const baseY = panelOpen ? 0 : closedY;
    
    let newY = baseY + dy;
    if (newY < 0) newY = 0;
    if (newY > closedY) newY = closedY;

    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${newY}px)`;
  }, [panelReady, panelOpen]);

  const handleDragEnd = useCallback((clientY) => {
    if (dragStartY.current === null) return;
    const dy = clientY - dragStartY.current;
    
    dragStartY.current = null;
    isDragging.current = false;
    
    if (!panelReady && !panelOpen) return;

    const closedY = window.innerHeight - 85;
    const baseY = panelOpen ? 0 : closedY;
    let endY = baseY + dy;

    if (sheetRef.current) {
      sheetRef.current.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
      
      if (!panelOpen && (dy < -40 || endY < closedY * 0.6)) {
        sheetRef.current.style.transform = `translateY(0px)`;
        setPanelOpen(true);
      } else if (panelOpen && (dy > 40 || endY > window.innerHeight * 0.4)) {
        sheetRef.current.style.transform = `translateY(${closedY}px)`;
        setPanelOpen(false);
      } else {
        sheetRef.current.style.transform = `translateY(${panelOpen ? 0 : closedY}px)`;
      }
    }
  }, [panelReady, panelOpen]);

  const triggerWave = useCallback((type, panel) => {
    setPanelOpen(false);
    setPanelReady(false);
    setWaveType(type);
    setWaveId(id => id + 1);
    setActivePanel(panel);
    // Wave runs ~2.5s → then show swipe-up hint
    setTimeout(() => {
      setWaveType(null);
      setPanelReady(true);
    }, 2500);
  }, []);

  const handleClosePanel = useCallback(() => {
    setPanelOpen(false);
    setPanelReady(false); // They must search or click the icon again
  }, []);

  const handlePlaceSelect = useCallback((place) => {
    setSearchedPlace(place);
    setSearchPin(place);
    setActivePanel(null);
    setPanelOpen(false);
    setPanelReady(false);
  }, []);

  const handleAgentSearch = useCallback(async (query) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
      const data = await res.json();
      if (data.length > 0) {
        const item = data[0];
        const name = item.display_name.split(',')[0];
        mapRef.current?.getMap()?.flyTo({ center: [parseFloat(item.lon), parseFloat(item.lat)], zoom: 13, pitch: 55, bearing: 15, duration: 3000, essential: true });
        handlePlaceSelect({ name, displayName: item.display_name, lat: parseFloat(item.lat), lon: parseFloat(item.lon) });
      }
    } catch (e) {
      console.error('Agent map search failed', e);
    }
  }, [handlePlaceSelect]);

  useEffect(() => {
    return registerMapSearch(handleAgentSearch);
  }, [registerMapSearch, handleAgentSearch]);

  useEffect(() => {
    const pending = sessionStorage.getItem('agent_pending_map_search');
    if (pending) {
      sessionStorage.removeItem('agent_pending_map_search');
      setTimeout(() => handleAgentSearch(pending), 500); // Wait for map to mount
    }
  }, [handleAgentSearch]);

  const onMapLoad = useCallback(async () => {
    if (initialPlace) {
      mapRef.current.getMap().flyTo({ center: [initialPlace.lon, initialPlace.lat], zoom: 13, pitch: 55, bearing: 15, duration: 3000, essential: true });
    }
    if (!initialArticle) return;
    setAnalyzing(true);
    const result = await getArticleIntelligence(initialArticle);
    setResolvedArticle(result);
    setAnalyzing(false);
    if (!result.coords) return;
    const [lat, lng] = result.coords;
    if (isNaN(lat) || isNaN(lng)) return;
    mapRef.current.getMap().flyTo({ center: [lng, lat], zoom: result.hasLocationIssue ? 5 : 13, pitch: 65, bearing: 25, duration: 4500, essential: true });
    setTimeout(() => setShowPopup(true), 4600);
  }, [initialArticle]);

  return (
    <div className="w-full h-full relative bg-[#010409] overflow-hidden">

      {/* AI Analysis Overlay */}
      {analyzing && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(1,4,9,0.96)', backdropFilter: 'blur(24px)',
          pointerEvents: 'none', gap: 24,
        }}>
          {/* Spinner rings — indigo/violet */}
          <div style={{ position: 'relative', width: 72, height: 72 }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2.5px solid transparent', borderTopColor: '#6d28d9', borderRightColor: '#7c3aed', animation: 'spin 1s linear infinite' }} />
            <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', border: '2px solid transparent', borderBottomColor: '#a855f7', borderLeftColor: '#818cf8', animation: 'spin 0.65s linear infinite reverse' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#3730a3,#7c3aed)', boxShadow: '0 0 24px rgba(109,40,217,0.7)' }} />
            </div>
          </div>
          {/* Cinzel title */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: '0.28em',
              background: 'linear-gradient(135deg, #818cf8, #a855f7, #c084fc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 12px rgba(167,139,250,0.5))',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}>Analyzing Geodata</div>
            <div style={{
              fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase',
              color: 'rgba(167,139,250,0.6)', fontWeight: 700,
              fontFamily: "'Cinzel', serif",
            }}>Kenshiki Intelligence Grid</div>
          </div>
        </div>
      )}

      {/* Map Data Year Badge — dynamic per mode */}
      {(() => {
        const [badgeHover, setBadgeHover] = React.useState(false);
        const satelliteInfo = { icon: '🛰️', label: 'Satellite Imagery', year: '~2023–2025', note: 'Esri satellite photos are 1–3 years old depending on the region.' };
        const streetInfo   = { icon: '🗺️', label: 'Street Map Data',   year: '~2025–2026', note: 'Esri street & places data is updated every 6–12 months.' };
        const info = isSatellite ? satelliteInfo : streetInfo;
        return (
          <div
            style={{ position: 'absolute', top: 24, left: 24, zIndex: 100, userSelect: 'none', fontFamily: "'Inter',Arial,sans-serif" }}
            onMouseEnter={() => setBadgeHover(true)}
            onMouseLeave={() => setBadgeHover(false)}
          >
            {/* Main badge — Cinzel styled, indigo glow */}
            <div style={{
              background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)',
              border: `1.5px solid ${badgeHover ? 'rgba(109,40,217,0.3)' : 'rgba(255,255,255,0.6)'}`,
              borderRadius: 14, padding: '7px 16px',
              display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: badgeHover ? '0 6px 28px rgba(109,40,217,0.18)' : '0 4px 20px rgba(0,0,0,0.10)',
              cursor: 'default', transition: 'all 0.2s',
            }}>
              <span style={{ fontSize: 14, lineHeight: 1 }}>{info.icon}</span>
              <div>
                <div style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: 8.5, fontWeight: 700,
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                  background: 'linear-gradient(135deg,#3730a3,#7c3aed)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                  lineHeight: 1,
                }}>{info.label}</div>
                <div style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: 12, fontWeight: 700,
                  color: '#0f172a', letterSpacing: '0.04em', marginTop: 2,
                }}>{info.year}</div>
              </div>
            </div>
            {/* Tooltip on hover */}
            {badgeHover && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 10px)', left: 0,
                background: '#0f172a', color: '#e2e8f0',
                borderRadius: 12, padding: '10px 14px',
                fontSize: 12, lineHeight: 1.6, fontWeight: 500,
                width: 260, boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.08)',
                pointerEvents: 'none',
              }}>
                <div style={{ fontWeight: 800, color: '#fff', marginBottom: 4, fontSize: 13 }}>ℹ️ How fresh is this map?</div>
                {info.note}
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 11, color: '#94a3b8' }}>
                  Source: Esri ArcGIS · Switch modes with the <strong style={{ color: '#e2e8f0' }}>layers button</strong> →
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Google-style Search Bar */}
      <MapSearchBar mapRef={mapRef} onPlaceSelect={handlePlaceSelect} />

      {/* Map — clean, no tourist markers */}

      <Map 
        ref={mapRef} 
        onLoad={onMapLoad} 
        initialViewState={{ longitude: 0, latitude: 20, zoom: 2, pitch: 0, bearing: 0 }} 
        mapStyle={isSatellite ? SATELLITE_STYLE : STREET_STYLE} 
        style={{ width: '100%', height: '100%', touchAction: 'none' }} 
        terrain={{ source: 'terrain-dem', exaggeration: 1.5 }} 
        interactive={true}
        dragPan={true}
        touchZoomRotate={true}
      >
        <Source id="terrain-dem" type="raster-dem" url="https://demotiles.maplibre.org/terrain-tiles/tiles.json" tileSize={256} />
        <MapControls mapRef={mapRef} isSatellite={isSatellite} onToggleStyle={() => setIsSatellite(!isSatellite)} />



        {/* Search pin */}
        {searchPin && (
          <Marker longitude={searchPin.lon} latitude={searchPin.lat} anchor="bottom">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ position: 'absolute', width: 52, height: 52, borderRadius: '50%', background: 'rgba(66,133,244,.25)', animation: 'ping 1.5s ease-in-out infinite' }} />
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#4285F4', border: '3px solid #fff', boxShadow: '0 4px 20px rgba(66,133,244,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                <MapPin size={22} style={{ color: '#fff', fill: '#fff' }} />
              </div>
              <div style={{ width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '14px solid #4285F4', marginTop: -2, zIndex: 1 }} />
              <div style={{ background: '#fff', color: '#202124', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 12, marginTop: 6, boxShadow: '0 2px 8px rgba(0,0,0,.25)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Inter',Arial,sans-serif" }}>
                {searchPin.name}
              </div>
            </div>
          </Marker>
        )}

        {/* Article Marker */}
        {resolvedArticle?.coords && (
          <>
            <Marker longitude={Number(resolvedArticle.coords[1])} latitude={Number(resolvedArticle.coords[0])} anchor="bottom">
              <div className="flex flex-col items-center select-none">
                <div className={`absolute w-16 h-16 rounded-full animate-ping opacity-25 ${resolvedArticle.isVirtual ? 'bg-cyan-400' : 'bg-red-500'}`} />
                <div className={`relative w-14 h-14 rounded-full border-2 flex items-center justify-center shadow-2xl z-10 ${resolvedArticle.isVirtual ? 'bg-cyan-500 border-cyan-200 shadow-cyan-500/50' : 'bg-red-600 border-white shadow-red-600/50'}`}>
                  {resolvedArticle.isVirtual ? <Globe className="w-8 h-8 text-white" /> : <MapPin className="w-8 h-8 text-white fill-white" />}
                </div>
                <div className={`w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[14px] -mt-[1px] z-10 ${resolvedArticle.isVirtual ? 'border-t-cyan-500' : 'border-t-red-600'}`} />
              </div>
            </Marker>
            {showPopup && (
              <Popup longitude={Number(resolvedArticle.coords[1])} latitude={Number(resolvedArticle.coords[0])} anchor="bottom" offset={[0, -85]} closeOnClick={false} onClose={() => setShowPopup(false)} className="kenshiki-popup">
                <div className="bg-[#0a0f1e] border border-white/10 text-white rounded-2xl p-4 w-72 shadow-[0_16px_48px_rgba(0,0,0,0.7)]">
                  <span className={`inline-block text-[8px] font-black tracking-[0.15em] uppercase px-2 py-0.5 rounded-full mb-2 ${resolvedArticle.isVirtual ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-blue-600/20 text-blue-300 border border-blue-500/30'}`}>
                    {resolvedArticle.isVirtual ? '🌐 Virtual Integration' : `📍 ${resolvedArticle.location || resolvedArticle.category}`}
                  </span>
                  <h3 className="text-[13px] font-bold leading-snug mb-2 text-white line-clamp-2">{resolvedArticle.title}</h3>
                  <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-3">{resolvedArticle.isVirtual ? `⚡ AI INSIGHT: ${resolvedArticle.intelligenceNote}` : resolvedArticle.description || 'No summary available.'}</p>
                  <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[9px] text-gray-600">
                    <span className="font-semibold uppercase tracking-widest">{resolvedArticle.source}</span>
                    <span className="text-blue-500/70 font-bold">KENSHIKI AI</span>
                  </div>
                </div>
              </Popup>
            )}
          </>
        )}
      </Map>

      {/* Semicircle edge wave — emits from dock edge, below dock */}
      <SemicircleWave waveType={waveType} id={waveId} />

      {/* Floating Bottom Sheet */}
      <div 
        ref={sheetRef}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, height: '100vh',
          zIndex: 300,
          pointerEvents: 'none',
        }}
      >
        <BottomDock
          searchedPlace={searchedPlace}
          activePanel={activePanel}
          panelReady={panelReady}
          panelOpen={panelOpen}
          onOpenNews={() => triggerWave('news', 'news')}
          onOpenAbout={() => triggerWave('about', 'about')}
          onOpen={() => setPanelOpen(true)}
          onClose={() => setPanelOpen(false)}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
        />
        <div style={{ height: 'calc(100vh - 85px)', background: '#fff', pointerEvents: 'all' }}>
          {activePanel === 'news' && <NewsFeedPanel place={searchedPlace} onClose={handleClosePanel} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd} />}
          {activePanel === 'about' && <AboutPanel place={searchedPlace} onClose={handleClosePanel} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd} />}
        </div>
      </div>

      <style>{`
        @keyframes spin  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes ping  { 75%, 100% { transform: scale(2); opacity: 0; } }
        @keyframes hintBob { 0%,100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-8px); } }
        @keyframes glowFade {
          0%   { opacity: 0; }
          15%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes swipeBorderGlow {
          0%, 100% { filter: drop-shadow(0 -4px 12px rgba(109, 40, 217, 0.45)); }
          50% { filter: drop-shadow(0 -12px 28px rgba(124, 58, 237, 0.85)); }
        }
        @keyframes touristPing {
          0%, 100% { box-shadow: 0 0 0 0 currentColor; }
          50% { box-shadow: 0 0 0 8px transparent; }
        }
        .kenshiki-tourist-popup .maplibregl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          border-radius: 20px !important;
          box-shadow: none !important;
        }
        .kenshiki-tourist-popup .maplibregl-popup-tip {
          border-top-color: #0a0f1e !important;
        }
        .kenshiki-popup .maplibregl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          border-radius: 16px !important;
          box-shadow: none !important;
        }
      `}</style>
    </div>
  );
}
