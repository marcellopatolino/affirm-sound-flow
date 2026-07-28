## Situação atual

`src/routes/__root.tsx` está malformado: a função `RootShell` não fecha, `RootComponent` aparece duplicado e a estrutura `<html>/<head>` está incompleta. Isso gera `SyntaxError` e o build não passa. Não dá para puxar alterações do GitHub enquanto o projeto local não buildar.

## Plano

1. **Reconstruir `src/routes/__root.tsx` de forma limpa**
   - Definir `RootShell` corretamente: `<html>`, `<head>`, `<HeadContent />`, `<Scripts />`, `<body>{children}</body>`.
   - Definir `RootComponent` apenas uma vez, com `QueryClientProvider`, `Header`, `Outlet`, `Toaster` e `AdminPanelWrapper`.
   - Manter `Header`, `NotFoundComponent` e `ErrorComponent` intocados.

2. **Verificar o build**
   - Rodar `build:dev` e garantir que o `SyntaxError` em `__root.tsx` desaparece.
   - Corrigir qualquer outro erro de compilação que aparecer em sequência.

3. **Puxar/atualizar alterações do GitHub**
   - Como o Lovable sincroniza com GitHub em dois sentidos, após o build estar OK, validar se o arquivo no GitHub contém a mesma versão corrigida ou se há commits posteriores que precisam ser aplicados.
   - Resolver conflitos simples se o GitHub tiver mudanças conflitantes em `__root.tsx` ou arquivos relacionados.

4. **Testar o preview**
   - Acessar a página inicial e verificar que o header, seletor de idioma e roteamento continuam funcionando.

## O que eu preciso confirmar

- Você quer que eu **sobrescreva o `__root.tsx` local com a versão corrigida** primeiro, e depois sincronizemos com o GitHub?
- Ou você acredita que o GitHub já tem uma versão correta e quer que eu **tente puxar diretamente**, mesmo que isso possa trazer o mesmo arquivo quebrado de volta?