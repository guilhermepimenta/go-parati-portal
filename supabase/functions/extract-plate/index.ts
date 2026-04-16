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

        const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

        if (!OPENAI_API_KEY) {
            // Fallback: return empty so frontend prompts manual entry
            return new Response(JSON.stringify({
                plate: null,
                confidence: 0,
                message: 'OCR service not configured. Please enter plate manually.'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // Call OpenAI GPT-4o Vision for plate extraction
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a license plate recognition system. Extract the license plate text from the image. Return ONLY a JSON object with "plate" (uppercase, no dashes or spaces) and "confidence" (0-1). Brazilian plates use format ABC1D23 (Mercosul) or ABC1234 (old). If no plate is found, return {"plate": null, "confidence": 0}.'
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/jpeg;base64,${image_base64}`,
                                    detail: 'low'
                                }
                            },
                            {
                                type: 'text',
                                text: 'Extract the license plate from this image.'
                            }
                        ]
                    }
                ],
                max_tokens: 100,
                temperature: 0,
            })
        })

        const openaiData = await openaiResponse.json()

        if (!openaiResponse.ok) {
            throw new Error(openaiData.error?.message || 'OpenAI API error')
        }

        const content = openaiData.choices?.[0]?.message?.content || '{}'

        // Parse the JSON response from GPT
        let parsed: { plate: string | null; confidence: number }
        try {
            // Remove markdown code fences if present
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
