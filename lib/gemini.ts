import { GoogleGenerativeAI, Part } from '@google/generative-ai';

const API_KEYS = [
    process.env.GEMINI_API_KEY,
    "AIzaSyCZbHHw7EDJ6ZOtJdsU0O8jGVfTFAXha9M",
    "AIzaSyCvCMFlg4gs3wfa2TtcGZJqiWpldVNK7QU",
    "AIzaSyBl02Mwqvc5OLxKu6BF37F8iIe0WBTPi0I",
    "AIzaSyBW1Gu6O5RFttmvYGT4rnIeX9aXPUCNWr4",
    "AIzaSyA6KpbylPeE8dUc0gwrPQWYrDWDEED52ec",
    "AIzaSyB0cfNvtfLGM3zul1pIo4oZ8wMiS5ADp5M",
    "AIzaSyDT8X3KC_8fWg6hF5xwxwc5jnhdST0WWGM",
    "AIzaSyBrNrkKqRVO-B3UAZajq9bF4dEaVT3awrU",
    "AIzaSyAloVHN7Qq_Kre3-i-uHe52o_mBu0gx9GU",
    "AIzaSyBdWe2P27etRq6CSclyfcmXJONKK2JkuUk"
].filter(Boolean) as string[];

let currentKeyIndex = 0;

export async function generateContentWithFallback(
    modelName: string,
    prompt: (string | Part)[],
    maxRetries: number = API_KEYS.length
) {
    let lastError: any = null;

    for (let i = 0; i < maxRetries; i++) {
        const apiKey = API_KEYS[currentKeyIndex];
        console.log(`[GeminiPool] Attempting with key index ${currentKeyIndex} (ending in ...${apiKey.slice(-4)})`);

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
                console.warn(`[GeminiPool] Quota exceeded for key index ${currentKeyIndex}. Switching to next key.`);
                currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
            } else {
                // If it's not a quota error, we might still want to try another key just in case,
                // but usually, we should re-throw if it's a prompt error or something else.
                // For now, let's rotate for any error to be safe, but log it.
                console.error(`[GeminiPool] Error with key index ${currentKeyIndex}:`, errorMessage);
                currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
            }
        }
    }

    throw new Error(`[GeminiPool] All ${maxRetries} keys failed. Last error: ${lastError?.message}`);
}
