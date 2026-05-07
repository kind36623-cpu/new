import axios from 'axios';

// ── Bad domain blocklist ──────────────────────────────────────────────────────
const BLOCKED_DOMAINS = [
    'youtube.com', 'facebook.com', 'twitter.com', 'x.com',
    'instagram.com', 'tiktok.com', 'reddit.com', 'pinterest.com',
    'login.', 'signin.', 'accounts.', 'auth.',
];

function isBlockedUrl(url) {
    try {
        const hostname = new URL(url).hostname;
        return BLOCKED_DOMAINS.some(d => hostname.includes(d));
    } catch { return true; }
}

// ── Deduplicate by domain ─────────────────────────────────────────────────────
function deduplicateByDomain(results) {
    const seen = new Set();
    return results.filter(r => {
        try {
            const domain = new URL(r.url).hostname;
            if (seen.has(domain)) return false;
            seen.add(domain);
            return true;
        } catch { return false; }
    });
}

// ── Normal Mode: Tavily ───────────────────────────────────────────────────────
export async function searchNormal(query) {
    const TAVILY_KEY = process.env.VITE_TAVILY_API_KEY;
    if (!TAVILY_KEY) throw new Error('TAVILY_API_KEY not set');

    const res = await axios.post(
        'https://api.tavily.com/search',
        {
            query,
            search_depth: 'basic',
            include_answer: false,
            max_results: 8,
        },
        { headers: { Authorization: `Bearer ${TAVILY_KEY}` }, timeout: 12000 }
    );

    const raw = (res.data.results || [])
        .filter(r => r.url && !isBlockedUrl(r.url))
        .map(r => ({ url: r.url, title: r.title || '', snippet: r.content || '' }));

    return deduplicateByDomain(raw).slice(0, 5);
}

// ── Pro Mode: Serper ──────────────────────────────────────────────────────────
export async function searchPro(query) {
    const SERPER_KEY = process.env.VITE_SERPER_API_KEY;
    if (!SERPER_KEY) throw new Error('SERPER_API_KEY not set');

    const res = await axios.post(
        'https://google.serper.dev/search',
        { q: query, num: 10 },
        {
            headers: {
                'X-API-KEY': SERPER_KEY,
                'Content-Type': 'application/json',
            },
            timeout: 12000,
        }
    );

    const organic = res.data.organic || [];
    const raw = organic
        .filter(r => r.link && !isBlockedUrl(r.link))
        .map(r => ({ url: r.link, title: r.title || '', snippet: r.snippet || '' }));

    return deduplicateByDomain(raw).slice(0, 5);
}
