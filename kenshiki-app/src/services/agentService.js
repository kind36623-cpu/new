const API_BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:5000/api';

export const chatWithAgent = async (article, message, history = []) => {
    try {
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                articleTitle: article?.title,
                articleContent: article?.content,
                message: message,
                history: history
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get response from agent');
        }

        const data = await response.json();
        return data.reply;
    } catch (error) {
        console.error('Agent chat error:', error);
        return "I'm sorry, I'm having trouble connecting to the intelligence backend right now.";
    }
};

// ── Web Search RAG pipeline ───────────────────────────────────────────────────
export const searchWithAI = async (query, mode = 'normal', history = []) => {
    try {
        const response = await fetch(`${API_BASE_URL}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, mode, history }),
        });

        if (!response.ok) throw new Error('Search pipeline request failed');

        const data = await response.json();
        return data; // { answer, sources, mode, cached? }
    } catch (error) {
        console.error('Search pipeline error:', error);
        return {
            answer: "😔 I couldn't connect to the search pipeline right now. Please try again!",
            sources: [],
            mode,
        };
    }
};

