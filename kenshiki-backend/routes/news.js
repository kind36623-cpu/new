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

    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q.trim())}&hl=en-US&gl=US&ceid=US:en`;

    try {
        const response = await axios.get(rssUrl, {
            headers: {
                // Google expects a browser-like user agent
                'User-Agent': 'Mozilla/5.0 (compatible; KenshikiBot/2.0; +https://kenshiki.app)',
                'Accept': 'application/rss+xml, application/xml, text/xml, */*',
            },
            timeout: 10000,
            responseType: 'text',
        });

        // Forward the XML directly — set correct content type
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=300'); // 5 min cache
        res.status(200).send(response.data);
    } catch (error) {
        console.error('Google RSS proxy error:', error.message);
        res.status(502).json({ error: 'Failed to fetch Google News RSS', details: error.message });
    }
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

export default router;
