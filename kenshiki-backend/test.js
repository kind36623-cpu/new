import { pipeline, env } from '@xenova/transformers';

env.localModelPath = './models';
env.allowLocalModels = false;

async function test() {
    const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
    const output = await embedder("Test text", { pooling: 'mean', normalize: true });
    
    console.log("Vector values length:", Array.from(output.data).length);
    console.log("First 5 values:", Array.from(output.data).slice(0, 5));
}
test();
