const PLATE_REGEX = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

export interface VehicleInfo {
    plate: string | null;
    model: string | null;
    brand: string | null;
    color: string | null;
    confidence: number;
}

const EMPTY: VehicleInfo = { plate: null, model: null, brand: null, color: null, confidence: 0 };

const GEMINI_PROMPT = 'Analyze this vehicle image. Extract: 1) License plate (Brazilian format ABC1D23 Mercosul or ABC1234 old). 2) Vehicle brand (ex: Fiat, Volkswagen, Chevrolet, Toyota, Honda). 3) Vehicle model (ex: Uno, Gol, Onix, Corolla, Civic). 4) Vehicle color in Portuguese (ex: Branco, Preto, Prata, Vermelho, Azul). Return ONLY a JSON: {"plate": "ABC1D23", "brand": "Fiat", "model": "Uno", "color": "Branco", "confidence": 0.95}. Plate must be uppercase, no dashes/spaces. If any field not identifiable, use null. Return ONLY raw JSON, no markdown.';

async function callGemini(apiKey: string, base64Image: string, signal: AbortSignal): Promise<VehicleInfo> {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal,
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                        { text: GEMINI_PROMPT }
                    ]
                }],
                generationConfig: { temperature: 0, maxOutputTokens: 200 }
            })
        }
    );

    if (response.status === 503 || response.status === 429) {
        throw new Error(`RETRY:${response.status}`);
    }

    const text = await response.text();

    if (!response.ok) {
        let msg = `HTTP ${response.status}`;
        try { msg = JSON.parse(text).error?.message || msg; } catch { /* ignore */ }
        console.error('Gemini API error:', msg);
        return EMPTY;
    }

    const data = JSON.parse(text);
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
    const parsed: VehicleInfo = JSON.parse(cleaned);

    if (parsed.plate) {
        const normalized = parsed.plate.replace(/[-\s]/g, '').toUpperCase();
        if (PLATE_REGEX.test(normalized)) {
            parsed.plate = normalized;
        } else {
            parsed.plate = null;
            parsed.confidence = 0;
        }
    }

    return parsed;
}

export async function extractVehicleFromImage(base64Image: string): Promise<VehicleInfo> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
        return EMPTY;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const MAX_RETRIES = 3;

    try {
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                return await callGemini(apiKey, base64Image, controller.signal);
            } catch (err) {
                const isRetryable = err instanceof Error && err.message.startsWith('RETRY:');
                if (isRetryable && attempt < MAX_RETRIES - 1) {
                    const delay = (attempt + 1) * 2000; // 2s, 4s
                    console.warn(`Gemini ${err.message}, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }
                throw err;
            }
        }
        return EMPTY;
    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
            console.error('OCR timeout');
        } else {
            console.error('OCR error:', err);
        }
        return EMPTY;
    } finally {
        clearTimeout(timeout);
    }
}
