import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const PARATY_CONTEXT = `Você é um redator especialista em turismo e cultura de Paraty, RJ, Brasil.
Paraty é uma cidade histórica colonial no litoral sul do Rio de Janeiro, conhecida por:
- Centro histórico com ruas de pedra pé-de-moleque (Patrimônio UNESCO)
- Baía de Ilha Grande com praias paradisíacas e ilhotas
- FLIP (Festa Literária Internacional de Paraty)
- Cachaça artesanal e alambiques históricos
- Trilhas, cachoeiras (Poço do Tarzan, Tobogã, Pedra Branca)
- Gastronomia: peixe fresco, banana-da-terra, camarão
- Igreja de Santa Rita, Forte Defensor Perpétuo, Casa da Cultura
- Caiçaras e comunidades quilombolas (Campinho da Independência)
- Rotativo Digital — estacionamento pago via app Go Paraty
- Clima tropical úmido, melhor época: abril a setembro (seco)

Escreva para turistas brasileiros e estrangeiros em visita a Paraty.
Use linguagem acessível, informativa e envolvente. Inclua dicas práticas.`

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured')

    const body = await req.json()
    const { action } = body

    // ── ACTION: generate ──
    // Generates a complete blog post from a topic/briefing
    if (action === 'generate') {
      const { topic, category = 'turismo', language = 'pt-BR', tone = 'informativo' } = body

      if (!topic || topic.trim().length < 5) {
        throw new Error('Forneça um tópico com pelo menos 5 caracteres')
      }

      const prompt = `${PARATY_CONTEXT}

TAREFA: Escreva um artigo de blog completo sobre o tema abaixo.

TEMA: ${topic}
CATEGORIA: ${category}
IDIOMA: ${language}
TOM: ${tone}

FORMATO DE SAÍDA — retorne APENAS um JSON válido (sem markdown, sem \`\`\`):
{
  "title": "Título atrativo e SEO-friendly (máx 70 chars)",
  "excerpt": "Resumo do artigo em 1-2 frases (máx 160 chars, ideal para meta description)",
  "content": "Artigo completo em Markdown com headers ##, listas, negrito, links internos. Mínimo 800 palavras, máximo 1500. Inclua seções: Introdução, Desenvolvimento (2-3 subtópicos), Dicas Práticas, Conclusão.",
  "meta_description": "Meta description SEO otimizada (máx 155 chars)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "suggested_image_query": "busca sugerida para foto de capa no Unsplash"
}

REGRAS:
- Conteúdo original, não copie de fontes
- Mencione locais reais de Paraty quando pertinente
- Inclua pelo menos uma chamada para ação (CTA)
- Use subtítulos ## para organizar o conteúdo
- Inclua dados práticos: horários, preços aproximados, como chegar
- Mantenha parágrafos curtos (3-4 linhas)
- Retorne APENAS o JSON, nada mais`

      const geminiResp = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 8192,
            topP: 0.95,
          },
        }),
      })

      const geminiData = await geminiResp.json()
      if (!geminiResp.ok) {
        throw new Error(geminiData.error?.message || 'Gemini API error')
      }

      const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
      const cleaned = rawText.replace(/```json\n?|\n?```/g, '').trim()

      let parsed: Record<string, unknown>
      try {
        parsed = JSON.parse(cleaned)
      } catch {
        throw new Error('Gemini retornou formato inválido. Tente novamente.')
      }

      const title = (parsed.title as string) || topic
      const slug = slugify(title) + '-' + Date.now().toString(36)

      return new Response(JSON.stringify({
        title,
        slug,
        excerpt: parsed.excerpt || '',
        content: parsed.content || '',
        meta_description: parsed.meta_description || parsed.excerpt || '',
        tags: parsed.tags || [],
        category,
        suggested_image_query: parsed.suggested_image_query || '',
        ai_generated: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── ACTION: generate-and-save ──
    // Generates and saves directly to Supabase (for batch/notebook use)
    if (action === 'generate-and-save') {
      const { topic, category = 'turismo', language = 'pt-BR', tone = 'informativo', auto_publish = false } = body

      // First generate
      const generateResp = await fetch(req.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.get('Authorization') || '',
        },
        body: JSON.stringify({ action: 'generate', topic, category, language, tone }),
      })

      if (!generateResp.ok) {
        const err = await generateResp.json()
        throw new Error(err.error || 'Generation failed')
      }

      const generated = await generateResp.json()

      // Save to DB
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      const status = auto_publish ? 'published' : 'draft'
      const published_at = auto_publish ? new Date().toISOString() : null

      const { data: post, error: insertErr } = await supabase
        .from('blog_posts')
        .insert({
          title: generated.title,
          slug: generated.slug,
          excerpt: generated.excerpt,
          content: generated.content,
          category: generated.category,
          meta_description: generated.meta_description,
          tags: generated.tags,
          ai_generated: true,
          status,
          published_at,
          cover_image_url: null,
        })
        .select()
        .single()

      if (insertErr) throw new Error(`DB insert failed: ${insertErr.message}`)

      return new Response(JSON.stringify({
        success: true,
        post,
        message: auto_publish ? 'Post gerado e publicado' : 'Post gerado como rascunho',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── ACTION: improve ──
    // Takes existing content and improves/rewrites it
    if (action === 'improve') {
      const { content, instruction = 'Melhore o texto, tornando-o mais envolvente e SEO-friendly' } = body

      if (!content) throw new Error('Conteúdo é obrigatório')

      const prompt = `${PARATY_CONTEXT}

TAREFA: Melhore o texto de blog abaixo seguindo a instrução.

INSTRUÇÃO: ${instruction}

TEXTO ORIGINAL:
${content}

Retorne APENAS o texto melhorado em Markdown, sem JSON, sem explicações.`

      const geminiResp = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
        }),
      })

      const geminiData = await geminiResp.json()
      if (!geminiResp.ok) {
        throw new Error(geminiData.error?.message || 'Gemini API error')
      }

      const improved = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || content

      return new Response(JSON.stringify({ content: improved }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    throw new Error(`Unknown action: ${action}`)

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
