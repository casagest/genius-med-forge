import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcurementEmailRequest {
  sku: string;
  quantity: number;
  supplier_name: string;
  supplier_email: string;
  contact_person?: string;
  estimated_cost: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  case_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      sku, 
      quantity, 
      supplier_name, 
      supplier_email, 
      contact_person, 
      estimated_cost, 
      urgency,
      case_id 
    }: ProcurementEmailRequest = await req.json();

    console.log(`📧 Processing procurement email for ${sku} to ${supplier_name}`);

    // Generate order ID for tracking
    const orderId = `ORD-${Date.now()}-${sku.substring(0, 4).toUpperCase()}`;
    const currentDate = new Date().toLocaleDateString('ro-RO');
    const estimatedDelivery = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('ro-RO');

    // Get urgency styling
    const urgencyColors = {
      'low': { bg: '#f0f9ff', color: '#0369a1', border: '#0ea5e9' },
      'medium': { bg: '#fefce8', color: '#a16207', border: '#eab308' },
      'high': { bg: '#fef2f2', color: '#dc2626', border: '#f87171' },
      'critical': { bg: '#7f1d1d', color: '#ffffff', border: '#dc2626' }
    };

    const urgencyStyle = urgencyColors[urgency];

    // Professional email template for Romanian suppliers
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Comandă Automată MedicalCor</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600;">GENIUS MedicalCor AI</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Comandă Automată Generată de AI</p>
          </div>

          <!-- Urgency Badge -->
          <div style="background: ${urgencyStyle.bg}; border: 2px solid ${urgencyStyle.border}; color: ${urgencyStyle.color}; padding: 15px; margin: 0; text-align: center; font-weight: 600; text-transform: uppercase;">
            🚨 Prioritate: ${urgency.toUpperCase()} ${urgency === 'critical' ? '- ACȚIUNE IMEDIATĂ NECESARĂ' : ''}
          </div>

          <!-- Main Content -->
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
            
            <p>Bună ziua${contact_person ? ` ${contact_person}` : ''},</p>
            
            <p>Sistemul nostru AI de gestionare a inventarului a detectat o nevoie de reaprovizionare și a generat automat această comandă:</p>

            <!-- Order Details -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #1e3a8a;">📋 Detalii Comandă</h3>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: 600; color: #4b5563;">Număr Comandă:</td>
                  <td style="padding: 8px 0; color: #1e3a8a; font-weight: 600;">${orderId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600; color: #4b5563;">Data Comandă:</td>
                  <td style="padding: 8px 0;">${currentDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600; color: #4b5563;">SKU Produs:</td>
                  <td style="padding: 8px 0; font-family: monospace; background: #e5e7eb; padding: 4px 8px; border-radius: 4px;">${sku}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600; color: #4b5563;">Cantitate:</td>
                  <td style="padding: 8px 0; font-size: 18px; font-weight: 600; color: #dc2626;">${quantity} unități</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600; color: #4b5563;">Cost Estimat:</td>
                  <td style="padding: 8px 0; font-weight: 600; color: #059669;">${estimated_cost.toFixed(2)} RON</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600; color: #4b5563;">Livrare Solicitată:</td>
                  <td style="padding: 8px 0; font-weight: 600; color: #dc2626;">${estimatedDelivery}</td>
                </tr>
              </table>
            </div>

            ${case_id ? `
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 15px 0;">
              <p style="margin: 0; color: #92400e;"><strong>ℹ️ Context:</strong> Această comandă este legată de cazul clinic <code style="background: #fed7aa; padding: 2px 6px; border-radius: 3px;">${case_id}</code> și este necesară pentru continuarea tratamentului.</p>
            </div>
            ` : ''}

            <!-- Delivery Address -->
            <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #047857;">📍 Adresa de Livrare</h3>
              <address style="font-style: normal; line-height: 1.5; color: #374151;">
                <strong>GENIUS MedicalCor AI</strong><br>
                Str. Observatorului Nr. 42<br>
                Cluj-Napoca, CJ 400000<br>
                România<br>
                <br>
                📞 Tel: +40 264 123 456<br>
                📧 Email: procurement@medicalcor.ro
              </address>
            </div>

            <!-- Action Required -->
            <div style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <h3 style="margin: 0 0 10px 0;">🎯 Acțiune Solicitată</h3>
              <p style="margin: 0; font-size: 16px;">Vă rugăm să confirmați disponibilitatea și să furnizați o ofertă detaliată cu termenii de livrare.</p>
            </div>

            <p>Pentru orice clarificări sau modificări, vă rugăm să ne contactați la adresa de email <strong>procurement@medicalcor.ro</strong> sau la numărul de telefon <strong>+40 264 123 456</strong>.</p>

            <p>Mulțumim pentru colaborare și așteptăm confirmarea dumneavoastră.</p>

            <!-- Signature -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
              <p style="margin: 0; font-weight: 600; color: #1e3a8a;">Cu stimă,</p>
              <p style="margin: 5px 0 0 0; color: #6b7280;">Sistemul AI de Procurement</p>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">GENIUS MedicalCor AI</p>
              <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">📧 procurement@medicalcor.ro | 🌐 www.medicalcor.ro</p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #f3f4f6; padding: 20px; border-radius: 0 0 10px 10px; text-align: center; color: #6b7280; font-size: 12px;">
            <p style="margin: 0;">Acest email a fost generat automat de sistemul GENIUS MedicalCor AI</p>
            <p style="margin: 5px 0 0 0;">Order ID: ${orderId} | ${currentDate}</p>
          </div>
        </body>
      </html>
    `;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "GENIUS MedicalCor AI <procurement@medicalcor.ro>",
      to: [supplier_email],
      subject: `🤖 Comandă Automată AI - ${orderId} - ${sku} (${urgency.toUpperCase()})`,
      html: emailHtml,
    });

    console.log("✅ Email sent successfully:", emailResponse);

    // Log the procurement action to Supabase
    const { error: logError } = await supabase
      .from('analysis_reports')
      .insert({
        report_type: 'EMAIL_PROCUREMENT_SENT',
        risk_level: urgency === 'critical' ? 'CRITICAL' : urgency === 'high' ? 'HIGH' : 'MEDIUM',
        confidence_score: 0.95,
        analysis_data: {
          order_id: orderId,
          sku,
          quantity,
          supplier_name,
          supplier_email,
          estimated_cost,
          urgency,
          case_id,
          email_sent_at: new Date().toISOString(),
          resend_message_id: emailResponse.data?.id
        },
        requires_action: urgency === 'critical'
      });

    if (logError) {
      console.error("⚠️ Failed to log procurement action:", logError);
    }

    return new Response(JSON.stringify({
      success: true,
      order_id: orderId,
      message_id: emailResponse.data?.id,
      email_sent_to: supplier_email
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("❌ Error in procurement-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);