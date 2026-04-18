import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // ================================================================
        // TODO: INTEGRAÇÃO COM WEBHOOK REAL DO GATEWAY DE PAGAMENTO
        // ================================================================
        // Em produção, este endpoint receberia callbacks do Mercado Pago,
        // Stripe, ou outro gateway com a confirmação de pagamento.
        //
        // Mercado Pago:
        //   - Verificar header x-signature para autenticidade
        //   - Buscar pagamento via GET /v1/payments/{id}
        //   - Confirmar status == 'approved'
        //
        // Stripe:
        //   - Verificar Stripe-Signature header
        //   - Usar stripe.webhooks.constructEvent()
        //   - Confirmar event.type == 'payment_intent.succeeded'
        // ================================================================

        const body = await req.json()
        const { payment_id, status } = body

        if (!payment_id) {
            throw new Error('payment_id is required')
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Map gateway status to our status
        const newStatus = status === 'approved' || status === 'paid' ? 'paid' : 'cancelled'

        const { data: ticket, error } = await supabase
            .from('parking_tickets')
            .update({ status: newStatus })
            .eq('payment_id', payment_id)
            .eq('status', 'pending')
            .select()
            .single()

        if (error) {
            throw new Error(`Failed to update ticket: ${error.message}`)
        }

        if (!ticket) {
            throw new Error('No pending ticket found for this payment')
        }

        return new Response(JSON.stringify({
            success: true,
            ticket_id: ticket.id,
            status: ticket.status,
        }), {
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
