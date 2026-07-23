import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SaveSchema = z.object({
  name: z.string().min(1).max(120),
  affirmations: z.array(z.string().max(1000)).min(1).max(200),
  sound: z.string().max(50),
  frequency: z.number().int(),
  format: z.string().max(30),
  voice_vol: z.number().int(),
  bg_vol: z.number().int(),
  freq_vol: z.number().int(),
  duration: z.number().int(),
  lang: z.string().max(5),
});

export const saveLibraryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("plan")
      .eq("user_id", context.userId)
      .maybeSingle();
    const isPro = prof?.plan === "pro";
    if (!isPro) {
      const { count } = await context.supabase
        .from("library")
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId);
      if ((count ?? 0) >= 1) return { saved: false, reason: "free_limit" };
    }

    const { data: row, error } = await context.supabase
      .from("library")
      .insert({ ...data, user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { saved: true, item: row };
  });


export const listLibrary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("library")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteLibraryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("library")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("plan, email")
      .eq("user_id", context.userId)
      .maybeSingle();
    return data ?? { plan: "free", email: null };
  });