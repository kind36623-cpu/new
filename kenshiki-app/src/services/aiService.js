import { GoogleGenerativeAI } from "@google/generative-ai";

// Gemini is used only for lightweight tasks (geocoding, map intel)
// The VITE_GEMINI_API_KEY is a client-side key restricted to this domain in GCP Console.
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Backend URL — set VITE_BACKEND_URL in Vercel dashboard
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

// ── generateDeepInsight (Gemini — used by map sidebar) ──────────────
export const generateDeepInsight = async (article) => {
  if (!GEMINI_KEY) {
    return new Promise((resolve) => setTimeout(() => resolve({
      background: "According to historical intelligence, this event stems from long-term unresolved tension in the region.",
      cause: "The direct catalyst was a sudden policy shift affecting local infrastructure logistics.",
      impact: "Predictive models suggest a 15% disruption in regional supply chains.",
      timeline: [
        "Initial activity detected and flagged by automated monitors.",
        "Policy shift announced, causing immediate market reactions.",
        "Major carriers begin rerouting assets to avoid the affected zone.",
        "International observers initiate emergency dialogue.",
      ],
    }), 2500));
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      You are an expert geopolitical analyst for Kenshiki.
      Analyze the following news article and return STRICTLY valid JSON with keys:
      "background", "cause", "impact", "timeline" (array of 3-4 strings).

      ARTICLE TITLE: ${article.title}
      ARTICLE DESCRIPTION: ${article.description || ''}
      ARTICLE CONTENT: ${article.content || ''}
    `;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const parseableText = jsonMatch ? jsonMatch[1] : responseText;
    return JSON.parse(parseableText);
  } catch (error) {
    if (import.meta.env.DEV) console.error("AI deep insight failed:", error);
    return {
      background: "Unable to retrieve context at this time.",
      cause: "The intelligence core encountered an API error.",
      impact: "Analysis generation halted. Awaiting system resolution.",
      timeline: ["Connection attempted.", "API validation failed or quota exceeded.", "Intelligence generation aborted."],
    };
  }
};

// ── extractCoordinates (Gemini + Nominatim fallback) ─────────────────
export const extractCoordinates = async (locationText) => {
  const locationFallbacks = {
    'global data': { lat: 0, lng: 0 },
    'global': { lat: 20, lng: 10 },
    'asia sector': { lat: 14.5, lng: 120.9 },
    'europe': { lat: 48.8, lng: 10.0 },
    'scandinavia': { lat: 60.1, lng: 19.9 },
    'middle east': { lat: 26.8, lng: 45.0 },
    'africa': { lat: 8.0, lng: 25.0 },
    'north america': { lat: 40.0, lng: -100.0 },
    'south america': { lat: -15.0, lng: -55.0 },
  };

  if (!GEMINI_KEY) {
    const normalized = locationText.toLowerCase().trim();
    for (const [key, coords] of Object.entries(locationFallbacks)) {
      if (normalized.includes(key) || key.includes(normalized)) return coords;
    }
    return { lat: 20, lng: 10 };
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Return ONLY raw JSON with "lat" and "lng" for: "${locationText}". Example: {"lat":35.67,"lng":139.65}`;
    const result = await model.generateContent(prompt);
    const clean = result.response.text().trim().replace(/```json|```/g, '').trim();
    const coords = JSON.parse(clean);
    if (typeof coords.lat === 'number' && typeof coords.lng === 'number') return coords;
    throw new Error('Invalid coords format');
  } catch (error) {
    if (import.meta.env.DEV) console.error('AI Geocoding failed:', error);
    return { lat: 20, lng: 10 };
  }
};

export const extractPreciseLocation = async (title, description, fallback, content = '') => {
  // Try backend first
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(`${BACKEND_URL}/api/ai/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, content, fallback }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    if (res.ok) {
      const data = await res.json();
      if (data.location) return data.location;
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn('Backend location extract failed, falling back to Gemini:', e.message);
  }

  // Fallback to Gemini if backend is unavailable
  if (!GEMINI_KEY) return fallback;
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `You are a geographic entity extractor. 
Extract the most specific city, state, or precise location where this news event occurred based on the text.
Return ONLY the place name formatted as "City, State, Country" (or as close as possible).
Do NOT include words like "in" or "near". Do NOT use markdown.
If no specific place is mentioned, return exactly "${fallback}".

Title: ${title}
Description: ${description}
Content: ${content}`;

    const result = await model.generateContent(prompt);
    const place = result.response.text().trim();
    if (place && place.length > 0 && place.length < 50) return place;
    return fallback;
  } catch (error) {
    if (import.meta.env.DEV) console.error('AI Precise Location failed:', error);
    return fallback;
  }
};

// ── generateArticleDeepDive (routed through backend — GROQ_API_KEY stays server-side) ──
export const generateArticleDeepDive = async (article) => {
  // Try backend first
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(`${BACKEND_URL}/api/ai/brief`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: article.title,
        description: article.description || '',
        source: article.source || 'Global News',
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.content) return data.content;
    }
  } catch (err) {
    if (import.meta.env.DEV) console.warn('Backend AI brief failed, using mock:', err.message);
  }

  // Fallback mock when backend is unreachable
  return new Promise((resolve) => setTimeout(() => {
    resolve(`# Deep Intelligence Brief: ${article.title}

**Source Intelligence:** ${article.source || 'Global News'} | **Region:** Global | **Classification:** OPEN SOURCE

---

## 🌐 Overview & Context

This intelligence brief was generated in offline mode. Configure \`VITE_BACKEND_URL\` in your Vercel environment variables pointing to your Render backend to enable live AI generation.

## 🔍 Direct Causes & Triggers

- **Primary Driver:** Underlying structural pressures building over several quarters
- **Immediate Catalyst:** A specific event that pushed existing tensions past a critical threshold
- **Enabling Condition:** Geopolitical or economic circumstances that allowed this now

## 📊 Statistical & Data Analysis

| Metric | Current Status | Projected (90-day) |
|---|---|---|
| Regional Stability Index | Moderate | Declining |
| Economic Exposure | Medium-High | High |
| Diplomatic Activity | Elevated | Very High |
| Global Media Coverage | Tier 2 | Tier 1 |
| Resolution Timeline | Unknown | 30-60 days |

## ⚡ Predictive Impact

This event is expected to generate significant ripple effects across adjacent sectors in the short-to-medium term.

---
*Brief generated by Kenshiki Intelligence Engine · Offline Mode*`);
  }, 800));
};
