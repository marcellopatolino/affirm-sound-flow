import { supabase } from "@/integrations/supabase/client";
import { STRIPE_PRICE_KEY_BY_LANG, type Lang } from "@/lib/translations";
import i18n from "@/lib/i18n";

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export async function startCheckout(): Promise<CheckoutResult> {
  try {
    const lang = ((i18n.language?.slice(0, 2) as Lang) ?? "pt");
    const currency = STRIPE_PRICE_KEY_BY_LANG[lang];
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    const res = await fetch("/api/public/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currency,
        customer_email: user?.email,
        user_id: user?.id,
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error("[checkout] server error:", res.status, err);
      return { ok: false, error: err || `Erro ${res.status} ao iniciar pagamento` };
    }

    const body = await res.json() as { url?: string; error?: string };

    if (!body.url) {
      console.error("[checkout] no url in response:", body);
      return { ok: false, error: body.error || "Resposta inválida do servidor" };
    }

    window.location.href = body.url;
    return { ok: true, url: body.url };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[checkout] unexpected error:", msg);
    return { ok: false, error: msg };
  }
}
