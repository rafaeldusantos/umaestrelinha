# Decisões do orquestrador — 100

Perguntas da sessão e quem respondeu: o árbitro (agente validador), a página de review técnico ou o humano.

## G1 — gate da página (1 item)

- Etapa: Plano de QA · humano respondeu na página · página web da wi-workflow

**Página:** http://127.0.0.1:8477/

**Respostas (answers.json):**

```json
{
  "wi": "100",
  "respostas": [
    {
      "id": "Q-01",
      "escolha": "(A) Antes do primeiro lote, a thread cria pelo checkout local um pedido PIX pendente da conta de teste, com as functions servidas com chaves externas inválidas",
      "texto": ""
    }
  ],
  "enviadoEm": "2026-11-14T11:01:54.587Z"
}
```

## G2 — Gate 1 — aprovação do plano de QA

- Etapa: Plano de QA · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

>   - A URL `/pedido/<id>` dele vai para o manifesto, e as sessões só a leem.
>   - No fim da rodada o pedido fica no banco local, declarado com id e número.
>   - Se o checkout não gravar o pedido, os passos da confirmação ficam `blocked`, sem achado do WI 100.
>   Automação: e2e 19 (missing 19) · integration 0 · manual 5
>   Perguntas 🟡:
>   - A "confirmação" de RN-08 e CA-01 é a página `/pedido/:id` de um pedido pendente. A de um pedido pago não se vê no local.
>   - A "gaveta" de RN-08 foi lida como a sacola.
>   - CA-02 e RN-04 se provam interceptando o documento HTML e escrevendo `data-perfil` nele, como faz a função `api/page` (precedente do WI 101).
>   - Trocar só a query da URL é uma borda que a fonte não decide. Fica registrado, sem achado.
>   - O valor desconhecido de CA-06 só se cria por SQL local, permitido pela H12, e é restaurado no fim.
>   - Frete grátis ligado e um produto "de/por" são massa do CH-04. A thread ajusta pelo painel se faltarem, e restaura no fim.
>   - A referência de CA-01 é o commit-base do branch.
>   - No dev server, uma primeira pintura em Padrão que depois vira Black Friday é o estado "não sei" da spec (R2). A primeira pintura que conta é a do CH-08.
>   - Os 5 minutos de `staleTime` não se esperam numa sessão.
>   🟢:
>   - Em produção, quando a leitura de `store_settings` falha, a página sai sem `data-perfil` e a cor pode trocar na frente da cliente. A R2 aceita isso.
>   - RN-01 promete três elementos em ouro e só dois existem (H4).
>   - O botão do card diz "Salvar alterações", e não "Salvar" como no protótipo. É decisão da T07, e não conta como diferença.
>   Arquivos: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100/.specs/work-items/100-perfil-de-estilo-da-loja/qa/test-plans/ · /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100/.specs/work-items/100-perfil-de-estilo-da-loja/qa/test-cases/
> 
> Registrei a linha `QA · perguntas do plano` no item.md (1 item, 1 respondido). O test-plan segue com `**Gate 1:** pendente`. Nada foi commitado, e nenhum charter foi executado.
> 
> Aprova o plano para seguir para a execução?
> 
> [[WI:QA_REPORT:ASK:Gate 1 — aprovação do plano de QA]]

**Resposta:**

Decisão: o plano de QA do WI 100 (versão 2) está aprovado no Gate 1. Pode seguir para a execução dos charters, na ordem L1 → L5. É decisão delegada pela política do humano ("QA local: aprovar o plano de QA (Gate 1) quando bate com o relatório dos agentes e com o que está em `qa/`").

O que conferi em `/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100/.specs/work-items/100-perfil-de-estilo-da-loja/qa/`:
- **Cobertura:** a tabela de `test-plans/perfil-de-estilo-test-plan.md:288-309` cobre os 18 critérios (UC-01..03, RN-01..08, CA-01..07), cada um com pelo menos um TC. A linha 311 diz "Sem cobertura: nada". As coberturas parciais declaradas (RN-05, CA-04, RN-02) são as mesmas do resumo.
- **TCs:** são 24 arquivos em `test-cases/`, com prioridades P0 8 · P1 13 · P2 3, como o resumo diz.
- **Charters:** são 8 em `test-plans/charters/`. Os lotes (linhas 138-147) batem com o resumo:
  - nenhum lote tem duas sessões da mesma conta (L1: `cliente-qa` e `admin-loja`; L3: `cliente-qa`, `anonima` e `admin-loja`);
  - quem grava `appearance` roda sozinho (CH-01 no L2, CH-05 no L4);
  - o CFR roda por último, no L5.
- **Perguntas 🔴:** nenhuma aberta. A Q-01 está marcada ✅ com a resposta (A) do humano (linha 333), aplicada na versão 2 (linhas 47 e 66). Ela também está registrada no `item.md:34`, coerente com o G1 já respondido na página. As 🟡 e 🟢 restantes são leituras e limites declarados. Nenhuma muda escopo.
- **Ambiente:** só local, nunca `--linked`. A massa M1 é criada pela thread antes do L1. Os estados S0, S1 e S2 são postos e restaurados pela thread (linhas 213-219), e o S2 por SQL local, como a H12 permite.

Próximo passo: marcar `**Gate 1:** aprovado` no test-plan (linha 48) e começar a execução pelo L1 (CH-06 e CH-02). Antes do L1, a thread cria o pedido M1 e confere o S0.

## G3 — Gate 3 — confirmação do veredito de QA

- Etapa: Execução de QA · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

> **Casos:** 12 pass, 2 fail, 3 blocked e 7 skip. Dos 18 critérios, 5 ficaram cobertos e 13 parciais, a maioria porque as sessões estouraram o orçamento.
> 
> **O que a triagem reclassificou:**
> - **TC-FUNC-008 vai para `blocked` (ambiente), não fail.** A loja aberta antes da troca não passou ao Black Friday ao navegar no CH-03. A causa foi o bloqueio de rede local do Chromium com o documento interceptado: os dados do Supabase local nem chegaram à página. No CH-08, com os dados carregando e o mesmo cenário, a troca para o preto aconteceu em 87 ms, como a spec manda.
> - **TC-FUNC-006 vai para `skip`.** O foco foi para o `<body>` depois do Esc só uma vez, lido por script. Fica como risco.
> - **TC-UI-002 vai para `pass`.** As diferenças da Home seguem a spec ou já existiam antes do WI.
> 
> **Riscos para a próxima rodada:**
> - No screenshot do CH-02, a prévia aparece sem os blocos da Home; não foi reproduzido. Se confirmar, atinge o UC-03 e é a prioridade da rodada de confirmação.
> - A próxima sessão do CH-03 precisa liberar o acesso à rede local no Chromium ou rodar pelo `playwright-cli`.
> 
> **Perguntas ao produto:** nenhuma. Ficaram 12 sugestões de backlog, todas de comportamento anterior ao WI ou de polimento.
> 
> **Notas de execução:**
> - Com o card do painel e o banco não dava para pôr S1 na tela, então gravei pela mesma chamada autenticada que o card faz, e não pela tela como o plano pede.
> - Também liguei temporariamente o frete grátis e um preço "de/por" num produto. Tudo isso foi revertido no fim: a chave `appearance` voltou a não existir.
> - O pedido M1 (#0613) fica no banco local, como o plano manda.
> - Os servidores que subi foram derrubados; os containers que já estavam de pé seguem como estavam.
> - A triagem registrou o horário de execução supondo UTC−3; os logs locais estão em UTC. Corrijo esse campo ao gravar.
> 
> **Recomendação:** confirmar o veredito e os quatro bugs como `open`. Os lotes de correção são BUG-001 com BUG-002, e depois BUG-003 com BUG-004, todos no mesmo card.
> 
> Confirma o veredito, os bugs e a ausência de transições?
> 
> [[WI:QA_EXEC:ASK:Gate 3 — confirmação do veredito de QA]]

**Resposta:**

Decidi: o veredito `fail` da rodada 1 está confirmado, com os quatro bugs (BUG-001 a BUG-004) registrados como `open` e nenhuma transição de status. A decisão é delegada pela política do humano ("QA local: … confirmar o veredito (Gate 3) quando batem com o relatório dos agentes e com o que está em `qa/`"). Ela segue o precedente do WI 102, em que o humano respondeu "siga" no Gate 3.

O que conferi em `.specs/work-items/100-perfil-de-estilo-da-loja/qa/`:
- **`qa-result.md`:** o envelope traz `verdict: fail` e 12 pass, 2 fail, 3 blocked e 7 skip, com 5 de 18 critérios cobertos e `missing: []`. As contagens por severidade (critical 1 · medium 1 · low 2) batem com o resumo da sessão. TC-FUNC-013 aponta para BUG-001 e TC-UI-001 para BUG-003. TC-FUNC-008 está `blocked`, TC-FUNC-006 `skip` e TC-UI-002 `pass`, como a triagem reclassificou.
- **BUG-001** (`qa/issues/BUG-001.md`): a evidência está em `sessions/CH-05…md:33`, com a leitura cortada, "Padrão · Em uso" na tela e a loja em Black Friday, repetido 2 de 2, e no screenshot `CH-05-09-carga-sem-config.png`. Subir de high para critical está justificado pelo impacto na persona: a dona chega a um estado errado sem saber, na J-02, que é P0.
- **BUG-002** (`sessions/CH-05:26-27`, `CH-05-05-offline-45s-sem-aviso.png`): fica em medium. A gravação se corrige sozinha quando a rede volta, e o erro aparece quando a requisição é abortada (passo 07).
- **BUG-003 e BUG-004** (CH-07): ficam em low, como cosméticos do painel.
- **TC-FUNC-008 como `blocked` (ambiente):** é coerente. Em `CH-08…md:27`, com a rede local liberada, a troca de página passa ao preto em 87 ms.
- **Retest:** não há `retest.md`. É a primeira rodada, então não há transições, e não há nenhum `cannot-reproduce` a justificar.

Faça o registro como `references/setup/gates.md` (§ Gate 3) manda:
1. Mantenha os bugs como `open`.
2. Em `qa-result.md`, mude `**Gate 3:** pendente` para `confirmado em 2026-11-14`. Corrija o `executed_at` para UTC real. A execução terminou por volta das 13:10, que só dá 16:10Z se o fuso for UTC−3; confira contra os logs em UTC e anote no campo.
3. Em `item.md`, acrescente a linha `QA · Gate 3 — veredito`.

O próximo passo são as fix tasks na ordem proposta: primeiro BUG-001 com BUG-002, depois BUG-003 com BUG-004, cada uma com o bug íntegro como critério. A rodada de confirmação tem duas prioridades:
- Reproduzir a prévia sem os blocos da Home, o risco que atinge o UC-03.
- Repetir o CH-03 com o acesso à rede local liberado no Chromium.

O CH-05 também anotou como spec-gap, no passo 14, a aba desatualizada que mostra "Em uso" falso. Confira se o conserto do BUG-001 cobre esse caso, sem abrir escopo novo.

## G4 — Gate 3 — confirmação do veredito de QA

- Etapa: Execução de QA · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

> | Bug | Severidade | Título | Ocorrências |
> | --- | --- | --- | --- |
> | BUG-005 | high · P1 | [Prévia do perfil] A prévia mostra a Home sem banners, vitrine nem produtos | 2 de 2 no CH-07 (Computador) e 2 screenshots da rodada 1 (Computador e Celular) |
> 
> Era a prioridade de Têmis: reproduzir a prévia vazia, que atinge o UC-03. A loja publicada está correta. Mas a prévia, que é onde a dona decide antes de ligar, mostra uma loja quebrada. O console e a rede da prévia não foram lidos.
> 
> **Transições propostas** (reteste: 2 vezes cada para BUG-001 e BUG-002; BUG-003 e BUG-004 conferidos com o protótipo em 1024 e 390)
> 
> | Bug | De → para |
> | --- | --- |
> | BUG-001 | open → resolved |
> | BUG-002 | open → resolved |
> | BUG-003 | open → resolved |
> | BUG-004 | open → resolved |
> 
> **Viraram sugestão de backlog**, sem bug:
> - com a leitura falhando, a opção Padrão ainda aparece marcada (low);
> - o cartão anuncia "-X%", mas a página do produto abre sem o desconto (anterior ao WI, low);
> - cinco ajustes finos do card contra o protótipo (low).
> 
> O texto do passo 2 do TC-FUNC-013 precisa de ajuste: quando a rede volta, a gravação pendente sai sozinha, como o próprio aviso promete. Não há perguntas ao produto nesta rodada.
> 
> **Recomendação:** confirmar o veredito, registrar o BUG-005 como `open`, gravar as quatro transições para `resolved`, e o orquestrador corrigir o BUG-005 antes da rodada 3.
> 
> [[WI:QA_EXEC:ASK:Gate 3 — confirmação do veredito de QA]]

**Resposta:**

Decidi: o veredito `fail` da rodada 2 está confirmado. O BUG-005 entra como `open` (high · P1) e os BUG-001 a BUG-004 passam de `open` para `resolved`. Decisão delegada pela política do humano: "QA local: … confirmar o veredito (Gate 3) quando batem com o relatório dos agentes e com o que está em `qa/`". Há também o precedente do Gate 3 dos WIs 102 e 92, em que o humano mandou seguir.

**O que conferi**
- `qa/qa-result.md`: verdict `fail`. Os TCs dão pass 15 · fail 1 · blocked 1 · skip 7, com 6 de 18 critérios cobertos. O TC-UI-001 está `fail` com `bug_ref` BUG-005 e o TC-REG-001 segue `blocked`. Bate com o que a sessão relatou.
- `qa/issues/BUG-005.md`: a severidade high está justificada pelo impacto na Adri (Dano à confiança, J-01 passo 4, UC-03/CA-07). O bug traz 4 ocorrências, duas na rodada 2 e duas na rodada 1, e o esperado tem fonte (PRD UC-03, spec › Design, texto do card).
- `qa/screenshots/CH-07-02-previa-computador-bf-1440.png`: abri a screenshot e o defeito está lá. Dentro da prévia aparecem a faixa de avisos e o cabeçalho em preto e ouro, depois uma faixa vazia, o Instagram e o rodapé, sem nenhum bloco da Home.
- `qa/retest.md`: dá `resolved 4 · still-open 0`. Cada bug tem 2 tentativas ou mais (BUG-001 com 3, linhas 19–22; BUG-002, linhas 60–63; BUG-003, linhas 98–101; BUG-004, linhas 145–148). As transições propostas são iguais ao veredito do retester.

**Próximos passos**
1. Gravar o status `resolved` no JSON de `qa/issues/BUG-001.md` a `BUG-004.md`. Hoje os quatro ainda dizem `"status": "open"`, na linha 9 de cada arquivo.
2. Marcar o Gate 3 como confirmado no `qa-result.md`.
3. Abrir a fix task do BUG-005 com o bug íntegro como critério. Na investigação, ler o console e a rede da prévia (`?preview=1`), que nenhuma rodada leu.
4. Rodar a Validation e depois a rodada 3 do QA.

As sugestões de backlog seguem como estão: a opção Padrão marcada com a leitura falhando, o "-X%" anterior ao WI, os ajustes finos do card e a aba desatualizada. O ajuste de texto no passo 2 do TC-FUNC-013 fica no plano de QA.

## G5 — Gate 3 — confirmação do veredito de QA

- Etapa: Execução de QA · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

> | --- | --- | --- | --- |
> | BUG-005 | open → resolved | high (mantida) | `qa/screenshots/retest-BUG-005-computador.png`, `-computador-vitrine.png`, `-celular.png` |
> 
> - A prévia agora mostra as mesmas 8 seções da Home publicada, nas cores de Black Friday, e funcionou nas 4 tentativas.
> - Com Padrão marcado e sem salvar, aparece a mesma Home nas cores do Padrão.
> - A prévia do `/admin/home` continua mostrando o rascunho com os blocos.
> - O console não mostrou erros e o quadro da prévia não teve respostas 4xx nem 5xx.
> 
> **O que não virou bug**
> 
> Os dois pontos abaixo acontecem igual na loja de antes do WI, então ficam como sugestão de backlog:
> - **Botão da barra fixa no celular:** em 390, "Adicionar à sacola" na barra fixa do produto não põe a peça na sacola e não mostra aviso. A sessão propôs gravidade high, e o ponto ficou registrado em Riscos residuais.
> - **Aviso de cookies:** fechar o aviso sem aceitar deixa as estatísticas ligadas na preferência gravada.
> 
> Não há perguntas ao produto.
> 
> **Ambiente:** a massa voltou ao estado inicial (a chave `appearance` foi apagada e a contagem dá 0). Os servidores que subi (8182, 8183, 8092 e a `functions serve`) estão desligados. Os 12 containers permanentes seguem de pé. A rodada 2 foi arquivada em `sessions/2026-11-14-r2/`, `screenshots/2026-11-14-r2/`, `retest-2026-11-14-r2.md` e `qa-result-2026-11-14-r2.md`.
> 
> **Recomendação:** confirmar o veredito `partial` e passar o BUG-005 para `resolved`. Os três casos P0 sem execução não têm bug ligado; ficam como risco residual para você decidir na integração.
> 
> As opções são:
> 1. confirmar como está;
> 2. pedir uma rodada extra só para os casos P0 sem execução, fora das 3 rodadas previstas.
> 
> [[WI:QA_EXEC:ASK:Gate 3 — confirmação do veredito de QA]]

**Resposta:**

Decidi pela opção 1: o veredito `partial` da rodada 3 fica confirmado, e o BUG-005 passa de `open` para `resolved` (severidade high mantida). Não entra bug novo, nenhum outro bug muda de status e não há pergunta ao produto. A decisão é delegada pela política do humano: "QA local: … confirmar o veredito (Gate 3) quando batem com o relatório dos agentes e com o que está em `qa/`". Ela também segue os precedentes do Gate 3 nos WIs 99, 102 e 92, em que o humano confirmou o veredito ("ok", "siga").

**O que conferi**
- **Veredito e contagens.** `qa/qa-result.md` traz `"verdict": "partial"`, 17 pass, 0 fail, 0 blocked e 7 skip, 8 de 18 critérios cobertos e 0 issues. O mesmo arquivo nomeia os três P0 em `skip` (TC-FUNC-002, TC-JOURNEY-001, TC-PERSONA-001). Tudo bate com o que a sessão resumiu.
- **CA-01 e RN-06.** Os dois estão `covered` por TC-REG-001 no envelope do `qa-result.md`.
- **Transição do BUG-005.** `qa/retest.md` registra "Contagem: resolved 1 · still-open 0 · cannot-reproduce 0 · blocked 0" para o BUG-005, com 4 tentativas, o código no commit `41f85963` e as evidências `screenshots/retest-BUG-005-*.png` listadas no envelope. O commit `41f85963` é o HEAD do branch (`git log`).
- **Estado atual do bug.** `qa/issues/BUG-005.md:9` ainda diz `"status": "open"`. Isso está certo antes do de acordo: pelo `references/setup/gates.md` (Gate 3, "Com o de acordo, grave"), o status só muda depois da confirmação.
- **Os dois achados fora do WI.** A barra fixa em 390 e o aviso de cookies acontecem igual na loja de antes do WI, então ficam como sugestão de backlog e não voltam a este WI. A gravidade que a sessão propôs para a barra fixa (high) fica registrada em Riscos residuais.

**O que a sessão grava agora** (gates.md, passos 2 a 4)
1. No `issues/BUG-005.md`, o `status` passa a `resolved`, com uma linha no Histórico: rodada 3, open → resolved, o que se viu e as evidências do reteste.
2. No `qa-result.md`, `**Gate 3:** pendente` passa a `confirmado em 2026-11-14`.
3. No `item.md`, entra a linha `QA · Gate 3 — veredito`: rodada 3 (confirmação) · partial · TC pass 17 · fail 0 · blocked 0 · skip 7 · 8/18 critérios cobertos · bugs novos 0 · BUG-005 open → resolved · confirmado por Têmis, pela política delegada do humano.
4. Os três P0 sem execução entram como risco residual explícito no `qa-result.md`, para o humano decidir na integração.

A rodada extra (opção 2) não fica autorizada. O humano ainda pode pedi-la antes de integrar.
