
## Objetivo
Criar o produto "VoxAffirm Pro" no Stripe com 3 preços mensais (BRL, USD, EUR), armazenar os price IDs nos secrets e confirmar o roteamento por idioma no checkout.

## Passos

1. **Criar produto + preço BRL** via `stripe--create_stripe_product_and_price`:
   - `product_name`: "VoxAffirm Pro"
   - `product_description`: "Assinatura mensal — áudios subliminares ilimitados, 120 min, downloads e prioridade."
   - `price_amount`: 1990, `price_currency`: "brl", `recurring_interval`: "month"

2. **Criar preço USD** (mesmo produto, mas a tool cria produto novo por chamada — aceito, ou uso `stripe_api_write` para adicionar preços ao produto existente reaproveitando `product` id). Preferência: usar `stripe--stripe_api_write` (`PostPrices`) para criar os preços USD e EUR anexados ao mesmo `product` retornado no passo 1, evitando produtos duplicados. `unit_amount: 1990`, `currency: usd|eur`, `recurring[interval]: month`.

3. **Armazenar secrets** via `secrets--set_secret`:
   - `STRIPE_PRICE_BRL` = price_... (BRL)
   - `STRIPE_PRICE_USD` = price_... (USD)
   - `STRIPE_PRICE_EUR` = price_... (EUR)

4. **Verificar roteamento por idioma**: `src/lib/translations.ts` já mapeia PT→BRL, EN→USD, ES→EUR (`STRIPE_PRICE_KEY_BY_LANG`), e `src/routes/api/public/stripe/checkout.ts` já seleciona o price pela moeda recebida e aplica `trial_period_days: 7`. Nada a alterar no código — apenas confirmar que o componente que chama o checkout envia `currency` derivado do idioma atual. Se não estiver, ajusto o call site do botão "Assinar Pro" para passar `currency: STRIPE_PRICE_KEY_BY_LANG[lang]`.

5. **Solicitar `STRIPE_WEBHOOK_SECRET`** (via `add_secret`) se ainda não configurado, para o webhook funcionar em produção. `APP_URL` é opcional (fallback usa `request.url`).

## Observações
- Trial de 7 dias já está aplicado no handler de checkout — não precisa configurar no Stripe.
- Um único produto com 3 preços é o padrão para multi-moeda; o Checkout usa o price passado por moeda detectada.
