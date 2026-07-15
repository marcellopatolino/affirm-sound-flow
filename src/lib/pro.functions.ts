import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const verifyCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ code: z.string().min(4).max(80) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("pro_codes")
      .select("id, status, redeemed_by")
      .eq("code", data.code.trim())
      .maybeSingle();

    if (!row) return { ok: false as const, error: "invalid" };
    if (row.status !== "active") return { ok: false as const, error: "revoked" };
    if (row.redeemed_by && row.redeemed_by !== context.userId) {
      return { ok: false as const, error: "already_used" };
    }

    await supabaseAdmin
      .from("pro_codes")
      .update({ redeemed_by: context.userId })
      .eq("id", row.id);

    await supabaseAdmin
      .from("profiles")
      .update({ plan: "pro" })
      .eq("user_id", context.userId);

    return { ok: true as const };
  });

export const getCodeBySession = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ session_id: z.string().min(4).max(200) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("pro_codes")
      .select("code, status")
      .eq("stripe_session_id", data.session_id)
      .maybeSingle();
    if (!row) return { code: null as string | null, status: null as string | null };
    return { code: row.code, status: row.status };
  });