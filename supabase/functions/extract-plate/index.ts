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

        // Call Gemini 2.5 Flash for plate extraction
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
                                text: 'Extract the vehicle license plate from this image. Brazilian plates use format ABC1D23 (Mercosul) or ABC1234 (old format). Return ONLY a JSON object: {"plate": "ABC1D23", "confidence": 0.95}. Uppercase, no dashes or spaces. If no plate found: {"plate": null, "confidence": 0}. Return ONLY the JSON, nothing else.'
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0,
                        maxOutputTokens: 100,
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
        let parsed: { plate: string | null; confidence: number }
        try {
            const cleaned = content.replace(/```json\n?|\n?```/g, '').trim()
            parsed = JSON.parse(cleaned)
        } catch {
            parsed = { plate: null, confidence: 0 }
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
