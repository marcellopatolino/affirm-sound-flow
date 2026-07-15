import { createFileRoute } from "@tanstack/react-router";
import { nanoid } from "nanoid";

export const Route = createFileRoute("/api/public/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret) return new Response("webhook secret missing", { status: 500 });

        const sigHeader = request.headers.get("stripe-signature");
        const rawBody = await request.text();
        if (!sigHeader) return new Response("no signature", { status: 400 });

        const ok = await verifyStripeSignature(rawBody, sigHeader, secret);
        if (!ok) return new Response("bad signature", { status: 401 });

        const event = JSON.parse(rawBody) as {
          type: string;
          data: { object: Record<string, unknown> };
        };

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (event.type === "checkout.session.completed") {
          const s = event.data.object as {
            id: string;
            customer?: string;
            customer_email?: string;
            customer_details?: { email?: string };
            subscription?: string;
            metadata?: { user_id?: string };
          };
          const code = "VOX-" + nanoid(10).toUpperCase();
          const email = s.customer_details?.email ?? s.customer_email ?? null;

          await supabaseAdmin.from("pro_codes").insert({
            code,
            email,
            stripe_session_id: s.id,
            stripe_customer_id: s.customer ?? null,
            stripe_subscription_id: s.subscription ?? null,
            payment_type: "subscription",
            status: "active",
          });

          if (s.metadata?.user_id) {
            await supabaseAdmin.from("profiles")
              .update({ plan: "pro", stripe_customer_id: s.customer ?? null })
              .eq("user_id", s.metadata.user_id);
          }
        }

        if (event.type === "customer.subscription.deleted" || event.type === "invoice.payment_failed") {
          const sub = event.data.object as { id?: string; subscription?: string };
          const subId = sub.id ?? sub.subscription;
          if (subId) {
            await supabaseAdmin.from("pro_codes")
              .update({ status: "revoked" })
              .eq("stripe_subscription_id", subId);
            const { data: rows } = await supabaseAdmin
              .from("pro_codes")
              .select("redeemed_by")
              .eq("stripe_subscription_id", subId);
            for (const r of rows ?? []) {
              if (r.redeemed_by) {
                await supabaseAdmin.from("profiles")
                  .update({ plan: "free" })
                  .eq("user_id", r.redeemed_by);
              }
            }
          }
        }

        return new Response("ok");
      },
    },
  },
});

async function verifyStripeSignature(payload: string, header: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, ...v] = p.split("=");
      return [k, v.join("=")];
    }),
  );
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;
  const signedPayload = `${t}.${payload}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(signedPayload));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (expected.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}