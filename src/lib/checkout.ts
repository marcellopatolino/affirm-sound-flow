import { supabase } from "@/integrations/supabase/client";
import { STRIPE_PRICE_KEY_BY_LANG, type Lang } from "@/lib/translations";
import i18n from "@/lib/i18n";

export async function startCheckout() {
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
    throw new Error(err || "checkout failed");
  }
  const { url } = (await res.json()) as { url: string };
  window.location.href = url;
}