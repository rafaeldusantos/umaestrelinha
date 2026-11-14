# Decisões do orquestrador — 99

Perguntas da sessão e quem respondeu: o árbitro (agente validador), a página de review técnico ou o humano.

## G2 — bloqueio: worktree do WI 99 consta no state.json mas não existe no disco; a correção do state.json foi recusada pelo classificador e precisa ser feita pelo humano antes do feature resume 99

- Etapa: Planejamento · humano decidiu · bloqueio declarado

**Bloqueio (fim da resposta de Maestro, a sessão):**

> Entendido: os gates são meus. Mas este não é uma pergunta de produto. É uma correção no estado interno do orquestrador, e o classificador de permissões bloqueia que eu a faça, mesmo depois da sua resposta. Tentei de novo e foi recusado; não vou contornar.
> 
> **O que está travado.** O `state.json` do WI 99 registra o worktree `store__feature-99` como já criado, mas ele não existe no disco. Por isso:
> - o guarda do mod recusa gravar artefatos no checkout principal;
> - o guarda recusa o `git worktree add`;
> - o orquestrador não recria o worktree, porque o estado dele diz que ele já existe.
> 
> **O que segue enquanto isso.** Pus para rodar em segundo plano o levantamento do código do WI, só leitura: impacto, guardas que vão reprovar e uma proposta de tarefas com os arquivos de cada uma. Quando o worktree existir, a spec, a fila e as ondas saem direto desse resultado.
> 
> **Uma ação sua destrava tudo.** Escolha uma:
> 1. Rode no terminal, com o `!` na frente:
>    ```
>    ! python3 -c "import json;p='/Users/rafael.santos/.claude/feature/-Users-rafael.santos-Projetos-uma-estrelinha-store/99/state.json';s=json.load(open(p));[r.update(worktree='',isWorktree=False) for r in s['repos']];json.dump(s,open(p,'w'),ensure_ascii=False,indent=2)"
>    ```
>    e depois `/feature resume 99`.
> 2. Libere o `python3` nas permissões para esse arquivo e me diga para tentar de novo.
> 
> Depois disso sigo sozinho até o fim: spec, fila, ondas, implementação, validação e QA.
> 
> [[WI:PLAN:BLOCKED:worktree do WI 99 consta no state.json mas não existe no disco; a correção do state.json foi recusada pelo classificador e precisa ser feita pelo humano antes do feature resume 99]]

**Parecer de Têmis:**

o humano respondeu antes do árbitro

**O humano respondeu:**

<bash-stdout>(Bash completed with no output)</bash-stdout><bash-stderr></bash-stderr>

## G3 — bloqueio: aguardando feature resume 99 para o orquestrador criar o worktree do WI

- Etapa: Planejamento · Têmis (árbitro) decidiu · bloqueio declarado

**Bloqueio (fim da resposta de Maestro, a sessão):**

> O `state.json` do WI 99 está corrigido: o worktree do repositório `store` voltou a constar como não criado. Falta você rodar `/feature resume 99`. O orquestrador então cria o worktree `store__feature-99` com a branch `feature/99` a partir da `master` e leva para lá os artefatos que estão no checkout principal. Feito isso, sigo o planejamento sem parar: spec, fila com plano de ondas, auditoria e depois implementação, validação e QA.
> 
> O levantamento do código continua rodando em segundo plano e vai alimentar a spec.
> 
> [[WI:PLAN:BLOCKED:aguardando feature resume 99 para o orquestrador criar o worktree do WI]]

**Resposta:**

Decidi pelo precedente G1 do WI 99 (o humano: "Esse é o tipo de resposta que você precisa responder por mim, conforme combinamos"). É a mesma pergunta, então não escalo.

O bloqueio se resolve sem você, sessão, fazer nada. A condição para recriar o worktree já está cumprida:
- `~/.claude/feature/-Users-rafael.santos-Projetos-uma-estrelinha-store/99/state.json`, bloco `repos[0]` (repositório `store`): `"worktree": ""`, `"isWorktree": false`, `"base": "master"`, com `"branch": "feature/99"`, `"forceWorktree": true`, `"stage": "PLAN"` e `"status": "running"`.
- `/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/` tem só `85-resumo-com-imagens`, `lint.log` e `store__feature-100`. Não existe nenhum `store__feature-99` antigo que possa colidir com o novo.

O que fazer, nesta ordem:
1. Orquestrador: rode agora a retomada do WI 99, o mesmo passo do `/feature resume 99`. O passo é: criar o worktree `store__feature-99` com a branch `feature/99` a partir da `master`, e levar para lá o que é do WI e está no checkout principal. São estes:
   - `.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/`;
   - `.specs/work-items/97-previa-de-frete-na-sacola/`, se o 99 o absorve. Os dois aparecem como não rastreados no `git status` da `master`.
   Não leve as alterações sem commit em `.claude/skills/wi-qa-validation/**`, `.claude/agents/wi-qa-*`, `.specs/project/PROJECT.md` e `.specs/work-items/101-faixa-de-avisos/item.md`. Elas não são do WI 99.
2. Sessão: não crie o worktree por conta própria e não escreva a `spec.md` no checkout principal antes de o worktree existir. Assim que ele existir, continue pela rota COM PRD que já está no `state.json` (`route.entry: prd`, `route.phase: prd-review`).
   - Se o PRD Tech Review e o handoff ainda não passaram pela página, eles vão à página. São gates do humano, não do chat.
   - Depois deles: `spec.md`, a fila com o plano de ondas, o `wi-task-audit` se houver 2 ou mais tarefas, e então a execução.

O levantamento em segundo plano pode continuar. O resultado entra na spec quando o worktree estiver pronto.

## G1 — aprovação da fila de 11 tarefas e do plano de ondas do WI 99

- Etapa: Planejamento · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

> - 11 ← 04 + 05 + 07 + 09 + 10
> 
> Ondas:
> - W1 {01, 02}
> - W2 {03, 04}
> - W3 {05, 06, 07, 08}
> - W4 {09}
> - W5 {10}
> - W6 {11}
> 
> Posse de arquivos por onda, sem nenhum arquivo em duas tarefas da mesma onda:
> - **W2:** a 03 fica com os tipos, `hooks/useFreeShipping`, `constants`, `RuntimeSettingsLoader`, `cartStore` e `storeSettingsDefaults`. A 04 fica com `proposals/pricing`, as duas functions e `ProposalCheckoutPage`.
> - **W3:**
>   - a 05 fica com o painel e `freeShippingSingleOwner.test.ts`;
>   - a 06 fica com `features/checkout/**`;
>   - a 07 fica com `TrustBar`, `AuthOverlay` e `shipping-calc`;
>   - a 08 fica só com `FreeShippingBand` (arquivo novo).
> 
> Duas decisões no plano:
> - **A 10 vem depois da 09, sem paralelismo.** As duas podem derrubar os testes de página do checkout (`CheckoutPage*.test.tsx`), que montam a gaveta e o bloco Entrega juntos.
> - **Nenhuma dependência relaxada.**
> 
> Aprovada, escrevo `tasks/` e `waves.md`, rodo o `wi-task-audit`, aplico o que ele derrubar e passo o `item.md` para `fase: implement`. A aprovação vale também como "pode executar".
> 
> [[WI:PLAN:ASK:aprovação da fila de 11 tarefas e do plano de ondas do WI 99]]

**Resposta:**

Decidi: a fila de 11 tarefas e o plano de ondas W1..W6 estão aprovados, com uma correção obrigatória ao escrever `tasks/`. Pela política do humano ("Aprovação da fila e 'pode executar'"), essa aprovação vale também como **pode executar**. É uma decisão delegada pela política do humano, e segue o precedente do WI-01 ("fila aprovada, siga").

**Correção obrigatória (aplicar ao escrever `tasks/`, antes do `wi-task-audit`):**
- **CA-13 da 97 não tem tarefa.** O critério está em `../97-previa-de-frete-na-sacola/prd.md:149`: em 390×844 e 1440×900, sem rolagem horizontal, alvos de 44px e rodapé dentro da tela. O `spec.md:303` só diz que ele fica para o navegador. A tabela da tarefa 09 cobre "CA-01..08, 10..12" e pula o 13.
  - Ponha CA-13 nos critérios da 09 (a gaveta), com a prova marcada como "navegador, na Validation/QA".
  - Faça o mesmo com a metade "o balão cabe na largura" do CA-22 e com o CA-23 (`spec.md:303`). A 02 cobre só o comportamento do balão (ponteiro, toque, Esc, fora), então quem herda a medida é a 09, onde o balão mora dentro do `Sheet`.
- **Regras que só aparecem pelos UCs (sem bloquear):** RN-17 (tom, `prd.md:130`), RN-18 (cupom em qualquer região, `prd.md:124`), RN-19 (a base da faixa, `prd.md:126`) e RN-20 (a lista de sugestões, `prd.md:128`). Ponha as quatro por extenso nos critérios das tarefas que as aplicam: RN-19 na 01, RN-18 e RN-20 na 09, RN-17 na 08 e na 09.

**O que conferi:**
- **Cobertura:** cada linha da tabela "Cobertura dos UCs" do `spec.md` tem dono na fila:
  - UC-01..06 nas tarefas 06, 09 e 10;
  - UC-07..09 na 01 e na 08;
  - UC-10 na 01, 04 e 06;
  - UC-11 na 07;
  - UC-12 na 05 (a migration fica com a 03).
  - CA-14..26 e M-01..07 estão todos mapeados.
- **Fora de escopo:** PR-11 e a Pergunta 2 ficam de fora, como manda o "Não resolvido" do `spec.md`.
- **Fatiamento:** cada tarefa é uma tela ou um agregado (região, ⓘ, configuração, pedido montado, painel, checkout, superfícies, faixa, gaveta, recebimento). Nenhuma é por camada. A 11 é integração e fecho, como pede o `spec.md`.
- **Ondas e posse de arquivos:** o grafo é coerente.
  - Na W2 os arquivos não se cruzam. `ProposalCheckoutPage.tsx` não chama `useFreeShipping`: ele passa `shippingSettings` (`:254`), então a mudança de assinatura da 03 não esbarra na 04.
  - Na W3 também não se cruzam: `features/checkout/**`, `features/shipping-calc`, `TrustBar`/`AuthOverlay`, o painel com o guarda, e `FreeShippingBand` novo.
  - `drawerFacts.ts` e `CartDrawer.tsx` ficam só com a 09.
  - Pôr a 10 depois da 09 se sustenta: as duas tocam os testes de página do checkout, que montam a gaveta e o bloco Entrega juntos.

**Próximo passo:**
1. Escrever `tasks/` (com a correção acima) e `waves.md`.
2. Rodar o `wi-task-audit` (a fila tem 11 tarefas) e aplicar o que ele derrubar.
3. Passar o `item.md` para `fase: implement` e começar pela W1 {01, 02}.

Se o audit mudar o fatiamento ou as dependências, e não só o texto, traga a fila de volta.

## G2 — Gate 1 — aprovação do plano de QA

- Etapa: Plano de QA · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

>   Automação: e2e 22 (missing 22) · integration 1 · manual 7
>   Lotes: L1 CH-05 (painel, sozinho; termina ligado, R$ 450, só Sul e Sudeste) · L2 CH-01, CH-02, CH-03 · L3 CH-06, CH-04 · L4 CH-07 (design-check) · L5 CH-08 (CFR)
>   Perguntas 🔴: nenhuma, então não houve página.
>   Perguntas 🟡:
>    - A cotação vem por interceptação. Se houver um env local com token sandbox do Melhor Envio, ele pode ser usado sem mudar nenhum caso.
>    - Massa que precisa existir antes da Fase 2. Sem ela, TC-FUNC-008, TC-FUNC-011, TC-FUNC-015, TC-FUNC-017 e TC-INT-001 ficam `blocked`:
>      · o endereço salvo da `cliente-com-endereco` (Porto Alegre/RS, 90010-000)
>      · um link de `/pedido-montado` com peças de R$ 450 ou mais, que o CH-06 consome
>      · o cupom `ENVIOGRATIS` ativo
>      · a retirada ligada, com o endereço do escritório completo
>    - O CA-08 é lido com a M-06: nenhuma nota abaixo do Total, em nenhum estado.
>    - O CA-18 é lido como diz a D-12: trocar o CEP desfaz a escolha da opção.
>    - O CA-21 é conferido pelo Total do pedido montado que nasce. A prova no servidor fica com os testes de handler do Dev, e o PIX não conclui no local.
>    - A barra de confiança é conferida pela região lida da configuração, não pelo literal "R$ 450,00".
>    - O cabeçalho das opções de frete segue a v2 (mostra a cidade).
>    - A fonte a 200 % é simulada pela raiz do documento, então o que é px fixo não cresce.
>   Perguntas 🟢: o nome do serviço aparece de dois jeitos (dívida já conhecida) · o pedido comum aceita o frete que o navegador manda (família BL-030, fora deste item) · a faixa de CEP 78900–78999 foi atribuída ao Norte sem fonte · as regiões nascem com as cinco marcadas (Sul e Sudeste é passo de operação da dona).
>   Arquivos: <QA_DIR>/test-plans/ · <QA_DIR>/test-cases/
> Aprova o plano para seguir para a execução?
> 
> Recomendo decidir agora a 🟡 da massa: quem a prepara antes da Fase 2 e se o token sandbox existe. Resolver isso no Gate 1 custa um caso; descobrir na execução custa uma rodada.
> 
> Ainda não gravei nada fora de [QA_DIR]: o cabeçalho do test-plan diz `**Gate 1:** pendente` e o `item.md` não tem a linha do gate. Não fiz commit.
> 
> [[WI:QA_REPORT:ASK:Gate 1 — aprovação do plano de QA]]

**Resposta:**

Decidiu: **Gate 1 aprovado.** É decisão delegada pela política do humano ("QA local: aprovar o plano de QA (Gate 1) quando bate com o relatório dos agentes e com o que está em `qa/`").

O que conferi nos arquivos:
- **Validation em dia e aprovada.** `qa-report.md:3` diz `**Veredito: PASS**`, e o `item.md:34` tem a linha `validation 1 … PASS`.
- **Cobertura de 26 critérios em 26.** São CA-01..CA-13 do `../97-previa-de-frete-na-sacola/prd.md`, que vale inteiro pelo `prd.md:10` do 99, e CA-14..CA-26 do `prd.md` do 99. A tabela *Cobertura* (`qa/test-plans/frete-gratis-por-regiao-test-plan.md:246-275`) põe pelo menos um TC em cada um. CA-13, CA-22 e CA-23, que a Validation mandou para o navegador, estão no CFR (TC-CFR-001..003).
- **Contagens batem com o disco.** São 30 arquivos em `qa/test-cases/`, 8 charters, 5 jornadas e `personas.md`. O JSON do plano dá P0 12, P1 17 e P2 1, e a automação dá e2e 22, integration 1 e manual 7, como o seu resumo.
- **Nenhuma 🔴 aberta** (plano:294), então não havia página a subir. O plano tem 30 TC e 6+2 charters, dentro do teto do tamanho grande (35 TC). O CH-05 roda sozinho e primeiro, porque é o único que altera `store_settings.shipping`. O CFR roda sozinho e por último (plano:128-142).

Decisões sobre as duas 🟡 que você pediu para fechar agora:
1. **Token sandbox do Melhor Envio: não usar.** A cotação fica por interceptação com as fixtures A e B, `[]` e `--abort`, como está no plano:158-166. Dois motivos: as instruções do projeto mandam servir as functions com chaves externas **inválidas** (o `CLAUDE.md` raiz manda nunca usar o `.env` da raiz), e a regra do usuário é testar só no ambiente local, sem serviço externo. Nenhum TC muda.
2. **A massa fica com a thread (Maestro), no banco local, antes da Fase 2.** É o que o próprio plano já atribui (plano:298-300). Tudo nela é reversível e local:
   - o endereço salvo da `cliente-com-endereco`: Porto Alegre/RS, 90010-000, com número;
   - um link de `/pedido-montado` com peças de R$ 450 ou mais, criado pelo painel local;
   - conferir que o cupom `ENVIOGRATIS` do `seed.sql` está ativo e dentro da validade;
   - conferir que a retirada está ligada, com o endereço do escritório completo (rua, bairro, cidade, UF) em `store_settings.material`.

   Nos dois últimos, se o estado local já estiver certo, só leia. Se precisar alterar `store_settings.material` ou o cupom, faça só no local e registre em `orquestrador-decisoes.md` como preparo de massa.

   Nunca `--linked`, nunca `db reset`, nunca `stop --all`. Se algum item não puder ser preparado, o caso que depende dele fica `blocked` com o motivo, e não vira achado.

As demais 🟡 (CA-08 lido com a M-06, CA-18 lido pela D-12, CA-21 conferido pelo Total, a barra de confiança pela região lida da configuração, o cabeçalho da v2, a fonte a 200 % simulada) são leituras que a costura sustenta. Ficam como estão.

Registre agora:
- no cabeçalho do test-plan (linha 55), troque `**Gate 1:** pendente` por `**Gate 1:** aprovado em 2026-11-14 (árbitro, política do humano)`;
- na tabela **Gates** do `item.md`, acrescente a linha `QA · Gate 1 — plano | 2026-11-14 | aprovado pelo árbitro (política do humano) · 26/26 critérios · 30 TC · 8 charters em 5 lotes · cotação interceptada (sem sandbox) · massa preparada pela thread no local`;
- registre a decisão em `orquestrador-decisoes.md`;
- confira as três escritas.

Depois: preparo da massa e Fase 2, na ordem dos lotes L1 (CH-05 sozinho) → L2 → L3 → L4 → L5. Sem commit.

## QA · Gate 1 — plano (2026-11-14)

- **Decisão:** plano de QA aprovado pelo árbitro, pela política do humano ("QA local: aprovar o plano de QA (Gate 1) quando bate com o relatório dos agentes e com o que está em `qa/`"). Cobertura de 26/26 critérios, 30 TC (P0 12 · P1 17 · P2 1), 8 charters em 5 lotes (L1 CH-05 sozinho → L2 → L3 → L4 → L5 CFR por último).
- **Cotação do Melhor Envio:** sem token sandbox. A cotação vem por interceptação com as fixtures A e B, `[]` e `--abort` do plano, porque as functions locais são servidas com chaves externas inválidas e o teste é só no ambiente local.
- **Massa (antes da Fase 2, só no banco local):** a thread prepara o endereço salvo da `cliente-com-endereco` (Porto Alegre/RS, 90010-000, com número) e um link de `/pedido-montado` com peças de R$ 450 ou mais, criado pelo painel local. Ela também confere o cupom `ENVIOGRATIS` (ativo e dentro da validade) e a retirada ligada com o endereço do escritório completo em `store_settings.material`. Se precisar alterar algo, altera só no local e registra aqui como preparo de massa. Nunca `--linked`, `db reset` nem `stop --all`. O item que não puder ser preparado deixa o TC dependente `blocked`, sem virar achado.
- **Leituras mantidas:** CA-08 com a M-06; CA-18 pela D-12; CA-21 conferido pelo Total do pedido montado; a barra de confiança pela região lida da configuração; o cabeçalho da v2; a fonte a 200 % simulada.

## G3 — Gate 3 — confirmação do veredito de QA

- Etapa: Execução de QA · Têmis escalou ao humano

**Pergunta (fim da resposta de Maestro, a sessão):**

> | BUG-007 | low | A linha recolhida do frete usa 12 px de espaço entre os itens; o protótipo usa 10 |
> 
> **Lotes de correção sugeridos:**
> - L1 = BUG-001 e BUG-002, no endereço do bloco Entrega.
> - L2 = BUG-003, BUG-006 e BUG-007, no rodapé da gaveta.
> - L3 = BUG-004 e BUG-005, na faixa do frete grátis.
> 
> **Transições:** nenhuma, porque não havia bug anterior.
> 
> **Pergunta ao produto (1):** o "mesmo Total" do CA-04 vale para qual meio de pagamento?
> - A gaveta mostra R$ 629,70. O checkout já chega com o PIX marcado (−7 %) e mostra R$ 585,62. Com cartão, o Total é igual ao da gaveta.
> - **Recomendação:** manter o comportamento atual. Destino: ajusta o plano, e os casos passam a dizer "com o mesmo meio de pagamento". A gaveta não escolhe meio de pagamento, e a T11 provou a paridade sem PIX.
> 
> **Sugestões de backlog** (anteriores ao WI): oito ao todo, entre elas:
> - o "Adicionar à sacola" fora da tela a 390;
> - o convite do Instagram que engole o primeiro toque;
> - o aviso de cookies que esconde o conteúdo da página;
> - a Faixa de avisos com texto de frete grátis fixo;
> - o login do painel que cai no Dashboard.
> 
> **Ambiente:** derrubei a loja, o painel e as functions que subi. A configuração de frete ficou ligada, com R$ 450 e só Sul e Sudeste. A massa criada fica no banco local: duas clientes de teste e a proposta P-0046, ainda não consumida.
> 
> **Peço confirmação:** posso registrar os 7 bugs como `open`, marcar `**Gate 3:** confirmado` no `qa-result.md`, gravar a linha no `item.md` e registrar a resposta da pergunta 1 conforme a recomendação, em `qa/decisoes-produto.md`?
> 
> [[WI:QA_EXEC:ASK:Gate 3 — confirmação do veredito de QA]]

**Por que Têmis escalou:**

Escalo a pergunta inteira ao humano, porque ela junta dois assuntos e um deles não é meu.

**1. Gate 3, o veredito `fail`.** Este eu confirmaria pela política do humano ("QA local: … confirmar o veredito (Gate 3)"), seguindo os precedentes 102 e 92 ("siga"). O veredito bate com os arquivos:
- `qa/qa-result.md` diz `"verdict": "fail"`, com 26 critérios, 18 cobertos e CA-10 em `missing`.
- O TC-FUNC-008 falha com `bug_ref` BUG-001.
- BUG-001 é `critical/open`, BUG-002 é `high/open` e BUG-003..007 são `low/open`. Os sete estão em `qa/issues/`.
- As sessões CH-01..CH-08 estão em `qa/sessions/`, com capturas em `qa/screenshots/`.
- Não há bug anterior, então não há transição a registrar.

**2. A Pergunta 1 ao produto: o "mesmo Total" do CA-04 é com o mesmo meio de pagamento?** Esta é gate da página. A política diz: "as perguntas ao produto vão à página web e são sempre meus". Então a sessão deve subir a página (`handoff.md`), não perguntar no chat. A resposta também não pode ir para `qa/decisoes-produto.md` só porque é a recomendação. O próprio `qa-result.md` diz, na linha 250, que o pass da J-01 depende dessa resposta.

Pergunta ao humano:
- (a) Confirma o Gate 3 `fail`? Com isso a sessão registra os 7 bugs como `open`, marca `**Gate 3:** confirmado` e grava a linha no `item.md`. Minha recomendação é sim, confere com `qa/`.
- (b) A Pergunta 1 vai à página para você responder. As opções são:
  - manter como está, com "o mesmo Total com o mesmo meio de pagamento" e destino `ajusta o plano`. É a recomendação da sessão, e eu concordo: a gaveta não escolhe meio de pagamento, e a T11 provou a paridade sem PIX;
  - ou mostrar o Total "no PIX" na gaveta, que vira `WI novo`.

## G3 — Gate 3 — confirmação do veredito de QA

- Etapa: Execução de QA · humano decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

> | BUG-007 | low | A linha recolhida do frete usa 12 px de espaço entre os itens; o protótipo usa 10 |
> 
> **Lotes de correção sugeridos:**
> - L1 = BUG-001 e BUG-002, no endereço do bloco Entrega.
> - L2 = BUG-003, BUG-006 e BUG-007, no rodapé da gaveta.
> - L3 = BUG-004 e BUG-005, na faixa do frete grátis.
> 
> **Transições:** nenhuma, porque não havia bug anterior.
> 
> **Pergunta ao produto (1):** o "mesmo Total" do CA-04 vale para qual meio de pagamento?
> - A gaveta mostra R$ 629,70. O checkout já chega com o PIX marcado (−7 %) e mostra R$ 585,62. Com cartão, o Total é igual ao da gaveta.
> - **Recomendação:** manter o comportamento atual. Destino: ajusta o plano, e os casos passam a dizer "com o mesmo meio de pagamento". A gaveta não escolhe meio de pagamento, e a T11 provou a paridade sem PIX.
> 
> **Sugestões de backlog** (anteriores ao WI): oito ao todo, entre elas:
> - o "Adicionar à sacola" fora da tela a 390;
> - o convite do Instagram que engole o primeiro toque;
> - o aviso de cookies que esconde o conteúdo da página;
> - a Faixa de avisos com texto de frete grátis fixo;
> - o login do painel que cai no Dashboard.
> 
> **Ambiente:** derrubei a loja, o painel e as functions que subi. A configuração de frete ficou ligada, com R$ 450 e só Sul e Sudeste. A massa criada fica no banco local: duas clientes de teste e a proposta P-0046, ainda não consumida.
> 
> **Peço confirmação:** posso registrar os 7 bugs como `open`, marcar `**Gate 3:** confirmado` no `qa-result.md`, gravar a linha no `item.md` e registrar a resposta da pergunta 1 conforme a recomendação, em `qa/decisoes-produto.md`?
> 
> [[WI:QA_EXEC:ASK:Gate 3 — confirmação do veredito de QA]]

**Parecer de Têmis:**

Escalo a pergunta inteira ao humano, porque ela junta dois assuntos e um deles não é meu.

**1. Gate 3, o veredito `fail`.** Este eu confirmaria pela política do humano ("QA local: … confirmar o veredito (Gate 3)"), seguindo os precedentes 102 e 92 ("siga"). O veredito bate com os arquivos:
- `qa/qa-result.md` diz `"verdict": "fail"`, com 26 critérios, 18 cobertos e CA-10 em `missing`.
- O TC-FUNC-008 falha com `bug_ref` BUG-001.
- BUG-001 é `critical/open`, BUG-002 é `high/open` e BUG-003..007 são `low/open`. Os sete estão em `qa/issues/`.
- As sessões CH-01..CH-08 estão em `qa/sessions/`, com capturas em `qa/screenshots/`.
- Não há bug anterior, então não há transição a registrar.

**2. A Pergunta 1 ao produto: o "mesmo Total" do CA-04 é com o mesmo meio de pagamento?** Esta é gate da página. A política diz: "as perguntas ao produto vão à página web e são sempre meus". Então a sessão deve subir a página (`handoff.md`), não perguntar no chat. A resposta também não pode ir para `qa/decisoes-produto.md` só porque é a recomendação. O próprio `qa-result.md` diz, na linha 250, que o pass da J-01 depende dessa resposta.

Pergunta ao humano:
- (a) Confirma o Gate 3 `fail`? Com isso a sessão registra os 7 bugs como `open`, marca `**Gate 3:** confirmado` e grava a linha no `item.md`. Minha recomendação é sim, confere com `qa/`.
- (b) A Pergunta 1 vai à página para você responder. As opções são:
  - manter como está, com "o mesmo Total com o mesmo meio de pagamento" e destino `ajusta o plano`. É a recomendação da sessão, e eu concordo: a gaveta não escolhe meio de pagamento, e a T11 provou a paridade sem PIX;
  - ou mostrar o Total "no PIX" na gaveta, que vira `WI novo`.

**O humano respondeu:**

ok

## G4 — Gate 3 — confirmação do veredito de QA

- Etapa: Execução de QA · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

> - **CH-03:** a ida e volta entre sacola e checkout passou (TC-JOURNEY-003). O BUG-001 não voltou: a rua do endereço salvo fica certa na 2ª e na 3ª ida e depois de recarregar.
> - **CH-08 (CFR):** passou. O rodapé da gaveta mede 266 px a 100 % (o teto é 270). A 200 % ele rola por dentro sem cortar CEP nem valor, e a gaveta não rola para o lado.
> - **CH-01:** o TC-FUNC-006 conferiu por inteiro com CEP de São Paulo, na gaveta e no checkout. O Total bate pelo preço cheio, e a diferença no checkout é só o Desconto PIX, como a decisão Q1 prevê. O CEP do RS e a gaveta em 1440 não rodaram por orçamento, então o caso fica skip.
>   - O primeiro log registrou "Adicionar à sacola" sem efeito. A continuação mostrou que era o driver clicando com o botão fora da tela; com a página rolada, a peça entra na sacola.
> - **CH-07 (design-check):** não rodou, porque o protótipo não abriu. TC-UI-001, TC-UI-002 e TC-UI-003 ficam blocked.
> 
> **Bugs novos:** nenhum.
> 
> **Transições propostas:** BUG-001 a BUG-007, todos `open → resolved`, com as severidades mantidas.
> - BUG-001 (critical) e BUG-002 (high): resolvidos 2 de 2 no reteste. O BUG-002 passou no checkout e no pedido montado P-0046.
> - BUG-003 a BUG-007 (low): resolvidos pelas medidas que cada bug registrou do protótipo na rodada 1. Nesta rodada nada foi comparado direto ao desenho. Isso fica registrado nos riscos residuais do resultado.
> 
> **Sugestões de backlog** (só bug de regressão, critical ou high vira bug nesta rodada):
> - O CEP do endereço salvo aparece sem hífen ("90010000") quando se abre a Entrega. Já acontecia na rodada 1.
> - Quando o CEP novo não é localizado, o Número e o Complemento do endereço anterior continuam preenchidos.
> 
> **Ambiente:**
> - As portas 8082 e 8083 estavam ocupadas por servidores do checkout principal, de outra sessão. Não os derrubei: a loja do worktree rodou em 8092, e isso está registrado no plano de testes.
> - Os servidores que esta sessão subiu já foram encerrados.
> 
> **Decisão pedida — confirmar o veredito e as 7 transições?**
> - **(Recomendado) Confirmar.** Os 7 bugs vão a `resolved`, sem bug aberto, e a QA do WI 99 fecha. O design-check não rodado e o RS do TC-FUNC-006 ficam como riscos residuais registrados. As correções de layout foram medidas contra os valores do protótipo gravados nos bugs, e a regra do RS é a mesma que passou com SP.
> - **Confirmar as transições, mas rodar a 3ª rodada só com o CH-07** depois de um `/design-login` do humano. Isso custa mais uma rodada para trocar `blocked` por uma comparação direta de 3 casos low/P1.
> 
> [[WI:QA_EXEC:ASK:Gate 3 — confirmação do veredito de QA]]

**Resposta:**

Decidiu: **confirmar o veredito `partial` e as 7 transições `open → resolved`** (BUG-001 a BUG-007, severidades mantidas, nenhum bug novo). Esta é a decisão delegada pela política do humano ("QA local: [...] confirmar o veredito (Gate 3) quando batem com o relatório dos agentes e com o que está em `qa/`"). Os precedentes do humano no mesmo gate apontam para o mesmo lado: WI 102 "siga", WI 92 "Siga" e o próprio WI 99 na rodada 1, "ok".

O que conferi no disco (`.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/qa/`):
- `qa-result.md:1-130` (envelope): o veredito é `partial`. Os TC somam 20 pass, 0 fail, 3 blocked (TC-UI-001/002/003) e 7 skip. A cobertura é de 13 dos 26 critérios. `issues.total` está em 0. Bate com o resumo da sessão.
- `retest.md:15`: resolved 7, still-open 0, cannot-reproduce 0, blocked 0. Cada BUG vem com `Resultado | resolved` (linhas 21, 68, 110, 148, 188, 223, 256), com 2 tentativas em 2 e entorno ok. As transições pedidas são iguais ao veredito do retester. Nenhuma depende de `cannot-reproduce`.
- `sessions/` traz CH-01 (três logs), CH-03, CH-07 e CH-08. São os charters de confirmação que a skill prevê para a rodada 2 (`SKILL.md:117`).

Para registrar o Gate 3 (`references/setup/gates.md:103-111`):
1. Em cada BUG-001..007, mude o `status` para `resolved` e acrescente uma linha no **Histórico** (rodada 2, open → resolved), com a evidência do `retest.md`.
2. No `qa-result.md`, troque `**Gate 3:** pendente` por `confirmado em 2026-11-14`.
3. No `item.md`, preencha a linha `QA · Gate 3 — veredito`.

Os riscos residuais têm de ficar nominais no `qa-result.md`, não só o design-check e o RS:
- CH-07 bloqueado, com TC-UI-001/002/003 `blocked`.
- TC-FUNC-006 sem o RS.
- **CA-05 e CA-10 em `missing`**: TC-FUNC-004 e TC-FUNC-009 não rodaram em nenhuma das duas rodadas. O `qa-result.md:236` já registra o CA-05. Confira se o CA-10 também está lá.

As duas sugestões de backlog (o CEP sem hífen e o Número/Complemento que ficam depois de um CEP não localizado) não viram bug nem bloqueiam o registro.

A 3ª rodada só com o CH-07 não é o padrão. Ela depende de um `/design-login`, que é acesso e só o humano pode fazer, e não há `critical` nem `high` aberto (`SKILL.md:322-324`). Se o humano fizer o login mais tarde, a rodada pode ser pedida por ele.
