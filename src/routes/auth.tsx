import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { VoxLogo } from "@/components/vox-logo";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — VoxAffirm" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/" });
    });
  }, [navigate]);

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(t("auth_error"));
    navigate({ to: "/" });
  }
  async function signUp() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(t("auth_signup_success"));
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md p-8 bg-card/80 backdrop-blur">
        <div className="flex flex-col items-center mb-6">
          <VoxLogo size={56} />
          <h1 className="text-2xl font-bold mt-3">{t("auth_title")}</h1>
        </div>
        <Tabs defaultValue="signin">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="signin">{t("auth_tab_signin")}</TabsTrigger>
            <TabsTrigger value="signup">{t("auth_tab_signup")}</TabsTrigger>
          </TabsList>
          <TabsContent value="signin" className="space-y-3 pt-4">
            <Input placeholder={t("auth_email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input placeholder={t("auth_password")} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button className="w-full gold-gradient text-primary-foreground" onClick={signIn} disabled={loading}>
              {t("auth_submit_signin")}
            </Button>
          </TabsContent>
          <TabsContent value="signup" className="space-y-3 pt-4">
            <Input placeholder={t("auth_email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input placeholder={t("auth_password")} type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} />
            <Button className="w-full gold-gradient text-primary-foreground" onClick={signUp} disabled={loading}>
              {t("auth_submit_signup")}
            </Button>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}