import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function formatCpf(cpf: string): string {
  const c = cpf.replace(/\D/g, '')
  return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}`
}

function buildEmailHtml(ticket: Record<string, unknown>): string {
  const plate = ticket.plate as string
  const brand = ticket.vehicle_brand as string || ''
  const color = ticket.vehicle_color as string || ''
  const name = ticket.buyer_name as string
  const cpf = formatCpf(ticket.buyer_cpf as string)
  const amount = formatCurrency(ticket.amount_cents as number)
  const periods = (ticket.duration_minutes as number) / 60
  const createdAt = formatDate(ticket.created_at as string)
  const expiresAt = formatDate(ticket.expires_at as string)
  const location = ticket.location_description as string || 'Paraty, RJ'

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
  <tr><td style="background:#FF6B57;padding:24px;text-align:center">
    <h1 style="margin:0;color:#fff;font-size:20px">🅿️ Comprovante de Estacionamento</h1>
    <p style="margin:4px 0 0;color:rgba(255,255,255,.85);font-size:13px">Rotativo Digital — Paraty</p>
  </td></tr>
  <tr><td style="padding:24px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:8px 0;border-bottom:1px solid #e4e4e7">
        <span style="color:#71717a;font-size:12px;text-transform:uppercase">Adquirente</span><br>
        <strong style="font-size:15px">${name}</strong>
      </td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #e4e4e7">
        <span style="color:#71717a;font-size:12px;text-transform:uppercase">CPF</span><br>
        <strong style="font-size:14px">${cpf}</strong>
      </td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #e4e4e7">
        <span style="color:#71717a;font-size:12px;text-transform:uppercase">Placa</span><br>
        <strong style="font-size:22px;letter-spacing:4px">${plate}</strong>
      </td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #e4e4e7">
        <span style="color:#71717a;font-size:12px;text-transform:uppercase">Veículo</span><br>
        <strong style="font-size:14px">${[color, brand].filter(Boolean).join(' — ')}</strong>
      </td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #e4e4e7">
        <span style="color:#71717a;font-size:12px;text-transform:uppercase">📍 Local</span><br>
        <span style="font-size:14px">${location}</span>
      </td></tr>
    </table>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:16px 0">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#166534;text-transform:uppercase">Períodos Regulares Adquiridos</p>
      <table width="100%" cellpadding="4" cellspacing="0" style="font-size:14px;color:#15803d">
        <tr><td>Início</td><td align="right"><strong>${createdAt}</strong></td></tr>
        <tr><td>Término</td><td align="right"><strong>${expiresAt}</strong></td></tr>
        <tr><td>Períodos</td><td align="right"><strong>${periods}</strong></td></tr>
        <tr style="font-size:16px"><td>Valor</td><td align="right"><strong>${amount}</strong></td></tr>
      </table>
    </div>

    <p style="font-size:12px;color:#71717a;text-align:center;margin:16px 0 0">
      Em caso de dúvidas: <strong>(24) 99821-2689</strong> (WhatsApp)<br>
      End: Rua Presidente Pedreira, 788, Chácara, Paraty-RJ
    </p>
  </td></tr>
  <tr><td style="background:#f4f4f5;padding:16px;text-align:center">
    <p style="margin:0;font-size:11px;color:#a1a1aa">Go Paraty — Rotativo Digital © ${new Date().getFullYear()}</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { ticket_id, ticket_data } = body

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) throw new Error('RESEND_API_KEY not configured')

    let ticket: Record<string, unknown>

    if (ticket_data) {
      // Inline ticket data (used for MVP fallback tickets not saved to DB)
      ticket = ticket_data
    } else if (ticket_id) {
      // Fetch from DB
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      const { data, error } = await supabase
        .from('parking_tickets')
        .select('*')
        .eq('id', ticket_id)
        .single()
      if (error || !data) throw new Error('Ticket not found')
      ticket = data
    } else {
      throw new Error('ticket_id or ticket_data required')
    }

    if (!ticket.buyer_email) throw new Error('No email on ticket')

    // Send email via Resend
    const emailResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Go Paraty <onboarding@resend.dev>',
        to: [ticket.buyer_email],
        subject: `🅿️ Comprovante Rotativo Digital - ${ticket.plate}`,
        html: buildEmailHtml(ticket),
      }),
    })

    const emailResult = await emailResp.json()

    if (!emailResp.ok) {
      throw new Error(`Email send failed: ${JSON.stringify(emailResult)}`)
    }

    return new Response(JSON.stringify({
      success: true,
      email_id: emailResult.id,
      sent_to: ticket.buyer_email,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
