import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Users, Ticket, BarChart3, Music, Trash2, Crown, Shield } from "lucide-react";
import {
  adminGetStats, adminListUsers, adminSetPlan, adminBanUser,
  adminListCoupons, adminCreateCoupon, adminDeleteCoupon,
} from "@/lib/admin.functions";

const ADMIN_EMAIL = "brcreativehouse@gmail.com";

export function AdminPanel({ userEmail }: { userEmail?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.altKey && !["Control", "Shift", "Alt"].includes(e.key)) {
        if (userEmail !== ADMIN_EMAIL) { toast.error("Acesso negado"); return; }
        setOpen(prev => !prev);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [userEmail]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Painel Admin — VoxAffirm
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="stats" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="stats"><BarChart3 className="h-4 w-4 mr-1" />Stats</TabsTrigger>
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" />Usuários</TabsTrigger>
            <TabsTrigger value="coupons"><Ticket className="h-4 w-4 mr-1" />Cupons</TabsTrigger>
            <TabsTrigger value="audios"><Music className="h-4 w-4 mr-1" />Áudios</TabsTrigger>
          </TabsList>
          <div className="flex-1 overflow-y-auto mt-4 space-y-4">
            <TabsContent value="stats"><StatsTab /></TabsContent>
            <TabsContent value="users"><UsersTab /></TabsContent>
            <TabsContent value="coupons"><CouponsTab /></TabsContent>
            <TabsContent value="audios"><AudiosTab /></TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ── STATS ──────────────────────────────────────────────
function StatsTab() {
  const getStatsFn = useServerFn(adminGetStats);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    getStatsFn({}).then(r => { if (r.ok) setStats(r.stats); });
  }, []);

  if (!stats) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="grid grid-cols-2 gap-4">
      <StatCard label="Total de usuários" value={stats.totalUsers} />
      <StatCard label="Usuários Pro" value={stats.proUsers} color="text-yellow-500" />
      <StatCard label="Áudios gerados" value={stats.totalItems} />
      <StatCard label="Cupons disponíveis" value={stats.activeCoupons} />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color ?? ""}`}>{value}</p>
    </Card>
  );
}

// ── USERS ──────────────────────────────────────────────
function UsersTab() {
  const listFn = useServerFn(adminListUsers);
  const setPlanFn = useServerFn(adminSetPlan);
  const banFn = useServerFn(adminBanUser);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => listFn({}).then(r => { if (r.ok) setUsers(r.users); setLoading(false); });
  useEffect(() => { load(); }, []);

  const setPlan = async (userId: string, plan: "free" | "pro") => {
    const r = await setPlanFn({ data: { userId, plan } });
    if (r.ok) { toast.success("Plano atualizado"); load(); }
    else toast.error(r.error);
  };

  const ban = async (userId: string, email: string) => {
    if (!confirm(`Banir ${email}?`)) return;
    const r = await banFn({ data: { userId } });
    if (r.ok) { toast.success("Usuário banido"); load(); }
    else toast.error(r.error);
  };

  const filtered = users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-3">
      <Input placeholder="Buscar por email..." value={search} onChange={e => setSearch(e.target.value)} />
      <p className="text-xs text-muted-foreground">{filtered.length} usuários</p>
      <div className="space-y-2">
        {filtered.map(u => (
          <div key={u.id} className="flex items-center gap-2 p-3 rounded-lg border bg-card">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{u.email}</p>
              <p className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString("pt-BR")}</p>
            </div>
            <Badge variant={u.plan === "pro" ? "default" : "secondary"}>{u.plan}</Badge>
            {u.plan === "free"
              ? <Button size="sm" variant="outline" onClick={() => setPlan(u.id, "pro")}><Crown className="h-3 w-3 mr-1" />Pro</Button>
              : <Button size="sm" variant="outline" onClick={() => setPlan(u.id, "free")}>Free</Button>
            }
            <Button size="sm" variant="destructive" onClick={() => ban(u.id, u.email)}><Shield className="h-3 w-3" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── COUPONS ────────────────────────────────────────────
function CouponsTab() {
  const listFn = useServerFn(adminListCoupons);
  const createFn = useServerFn(adminCreateCoupon);
  const deleteFn = useServerFn(adminDeleteCoupon);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [code, setCode] = useState("");
  const [maxUses, setMaxUses] = useState("1");
  const [expiresAt, setExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);

  const load = () => listFn({}).then(r => { if (r.ok) setCoupons(r.coupons); });
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!code.trim()) return toast.error("Digite um código");
    setCreating(true);
    const r = await createFn({ data: { code: code.trim(), maxUses: Number(maxUses), expiresAt: expiresAt || undefined } });
    setCreating(false);
    if (r.ok) { toast.success("Cupom criado!"); setCode(""); setMaxUses("1"); setExpiresAt(""); load(); }
    else toast.error(r.error);
  };

  const remove = async (c: string) => {
    if (!confirm(`Excluir cupom ${c}?`)) return;
    const r = await deleteFn({ data: { code: c } });
    if (r.ok) { toast.success("Cupom excluído"); load(); }
    else toast.error(r.error);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <p className="text-sm font-medium">Criar novo cupom</p>
        <div className="grid grid-cols-3 gap-2">
          <Input placeholder="CODIGO" value={code} onChange={e => setCode(e.target.value.toUpperCase())} className="mono" />
          <Input type="number" placeholder="Usos máx." value={maxUses} onChange={e => setMaxUses(e.target.value)} min={1} />
          <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
        </div>
        <Button onClick={create} disabled={creating} className="w-full gold-gradient text-primary-foreground">
          {creating ? "Criando..." : "Criar cupom"}
        </Button>
      </Card>
      <div className="space-y-2">
        {coupons.map(c => (
          <div key={c.code} className="flex items-center gap-2 p-3 rounded-lg border bg-card">
            <p className="mono text-sm font-medium flex-1">{c.code}</p>
            <span className="text-xs text-muted-foreground">
              {c.used_by ? "Usado" : `${c.max_uses ?? "∞"} uso(s)`}
            </span>
            {c.expires_at && <span className="text-xs text-muted-foreground">Exp: {new Date(c.expires_at).toLocaleDateString("pt-BR")}</span>}
            <Badge variant={c.used_by ? "secondary" : "default"}>{c.used_by ? "usado" : "ativo"}</Badge>
            <Button size="icon" variant="ghost" onClick={() => remove(c.code)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
        {coupons.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum cupom criado</p>}
      </div>
    </div>
  );
}

// ── AUDIOS ─────────────────────────────────────────────
function AudiosTab() {
  const sounds = ["rain", "ocean", "forest", "wind", "fire", "white_noise"];
  const frequencies = [432, 528, 639, 741, 852, 963];

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-2">
        <p className="text-sm font-medium">Sons de fundo ativos</p>
        <div className="flex flex-wrap gap-2">
          {sounds.map(s => <Badge key={s} variant="outline">{s}</Badge>)}
        </div>
      </Card>
      <Card className="p-4 space-y-2">
        <p className="text-sm font-medium">Frequências ativas</p>
        <div className="flex flex-wrap gap-2">
          {frequencies.map(f => <Badge key={f} variant="outline">{f} Hz</Badge>)}
        </div>
      </Card>
      <p className="text-xs text-muted-foreground">Para adicionar novos sons ou frequências, edite os arquivos <code>src/lib/background-sounds.ts</code> e <code>src/components/generator.tsx</code>.</p>
    </div>
  );
}
