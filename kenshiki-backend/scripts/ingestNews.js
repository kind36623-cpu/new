import fs from 'fs';
import path from 'path';
import { pipeline, env } from '@xenova/transformers';

env.localModelPath = './models';
env.allowLocalModels = false;

const DB_PATH = path.join(process.cwd(), 'database.json');

const newsData = [
    {
        id: "1",
        title: "Global Supply Chain Disruptions 2026",
        content: "A major disruption in global supply chains has caused delays in shipping and logistics worldwide. Historical data from 2024 shows a similar trend. The direct cause is port strikes in Europe and Asia."
    },
    {
        id: "2",
        title: "New AI Regulations Passed in the EU",
        content: "The European Union has passed stringent regulations on AI development, impacting major players. Companies must now audit their models for bias."
    },
    {
        id: "3",
        title: "Tech Giants Announce Merger",
        content: "Two massive technology conglomerates are hinting at a merger to consolidate hardware manufacturing in India, aiming to reduce reliance on East Asian supply chains."
    }
];

async function main() {
    console.log('Loading local embedding model (Transformers.js)...');
    const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });

    const memoryDb = {
        collection: 'kenshiki_memory',
        vectors: []
    };

    console.log('Embedding and ingesting news articles...');
    
    for (const news of newsData) {
        const textToEmbed = `Title: ${news.title}. Content: ${news.content}`;
        const output = await embedder(textToEmbed, { pooling: 'mean', normalize: true });
        const vectorArray = Array.from(output.data);

        memoryDb.vectors.push({
            id: news.id,
            vector: vectorArray,
            payload: {
                title: news.title,
                content: news.content
            }
        });
        console.log(`- Ingested: ${news.title}`);
    }

    console.log('Writing embeddings to database.json...');
    fs.writeFileSync(DB_PATH, JSON.stringify(memoryDb, null, 2));

    console.log('Ingestion complete! Zero-dependency Vector Database is ready.');
}

main().catch(console.error);
