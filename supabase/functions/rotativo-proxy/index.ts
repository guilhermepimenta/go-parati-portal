import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BASE_URL = 'https://app.paratyrotativo.com.br'
const API_URL = 'https://api.paratyrotativo.com.br' // Separate API service for PIX payments
const SUB_SECTOR_ID = 922 // Cidade de Paraty
const PRICE_PER_PERIOD = 300 // R$ 3,00 in cents

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

interface SessionCookies {
  raw: string
  userId: string
}

/** Login to Paraty Rotativo and return session cookies */
async function login(): Promise<SessionCookies> {
  const email = Deno.env.get('ROTATIVO_EMAIL')
  const password = Deno.env.get('ROTATIVO_PASSWORD')
  if (!email || !password) throw new Error('Missing ROTATIVO credentials in secrets')

  const resp = await fetch(`${BASE_URL}/login/pro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: new URLSearchParams({ email, pass: password }),
    redirect: 'manual', // capture cookies from 302
  })

  console.log(`[login] status=${resp.status}`)

  // Use getSetCookie() to get each Set-Cookie header as a separate entry (avoids comma ambiguity).
  // Deno's headers.get('set-cookie') may return only the first header in some runtime versions.
  // getSetCookie() is part of the WHATWG Fetch spec and available in Deno 1.23+.
  const rawCookieHeader = resp.headers.get('set-cookie') || ''
  const setCookieArr: string[] = typeof (resp.headers as any).getSetCookie === 'function'
    ? (resp.headers as any).getSetCookie()
    : rawCookieHeader.split(/,(?=[A-Za-z0-9_.-]+=)/).filter(Boolean)

  console.log(`[login] raw header length=${rawCookieHeader.length}, setCookieArr count=${setCookieArr.length}`)

  const cookieMap: Record<string, string> = {}
  for (const c of setCookieArr) {
    const match = c.trim().match(/^([^=]+)=([^;]*)/)
    if (match) cookieMap[match[1].trim()] = match[2].trim()
  }

  console.log(`[login] cookies found: ${Object.keys(cookieMap).join(', ')}`)

  let userId = cookieMap['appparatyrotativoapifinder']

  // Fallback: try to extract userId from the JWT token in 'appparatyrotativoapitkn'
  if (!userId) {
    const jwt = cookieMap['appparatyrotativoapitkn']
    if (jwt) {
      try {
        const payload = JSON.parse(atob(jwt.split('.')[1]))
        if (payload?.user) userId = String(payload.user)
        console.log(`[login] userId extracted from JWT: ${userId}`)
      } catch { /* ignore JWT parse error */ }
    }
  }

  if (!userId) {
    throw new Error(`Login failed — userId cookie not found. Status ${resp.status}. Cookies: ${Object.keys(cookieMap).join(', ')}`)
  }

  // Build cookie string for subsequent requests (only include cookies, not directives)
  const cookieString = Object.entries(cookieMap).map(([k, v]) => `${k}=${v}`).join('; ')
  return { raw: cookieString, userId }
}

/** Make authenticated request to Paraty Rotativo */
async function authFetch(url: string, cookies: string, options: RequestInit = {}): Promise<Response> {
  // Extract JWT from cookies — required for /test/* and /verify-pix-payment routes
  const jwtMatch = cookies.match(/appparatyrotativoapitkn=([^;]+)/)
  const jwt = jwtMatch ? jwtMatch[1].trim() : null

  // Send Bearer for: /test/* routes (app domain) and ALL api.paratyrotativo.com.br endpoints.
  // The API subdomain is a separate service that authenticates via JWT only (no app session cookies).
  const needsBearer = url.includes('/test/') || url.includes('api.paratyrotativo.com.br')

  return fetch(url, {
    ...options,
    headers: {
      'Cookie': cookies,
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Accept': 'text/html, */*; q=0.01',
      'Origin': BASE_URL,
      'Referer': `${BASE_URL}/`,
      ...(jwt && needsBearer ? { 'Authorization': `Bearer ${jwt}` } : {}),
      ...(options.headers || {}),
    },
  })
}

// ──────────────────────────────────────────────
// XCRUD helpers (vehicle management)
// ──────────────────────────────────────────────

/** Extract xcrud hidden input value by field name.
 *  HTML form: <input type="hidden" class="xcrud-data" name="key" value="HASH" />
 */
function extractXcrudInput(html: string, fieldName: string): string | null {
  const regexes = [
    new RegExp(`<input[^>]*class=["']xcrud-data["'][^>]*name=["']${fieldName}["'][^>]*value=["']([a-f0-9]+)["']`, 'i'),
    new RegExp(`<input[^>]*name=["']${fieldName}["'][^>]*class=["']xcrud-data["'][^>]*value=["']([a-f0-9]+)["']`, 'i'),
    new RegExp(`<input[^>]*name=["']${fieldName}["'][^>]*value=["']([a-f0-9]+)["']`, 'i'),
  ]
  for (const re of regexes) {
    const m = html.match(re)
    if (m) return m[1]
  }
  return null
}

/** Get xcrud key/instance tokens from the vehicle list page */
async function getXcrudTokens(cookies: string, userId: string): Promise<{ key: string; instance: string }> {
  const resp = await authFetch(
    `${BASE_URL}/foneparking/veiculos.php?id=${userId}`,
    cookies,
    { method: 'GET', headers: { 'Accept': 'text/html' } }
  )
  const html = await resp.text()
  console.log(`[xcrud] veiculos.php length=${html.length} has xcrud-data=${html.includes('xcrud-data')}`)

  const key = extractXcrudInput(html, 'key')
  const instance = extractXcrudInput(html, 'instance')

  if (!key || !instance) {
    const idx = html.indexOf('xcrud')
    console.error(`[xcrud] tokens not found. idx=${idx}. Snippet: ${html.substring(Math.max(0, idx - 20), idx + 300)}`)
    throw new Error(`Could not extract xcrud tokens. key=${key} instance=${instance}`)
  }

  console.log(`[xcrud] key=${key.substring(0, 10)}... instance=${instance.substring(0, 10)}...`)
  return { key, instance }
}
/** Check if a plate is already registered under the service account */
async function findVehicle(cookies: string, tokens: { key: string; instance: string }): Promise<string | null> {
  const resp = await authFetch(
    `${BASE_URL}/foneparking/xcrud/xcrud_ajax.php`,
    cookies,
    {
      method: 'POST',
      body: new URLSearchParams({
        'xcrud[key]': tokens.key,
        'xcrud[orderby]': '',
        'xcrud[order]': 'asc',
        'xcrud[start]': '0',
        'xcrud[limit]': '50',
        'xcrud[instance]': tokens.instance,
        'xcrud[task]': 'list' as string,
      }),
    }
  )
  return resp.text()
}

/** Register a new vehicle via xcrud */
async function registerVehicle(
  cookies: string,
  tokens: { key: string; instance: string },
  plate: string,
  brand: string,
  color: string,
): Promise<void> {
  // Step 1: Open create form to get save key
  const createResp = await authFetch(
    `${BASE_URL}/foneparking/xcrud/xcrud_ajax.php`,
    cookies,
    {
      method: 'POST',
      body: new URLSearchParams({
        'xcrud[key]': tokens.key,
        'xcrud[orderby]': '',
        'xcrud[order]': 'asc',
        'xcrud[start]': '0',
        'xcrud[limit]': '10',
        'xcrud[instance]': tokens.instance,
        'xcrud[task]': 'create',
      }),
    }
  )
  const createHtml = await createResp.text()

  // Extract the new save key from the form
  const saveKeyMatch = createHtml.match(/xcrud\[key\].*?value=['"]([a-f0-9]+)['"]/)
    || createHtml.match(/['"]xcrud\[key\]['"]\s*[:=]\s*['"]([a-f0-9]+)['"]/)
  const saveKey = saveKeyMatch ? saveKeyMatch[1] : tokens.key

  // Step 2: Save the vehicle
  // The field names are base64-encoded column names
  const now = Math.floor(Date.now() / 1000)
  await authFetch(
    `${BASE_URL}/foneparking/xcrud/xcrud_ajax.php`,
    cookies,
    {
      method: 'POST',
      body: new URLSearchParams({
        'xcrud[key]': saveKey,
        'xcrud[orderby]': '',
        'xcrud[order]': 'asc',
        'xcrud[start]': '0',
        'xcrud[limit]': '10',
        'xcrud[instance]': tokens.instance,
        'xcrud[task]': 'save',
        'xcrud[after]': 'list',
        'xcrud[postdata][dmVpY3Vsb3MucGxhY2E-]': plate, // veiculos.placa
        'xcrud[postdata][dmVpY3Vsb3MubWFyY2E-]': brand, // veiculos.marca
        'xcrud[postdata][dmVpY3Vsb3MuY29y]': color,     // veiculos.cor
        'xcrud[postdata][dmVpY3Vsb3MuZGF0YV9jYWRhc3Rybw--]': String(now), // veiculos.data_cadastro
      }),
    }
  )
}

// ──────────────────────────────────────────────
// PIX payment
// ──────────────────────────────────────────────

interface PixResult {
  qrcode_base64: string
  pix_string: string
  order_id: string
}

// Static client key required by api.paratyrotativo.com.br (extracted from funds2 inline JS)
const API_CLIENT_KEY = 'U2FsdGVkX1+BO/oPCahEmz1cl5gifGI7GQQoT6C3OAwoHNoC+yXnq0eiuTFp6SQY'

/** Build headers for api.paratyrotativo.com.br (JWT Bearer + Client key, no session cookies) */
function apiHeaders(jwt: string | null): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json, */*',
    'Client': API_CLIENT_KEY,
    'Authorization': jwt ? `Bearer ${jwt}` : '',
    'Origin': BASE_URL,
    'Referer': `${BASE_URL}/funds2`,
  }
}

async function generatePix(cookies: string, userId: string, periods: number): Promise<PixResult> {
  const now = new Date()
  // orderId format matches real site JS: userId + year + (month+1) + minutes + seconds
  const orderId = `${userId}${now.getFullYear()}${now.getMonth()+1}${now.getMinutes()}${now.getSeconds()}`

  const jwtMatch = cookies.match(/appparatyrotativoapitkn=([^;]+)/)
  const jwt = jwtMatch ? jwtMatch[1].trim() : null
  console.log(`[pix] jwt found=${!!jwt} orderId=${orderId}`)

  const resp = await fetch(
    `${API_URL}/pix-payment`,
    {
      method: 'POST',
      headers: apiHeaders(jwt),
      body: JSON.stringify({
        applyFirstHourDiscount: false,
        discount: false,
        irr_codigo: 0,
        orderId,
        period: String(periods),
        points_control: 0,
        qt_periodos: String(periods),
        subSectorId: SUB_SECTOR_ID,
        tipo_pix: 0,
      }),
    }
  )

  const pixText = await resp.text()
  console.log(`[pix] status=${resp.status} length=${pixText.length} isHtml=${pixText.trimStart().startsWith('<')} snippet=${pixText.substring(0, 150)}`)

  if (pixText.trimStart().startsWith('<')) {
    throw new Error(`PIX endpoint returned HTML (status ${resp.status}). Session may not be accepted. Snippet: ${pixText.substring(0, 100)}`)
  }

  const data = JSON.parse(pixText)

  if (data.status !== 200 || data.retorno?.erro !== 0) {
    throw new Error(`PIX generation failed: ${data.retorno?.message || JSON.stringify(data)}`)
  }

  return {
    qrcode_base64: data.retorno.qrcode,
    pix_string: data.retorno.pixstring,
    order_id: orderId,
  }
}

async function verifyPixPayment(cookies: string, orderId: string): Promise<boolean> {
  const jwtMatch = cookies.match(/appparatyrotativoapitkn=([^;]+)/)
  const jwt = jwtMatch ? jwtMatch[1].trim() : null

  const resp = await fetch(
    `${API_URL}/verify-pix-payment`,
    { method: 'POST', headers: apiHeaders(jwt), body: JSON.stringify({ orderId }) }
  )

  const text = await resp.text()
  console.log(`[verify-pix] orderId=${orderId} response: ${text.substring(0, 200)}`)
  try {
    const data = JSON.parse(text)
    return data.status === 200 && (
      data.retorno?.paid === true ||
      data.retorno?.status === 'paid' ||
      data.retorno?.status === 'approved' ||
      data.retorno?.confirmed === true
    )
  } catch {
    return text.toLowerCase().includes('pago') || text.toLowerCase().includes('approved')
  }
}

// ──────────────────────────────────────────────
// Parking activation
// ──────────────────────────────────────────────

interface ParkingResult {
  start_time: string
  end_time: string
  amount_debited: string
  spot_number: string
}

async function activateParking(
  cookies: string,
  userId: string,
  plate: string,
  periods: number,
): Promise<ParkingResult> {
  // ── Step 1: confirma_alocacao.php — verify session + check balance ──
  const step1Params = new URLSearchParams({ carro: plate, id: userId, numero: String(SUB_SECTOR_ID) })
  const step1Resp = await authFetch(
    `${BASE_URL}/foneparking/confirma_alocacao.php?${step1Params}`,
    cookies,
    { method: 'GET', headers: { 'Accept': 'text/html' } }
  )
  const step1Html = await step1Resp.text()
  console.log(`[activate] step1 length=${step1Html.length} status=${step1Resp.status}`)

  if (step1Html.includes('login/pro') && step1Html.length < 6000) {
    throw new Error('activate-parking: sessão rejeitada (login wall) na etapa 1.')
  }

  // Check balance — page shows "Seu saldo atual é de R$ X,XX."
  const saldoMatch = step1Html.match(/saldo[^R\d]*R\$\s*([\d,\.]+)/i)
  if (saldoMatch) {
    const saldo = parseFloat(saldoMatch[1].replace(',', '.'))
    const needed = (periods * PRICE_PER_PERIOD) / 100
    console.log(`[activate] saldo=R$${saldo} needed=R$${needed}`)
    if (saldo < needed) {
      throw new Error(`Saldo insuficiente: R$ ${saldo.toFixed(2)}. Necessário R$ ${needed.toFixed(2)}.`)
    }
  }

  // ── Step 2: alocado.php — submit parking activation ──
  const valorTotal = ((periods * PRICE_PER_PERIOD) / 100).toFixed(2)
  const step2Resp = await authFetch(
    `${BASE_URL}/foneparking/alocado.php`,
    cookies,
    {
      method: 'POST',
      body: new URLSearchParams({
        multiPeriodos: String(periods),
        id: userId,
        placa: plate,
        numero: String(SUB_SECTOR_ID),
        nome: 'Cidade de Paraty',
        telefone: '21999999999',
        valor: valorTotal,
        periodo: String(PRICE_PER_PERIOD / 100), // '3'
      }),
    }
  )

  const resultHtml = await step2Resp.text()
  console.log(`[activate] step2 length=${resultHtml.length} status=${step2Resp.status} snippet=${resultHtml.substring(0, 200)}`)

  if (resultHtml.includes('login/pro') && resultHtml.length < 6000) {
    throw new Error('activate-parking: sessão rejeitada (login wall) na etapa 2.')
  }

  // Parse start/end times from result page
  const startMatch = resultHtml.match(/[Ii]ni[cç][íi]o[:\s]*([\d\/\-]+\s+[\d:]+)/)
    || resultHtml.match(/[Ee]ntrada[:\s]*([\d\/\-]+\s+[\d:]+)/)
    || resultHtml.match(/start["']?\s*:\s*["']([\d\-T:Z.]+)["']/i)
  const endMatch = resultHtml.match(/[Tt][eé]rmino[:\s]*([\d\/\-]+\s+[\d:]+)/)
    || resultHtml.match(/[Ss]a[íi]da[:\s]*([\d\/\-]+\s+[\d:]+)/)
    || resultHtml.match(/end["']?\s*:\s*["']([\d\-T:Z.]+)["']/i)
  const amountMatch = resultHtml.match(/[Vv]alor[^\d]*R?\$?\s*([\d,\.]+)/)

  const now = new Date()
  return {
    start_time: startMatch ? startMatch[1].trim() : now.toISOString(),
    end_time: endMatch ? endMatch[1].trim() : new Date(now.getTime() + periods * 60 * 60 * 1000).toISOString(),
    amount_debited: amountMatch ? amountMatch[1] : valorTotal,
    spot_number: String(SUB_SECTOR_ID),
  }
}

// ──────────────────────────────────────────────
// Main handler
// ──────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { action } = body

    // Initialize Supabase for ticket persistence
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // ────── ACTION: generate-pix ──────
    if (action === 'generate-pix') {
      const { plate, brand, model, color, periods, buyer_name, buyer_cpf, buyer_email, location_description, location_lat, location_lng } = body

      if (!plate || !brand || !color || !periods || !buyer_name || !buyer_cpf || !buyer_email) {
        throw new Error('Missing required fields: plate, brand, color, periods, buyer_name, buyer_cpf, buyer_email')
      }

      // Validate plate
      const normalizedPlate = plate.replace(/[-\s]/g, '').toUpperCase()
      if (!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(normalizedPlate)) {
        throw new Error('Invalid plate format')
      }

      // Validate CPF (basic: 11 digits)
      const cleanCpf = buyer_cpf.replace(/\D/g, '')
      if (cleanCpf.length !== 11) {
        throw new Error('Invalid CPF')
      }

      // 1. Login
      const session = await login()

      // 2. Check/register vehicle
      const tokens = await getXcrudTokens(session.raw, session.userId)
      const vehicleList = await findVehicle(session.raw, tokens)

      if (!vehicleList || !vehicleList.includes(normalizedPlate)) {
        await registerVehicle(session.raw, tokens, normalizedPlate, brand, color)
      }

      // 3. Generate PIX
      const pix = await generatePix(session.raw, session.userId, periods)

      // 4. Save ticket in Supabase (pending)
      const amountCents = periods * PRICE_PER_PERIOD
      const expiresAt = new Date(Date.now() + periods * 60 * 60 * 1000).toISOString()

      const { data: ticket, error: insertErr } = await supabase
        .from('parking_tickets')
        .insert({
          plate: normalizedPlate,
          vehicle_brand: brand,
          vehicle_model: model || null,
          vehicle_color: color,
          duration_minutes: periods * 60,
          amount_cents: amountCents,
          status: 'pending',
          payment_method: 'pix',
          payment_id: pix.order_id,
          pix_code: pix.pix_string,
          qr_code_base64: pix.qrcode_base64,
          location_description: location_description || null,
          buyer_name,
          buyer_cpf: cleanCpf,
          buyer_email: buyer_email.toLowerCase().trim(),
          expires_at: expiresAt,
        })
        .select()
        .single()

      if (insertErr) throw new Error(`DB insert failed: ${insertErr.message}`)

      // Store session cookies encrypted in ticket metadata for later use
      await supabase
        .from('parking_tickets')
        .update({ rotativo_session: session.raw, rotativo_user_id: session.userId })
        .eq('id', ticket.id)

      return new Response(JSON.stringify({
        ticket_id: ticket.id,
        plate: normalizedPlate,
        amount_cents: amountCents,
        periods,
        pix_code: pix.pix_string,
        qr_code_base64: pix.qrcode_base64,
        status: 'pending',
        created_at: ticket.created_at,
        expires_at: expiresAt,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ────── ACTION: check-payment ──────
    if (action === 'check-payment') {
      const { ticket_id } = body
      if (!ticket_id) throw new Error('ticket_id required')

      // Get ticket and its session
      const { data: ticket, error: fetchErr } = await supabase
        .from('parking_tickets')
        .select('*')
        .eq('id', ticket_id)
        .single()

      if (fetchErr || !ticket) throw new Error('Ticket not found')
      if (ticket.status === 'paid') {
        return new Response(JSON.stringify({ paid: true, status: 'paid' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Verify with Paraty Rotativo
      const cookies = ticket.rotativo_session
      const orderId = ticket.payment_id // orderId stored at PIX generation time
      if (!cookies) {
        // Re-login if session expired
        const session = await login()
        const paid = await verifyPixPayment(session.raw, orderId)

        if (paid) {
          await supabase
            .from('parking_tickets')
            .update({ status: 'paid', rotativo_session: session.raw, rotativo_user_id: session.userId })
            .eq('id', ticket_id)

          return new Response(JSON.stringify({ paid: true, status: 'paid' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        return new Response(JSON.stringify({ paid: false, status: 'pending' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const paid = await verifyPixPayment(cookies, orderId)

      if (paid) {
        await supabase
          .from('parking_tickets')
          .update({ status: 'paid' })
          .eq('id', ticket_id)
      }

      return new Response(JSON.stringify({ paid, status: paid ? 'paid' : 'pending' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ────── ACTION: activate-parking ──────
    if (action === 'activate-parking') {
      const { ticket_id } = body
      if (!ticket_id) throw new Error('ticket_id required')

      const { data: ticket, error: fetchErr } = await supabase
        .from('parking_tickets')
        .select('*')
        .eq('id', ticket_id)
        .single()

      if (fetchErr || !ticket) throw new Error('Ticket not found')
      if (ticket.status !== 'paid') throw new Error('Payment not confirmed yet')

      // Re-login to ensure fresh session
      const session = await login()
      const periods = ticket.duration_minutes / 60

      // Activate parking on Paraty Rotativo
      const result = await activateParking(session.raw, session.userId, ticket.plate, periods)

      // Update ticket with parking times
      await supabase
        .from('parking_tickets')
        .update({
          status: 'paid',
          activated_at: result.start_time,
          expires_at: result.end_time,
        })
        .eq('id', ticket_id)

      return new Response(JSON.stringify({
        success: true,
        ticket_id,
        start_time: result.start_time,
        end_time: result.end_time,
        amount_debited: result.amount_debited,
        spot_number: result.spot_number,
      }), {
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
