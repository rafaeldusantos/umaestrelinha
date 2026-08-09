# 18 — Validação

**Veredito: PASS.** 8 requisitos (DSC-01..DSC-08), 44 critérios, todos com evidência em teste.

Passe de verificação **standalone** (sem sub-agente): checagem ancorada na spec + sensor de
discriminação, rodados depois da última task e antes do commit.

## Cobertura por requisito

| Req | Evidência | Onde |
|---|---|---|
| DSC-01 | tela sem `Dialog`, edição pelo `id` da URL, "não encontrada" sem formulário, navegação nas duas pontas, save/erro | `AdminPromotionFormPage.test.tsx` (49) + `AdminPromotionsPage.test.tsx` (43) |
| DSC-02 | cards do board, `free_shipping` ⇒ valor 0, código curto recusado, maiúsculas, desfecho do save | `AdminCouponFormPage.test.tsx` (26) |
| DSC-03 | trilha, título, selo só com `isDirty`, `⌘S`/`Ctrl+S` com `preventDefault`, `saving` desabilita | `FormPageHeader.test.tsx` (9) + as duas suítes de página |
| DSC-04 | duas faixas, os três cards + os três do aside, frase da maior faixa, contagem de elegíveis | `AdminPromotionFormPage.test.tsx` |
| DSC-05 | sem `input[type=date]`, mês em português, `dd/MM/yyyy`, limpar ⇒ nulo, ida-e-volta do dia | `DateField.test.tsx` (6) + `dateOnly.test.ts` (7) + as duas suítes de página |
| DSC-06 | `Vigência` com as quatro saídas, quatro status com paletas distintas, teto em âmbar, os três cartões, ordem das ações | `AdminCouponsPage.test.tsx` (18) + `couponStatus.test.ts` (11) + `vigencia.test.ts` (4) |
| DSC-07 | pausa/reativa, patch exatamente `{ id, active }`, botão segue a coluna, falha avisa | `AdminCouponsPage.test.tsx` |
| DSC-08 | `?from=` copia tudo menos código, código focado, nasce pausada, original intocado, código repetido preserva o preenchido | `AdminCouponFormPage.test.tsx` + `schema.test.ts` (10) |

## Checagem ancorada na spec

Duas ACs foram **emendadas durante a execução**, as duas por imprecisão da spec e não por dificuldade
de implementar. Ambas estão marcadas no `spec.md`, com o motivo:

- **DSC-05 AC 5** exigia preservar o dia "inclusive quando gravado como meia-noite UTC". Não existe
  valor assim no projeto, e um `timestamptz` em `00:00Z` **é** 21:00 do dia anterior em São Paulo —
  exibir o dia anterior seria o correto para o tipo da coluna. A AC passou a exigir o que era o defeito
  de verdade: **um** tradutor dia ⇄ ISO, no lugar dos dois discordantes que existiam.
- **DSC-04 AC 3** dizia "a última faixa preenchida". Passou a ser "a faixa de maior quantidade": a
  posição da linha não é informação — o repetidor não obriga a preencher em ordem.

Nenhuma AC foi enfraquecida para caber no código, e nenhum teste foi removido: os 35 do
`PromotionFormDialog.test.tsx` foram migrados um a um para a suíte da página.

## Sensor de discriminação — 8 mutações, 8 mortas

Defeitos de **comportamento** injetados em cópia de trabalho, com os arquivos restaurados depois. Cada
mutação foi mapeada ao teste que a matou.

| # | Mutação | Morta por |
|---|---|---|
| M1 | `couponStatus`: `!active` deixa de vencer `expired` | `couponStatus.test.ts` — "desligado vence expirado e esgotado" |
| M2 | `couponStats`: cartão de ativos volta a contar `coupon.active` cru | `couponStatus.test.ts` + `AdminCouponsPage.test.tsx` — "não conta a coluna `active` crua" |
| M3 | `couponCopyValues`: a cópia leva o código do original | `schema.test.ts` "NÃO copia o código" + `AdminCouponFormPage.test.tsx` |
| M4 | `validityLabel`: vazio volta a dizer "Sem prazo" | 4 de `vigencia.test.ts` + `AdminCouponsPage.test.tsx` |
| M5 | `PromotionShowcaseCard`: mostra a MENOR faixa | 2 de `AdminPromotionFormPage.test.tsx` |
| M6 | `dateFromDateOnly`: volta a `new Date('2026-08-31')` | 5 de `dateOnly.test.ts` + o calendário nas duas páginas |
| M7 | `FormPageHeader`: sem `preventDefault` no `⌘S` | `FormPageHeader.test.tsx` — "impede o salvar página" |
| M8 | pausar cupom passa a mandar `code` junto | `AdminCouponsPage.test.tsx` — "`active: false` e só isso" |

**Uma observação honesta sobre o alcance do sensor.** Sob M6, `DateField.test.tsx` continuou passando —
a exibição vem de `formatDateOnly` (por string) e o mês de dezembro continua sendo dezembro mesmo com o
deslocamento de um dia. Quem mata M6 é o teste de módulo. Está registrado porque significa que o teste
de componente **não** cobre a construção do `Date`; se `dateOnly.test.ts` for apagado, o defeito volta
sem ninguém notar.

## Gate medido

`npx turbo test --force --concurrency=1`: core **759** · store **841** · backoffice **1102** ·
functions **251** = **2953** (+105 desde a 17), exit 0.
`npx eslint .` no backoffice: **28 err / 7 warn** = baseline exata.
`npx tsc --noEmit -p apps/backoffice/tsconfig.app.json`: **0**.

**Duas falhas móveis descartadas como contenção de CPU**, não regressão: `npx turbo test --force`
**sem** `--concurrency=1` falhou em `AdminProductsPage` (pré-existente) e no primeiro teste de
`AdminPromotionFormPage`; os dois passaram isolados, juntos, e na suíte inteira do app. Quatro pacotes
de vitest jsdom disputando a máquina estouram o timeout de 5s de um render que leva ~500ms.

## Escopo declarado como fora, e por quê

- **`BL-004`** — a vigência morre à meia-noite do dia prometido. Semântica de cobrança em dois
  leitores; AC e teste próprios nas duas pontas.
- Ações em lote e o `⋯` no lugar da fila de quatro ícones.
- `useSetKitShowcase` segue sem consumidor de UI.
