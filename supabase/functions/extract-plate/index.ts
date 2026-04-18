import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Brazilian plate regex: ABC1D23 (Mercosul) or ABC1234 (old format)
const PLATE_REGEX = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { image_base64 } = await req.json()

        if (!image_base64) {
            throw new Error('image_base64 is required')
        }

        const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

        if (!GEMINI_API_KEY) {
            return new Response(JSON.stringify({
                plate: null,
                confidence: 0,
                message: 'OCR service not configured. Please enter plate manually.'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // Call Gemini 2.5 Flash for vehicle extraction
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                inlineData: {
                                    mimeType: 'image/jpeg',
                                    data: image_base64
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
        )

        const geminiData = await geminiResponse.json()

        if (!geminiResponse.ok) {
            throw new Error(geminiData.error?.message || 'Gemini API error')
        }

        const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}'

        // Parse the JSON response
        let parsed: { plate: string | null; brand: string | null; model: string | null; color: string | null; confidence: number }
        try {
            const cleaned = content.replace(/```json\n?|\n?```/g, '').trim()
            parsed = JSON.parse(cleaned)
        } catch {
            parsed = { plate: null, brand: null, model: null, color: null, confidence: 0 }
        }

        // Validate plate format
        if (parsed.plate) {
            const normalized = parsed.plate.replace(/[-\s]/g, '').toUpperCase()
            if (PLATE_REGEX.test(normalized)) {
                parsed.plate = normalized
            } else {
                parsed.plate = null
                parsed.confidence = 0
            }
        }

        return new Response(JSON.stringify(parsed), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
