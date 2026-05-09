// ── Backend URL ────────────────────────────────────────────────────────────────
// In development:  Vite proxy rewrites /api → http://localhost:5000
// In production:   VITE_BACKEND_URL is set in Vercel env vars → your Render URL
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

// NewsData.io key still used as a fallback if backend proxy is unavailable
const API_KEY = import.meta.env.VITE_NEWS_API_KEY || 'pub_07ec3f5b03bc47ab99562d3f8855b97f';

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

export const fetchNewsFeed = async (category = 'world', explicitQuery = null) => {
  const rawCategory = category === 'general' ? 'world' : category;

  // ── World / Top News ───────────────────────────────────────────────────────
  // Route through backend proxy (keeps API key server-side, works on Vercel)
  if (rawCategory === 'world') {
    try {
      // Try backend proxy first (works in prod + local)
      const response = await fetch(`${BACKEND_URL}/api/news/top`);
      if (!response.ok) throw new Error(`Backend news proxy: ${response.status}`);
      const data = await response.json();
      if (!data.results) return mockNews;

      const articles = data.results.map((article, index) => ({
        id: article.article_id || `live-${index}`,
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
      }));

      return articles;
    } catch (e) {
      console.error('Top news fetch failed:', e);
      return mockNews;
    }
  }

  // ── Google News RSS via Backend Proxy ─────────────────────────────────────
  // The backend (Render) fetches Google RSS server-side — no CORS issues
  try {
    let query = explicitQuery;
    if (!query) {
      if (rawCategory === 'economic') {
        query = 'Economy OR Global Finance OR Markets OR Economic';
      } else if (rawCategory === 'security') {
        query = 'Global Security OR Military OR Intelligence OR Cybersecurity OR Geopolitics';
      } else if (rawCategory === 'sports') {
        query = 'Sports OR Football OR Cricket OR Tennis OR Olympics OR NBA OR FIFA';
      } else {
        query = rawCategory + ' News';
      }
    }

    // Call our backend RSS proxy — works from both Vercel (prod) and localhost (dev)
    const res = await fetch(`${BACKEND_URL}/api/news/rss?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`RSS proxy returned ${res.status}`);
    const text = await res.text();

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");
    const items = Array.from(xmlDoc.querySelectorAll("item")).slice(0, 15);

    if (items.length === 0) return mockNews;

    const rssArticles = items.map((item, index) => {
      const descHTML = item.querySelector("description")?.textContent || "";
      const cleanDesc = descHTML.replace(/<[^>]+>/g, '').trim();
      const imgMatch = descHTML.match(/img[^>]+src="([^">]+)"/);

      return {
        id: `news-${index}`,
        title: item.querySelector("title")?.textContent || "Analysis Insight",
        source: item.querySelector("source")?.textContent || "Google News",
        publishedAt: item.querySelector("pubDate")?.textContent || new Date().toISOString(),
        category: rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1),
        author: "Analyst Desk",
        description: cleanDesc.length > 200 ? cleanDesc.slice(0, 200) + '...' : cleanDesc || "New global development report.",
        location: explicitQuery ? explicitQuery : "Global",
        thumbnail: imgMatch ? imgMatch[1] : null,
        color: "blue",
        coords: null
      };
    });

    await Promise.all(rssArticles.map(async (art) => {
      if (!art.thumbnail) {
        art.thumbnail = await fetchSerperImage(art.title);
      }
    }));

    return rssArticles;
  } catch (error) {
    console.error("Error fetching live Google RSS news:", error);
    return mockNews;
  }
};


/**
 * AI-Powered Intelligence Engine
 * Performs deep analysis on news content to find precise locations and virtual status.
 * Uses Nominatim Geocoding (OSM) for real-world accuracy.
 */
export const getArticleIntelligence = async (article) => {
  const text = `${article.title} ${article.description || ''}`.toLowerCase();
  
  // 1. AI Analysis Case: Detect Virtual/Online Integration
  const virtualKeywords = ['online', 'virtual', 'zoom', 'meeting', 'remotely', 'global integration', 'several groups', 'multilateral'];
  const isVirtual = virtualKeywords.some(kw => text.includes(kw));

  // 2. Accurate Location Identification
  // We use the article's existing location metadata or scan for names if needed.
  let locationQuery = article.location === 'Global' ? '' : article.location;
  
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
        ...article, 
        isVirtual: true, 
        coords: [0, 0], // Central fallback so marker ALWAYS shows
        hasLocationIssue: true,
        intelligenceNote: "This is a virtual integration of several groups online. No specific physical location provided." 
      };
    }
    return { 
      ...article, 
      isVirtual: true, 
      coords: coords, 
      intelligenceNote: `Participating from ${article.location}` 
    };
  }

  // Standard news fallback - always ensure coords [lat, lon]
  return { 
    ...article, 
    isVirtual: false, 
    coords: coords || [20, 0] // Default to a visible cental point if unknown
  };
};
