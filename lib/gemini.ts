import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { createClient } from './supabase/server';

let currentKeyIndex = 0;

async function getApiKeys() {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase.rpc('get_gemini_keys');

        if (error) {
            console.error('[GeminiPool] Error fetching keys from Vault:', error);
            return [];
        }

        return (data as any[]).map(k => k.api_key);
    } catch (e) {
        console.error('[GeminiPool] Failed to get Supabase client or fetch keys:', e);
        return [];
    }
}

export async function generateContentWithFallback(
    modelName: string,
    prompt: (string | Part)[],
    maxRetries?: number
) {
    const apiKeys = await getApiKeys();

    if (apiKeys.length === 0) {
        throw new Error("[GeminiPool] No API keys available in the database. Please add keys in the Admin Panel.");
    }

    const actualMaxRetries = maxRetries ?? apiKeys.length;
    let lastError: any = null;

    for (let i = 0; i < actualMaxRetries; i++) {
        // Ensure index is within bounds of current keys list
        const apiKey = apiKeys[currentKeyIndex % apiKeys.length];
        const displayIndex = currentKeyIndex % apiKeys.length;

        console.log(`[GeminiPool] Attempting with key index ${displayIndex} (ending in ...${apiKey.slice(-4)})`);

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            return result;
        } catch (error: any) {
            lastError = error;
            const errorMessage = error.message || "";
            const isQuotaError = errorMessage.includes("429") ||
                errorMessage.toLowerCase().includes("quota") ||
                errorMessage.toLowerCase().includes("rate limit");

            if (isQuotaError) {
                console.warn(`[GeminiPool] Quota exceeded for key index ${displayIndex}. Switching to next key.`);
                currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
            } else {
                console.error(`[GeminiPool] Error with key index ${displayIndex}:`, errorMessage);
                // Rotate anyway for broad reliability
                currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
            }
        }
    }

    throw new Error(`[GeminiPool] All ${actualMaxRetries} keys failed. Last error: ${lastError?.message}`);
}
