# Decisões do orquestrador — 103

Perguntas da sessão e quem respondeu: o árbitro (agente validador) ou o humano.

## G1 — Gate 1 — aprovação do plano de QA

- Etapa: Plano de QA · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

> - **Uma conta só:** há uma conta de admin (`admin-loja`), então os charters dela não dividem lote.
> - **CH-05 antes do CH-04:** o CH-05 precisa da campanha "Natal" ainda sem bloco.
> - **CH-06 por último entre os P0:** ele deixa a loja uns 25 minutos sem campanha em vigência. É o charter da virada: cria uma campanha com início daqui a 8 minutos e confere a loja antes, durante e depois.
> 
> **O que a execução precisa resolver antes de começar:**
> - **Validation:** precisa passar.
> - **Portas:** confirmar que 8082 e 8083 são deste worktree.
> - **Prévia:** precisa do `VITE_STORE_URL` no painel, senão não acende.
> - **Massa:** a thread de execução prepara pelo painel, antes do primeiro lote, conforme o manifesto da seção Ambiente.
> - **Driver:** precisa de bloqueio de rota e rede lenta. Sem emulação de fuso, só uma variação do CH-06 fica `skip`.
> 
> **Notas 🟢:**
> - uma segunda conta de admin encurtaria a rodada em um lote;
> - a dica do campo nome no cadastro de campanhas está desatualizada (o nome só vira título quando o título do bloco está vazio). O cadastro está fora deste WI, então isso é sugestão de backlog.
> 
> Quando o plano for aprovado, troco `pendente` por `aprovado em <data>` no cabeçalho do test-plan. A linha `QA · Gate 1 — plano` do `item.md` fica para a Execução de QA.
> 
> Arquivos em `/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103/.specs/work-items/103-joias-em-oferta-configuravel/qa/`:
> - test-plans/joias-em-oferta-configuravel-test-plan.md
> - test-plans/personas.md
> - test-plans/journeys/ (J-01 a J-05)
> - test-plans/charters/ (CH-01 a CH-08)
> - test-cases/ (32 TC)
> 
> [[WI:QA_REPORT:ASK:Gate 1 — aprovação do plano de QA]]

**Resposta:**

Decidiu: **plano de QA aprovado (Gate 1).** É decisão delegada pela política do humano, regra "QA local: aprovar o plano de QA (Gate 1) [...] quando batem com o relatório dos agentes e com o que está em `qa/`". Não há pergunta 🔴, então nada vai à página.

O que conferi nos arquivos (pasta base `/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103/.specs/work-items/103-joias-em-oferta-configuravel/`):

- **Cobertura:** o `prd.md` tem 27 critérios CA (linhas 43–90, CA-01.1 a CA-06.1) e os 8 RNF (linhas 93–100). A tabela de Cobertura do `qa/test-plans/joias-em-oferta-configuravel-test-plan.md` (linhas 291–331) liga cada um deles a pelo menos um TC. Nenhum critério ficou sem cobertura.
- **Perguntas:** a seção Perguntas do test-plan (linha 348) diz "🔴 nada". As 🟡 do resumo são as mesmas do arquivo e só registram como cada critério será lido no teste, sem mudar escopo nem comportamento.
- **TC:** em `qa/test-cases/` há 32 arquivos, com prioridade P0 11, P1 19 e P2 2. Bate com o resumo.
- **Charters:** são 8 em 7 lotes, na tabela das linhas 129–153. O CFR (CH-07) roda sozinho no L7, por último. Nenhum lote junta duas sessões de `admin-loja`: o L2 junta CH-02, que usa a conta `anonima`, com CH-03. O motivo da ordem (CH-05 antes do CH-04, CH-06 por último entre os P0) está escrito no próprio plano. Tudo fica dentro do teto de 35 TC do tamanho "grande".
- **Ambiente:** as portas 8082/8083, os bloqueios `**/*.supabase.co/**` e `**/g/collect*` e o Mailpit em :54444 conferem com o `.specs/project/PROJECT.md:45-49`.

Uma correção de fato no que a sessão disse: o `qa-report.md` **já existe**, com `**Status**: PASS` (linha 118), escrito às 23:24, depois do plano (22:10). A linha da validation 1 está no `item.md:31`. Então a condição "a Validation precisa passar", que a sessão listou como pendência da execução, já está cumprida e o Gate técnico da Fase 2 abre.

Próximo passo:
1. Trocar `**Gate 1:** pendente` (test-plan, linha 56) por `aprovado em 2026-11-16 (decisão delegada pela política do humano)` e rodar `plano.registrar`.
2. Registrar a decisão em `orquestrador-decisoes.md`.
3. Para a execução, continuam valendo as pendências que a sessão listou: confirmar que as portas 8082/8083 são deste worktree, conferir o `VITE_STORE_URL` do painel para a prévia e preparar a massa antes do L1.

Lembrete da skill (`pd-qa-validation/references/setup/gates.md:60-61`): no modo `planejar`, aprovar o plano não autoriza a execução, e a rodada termina aqui. A execução é a próxima rodada, no modo `executar`.

## G2 — Gate 3 — confirmação do veredito de QA

- Etapa: Execução de QA · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

> | BUG-004 | medium | Com a fonte a 200 % no celular, o botão "Salvar seção" sai da tela. | RNF-04 |
> | BUG-005 | medium | Quando a leitura das peças da campanha falha, o editor fica em "Conferindo…" sem fim e não avisa da falha. | CA-04.3 |
> | BUG-006 | medium | A peça escolhida que foi apagada fica fora da contagem "N das M saíram do ar". A linha mostrou "1 das 6" quando deveria ser "2 das 7". | CA-04.1 |
> 
> **Transições propostas:** nenhuma. Não havia bug aberto antes desta rodada.
> 
> **Descartes:** nenhum. Os achados que não viraram bug estão listados no `qa-result.md`:
> - **Repetidos:** juntados a um dos bugs acima.
> - **Conforme o que foi decidido:** o contador "n/limite" e a recusa que só aparece ao salvar (decisão I-06), e o botão "Remover" com lixeira (critério CA-03.2).
> - **Vistos uma vez só:** a prévia que manteve o texto cancelado (CH-08) e o toque no meio do cartão que não abriu a peça (CH-02).
> - **Fora deste WI:** problemas da faixa de avisos do WI 101 e do cadastro de campanhas do WI 102. Viraram 19 sugestões de backlog.
> 
> **Perguntas ao produto:** nenhuma.
> 
> **Gate de severidade:** os seis bugs bloqueiam a entrega.
> - O BUG-001, o BUG-002 e o BUG-003 são de severidade high.
> - O BUG-004, o BUG-005 e o BUG-006 são medium, mas cada um quebra um critério de aceite do PRD, e isso também bloqueia.
> 
> Por isso nenhum vai para o backlog.
> 
> **Minha recomendação:** confirmar o veredito `fail` e os seis bugs como estão, sem descartes e sem transições. Depois de confirmado, eu gravo o envelope do `qa-result.md`, troco o cabeçalho para `**Gate 3:** confirmado em 2026-11-17` e acrescento a linha "QA · Gate 3 — veredito" no `item.md`. Então devolvo os seis bugs ao orquestrador para as correções.
> 
> Na rodada de confirmação, peço também para reproduzir, de um estado limpo, a prévia que manteve o texto cancelado. Se ela se confirmar, vira um bug high.
> 
> [[WI:QA_EXEC:ASK:Gate 3 — confirmação do veredito de QA]]

**Resposta:**

Decidiu: o veredito `fail` da rodada 1 do WI 103 está confirmado, com os seis bugs novos como estão (BUG-001, BUG-002 e BUG-003 high; BUG-004, BUG-005 e BUG-006 medium), sem descarte e sem transição. É decisão delegada pela política do humano: a regra "QA local: confirmar o veredito (Gate 3) quando bate com o relatório dos agentes e com o que está em `qa/`" vale aqui. Os precedentes do Gate 3 nos WIs 99, 102 e 92 foram decididos do mesmo jeito.

O que conferi nos arquivos:
- **Contagens.** O envelope `/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103/.specs/work-items/103-joias-em-oferta-configuravel/qa/qa-result.md` tem `verdict: "fail"` (linha 4). Os casos em `test_cases` (linhas 76-109) somam 21 pass, 7 fail, 1 blocked (TC-UI-002) e 3 skip (TC-FUNC-007, 008 e 019). A cobertura (linhas 34-75) dá 35 critérios: 25 cobertos, 7 parciais e 3 sem execução (CA-01.6, CA-04.5, RNF-02, linha 74). Bate com o resumo da sessão.
- **Casos P0 que falharam.** TC-FUNC-006 e TC-JOURNEY-001 estão em `fail` com `bug_ref: BUG-001` (linhas 77 e 85).
- **Bugs.** Os seis estão em `qa/issues/BUG-001.md` a `BUG-006.md`, todos com `status: open` e a severidade dita na sessão. Cada um tem nível de impacto, persona, jornada, passo e frequência. A subida do BUG-003 de Fricção para high está justificada no próprio bug, por estar na jornada P0 J-02. As screenshots citadas no `evidence` existem em `qa/screenshots/`. O mapa de bug para critério do PRD está na linha 311 do qa-result.md e bate com a tabela da sessão.
- **Transições.** Nenhuma era devida. `qa/issues/` só tem os seis bugs novos, não há `retest.md` e a linha 327 do qa-result.md registra que não havia bug aberto no WI. Não há `cannot-reproduce` a fechar nem bug descartado ou marcado `invalid`.
- **Perguntas ao produto.** Nenhuma (linha 350), então não há gate da página pendente. As 19 sugestões de backlog não voltam a este WI.

Próximo passo: siga os passos 1 a 7 do Gate 3 em `/Users/rafael.santos/Projetos/uma-estrelinha/store/.claude/skills/pd-qa-validation/references/setup/gates.md` (linhas 108-121), com as operações do backend local (`references/setup/local.md`). Os passos 1 a 3 não mudam nada, porque não houve descarte nem transição. Depois:
1. Troque o cabeçalho para `**Gate 3:** confirmado em 2026-11-17`.
2. Acrescente a linha "QA · Gate 3 — veredito" no `item.md`.
3. Registre esta decisão em `orquestrador-decisoes.md`, citando a regra da política.
4. Devolva os seis bugs ao orquestrador para as correções. Os lotes L1 a L4 sugeridos no qa-result.md (linhas 318-323) são uma base, e as fix tasks seguem a regra de sempre: cada uma carrega o bug inteiro como critério, um repositório por lote.

O pedido de reproduzir a prévia que manteve o texto cancelado (CH-08 A-3) de um estado limpo, com screenshot, entra no próximo charter, como já está nos riscos residuais (linhas 387-389). Se ela se confirmar, vira bug novo, que passa pelo Gate 3 da rodada seguinte.

## G3 — a etapa parou sem marcador mais de uma vez

- Etapa: Correções · Têmis (árbitro) decidiu · etapa parada

**Pergunta (fim da resposta de Maestro, a sessão):**

> O typecheck da loja passou: `tsc-store` saiu com 0. Ainda faltam o typecheck do painel, o lint, os testes e o build.

**Resposta:**

Decidi: siga com a Re-Validation. A sessão parou no meio dela sem marcador, e o próximo passo está claro na skill e nos arquivos.

O que conferi:
- **As 8 tarefas estão `done`.** Isso inclui as fix tasks 05 a 08 (linha 3 de cada arquivo em `tasks/`). A 08, a última da onda final de `waves-fix.md` (`05,07 | 06 | 08`), tem o Crivo com veredito "serve" em `implement-log.md`.
- **As quatro correções estão commitadas no worktree:** 65d16a85 (T05), f414a988 (T07), 845e8bfa (T06) e e09d6b71 (T08).
- **A linha que vale na retomada.** Com todas as tarefas `done`, a skill manda para a Validation (`/Users/rafael.santos/Projetos/uma-estrelinha/store/.claude/skills/pd-workflow/SKILL.md:230`). O `qa-report.md` PASS da rodada anterior é de uma fila anterior às fix tasks e "não vale" (`SKILL.md:229`). Por isso a Re-Validation é obrigatória.

Próximo passo, em ordem:
1. **Termine a bateria da Validation.** O `tsc` da loja já saiu com exit 0. Faltam:
   - os tipos do painel e do core (`npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` e `packages/core/tsconfig.json`);
   - o lint;
   - as suítes de teste dos workspaces da rodada 1 (core, store, backoffice, functions), cada uma com o exit lido fora de pipe;
   - o build, com o mesmo `.env` do Supabase local da rodada 1.

   Os comandos estão em `/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103/.specs/project/PROJECT.md:30-34` (CLAUDE.md §Comandos e §Baselines). Compare cada resultado com a baseline da validation 1: tipos 0/7/11, lint 2/2 e 23/5.
2. **Reescreva o `qa-report.md`** com o veredito da rodada nova, conferindo os critérios que os bugs BUG-001 a BUG-006 quebravam. Os detalhes estão em `references/execution/validation.md`.
3. **Se der PASS,** ofereça a `pd-qa-validation` para a rodada 2. Ela faz o reteste dos seis bugs `open` e a reprodução pendente da prévia que manteve o texto cancelado (CH-08 A-3), já registrada nos riscos residuais do `qa/qa-result.md`.
4. **Se der FAIL,** a falha vira fix task, como diz a skill.

Ao fim de cada passo, termine a mensagem com um marcador. Não pare no meio sem ele.

## G4 — Gate 3 — confirmação do veredito de QA

- Etapa: Execução de QA · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

> |---|---|---|---|
> | BUG-007 | medium | No editor, a 200 % no celular, a barra fixa do topo quebra linha e mede 345 px. Com o cabeçalho do painel, cobre 54 % da tela. O foco nos controles das peças fica coberto ao voltar com Shift+Tab, e um toque caiu no "Salvar seção". | RNF-04 ("editor usável a 200 %") |
> 
> É uma regressão causada pela correção do BUG-004, vista duas vezes no CH-07 e duas vezes no reteste.
> 
> **Descartes:** nenhum. Os achados que não viraram bug estão listados no `qa-result.md`:
> - **Vistos uma vez só, foram para os riscos:** remover uma peça e salvar logo em seguida não mostrou "Salvo" no primeiro clique; a prévia que manteve o título cancelado; o esqueleto da fileira com os produtos bloqueados, cujo fim não foi observado.
> - **Foram para sugestões de backlog:**
>   - a loja a 200 % rola 44 px de lado pelo cabeçalho e pela fileira "Decorativos", o que já existia antes deste WI;
>   - o texto técnico "TypeError: Failed to fetch" na mensagem de falha;
>   - o contador sem estado de erro acima do teto.
> 
> **Perguntas ao produto:** nenhuma, por ser rodada de confirmação.
> 
> **Gate de severidade:** o BUG-007 é medium, mas quebra o RNF-04, um critério de aceite do PRD. Pela regra do fluxo, isso o torna **bloqueante**, e ele não vai para o backlog. Com isso, a etapa fecha com BUGS:BUG-007, mesmo com o veredito de QA da rodada em `pass`.
> 
> **Minha recomendação:** confirmar o veredito `pass`, as seis transições para `resolved` e o BUG-007 como está, sem descartes. Depois de confirmado, eu gravo nesta ordem:
> 1. as transições nos envelopes dos bugs e a linha de Histórico de cada um;
> 2. o cabeçalho do `qa-result.md` como `confirmado em 2026-11-17`;
> 3. a linha "QA · Gate 3 — veredito" da rodada 2 no `item.md`;
> 4. as sugestões de backlog que ficam abertas no `qa/backlog.md`.
> 
> Então devolvo o BUG-007 ao orquestrador para correção.
> 
> [[WI:QA_EXEC:ASK:Gate 3 — confirmação do veredito de QA]]

**Resposta:**

Decidiu: o veredito `pass` da rodada 2 (confirmação) do WI 103 está confirmado. Os seis bugs passam de `open` para `resolved`, o BUG-007 entra como está (medium, P2, quebra o RNF-04) e nada é descartado. É uma decisão delegada pela política do humano, pela regra "QA local: confirmar o veredito (Gate 3) quando batem com o relatório dos agentes e com o que está em `qa/`". Ela é coerente com a decisão G2 da rodada 1 e com os precedentes do humano nos WI 99, 102 e 92.

O que conferi nos arquivos (pasta `/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103/.specs/work-items/103-joias-em-oferta-configuravel/qa/`):

- **Veredito.** O envelope de `qa-result.md` diz `"verdict": "pass"`. Os casos ficaram assim: 30 pass, 1 fail (TC-CFR-001, com `bug_ref` BUG-007), 0 blocked e 1 skip (TC-FUNC-007). Em `issues.by_severity` há só 1 medium e nenhum critical ou high.
  - A regra está em `pd-qa-validation/references/shared/contrato-qa.md:145-146` e em `references/triage/checklist.md:89-90`. Vira `fail` se houver bug critical ou high aberto ou caso P0 em fail, e vira `partial` se houver caso P0 ou P1 `blocked` ou charter que não rodou.
  - Nenhuma das duas condições vale aqui. O TC-FUNC-007 ficou `skip`, não `blocked`, dentro do CH-01, que rodou.
  - CH-03, CH-04 e CH-06 não precisavam rodar de novo. Na rodada de confirmação só voltam os charters com caso fail ou blocked (`references/setup/workspace.md:253`).
- **Cobertura.** São 31 de 35 critérios. O CA-01.6 aparece em `coverage.missing` e é declarado em "Sem cobertura", com a evidência parcial `screenshots/CH-08-r2-02-recusa-ao-salvar-61.png`. RNF-06, RNF-08 e CA-03.3 estão como parciais. É uma lacuna dita, não um pass falso.
- **Transições.** Em `retest.md`, o retester deu "resolved 6 · still-open 0 · cannot-reproduce 0 · blocked 0".
  - Cada bug tem duas ou mais tentativas e evidência em `screenshots/retest-r2-BUG-00N*.png`, e todos esses arquivos existem.
  - As seis transições propostas são iguais ao veredito do retester. Não há `cannot-reproduce` para fechar.
  - Hoje os seis envelopes estão em `"status": "open"`, ou seja, ainda não foram tocados.
  - As notas de Histórico têm base no `retest.md`: no BUG-002, o estado "sem campanha" não foi exercitado; no BUG-004, o entorno mostrou a quebra N-1, que virou o BUG-007.
- **BUG-007** (`issues/BUG-007.md`, envelope medium, P2, `open`, `tc_ref` TC-CFR-001).
  - Foi visto 2 de 2 vezes no CH-07 r2 (`sessions/CH-07-r2-cfr.md:42` e `:49`) e 2 de 2 no reteste (N-1).
  - A evidência existe: `CH-07-r2-02-shift-tab-foco-coberto-200.png` e `retest-r2-BUG-004-salvar-sobre-pecas.png`.
  - Nesta rodada de confirmação ele pode virar bug porque é regressão: o TC-CFR-001 passava nesse ponto na rodada 1 (`workspace.md:256`).
  - A severidade medium é justificada pelo impacto na persona: é fricção, sem perda de dado, e só acontece a 200 % em 390 px.
  - A numeração segue o maior BUG existente, sem repetir número.
- **Descartes e perguntas.** Não há descarte nem pergunta ao produto, como manda a rodada de confirmação (`references/triage/triage.md:114`). Os achados que não viraram bug estão em `qa-result.md`, separados entre Riscos residuais e Sugestões de backlog, com o motivo de cada um.
- **Gate de severidade do fluxo.** O BUG-007 é medium, mas quebra o RNF-04, um critério do PRD. Por isso é bloqueante e não vai para o backlog. É a mesma leitura que valeu para os bugs medium da rodada 1 (BUG-004, BUG-005 e BUG-006). A etapa fecha com BUGS:BUG-007.

A ordem de gravação que você propôs bate com o Gate 3 (`references/setup/gates.md:107-121`):
1. as transições nos envelopes, com a linha de Histórico de cada bug;
2. o cabeçalho `**Gate 3:**` do `qa-result.md` como confirmado em 2026-11-17;
3. a linha "QA · Gate 3 — veredito" da rodada 2 no `item.md`;
4. as sugestões de backlog em `qa/backlog.md`.

Não há envelope a ajustar, porque nada foi descartado. Depois disso, devolva o BUG-007 ao orquestrador para a fix task. Na correção, vale o lote L1 sugerido, que também confere os outros editores da Home a 200 %, como apontado em Riscos residuais.

## G5 — Gate 3 — confirmação do veredito de QA

- Etapa: Execução de QA · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

> - **O que conferi:** a 200 %, a barra do editor deixou de ficar presa no topo. O foco no Shift+Tab fica à vista e o toque cai no controle certo. Reordenar e salvar dá "Salvo". A 100 % e a 130 %, a barra continua fixa no topo e o "Salvar seção" fica inteiro, então o BUG-004 não voltou. Nenhuma página rola de lado.
> - **Sem execução:** o TC-FUNC-007 não rodou em nenhuma das três rodadas, por falta de orçamento. Por isso o critério CA-01.6 continua sem caso executado.
> 
> **Bugs novos:** nenhum.
> 
> **Transição proposta:**
> 
> | Bug | Veredito | Status |
> |---|---|---|
> | BUG-007 | resolved (fix task 09, `656bb5ce`) | open → resolved |
> 
> **Achados que não viraram bug.** Os quatro são medium e já existiam antes deste WI. Vão como sugestão para `qa/backlog.md`:
> - **N-1:** a 200 %, o cabeçalho fixo do painel cobre o campo "Acrescentar uma peça" ao voltar com Shift+Tab. Esse cabeçalho já estava nas rodadas 1 e 2, o WI não o altera, e o mesmo acontece no editor "Produtos em destaque".
>   - Ele toca o RNF-04, o requisito de o editor ser usável a 200 %. Recomendo não promover e abrir um WI próprio.
>   - A alternativa é tratá-lo como bloqueante deste WI. Isso abriria uma 4ª correção sobre um componente fora do escopo.
> - **N-2:** o editor "Produtos em destaque" rola de lado a 200 %.
> - **N-3:** "Novo cupom" rola de lado a 200 %.
> - **N-4:** em "Nova promoção", o "Salvar promoção" passa da borda e a página rola de lado a 200 %.
> - **Sugestão de WI:** N-2, N-3 e N-4 podem virar um só: "Formulários do painel sem rolagem lateral a 200 %".
> 
> **Perguntas ao produto:** nenhuma.
> 
> Confirmo o veredito `pass`, a transição `BUG-007 open → resolved`, os quatro achados N-1..N-4 como backlog (recomendado) e o registro no disco?
> 
> [[WI:QA_EXEC:ASK:Gate 3 — confirmação do veredito de QA]]

**Resposta:**

Decidiu: o veredito `pass` da rodada 3 (confirmação) do WI 103 está confirmado. Fica confirmada a transição `BUG-007 open → resolved`. Não há bug novo, descarte nem pergunta ao produto. Os quatro achados N-1..N-4 vão como Sugestões de backlog para `qa/backlog.md`, como você recomendou, e não voltam a este WI. Pode gravar no disco. É decisão delegada pela política do humano, pela regra "QA local: confirmar o veredito (Gate 3) quando batem com o relatório dos agentes e com o que está em `qa/`". É coerente com G2 e G4 desta etapa e com os precedentes 99, 102 e 92 ("ok", "siga").

O que conferi nos arquivos:
- **Veredito e contagens:** `qa/qa-result.md` traz `"verdict": "pass"`. Os 32 TC dão 31 `pass` e 1 `skip`, o TC-FUNC-007, sem nenhum `fail` ou `blocked`. A cobertura é `acceptance_covered: 31` de 35, com `missing: ["CA-01.6"]`. O TC-CFR-001 está `pass` na r3. Tudo bate com o seu resumo.
- **Transição:** em `qa/retest.md`, a rodada 3 tem a contagem "resolved 1 · still-open 0 · cannot-reproduce 0". O BUG-007 deu `resolved` em 2 de 2 tentativas, com evidência `screenshots/retest-r3-BUG-007*.png`. Hoje `qa/issues/BUG-007.md:9` está `"status": "open"` e passa a `resolved` no registro. Não há `cannot-reproduce` para fechar.
- **Sessão e evidências:** a sessão CH-07 da r3 está em `qa/sessions/CH-07-r3-cfr.md`, e há 17 capturas da r3 em `qa/screenshots/`.
- **N-1 (o único que podia pedir o humano):** ele toca o RNF-04, em `prd.md:96`, no editor deste WI. Mesmo assim, a regra da skill o manda ao backlog, e não é descarte de bug:
  - `pd-qa-validation/references/triage/bug-writing.md:17`: defeito que existia antes da mudança "vira bug só se for `critical` ou `high`". O N-1 é `medium`.
  - `references/execution/cfr.md:139`: foco de elementos que o WI não mudou "é backlog, não esta rodada".
  - `references/triage/triage.md:114`: rodada de confirmação não faz pergunta.
  - A causa é o cabeçalho fixo do painel, que o WI não altera. O mesmo acontece no editor "Produtos em destaque" (`qa/retest.md`, achado N-1).
  - O caminho de tratá-lo como bloqueante não se aplica: abriria uma 4ª correção num componente fora do escopo, contra a regra.
- **N-2, N-3 e N-4:** ficam em telas fora do WI 103, são pré-existentes e `medium`, então também vão ao backlog. A sugestão de um WI único, "Formulários do painel sem rolagem lateral a 200 %", fica para o humano decidir se abre. Isso não volta a este WI.

O que fica registrado: o CA-01.6 continua sem caso executado (TC-FUNC-007 `skip` nas três rodadas), como já está em `qa/qa-result.md`, na seção "Sem cobertura".

Arquivos: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103/.specs/work-items/103-joias-em-oferta-configuravel/qa/qa-result.md · /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103/.specs/work-items/103-joias-em-oferta-configuravel/qa/retest.md · /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103/.specs/work-items/103-joias-em-oferta-configuravel/qa/issues/BUG-007.md · /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103/.specs/work-items/103-joias-em-oferta-configuravel/qa/backlog.md
