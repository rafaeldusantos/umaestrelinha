# BUG-20261026-idade-da-espera-sem-contexto: "há 10 dias" ao lado dos materiais não diz do quê

- **Status:** verified (retestado em navegador no build servido, 2026-10-27 — reports/2026-10-26-mobile-adm-envelope-da-cliente.md, *Reteste*) — opção 1
- **Impact (user-side):** Friction
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Equipe com TalkBack; Adri no celular
- **Journey Step:** J-registrar-envelope-da-cliente, passo 1
- **Scenarios:** MAD-envelope-varios-materiais-e-espera; MAD-envelope-com-leitor-de-tela
- **Found:** 2026-10-26 · **Report:** reports/2026-10-26-mobile-adm-envelope-da-cliente.md

## Summary

A3 tirou o "parado há" do protótipo e ficou só "há N dias" (cor de alerta no degrau `stale`). Na tela, ele fica
à direita dos chips, logo abaixo de "Pedido feito há N dias" (o mesmo número, duas vezes). Com o código
informado, ele convive com "Informado pela cliente há 2 dias": "Leite materno · há 4 dias" se lê como "o leite
foi enviado há 4 dias". No leitor de tela a árvore é "Mecha de cabelo, Cinzas, há 10 dias" — um número solto.

## Reproduction

- **Charter:** CH-envelope-com-leitor-de-tela · **Tour:** Feature Tour

1. P82-A e P82-B: ler o bloco Material pela árvore de acessibilidade.

## Evidence

- Árvore de P82-A: `list "Materiais do pedido"` … `text: há 10 dias`; de P82-B: "há 4 dias" e "Informado pela cliente há 2 dias".

## Decisão pendente

1. Prefixo curto, visível e lido: "Esperando há 10 dias" (sem "parado", que A3 removeu). Custo: muda a frase de `queueAgeLabel` também no painel, ou uma variante só aqui.
2. Só para leitor de tela (`sr-only` "Esperando o envelope"). Custo: quem vê continua com a ambiguidade.
3. Tirar a idade do bloco, já que a linha de cima diz "Pedido feito há N dias", e deixar só a cor. Custo: perde o realce `stale`.

**Recomendação:** 1 se a Adri aceitar a palavra; senão 2.

## Conserto (2026-10-27, feature `82`, Fase 5, T21)

Opção 1 (recomendação do QA): "Esperando há N dias", visível e lido.

- `packages/core/src/material/envelope.ts`: `materialWaitLabel(age)` ⇒ `Esperando ${queueAgeLabel(age)}`
  ("Esperando há 1 dia", "Esperando há 10 dias"). `queueAgeLabel` INTOCADO (painel e Início continuam com
  "há N dias").
- `apps/mobile-adm/src/widgets/order-detail/ui/MaterialChips.tsx`: usa `materialWaitLabel`; a cor continua
  a mesma régua (`stale` ⇒ `text-estrelinha-wait`, senão `ink-soft`).
- Spec: nota em `ENV-24`.
- Testes novos: core `envelope.test.ts` › "materialWaitLabel (T21)" (0, 1, 3, 5 e 13 dias; a mesma frase
  nos degraus; `queueAgeLabel` intacto); app `envelopeDaCliente.test.tsx` › "aguardando há 1 dia" (singular,
  degrau `fresh`, e o nó do texto é o da idade).
- Vermelho antes do conserto: core 6 (`materialWaitLabel is not a function`), app 4.
- **Asserções antigas alteradas** (`apps/mobile-adm/src/pages/__tests__/envelopeDaCliente.test.tsx`, os
  três degraus): `/^há 3 dias$/` ⇒ `/^Esperando há 3 dias$/` (fresh, `ink-soft`); `/^há 5 dias$/` ⇒
  `/^Esperando há 5 dias$/` (warm, `ink-soft`); `/^há 13 dias$/` ⇒ `/^Esperando há 13 dias$/` (stale,
  `wait`). As asserções de cor e de degrau ficaram iguais.
- Sensores: M21a os chips voltam ao "há N dias" ⇒ app 4 reprovam; M21b `materialWaitLabel` sem
  "Esperando" ⇒ core 5. Por asserção; SHA-256 restaurado.
- Não medido (jsdom): o texto mais longo é `whitespace-nowrap` ao lado dos chips — conferir em 390 e com
  fonte a 130/200 % no reteste.

## Reteste (2026-10-27) — passou

- **Ambiente:** build servido (`vite preview` :4582, bundle `index-D3v4wZjc.js` conferido), Supabase local real, `functions serve` com a chave do Resend inválida, conta `adri.qa`, 390×844 toque; fixturas P82-A..G (`fixturas.sql` + as duas da sessão de QA), restauradas a cada percurso e apagadas no fim (contagens idênticas às de antes).
"Esperando há 10 dias" (A), "há 5 dias" (G), "há 2 dias" (F), em 360 e 390 × fonte 100/130/200 % (`html { font-size }`): 18/18 com `scrollWidth == innerWidth`, o texto (`white-space: nowrap`) numa linha, inteiro dentro do bloco (borda direita 295–357 contra 328–374 do bloco) e sem corte. Limite do método: só escala o que é `rem`.
- Evidência: `evidence/2026-10-27-mobile-adm-envelope-da-cliente-reteste/21-360-100-A.png`, `21-360-200-A.png`, `21-390-100-A.png`, `21-390-200-A.png`.
