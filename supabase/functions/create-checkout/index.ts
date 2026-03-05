// supabase/functions/create-checkout/index.ts
// Creates a Stripe Checkout session for purchasing quiz credits.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { quizCount } = await req.json();

    // Validate quiz count (2–20)
    if (
      typeof quizCount !== "number" ||
      quizCount < 2 ||
      quizCount > 20 ||
      !Number.isInteger(quizCount)
    ) {
      return new Response(
        JSON.stringify({ error: "Quiz count must be an integer between 2 and 20" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Price: £1 per quiz (100 pence each)
    const amountPence = quizCount * 100;

    // Create purchase record
    const { data: purchase, error: purchaseErr } = await supabase
      .from("purchases")
      .insert({
        user_id: user.id,
        quiz_count: quizCount,
        amount_pence: amountPence,
        status: "pending",
      })
      .select("id")
      .single();

    if (purchaseErr) {
      throw new Error(`Failed to create purchase record: ${purchaseErr.message}`);
    }

    // Create Stripe Checkout session
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const siteUrl = Deno.env.get("SITE_URL") || "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `${quizCount} Quiz Credits`,
              description: `Generate ${quizCount} custom quizzes on Quiz Whizz`,
            },
            unit_amount: 100, // £1 per quiz
          },
          quantity: quizCount,
        },
      ],
      metadata: {
        purchase_id: purchase.id,
        user_id: user.id,
        quiz_count: String(quizCount),
      },
      success_url: `${siteUrl}/create?payment=success`,
      cancel_url: `${siteUrl}/create?payment=cancelled`,
    });

    // Update purchase with Stripe session ID
    await supabase
      .from("purchases")
      .update({ stripe_session_id: session.id })
      .eq("id", purchase.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("create-checkout error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
