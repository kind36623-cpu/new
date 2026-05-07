import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import aiRoutes from './routes/ai.js';
import searchRoutes from './routes/search.js';

// Try to load env from backend first, fallback to app
dotenv.config();
dotenv.config({ path: '../kenshiki-app/.env', override: false });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api', aiRoutes);
app.use('/api', searchRoutes);

app.listen(PORT, () => {
    console.log(`Kenshiki Intelligence Backend is running on port ${PORT}`);
});



