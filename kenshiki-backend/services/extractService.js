import axios from 'axios';
import * as cheerio from 'cheerio';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

const MAX_CHARS = 3000;
const MIN_CHARS = 300;

// ── Text cleaning ─────────────────────────────────────────────────────────────
function cleanText(text) {
    return text
        .replace(/\s+/g, ' ')                  // collapse whitespace
        .replace(/\n{3,}/g, '\n\n')            // max 2 blank lines
        .replace(/[^\x20-\x7E\n]/g, '')        // remove non-printable chars
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 20)            // remove junk short lines
        .filter((v, i, a) => a.indexOf(v) === i) // remove duplicate lines
        .join('\n')
        .trim()
        .slice(0, MAX_CHARS);
}

// ── Readability extraction ────────────────────────────────────────────────────
function extractWithReadability(html, url) {
    try {
        const dom = new JSDOM(html, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        if (article?.textContent && article.textContent.trim().length > 200) {
            return cleanText(article.textContent);
        }
    } catch { /* fall through */ }
    return null;
}

// ── Cheerio fallback extraction ───────────────────────────────────────────────
function extractWithCheerio(html) {
    try {
        const $ = cheerio.load(html);
        // Remove script/style/nav/header/footer noise
        $('script, style, nav, header, footer, aside, form, button, iframe').remove();
        const text = $('article, main, [role="main"], .content, .post, body')
            .first()
            .text();
        return cleanText(text);
    } catch { return null; }
}

// ── Main extractor: axios → Readability → Cheerio ─────────────────────────────
export async function extractContent(url) {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
    };

    try {
        const res = await axios.get(url, { headers, timeout: 10000, maxContentLength: 5_000_000 });
        const html = res.data;

        // Try Readability first
        const readability = extractWithReadability(html, url);
        if (readability && readability.length >= MIN_CHARS) return readability;

        // Cheerio fallback
        const cheerioText = extractWithCheerio(html);
        if (cheerioText && cheerioText.length >= MIN_CHARS) return cheerioText;

    } catch (err) {
        console.warn(`⚠️  Extract failed for ${url}: ${err.message}`);
    }

    return null;
}

// ── Chunk text into 500-char overlapping pieces ───────────────────────────────
export function chunkText(text, chunkSize = 500, overlap = 50) {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
        chunks.push(text.slice(i, i + chunkSize));
        i += chunkSize - overlap;
    }
    return chunks.filter(c => c.trim().length > 100);
}
