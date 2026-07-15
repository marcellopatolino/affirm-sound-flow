import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const BodySchema = z.object({
  currency: z.enum(["BRL", "USD", "EUR"]).default("USD"),
  customer_email: z.string().email().optional(),
  user_id: z.string().uuid().optional(),
});

export const Route = createFileRoute("/api/public/stripe/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.STRIPE_SECRET_KEY;
        const appUrl = process.env.APP_URL ?? new URL(request.url).origin;
        if (!key) return json({ error: "Stripe not configured" }, 500);
        let body: z.infer<typeof BodySchema>;
        try { body = BodySchema.parse(await request.json()); }
        catch { return json({ error: "invalid body" }, 400); }

        const priceKey = {
          BRL: process.env.STRIPE_PRICE_BRL,
          USD: process.env.STRIPE_PRICE_USD,
          EUR: process.env.STRIPE_PRICE_EUR,
        }[body.currency];
        if (!priceKey) return json({ error: `Price for ${body.currency} not configured` }, 500);

        const form = new URLSearchParams();
        form.append("mode", "subscription");
        form.append("line_items[0][price]", priceKey);
        form.append("line_items[0][quantity]", "1");
        form.append("subscription_data[trial_period_days]", "7");
        form.append("success_url", `${appUrl}/thanks?session_id={CHECKOUT_SESSION_ID}`);
        form.append("cancel_url", `${appUrl}/`);
        form.append("allow_promotion_codes", "true");
        if (body.customer_email) form.append("customer_email", body.customer_email);
        if (body.user_id) form.append("metadata[user_id]", body.user_id);

        const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
          method: "POST",
          headers: {
            Authorization: "Basic " + btoa(key + ":"),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: form.toString(),
        });
        if (!res.ok) {
          const t = await res.text();
          return json({ error: t }, 500);
        }
        const session = (await res.json()) as { id: string; url: string };
        return json({ url: session.url, id: session.id });
      },
    },
  },
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}