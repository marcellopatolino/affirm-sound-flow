## Migração para o seu Supabase próprio

Você quer sair do Lovable Cloud (Supabase gerenciado) e usar o projeto Supabase que você criou (`slrffcmquymrwidfzfft`). Antes de qualquer coisa, um aviso crítico e depois o plano.

### AÇÃO URGENTE ANTES DE COMEÇAR

Você colou a `sb_secret_` no chat. Essa chave está comprometida. **Vá ao dashboard do seu Supabase → Settings → API → Rotate `secret` key AGORA.** Só me passe a nova depois via `add_secret` (form seguro), nunca colada no chat.

### Realidade da migração

- Lovable Cloud não é "desconectável" deste projeto pela UI. O que dá para fazer é **sobrescrever a camada de integração** (`.env` + arquivos em `src/integrations/supabase/`) para apontar para o seu Supabase. O Cloud vira um backend órfão (você pode ignorar / pausar depois).
- Todo o schema atual (`profiles`, `library`, `pro_codes`, `custom_sounds`, `user_roles`, function `has_role`, `handle_new_user`, `set_updated_at`, RLS, grants) precisa ser recriado no seu Supabase — o seu projeto está vazio.
- Dados existentes no Cloud (se houver contas de teste, biblioteca, códigos pro) **não vêm junto** a menos que você exporte manualmente. Assumo que é reset limpo — me diga se não for.
- Secrets do Stripe (`STRIPE_SECRET_KEY`, `STRIPE_PRICE_BRL/USD/EUR`) e `LOVABLE_API_KEY` continuam no ambiente do Lovable e seguem funcionando. Só a camada Supabase muda.

### Passos do plano

1. **Você rotaciona a secret key** no dashboard Supabase e me confirma quando estiver pronto.
2. **Salvar as novas credenciais** via `add_secret` (form seguro), nomes:
   - `SUPABASE_URL` = `https://slrffcmquymrwidfzfft.supabase.co`
   - `SUPABASE_PUBLISHABLE_KEY` = a `sb_publishable_...` (essa pode ir no `.env` também, é pública)
   - `SUPABASE_SERVICE_ROLE_KEY` = a nova `sb_secret_...` (depois de rotacionada)
3. **Recriar schema no seu Supabase.** Como as ferramentas de migration do Lovable escrevem no Cloud, eu vou gerar um único arquivo SQL (`supabase/migrations/0001_init.sql`) com tudo — tabelas, enum `app_role`, functions, triggers, RLS, GRANTs — para você **rodar manualmente** no SQL Editor do seu Supabase.
4. **Reescrever `src/integrations/supabase/client.ts`, `client.server.ts`, `auth-middleware.ts`, `auth-attacher.ts`** para ler as novas variáveis (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` no browser; `process.env.SUPABASE_*` no server). Esses arquivos hoje são auto-gerados pelo Cloud; passam a ser "manuais".
5. **Atualizar `.env`** com `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` apontando para o seu projeto.
6. **Regenerar `src/integrations/supabase/types.ts`** — vou gerar tipos básicos manuais espelhando as tabelas do passo 3 (o gerador oficial requer CLI local; posso deixar um `types.ts` funcional).
7. **Configurar Auth no seu Supabase (você faz no dashboard):**
   - Email/password on, "Confirm email" off se quiser skip de confirmação.
   - Google provider (Client ID/Secret) — precisa habilitar no dashboard, não dá pra automatizar sem tools do Cloud.
   - Trigger `on_auth_user_created → handle_new_user` incluído no SQL do passo 3.
8. **Webhook do Stripe** — a URL do webhook (`/api/public/stripe/webhook`) continua a mesma; só precisa garantir que ele grava em `pro_codes` no novo banco (já usa o client server).
9. **Validar:** build, sign-up de teste, geração de áudio, checkout Stripe fake, admin.

### Riscos / trade-offs

- Perde as tools do Lovable (`supabase--migration`, `supabase--insert`, `supabase--linter`, painel Cloud interno). Toda mudança futura de schema você faz colando SQL no dashboard do seu Supabase, e eu escrevo o SQL.
- Perde o painel "Users" e "Storage" integrado do Cloud — usa o dashboard do Supabase direto.
- Se o build falhar por algum arquivo auto-gerado ser regenerado pelo Cloud sobrescrevendo o meu, aviso e ajustamos.

### Confirme para eu prosseguir

Se estiver ok com esse caminho, responda com:
1. "rotacionei" (depois de trocar a secret key no dashboard), e
2. Se quer que eu inclua um seed de dados de exemplo ou não.

Aí eu implemento os passos 3–6 de uma vez.
