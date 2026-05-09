import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import aiRoutes from './routes/ai.js';
import searchRoutes from './routes/search.js';
import newsRoutes from './routes/news.js';

// Load environment variables (local dev only — on Render set vars via dashboard)
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── CORS: allow requests from Vercel frontend + local dev ─────────────────────
const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:3000',
    // Your Vercel production URL — set FRONTEND_URL on Render dashboard
    process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. Render health checks, curl)
        if (!origin) return callback(null, true);
        if (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app')) {
            return callback(null, true);
        }
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
}));

app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'kenshiki-backend' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api', aiRoutes);
app.use('/api', searchRoutes);
app.use('/api', newsRoutes);

app.listen(PORT, () => {
    console.log(`Kenshiki Intelligence Backend is running on port ${PORT}`);
});



