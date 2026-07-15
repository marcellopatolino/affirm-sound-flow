import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — VoxAffirm" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

function AdminPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return setAllowed(false);
      supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" })
        .then(({ data: isAdmin }) => setAllowed(!!isAdmin));
    });
  }, []);

  if (allowed === null) return <div className="p-8 text-center text-muted-foreground">…</div>;
  if (!allowed) return <div className="p-8 text-center">403</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold mb-6 gold-text">Admin</h1>
      <Card className="p-6 bg-card/70">
        <p className="text-sm text-muted-foreground">
          Painel admin oculto. Adicione o primeiro admin manualmente via backend:
        </p>
        <pre className="mono text-xs bg-background/60 p-3 rounded mt-3 overflow-x-auto">
{`INSERT INTO public.user_roles (user_id, role)
VALUES ('<seu-user-id>', 'admin');`}
        </pre>
      </Card>
    </div>
  );
}