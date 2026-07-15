import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listLibrary, deleteLibraryItem } from "@/lib/library.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({ meta: [{ title: "Biblioteca — VoxAffirm" }] }),
  component: LibraryPage,
});

type Item = {
  id: string;
  name: string;
  affirmations: unknown;
  sound: string;
  frequency: number;
  format: string;
  duration: number;
  created_at: string;
};

function LibraryPage() {
  const { t } = useTranslation();
  const listFn = useServerFn(listLibrary);
  const delFn = useServerFn(deleteLibraryItem);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    listFn().then((rows) => setItems(rows as Item[])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function handleDelete(id: string) {
    if (!confirm(t("library_confirm_delete"))) return;
    try {
      await delFn({ data: { id } });
      setItems(items.filter((it) => it.id !== id));
      toast.success("OK");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">{t("library_title")}</h1>
      {loading ? (
        <p className="text-muted-foreground">…</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">{t("library_empty")}</p>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <Card key={it.id} className="p-4 bg-card/70 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{it.name}</div>
                <div className="mono text-xs text-muted-foreground mt-1">
                  {it.sound} · {it.frequency}Hz · {it.format} · {it.duration}min
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(it.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}