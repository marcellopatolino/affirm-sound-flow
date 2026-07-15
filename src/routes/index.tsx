import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Generator } from "@/components/generator";
import { VoxLogo } from "@/components/vox-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pencil, Sliders, Download } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { t } = useTranslation();
  const [isAuthed, setIsAuthed] = useState(false);
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [showGenerator, setShowGenerator] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      setIsAuthed(!!uid);
      if (uid) {
        supabase.from("profiles").select("plan").eq("user_id", uid).maybeSingle()
          .then(({ data: p }) => p?.plan && setPlan(p.plan as "free" | "pro"));
      }
    });
  }, []);

  return (
    <div className="min-h-screen">
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-12 text-center">
        <div className="flex justify-center mb-6">
          <VoxLogo size={96} />
        </div>
        <div className="inline-block mono text-xs uppercase tracking-widest text-primary/80 px-3 py-1 rounded-full border border-primary/30 mb-4">
          {t("hero_badge")}
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-3">
          <span className="gold-text">VoxAffirm</span>
        </h1>
        <p className="text-lg text-muted-foreground mb-1">{t("tagline")}</p>
        <p className="text-2xl sm:text-3xl font-semibold mt-6 mb-8 max-w-2xl mx-auto">
          {t("hero_headline")}
        </p>
        <Button
          onClick={() => {
            setShowGenerator(true);
            setTimeout(() => document.getElementById("generator")?.scrollIntoView({ behavior: "smooth" }), 50);
          }}
          className="h-14 px-8 text-base font-semibold gold-gradient text-primary-foreground glow-primary hover:opacity-95"
        >
          {t("cta_generate")}
        </Button>
      </section>

      <section id="generator" className="mx-auto max-w-6xl px-4 py-12">
        {showGenerator ? (
          <Generator isAuthed={isAuthed} plan={plan} />
        ) : (
          <HowItWorks />
        )}
      </section>

      {!showGenerator && (
        <>
          <section className="mx-auto max-w-4xl px-4 py-12 text-center">
            <h2 className="text-3xl font-bold mb-3">{t("benefits_title")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t("benefits_desc")}</p>
          </section>

          <section className="mx-auto max-w-4xl px-4 py-12">
            <h2 className="text-3xl font-bold text-center mb-8">{t("plans_title")}</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 bg-card/60 backdrop-blur border-border">
                <div className="text-xs mono uppercase tracking-widest text-muted-foreground mb-2">{t("plans_free")}</div>
                <div className="text-3xl font-bold mb-2">$0</div>
                <p className="text-sm text-muted-foreground mb-4">{t("plans_free_desc")}</p>
                <Button variant="outline" className="w-full" onClick={() => setShowGenerator(true)}>
                  {t("cta_generate")}
                </Button>
              </Card>
              <Card className="p-6 bg-card/80 backdrop-blur border-primary/40 glow-primary">
                <div className="text-xs mono uppercase tracking-widest text-primary mb-2">{t("plans_pro")}</div>
                <div className="text-3xl font-bold gold-text mb-1">{t("plans_pro_price")}</div>
                <div className="text-xs mono text-primary mb-3">{t("plans_pro_trial")}</div>
                <p className="text-sm text-muted-foreground mb-4">{t("plans_pro_desc")}</p>
                <Link to="/auth"><Button className="w-full gold-gradient text-primary-foreground">{t("plans_pro_cta")}</Button></Link>
              </Card>
            </div>
          </section>
        </>
      )}

      <footer className="mx-auto max-w-6xl px-4 py-8 mt-12 border-t border-border/60 text-center text-xs text-muted-foreground mono">
        {t("footer_rights")}
      </footer>
    </div>
  );
}

function HowItWorks() {
  const { t } = useTranslation();
  const steps = [
    { icon: <Pencil className="h-5 w-5" />, title: t("how_1_title"), desc: t("how_1_desc") },
    { icon: <Sliders className="h-5 w-5" />, title: t("how_2_title"), desc: t("how_2_desc") },
    { icon: <Download className="h-5 w-5" />, title: t("how_3_title"), desc: t("how_3_desc") },
  ];
  return (
    <div>
      <h2 className="text-3xl font-bold text-center mb-8">{t("how_title")}</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {steps.map((s, i) => (
          <Card key={i} className="p-6 bg-card/60 backdrop-blur border-border">
            <div className="flex items-center gap-2 text-primary mb-3">
              <div className="rounded-full bg-primary/10 p-2">{s.icon}</div>
              <span className="mono text-xs">STEP 0{i + 1}</span>
            </div>
            <h3 className="font-semibold mb-1">{s.title}</h3>
            <p className="text-sm text-muted-foreground">{s.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
