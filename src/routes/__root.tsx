import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { initI18n } from "../lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { VoxLogo } from "@/components/vox-logo";
import { AdminPanel } from "@/components/admin-panel";
import { LanguageSelector } from "@/components/language-selector";

initI18n();

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "VoxAffirm — Áudios Subliminares Personalizados" },
      { name: "description", content: "Crie áudios subliminares com afirmações, sons ambientes e frequências. Mixe ao vivo e baixe. Sua mente. Seu controle." },
      { name: "author", content: "VoxAffirm" },
      { property: "og:title", content: "VoxAffirm — Áudios Subliminares Personalizados" },
      { property: "og:description", content: "Sua mente. Seu controle. Áudios subliminares personalizados baseados em neuroplasticidade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Header />
      <Outlet />
      <Toaster theme="dark" position="top-center" richColors />
      <AdminPanelWrapper />
    </QueryClientProvider>
  );
}

function AdminPanelWrapper() {
  const [email, setEmail] = useState<string | undefined>();
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? undefined));
  }, []);
  return <AdminPanel userEmail={email} />;
}
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Header />
      <Outlet />
      <Toaster theme="dark" position="top-center" richColors />
    </QueryClientProvider>
  );
}

function Header() {
  const { t } = useTranslation();
  const [email, setEmail] = useState<string | null>(null);
  const [plan, setPlan] = useState<"free" | "pro">("free");

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setEmail(data.user?.email ?? null);
      if (data.user) {
        supabase.from("profiles").select("plan").eq("user_id", data.user.id).maybeSingle()
          .then(({ data: p }) => { if (mounted && p?.plan) setPlan(p.plan as "free" | "pro"); });
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setEmail(session?.user?.email ?? null);
      }
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <VoxLogo size={36} />
          <span className="text-lg font-bold gold-text tracking-tight">VoxAffirm</span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <LanguageSelector />
          {email ? (
            <>
              <Link to="/library" className="text-sm text-muted-foreground hover:text-foreground">
                {t("nav_library")}
              </Link>
              {plan === "pro" && (
                <span className="mono text-xs px-2 py-0.5 rounded gold-gradient text-primary-foreground font-semibold">
                  {t("pro_badge")}
                </span>
              )}
              <button onClick={signOut} className="text-sm text-muted-foreground hover:text-foreground">
                {t("nav_logout")}
              </button>
            </>
          ) : (
            <Link to="/auth" className="text-sm px-3 py-1.5 rounded-md border border-primary/40 text-primary hover:bg-primary/10">
              {t("nav_login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
