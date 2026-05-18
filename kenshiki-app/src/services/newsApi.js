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
      }));

      return { articles, nextPage: data.nextPage || null };
    } catch (e) {
      console.error('Top news fetch failed:', e);
      return { articles: mockNews, nextPage: null };
    }
  }

  // ── Google News RSS via Backend Proxy ─────────────────────────────────────
  try {
    let query = explicitQuery;
    if (!query) {
      const categoryQueries = {
        economic:  'Economy OR Finance OR Markets OR "Global Trade"',
        security:  'Security OR Military OR Cybersecurity OR Geopolitics',
        sports:    'Sports OR Football OR Cricket OR Basketball OR Tennis',
        cultural:  'Culture OR Arts OR Entertainment OR Cinema',
        local:     'Local News OR Community OR Regional',
        insight:   'Analysis OR Opinion OR Investigation',
        technology:'Technology OR AI OR "Software Engineering" OR Gadgets',
        health:    'Health OR Medical OR Medicine OR Wellness',
        science:   'Science OR Space OR Research OR Physics',
      };
      query = categoryQueries[rawCategory] || (rawCategory + ' News');
    }

    // For sports, be more specific to avoid other kinds of news
    if (rawCategory === 'sports' && !explicitQuery) {
      query = 'Sports (Football OR Cricket OR Basketball OR Tennis OR NFL OR MLB OR "Formula 1") -politics -business';
    }

    // RSS doesn't support pagination natively via cursor. 
    // If a second page is requested, we skip RSS and go straight to NewsData.
    if (page && rawCategory !== 'world') {
       throw new Error('RSS does not support pagination, falling back to NewsData');
    }

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
      const imgMatch = descHTML.match(/img[^>]+src="([^">]+)"/);

      return {
        id: `news-${index}-${Date.now()}`,
        title: item.querySelector("title")?.textContent || "Analysis Insight",
        source: item.querySelector("source")?.textContent || "Google News",
        publishedAt: item.querySelector("pubDate")?.textContent || new Date().toISOString(),
        category: rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1),
        author: "Analyst Desk",
        description: cleanDesc.length > 200 ? cleanDesc.slice(0, 200) + '...' : cleanDesc || "New global development report.",
        location: explicitQuery ? explicitQuery.replace(/["']/g, '').replace(/ local news/i, '').trim() : "Global",
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

    return { articles: rssArticles, nextPage: null };

  } catch (error) {
    console.error("RSS/Proxy failed or pagination requested, using NewsData.io:", error.message);

    const newsDataCategoryMap = {
      economic:   'business',
      security:   'politics',
      sports:     'sports',
      cultural:   'entertainment',
      local:      'top',
      insight:    'top',
      technology: 'technology',
      health:     'health',
      science:    'science',
    };
    const newsDataCategory = newsDataCategoryMap[rawCategory] || 'top';

    try {
      const fallbackUrl = `${BACKEND_URL}/api/news/category?cat=${newsDataCategory}${page ? `&page=${page}` : ''}`;
      const fallbackRes = await fetch(fallbackUrl);
      if (!fallbackRes.ok) throw new Error('NewsData fallback also failed');
      const fallbackData = await fallbackRes.json();
      
      if (!fallbackData.results || fallbackData.results.length === 0) return { articles: mockNews, nextPage: null };

      const articles = fallbackData.results.map((article, index) => ({
        id: article.article_id || `fallback-${index}-${Date.now()}`,
        title: article.title,
        source: article.source_id || 'News Feed',
        publishedAt: article.pubDate || new Date().toISOString(),
        category: rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1),
        author: (article.creator && article.creator.length > 0) ? article.creator[0] : 'Analyst Desk',
        description: article.description || 'No summary available.',
        location: (article.country && article.country.length > 0) ? article.country[0] : 'Global',
        thumbnail: article.image_url || null,
        color: 'blue',
        coords: null,
      }));
      
      return { articles, nextPage: fallbackData.nextPage || null };
    } catch (fallbackError) {
      console.error("All news sources failed:", fallbackError.message);
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
