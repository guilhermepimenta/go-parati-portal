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
        const { plate, duration_minutes, payment_method, location_description, vehicle_brand, vehicle_model, vehicle_color } = await req.json()

        if (!plate || !duration_minutes) {
            throw new Error('plate and duration_minutes are required')
        }

        // Validate plate format
        const plateRegex = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/
        const normalizedPlate = plate.replace(/[-\s]/g, '').toUpperCase()
        if (!plateRegex.test(normalizedPlate)) {
            throw new Error('Invalid plate format')
        }

        // Initialize Supabase client with service role for DB writes
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Look up price from parking_prices table
        const { data: priceData, error: priceError } = await supabase
            .from('parking_prices')
            .select('amount_cents')
            .eq('duration_minutes', duration_minutes)
            .eq('active', true)
            .single()

        if (priceError || !priceData) {
            throw new Error('Invalid duration or price not found')
        }

        const amount_cents = priceData.amount_cents
        const expires_at = new Date(Date.now() + duration_minutes * 60 * 1000).toISOString()

        // ================================================================
        // TODO: INTEGRAÇÃO COM API DO OPERADOR DE ESTACIONAMENTO
        // ================================================================
        // Aqui é onde a integração real com o gateway de pagamento e o
        // operador do rotativo (ex: Zona Azul, CET, etc.) seria feita.
        //
        // Para o MVP, geramos um código PIX simulado.
        // Em produção, substituir por:
        //
        // 1. Chamada ao gateway de pagamento (Mercado Pago, Stripe, etc.)
        //    const paymentResponse = await createPixPayment({
        //        amount: amount_cents,
        //        description: `Rotativo Paraty - ${normalizedPlate} - ${duration_minutes}min`,
        //        payer_email: payer_email
        //    });
        //
        // 2. Registro na API do operador local (se existir)
        //    const operatorResponse = await registerParkingTicket({
        //        plate: normalizedPlate,
        //        zone: zone_id,
        //        duration: duration_minutes,
        //        payment_ref: paymentResponse.id
        //    });
        //
        // 3. Usar os IDs reais do pagamento e do operador no ticket
        // ================================================================

        // MVP: Simulated payment data
        const mockPaymentId = `PIX_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`
        const mockPixCode = `00020126580014BR.GOV.BCB.PIX0136${crypto.randomUUID()}5204000053039865406${(amount_cents / 100).toFixed(2)}5802BR5913GO PARATY6007PARATY62070503***6304`

        // Insert ticket into database
        const { data: ticket, error: insertError } = await supabase
            .from('parking_tickets')
            .insert({
                plate: normalizedPlate,
                duration_minutes,
                amount_cents,
                status: 'pending',
                payment_method: payment_method || 'pix',
                payment_id: mockPaymentId,
                pix_code: mockPixCode,
                location_description: location_description || null,
                vehicle_brand: vehicle_brand || null,
                vehicle_model: vehicle_model || null,
                vehicle_color: vehicle_color || null,
                expires_at,
            })
            .select()
            .single()

        if (insertError) {
            throw new Error(`Failed to create ticket: ${insertError.message}`)
        }

        // ================================================================
        // MVP: Auto-confirm payment after 3 seconds (simulates PIX confirmation)
        // In production, this would be handled by the payment-webhook endpoint
        // ================================================================
        // Note: We don't await this - fire and forget for demo purposes
        setTimeout(async () => {
            await supabase
                .from('parking_tickets')
                .update({ status: 'paid' })
                .eq('id', ticket.id)
                .eq('status', 'pending')
        }, 3000)

        return new Response(JSON.stringify({
            ticket_id: ticket.id,
            plate: ticket.plate,
            duration_minutes: ticket.duration_minutes,
            amount_cents: ticket.amount_cents,
            status: ticket.status,
            pix_code: mockPixCode,
            payment_id: mockPaymentId,
            expires_at: ticket.expires_at,
            created_at: ticket.created_at,
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
