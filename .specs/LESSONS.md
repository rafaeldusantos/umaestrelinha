# LESSONS — auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

### L-046 — Quando o design troca o que a AC nomeia (a biblioteca, o componente, a fonte do dado), a spec tem de ser emendada ou ganhar SPEC_DEVIATION no mesmo movimento; senão a AC fica falsa com a suíte verde e o verificador é quem descobre.
- signal: `spec_deviation` · recurrence: 2 feature(s) · scope: `.specs/features/**` · harmful: 0
- features: 72-mobile-adm-fundacao, 79-mobile-adm-aviso-de-pedido
- evidence: `MAF-14` ("ícone de `@estrelinha/ui/icons`") × `design.md:45` e `widgets/tab-bar/model/tabs.ts:1` (`lucide-react`)
- evidence (79): `MAN-32` ("O aviso de teste não saiu. Tente de novo." para toda falha) × o conserto do QA de 2026-10-26 (`usePushNoAparelho.ts` `testar`: `gone`/`not_found` ⇒ `desligado` + `APARELHO_DESCARTADO`) — desvio registrado só em `tasks.md`, sem marcador `SPEC_DEVIATION` no código e sem emenda na `spec.md`
- last seen: 2026-10-26T00:00:00Z
- promovida a confirmed à mão (2026-10-26): o script não roda neste repositório (o `lessons.json` está dessincronizado do MD)

## Candidates (under observation — do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

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

### L-030 — vi.mock que substitui um modulo INTEIRO (sem importOriginal) quebra no primeiro hook novo que qualquer pagina coberta por ele passar a consumir — o erro aparece no render, nao na assercao; antes de afirmar 'o guarda passa sem edicao', liste os mocks totais dos testes que montam a pagina alterada.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `apps/store/src/pages/__tests__` · harmful: 0
- features: 29-pagina-sobre
- evidence: AC-9 / apps/store/src/pages/__tests__/copyInstitucional.test.tsx:14 (apps/store/src/pages/__tests__)
- last seen: 2026-08-16T16:22:29Z

### L-031 — Guarda que varre disco e remove comentario precisa normalizar CRLF ANTES: em JavaScript o ponto nao casa \r e o $ sem flag m nao ancora antes dele, entao num checkout Windows o stripper de linha fica inerte e o guarda acusa a prosa que explica o defeito.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `apps/**/__tests__ (guardas que varrem disco)` · harmful: 0
- features: 37-frete-gratis-configuravel
- evidence: freeShippingSingleOwner.test.ts:semComentarios (apps/**/__tests__ (guardas que varrem disco))
- last seen: 2026-09-05T14:17:53Z

### L-032 — Antes de trocar a regra de um valor cobrado, verifique se a funcao que o calcula tem teste: cartStore.shippingCost() era um dos quatro caminhos que zeravam frete e nao tinha nenhum.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `apps/store/src/entities/cart` · harmful: 0
- features: 37-frete-gratis-configuravel
- evidence: apps/store/src/entities/cart/model/cartStore.ts:shippingCost (apps/store/src/entities/cart)
- last seen: 2026-09-05T14:17:53Z

### L-033 — Guarda de migration precisa de uma regua por COMANDO, nunca uma para a familia: uma expressao que casa um update inteiro mede a forma do primeiro, e o segundo, com uma clausula a mais no meio (from), escapa em silencio. Recorte o set e assere as colunas dentro dele.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `apps/**/__tests__ (guardas que leem .sql)` · harmful: 0
- features: 39-menu-configuravel
- evidence: menuSchema.test.ts + 20260905130000_39-menu-configuravel.sql:126 (apps/**/__tests__ (guardas que leem .sql))
- last seen: 2026-09-06T12:47:05Z

### L-034 — Regua de classe utilitaria tem de recusar hifen depois do token: toContain casa o sufixo (accent casa accent-strong) e \b nao fecha nada, porque - nao e caractere de palavra. A forma que fecha e (?:^|\s)token(?![-\w]).
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `testing/tokens` · harmful: 0
- features: 39-menu-configuravel
- evidence: MegaMenu.test.tsx + navItem.ts:38 (testing/tokens)
- last seen: 2026-09-06T12:47:15Z

### L-035 — Guarda com escopo menor que a regra e allowlist com outro nome: varrer so ['apps'] deixava supabase/functions fora, e a edge function seguia pedindo a coluna legado ao banco. O escopo da varredura e parte da assercao, e precisa de ancora que NOMEIE um arquivo de cada ponta.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `testing/guardas de dono unico` · harmful: 0
- features: 39-menu-configuravel
- evidence: menuSurfaceSingleOwner.test.ts:ESCOPO + supabase/functions/sitemap/index.ts:61 (testing/guardas de dono unico)
- last seen: 2026-09-06T12:47:25Z

### L-036 — AC com duas metades — o sistema faz X E a tela diz isso em texto — precisa de assercao sobre o LITERAL. O componente que ficou sem arquivo de teste e exatamente onde a segunda metade some: apagar a frase nao quebra nada.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `apps/backoffice/**` · harmful: 0
- features: 39-menu-configuravel
- evidence: NAV-23 + MenuPanelEditor.tsx:60-62 (apps/backoffice/**)
- last seen: 2026-09-06T12:47:35Z

### L-037 — Constante do bundle usada como estado de carregamento e uma SEGUNDA resposta para "o que a loja mostra", e ela sobrevive a migration que revoga a premissa: o banco muda, o bundle segue afirmando o estado antigo, e nada quebra.
- signal: `stale_premise` · recurrence: 1 feature(s) · scope: `apps/store/**` · harmful: 0
- features: 41-banner-principal-da-home (premissa revogada), conserto-2026-09-21 (defeito colhido)
- evidence: useHomeSections.ts:84 `placeholderData` x migration 41 `drop trigger guard_hero_home_section` (AD-029/AD-041)
- last seen: 2026-09-21T00:00:00Z

### L-038 — AC de ORDEM precisa de fixture em que a ordem pedida e a ordem de recuo discordam: com `options.values` na mesma ordem da grade, ordenar por uma ou pela outra da o mesmo resultado e a asserção e verdadeira nos dois mundos.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `packages/core/**` · harmful: 0
- features: 68-seo-por-variacao
- evidence: SVR-01/SVR-24, M11 — `core/src/seo/variant.ts:155-156` (ordem por `posicao()` trocada pela da grade: core, functions, loja e painel verdes)
- last seen: 2026-10-19T00:00:00Z

### L-039 — Campo que o HANDLER passa a um construtor de `core` precisa de asserção no documento servido: o teste de unidade do construtor recebe o valor do proprio teste e nao prova a fiacao. Confira campo a campo o payload montado no handler, nao so os que o construtor calcula.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `supabase/functions/**` · harmful: 0
- features: 68-seo-por-variacao
- evidence: SVR-30, M39 — `supabase/functions/product-page/handlers.ts:406` (`name: dados.product.slug` com functions 1010/1010 verdes)
- last seen: 2026-10-19T00:00:00Z

### L-040 — Quando a verificação acusa colunas faltando numa leitura, o conserto não é acrescentar AS colunas citadas à lista do teste: a lista vira o objeto medido e só tapa os mutantes nomeados. A régua que fecha a família é de comportamento — o dublê devolve só o que o `select` pediu, e o documento servido tem de ser idêntico ao da linha inteira.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `apps/store/server/**` · harmful: 0
- features: 69-seo-servido-na-vercel
- evidence: rodada 2, N01/N02/N15/N16 — `apps/store/server/__tests__/page.test.ts` (lista à mão com `stock`/`stock_policy` acrescentados depois de M34/M35; `position` e `description` fora dela com 5302 verdes)
- last seen: 2026-10-19T00:00:00Z

### L-041 — Teste que executa um script num ambiente montado precisa do PAR POSITIVO no mesmo ambiente: sem ele, a falha que o teste exige pode vir do ambiente incompleto (arquivo de entrada ausente), e o mutante que tira a parada do script passa.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `apps/store/scripts/**` · harmful: 0
- features: 69-seo-servido-na-vercel
- evidence: rodada 3, N04 — `apps/store/scripts/__tests__/shell.test.ts` (a cópia temporária sem `server/page.ts` fazia o esbuild falhar com ou sem `process.exit(1)`)
- last seen: 2026-10-19T00:00:00Z

### L-042 — Alegação de que um mutante é "relevante" (ou equivalente) se decide pelo consumidor real, não pelo nome do campo: `compare_price` parecia o "de/por" que o Merchant Center compara, e o JSON-LD servido só declara `salePrice ?? price`. Meça com a régua de comportamento antes de pedir a asserção.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `packages/core/src/shopping/**` · harmful: 0
- features: 69-seo-servido-na-vercel
- evidence: rodadas 2 e 3 — `packages/core/src/shopping/jsonld.ts:31-32` (`payablePrice`); N02 e N16 equivalentes para a página
- last seen: 2026-10-19T00:00:00Z

### L-043 — Adaptador que lê N fontes precisa de um caso de ERRO por fonte, pela porta que o usuário chama: provar o erro só na primeira tabela deixa as outras livres para engolir o erro, e o resultado é a resposta parcial com status de sucesso que a spec proíbe.
- signal: `surviving_mutant` · recurrence: 2 feature(s) · scope: `apps/store/server/**`, `apps/mobile-adm/src/pages/**` · harmful: 0
- features: 70-sitemap-servido-na-vercel, 73-mobile-adm-inicio
- evidence: M01 — `apps/store/server/sitemap.ts` (`readFaqLinks` sem `throw` deixava o sitemap 200 sem as perguntas, com 5340 verdes); `73` r2, N15 — `InicioPage.tsx` com o aviso "Não consegui atualizar agora." calculado só pelo movimento sobrevive a mobile-adm 392/392: o caso da RELEITURA que falha (`MAI-18`) existe só para `store_movement`, e o cabeçalho do arquivo afirma "cada leitura tem o seu caso de erro" (vale para a primeira leitura, não para a releitura)
- last seen: 2026-10-22T00:00:00Z

### L-044 — Teste que cria diretório temporário dentro de uma árvore que outro guarda VARRE produz flake de ENOENT entre suítes paralelas; ponha o temporário em `node_modules/.cache` da raiz (nenhuma varredura entra, e a resolução de módulos continua subindo até o `node_modules` do repositório).
- signal: `flake` · recurrence: 1 feature(s) · scope: `apps/store/scripts/**` · harmful: 0
- features: 70-sitemap-servido-na-vercel
- evidence: `apps/store/scripts/__tests__/{shell,robots}.test.ts` × `chaveDeServidorForaDoNavegador.test.ts` (1 em 4 execuções)
- last seen: 2026-10-20T00:00:00Z

### L-045 — AC que enumera as partes de um controle (ícone, rótulo, alvo, estado atual) precisa de uma asserção POR PARTE: a suíte que confere rótulo, altura e `aria-current` deixa o ícone sair sem nada acusar.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `apps/mobile-adm/**` · harmful: 0
- features: 72-mobile-adm-fundacao
- evidence: M24 — `apps/mobile-adm/src/widgets/tab-bar/ui/TabBar.tsx:38` (o `<Icon>` apagado, 118/118 verdes; `MAF-14`)
- last seen: 2026-10-22T00:00:00Z

### L-047 — Leitura de autorização que engole erro de rede e devolve "não autorizado" produz uma recusa confiante e falsa; a spec de um app que depende de rede precisa separar "sem rede" (o navegador sabe) de "rede presente e inútil" (só a falha da leitura sabe), com AC para o segundo.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `packages/auth/**` · harmful: 0
- features: 72-mobile-adm-fundacao
- evidence: `packages/auth/src/AuthContext.tsx:40-53` (`checkAdmin` → `false` na falha) × a linha *Dependência externa* da spec da `72`; medido em `prova-navegador.md`
- last seen: 2026-10-22T00:00:00Z

### L-048 — `queryByRole('link')` nulo não prova que o link sumiu: um `<a>` SEM `href` não tem papel de link, então o texto "Abrir o X" pode ficar na tela como CTA morto com a asserção verde. Prove a ausência pelo texto (`queryByText`) ou pelo elemento, não pelo papel.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `apps/*/src/**/*.test.tsx` · harmful: 0
- features: 72-mobile-adm-fundacao
- evidence: r2 N9 — `apps/mobile-adm/src/app/layout/MobileLayout.tsx` `{url && (` → `{(url ?? true) && (` sobrevive a `TabBar.test.tsx` "SEM a env, … o link não é desenhado"
- last seen: 2026-10-22T00:00:00Z

### L-049 — Guarda de andaime que confere o `--filter <nome>` do script da raiz precisa conferir também que um workspace COM esse nome existe: `pnpm --filter` sem correspondência imprime "No projects matched" e sai com 0, então renomear o pacote deixa o script mudo e o guarda verde.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `apps/*/src/app/__tests__/**` · harmful: 0
- features: 72-mobile-adm-fundacao
- evidence: r2 N12 — `apps/mobile-adm/package.json` `"name"` renomeado; `scaffold.test.ts` 126/126 verdes
- last seen: 2026-10-22T00:00:00Z

### L-050 — Fluxo de vários passos cujo último passo devolve a decisão a outro dono (`onEntrou`, `onDone`) precisa de caso para a FALHA desse passo: os casos de sucesso e de recusa local passam com um `return` apagado do ramo de erro, e o fluxo segue para o desfecho de sucesso com a operação não feita.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `apps/*/src/features/**` · harmful: 0
- features: 72-mobile-adm-fundacao
- evidence: r3 S09 — `apps/mobile-adm/src/features/recovery/ui/RecoveryFlow.tsx` `gravarSenha`, o `return` do erro de `updatePassword` apagado; 128/128 verdes
- last seen: 2026-10-22T00:00:00Z

### L-051 — O comando de gate por `pnpm --filter <nome>` fica MUDO quando a mutação renomeia o pacote: sai com 0 sem rodar teste nenhum. Arnês de mutação que mexe em `package.json` mede de dentro do workspace (`node_modules/.bin/vitest run`) e confere que a linha `Tests` existe, senão "exit 0" vira morte ou sobrevivência falsa.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `apps/*/package.json` · harmful: 0
- features: 72-mobile-adm-fundacao
- evidence: r3 reinjeção de N12 pelo arnês da r2: exit 0 sem `Tests`; de dentro do app: 2 falhas em `scaffold.test.ts`
- last seen: 2026-10-22T00:00:00Z

### L-052 — Teste que grava `history.state` e depois chama um arnês de montagem precisa conferir que o arnês não sobrescreve o estado: `montarApp` faz `pushState({}, …)`, então o caso "passo com só o e-mail no estado" mediu "passo sem estado" e passou com a regra apagada.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `apps/*/src/test/**` · harmful: 0
- features: 72-mobile-adm-fundacao
- evidence: Fase 6 V12 — `RecoveryFlow.tsx` sem a exigência de `conferido`; `RecoveryFlow.test.tsx:279` verde
- last seen: 2026-10-22T00:00:00Z

### L-053 — No jsdom o histórico SOBREVIVE entre os testes de um arquivo: "o voltar devolve a X" fica verdadeiro pela sobra de um teste anterior. Prova de voltar precisa do mutante `push → replace` morto, ancorada no histórico que o próprio teste montou (`history.length` ou a entrada anterior conhecida).
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `apps/*/src/**/__tests__/**` · harmful: 0
- features: 72-mobile-adm-fundacao
- evidence: Fase 6 V16 — `LoginPage.tsx` "Esqueci minha senha" com `replace: true`; `RecoveryFlow.test.tsx:226` verde
- last seen: 2026-10-22T00:00:00Z

### L-054 — Um teto aplicado a N leituras em paralelo precisa de um dublê que pendure CADA uma: o dublê só pendurava o papel, e o teto do cadastro pode sumir com a promessa "sai em 8 s" verde, mesmo sendo o caso real (sem saída de rede, tudo pendura junto). Mesma família de L-043.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `packages/auth/**` · harmful: 0
- features: 72-mobile-adm-fundacao
- evidence: Fase 6 V26 — `AuthContext.tsx` `comTeto(fetchCustomer…)` trocado por `fetchCustomer(...)`; mobile-adm 204/204 verdes
- last seen: 2026-10-22T00:00:00Z

### L-055 — Dublê de client de auth precisa reproduzir os EVENTOS que o client de verdade emite sozinho, não só as respostas das chamadas: o supabase-js emite `INITIAL_SESSION` com `null` quando a leitura da sessão falha, e `SIGNED_IN` a cada volta da aba. Sem eles no dublê, "a falha vira `unknown`" passa no teste e é desfeita em produção pelo evento que o dublê não emite. Confira contra o client real (`createClient` com `fetch` falso) antes de dar a regra por provada.
- signal: `failed_ac` · recurrence: 1 feature(s) · scope: `apps/*/src/test/**`, `packages/auth/**` · harmful: 0
- features: 72-mobile-adm-fundacao
- evidence: Fase 6 r2 — sonda com supabase-js 2.110.7 real, sessão vencida e renovação com falha de rede: `unknown` aos 8 s e `not-admin`/`user = null` ~40 s depois (o `INITIAL_SESSION` nulo); `fakeSupabase.ts` não emite nenhum dos dois eventos
- last seen: 2026-10-22T00:00:00Z

### L-056 — Mudar o que um provider COMPARTILHADO guarda como "resolvido" muda o comportamento de todo consumidor que lê `loading`: no app, reperguntar o papel a cada evento é o que se quer; na loja, cada `SIGNED_IN` de volta da aba vira `loading = true`, e o checkout se desmonta em "Carregando...". Ao mexer num provider de dois apps, liste o que cada consumidor faz com `loading = true` antes de aceitar a precisão.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `packages/auth/**`, `apps/store/src/pages/**` · harmful: 0
- features: 72-mobile-adm-fundacao
- evidence: Fase 6 r2 — sonda com supabase-js real: papel com falha ⇒ `unknown`; `visibilitychange` ⇒ `SIGNED_IN` ⇒ `unknown|true` (o `loading` voltou); `CheckoutPage.tsx:293` desenha "Carregando..." em `loading`; em `b6449bd2` o `resolvedFor` era gravado também na falha
- last seen: 2026-10-22T00:00:00Z

### L-057 — Toda ref de dedupe ou de "já resolvido" que um caminho de SAÍDA zera (logout, "Tentar de novo") precisa de um caso de RE-ENTRADA pelo mesmo id: sair e entrar com a mesma conta, sair com a checagem em voo, tentar de novo com uma repergunta em voo. Sem ele, apagar o reset deixa a suíte verde e o provider preso (`loading` eterno, ou a sessão nova ignorada).
- signal: `surviving_mutant` · recurrence: 2 feature(s) · scope: `packages/auth/**`, `apps/mobile-adm/src/features/**` · harmful: 0
- features: 72-mobile-adm-fundacao, 73-mobile-adm-inicio
- evidence: `73` r2, N02 — `useRecusaDePapel.ts` com `reconferidoPara !== null` no lugar de `=== conta` (a troca de conta deixa de reabrir o episódio de recusa) sobrevive a mobile-adm 392/392: falta o caso de re-entrada por OUTRO id (conta A recusada, conta B entra e é recusada); Fase 6 r3 — X05 (`presente` não zera no logout), X06 (`emVoo` não zera no logout) e X07 (`retryAdminCheck` não zera `emVoo`) sobrevivem a mobile-adm 249/249 + os arquivos com o `AuthProvider` real da loja e do painel; sonda com o client real: X06 ⇒ entra e a tela segue deslogada; X07 ⇒ `unknown|true` por 20 s
- last seen: 2026-10-22T00:00:00Z

### L-058 — Prova de "pelo dia do banco, não do aparelho" precisa de um relógio falso em que o UTC do aparelho e o valor esperado DISCORDEM no campo medido: um instante na virada (31/12 23:59 de Brasília) já é janeiro em UTC, e a leitura do relógio do aparelho por `toISOString()` passa como se fosse a do banco. Escolha o meio de outro mês, longe de toda borda.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `apps/mobile-adm/src/widgets/**` · harmful: 0
- features: 73-mobile-adm-inicio
- evidence: A32 — `MonthCards.tsx` `monthName(r.mes)` → `monthName(new Date().toISOString())` sobrevive a mobile-adm 387/387; `MonthCards.test.tsx:22-28` fixa o relógio em `2025-12-31T23:59-03:00` (= `2026-01-01T02:59Z`) com `mes: '2026-01'`; e no conserto r1 a mesma armadilha SEM relógio falso: os casos da saudação e da data do `MovementHero` usavam o relógio real, e durante o 22/10/2026 em UTC (o dia da fixtura) ler a data do aparelho passaria — a régua dependia da hora em que a suíte rodava. Agora cada caso põe o aparelho em 15/06 numa faixa de hora diferente da esperada
- last seen: 2026-10-22T00:00:00Z

### L-059 — A semântica de uma RPC (borda de dia, `left join`, `count(col)` × `count(*)`, ordem do agregado final, a coluna do nome) só é provada por probe contra o banco; o guarda de fonte mede a forma e deixa esses mutantes passarem. Probe que não roda no CI precisa ser rodado no gate da feature e no de toda migration que recrie a função.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `supabase/migrations/**` · harmful: 0
- features: 73-mobile-adm-inicio
- evidence: S01, S02, S03, S04, S06, S11 — `overviewSchema.test.ts` e `filaComDonoUnico.test.ts` verdes com o mutante na migration da `73`; só `.specs/features/73-mobile-adm-inicio/probes/01-resumo.sql` reprova (todos mortos, mas fora de toda suíte automática); r3: J2, J3, J4, C2, C3, C4, R1, R2 mortos só pelo probe, e C1/J1 nem por ele (`L-062`)
- last seen: 2026-10-22T00:00:00Z

### L-060 — Guarda de "nenhum predicado escrito à mão" por VOCABULÁRIO é cego a constante e a concatenação (`'aguardando' + '_material'`), e a âncora positiva que o salva ("a consulta monta o filtro pela regra de `core`") prova PRESENÇA, não exclusividade: um predicado extra encadeado ao lado da regra (`.neq('status', 'cancelled')`) passa as duas. Para "o recorte é SÓ a regra do dono", meça a cadeia inteira da consulta (os métodos entre o `from` e o `order`) por igualdade, ou prove por comportamento com um dublê que registra os filtros.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `packages/core/src/orders/__tests__/**`, `apps/backoffice/src/entities/order/api/**` · harmful: 0
- features: 73-mobile-adm-inicio
- evidence: `73` r2 — P01 (`.eq(COL, ESTADO)` com constantes concatenadas) morto só pela âncora, a régua de vocabulário passou; P04 (regra de `core` + `.neq('status', 'cancelled')` na idade do mais antigo de `useAdminOrderList.ts`) sobrevive a core 3826/3826 e às suítes de pedidos do painel
- last seen: 2026-10-22T00:00:00Z

### L-061 — Gesto com limiar ("só no topo", "acima de N px") precisa de régua nas DUAS bordas e no sentido contrário: provar "fora do topo" com a página rolada 120 px deixa passar `scrollY > 100`, e puxar só para baixo deixa passar `Math.abs` (puxar para cima também relê). Meça com 1 px de rolagem e com o dedo subindo.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `apps/mobile-adm/src/shared/ui/**` · harmful: 0
- features: 73-mobile-adm-inicio
- evidence: `73` r3, T1 (`PullToRefresh.tsx` `window.scrollY > 0` → `> 100`) e T2 (`Math.max(0, y - inicio)` → `Math.abs(…)`) sobrevivem a mobile-adm 394/394; `PullToRefresh.test.tsx` usa `rolarPara(120)` e só `clientY` crescente
- last seen: 2026-10-22T00:00:00Z

### L-062 — Probe de RPC que agrupa por "A ou B" (cadastro por `customer_id` OU convidada por e-mail) e corta por `order by … limit N` precisa de fixtura em que as duas chaves DISCORDEM e em que haja um empate exatamente no corte: com o e-mail do pedido igual ao da conta, tirar o `customer_id` do `on` dá o mesmo número; com só N candidatos, a ordem do recorte não decide quem entra.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `.specs/features/*/probes/**`, `supabase/migrations/**` · harmful: 0
- features: 73-mobile-adm-inicio
- evidence: `73` r3, C1 (`primeira` casando só por `lower(customer_email)`) e J1 (`order by pecas desc, nome desc` só na CTE `joias`) passam `01-resumo.sql` 23/23
- last seen: 2026-10-22T00:00:00Z

### L-063 — Bloco de três estados (dado · falha · carregando) precisa de asserção de EXCLUSIVIDADE em cada estado, não só da marca do próprio: o caso de carregamento que confere `aria-busy` e "nenhum número" passa com o esqueleto apagado; o de falha que confere a frase passa com `aria-busy` ligado; o de falha inicial passa com o aviso de RELEITURA na tela.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `apps/mobile-adm/src/widgets/**`, `apps/mobile-adm/src/pages/**` · harmful: 0
- features: 73-mobile-adm-inicio
- evidence: `73` r3, S1 (`MovementHero.tsx` sem `Traco` nos números), G3/Q1 (`WeekChart`/`QueueTiles` `carregando = !r`) e N15d (`InicioPage.tsx` aviso por `resumo.isError` sem dado) sobrevivem a mobile-adm 394/394
- last seen: 2026-10-22T00:00:00Z

### L-064 — Conserto de uma ação que vive em DUAS superfícies (o rodapé do detalhe e o botão do cartão da lista) precisa de régua em cada uma: o teste do conserto que toca só o rodapé deixa a segunda superfície repassar a retentativa antiga com a suíte inteira verde, e o bug do QA volta exatamente lá.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `apps/mobile-adm/src/features/**`, `apps/mobile-adm/src/pages/__tests__/**` · harmful: 0
- features: 75-mobile-adm-acoes-do-pedido
- evidence: `75` r3, V05 — `BotaoDaAcao.tsx` reenviando `{ tipo: 'primaria' }` sem `espera` sobrevive a mobile-adm 1096/1096; o `it.each` do C01 em `acoesDoPedido.test.tsx` só toca o rodapé
- last seen: 2026-10-24T00:00:00Z

### L-065 — Valor derivado de uma leitura que pode FALHAR ("o aviso saiu?" lido de `order_notifications`) precisa de caso com a leitura em erro, não só com cada valor que ela pode devolver: `sent`, `failed` e ausente provam a regra, e o mutante "erro ⇒ verdadeiro" volta a afirmar o que ninguém sabe.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `apps/mobile-adm/src/entities/**` · harmful: 0
- features: 75-mobile-adm-acoes-do-pedido
- evidence: `75` r3, V10 — `usePedido.ts` com a leitura de `order_notifications` em erro devolvendo `avisoDePostagemSaiu = true` sobrevive; os três casos novos de `usePedido.test.tsx` cobrem `sent`, `failed` e id inválido
- last seen: 2026-10-24T00:00:00Z

### L-066 — Devolver o foco "a quem abriu" precisa de um caso em que NINGUÉM tinha o foco ao abrir (`document.activeElement === document.body`, o toque no Safari/iOS e o `controle.abrir()` por script): o teste que foca o controle antes de abrir prova o caminho do teclado e deixa o `<body>` virar "quem abriu" — o bug de volta, noutro navegador.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `apps/mobile-adm/src/features/**` · harmful: 0
- features: 75-mobile-adm-acoes-do-pedido
- evidence: `75` r3, V12 — `FolhaDoRastreio.tsx` sem o `!== document.body` sobrevive; todos os casos do C03 focam o controle de origem antes de abrir
- last seen: 2026-10-24T00:00:00Z

### L-067 — O histórico do jsdom não é o do navegador: duas chamadas de `navigate(-1)`/`history.back()` no mesmo tique caem na MESMA entrada no jsdom e se SOMAM no Chromium, e uma entrada substituída por `replace` continua um voltar morto. Teste de folha/modal que mora no histórico precisa montar o histórico que o app de fato produz (abrir pelo app, recarregar com o `state`), e a prova do voltar é em navegador.
- signal: `browser_only_defect` · recurrence: 1 feature(s) · scope: `apps/mobile-adm/src/features/**` · harmful: 0
- features: 75-mobile-adm-acoes-do-pedido
- evidence: `75` T31, B01 — o F5 com a folha aberta deixava um voltar morto e, consertado, os dois usuários da folha no detalhe (rodapé e Entrega) voltavam duas vezes; a suíte aprovava porque o teste montava um histórico que o app nunca produz
- last seen: 2026-10-24T00:00:00Z

### L-068 — Estado que só importa quando os dados chegaram de FORA (carga, releitura, rascunho) precisa de caso que edite um registro CARREGADO: testes que partem do formulário vazio, ou que só exercitam operações que dão o mesmo resultado com o estado errado (remover valor), deixam o reinício desse estado sem régua.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `apps/backoffice/src/pages/admin/**` · harmful: 0
- features: 81-opcoes-e-variacoes-do-produto
- evidence: M29 — `AdminProductFormPage.tsx:213` (`if (false)` no reinício do refletido: renomear a opção de um produto salvo orfanaria a grade inteira, com 71/71 verdes)
- last seen: 2026-10-26T00:00:00Z

### L-069 — "Aplicado por id, nunca por posição" só se prova com a lista MUDANDO DE FORMA (um item anterior saindo) entre a pergunta e a resposta assíncrona; casos que editam campos ou devolvem o mesmo item mantêm as posições e são verdadeiros nos dois mundos.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `apps/backoffice/src/**` · harmful: 0
- features: 81-opcoes-e-variacoes-do-produto
- evidence: M07 — `AdminProductFormPage.tsx:255` (veredito pela posição antiga caía na linha vizinha, que continua no cruzamento); M32 — o conjunto de conferidas sem a terceira volta (remover → devolver → remover)
- last seen: 2026-10-26T00:00:00Z

### L-070 — Guarda em camadas (a sugestão já exclui o repetido, e o acréscimo exclui de novo) precisa de um caso pela entrada que SÓ a camada de baixo protege: todo caso que entra pela sugestão chega ao acréscimo já sem o repetido, e apagar a dobra do acréscimo fica verde.
- signal: `surviving_mutant` · recurrence: 1 feature(s), 2 ocorrências · scope: `apps/backoffice/src/features/product-form/**` · harmful: 0
- features: 81-opcoes-e-variacoes-do-produto
- evidence: N29 (rodada 2) — `OptionsEditor.tsx:303-304` (`addValues` sem `dobrarTexto`: digitar "3,5 cm" com "3,5 CM" na opção cria um segundo valor, com 153/153 verdes)
- evidence: P02 + I03 (rodada 3) — a página limpa o `image_url` da linha cuja foto sai da galeria (`clearMissingVariantImages`) e o `VariantImagePicker` esconde a URL que não está na galeria; o caso de OPV-27 olha só o botão, então apagar qualquer uma das duas camadas fica verde (82/82 e 73/73) — e sem a da página o banco recebe a URL morta
- last seen: 2026-10-26T00:00:00Z

### L-071 — Limiar de contagem ("vendida" = pelo menos UM pedido) precisa de caso NO limiar: fixtures com 0 e 2 provam `> 0` tanto quanto `> 1`, e a fronteira que separa "apagar" de "pausar" fica sem régua.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `apps/backoffice/src/features/product-form/**` · harmful: 0
- features: 81-opcoes-e-variacoes-do-produto
- evidence: O02 (rodada 4) — `orphans.ts:34` `check.orders > 0` → `> 1`: 57/57 verdes (`orphans.test.ts` usa `orders: 2`, a página usa `'v-vendida': 2`); sonda pela página real com `'v-um': 1` reprova no mutante (a linha some da grade e o aviso não aparece)
- last seen: 2026-10-26T00:00:00Z

> Numeração: L-072 e L-073 estão reservadas pela feature `82`, em outra árvore (sem commit); as da `83` começam em L-074.

### L-074 — Regra de nulidade escrita como DISJUNÇÃO (`a or b or c ⇒ null`) precisa de um caso em que CADA disjunto é o ÚNICO verdadeiro: a fixtura que liga dois ao mesmo tempo ("sem hora em hoje E ontem") prova o `or` inteiro e deixa apagar qualquer um deles com o probe verde — e o `is null` explícito de uma coluna anulável é o primeiro a sumir num refator, porque `NULL >= x` não reprova nada.
- signal: `surviving_mutant` · recurrence: 1 feature(s), 2 ocorrências · scope: `supabase/migrations/**`, `.specs/features/**/probes/**` · harmful: 0
- features: 83-loja-ao-vivo
- evidence: S06 (rodada 1) — `v_sem_cmp_hoje` sem `v_sem_hora_hoje > 0` sobrevive ao probe (70 `ok`) e aos guardas: os casos são "sem hora em hoje e ontem" e "só em ontem"
- evidence: S09 (rodada 1) — `v_sem_cmp_hoje` sem `v_inicio_dia is null` sobrevive: nenhum caso com a contagem que nunca começou, e `case when NULL` cai no ramo do valor
- last seen: 2026-10-27T00:00:00Z

### L-075 — Janela de tempo NOVA (anteontem, "ontem até as {h}h") precisa de fixtura NO instante da fronteira; a régua "meio-aberta" herdada só alcança as janelas que já existiam, e pedidos no meio do dia provam `<` e `<=` igualmente — a venda das 00:00:00 contaria nos dois dias.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `supabase/migrations/**`, `apps/store/src/shared/lib/__tests__/**` · harmful: 0
- features: 83-loja-ao-vivo
- evidence: S05 (rodada 1) — `paid_at < v_ini_ontem` → `<=` na contagem de anteontem (`comparacao.ontem.vendas`) sobrevive ao probe `01-acessos.sql` e a `visitasPorHoraSchema`/`visitasSchema` (as réguas de `visitasRegras.ts` medem só os fragmentos de `periodos`)
- last seen: 2026-10-27T00:00:00Z

### L-076 — No banco local, função criada pelo `postgres` só ganha `execute` de `PUBLIC` (o `pg_default_acl` de funções do `postgres` não concede a `anon`/`authenticated`), então o probe "authenticated sem execute" é verdadeiro com o `revoke` de `authenticated` apagado; o hospedado pode conceder explícito. A prova do `revoke … from public, anon, authenticated` é o guarda de FONTE, e o probe de privilégio sozinho não discrimina.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `supabase/migrations/**`, `.specs/features/**/probes/**` · harmful: 0
- features: 83-loja-ao-vivo
- evidence: S14 (rodada 1) — `revoke execute on function store_hour … from public, anon` (sem `authenticated`) passa os 70 `ok` do probe; morre só em `visitasPorHoraSchema.test.ts` (3). `pg_default_acl` local: `postgres|f|{postgres=X/postgres}`; uma função de teste revogada de `public, anon` perde o `execute` de `authenticated` junto
- last seen: 2026-10-27T00:00:00Z

## Quarantined (failed when applied — ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
