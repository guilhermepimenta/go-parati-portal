const PLATE_REGEX = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

export interface OcrResult {
    plate: string | null;
    confidence: number;
}

export async function extractPlateFromImage(base64Image: string): Promise<OcrResult> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
        return { plate: null, confidence: 0 };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

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
                                text: 'Extract the vehicle license plate from this image. Brazilian plates use format ABC1D23 (Mercosul) or ABC1234 (old format). Return ONLY a JSON object: {"plate": "ABC1D23", "confidence": 0.95}. Uppercase, no dashes or spaces. If no plate found: {"plate": null, "confidence": 0}. Return ONLY the raw JSON, no markdown, no code fences.'
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0,
                        maxOutputTokens: 100,
                    }
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error('Gemini API error:', data.error?.message);
            return { plate: null, confidence: 0 };
        }

        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
        const parsed: OcrResult = JSON.parse(cleaned);

        if (parsed.plate) {
            const normalized = parsed.plate.replace(/[-\s]/g, '').toUpperCase();
            if (PLATE_REGEX.test(normalized)) {
                return { plate: normalized, confidence: parsed.confidence };
            }
        }

        return { plate: null, confidence: 0 };
    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
            console.error('OCR timeout');
        } else {
            console.error('OCR error:', err);
        }
        return { plate: null, confidence: 0 };
    } finally {
        clearTimeout(timeout);
    }
}
