// ── Backend URL ────────────────────────────────────────────────────────────────
// In development:  Vite proxy rewrites /api → http://localhost:5000
// In production:   VITE_BACKEND_URL is set in Vercel env vars → your Render URL
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

// NewsData.io key still used as a fallback if backend proxy is unavailable
const API_KEY = import.meta.env.VITE_NEWS_API_KEY || 'pub_07ec3f5b03bc47ab99562d3f8855b97f';

import { extractPreciseLocation } from './aiService';

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
  } catch (error) {
    console.error("fetchSerperImage error:", error);
    return null;
  }
}

async function fetchResourceImage(url) {
  try {
    if (!url) return null;
    const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(4000) });
    const text = await res.text();
    
    // Check if Google News JS redirect
    let finalUrl = url;
    const redirectMatch = text.match(/window\.location\.replace\('([^']+)'\)/) || text.match(/<a[^>]+href="([^"]+)"[^>]*>click here<\/a>/i);
    
    let html = text;
    if (redirectMatch) {
       finalUrl = redirectMatch[1];
       const res2 = await fetch('https://corsproxy.io/?' + encodeURIComponent(finalUrl), { signal: AbortSignal.timeout(4000) });
       html = await res2.text();
    }
    
    const ogMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^">]+)"/i) || html.match(/<meta[^>]+content="([^">]+)"[^>]+property="og:image"/i);
    return ogMatch ? ogMatch[1] : null;
  } catch (error) {
    return null;
  }
}

const CATEGORY_THEME_IMAGES = {
  economic: [
    "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1618042164219-62c820f10723?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?q=80&w=800&auto=format&fit=crop"
  ],
  security: [
    "https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1508873696983-2df519f0397e?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=800&auto=format&fit=crop"
  ],
  sports: [
    "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1595435934249-5df7ed86e196?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=800&auto=format&fit=crop"
  ],
  cultural: [
    "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1549887534-1541e9326642?q=80&w=800&auto=format&fit=crop"
  ],
  local: [
    "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1519501025264-65ba15a82390?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=800&auto=format&fit=crop"
  ],
  insight: [
    "https://images.unsplash.com/photo-1450133064473-71024230f91b?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=800&auto=format&fit=crop"
  ],
  technology: [
    "https://images.unsplash.com/photo-1677442136019-21780efad99a?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1601987177651-8edfe6c20009?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=800&auto=format&fit=crop"
  ],
  health: [
    "https://images.unsplash.com/photo-1532187643603-ba119ca4109e?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1507668077129-56e32842fceb?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=800&auto=format&fit=crop"
  ],
  science: [
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1576086213369-97a306d36557?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?q=80&w=800&auto=format&fit=crop"
  ],
  world: [
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1495020689067-958852a6565d?q=80&w=800&auto=format&fit=crop"
  ],
  general: [
    "https://images.unsplash.com/photo-1495020689067-958852a6565d?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop"
  ]
};

export function getThemedPlaceholder(category, title) {
  const cat = String(category).toLowerCase();
  const list = CATEGORY_THEME_IMAGES[cat] || CATEGORY_THEME_IMAGES.general;
  
  // Deterministic hashing based on title characters
  let hash = 0;
  const str = String(title || '');
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % list.length;
  return list[index];
}

// Fallback intelligence data in case of API failure
const mockNews = [
  {
    id: "m1",
    title: "The Shift in Global Trade Routes: 2024 Analysis",
    source: "Kenshiki Global Institute",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    category: "Economic",
    author: "Dr. Helena Vance",
    description: "Recent data suggests a permanent shift in maritime logistics following recent geopolitical tensions.",
    content: "For decades, the standard flow of global goods followed a predictable network. However, recent disruptions have catalyzed a dramatic reconfiguration. Analysis of real-time supply chain data reveals major carriers are relying on AI-driven dynamic routing.",
    location: "Global Data",
    color: "blue",
    coords: [15.0, 65.0]
  },
  {
    id: "m2",
    title: "Cyber Resilience in Emerging Markets",
    source: "Tech Daily",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    category: "Security",
    author: "James Chen",
    description: "Strategies for protecting digital infrastructure in rapidly developing nations across Southeast Asia.",
    content: "Emerging markets are facing unprecedented challenges in cyber security as rapid digitalization outpaces regulatory frameworks. This report examines vulnerability density across Southeast Asia's growing tech hubs.",
    location: "Asia Sector",
    color: "slate",
    coords: [14.5, 120.9]
  }
];

export const fetchNewsFeed = async (category = 'world', explicitQuery = null, page = null) => {
  const rawCategory = category === 'general' ? 'world' : category;

  // ── World / Top News ───────────────────────────────────────────────────────
  if (rawCategory === 'world') {
    try {
      const response = await fetch(`${BACKEND_URL}/api/news/top${page ? `?page=${page}` : ''}`);
      if (!response.ok) throw new Error(`Backend news proxy: ${response.status}`);
      const data = await response.json();
      if (!data.results) return { articles: mockNews, nextPage: null };

      const articles = data.results.map((article, index) => ({
        id: article.article_id || `live-${index}-${Date.now()}`,
        title: article.title,
        source: article.source_id || 'Unknown Feed',
        publishedAt: article.pubDate || new Date().toISOString(),
        category: 'World',
        author: (article.creator && article.creator.length > 0) ? article.creator[0] : 'Analyst Desk',
        description: article.description || 'No summary available.',
        location: (article.country && article.country.length > 0) ? article.country[0] : 'Global',
        thumbnail: article.image_url || null,
        color: 'blue',
        coords: null
      }));

      await Promise.all(articles.map(async (art) => {
        if (!art.thumbnail) {
          art.thumbnail = await fetchSerperImage(art.title);
        }
        if (!art.thumbnail) {
          art.thumbnail = getThemedPlaceholder('world', art.title);
        }
      }));

      return { articles, nextPage: data.nextPage || null };
    } catch (e) {
      console.error('Top news fetch failed:', e);
      return { articles: mockNews, nextPage: null };
    }
  }

  // ── NewsData.io Direct Fetch (Prioritize for EXACT images) ────────────────
  try {
    let query = explicitQuery;
    if (!query) {
      const categoryQueries = {
        economic:  'Economy OR Finance OR Markets OR "Global Trade"',
        security:  'Security OR Military OR Cybersecurity OR Geopolitics',
        sports:    'Sports AND (Football OR Cricket OR Basketball OR Tennis OR NFL OR MLB OR "Formula 1") -politics -business',
        cultural:  'Culture OR Arts OR Entertainment OR Cinema',
        local:     'Local News OR Community OR Regional',
        insight:   'Analysis OR Opinion OR Investigation',
        technology:'Technology OR AI OR "Software Engineering" OR Gadgets',
        health:    'Health OR Medical OR Medicine OR Wellness',
        science:   'Science OR Space OR Research OR Physics',
      };
      query = categoryQueries[rawCategory] || (rawCategory + ' News');
    }

    const newsDataUrl = `https://newsdata.io/api/1/news?apikey=${API_KEY}&q=${encodeURIComponent(query)}&language=en${page ? `&page=${page}` : ''}`;
    const res = await fetch(newsDataUrl);
    if (!res.ok) throw new Error(`NewsData returned ${res.status}`);
    
    const data = await res.json();
    if (!data.results || data.results.length === 0) throw new Error('Empty NewsData results');

    const articles = data.results.map((article, index) => ({
      id: article.article_id || `news-${index}-${Date.now()}`,
      title: article.title,
      source: article.source_id || article.source_name || 'News Feed',
      publishedAt: article.pubDate || new Date().toISOString(),
      category: rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1),
      author: (article.creator && article.creator.length > 0) ? article.creator[0] : 'Analyst Desk',
      description: article.description || 'No summary available.',
      location: (article.country && article.country.length > 0) ? article.country[0] : 'Global',
      thumbnail: article.image_url || getThemedPlaceholder(rawCategory, article.title),
      url: article.link,
      color: 'blue',
      coords: null
    }));

    return { articles, nextPage: data.nextPage || null };

  } catch (error) {
    console.error("NewsData direct fetch failed, falling back to RSS:", error.message);

    // ── Fallback to Google News RSS Proxy ─────────────────────────────────────
    try {
      if (page) throw new Error('RSS does not support pagination');
      
      let query = explicitQuery || (rawCategory + ' News');
      const res = await fetch(`${BACKEND_URL}/api/news/rss?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error(`RSS proxy returned ${res.status}`);

      const text = await res.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");
      const items = Array.from(xmlDoc.querySelectorAll("item")).slice(0, 15);

      if (items.length === 0) throw new Error('Empty RSS feed');

      const rssArticles = items.map((item, index) => {
        const descHTML = item.querySelector("description")?.textContent || "";
        const cleanDesc = descHTML.replace(/<[^>]+>/g, '').trim();
        const rawLink = item.querySelector("link")?.textContent;
        return {
          id: `news-${index}-${Date.now()}`,
          title: item.querySelector("title")?.textContent || "Analysis Insight",
          source: item.querySelector("source")?.textContent || "Google News",
          publishedAt: item.querySelector("pubDate")?.textContent || new Date().toISOString(),
          category: rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1),
          author: "Analyst Desk",
          description: cleanDesc.length > 200 ? cleanDesc.slice(0, 200) + '...' : cleanDesc || "New global development report.",
          location: "Global",
          thumbnail: null,
          url: rawLink,
          color: "blue",
          coords: null
        };
      });

      // Try fetching exact images via proxy, otherwise use placeholders
      // We DO NOT use Serper anymore to prevent showing incorrect/unrelated images.
      await Promise.all(rssArticles.map(async (art) => {
        if (art.url) {
          art.thumbnail = await fetchResourceImage(art.url);
        }
        if (!art.thumbnail) {
          art.thumbnail = getThemedPlaceholder(rawCategory, art.title);
        }
      }));

      return { articles: rssArticles, nextPage: null };

    } catch (rssError) {
      console.error("RSS Fallback also failed:", rssError.message);
      return { articles: mockNews, nextPage: null };
    }
  }
};


/**
 * AI-Powered Intelligence Engine
 * Performs deep analysis on news content to find precise locations and virtual status.
 * Uses Nominatim Geocoding (OSM) for real-world accuracy.
 */
export const getArticleIntelligence = async (article, fallbackCoords = [20, 0]) => {
  const text = `${article.title} ${article.description || ''}`.toLowerCase();
  
  // 1. AI Analysis Case: Detect Virtual/Online Integration
  const virtualKeywords = ['online', 'virtual', 'zoom', 'meeting', 'remotely', 'global integration', 'several groups', 'multilateral'];
  const isVirtual = virtualKeywords.some(kw => text.includes(kw));

  // 2. Accurate Location Identification
  let rawLoc = article.location || 'Global';
  
  // ALWAYS try to extract the precise city/town from the article text
  rawLoc = await extractPreciseLocation(article.title, article.description || '', rawLoc, article.content || '');

  let locationQuery = rawLoc === 'Global' ? '' : rawLoc;
  const updatedArticle = { ...article, location: rawLoc };
  
  // 3. Geocode using OpenStreetMap Nominatim
  const geocode = async (query) => {
    if (!query) return null;
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'KenshikiApp/2.0 (contact@kenshiki.ai)' } }
      );
      if (!resp.ok) return null;
      const data = await resp.json();
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    } catch (e) {
      console.warn("Geocoding failed for:", query, e);
    }
    return null;
  };

  let coords = await geocode(locationQuery);

  // 4. Intelligence Synthesis: Handle the 'Online Integration' Case
  if (isVirtual) {
    // If no specific place found for a virtual integration, we use a central fallback
    if (!coords) {
      return { 
        ...updatedArticle, 
        isVirtual: true, 
        coords: [0, 0], // Central fallback so marker ALWAYS shows
        hasLocationIssue: true,
        intelligenceNote: "This is a virtual integration of several groups online. No specific physical location provided." 
      };
    }
    return { 
      ...updatedArticle, 
      isVirtual: true, 
      coords: coords, 
      intelligenceNote: `Participating from ${updatedArticle.location}` 
    };
  }

  // Standard news fallback - always ensure coords [lat, lon]
  return { 
    ...updatedArticle, 
    isVirtual: false, 
    coords: coords || fallbackCoords
  };
};
