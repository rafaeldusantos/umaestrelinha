# Decisões do orquestrador — 102

Perguntas da sessão e quem respondeu: o árbitro (agente validador), a página de review técnico ou o humano.

## G2 — bloqueio: limite de uso atingido no meio da Validation — falta remedir loja e painel isolados, probe 05, qa report

- Etapa: Implementação · Têmis escalou ao humano · bloqueio declarado

**Bloqueio (fim da resposta de Maestro, a sessão):**

> Seu limite de uso foi atingido, e a Validation do WI 102 ficou pela metade: ainda não há veredito, e o `item.md` continua em `fase: validation`.
> 
> **O que já foi medido**
> - **Testes:**
>   - `core`, `functions` e `mobile-adm` passaram.
>   - A loja teve 7374 de 7374 testes aprovados, mas a suíte saiu com 1 por um único erro do vitest: `Timeout calling "onTaskUpdate"`. Isso indica disputa da máquina com a sessão do WI 101, não teste reprovado. Ainda não remedi a loja sozinha.
>   - No painel, os dois arquivos que caíram na suíte cheia (`AdminCampaignFormPage` e `AdminOrdersPage.aviso`) passaram rodando sozinhos: 48 de 48. Isso aponta para contenção, não defeito, mas a suíte inteira do painel ainda não foi remedida sozinha.
> - **Tipos:** sem erro novo. Loja, servidor da loja e mobile-adm deram 0; o painel deu os mesmos 7 erros de antes e o `core` os mesmos 11.
> - **Lint:** sem regressão. A loja ficou em 2/2, o painel em 23/5 e o mobile-adm em 0/0, todos iguais ao baseline.
> - **Build:**
>   - A primeira tentativa quebrou porque o worktree não tem os arquivos `.env` dos apps.
>   - Passando na linha de comando a URL e a chave pública do Supabase local, os três apps compilaram.
> 
> **O que falta**
> 1. Remedir a suíte da loja e a do painel, cada uma sozinha.
> 2. Rodar o probe do checkout da T05 (`probes/05-sacola-e-checkout.sh`), que nunca foi executado. Antes é preciso servir as functions do worktree com chaves externas inválidas, e depois encerrar o serve e conferir com `docker ps -a`.
> 3. Fazer a tabela de cobertura dos critérios de aceite.
> 4. Escrever o `qa-report.md` e a linha `validation 1` nos Gates do `item.md`, e levar as premissas de raio largo para a seção Decisões do `spec.md`.
> 5. Se tudo passar, mudar o item para `fase: done`.
> 
> Os logs dos gates estão em `/private/tmp/claude-503/-Users-rafael-santos-Projetos-uma-estrelinha-store/eaef95c3-de46-4d2e-b865-767f3ea6589c/scratchpad/wi/102/val/`.
> 
> [[WI:PROGRESS:9/9]]
> [[WI:IMPLEMENT:BLOCKED:limite de uso atingido no meio da Validation — falta remedir loja e painel isolados, probe 05, qa-report]]

**Por que Têmis escalou:**

O bloqueio é real e não sou eu quem resolve. É o limite de uso da conta. Nenhum artefato, comando de leitura ou alternativa da skill faz a sessão voltar a rodar antes de o limite renovar, e não há decisão de produto pendente.

**O que conferi**
- O `item.md` continua em `fase: validation` (`.specs/work-items/102-desconto-de-campanha/item.md:6`).
- Ainda não existem `qa-report.md` nem `qa/`. Na pasta do WI há só `implement-log.md`, `item.md`, `prd-review.md`, `prd.md`, `probes/`, `spec.md`, `tasks/` e `waves.md`.
- O probe `probes/05-sacola-e-checkout.sh` existe e a T05 o exige como critério (`tasks/05-sacola-e-checkout.md:158`: "CA-13, CA-16 e CA-17 provados por teste e pelo probe HTTP"). A Validation só fecha depois de ele rodar.
- O que já foi medido bate com os baselines do CLAUDE.md: tipos 0 · 7 · core 11 e lint 2/2 · 23/5 · 0/0. Isso não precisa ser refeito.

**Pergunta ao humano**
Para destravar, um passo só: quando o limite de uso renovar, retome a sessão do WI 102 e diga "continue a Validation".

Se você mandar continuar, a ordem dos passos é a que a própria sessão listou, e todos já estão dentro da fila aprovada:
1. Remedir a suíte da loja e a do painel, cada uma sozinha. A forma é `pnpm --filter @estrelinha/<w> test --testTimeout=20000`, sem o `--`, com o exit code capturado fora de pipe. Convém que o WI 101 não esteja rodando suíte ao mesmo tempo: o `Timeout calling "onTaskUpdate"` e os dois arquivos que só caíram na suíte cheia apontam para contenção.
2. Rodar o `probes/05-sacola-e-checkout.sh` com `supabase functions serve --env-file <arquivo com chaves externas inválidas>`, nunca com o `.env` da raiz. Depois encerrar o serve e conferir com `docker ps -a`.
3. Fazer a tabela de cobertura dos critérios de aceite.
4. Escrever o `qa-report.md`, a linha `validation 1` nos Gates do `item.md`, e levar as premissas de raio largo para a seção Decisões do `spec.md`.
5. Só então passar o item para `fase: done`.

**Minha recomendação:** retomar a sessão depois que o limite renovar, de preferência com o WI 101 parado durante as duas suítes. Não decidi porque o que destrava é a conta, não uma regra da skill nem a política.

## G2 — bloqueio: limite de uso atingido no meio da Validation — falta remedir loja e painel isolados, probe 05, qa report

- Etapa: Implementação · humano decidiu · bloqueio declarado

**Bloqueio (fim da resposta de Maestro, a sessão):**

> Seu limite de uso foi atingido, e a Validation do WI 102 ficou pela metade: ainda não há veredito, e o `item.md` continua em `fase: validation`.
> 
> **O que já foi medido**
> - **Testes:**
>   - `core`, `functions` e `mobile-adm` passaram.
>   - A loja teve 7374 de 7374 testes aprovados, mas a suíte saiu com 1 por um único erro do vitest: `Timeout calling "onTaskUpdate"`. Isso indica disputa da máquina com a sessão do WI 101, não teste reprovado. Ainda não remedi a loja sozinha.
>   - No painel, os dois arquivos que caíram na suíte cheia (`AdminCampaignFormPage` e `AdminOrdersPage.aviso`) passaram rodando sozinhos: 48 de 48. Isso aponta para contenção, não defeito, mas a suíte inteira do painel ainda não foi remedida sozinha.
> - **Tipos:** sem erro novo. Loja, servidor da loja e mobile-adm deram 0; o painel deu os mesmos 7 erros de antes e o `core` os mesmos 11.
> - **Lint:** sem regressão. A loja ficou em 2/2, o painel em 23/5 e o mobile-adm em 0/0, todos iguais ao baseline.
> - **Build:**
>   - A primeira tentativa quebrou porque o worktree não tem os arquivos `.env` dos apps.
>   - Passando na linha de comando a URL e a chave pública do Supabase local, os três apps compilaram.
> 
> **O que falta**
> 1. Remedir a suíte da loja e a do painel, cada uma sozinha.
> 2. Rodar o probe do checkout da T05 (`probes/05-sacola-e-checkout.sh`), que nunca foi executado. Antes é preciso servir as functions do worktree com chaves externas inválidas, e depois encerrar o serve e conferir com `docker ps -a`.
> 3. Fazer a tabela de cobertura dos critérios de aceite.
> 4. Escrever o `qa-report.md` e a linha `validation 1` nos Gates do `item.md`, e levar as premissas de raio largo para a seção Decisões do `spec.md`.
> 5. Se tudo passar, mudar o item para `fase: done`.
> 
> Os logs dos gates estão em `/private/tmp/claude-503/-Users-rafael-santos-Projetos-uma-estrelinha-store/eaef95c3-de46-4d2e-b865-767f3ea6589c/scratchpad/wi/102/val/`.
> 
> [[WI:PROGRESS:9/9]]
> [[WI:IMPLEMENT:BLOCKED:limite de uso atingido no meio da Validation — falta remedir loja e painel isolados, probe 05, qa-report]]

**Parecer de Têmis:**

O bloqueio é real e não sou eu quem resolve. É o limite de uso da conta. Nenhum artefato, comando de leitura ou alternativa da skill faz a sessão voltar a rodar antes de o limite renovar, e não há decisão de produto pendente.

**O que conferi**
- O `item.md` continua em `fase: validation` (`.specs/work-items/102-desconto-de-campanha/item.md:6`).
- Ainda não existem `qa-report.md` nem `qa/`. Na pasta do WI há só `implement-log.md`, `item.md`, `prd-review.md`, `prd.md`, `probes/`, `spec.md`, `tasks/` e `waves.md`.
- O probe `probes/05-sacola-e-checkout.sh` existe e a T05 o exige como critério (`tasks/05-sacola-e-checkout.md:158`: "CA-13, CA-16 e CA-17 provados por teste e pelo probe HTTP"). A Validation só fecha depois de ele rodar.
- O que já foi medido bate com os baselines do CLAUDE.md: tipos 0 · 7 · core 11 e lint 2/2 · 23/5 · 0/0. Isso não precisa ser refeito.

**Pergunta ao humano**
Para destravar, um passo só: quando o limite de uso renovar, retome a sessão do WI 102 e diga "continue a Validation".

Se você mandar continuar, a ordem dos passos é a que a própria sessão listou, e todos já estão dentro da fila aprovada:
1. Remedir a suíte da loja e a do painel, cada uma sozinha. A forma é `pnpm --filter @estrelinha/<w> test --testTimeout=20000`, sem o `--`, com o exit code capturado fora de pipe. Convém que o WI 101 não esteja rodando suíte ao mesmo tempo: o `Timeout calling "onTaskUpdate"` e os dois arquivos que só caíram na suíte cheia apontam para contenção.
2. Rodar o `probes/05-sacola-e-checkout.sh` com `supabase functions serve --env-file <arquivo com chaves externas inválidas>`, nunca com o `.env` da raiz. Depois encerrar o serve e conferir com `docker ps -a`.
3. Fazer a tabela de cobertura dos critérios de aceite.
4. Escrever o `qa-report.md`, a linha `validation 1` nos Gates do `item.md`, e levar as premissas de raio largo para a seção Decisões do `spec.md`.
5. Só então passar o item para `fase: done`.

**Minha recomendação:** retomar a sessão depois que o limite renovar, de preferência com o WI 101 parado durante as duas suítes. Não decidi porque o que destrava é a conta, não uma regra da skill nem a política.

**O humano respondeu:**

siga

## G3 — gate da página (1 item)

- Etapa: Plano de QA · humano respondeu na página · página web da wi-workflow

**Página:** http://127.0.0.1:8477/

**Respostas (answers.json):**

```json
{
  "wi": "102",
  "respostas": [
    {
      "id": "Q-01",
      "escolha": "(A) Sim, o Desfazer devolve também as marcações",
      "texto": ""
    }
  ],
  "enviadoEm": "2026-11-13T18:28:56.231Z"
}
```

## G4 — Gate 1 — aprovação do plano de QA

- Etapa: Plano de QA · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

>   | --- | --- |
>   | L1 | CH-01 |
>   | L2 | CH-02 · CH-03 |
>   | L3 | CH-04 · CH-05 |
>   | L4 | CH-07 design-check |
>   | L5 | CH-06, a virada para "Dia das Mães" |
>   | L6 | CH-08 CFR, sozinho |
> 
>   ⚠ Depois da Q-01, o CH-02 marca uma peça da massa M-G com 10 % na Black Friday e a desfaz em seguida. O CH-03, no mesmo lote, pode ver essa peça em `/ofertas` por alguns segundos. O plano manda o CH-03 ignorar essa oscilação. A regra de lotes, porém, pede "na dúvida, lotes separados". Recomendo rodar o CH-02 sozinho, o que dá 7 lotes. É só a ordem de despacho; o conteúdo do plano não muda.
> - **Perguntas 🟡:**
>   - A peça de R$ 209,90 do CA-03 pode não existir no banco local. Os valores esperados saem da regra RN-06.
>   - O sitemap do CA-09 fica com a Validation. A QA confere o `noindex` da página.
>   - A cobrança é conferida pelo total do pedido gravado. Com a chave inválida, a página do PIX falhar não é achado.
>   - **Afeta o celular:** o "Ver todas" do bloco "Joias em oferta" da Home hoje só aparece a partir de 768 px, e o design o desenha também no celular. Recomendo decidir agora se no celular é esperado: se for, o TC espera e a ausência vira bug.
>   - O botão "Ver as coleções" do estado vazio leva à Home.
>   - O CLS do bloco é medido pelas metas do guia de CFR.
>   - A "Dia das Mães" começa no minuto seguinte ao fim da Black Friday.
>   - A fonte a 200 % é simulada; o Android real fica de fora.
> - **Arquivos:**
>   - `/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/qa/test-plans/`
>   - `/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102/.specs/work-items/102-desconto-de-campanha/qa/test-cases/`
> 
> Aprova o plano, com as duas recomendações (CH-02 sozinho no lote e o "Ver todas" esperado também no celular)? Ou prefere algum ajuste?
> 
> [[WI:QA_REPORT:ASK:Gate 1 — aprovação do plano de QA]]

**Resposta:**

Decidiu: **Gate 1 aprovado, com as duas recomendações.** É uma decisão delegada pela política do humano ("QA local: aprovar o plano de QA (Gate 1) quando bate com o relatório dos agentes e com o que está em `qa/`").

O que conferi no plano (`.specs/work-items/102-desconto-de-campanha/qa/test-plans/campanhas-de-desconto-test-plan.md`):
- **Cobertura:** a tabela tem 25 linhas de critério, CA-01..CA-17 e R-01..R-08, cada uma com TC. A linha 296 diz "Sem cobertura: nada". As duas metades que dependem da Validation (o sitemap do CA-09 e a cobrança do CA-03/04) estão declaradas nos 🟡.
- **Perguntas:** nenhuma 🔴 aberta. A Q-01 está marcada ✅, com a resposta (A), linhas 318-320.
- **TCs:** `qa/test-cases/` tem 33 arquivos. O TC-FUNC-021 traz as duas variações do "Desfazer" e diz que, se ele devolver só os campos do produto, é bug (linhas 5, 13 e 49).
- **Charters:** são 8 em 6 lotes (linhas 144-151), e as massas e a ordem batem com o resumo.

Sobre as duas recomendações:
1. **CH-02 sozinho num lote (7 lotes):** aceito. É o caminho conservador da regra "na dúvida, lotes separados" e tira a oscilação de `/ofertas` que o 🟡 da linha 321 descreve. Antes de despachar, registre a ordem nova na tabela de charters do plano: L2 = CH-02, L3 = CH-03, e os lotes seguintes renumerados. Também tire do 🟡 da linha 321 a instrução para o CH-03 ignorar a oscilação, porque ela deixa de existir.
2. **"Ver todas" esperado também no celular:** aceito como o plano já escreve (linha 332). O design o desenha sem restrição de largura, e a QA confere contra a fonte de design aprovada. Se faltar no celular, vira achado. Se a dona preferir o comportamento atual, a escolha volta na triagem como decisão de produto, então nada se decide agora além da expectativa do TC.

Depois de atualizar a tabela de lotes, marque `**Gate 1:** aprovado` (linha 57) e siga para a execução, com o L1 = CH-01.

## G5 — Gate 1 — aprovação do plano de QA

- Etapa: Plano de QA · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

> - **Lotes:**
> 
>   | Lote | Charters |
>   | --- | --- |
>   | L1 | CH-01 |
>   | L2 | CH-02 · CH-03 |
>   | L3 | CH-04 · CH-05 |
>   | L4 | CH-07 |
>   | L5 | CH-06 |
>   | L6 | CH-08 (CFR) |
> 
>   ⚠ Recomendo rodar o CH-02 sozinho, num 7º lote. Ele marca e desfaz uma peça da Black Friday enquanto o CH-03, no mesmo lote, lê `/ofertas`.
> - **Perguntas 🟡:**
>   - A peça de R$ 209,90 do CA-03 pode não existir no local; os valores saem da regra RN-06.
>   - O sitemap fica com a Validation.
>   - O PIX falhar com chave inválida não é achado.
>   - **"Ver todas" no celular:** hoje o bloco só o mostra a partir de 768 px. Recomendo decidir agora se no celular é esperado.
>   - O botão "Ver as coleções" do estado vazio leva à Home.
>   - O CLS do bloco é medido pelas metas do guia de CFR.
>   - A "Dia das Mães" começa logo depois do fim da Black Friday.
>   - A fonte a 200 % é simulada no navegador.
> 
> Aprova o plano com as duas recomendações (CH-02 sozinho no lote e o "Ver todas" esperado também no celular), ou prefere algum ajuste?
> 
> [[WI:QA_REPORT:ASK:Gate 1 — aprovação do plano de QA]]

**Resposta:**

Decidiu: o plano de QA está aprovado (Gate 1), com as duas recomendações. A política do humano delega essa decisão: "QA local: aprovar o plano de QA (Gate 1) quando bate com o relatório dos agentes e com o que está em `qa/`".

O que conferi:
- **Casos:** há 33 TCs em `qa/test-cases/`, e as prioridades são as do resumo: P0 9, P1 21, P2 3.
- **Charters:** são 8 em `qa/test-plans/charters/`, e a tabela de ordem do plano está em `campanhas-de-desconto-test-plan.md:142-151`.
- **Cobertura:** a seção Cobertura (`:280-295`) liga os 25 critérios a algum TC, CA-01..CA-17 e R-01..R-08, e não deixa nenhum sem caso. O sitemap e a cobrança depois do pagamento ficam com a Validation, e isso está escrito como 🟡.
- **Perguntas:** não há nenhuma 🔴. A Q-01 já foi respondida pela página com (A) e está aplicada no TC-FUNC-021 (`:287` e `:316-320`).

As duas recomendações, que o planner aplica no plano antes de marcar `**Gate 1:** aprovado`:
1. **CH-02 sozinho num lote próprio.** O CH-02 passa a ser L2 sozinho, e o CH-03 vai para o lote seguinte, com a numeração dos lotes de L3 em diante empurrada em um. A troca acaba com a oscilação de `/ofertas` que a 🟡 de `:321-324` tentava contornar. A ordem da massa não muda, porque o CH-02 continua antes do CH-03. Depois disso a 🟡 de `:321-324` pode dizer que a oscilação deixou de existir.
2. **"Ver todas" esperado também no celular.** Essa expectativa vem da `spec.md:173` e do H-10 (`spec.md:405`), que pedem o "Ver todas" no bloco sem restrição de largura. A tarefa 07 também não traz essa restrição. É a leitura da costura, e não uma decisão de produto nova. Se faltar em 390, vira achado, e a triagem decide o destino como em qualquer bug. A 🟡 de `:332` e os casos TC-FUNC-018 e TC-UI-005 ficam como estão.

As outras 🟡 também ficam como estão: o valor do CA-03 pela RN-06, o PIX falhando com chave inválida, que não é achado, o "Ver as coleções" levando a `/`, o CLS pelas metas do guia de CFR e a fonte a 200 % simulada no navegador.

O próximo passo é a Fase 2, a execução dos lotes na ordem nova, com as pré-condições do plano: o bloqueio de `*.supabase.co` e de `**/g/collect*`, os e-mails no Mailpit, 390×844 antes de 1440×900 e nunca pagar.

## G6 — Gate 3 — confirmação do veredito de QA

- Etapa: Execução de QA · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

> | BUG-002 | high | Peça com "de/por" leva os 10 % sobre o "por": a loja e o pedido cobram R$ 314,91 em vez de R$ 336,60. O feed traz R$ 336,60, então loja e Google divergem. |
> | BUG-003 | high | O resumo do checkout não tem a linha "Desconto de campanha", e o subtotal é diferente do pedido. O total bate. |
> | BUG-004 | high | Na página do produto, o leitor de tela lê o preço riscado sem "De". |
> | BUG-005 | medium | Na nova campanha sem nenhum percentual, a tela diz "10% já está na campanha." em vez de pedir um percentual. |
> | BUG-006 | medium | O bloco da campanha na Home não tem "Ver todas" no celular. |
> 
> **Transições:** nenhuma, porque é a primeira rodada. A triagem sugere seis lotes de correção, um por bug.
> 
> **O que ficou sem cobertura:**
> - **CH-07, conferência contra o protótipo:** não rodou porque o MCP do Claude Design recusou o acesso. Para rodar na próxima rodada, alguém precisa fazer `/design-login`.
> - **Edição em massa e os dois Desfazer** (TC-FUNC-010, TC-FUNC-021 e TC-UI-004): nenhum explorador chegou a eles. A thread marcou M-G direto no banco local só para o CH-06 poder rodar.
> - **Orçamento:** seis charters esgotaram o orçamento antes de parte dos casos. O CH-02 precisa ser dividido na próxima rodada.
> 
> **Pergunta ao produto (1):** quando a campanha acaba com o checkout aberto, o total sobe de R$ 695,55 para R$ 767,16 e só o botão "Pagar" e o resumo mudam, sem nenhuma mensagem. O critério R-02 (UC-05) fica satisfeito pela nova confirmação, ou a loja deve explicar o que mudou?
> - Minha recomendação é que o comportamento atual basta para este WI, porque ninguém paga um valor que não viu. A mensagem explicativa iria para um **WI novo**, com destino `WI novo` em `decisoes-produto.md`.
> 
> **Massa deixada no banco local para a rodada de confirmação:**
> - campanhas: "Black Friday" encerrada, "Dia das Mães" em vigência e "Natal" agendada;
> - cupons `QA10` e `QAFRETE`, a promoção "QA102 Progressiva Pulseiras" e um Compre Junto entre duas pulseiras;
> - o bloco da campanha na Home;
> - pedidos #0603 a #0605 e a proposta P-0045, todos sem pagamento.
> 
> Confirma o veredito `fail`, os 6 bugs com essas severidades e a recomendação para a pergunta ao produto? Com a confirmação, gravo `**Gate 3:** confirmado` no `qa-result.md`, a linha no `item.md` e `decisoes-produto.md`.
> 
> [[WI:QA_EXEC:ASK:Gate 3 — confirmação do veredito de QA]]

**Resposta:**

Confirmo o Gate 3 do WI 102, rodada 1: veredito `fail`, 6 bugs novos com as severidades propostas (1 critical, 3 high, 2 medium). É decisão delegada pela política do humano: "QA local: … confirmar o veredito (Gate 3) quando batem com o relatório dos agentes e com o que está em `qa/`". Há também o precedente do WI 92 (Gate 3, "Siga").

A pergunta ao produto não pode ser confirmada no chat. Ela vai à página.

**O que conferi**
- **Veredito:** `qa/qa-result.md:4` traz `"verdict": "fail"`. O resumo (`:132`) aponta o BUG-001 critical aberto e os quatro TC P0 que falharam: TC-FUNC-003, TC-FUNC-004, TC-FUNC-005 e TC-JOURNEY-002 (`:69-71`, `:96`).
- **Contagens:** 16 pass, 7 fail e 10 skip (`:153`). A cobertura é de 15 de 25 critérios, com 5 em `missing` (`:36`, `:64`). Os 6 bugs se dividem em 1 critical, 3 high e 2 medium (`:119-121`, `:252-259`).
- **Evidência:** os seis `qa/issues/BUG-00*.md` existem e cada um aponta screenshots que estão em `qa/screenshots/`. Os BUG-001, 002 e 003 têm mais de uma ocorrência, em charters diferentes.
- **BUG-002 é bug de verdade:** o `prd.md:127` (RN-06) diz que o desconto não soma com o "de/por". O `spec.md:416` (I-02) diz que a peça só é de campanha quando a campanha baixa o preço dela.
- **Transições:** nenhuma, porque é a primeira rodada e a pasta `issues/` estava vazia (`:276`).

**Ressalva ao BUG-001 (fica como critical)**
O `qa-result.md:331-334` admite que o toque pode ser em parte artefato do driver headless. Mantenho critical porque o impacto, se o bug for real, bloqueia a compra no celular, e o celular é o caso principal da loja.

Mas a fix task do L1 precisa começar reproduzindo o toque de verdade: emulação de toque ou um celular real, e não só o clique do agent-browser. Se não reproduzir com toque real, o caminho é `cannot-reproduce` no reteste, e não uma correção às cegas. O reteste deve conferir também a lixeira da gaveta da sacola.

**O que gravar agora**
- `**Gate 3:** confirmado em 2026-11-13` no `qa-result.md`.
- A linha `QA · Gate 3 — veredito` no `item.md`.

**O que não gravar no chat:** a resposta da pergunta ao produto P-01 (R-02/UC-05, o checkout que relê o total sem mensagem) e o `decisoes-produto.md`.

Pelo `wi-qa-validation/references/setup/gates.md:11` e `:113-117`, as perguntas ao produto vão à página da `wi-workflow` depois do Gate 3. Elas não bloqueiam o registro dele. Suba a página com a P-01 e o destino `P-01-destino` (padrão `WI novo`). A sua recomendação, "basta para este WI; a mensagem vai para WI novo", entra como sugestão. Quem responde é o humano. A linha `QA · perguntas ao produto` no `item.md` só entra com a resposta.

**Para a rodada de confirmação, depois das correções**
- Dividir o CH-02 em duas sessões: recusas numa, edição em massa e os dois Desfazer (R-01/Q-01) na outra.
- Cobrir CA-08, CA-11, CA-17, R-01 e R-06.
- O CH-07 continua dependendo de alguém fazer `/design-login`. Essa credencial é do humano.

**Próximo passo:** subir a página com a P-01. Em seguida, a triagem segue com os seis lotes de correção L1–L6, um bug por lote, todos no mesmo repositório.

## G7 — gate da página

- Etapa: Execução de QA · humano respondeu na página · página web da wi-workflow

**Página:** /private/tmp/claude-503/-Users-rafael-santos-Projetos-uma-estrelinha-store/eaef95c3-de46-4d2e-b865-767f3ea6589c/scratchpad/wi/102/qa-produto

**Respostas (answers.json):**

```json
{
  "respostas": [
    {
      "id": "P-01",
      "escolha": "Basta como está — o novo total no botão é a nova confirmação",
      "texto": "Decidido pela recomendação do QA, sob delegação explícita do humano (orquestrar sem intervenção). A mensagem explicativa no checkout vai a WI novo."
    },
    {
      "id": "P-01-destino",
      "escolha": "WI novo",
      "texto": "A melhoria da mensagem fica fora deste WI."
    }
  ],
  "enviadoEm": "2026-11-13T19:50:18.532Z"
}
```

## G8 — Gate 3 — confirmação do veredito de QA

- Etapa: Execução de QA · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

> | BUG-003, 004, 005, 006 | open → resolved | O checkout mostra a linha "Desconto de campanha", o leitor de tela lê "De" antes do preço riscado, a tela de nova campanha explica que falta percentual, e "Ver todas" aparece no celular. |
> 
> **Bugs novos:**
> 
> | Bug | Gravidade | O que acontece |
> | --- | --- | --- |
> | BUG-007 | high | O aviso da edição em massa de campanha não tem "Desfazer". Já estava registrado como desvio na tarefa T03, mas contraria a Q-01 (A) do plano: a dona não consegue voltar um lote errado pela tela. |
> | BUG-008 | high | O cupom QA10 dá desconto na peça de campanha que já tinha "de/por" (M-C): R$ −67,66 em vez de −34,00, e o pedido #0607 grava esse valor. Na peça de campanha sem "de/por" (M-A), o cupom continua recusado. Conta como regressão: o mesmo caso de teste passava na rodada 1. |
> | BUG-009 | high | No pedido com promoção progressiva (#0608), o resumo não mostra a linha "Desconto PIX" e as linhas não somam o total, embora o total esteja certo. Pode existir desde antes deste WI. |
> 
> A triagem sugere quatro lotes de correção, um bug em cada: L1 BUG-008, L2 BUG-002 (o "De" no pedido), L3 BUG-009, L4 BUG-007. Nenhuma pergunta ao produto, por ser rodada de confirmação. As sugestões de backlog estão no `qa-result.md`: o cartão da M-B mostra uma variação e ordena por outra (TC-FUNC-020), a Home rola de lado no celular, e mais pontos de polimento.
> 
> **Minha recomendação: confirmar como está.**
> 1. Manter o BUG-002 aberto: o resultado esperado, já confirmado, inclui o "De" no pedido, e a correção é pequena.
> 2. BUG-007 fica `high`: a Q-01 (A) é decisão explícita.
> 3. BUG-008 fica `high`: é cobrança errada.
> 4. BUG-009 fica `high`, com a observação de que quem corrigir confira primeiro se o defeito já existia na `master`. Se existia, a correção continua cabendo neste WI, porque o resumo do pedido é superfície que ele tocou.
> 
> As alternativas são:
> - (b) marcar o BUG-002 como resolvido e mandar o "De" do pedido para o backlog;
> - (c) baixar o BUG-007 para `medium`.
> 
> Ao confirmar, gravo os estados e o Histórico dos nove bugs, a linha `**Gate 3:** confirmado` no `qa-result.md` e a linha de QA no `item.md`, e confiro no disco. Os apps, as functions e as sessões de browser estão encerrados, o interruptor do feed voltou ao original e a lista de containers está igual à do início.
> 
> [[WI:QA_EXEC:ASK:Gate 3 — confirmação do veredito de QA]]

**Resposta:**

Confirmo o Gate 3 do WI 102, rodada 2 (confirmação): o veredito é `fail`, com a opção recomendada pela sessão (não a (b) nem a (c)). Os três bugs novos ficam `high`: BUG-007, BUG-008 e BUG-009. BUG-001, 003, 004, 005 e 006 passam a `resolved`, e o BUG-002 fica `still-open` (`high`). Decisão delegada pela política do humano ("QA local: … confirmar o veredito (Gate 3) quando batem com o relatório dos agentes e com o que está em `qa/`"). Segue o precedente do 92 e o G6 desta etapa.

O que conferi nos arquivos:
- **Números:** o `qa/qa-result.md` traz `"verdict": "fail"`, 26 pass, 3 fail, 4 skip, 22 de 25 critérios, `missing: []` e 3 bugs `high`. Bate com o resumo da sessão.
- **BUG-002 `still-open`:** o retester o deu como `resolved` (`qa/retest.md:59-99`), mas declarou que fez o "passo 4 sem finalizar o pedido, por regra do briefing" (`qa/retest.md:65`). O Esperado do bug inclui o pedido gravado: "o pedido gravado… com 'De R$ 374,00'" (`qa/issues/BUG-002.md:18-21`, 59-62). A sessão CH-04 fechou o pedido #0607 e viu "de R$ 349,90" (`qa/sessions/CH-04-sacola-e-checkout-com-oferta.md:32,48`). A transição proposta difere da do retester, mas é mais rígida e vem da única sessão que chegou ao pedido. Ela se sustenta.
- **BUG-007 `high`:** a Q-01 (A) está gravada no plano (`qa/test-plans/campanhas-de-desconto-test-plan.md:103,316`). O desvio da T03 também está registrado: "a marcação de campanha não volta pelo toast" (`session-summary.md:74`). O aviso sem Desfazer aparece em `screenshots/CH-02-r2-04-toast-lote-sem-desfazer.png`.
- **BUG-008 `high`:** o cupom QA10 dá −R$ 67,66 com a M-C no pedido #0607 gravado (`CH-04…md:32`; `issues/BUG-008.md`). Foi reproduzido 3 de 3 vezes. É cobrança errada.
- **BUG-009 `high`:** as linhas do pedido #0608 somam R$ 1.283,41 contra um total de R$ 1.194,96, sem a linha "Desconto PIX" (`CH-04…md:38`; `issues/BUG-009.md`).
- **TC-FUNC-020:** falhou sem bug próprio. Foi para Sugestões de backlog como pré-existente (a variação mostrada no cartão). Aceito.

Uma ressalva sobre o BUG-009: confirmar o Gate 3 não decide o escopo da correção. Quem pegar o lote L3 confere primeiro na `master`. Se o defeito já existia lá, essa evidência entra na aprovação das fix tasks. Defeito anterior ao WI pode ser escopo novo, e aí a pergunta sobe ao humano. Fica fora da confirmação de agora.

Pode gravar os estados e o Histórico dos nove bugs, a linha `**Gate 3:** confirmado` no `qa/qa-result.md` e a linha de QA no `item.md`, e conferir no disco. O próximo passo são as fix tasks dos quatro lotes que a triagem sugeriu (L1 BUG-008, L2 BUG-002, L3 BUG-009, L4 BUG-007). O CH-07 continua sem rodar até o humano fazer `/design-login`.

## G9 — Gate 3 — confirmação do veredito de QA

- Etapa: Execução de QA · Têmis escalou ao humano

**Pergunta (fim da resposta de Maestro, a sessão):**

> | BUG-009 | open → resolved | Os resumos do #0610 e do #0611 trazem o "Desconto PIX" e fecham o total. |
> 
> ⚠️ **BUG-002: o retester disse `still-open`, a triagem propõe `resolved`.** O que diverge é só a tela do pedido no painel (`/admin/pedidos/:id`), que mostra R$ 349,90 riscado. O valor cobrado e as linhas do pedido estão certos.
> 
> **Recomendação: (A), aceitar `resolved`** e levar a tela do pedido no painel a backlog. Foi o que a triagem propôs, pelos motivos abaixo:
> - Os passos, a tela e o componente do bug não citam essa tela.
> - Ninguém paga errado por ela.
> - Esta é a última rodada.
> 
> A alternativa é **(B), manter `still-open`**. Aí o veredito vira `fail` e o BUG-002 volta às correções.
> 
> **Sugestões de backlog, que não viram bug:**
> - formulário de campanha rolando de lado com a fonte a 200 % (é a parte do CA-15 que fica sem cumprir);
> - interruptor "Campanha ligada" com 44 × 24 px;
> - o pedido no painel mostrar o mesmo "de" que a cliente viu;
> - linhas do pedido da loja com a mesma composição do checkout;
> - aviso de cookies cobrindo o cartão em 390 (pré-existente).
> 
> **Perguntas ao produto:** nenhuma, porque esta é uma rodada de confirmação.
> 
> O ambiente já está limpo: servidores e functions fora do ar, feed restaurado, M-G em Natal 15 % e os mesmos containers de antes. Pedidos criados nesta rodada: #0609 a #0612, todos pendentes de PIX.
> 
> Peço a confirmação: (A) aceitar o veredito com as quatro transições para `resolved`, que é a minha recomendação, ou (B) manter o BUG-002 `still-open`.
> 
> [[WI:QA_EXEC:ASK:Gate 3 — confirmação do veredito de QA]]

**Por que Têmis escalou:**

Escalo ao humano o Gate 3 do WI 102, rodada 3 (confirmação). Não decidi porque a transição proposta para o BUG-002 contradiz o veredito do retester. A regra que me delega o Gate 3 só vale quando a transição é igual à do `wi-qa-retester`. Escolher entre os dois é decidir o que o "Esperado" do bug cobre, e essa leitura é de produto.

**O que diverge nos arquivos:**
- O retester deu `still-open` (`qa/retest.md:14-60`). A prova dele é `screenshots/retest-r3-BUG-002.png`: no pedido #0609 aberto no painel, a M-C aparece com "R$ 349,90" riscado e R$ 336,60.
- A triagem propõe `resolved` (`qa/qa-result.md:308` e `:313-330`), com o argumento de que a tela do pedido no painel fica fora do Esperado.
- O Esperado (`qa/issues/BUG-002.md:61-63`) diz: "igual no painel (topo e tabela), no cartão, na página, na sacola, no checkout, **no pedido** e no feed". "No pedido" não diz se é o pedido da loja ou também o do painel.
- No histórico do bug, a rodada 2 (`BUG-002.md:105`) manteve `still-open` justamente porque o pedido gravado mostrava "de R$ 349,90".

**O que está certo e coincide com a sessão:** o valor cobrado, o total e o "de R$ 374,00" no cartão, em `/ofertas`, na página, na sacola, no checkout, no `/pedido` da loja e no feed. BUG-007, BUG-008 e BUG-009 passam a `resolved` e o retester concorda. Nenhum bug novo, nenhum TC P0 falhou, e o CH-07 não rodou por falta do `/design-login`.

**Opções:**
- **(A) Aceitar o BUG-002 como `resolved`.** O veredito fica `partial` e "o pedido no painel mostra o mesmo 'de' que a cliente viu" vai a backlog.
- **(B) Manter o BUG-002 `still-open`.** O veredito vira `fail` e o lote L1 volta às correções (`qa-result.md:298-302`).

**Recomendação: (A).**
- O que fica errado é só a exibição numa tela interna da dona. O valor cobrado e o total estão certos.
- Esta é a última rodada.
- O conserto é pequeno e cabe num WI próprio.

Nos dois casos, BUG-007, BUG-008 e BUG-009 passam a `resolved` como propostos. As sugestões de backlog da sessão ficam como estão. Entre elas está o formulário de campanha rolando de lado com a fonte a 200 %, que é a parte do CA-15 que fica sem cumprir.

## G9 — Gate 3 — confirmação do veredito de QA

- Etapa: Execução de QA · humano decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

> | BUG-009 | open → resolved | Os resumos do #0610 e do #0611 trazem o "Desconto PIX" e fecham o total. |
> 
> ⚠️ **BUG-002: o retester disse `still-open`, a triagem propõe `resolved`.** O que diverge é só a tela do pedido no painel (`/admin/pedidos/:id`), que mostra R$ 349,90 riscado. O valor cobrado e as linhas do pedido estão certos.
> 
> **Recomendação: (A), aceitar `resolved`** e levar a tela do pedido no painel a backlog. Foi o que a triagem propôs, pelos motivos abaixo:
> - Os passos, a tela e o componente do bug não citam essa tela.
> - Ninguém paga errado por ela.
> - Esta é a última rodada.
> 
> A alternativa é **(B), manter `still-open`**. Aí o veredito vira `fail` e o BUG-002 volta às correções.
> 
> **Sugestões de backlog, que não viram bug:**
> - formulário de campanha rolando de lado com a fonte a 200 % (é a parte do CA-15 que fica sem cumprir);
> - interruptor "Campanha ligada" com 44 × 24 px;
> - o pedido no painel mostrar o mesmo "de" que a cliente viu;
> - linhas do pedido da loja com a mesma composição do checkout;
> - aviso de cookies cobrindo o cartão em 390 (pré-existente).
> 
> **Perguntas ao produto:** nenhuma, porque esta é uma rodada de confirmação.
> 
> O ambiente já está limpo: servidores e functions fora do ar, feed restaurado, M-G em Natal 15 % e os mesmos containers de antes. Pedidos criados nesta rodada: #0609 a #0612, todos pendentes de PIX.
> 
> Peço a confirmação: (A) aceitar o veredito com as quatro transições para `resolved`, que é a minha recomendação, ou (B) manter o BUG-002 `still-open`.
> 
> [[WI:QA_EXEC:ASK:Gate 3 — confirmação do veredito de QA]]

**Parecer de Têmis:**

Escalo ao humano o Gate 3 do WI 102, rodada 3 (confirmação). Não decidi porque a transição proposta para o BUG-002 contradiz o veredito do retester. A regra que me delega o Gate 3 só vale quando a transição é igual à do `wi-qa-retester`. Escolher entre os dois é decidir o que o "Esperado" do bug cobre, e essa leitura é de produto.

**O que diverge nos arquivos:**
- O retester deu `still-open` (`qa/retest.md:14-60`). A prova dele é `screenshots/retest-r3-BUG-002.png`: no pedido #0609 aberto no painel, a M-C aparece com "R$ 349,90" riscado e R$ 336,60.
- A triagem propõe `resolved` (`qa/qa-result.md:308` e `:313-330`), com o argumento de que a tela do pedido no painel fica fora do Esperado.
- O Esperado (`qa/issues/BUG-002.md:61-63`) diz: "igual no painel (topo e tabela), no cartão, na página, na sacola, no checkout, **no pedido** e no feed". "No pedido" não diz se é o pedido da loja ou também o do painel.
- No histórico do bug, a rodada 2 (`BUG-002.md:105`) manteve `still-open` justamente porque o pedido gravado mostrava "de R$ 349,90".

**O que está certo e coincide com a sessão:** o valor cobrado, o total e o "de R$ 374,00" no cartão, em `/ofertas`, na página, na sacola, no checkout, no `/pedido` da loja e no feed. BUG-007, BUG-008 e BUG-009 passam a `resolved` e o retester concorda. Nenhum bug novo, nenhum TC P0 falhou, e o CH-07 não rodou por falta do `/design-login`.

**Opções:**
- **(A) Aceitar o BUG-002 como `resolved`.** O veredito fica `partial` e "o pedido no painel mostra o mesmo 'de' que a cliente viu" vai a backlog.
- **(B) Manter o BUG-002 `still-open`.** O veredito vira `fail` e o lote L1 volta às correções (`qa-result.md:298-302`).

**Recomendação: (A).**
- O que fica errado é só a exibição numa tela interna da dona. O valor cobrado e o total estão certos.
- Esta é a última rodada.
- O conserto é pequeno e cabe num WI próprio.

Nos dois casos, BUG-007, BUG-008 e BUG-009 passam a `resolved` como propostos. As sugestões de backlog da sessão ficam como estão. Entre elas está o formulário de campanha rolando de lado com a fonte a 200 %, que é a parte do CA-15 que fica sem cumprir.

**O humano respondeu:**

siga
