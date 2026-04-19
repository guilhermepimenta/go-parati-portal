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

// Fetches knowledge sources from Supabase for grounded generation
async function fetchSources(
  supabase: ReturnType<typeof createClient>,
  category: string,
  topic: string
): Promise<{ title: string; content: string }[]> {
  // Fetch sources matching the category + general sources
  const { data, error } = await supabase
    .from('blog_sources')
    .select('title, content, category, tags')
    .eq('is_active', true)
    .or(`category.eq.${category},category.eq.geral`)
    .order('created_at', { ascending: false })
    .limit(6)

  if (error || !data) return []

  // Prioritize sources whose tags/title overlap with the topic keywords
  const topicWords = topic.toLowerCase().split(/\s+/)
  const scored = data.map(s => {
    const combined = `${s.title} ${(s.tags || []).join(' ')}`.toLowerCase()
    const score = topicWords.filter(w => w.length > 3 && combined.includes(w)).length
    return { ...s, score }
  })

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(s => ({ title: s.title, content: s.content }))
}

function buildGroundingBlock(sources: { title: string; content: string }[]): string {
  if (sources.length === 0) return ''
  const entries = sources.map((s, i) =>
    `--- FONTE ${i + 1}: ${s.title} ---\n${s.content}`
  ).join('\n\n')
  return `\n\nBASE DE CONHECIMENTO VERIFICADA (use estas informações como fundamento factual):\n${entries}\n`
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
    // Generates a complete blog post from a topic/briefing (no grounding)
    if (action === 'generate') {
      const { topic, category = 'turismo', language = 'pt-BR', tone = 'informativo' } = body

      if (!topic || topic.trim().length < 5) {
        throw new Error('Forneça um tópico com pelo menos 5 caracteres')
      }

      const prompt = buildGeneratePrompt(topic, category, language, tone, '')

      const result = await callGemini(GEMINI_API_KEY, prompt, 0.8)
      const parsed = parseGeminiJSON(result)
      const title = (parsed.title as string) || topic
      const slug = slugify(title) + '-' + Date.now().toString(36)

      return jsonResponse({ title, slug, ...buildPostFields(parsed, category), ai_generated: true })
    }

    // ── ACTION: grounded-generate ──
    // NotebookLM-style: grounds generation on verified knowledge sources,
    // then runs a refinement pass to improve quality and factual accuracy.
    if (action === 'grounded-generate') {
      const {
        topic,
        category = 'turismo',
        language = 'pt-BR',
        tone = 'informativo',
        extra_context = '',   // Optional caller-supplied context
      } = body

      if (!topic || topic.trim().length < 5) {
        throw new Error('Forneça um tópico com pelo menos 5 caracteres')
      }

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      // Step 1 — fetch relevant knowledge sources
      const sources = await fetchSources(supabase, category, topic)
      const groundingBlock = buildGroundingBlock(sources)

      // Step 2 — first pass: grounded generation
      const pass1Prompt = buildGeneratePrompt(topic, category, language, tone, groundingBlock + (extra_context ? `\n\nCONTEXTO ADICIONAL DO OPERADOR:\n${extra_context}` : ''))
      const pass1Raw = await callGemini(GEMINI_API_KEY, pass1Prompt, 0.75)
      const pass1 = parseGeminiJSON(pass1Raw)

      const draftContent = (pass1.content as string) || ''
      const draftTitle = (pass1.title as string) || topic

      // Step 3 — second pass: refinement (NotebookLM-style review)
      const pass2Prompt = buildRefinementPrompt(draftContent, sources)
      const refinedContent = await callGemini(GEMINI_API_KEY, pass2Prompt, 0.65)

      const title = draftTitle
      const slug = slugify(title) + '-' + Date.now().toString(36)

      return jsonResponse({
        title,
        slug,
        excerpt: pass1.excerpt || '',
        content: refinedContent,
        meta_description: pass1.meta_description || pass1.excerpt || '',
        tags: pass1.tags || [],
        category,
        suggested_image_query: pass1.suggested_image_query || '',
        ai_generated: true,
        grounded: true,
        sources_used: sources.map(s => s.title),
      })
    }

    // ── ACTION: web-grounded-generate ──
    // Uses Google Search Grounding to research the topic on the web in real-time,
    // then generates a blog post grounded on those web sources (3-pass pipeline).
    if (action === 'web-grounded-generate') {
      const {
        topic,
        category = 'turismo',
        language = 'pt-BR',
        tone = 'informativo',
      } = body

      if (!topic || topic.trim().length < 5) {
        throw new Error('Forneça um tópico com pelo menos 5 caracteres')
      }

      // Pass 1 — Web Research: let Gemini search the web and summarize findings
      const researchPrompt = `${PARATY_CONTEXT}

TAREFA DE PESQUISA: Pesquise informações atualizadas e específicas sobre o tema abaixo relacionado a Paraty, RJ.
Compile os fatos mais relevantes, dados práticos (preços, horários, localização), novidades recentes e detalhes que enriquecerão um artigo de blog para turistas.

TEMA: ${topic}

Escreva um resumo estruturado em português com os fatos encontrados. Seja específico e factual.`

      const research = await callGeminiWithSearch(GEMINI_API_KEY, researchPrompt, 0.5)

      // Build grounding block from web research
      const webGroundingBlock = research.text
        ? `\n\nPESQUISA WEB ATUALIZADA (use como fundamento factual — dados reais e recentes):\n${research.text}\n`
        : ''

      // Pass 2 — Blog Generation: generate structured JSON post using research as context
      const pass2Prompt = buildGeneratePrompt(topic, category, language, tone, webGroundingBlock)
      const pass2Raw = await callGemini(GEMINI_API_KEY, pass2Prompt, 0.75)
      const pass2 = parseGeminiJSON(pass2Raw)

      const draftContent = (pass2.content as string) || ''
      const draftTitle = (pass2.title as string) || topic

      // Pass 3 — Refinement: improve flow, intro hook and CTA
      const webSourcesAsRefs = research.webSources.slice(0, 4).map(s => ({
        title: s.title,
        content: `Fonte: ${s.uri}`,
      }))
      const pass3Prompt = buildRefinementPrompt(draftContent, webSourcesAsRefs)
      const refinedContent = await callGemini(GEMINI_API_KEY, pass3Prompt, 0.65)

      const title = draftTitle
      const slug = slugify(title) + '-' + Date.now().toString(36)

      return jsonResponse({
        title,
        slug,
        excerpt: pass2.excerpt || '',
        content: refinedContent,
        meta_description: pass2.meta_description || pass2.excerpt || '',
        tags: pass2.tags || [],
        category,
        suggested_image_query: pass2.suggested_image_query || '',
        ai_generated: true,
        grounded: true,
        grounding_type: 'web_search',
        web_sources: research.webSources,
        search_queries: research.searchQueries,
      })
    }

    // ── ACTION: generate-and-save ──
    // Generates (optionally grounded) and saves directly to Supabase
    if (action === 'generate-and-save') {
      const {
        topic,
        category = 'turismo',
        language = 'pt-BR',
        tone = 'informativo',
        auto_publish = false,
        use_grounding = false,
        use_web_search = false,
      } = body

      const generateAction = use_web_search
        ? 'web-grounded-generate'
        : use_grounding ? 'grounded-generate' : 'generate'
      const generateResp = await fetch(req.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.get('Authorization') || '',
        },
        body: JSON.stringify({ action: generateAction, topic, category, language, tone, use_grounding }),
      })

      if (!generateResp.ok) {
        const err = await generateResp.json()
        throw new Error(err.error || 'Generation failed')
      }

      const generated = await generateResp.json()

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

      return jsonResponse({
        success: true,
        post,
        grounded: generated.grounded ?? false,
        grounding_type: generated.grounding_type ?? (generated.grounded ? 'knowledge_base' : 'none'),
        sources_used: generated.sources_used ?? [],
        web_sources: generated.web_sources ?? [],
        search_queries: generated.search_queries ?? [],
        message: auto_publish ? 'Post gerado e publicado' : 'Post gerado como rascunho',
      })
    }

    // ── ACTION: improve ──
    // Takes existing content and improves/rewrites it (no grounding)
    if (action === 'improve') {
      const { content, instruction = 'Melhore o texto, tornando-o mais envolvente e SEO-friendly' } = body

      if (!content) throw new Error('Conteúdo é obrigatório')

      const prompt = `${PARATY_CONTEXT}

TAREFA: Melhore o texto de blog abaixo seguindo a instrução.

INSTRUÇÃO: ${instruction}

TEXTO ORIGINAL:
${content}

Retorne APENAS o texto melhorado em Markdown, sem JSON, sem explicações.`

      const improved = await callGemini(GEMINI_API_KEY, prompt, 0.7)
      return jsonResponse({ content: improved })
    }

    // ── ACTION: list-sources ──
    // Lists available knowledge sources in the DB
    if (action === 'list-sources') {
      const { category = '' } = body

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      let query = supabase
        .from('blog_sources')
        .select('id, title, category, source_type, tags, is_active, created_at')
        .order('category', { ascending: true })

      if (category) query = query.eq('category', category)

      const { data, error } = await query
      if (error) throw new Error(error.message)

      return jsonResponse({ sources: data || [] })
    }

    // ── ACTION: add-source ──
    // Adds a new knowledge source to the DB (admin/notebook use)
    if (action === 'add-source') {
      const { title, content, category = 'geral', source_type = 'manual', source_url = null, tags = [] } = body

      if (!title || !content) throw new Error('title e content são obrigatórios')

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      // Auto-generate a summary with Gemini
      const summaryPrompt = `Resuma o texto abaixo em 2 frases objetivas (máx 200 chars). Retorne APENAS o resumo.\n\n${content.slice(0, 3000)}`
      const summary = await callGemini(GEMINI_API_KEY, summaryPrompt, 0.3)

      const { data, error } = await supabase
        .from('blog_sources')
        .insert({ title, content, summary: summary.slice(0, 400), category, source_type, source_url, tags })
        .select()
        .single()

      if (error) throw new Error(error.message)
      return jsonResponse({ success: true, source: data })
    }

    throw new Error(`Unknown action: ${action}`)

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

// ── Helpers ──

async function callGemini(apiKey: string, prompt: string, temperature: number): Promise<string> {
  const resp = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature, maxOutputTokens: 8192, topP: 0.95 },
    }),
  })
  const data = await resp.json()
  if (!resp.ok) throw new Error(data.error?.message || 'Gemini API error')
  // Gemini 2.5 Flash may return thinking tokens in earlier parts;
  // extract the last non-empty text part which contains the actual response.
  const parts: { text?: string }[] = data.candidates?.[0]?.content?.parts || []
  const text = parts.filter(p => p.text).map(p => p.text).pop() || ''
  return text
}

// Calls Gemini with Google Search Grounding enabled.
// Returns the generated text plus structured web source metadata.
async function callGeminiWithSearch(
  apiKey: string,
  prompt: string,
  temperature: number
): Promise<{ text: string; webSources: { uri: string; title: string }[]; searchQueries: string[] }> {
  const resp = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature, maxOutputTokens: 8192, topP: 0.95 },
    }),
  })
  const data = await resp.json()
  if (!resp.ok) throw new Error(data.error?.message || 'Gemini API error')

  const candidate = data.candidates?.[0]
  // Gemini 2.5 Flash may include thinking tokens in earlier parts; use the last non-empty text part.
  const allParts: { text?: string }[] = candidate?.content?.parts || []
  const text = allParts.filter(p => p.text).map(p => p.text).pop() || ''
  const meta = candidate?.groundingMetadata || {}

  const webSources: { uri: string; title: string }[] = (meta.groundingChunks || [])
    .filter((c: { web?: { uri?: string; title?: string } }) => c.web?.uri)
    .map((c: { web: { uri: string; title?: string } }) => ({
      uri: c.web.uri,
      title: c.web.title || c.web.uri,
    }))

  const searchQueries: string[] = meta.webSearchQueries || []

  return { text, webSources, searchQueries }
}

function parseGeminiJSON(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error('Gemini retornou formato inválido. Tente novamente.')
  }
}

function buildPostFields(parsed: Record<string, unknown>, category: string) {
  return {
    excerpt: parsed.excerpt || '',
    content: parsed.content || '',
    meta_description: parsed.meta_description || parsed.excerpt || '',
    tags: parsed.tags || [],
    category,
    suggested_image_query: parsed.suggested_image_query || '',
  }
}

function buildGeneratePrompt(
  topic: string,
  category: string,
  language: string,
  tone: string,
  groundingContext: string
): string {
  return `${PARATY_CONTEXT}${groundingContext}

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
- Mencione locais reais de Paraty quando pertinente${groundingContext ? '\n- Use os fatos da Base de Conhecimento como fundamento — priorize essas informações sobre conhecimento geral' : ''}
- Inclua pelo menos uma chamada para ação (CTA)
- Use subtítulos ## para organizar o conteúdo
- Inclua dados práticos: horários, preços aproximados, como chegar
- Mantenha parágrafos curtos (3-4 linhas)
- Retorne APENAS o JSON, nada mais`
}

function buildRefinementPrompt(
  draftContent: string,
  sources: { title: string; content: string }[]
): string {
  const sourcesBlock = sources.length > 0
    ? `\nFONTES DE REFERÊNCIA VERIFICADAS:\n${sources.map((s, i) => `[${i + 1}] ${s.title}: ${s.content.slice(0, 400)}...`).join('\n\n')}`
    : ''

  return `Você é um editor especializado em conteúdo de turismo. Revise e melhore o artigo abaixo.${sourcesBlock}

ARTIGO PARA MELHORAR:
${draftContent}

INSTRUÇÕES DE REFINAMENTO:
1. Verifique a precisão factual com base nas fontes de referência (se fornecidas)
2. Corrija informações imprecisas ou genéricas — substitua por detalhes específicos de Paraty
3. Melhore o fluxo e a coesão entre parágrafos
4. Torne a introdução mais envolvente (gancho para o leitor)
5. Fortaleça o CTA (chamada para ação) no final
6. Mantenha o Markdown com headers ## e listas

Retorne APENAS o artigo melhorado em Markdown, sem JSON, sem explicações, sem comentários.`
}

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
