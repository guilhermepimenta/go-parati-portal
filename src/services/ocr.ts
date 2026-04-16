const PLATE_REGEX = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

export interface VehicleInfo {
    plate: string | null;
    model: string | null;
    brand: string | null;
    color: string | null;
    confidence: number;
}

export async function extractVehicleFromImage(base64Image: string): Promise<VehicleInfo> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
        return { plate: null, model: null, brand: null, color: null, confidence: 0 };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                inlineData: {
                                    mimeType: 'image/jpeg',
                                    data: base64Image
                                }
                            },
                            {
                                text: 'Analyze this vehicle image. Extract: 1) License plate (Brazilian format ABC1D23 Mercosul or ABC1234 old). 2) Vehicle brand (ex: Fiat, Volkswagen, Chevrolet, Toyota, Honda). 3) Vehicle model (ex: Uno, Gol, Onix, Corolla, Civic). 4) Vehicle color in Portuguese (ex: Branco, Preto, Prata, Vermelho, Azul). Return ONLY a JSON: {"plate": "ABC1D23", "brand": "Fiat", "model": "Uno", "color": "Branco", "confidence": 0.95}. Plate must be uppercase, no dashes/spaces. If any field not identifiable, use null. Return ONLY raw JSON, no markdown.'
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0,
                        maxOutputTokens: 200,
                    }
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error('Gemini API error:', data.error?.message);
            return { plate: null, model: null, brand: null, color: null, confidence: 0 };
        }

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
    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
            console.error('OCR timeout');
        } else {
            console.error('OCR error:', err);
        }
        return { plate: null, model: null, brand: null, color: null, confidence: 0 };
    } finally {
        clearTimeout(timeout);
    }
}
