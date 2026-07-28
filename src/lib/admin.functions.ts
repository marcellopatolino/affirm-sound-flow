import { createServerFn } from "@tanstack/react-start";
import { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const adminGetStats = createServerFn({ method: "GET" }).handler(async () => {
  const [
    { count: totalUsers },
    { count: proUsers },
    { count: totalItems },
    { count: activeCoupons },
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).eq("plan", "pro"),
    supabaseAdmin.from("library").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("pro_codes").select("*", { count: "exact", head: true }).is("redeemed_by", null),
  ]);
  return { ok: true as const, stats: { totalUsers: totalUsers ?? 0, proUsers: proUsers ?? 0, totalItems: totalItems ?? 0, activeCoupons: activeCoupons ?? 0 } };
});

export const adminListUsers = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (error) return { ok: false as const, error: error.message, users: [] };
  const { data: profiles } = await supabaseAdmin.from("profiles").select("user_id, plan");
  const profileMap = new Map((profiles ?? []).map((p: { user_id: string; plan: string }) => [p.user_id, p]));
  return {
    ok: true as const,
    users: data.users.map((u: User) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      plan: (profileMap.get(u.id) as { plan: string } | undefined)?.plan ?? "free",
    })),
  };
});

export const adminSetPlan = createServerFn({ method: "POST" })
  .validator((d: { userId: string; plan: "free" | "pro" }) => d)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("profiles").update({ plan: data.plan }).eq("user_id", data.userId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const adminBanUser = createServerFn({ method: "POST" })
  .validator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: "87600h" });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const adminListCoupons = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin.from("pro_codes").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) return { ok: false as const, error: error.message, coupons: [] };
  return { ok: true as const, coupons: data ?? [] };
});

export const adminCreateCoupon = createServerFn({ method: "POST" })
  .validator((d: { code: string }) => d)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("pro_codes").insert({
      code: data.code.toUpperCase(),
      status: "active",
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const adminDeleteCoupon = createServerFn({ method: "POST" })
  .validator((d: { code: string }) => d)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("pro_codes").delete().eq("code", data.code);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
