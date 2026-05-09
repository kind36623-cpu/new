import express from 'express';
import axios from 'axios';

const router = express.Router();

/**
 * GET /api/news/rss?q=<query>
 * Server-side proxy for Google News RSS — eliminates CORS issues on Vercel/Render.
 * The browser never calls Google directly; this Render endpoint does it.
 */
router.get('/news/rss', async (req, res) => {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const query = q.trim();

    // Try two different Google News RSS URL formats
    const urls = [
        `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`,
        `https://news.google.com/news/rss/search/section/q/${encodeURIComponent(query)}?ned=us&hl=en`,
    ];

    // Full Chrome browser headers — Google rejects bot-looking requests
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://news.google.com/',
        'Cache-Control': 'no-cache',
    };

    for (const rssUrl of urls) {
        try {
            const response = await axios.get(rssUrl, {
                headers,
                timeout: 12000,
                responseType: 'text',
                // Follow redirects
                maxRedirects: 5,
            });

            if (response.status === 200 && response.data && response.data.includes('<item>')) {
                res.setHeader('Content-Type', 'application/xml; charset=utf-8');
                res.setHeader('Cache-Control', 'public, max-age=300');
                return res.status(200).send(response.data);
            }
        } catch (err) {
            console.warn(`RSS attempt failed for URL: ${rssUrl} — ${err.message}`);
        }
    }

    // All attempts failed
    console.error('All Google RSS attempts failed for query:', query);
    res.status(502).json({ error: 'Failed to fetch Google News RSS', query });
});

/**
 * GET /api/news/top?apikey=<key>
 * Server-side proxy for NewsData.io — keeps API key off the client.
 * The backend reads the key from its own env vars.
 */
router.get('/news/top', async (req, res) => {
    const API_KEY = process.env.VITE_NEWS_API_KEY || process.env.NEWS_API_KEY;

    if (!API_KEY) {
        return res.status(503).json({ error: 'NewsData API key not configured on server' });
    }

    try {
        const response = await axios.get(
            `https://newsdata.io/api/1/news?apikey=${API_KEY}&language=en&category=top`,
            { timeout: 10000 }
        );

        res.setHeader('Cache-Control', 'public, max-age=300');
        res.json(response.data);
    } catch (error) {
        console.error('NewsData proxy error:', error.message);
        res.status(502).json({ error: 'Failed to fetch top news', details: error.message });
    }
});

/**
 * GET /api/news/category?cat=<newsdata_category>
 * Fallback endpoint — used when Google RSS is blocked.
 * Fetches NewsData.io by category slug (business, entertainment, sports, etc.)
 */
router.get('/news/category', async (req, res) => {
    const API_KEY = process.env.VITE_NEWS_API_KEY || process.env.NEWS_API_KEY;
    const cat = req.query.cat || 'top';

    if (!API_KEY) {
        return res.status(503).json({ error: 'NewsData API key not configured on server' });
    }

    try {
        const response = await axios.get(
            `https://newsdata.io/api/1/news?apikey=${API_KEY}&language=en&category=${cat}`,
            { timeout: 10000 }
        );

        res.setHeader('Cache-Control', 'public, max-age=300');
        res.json(response.data);
    } catch (error) {
        console.error('NewsData category proxy error:', error.message);
        res.status(502).json({ error: 'Failed to fetch category news', details: error.message });
    }
});

export default router;
