# LESSONS — auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation — do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 — When migrating admin pages to shadcn tokens, retire only neutral surface/text/border nana-* classes; brand-accent hues have no shadcn equivalent and stay as accents.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `backoffice` · harmful: 0
- features: backoffice-ui-standardization
- evidence: MIG-06 — AdminDashboard.tsx:17, AdminOrdersPage.tsx:43 (backoffice)
- last seen: 2026-07-28T15:05:24Z

### L-002 — Integration-test the money path with the discount or promotion actually enabled; a fixture with every offer switched off cannot detect a double-applied discount.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `payment` · harmful: 0
- features: 09-checkout-orders-api
- evidence: M6 — handlers.ts:353 (Verifier sensor, validation.md) (payment)
- last seen: 2026-07-28T15:05:38Z

### L-003 — Assert the full payer identity object sent to the payment gateway for every payment method, not only the one where a value is overridden.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `payment` · harmful: 0
- features: 09-checkout-orders-api
- evidence: M9 — handlers.ts:401 (Verifier sensor, validation.md) (payment)
- last seen: 2026-07-28T15:05:38Z

### L-004 — Every guard that returns before an external call needs its own test asserting the status code and zero outbound calls.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `payment` · harmful: 0
- features: 09-checkout-orders-api
- evidence: M10 — handlers.ts:252 (Verifier sensor, validation.md) (payment)
- last seen: 2026-07-28T15:05:38Z

### L-005 — When an acceptance criterion lists several failure conditions that map to different status codes, state which condition wins where two of them overlap.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `payment` · harmful: 0
- features: 09-checkout-orders-api
- evidence: ORD-07 — handlers.ts:449 (Verifier spec-anchored check, validation.md) (payment)
- last seen: 2026-07-28T15:05:39Z

### L-006 — When an acceptance criterion requires a user-facing message, assert the message text for the specific detail value instead of asserting only that a fallback exists.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `payment` · harmful: 0
- features: 09-checkout-orders-api
- evidence: STA-03 — status.ts:84, status.test.ts:135 (Verifier spec-anchored check, validation.md) (payment)
- last seen: 2026-07-28T15:05:39Z

### L-007 — Quando uma regra de dinheiro é DUPLICADA entre loja e servidor (pares de linhas escritas à mão), teste de espelho não protege o servidor: cobrir uma instância (order bump) não cobre a classe (cupom × quantidade, free_shipping). Cada par loja↔servidor precisa de um teste no HANDLER que assevere o valor cobrado, não só um teste da aritmética num módulo que produção não chama nesse caminho.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `packages/core/src/payment, supabase/functions` · harmful: 0
- features: 09-checkout-orders-api
- evidence: V1/V2 @ handlers.ts:312,354 — iteração 2 do Verifier (packages/core/src/payment, supabase/functions)
- last seen: 2026-07-28T16:09:30Z

### L-008 — Quando uma AC lista um item que a tabela Out of Scope da mesma spec exclui, a exclusao explicita vence — implemente o resto, declare a divergencia no codigo e no validation.md, e nao invente a feature excluida.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `.specs/features` · harmful: 0
- features: 12-product-media-studio
- evidence: spec.md P2.4 AC 1 vs Out of Scope (.specs/features)
- last seen: 2026-08-01T21:54:17Z

### L-009 — Quando a spec fixa uma string exata ou uma medida do artboard, assere a frase inteira e a medida — asserir so os fragmentos deixa a copy divergir do desenho sem quebrar teste.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `apps/*/src/**/*.test.tsx` · harmful: 0
- features: 12-product-media-studio
- evidence: spec.md P2.4 AC 6 · P3.1 AC 1 (apps/*/src/**/*.test.tsx)
- last seen: 2026-08-01T21:54:17Z

### L-010 — AC que enumera uma LISTA de acoes ou colunas ('SHALL oferecer A, B, C, D') precisa de um item de verificacao por elemento — implementar a maioria passa no gate e deixa a lacuna invisivel ate alguem usar a tela.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `.specs/features` · harmful: 0
- features: 13-product-bulk-ops
- evidence: PLS-05 AC 1 · PLS-06 AC 6-7 · PLS-07 AC 3 (.specs/features)
- last seen: 2026-08-01T23:07:28Z

### L-011 — Funcao async NUNCA deve devolver um query builder do supabase-js: ele e thenable, a promise o adota, e o chamador recebe o RESULTADO da consulta no lugar do builder. Embrulhe em { builder }.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `apps/**/api` · harmful: 0
- features: 13-product-bulk-ops
- evidence: useAdminProducts.ts buildFilteredQuery (apps/**/api)
- last seen: 2026-08-01T23:07:28Z

### L-012 — Handler entregue a um toast le o estado do render em que o toast foi montado — anterior ao setState que o alimenta. Estado consumido dentro de acao de toast precisa de ref, senao a acao falha calada.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `apps/**/model` · harmful: 0
- features: 13-product-bulk-ops
- evidence: useUndoBuffer.ts take() (apps/**/model)
- last seen: 2026-08-01T23:07:28Z

### L-013 — Fixture em que os dois campos candidatos valem o MESMO número não detecta leitura do campo errado: quando um item tem preço base e preço de variação, o teste precisa fazê-los divergir, e toda superfície que calcula dinheiro precisa ler o mesmo campo.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `packages/core/src/payment, apps/store` · harmful: 0
- features: 17-promocoes-desconto-progressivo
- evidence: apps/store/src/features/checkout/model/useCheckoutTotals.ts:149 (edge case 'preço por variação' da spec) (packages/core/src/payment, apps/store)
- last seen: 2026-08-03T17:27:17Z

### L-014 — AC que descreve uma composição de linhas na tela precisa somar: exibir uma linha de desconto AO LADO de um subtotal já líquido conta o desconto duas vezes para quem lê — confira a aritmética da redação antes de aceitá-la.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `.specs/features` · harmful: 0
- features: 17-promocoes-desconto-progressivo
- evidence: spec.md P1-C AC 1 (redação original) · validation.md gap 2 (.specs/features)
- last seen: 2026-08-03T17:27:17Z

### L-015 — Teste de invariante entre dois lados tem de chamar a MESMA função que produção chama; helper que remonta os passos à mão fica cego assim que a produção passa a ter um ponto único — prove a sensibilidade invertendo a decisão central e vendo o arquivo falhar.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `packages/core/**/__tests__` · harmful: 0
- features: 17-promocoes-desconto-progressivo
- evidence: packages/core/src/payment/__tests__/displayedEqualsCharged.test.ts:66 e :82 · mutação C da pass 1 (packages/core/**/__tests__)
- last seen: 2026-08-03T17:27:17Z

### L-016 — Coluna de FK deliberadamente anulável quando há mais de um candidato não serve de predicado para "houve X neste registro?" — pergunte pelo valor que registra o efeito, não pelo rótulo.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `packages/core/src/hooks` · harmful: 0
- features: 17-promocoes-desconto-progressivo
- evidence: packages/core/src/hooks/usePromotions.ts:377 (packages/core/src/hooks)
- last seen: 2026-08-03T17:27:32Z

### L-017 — Não date um evento específico por updated_at: ele é a última escrita QUALQUER, e datar assim passa a mentir depois da primeira edição não relacionada — sem coluna própria para o evento, mostre o estado e não a data.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `apps/backoffice/src/pages` · harmful: 0
- features: 17-promocoes-desconto-progressivo
- evidence: apps/backoffice/src/pages/admin/AdminPromotionsPage.tsx:245 (apps/backoffice/src/pages)
- last seen: 2026-08-03T17:27:32Z

### L-018 — Índice único PARCIAL não pode ser deferrable (só constraint aceita deferrable, e constraint não aceita where), então "ligar um e desligar o outro" não cabe numa statement: use duas na ordem desliga-antes-de-ligar dentro da transação.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `supabase/migrations` · harmful: 0
- features: 17-promocoes-desconto-progressivo
- evidence: supabase/migrations/20260803130200_promotion-write-rpcs.sql:45 (supabase/migrations)
- last seen: 2026-08-03T17:27:32Z

### L-019 — AC de alvo de toque precisa nascer com recorte. 'Todo alvo de toque >= 44px' junto de 'conforme os artboards' pode ser autocontraditoria: boards de e-commerce desenham discos de card em 36-38px, e a implementacao acaba tendo de escolher entre duas ACs do mesmo spec. Escreva o recorte na propria AC (ex.: 'navegacao primaria e acoes de tela cheia'). Saida intermediaria util quando o conflito ja existe: expandir a area de toque por pseudo-elemento (before:h-11 before:w-11 centrado), que atende a regra sem mudar o tamanho visual que o board pede.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `ui/design-specs` · harmful: 0
- features: 19-identidade-papelaria
- evidence: .specs/features/19-identidade-papelaria/validation.md#4 (ui/design-specs)
- last seen: 2026-08-04T04:08:20Z

### L-020 — tailwind-merge NAO colapsa token custom de raio contra t-shirt size: twMerge('rounded-md','rounded-button') devolve AS DUAS classes. Com as duas no elemento, vence quem o Tailwind emitir por ultimo — que e a ordem das chaves no borderRadius do config. Consequencias: (1) declare o token custom como ULTIMA chave; (2) para sobrescrever o raio de um componente shadcn, prefira criar o proprio componente com o raio na base da cva, ou use valor arbitrario rounded-[14px], que o twMerge reconhece. Vale para qualquer grupo de utilitario com escala custom, nao so raio.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `ui/tailwind` · harmful: 0
- features: 19-identidade-papelaria
- evidence: .specs/features/19-identidade-papelaria/tasks.md#desvios (ui/tailwind)
- last seen: 2026-08-04T04:08:41Z

### L-021 — Teste de varredura de fonte precisa de ANCORA DE CONTAGEM. Um erro de caminho faz a varredura ler zero arquivo e passar em silencio, que e a pior falha possivel nesse tipo de teste — ele vira um no-op verde. Toda varredura desta feature (fieldBorder, buttonShape, paths) comeca com expect(files.length).toBeGreaterThan(N). Segundo detalhe: ao atribuir a tag JSX dona de uma className, ande para tras POR COLUNA e nao por linha — por linha, o rounded-pill de um <span> de badge e atribuido ao <Link> que o envolve (falso positivo real no MegaMenu).
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `testing/sweeps` · harmful: 0
- features: 19-identidade-papelaria
- evidence: .specs/features/19-identidade-papelaria/validation.md#1 (testing/sweeps)
- last seen: 2026-08-04T04:08:41Z

### L-022 — A guard test that measures design-token values must read them from the declared source files, never from a private copy of the same values.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `apps/store/src/shared/lib` · harmful: 0
- features: 20-rebrand-uma-estrelinha
- evidence: validation.md sensor #9 — apps/store/src/shared/lib/__tests__/contrast.test.ts:21 (apps/store/src/shared/lib)
- last seen: 2026-08-09T02:46:06Z

### L-023 — Specify an icon or asset by the measured legibility floor it must meet, not by naming one art variant, or the measurement can disprove the criterion itself.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `design-system` · harmful: 0
- features: 20-rebrand-uma-estrelinha
- evidence: spec.md P2 AC7 (IDN-07) (design-system)
- last seen: 2026-08-09T02:46:14Z

### L-024 — An acceptance criterion that says a screen follows a design board must name the measurable values it fixes, otherwise deliberate divergences cannot be judged.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `design-system` · harmful: 0
- features: 20-rebrand-uma-estrelinha
- evidence: spec.md P2 AC9 (IDN-09) (design-system)
- last seen: 2026-08-09T02:46:15Z

### L-025 — Quando a camada que redireciona nao conhece a arvore de dados, a AC deve dizer 'redireciona para a forma que resolve e declara a canonica', nunca 'redireciona para a canonica'.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `routes` · harmful: 0
- features: 23-urls-e-seo
- evidence: spec.md AC 3c — validation.md nota 1 (routes)
- last seen: 2026-08-09T17:58:55Z

### L-026 — Todo desvio do design, inclusive acrescentar export a um modulo cuja interface o design enumera, leva marcador // SPEC_DEVIATION no codigo — registrar so no handoff nao e rastreavel por grep.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `repo` · harmful: 0
- features: 23-urls-e-seo
- evidence: packages/core/src/routes/routes.ts:118 — funcao ausente da interface do design.md, sem marcador (repo)
- last seen: 2026-08-09T17:59:07Z

### L-027 — Espelho de redirect de edge no roteador nao pode ser condicionado a dado que o edge nao tem: condicionar faz dev e producao divergirem exatamente no caso de erro.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `routes` · harmful: 0
- features: 23-urls-e-seo
- evidence: apps/store/src/pages/CategoryPage.tsx:52 — SPEC_DEVIATION do modo legacy (routes)
- last seen: 2026-08-09T17:59:07Z

### L-028 — Regra de validacao de um campo mora na funcao que POSSUI a pergunta, nunca replicada em cada chamador: replicada por superficie, a proxima superfice nasce sem ela e nada acusa.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `core/validation` · harmful: 0
- features: 24-home-gerenciavel
- evidence: HOME-23 + packages/core/src/home/refusals.ts:110 (core/validation)
- last seen: 2026-08-15T18:37:39Z

### L-029 — AC com duas metades, mobile E desktop, precisa de assercao POSITIVA nas duas: negacao desenhada para tolerar o prefixo md: nao prova que o md: existe.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `testing/responsive` · harmful: 0
- features: 24-home-gerenciavel
- evidence: HOME-26 + apps/store/src/widgets/home-banners/ui/__tests__/HomeBannerGrid.test.tsx:117 (testing/responsive)
- last seen: 2026-08-15T18:37:47Z

## Quarantined (failed when applied — ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
