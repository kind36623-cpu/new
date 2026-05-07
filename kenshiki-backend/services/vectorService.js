import { Pinecone } from '@pinecone-database/pinecone';
import { pipeline, env } from '@xenova/transformers';

env.localModelPath = './models';
env.allowLocalModels = false;

const PINECONE_KEY   = process.env.VITE_PINECONE_API_KEY;
const INDEX_NAME     = process.env.VITE_PINECONE_INDEX || 'kenshiki-rag';

// Singleton clients
let pc          = null;
let pineconeIdx = null;
let embedder    = null;

// ── Init Pinecone ─────────────────────────────────────────────────────────────
async function getPineconeIndex() {
    if (pineconeIdx) return pineconeIdx;

    if (!PINECONE_KEY) throw new Error('VITE_PINECONE_API_KEY not set');

    pc = new Pinecone({ apiKey: PINECONE_KEY });

    // Create index if it doesn't exist
    try {
        const list = await pc.listIndexes();
        const names = (list.indexes || []).map(i => i.name);

        if (!names.includes(INDEX_NAME)) {
            console.log(`📦  Creating Pinecone index "${INDEX_NAME}"…`);
            await pc.createIndex({
                name: INDEX_NAME,
                dimension: 384,           // Xenova all-MiniLM-L6-v2 output size
                metric: 'cosine',
                spec: {
                    serverless: { cloud: 'aws', region: 'us-east-1' },
                },
            });
            // Wait for index to be ready
            console.log('⏳  Waiting for index to be ready…');
            await new Promise(r => setTimeout(r, 20000));
            console.log('✅  Pinecone index ready!');
        }
    } catch (err) {
        console.warn('Pinecone index check/create warning:', err.message);
    }

    pineconeIdx = pc.index(INDEX_NAME);
    return pineconeIdx;
}

// ── Init Embedder ─────────────────────────────────────────────────────────────
async function getEmbedder() {
    if (embedder) return embedder;
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
    return embedder;
}

// ── Embed a text string → float array ────────────────────────────────────────
export async function embed(text) {
    const model  = await getEmbedder();
    const output = await model(text.slice(0, 1000), { pooling: 'mean', normalize: true });
    return Array.from(output.data);
}

// ── Upsert chunks into Pinecone ───────────────────────────────────────────────
// chunks: [{ text, url, title }]
// namespace: unique string per query (e.g. query hash)
export async function upsertChunks(chunks, namespace) {
    const idx = await getPineconeIndex();

    const vectors = await Promise.all(
        chunks.map(async (chunk, i) => ({
            id:     `${namespace}-${i}`,
            values: await embed(chunk.text),
            metadata: {
                text:  chunk.text.slice(0, 1000),
                url:   chunk.url,
                title: chunk.title,
            },
        }))
    );

    // Upsert in batches of 100
    const BATCH = 100;
    for (let i = 0; i < vectors.length; i += BATCH) {
        await idx.namespace(namespace).upsert(vectors.slice(i, i + BATCH));
    }

    console.log(`✅  Upserted ${vectors.length} chunks to Pinecone namespace "${namespace}"`);
}

// ── Retrieve top-K relevant chunks ───────────────────────────────────────────
export async function retrieveContext(query, namespace, topK = 5) {
    const idx       = await getPineconeIndex();
    const queryVec  = await embed(query);

    const result = await idx.namespace(namespace).query({
        vector:          queryVec,
        topK,
        includeMetadata: true,
    });

    return (result.matches || [])
        .filter(m => m.score > 0.25)   // minimum relevance threshold
        .map(m => ({
            text:  m.metadata?.text  || '',
            url:   m.metadata?.url   || '',
            title: m.metadata?.title || '',
            score: m.score,
        }));
}

// ── Simple namespace key from query ──────────────────────────────────────────
export function queryNamespace(query) {
    // short hash-like key: first 32 chars of query, lowercased, alphanumeric only
    return query.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 32) || 'default';
}
