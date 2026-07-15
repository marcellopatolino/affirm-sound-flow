import { useTranslation } from "react-i18next";
import { LANGS, type Lang } from "@/lib/translations";

export function LanguageSelector() {
  const { i18n } = useTranslation();
  const current = (i18n.language?.slice(0, 2) as Lang) ?? "pt";
  return (
    <div className="inline-flex rounded-md border border-border bg-secondary/60 p-0.5 mono text-xs">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => {
            i18n.changeLanguage(l);
            try { localStorage.setItem("voxaffirm_lang", l); } catch {}
          }}
          className={
            "px-2.5 py-1 rounded-sm uppercase transition " +
            (current === l
              ? "gold-gradient text-primary-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          {l}
        </button>
      ))}
    </div>
  );
}