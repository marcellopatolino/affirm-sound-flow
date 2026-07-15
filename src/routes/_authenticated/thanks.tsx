import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { getCodeBySession, verifyCode } from "@/lib/pro.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/thanks")({
  validateSearch: (search) =>
    z.object({ session_id: z.string().optional() }).parse(search),
  head: () => ({ meta: [{ title: "Obrigado — VoxAffirm" }] }),
  component: ThanksPage,
});

function ThanksPage() {
  const { t } = useTranslation();
  const { session_id } = useSearch({ from: "/_authenticated/thanks" });
  const navigate = useNavigate();
  const getCode = useServerFn(getCodeBySession);
  const verify = useServerFn(verifyCode);
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    if (session_id) getCode({ data: { session_id } }).then((r) => setCode(r.code));
  }, [session_id]); // eslint-disable-line

  async function activate() {
    if (!code) return;
    const res = await verify({ data: { code } });
    if (res.ok) {
      toast.success(t("thanks_activated"));
      setTimeout(() => navigate({ to: "/" }), 1000);
    } else {
      toast.error(res.error ?? "erro");
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 text-center bg-card/80">
        <CheckCircle2 className="mx-auto h-14 w-14 text-primary mb-3" />
        <h1 className="text-2xl font-bold">{t("thanks_title")}</h1>
        <p className="text-muted-foreground mt-1">{t("thanks_subtitle")}</p>
        {code && (
          <>
            <p className="mt-6 text-xs mono uppercase tracking-widest text-muted-foreground">
              {t("thanks_code_label")}
            </p>
            <div className="mt-2 mono text-lg font-bold gold-text break-all">{code}</div>
          </>
        )}
        <Button
          className="mt-6 w-full gold-gradient text-primary-foreground"
          onClick={activate}
          disabled={!code}
        >
          {t("thanks_activate")}
        </Button>
      </Card>
    </div>
  );
}