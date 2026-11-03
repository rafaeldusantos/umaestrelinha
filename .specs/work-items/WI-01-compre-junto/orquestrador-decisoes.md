# Decisões do orquestrador — WI-01

Perguntas da sessão e quem respondeu: o árbitro (agente validador), a página de review técnico ou o humano.

## G1 — gate da página

- Etapa: Planejamento · humano respondeu na página · página web da wi-workflow

**Página:** /private/tmp/claude-503/-Users-rafael-santos-Projetos-uma-estrelinha-store/a6556342-d6ab-4281-be2c-327f130410a5/scratchpad/wi/WI-01

**Respostas (answers.json):**

```json
{
  "wi": "WI-01",
  "respostas": [
    {
      "id": "forma-do-bloco",
      "escolha": "A — abre na linha, sem a faixa de fórmula",
      "texto": "Adicionar no menu Compre Junto a opção do usuário admin configurar como ele quer que aparece na Loja. Adicione esses 3 modos"
    },
    {
      "id": "texto-do-bloco",
      "escolha": "Ratificar os três textos do protótipo como estão",
      "texto": ""
    },
    {
      "id": "nome-do-principal-na-frase",
      "escolha": "Nome completo do produto (`products.name`), quebrando linha se preciso; sem campo novo",
      "texto": ""
    },
    {
      "id": "barra-fixa-com-conjunto",
      "escolha": "Como no protótipo: total + \"Conjunto · N peças\", PIX só no bloco",
      "texto": ""
    },
    {
      "id": "quantidade-do-principal-no-celular",
      "escolha": "Manter como o protótipo e como a página de hoje: sem seletor no celular, ajusta-se na sacola",
      "texto": ""
    },
    {
      "id": "relatorio-recortes",
      "escolha": "Como no protótipo (7/30/90, indicadores extras, linha \"direto no produto\"), mais um estado vazio escrito por nós",
      "texto": ""
    },
    {
      "id": "pecas-do-relatorio-por-unidade-ou-linha",
      "escolha": "Somar a quantidade da linha marcada (simples; pode contar a unidade avulsa nesse caso raro)",
      "texto": ""
    },
    {
      "id": "lista-nome-e-lista-vazia",
      "escolha": "Ratificar o protótipo: nome até 40 caracteres, lista vazia salvável mas inutilizável num adicional",
      "texto": ""
    },
    {
      "id": "leitura-publica-ativo",
      "escolha": "Seguir o precedente (leitura pública sem condição; produto inativo é filtrado pela RLS de `products`) e emendar RNF-07 para dizer isso",
      "texto": ""
    }
  ],
  "enviadoEm": "2026-11-02T15:46:07.410Z"
}
```

## G2 — aprovar a fila e o plano de ondas 01 | 02,03 | 04,07 | 05 | 06

- Etapa: Planejamento · Têmis escalou ao humano

**Pergunta (fim da resposta de Maestro, a sessão):**

> **Posse de arquivos por onda**
> - **W1:** 01 posse: `supabase/migrations/` (nova), `packages/core/src/buy-together/` e `packages/core/package.json`, `packages/supabase/src/types/index.ts`, `apps/backoffice/src/features/buy-together-lists/`, a página de Listas, `App.tsx`, `navItems.ts`, `packages/core/CLAUDE.md`, `supabase/CLAUDE.md`, `apps/backoffice/CLAUDE.md`.
> - **W2:**
>   - 02 posse: `AdminProductFormPage.tsx`, `useProductForm.ts`, `useAdminProducts.ts`, `features/product-form/`, migration de conversão, fixtures `buy_together_ids`.
>   - 03 posse: `packages/core/src/buy-together/` (arquivos novos e barrel), `entities/product/{ui,model,lib,api}` e a pasta do bloco, `ProductPage.tsx`, `ProductInfo.tsx`, `apps/store/CLAUDE.md`.
>   - Sem colisão: 02 não toca o core nem a loja, e 03 não toca o painel.
> - **W3:**
>   - 04 posse: `cartStore.ts`, `useProductPurchase.tsx`, `EngravingField.tsx`, `ProductBuyBar.tsx`, `ProductInfo.tsx` e `ProductPage.tsx` (editados), `CartDrawerRow.tsx`, `core/analytics/`, `shared/lib/analytics/`, `apps/store/CLAUDE.md`.
>   - 07 posse: só a pasta do bloco para as novas formas e para a leitura do setting, `core/buy-together/settings.ts`, a página do painel da 01. **Nenhum arquivo da 04**, e não edita `apps/store/CLAUDE.md`.
> - **W4:** 05 posse: `buildOrderPayload.ts`, `checkout/handlers.ts` e `createOrder.test.ts`, migration das colunas, `OrderItemsSummary.tsx`, `itemDetailLine.ts`, `AdminOrderPage.tsx`, `useAdminOrder.ts`, tipos, `supabase/CLAUDE.md`.
> - **W5:** 06 posse: migration da RPC, a página e o hook do relatório, `App.tsx` e `navItems.ts`, `marcacaoSoPorAcao.test.ts`, `CLAUDE.md` raiz, `STATE.md`, `apps/store/CLAUDE.md`.
> 
> **Dependências relaxadas:** nenhuma.
> 
> **Fica fora**
> - Desconto da compra casada (WI 92).
> - Combinar o acabamento (WI 93).
> - O `drop column buy_together_ids`: só depois do deploy do painel, e a contagem em produção é conferida por você antes.
> - Compre junto no card, na gaveta e no checkout; recomendação automática; aviso de corrente já como variação.
> 
> Todos os UC-01..UC-09 têm uma tarefa dona.
> 
> Se você aprovar, escrevo `tasks/` e `waves.md`, rodo o `wi-task-audit` (conferindo também as ondas) e gravo `fase: implement`, sem outra pergunta.
> 
> [[WI:PLAN:ASK:aprovar a fila e o plano de ondas 01 | 02,03 | 04,07 | 05 | 06]]

**Por que Têmis escalou:**

o árbitro terminou sem veredito

## G2 — aprovar a fila e o plano de ondas 01 | 02,03 | 04,07 | 05 | 06

- Etapa: Planejamento · humano decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

> **Posse de arquivos por onda**
> - **W1:** 01 posse: `supabase/migrations/` (nova), `packages/core/src/buy-together/` e `packages/core/package.json`, `packages/supabase/src/types/index.ts`, `apps/backoffice/src/features/buy-together-lists/`, a página de Listas, `App.tsx`, `navItems.ts`, `packages/core/CLAUDE.md`, `supabase/CLAUDE.md`, `apps/backoffice/CLAUDE.md`.
> - **W2:**
>   - 02 posse: `AdminProductFormPage.tsx`, `useProductForm.ts`, `useAdminProducts.ts`, `features/product-form/`, migration de conversão, fixtures `buy_together_ids`.
>   - 03 posse: `packages/core/src/buy-together/` (arquivos novos e barrel), `entities/product/{ui,model,lib,api}` e a pasta do bloco, `ProductPage.tsx`, `ProductInfo.tsx`, `apps/store/CLAUDE.md`.
>   - Sem colisão: 02 não toca o core nem a loja, e 03 não toca o painel.
> - **W3:**
>   - 04 posse: `cartStore.ts`, `useProductPurchase.tsx`, `EngravingField.tsx`, `ProductBuyBar.tsx`, `ProductInfo.tsx` e `ProductPage.tsx` (editados), `CartDrawerRow.tsx`, `core/analytics/`, `shared/lib/analytics/`, `apps/store/CLAUDE.md`.
>   - 07 posse: só a pasta do bloco para as novas formas e para a leitura do setting, `core/buy-together/settings.ts`, a página do painel da 01. **Nenhum arquivo da 04**, e não edita `apps/store/CLAUDE.md`.
> - **W4:** 05 posse: `buildOrderPayload.ts`, `checkout/handlers.ts` e `createOrder.test.ts`, migration das colunas, `OrderItemsSummary.tsx`, `itemDetailLine.ts`, `AdminOrderPage.tsx`, `useAdminOrder.ts`, tipos, `supabase/CLAUDE.md`.
> - **W5:** 06 posse: migration da RPC, a página e o hook do relatório, `App.tsx` e `navItems.ts`, `marcacaoSoPorAcao.test.ts`, `CLAUDE.md` raiz, `STATE.md`, `apps/store/CLAUDE.md`.
> 
> **Dependências relaxadas:** nenhuma.
> 
> **Fica fora**
> - Desconto da compra casada (WI 92).
> - Combinar o acabamento (WI 93).
> - O `drop column buy_together_ids`: só depois do deploy do painel, e a contagem em produção é conferida por você antes.
> - Compre junto no card, na gaveta e no checkout; recomendação automática; aviso de corrente já como variação.
> 
> Todos os UC-01..UC-09 têm uma tarefa dona.
> 
> Se você aprovar, escrevo `tasks/` e `waves.md`, rodo o `wi-task-audit` (conferindo também as ondas) e gravo `fase: implement`, sem outra pergunta.
> 
> [[WI:PLAN:ASK:aprovar a fila e o plano de ondas 01 | 02,03 | 04,07 | 05 | 06]]

**Parecer de Têmis:**

o árbitro terminou sem veredito

**O humano respondeu:**

fila aprovada, siga

## G3 — gate da página (2 itens)

- Etapa: Plano de QA · humano respondeu na página · página web da wi-workflow

**Página:** http://127.0.0.1:8477/

**Respostas (answers.json):**

```json
{
  "wi": "WI-01",
  "respostas": [
    {
      "id": "Q-01",
      "escolha": "A — gravar a massa de pedidos pagos (M-08) no banco local antes do charter, no molde do probe 05-adesao.sh, e apagar ao fim",
      "texto": ""
    },
    {
      "id": "Q-02",
      "escolha": "A — o \"cobrado\" é o valor do pedido gravado, mostrado em /pedido/:id/pagamento e no painel, sem exigir o QR",
      "texto": ""
    }
  ],
  "enviadoEm": "2026-11-02T18:58:21.909Z"
}
```

## G4 — Gate 1 — aprovação do plano de QA

- Etapa: Plano de QA · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

>   Automação: e2e 50 (todos ainda sem teste automatizado) · integration 7 · manual 17
>   Decisões da página:
>     · D-01: a massa M-08 de pedidos pagos é gravada no Postgres local dentro do CH-04, depois de conferir o relatório vazio, e apagada pelos ids ao fim da rodada
>     · D-02: o valor cobrado é conferido no pedido gravado, em /pedido/:id/pagamento e no painel, sem exigir o QR do PIX
>   Ordem: o CH-03 (painel) roda primeiro, porque monta a massa M-01..M-07 que a loja usa · smoke: TC-SMOKE-003 → 001 → 002
>   Contas: PER-02 Adri = admin do supabase/seed.sql, só no local · PER-04 Sônia = convidada, entra em Minha Conta por código lido no Mailpit
>   Perguntas 🟡:
>     · com um adicional marcado mas incompleto, o plano segue a implementação: "Conjunto · N peças" conta os marcados e o total soma só os completos — o PRD não decide
>     · a forma do bloco vale para a loja inteira (premissa a confirmar); não há teste de forma por produto
>     · a massa M-01..M-08 é montada com a conta admin; se faltar produto com variação "Chaveiro", gravação ou material, a dona ajusta antes do smoke
>     · a sacola de antes da mudança (versão 3 de estrelinha-cart) é gravada no navegador antes do CH-05
>     · a conversão do campo antigo (CA-02.8) fica com o probe 02-conversao.sh; o GA4 fica com o Dev
>     · leitor de tela real, Safari/iOS e Chrome Android ficam fora; a tecnologia assistiva é simulada por teclado, zoom e árvore de acessibilidade
>   Notas 🟢:
>     · o qa-report.md diz "59/59", mas a contagem real é 58 CA + 7 RNF
>     · a faixa "convertido do antigo" do protótipo não foi construída
>     · o relatório tem uma linha "Lista apagada" que o PRD não descreve
>     · a folha de separação não mostra "acompanha"
>   Arquivos: <QA_DIR>/test-plans/ · <QA_DIR>/test-cases/
> Aprova o plano para seguir para a execução?
> ```
> 
> Nada foi commitado, nenhum container foi subido e nenhum charter foi executado.
> 
> [[WI:QA_REPORT:ASK:Gate 1 — aprovação do plano de QA]]

**Resposta:**

Decidiu: **Gate 1 aprovado.** O plano de QA segue para a execução (Fase 2), na ordem do plano: CH-03 primeiro, depois o smoke TC-SMOKE-003 → 001 → 002. Decisão delegada pela política do humano, regra "QA local: aprovar o plano de QA (Gate 1) quando bate com o relatório dos agentes e com o que está em `qa/`".

O que conferi no worktree, em `.specs/work-items/WI-01-compre-junto/`:
- **Contagens:** `qa/test-cases/` tem 74 arquivos TC. Há 6 jornadas em `qa/test-plans/journeys/` e 8 charters em `qa/test-plans/charters/` (6 exploratórios, CH-07 de CFR e CH-08 de conferência contra o design). Bate com o resumo.
- **Cobertura:** o `prd.md` tem 65 critérios distintos (58 CA e 7 RNF; não existe CA-03.9). Todos aparecem em ao menos um TC de `qa/test-cases/`. O plano declara "Sem cobertura: nada" em `compre-junto-test-plan.md:294`, e as ressalvas de casos só de integração estão escritas ali.
- **Perguntas 🔴:** nenhuma aberta (`compre-junto-test-plan.md:324`). Q-01 e Q-02 viraram D-01 e D-02, registradas como respostas da página (`:315-320`), coerente com o G3 já respondido.
- **D-01:** a massa M-08 é gravada só no Postgres local e apagada no fim da rodada (`:172`, `:200`, `:319`). Nada toca `*.supabase.co`, o que está dentro da regra de testes só no local.
- **Rascunho:** o plano ainda marca `**Gate 1:** pendente` (`:100`). Com esta aprovação, a sessão marca o Gate 1 como aprovado no test-plan e registra a decisão em `orquestrador-decisoes.md`.

As perguntas 🟡 não seguram o gate, porque são premissas de execução ou recortes de ambiente já declarados. Uma ressalva: o caso do adicional marcado mas incompleto ("Conjunto · N peças" conta os marcados, e o total soma só os completos). Se na execução isso parecer errado para a persona, ele entra como achado com destino de produto e volta ao humano. Não pode ser resolvido como bug pela sessão.

## G5 — Gate 3 — confirmação do veredito de QA

- Etapa: Execução de QA · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

>     2. A peça que saiu do ar continua na sacola de quem estava com a loja aberta.
>     3. Na escolha de variação, cada opção é uma parada de Tab, e Espaço troca a escolha.
>   Sugestões de backlog: 21. Não voltam a este Work Item. A lista está no qa-result.md, em "Sugestões de backlog". Exemplos: o salvamento em duas abas que sobrescreve sem aviso, o duplo toque que leva o conjunto duas vezes, a confirmação sem a linha do desconto PIX, a rolagem lateral da página do produto em 768–1023.
>   Achados que não viraram bug: o texto "Escolha a peça" (segue o protótipo; o plano precisa ajustar TC-FUNC-005/006) e o ramo "sem variação" de TC-FUNC-003 (inalcançável), entre outros, todos listados no qa-result.md.
> 
> Limpeza já feita:
> - Banco local:
>   - Apaguei os pedidos #0327 a #0333 e a conta de convidada criada pelo CH-02 (marina.ch02@exemplo.invalid, em customers e em auth.users). Conferi que não sobrou nenhum.
>   - Os produtos e as listas `QA …` (M-01..M-07) continuam no banco para a rodada de confirmação. Os ids para apagar estão em /private/tmp/claude-503/-Users-rafael-santos-Projetos-uma-estrelinha-store/018b8e4a-a351-47aa-9ae1-67c3593cb988/scratchpad/massa-ids.json.
> - Processos e containers:
>   - Os dev servers e o `functions serve` estão encerrados: as portas 8082 e 8083 estão livres, e o container de edge runtime do projeto saiu.
>   - Os containers permanentes do Supabase e os do ProductDock ficaram intocados.
> - Checkout principal: removi os 37 snapshots e logs do Playwright que esta rodada deixou em store/.playwright-mcp. O checkout principal não ficou com nada deste WI.
> - Nada foi commitado.
> 
> Artefatos, em /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-WI-01/.specs/work-items/WI-01-compre-junto/qa/:
> - sessions/CH-01..CH-08
> - issues/BUG-001..013.md
> - qa-result.md (`**Gate 3:** pendente`)
> - massa.md
> - screenshots/
> 
> Gate 3: AGUARDANDO. Confirma o veredito (fail), os 13 bugs novos com estas severidades e as transições (nenhuma)? Com o de acordo, gravo `**Gate 3:** confirmado em 2026-11-02` e a linha `QA · Gate 3 — veredito` no item.md. Depois as 3 perguntas ao produto vão pela página.
> 
> [[WI:QA_EXEC:ASK:Gate 3 — confirmação do veredito de QA]]

**Resposta:**

Decidiu: Gate 3 confirmado. É decisão delegada pela política do humano (item "QA local: … confirmar o veredito (Gate 3) quando batem com o relatório dos agentes e com o que está em `qa/`").

O que conferi no disco:
- **Veredito `fail`** (`qa/qa-result.md:4`). Ele segue a regra do checklist do triager (`references/triage/checklist.md:89`): `fail` quando há `high` aberto ou TC P0 em `fail`. As duas condições valem aqui:
  - TC-FUNC-005 é P0 (`test-plans/compre-junto-test-plan.md:31`) e está em `fail` com BUG-003 (`qa-result.md:120`);
  - BUG-001 e BUG-002 estão em `high`.
- **TCs:** o envelope traz 47 pass, 11 fail, 0 blocked e 9 skip. Os 11 `fail` têm `bug_ref`: FUNC-005, 014 e 036, UI-001 a 006, CFR-002 e 003.
- **Bugs:** os 13 `issues/BUG-*.md` existem e têm envelope `qa-issue/v1` com `status: open`. Todos têm evidência. Doze citam screenshot em `qa/screenshots/`. BUG-004 só tem o snapshot de acessibilidade, e isso está declarado (`issues/BUG-004.md:66`, `qa-result.md:489`).
- **Severidade:** as quatro subidas estão justificadas pelo impacto na persona (`qa-result.md:387` e o Impacto de cada bug):
  - BUG-001 e BUG-002 são fricção no passo do preço da J-01 (P0), e o BUG-002 atinge a PER-03, que usa leitor de tela;
  - BUG-003 e BUG-005 são cosméticos na página de primeira impressão.
- **Transições:** nenhuma. Não havia bug anterior e não houve reteste (`qa-result.md:248`). Por isso nenhum `cannot-reproduce` depende de confirmação.

Uma correção antes de gravar: o resumo que você apresentou no chat diz "medium 6 · low 5", e está trocado. Pelos arquivos são **medium 5** (BUG-003, 005, 009, 010, 011) e **low 6** (BUG-004, 006, 007, 008, 012, 013). O `qa-result.md` já está certo (`:208` e `:388`). Use 2 high, 5 medium e 6 low na linha `QA · Gate 3 — veredito` do `item.md`.

Pode gravar:
- `**Gate 3:** confirmado em 2026-11-02` no `qa-result.md`;
- a linha no `item.md`, por exemplo `fail · 13 bugs novos (high 2 · medium 5 · low 6) · 0 transições · qa/qa-result.md`.

Nenhum bug foi descartado, então o envelope não muda.

Depois disso, as 3 perguntas ao produto vão pela página. É gate da página, e as respostas são do humano, não minhas. As 21 sugestões de backlog não voltam a este WI.

Para registrar em `orquestrador-decisoes.md`: Gate 3 confirmado pela política do humano (QA local), com a contagem por severidade corrigida para 2/5/6.

## G6 — gate da página (6 itens)

- Etapa: Execução de QA · humano respondeu na página · página web da wi-workflow

**Página:** http://127.0.0.1:8477/

**Respostas (answers.json):**

```json
{
  "wi": "WI-01",
  "respostas": [
    {
      "id": "P-01",
      "escolha": "Contar e somar só o que está completo",
      "texto": "Se tentar adicioanr o conjunto sem selecionar variação o outro dado do produto deve sinalziar com mensagem avisando e marcar o produto adicional."
    },
    {
      "id": "P-01-destino",
      "escolha": "WI novo",
      "texto": ""
    },
    {
      "id": "P-02",
      "escolha": "O pedido segue com ela e a dona resolve — ou decido depois, fica pendente",
      "texto": ""
    },
    {
      "id": "P-02-destino",
      "escolha": "WI novo",
      "texto": ""
    },
    {
      "id": "P-03",
      "escolha": "Decido depois — fica pendente",
      "texto": ""
    },
    {
      "id": "P-03-destino",
      "escolha": "WI novo",
      "texto": ""
    }
  ],
  "enviadoEm": "2026-11-02T21:15:36.707Z"
}
```

## G7 — Gate 3 — confirmação do veredito de QA

- Etapa: Execução de QA · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

> **Pendência do Gate 2**
> - O TC-UI-006 (P2) ficou `blocked` por falta de massa. O banco local não tem pedido com Compre Junto, porque a M-08 temporária foi apagada.
> - Por causa disso, o critério CA-06.4 caiu de `covered` para `partial`.
> - O cartão do recorte com venda ficou provado no reteste do BUG-013, que usou massa temporária.
> 
> **O que pode mudar o veredito ou pedir um bug**
> - **Os charters que não rodaram.** O triager deu `pass`, e não `partial`, porque o único TC bloqueado é P2 e os charters de fora ficaram assim pela regra da confirmação, não por falta de sessão. Se você ler "charter que não rodou" ao pé da letra, o veredito vira `partial`, sem mudar mais nada.
> - **Os nomes cortados no editor de lista em 390.** A tela é deste WI e o defeito é medium. Cada peça aparece como "QA ...", com 38 px de largura. Não é regressão provada: o reteste de BUG-011 diz que já era assim antes daquela correção, mas ela mexeu no `ListItemRow.tsx` e a origem não foi provada. Pela regra da confirmação, ficou no backlog. Se a Adri monta listas pelo celular, você pode promovê-lo a bug neste gate.
> 
> **Riscos que continuam**
> - Os TC P0 TC-FUNC-002 e TC-FUNC-012 seguem em `skip` desde a rodada 1.
> - Nenhum pedido novo foi criado nesta rodada. O valor cobrado no pedido só está provado pelo #0327, que é de antes das correções. A sacola desta rodada bate com o total do bloco.
> - Os testes rodaram em dev server, com rede lenta simulada por atraso de rota e sem leitor de tela real.
> 
> **Ambiente**
> - Arquivei os logs da rodada 1 em `qa/sessions/2026-11-02/`, junto de `qa/retest-2026-11-02.md` e `qa/qa-result-2026-11-02.md`. A skill manda perguntar antes de mover; como não falo com o humano, decidi mover e registro aqui.
> - Subi os dev servers das portas 8082 e 8083 a partir do worktree e já derrubei os dois.
> - O Supabase local já estava de pé e continua de pé.
> - Nada foi gravado no banco. A forma do bloco foi devolvida a "Na linha".
> - Apaguei do checkout principal as cópias de screenshot que o Playwright MCP tinha posto em `.playwright-mcp/`, que é pasta ignorada pelo git.
> - Nada foi commitado.
> 
> Com a confirmação, eu gravo `**Gate 3:** confirmado em 2026-11-03` em `qa/qa-result.md` e a linha `QA · Gate 3 — veredito` no `item.md`. Como não há transição, nenhum bug muda.
> 
> [[WI:QA_EXEC:ASK:Gate 3 — confirmação do veredito de QA]]

**Resposta:**

Decidiu: o Gate 3 da rodada 2 (confirmação) está confirmado, com veredito `pass`, 0 bugs novos e 0 transições. É decisão delegada pela política do humano, pelo item "QA local: … confirmar o veredito (Gate 3) quando batem com o relatório dos agentes e com o que está em `qa/`". Segue a mesma linha da G5, que confirmou o Gate 3 da rodada 1.

O que conferi no disco, sob `.specs/work-items/WI-01-compre-junto/qa/`:
- **O resumo bate com o arquivo.** `qa-result.md:4` diz `"verdict": "pass"`. Em `qa-result.md:106-117` estão 10 TC em `pass` e o TC-UI-006 em `blocked`. Em `qa-result.md:138-141`, `issues.total: 0`. A cobertura dá 42 de 65 (`qa-result.md:36`). Há 41 arquivos `R2-*` em `screenshots/`.
- **O bloqueio do TC-UI-006 está registrado.** Ele é P2 e está `blocked` por falta de massa, com a explicação em `sessions/CH-08-design-check.md:57`. O CA-06.4 caiu para `partial` (`qa-result.md:259`), como a sessão disse.
- **Não há transição a fazer.** Os 13 envelopes `issues/BUG-001.md` a `BUG-013.md` estão com `"status": "resolved"`, e cada um tem a linha do reteste por bug. Sem bug aberto, o retester não rodou, o que está certo (`references/setup/workspace.md:72`).
- **O `pass` se sustenta, mesmo com 3 charters fora.** O checklist (`references/triage/checklist.md:89-90`) e `references/plan/regression.md:73` pedem `partial` quando um charter não roda. Só que a própria skill manda não rodar, na confirmação, o charter cujos TC passaram todos na rodada anterior (`references/setup/workspace.md:70-73`). CH-04, CH-05 e CH-06 ficaram fora por essa regra, e não por falta de sessão. Por isso aceito o `pass`, sem baixar para `partial`.
- **Nome cortado em 390 fica no backlog.** É o editor de lista do painel mostrando cada peça como "QA ...". Na confirmação, só vira bug o que regrediu ou o que é `critical`/`high` (`workspace.md:76-77`). Esse é `medium` e não há regressão provada, então fica em Sugestões de backlog. Não o promovo a bug: a régua da skill decide, e o achado não se perde. Se o humano quiser que a Adri monte listas pelo celular agora, ele pode abrir um WI.

Com a confirmação:
- Grave `**Gate 3:** confirmado em 2026-11-03` em `qa/qa-result.md:147`.
- Acrescente a linha `QA · Gate 3 — veredito` no `item.md`.
- Nenhum bug muda de status.

Para o `orquestrador-decisoes.md`:
- **Logs arquivados sem perguntar.** A sessão moveu os logs da rodada 1 sem fazer a pergunta que `workspace.md:82` pede. O histórico foi preservado, não apagado: `sessions/2026-11-02/` tem os 8 logs, e existem `retest-2026-11-02.md` e `qa-result-2026-11-02.md`. Registro e aceito.
- **Riscos residuais.** Eles continuam declarados em `qa-result.md:371-385`:
  - os TC P0 TC-FUNC-002 e TC-FUNC-012 em `skip` desde a rodada 1;
  - nenhum pedido novo depois das 13 correções;
  - rede lenta e zoom simulados, sem leitor de tela real.
