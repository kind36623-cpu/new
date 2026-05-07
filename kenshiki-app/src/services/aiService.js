import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from 'groq-sdk';

const API_KEY      = import.meta.env.VITE_GEMINI_API_KEY || '';
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY  || '';

export const generateDeepInsight = async (article) => {
  if (!API_KEY) {
    console.warn("No Gemini API Key found. Returning mock AI analysis.");
    return new Promise((resolve) => setTimeout(() => {
      resolve({
         background: "According to historical intelligence, this event stems from long-term unresolved tension in the region that has recently escalated due to immediate resource scarcity.",
         cause: "The direct catalyst was a sudden policy shift affecting local infrastructure logistics, forcing immediate, unplanned action from major participants.",
         impact: "Predictive models suggest a 15% disruption in regional supply chains, likely leading to short-term price volatility in global markets before stabilizing in Q3.",
         timeline: [
            "Initial activity detected and flagged by automated monitors.",
            "Policy shift announced, causing immediate market reactions.",
            "Major carriers begin rerouting assets to avoid the affected zone.",
            "International observers initiate emergency dialogue to stabilize situation."
         ]
      });
    }, 2500));
  }

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are an expert geopolitical and economic intelligence analyst for a platform called Kenshiki. 
      Analyze the following news article and synthesize a highly professional, structured intelligence brief.
      
      ARTICLE TITLE: ${article.title}
      ARTICLE DESCRIPTION: ${article.description || ''}
      ARTICLE CONTENT: ${article.content || ''}
      
      Respond STRICTLY in valid JSON format with the following exact keys:
      "background": A concise, highly professional paragraph explaining the historical or broader context of this event.
      "cause": A sentence or two explaining the direct trigger or catalyst for this to happen now.
      "impact": A predictive analysis of global or regional ramifications, written in an authoritative analyst tone.
      "timeline": An array of exactly 3 to 4 short string sentences outlining the sequence of events (past, present, or immediate future).
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const parseableText = jsonMatch ? jsonMatch[1] : responseText;
    
    return JSON.parse(parseableText);
  } catch (error) {
    console.error("AI Generation failed:", error);
    return {
      background: "An error occurred while connecting to the intelligence core.",
      cause: "The AI service encountered an API Error. Please verify the Gemini API key.",
      impact: "Analysis generation halted. Awaiting system resolution.",
      timeline: ["Connection attempted.", "API Key validation failed or Quota exceeded.", "Intelligence generation aborted."]
    };
  }
};

// AI Geocoding: Convert a location text string into lat/lng coordinates
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

  if (!API_KEY) {
    const normalized = locationText.toLowerCase().trim();
    for (const [key, coords] of Object.entries(locationFallbacks)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return coords;
      }
    }
    return { lat: 20, lng: 10 };
  }

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      You are a precision geolocation service. 
      Your ONLY task is to return the geographic center latitude and longitude for the following location: "${locationText}".
      Respond ONLY with raw, valid JSON. No explanation, no markdown, no codeblocks.
      Example output: {"lat": 35.6762, "lng": 139.6503}
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    const clean = responseText.replace(/```json|```/g, '').trim();
    const coords = JSON.parse(clean);
    if (typeof coords.lat === 'number' && typeof coords.lng === 'number') {
      return coords;
    }
    throw new Error('Invalid coords format');
  } catch (error) {
    console.error('AI Geocoding failed:', error);
    return { lat: 20, lng: 10 };
  }
};

// Generate a full deep-dive article from a news item — powered by Groq
export const generateArticleDeepDive = async (article) => {

  const prompt = `You are an elite geopolitical and economic intelligence analyst for Kenshiki, a professional intelligence platform.
Your task is to write a comprehensive 'Deep Dive' intelligence brief based on the following news event.

TITLE: ${article.title}
DESCRIPTION: ${article.description || ''}
SOURCE: ${article.source || 'Global News'}

Format the output STRICTLY in standard Markdown using this exact structure:

# [Create an Engaging, Professional Title for the intelligence brief]

**Source Intelligence:** ${article.source || 'Global News'} | **Region:** [infer region] | **Classification:** OPEN SOURCE

---

## 🌐 Overview & Context
[Write 1-2 rich paragraphs explaining the historical or geographic background leading to this event. Be authoritative and precise.]

## 🔍 Direct Causes & Triggers
[Bullet points (3-5) outlining the specific reasons this is happening now. Each bullet should begin with a bold label like **Economic Pressure:** or **Policy Shift:**]

## 📊 Statistical & Data Analysis
[Create a clean markdown table with at minimum 5 rows synthesizing projected data, financial impact, index scores, or regional metrics relevant to this news. Make well-reasoned analytical estimates where exact numbers aren't available. Headers should be: Metric | Current Status | Projected (90-day)]

## ⚡ Predictive Impact
[Write 1 authoritative paragraph on the medium-to-long-term global or regional consequences of this event.]

---
*Brief generated by Kenshiki Intelligence Engine — Groq × LLaMA 3.3*`;

  // ── Groq path (primary) ────────────────────────────────
  if (GROQ_API_KEY) {
    try {
      const groq = new Groq({ apiKey: GROQ_API_KEY, dangerouslyAllowBrowser: true });
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are an elite intelligence analyst. Always respond in clean Markdown. Never wrap your response in code fences.' },
          { role: 'user',   content: prompt },
        ],
        temperature: 0.65,
        max_tokens: 2048,
      });
      return completion.choices[0]?.message?.content?.trim() || '# Error\n\nEmpty response from Groq.';
    } catch (err) {
      console.error('Groq article generation failed:', err);
      return `# Generation Error\n\nGroq could not synthesize a brief at this time.\n\n**Error:** ${err.message}`;
    }
  }

  // ── Fallback: Gemini (if no Groq key) ─────────────────
  if (API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      let text = result.response.text();
      text = text.replace(/^```(?:markdown)?\n?/m, '').replace(/\n?```$/m, '').trim();
      return text;
    } catch (err) {
      console.error('Gemini fallback failed:', err);
      return `# Generation Error\n\n**Error:** ${err.message}`;
    }
  }

  // ── No key: mock response ──────────────────────────────
  return new Promise((resolve) => setTimeout(() => {
    resolve(`# Deep Intelligence Brief: ${article.title}

**Source Intelligence:** ${article.source || 'Global News'} | **Region:** Global | **Classification:** OPEN SOURCE

---

## 🌐 Overview & Context

This is a simulated intelligence brief (no API key configured). Add your Groq key to VITE_GROQ_API_KEY in .env to enable live AI generation.

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
*Brief generated by Kenshiki Intelligence Engine · Demo Mode*`);
  }, 1800));
};
