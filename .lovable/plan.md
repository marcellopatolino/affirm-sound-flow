
# VoxAffirm — Plano de construção

App em TanStack Start + Lovable Cloud (Supabase) + Lovable AI (TTS). Preto/dourado, i18n PT/ES/EN, mixer de áudio ao vivo via Web Audio API, assinatura Stripe com trial de 7 dias.

## 1. Fundação (design + i18n + layout)

- Tokens em `src/styles.css`: `--background #0a0a12`, `--primary` dourado `#DDB04A`, `--primary-glow #F1D582`, `--foreground #F5F5F5`. Gradientes e sombras suaves.
- Fontes via `<link>` no `__root.tsx`: Poppins (600–800) e JetBrains Mono.
- i18n com `i18next` + `react-i18next` (PT default, ES, EN). Seletor no header persiste em `localStorage`.
- `__root.tsx`: head SEO real ("VoxAffirm — Áudios Subliminares Personalizados"), header com logo (SVG "V" dourado gerado), seletor de idioma, botão Entrar/nome do usuário + selo PRO.

## 2. Ativar Lovable Cloud + schema

Migração única com:
- `profiles(user_id pk → auth.users, plan text default 'free', created_at)`
- `library(id, user_id, name, affirmations jsonb, sound, frequency int, format, voice_vol int, bg_vol int, freq_vol int, duration int, created_at)`
- `pro_codes(id, code unique, email, stripe_session_id unique, stripe_customer_id, stripe_subscription_id, payment_type, status, created_at)`
- `custom_sounds(id, name, url, created_at)`
- `user_roles` + enum `app_role('admin','user')` + função `has_role` (SECURITY DEFINER).
- Trigger `handle_new_user` cria profile no signup.
- GRANTs por tabela + RLS. Policies: usuário lê/escreve só o próprio profile e library; `pro_codes` só via service_role; `custom_sounds` leitura pública, escrita só admin.

## 3. Auth

- Rotas públicas `/auth` (tabs Entrar/Criar conta, email+senha, min 6 chars, `emailRedirectTo: origin`).
- Layout `_authenticated` gerenciado para rotas protegidas (`/library`, `/thanks`).
- Gerador (`/`) fica **público** — permite testar sem login, mas gravar na biblioteca e baixar exige login/PRO.

## 4. Gerador + Mixer ao vivo (núcleo — Web Audio API)

Rota `/generator` (ou integrada em `/`). Componentes:

- **Entrada de afirmações**: modo Digitar (lista dinâmica com "+ adicionar") ou Gravar (MediaRecorder). Contador de chars, botão "colar bloco".
- **Configurações**: selects para som de fundo (6 opções), formato (whisper/normal/accelerated), frequência (432/528/639/741/852/963 Hz). Sliders: voz (45%), fundo (70%), freq (20%), duração (min).
- **Botão Gerar áudio** → pré-baixa TTS de todas as frases (cache por sessão), constrói o grafo Web Audio e inicia loop.
- **Player**: visualizador de barras (AnalyserNode), play/pause (`ctx.suspend/resume`), progresso, tempo, botão Baixar.

Grafo (`useAudioMixer` hook):
```
bgSource (loop mp3) → bgGain ────┐
oscillator (sine, Hz) → oscGain ─┼→ masterGain (0.85) → destination
voiceQueue (buffers)  → voiceGain → whisperHighpass (200Hz, bypass se !whisper) ─┘
```

Regras:
- Sliders alteram `.gain.value` em tempo real.
- Trocar Hz → `oscillator.frequency.setValueAtTime()`.
- Trocar fundo → parar `bgSource`, criar novo com buffer trocado.
- Trocar formato → aplica `playbackRate` (1.0 / 2.0) nas próximas frases e liga/desliga highpass.
- Voz em loop sequencial das frases, uma após a outra com pequena pausa.
- **Download**: recria o grafo em `OfflineAudioContext` com estado atual, `startRendering()` → WAV encode (helper `audiobuffer-to-wav`).

## 5. TTS (Lovable AI)

Server function `synthesizeSpeech` em `src/lib/tts.functions.ts`:
- Input: `{ text, lang }` validado com Zod.
- Chama `https://ai.gateway.lovable.dev/v1/audio/speech` com `openai/gpt-4o-mini-tts`, `voice: "shimmer"` (feminina), `response_format: "mp3"`, `stream_format: "audio"` (arquivo pronto — mais simples para bufferizar).
- Retorna base64 do MP3.
- Cliente decodifica com `audioContext.decodeAudioData` e cacheia em `Map<hash, AudioBuffer>`.
- Chunking automático para frases longas (>400 chars).

## 6. Biblioteca

Rota `/library` (protegida). Auto-salva cada geração (server fn `saveLibraryItem` com `requireSupabaseAuth`). Lista com abrir (carrega preset no gerador via query params), renomear, excluir.

## 7. Stripe (assinatura + trial 7 dias)

Server routes públicas em `src/routes/api/public/`:
- `POST /api/public/stripe/checkout` — cria Checkout Session (subscription, `trial_period_days: 7`, price por moeda detectada pelo idioma), retorna URL.
- `POST /api/public/stripe/webhook` — verifica assinatura HMAC, em `checkout.session.completed` gera código Pro (`nanoid`) e insere em `pro_codes` via `supabaseAdmin`; em `customer.subscription.deleted` / `invoice.payment_failed` marca `revoked`.
- Server fns: `getCodeBySession({ session_id })`, `verifyCode({ code })` — se válido, promove `profiles.plan='pro'` do usuário atual.

Secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BRL`, `STRIPE_PRICE_USD`, `STRIPE_PRICE_EUR`, `APP_URL` (solicitados via `add_secret` no fim da build).

## 8. Tela Obrigado + limites grátis

- `/thanks?session_id=...` mostra código, botão "Ativar Pro agora" (chama `verifyCode`), opção "reenviar por e-mail".
- **Limites free** (enforce no client + server):
  - máx 5 afirmações, 500 chars total, duração ≤ 2 min, 1 áudio salvo total, download bloqueado (abre paywall).
- **Pro**: 120 min, ilimitado, download liberado.

## 9. Admin oculto

- Acesso via hash `#admin-x9k2-control` ou atalho `Ctrl+Shift+A` (listener global no `__root.tsx`).
- Rota `_authenticated/admin.tsx` gated por `has_role(user, 'admin')`.
- Abas: configurações Stripe (leitura de secrets configurados), lista usuários, upload custom_sounds, edição de textos.

## 10. Assets

- 6 MP3s de fundo: placeholders programáticos (gerados on-the-fly via `AudioBuffer` com ruído colorido) até o usuário subir os reais.
- Logo "V" dourado: gerada com imagegen (premium, transparente).
- Afirmações por tema (Prosperidade, Pele, Saúde, Amor, Foco) em PT/ES/EN em JSON estático.

## Detalhes técnicos

- **Stack**: TanStack Start v1, React 19, Tailwind v4, Supabase (Lovable Cloud), Lovable AI Gateway, Stripe.
- **Rotas**: `/` (landing+gerador), `/auth`, `/_authenticated/library`, `/_authenticated/thanks`, `/_authenticated/admin`, `/api/public/stripe/*`.
- **Estado do mixer**: hook `useAudioMixer` com refs (nunca no state React para evitar re-render).
- **Download WAV**: dependência `audiobuffer-to-wav`.
- **i18n**: `i18next` + `i18next-browser-languagedetector`.
- **Segurança**: RLS em tudo, service_role só em webhooks/admin server-side, papéis em tabela separada.

## Ordem de execução

1. Ativar Lovable Cloud + migração schema.
2. Design system + i18n + landing.
3. Auth + rotas protegidas.
4. Mixer ao vivo + TTS (Lovable AI) — parte mais longa.
5. Biblioteca.
6. Stripe (checkout + webhook + código Pro) + limites free.
7. Tela obrigado.
8. Admin oculto.
9. Solicitar secrets Stripe ao usuário.
