# Decisões do orquestrador — 101

Perguntas da sessão e quem respondeu: o árbitro (agente validador), a página de review técnico ou o humano.

## G2 — a etapa parou sem marcador mais de uma vez

- Etapa: Implementação · Têmis (árbitro) decidiu · etapa parada

**Pergunta (fim da resposta de Maestro, a sessão):**

> O typecheck do painel deu 7 erros, o mesmo número da baseline, que estão todos no `ProposalStateBadge.test.tsx`, herdado de antes deste WI. Confiro isso no log quando o lote terminar. O monitor me acorda a cada gate que fechar.

**Resposta:**

Decidi: pode seguir com a Validation. Não há nada a perguntar ao humano.

O que conferi:
- As quatro tarefas estão `Status: done` (tasks/01..04, linha 3 de cada uma) e o `item.md:6` diz `fase: validation`. Ainda não existe `qa-report.md`. Pela tabela da skill (`wi-workflow/SKILL.md:196`, "todas as tarefas `done` → Validation", e `:344`), o passo atual é a própria Validation, que você já está rodando.
- Os 7 erros de tipo do painel batem com o baseline do projeto. O `CLAUDE.md`, na linha *Tipos* das Baselines, registra "backoffice 7, todos em `ProposalStateBadge.test.tsx` (sem `import` do vitest; commit `4c6e9a16`), herdados". A regra é `validation.md:83-87`: o erro se julga por arquivo contra o baseline da corrida. Erro que já estava lá entra no relatório como pré-existente e não reprova. Ao conferir no log, compare por arquivo, não só pela contagem. Se algum dos 7 estiver fora desse arquivo, é erro novo e reprova.

O próximo passo é deixar o lote terminar e fechar o build check. Depois, escreva o `qa-report.md` conforme `references/execution/validation.md`. O que ele precisa levar:
- **Suíte da loja:** 7257/7257 com exit 1 por `Timeout calling onTaskUpdate`, conforme `implement-log.md` (tarefa 03). Isso não basta como evidência. Remeça a loja sozinha, com `--testTimeout=20000` e o exit capturado fora de pipe. Se o exit for 1 com zero testes reprovados, registre como contenção, com o log.
- **Itens que a tarefa 03 deixou sem cobertura:** CA-05, CA-06, CA-07 e as medidas de layout (390 e 1440). O jsdom não mede layout, então o relatório tem de dizer como esses itens foram provados ou que ficam para a QA em navegador.
- **Os comandos declarados no PROJECT.md:** lint por app, `tsc -p apps/<app>/tsconfig.app.json` e suítes um workspace por vez, comparados com as baselines do `CLAUDE.md`.

Se a Validation der PASS, marque `fase: done` e ofereça a `wi-qa-validation`. Se der FAIL, abra fix tasks com a falha íntegra como critério.

## G3 — gate da página (2 itens)

- Etapa: Plano de QA · humano respondeu na página · página web da wi-workflow

**Página:** http://127.0.0.1:8477/

**Respostas (answers.json):**

```json
{
  "wi": "101",
  "respostas": [
    {
      "id": "Q-01",
      "escolha": "A 200 % a faixa cresce além de duas linhas; a altura fixa vale só para a fonte padrão",
      "texto": ""
    },
    {
      "id": "Q-02",
      "escolha": "Interceptar o documento no navegador e escrever o atributo no <html>, como a função faz (como o plano está escrito)",
      "texto": ""
    }
  ],
  "enviadoEm": "2026-11-13T16:06:48.924Z"
}
```

## G4 — Gate 1 — aprovação do plano de QA

- Etapa: Plano de QA · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

>   Tamanho: grande (critérios 19 · telas 2, contados por mim) · Personas: 4 · Jornadas: 5 · Charters: 7 em 6 lotes · TC: 27 (P0 3 · P1 21 · P2 3 · P3 0)
>   Critérios: 19 de 19 cobertos  ·  sem cobertura: nenhum (parciais: CA-08 — o prazo de cache só num preview da Vercel; CA-06/RN-02 — com o documento interceptado (Q-02); RN-04 — só o perfil atual, o WI 100 não existe)
>   Ambiente da execução: app subido do worktree com o banco local na linha de comando (o worktree não tem .env) · bloqueia *.supabase.co e **/g/collect* · Mailpit :54444 · 390×844 primeiro, depois 1440×900, fonte a 130/200 % · nunca pagar nem alterar store_settings fora do painel · CH-07 (CFR) exige instalar @playwright/cli
>   Automação: e2e 17 (missing 17) · integration 0 · manual 10
>   Respondidas (página): Q-01 — a 200 % a faixa pode passar de duas linhas, e a altura fixa vale só na fonte padrão · Q-02 — interceptar o documento e escrever data-faixa no <html>
>   Perguntas 🟡:
>     - A "loja de hoje" do CA-05 é o master (eceb80c2), servido do checkout principal em :8092
>     - Os destinos dos avisos são categorias reais da loja local (C1, C2), não /ofertas
>     - Os textos são os do protótipo, com o A2 ajustado para exatamente 90 caracteres; o A3 é dado de teste
>     - A pausa pelo dedo é um toque prolongado do driver; sem esse gesto, o passo vira skip
>     - A fonte grande é simulada pela fonte da raiz; a de um Android real fica fora
>     - As artes de teste são geradas pela thread, com fundo liso
>     - CH-05 usa a rota do agent-browser com corpo fixo; uma sonda no começo da sessão confirma que a página abre como HTML, senão o CH-05 passa ao cli
>     - TC-FUNC-010 roda sem rede lenta; o CLS em rede lenta fica com TC-CFR-001
>   Arquivos: .../101-faixa-de-avisos/qa/test-plans/ · .../101-faixa-de-avisos/qa/test-cases/
> Aprova o plano para seguir para a execução?
> ```
> 
> Pontos de atenção:
> - **CH-07 sem driver:** o CFR, que mede o CLS do CA-06, precisa do `playwright-cli`, que não está instalado nesta máquina. Ou ele é instalado antes da execução (`npm install -g @playwright/cli@latest`), ou o CH-07 vai para Fora da cobertura e a rodada fecha `partial`.
> - **🟡 que convém decidir agora:** as duas que mudam a medição, a referência :8092 do CA-05 e a sonda do CH-05.
> 
> O plano continua como rascunho (`**Gate 1:** pendente`) até a aprovação. Nada foi commitado.
> 
> [[WI:QA_REPORT:ASK:Gate 1 — aprovação do plano de QA]]

**Resposta:**

Decidiu: o plano de QA do WI 101 está aprovado (Gate 1). É decisão delegada pela política do humano ("QA local: aprovar o plano de QA (Gate 1) … quando batem com o relatório dos agentes e com o que está em `qa/`"). Pode marcar `**Gate 1:** aprovado` no plano e seguir para a Fase 2.

O que conferi nos arquivos:
- **Perguntas 🔴:** as duas estão respondidas. Ver `qa/test-plans/faixa-de-avisos-test-plan.md:306` (Q-01), `:311` (Q-02) e `item.md:34` (a linha "QA · perguntas do plano", 2 de 2 respondidas). A Q-01 e a Q-02 aparecem no método dos charters: CH-05 em `:140` e CH-07 em `charters/CH-07-cfr.md:14`.
- **Cobertura:** a tabela em `faixa-de-avisos-test-plan.md:262-282` tem os 19 critérios (UC-01..04, RN-01..07, CA-01..08), cada um com pelo menos um TC. A linha "Sem cobertura" diz "nada", e os parciais aparecem com o motivo (`:286-289`): CA-08, CA-06/RN-02 e RN-04. Batem com o resumo da sessão.
- **Contagens:** 7 charters em 6 lotes (`:136-141`) e 27 arquivos em `qa/test-cases/`, como no resumo.

As 🟡 que a sessão destacou, aceitas como estão:
- **Referência do CA-05:** é o `master` (`eceb80c2`) servido do checkout principal em :8092, só lido. É a leitura certa de "idêntica à loja de hoje".
- **Sonda do CH-05:** confirma no começo da sessão que a página interceptada abre como HTML e, se não abrir, o charter passa ao cli. Fica como está escrito.
- As outras 🟡 também ficam como propostas.

CH-07 sem driver: a instalação está prevista no próprio plano. Ela está no Ambiente da execução (`:183-184`) e na lista de pré-requisitos (`:251`). Instale antes da Fase 2 (`npm install -g @playwright/cli@latest`, conferindo com `playwright-cli --version`). Se não der para instalar, o CH-07 vai para Fora da cobertura e a rodada fecha `partial`, pelo critério de saída em `:257`. Nada disso pede nova aprovação.

Mantém-se: nada de commit, nada de gravar em `store_settings` fora do painel, e só o banco local, com `*.supabase.co` e `**/g/collect*` bloqueados.

## G5 — Gate 1 — aprovação do plano de QA

- Etapa: Plano de QA · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

> O plano de QA do WI 101 está pronto e espera a sua aprovação: até lá ele continua como rascunho, com o Gate 1 pendente.
> 
> As duas perguntas 🔴 que você respondeu pela página já estão no plano. Q-01: com a fonte a 200 %, a faixa pode passar de duas linhas, e a altura fixa vale só na fonte padrão. Q-02: no local, o navegador intercepta a página e escreve o `data-faixa` no `<html>`, como a função da Vercel faz. A linha `QA · perguntas do plano` foi registrada no `item.md`.
> 
> O plano tem 4 personas, 5 jornadas, 7 charters em 6 lotes e 27 casos de teste. Os 19 critérios estão cobertos; três só em parte:
> - **CA-08:** o prazo do cache só aparece num preview da Vercel.
> - **CA-06 e RN-02:** são medidos com a página interceptada, como decidido na Q-02.
> - **RN-04:** o contraste só pode ser medido no perfil atual, porque o WI 100 ainda não existe.
> 
> Antes de aprovar, decida duas coisas:
> - **CH-07:** o charter de desempenho, que mede o salto da página (CA-06), precisa do `playwright-cli`, e ele não está instalado nesta máquina. Ou ele é instalado antes da execução (`npm install -g @playwright/cli@latest`), ou o CH-07 sai da rodada e ela fecha como `partial`.
> - **🟡 que mudam a medição:**
>   - **CA-05:** a "loja de hoje" de referência é o `master` servido do checkout principal na porta 8092.
>   - **CH-05:** uma sonda no começo da sessão confere se a página interceptada abre como HTML. Se não abrir, o CH-05 também passa a depender do `playwright-cli`.
> 
> Nada foi commitado.
> 
> [[WI:QA_REPORT:ASK:Gate 1 — aprovação do plano de QA]]

**Resposta:**

Decidiu: **o plano de QA do WI 101 está aprovado (Gate 1).** É uma decisão delegada pela política do humano: "QA local: aprovar o plano de QA (Gate 1) quando bate com o relatório dos agentes e com o que está em `qa/`".

**O que conferi:**
- Os números do resumo batem com o plano. `qa/test-plans/` tem 4 personas, 5 jornadas (J-01..J-05) e 7 charters (CH-01..CH-07, em 6 lotes). `qa/test-cases/` tem 27 TC (P0 3 · P1 21 · P2 3).
- Os 19 critérios estão cobertos (UC-01..04, RN-01..07, CA-01..08), cada um com TC na tabela de cobertura (`faixa-de-avisos-test-plan.md:270-284`). Nenhum ficou sem TC.
- As coberturas parciais estão declaradas com o motivo (`:286-288`): CA-08, CA-06/RN-02 e RN-04.
- As duas perguntas 🔴 (Q-01 e Q-02) estão respondidas e aplicadas no plano (`:306-315`). Nenhuma 🔴 ficou aberta.

**As duas decisões que a sessão pediu:**
- **CH-07: instale o `playwright-cli` antes da Fase 2.** O plano já prescreve isso como pré-requisito (`:183-185`, `:251`): `npm install -g @playwright/cli@latest` e depois a sonda `playwright-cli --version`. Instalar uma ferramenta de teste na máquina é reversível e não toca dado nem ambiente compartilhado. A outra opção, tirar o CH-07, deixaria CA-06 e RN-02 sem a medida de rede lenta e fecharia a rodada como `partial` de saída (`:258`). Se a instalação falhar, o CH-07 vai a `blocked` com o motivo, como o plano já diz.
- **🟡: valem como estão.** A referência de CA-05 é o `master` servido do checkout principal em `:8092` (`:161-162`, `:321`). A sonda do CH-05 roda no começo da sessão e, se o documento interceptado não abrir como HTML, o CH-05 passa ao `cli` (`:316-318`). Os dois são escolhas de medição reversíveis e não mudam o produto.

**O registro já está feito no disco.** O cabeçalho do test-plan já diz `**Gate 1:** aprovado em 2026-11-13` (`:51`), e o `item.md:35` já tem a linha `QA · Gate 1 — plano`. Os dois batem com esta decisão. Registre a decisão também em `orquestrador-decisoes.md`.

**Próximo passo:** instalar e sondar o `playwright-cli`, subir a referência em `:8092` e o build servido, e começar a Fase 2 (execução) na ordem dos lotes do plano.

## G6 — Gate 3 — confirmação do veredito de QA

- Etapa: Execução de QA · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

> - **Severidade:** a sessão propôs `medium`. O triager subiu para `high` porque está na jornada P0 (J-01), como manda a tabela de ajustes do guia de severidade.
> 
> ### Transições
> 
> Nenhuma: não há bug anterior no WI.
> 
> ### Perguntas ao produto
> 
> Nenhuma.
> 
> ### Fora dos bugs
> 
> - **Sugestões de backlog:** 7, sendo 5 de polimento no painel e 2 pré-existentes (o retorno à tela pedida depois do login e o rodapé que desloca a página em rede lenta). Estão no `qa-result.md`.
> - **Riscos residuais:** um Tab que pulou o link do aviso em 1440, visto 1 vez em 2.
> - **Pendência do CH-06:** não rodou. Nem os subagentes nem esta sessão têm o escopo do Claude Design, e ele só roda depois de `/design-login`.
> 
> ### Ambiente
> 
> Desliguei os servidores que subi (:8082, :8083, :8092 e :4173), e não ficou nenhuma sessão de browser aberta. O Supabase local continua de pé, como estava.
> 
> **Recomendação:** confirmar o veredito `fail` e os dois bugs como estão, com BUG-002 e BUG-001 em `high`, nessa ordem de correção. Na rodada de confirmação, além do reteste, retomar os TC que ficaram em `skip`: o checkout do TC-FUNC-011, a faixa desligada (TC-FUNC-009, TC-UI-003, UC-04 e CA-05), e o movimento reduzido e a fonte a 200 % do CH-07. A alternativa é rebaixar o BUG-001 para `medium` (fricção, sem dado errado). Não muda o veredito, porque o BUG-002 continua `high`.
> 
> Confirma o veredito, os bugs novos e a severidade?
> 
> [[WI:QA_EXEC:ASK:Gate 3 — confirmação do veredito de QA]]

**Resposta:**

Confirmo o Gate 3 do WI 101, rodada 1, como a sessão propôs. A decisão foi delegada pela política do humano: o item "QA local" permite confirmar o veredito do Gate 3 quando ele bate com o relatório e com `qa/`. Ela segue também o precedente do WI 92, em que o humano respondeu "Siga" a este mesmo gate.

**Decisão**
- O veredito é `fail`.
- Os dois bugs novos ficam como estão:
  - BUG-002 `high`/P1, corrigido primeiro.
  - BUG-001 `high`/P1, corrigido depois.
- Não há transições nem perguntas ao produto.
- As 7 sugestões de backlog não voltam a este WI.
- Não aceito a alternativa de rebaixar o BUG-001 para `medium`.

**O que conferi**
- **Veredito.** O `qa/qa-result.md` tem `"verdict": "fail"` e `by_severity` com `high: 2`. A régua de `references/triage/checklist.md:89` pede `fail` quando há bug `critical` ou `high` aberto. As contagens batem com o envelope: 14 pass, 2 fail, 11 skip, 6 de 19 critérios cobertos, e `missing` com UC-04, RN-05 e CA-05.
- **BUG-002.** O esperado vem da costura: o `spec.md:275` (H-03) diz "A partir da primeira troca de rota no navegador, decide a configuração", e o `spec.md:305` (I-09) também. A simulação segue o método aprovado em Q-02. Reproduziu 2 de 2, com controle sem o atributo, e as três evidências existem: `qa/screenshots/CH-05-01..03`. `high` está certo pelo nível "Dano à confiança".
- **BUG-001.** O triager subiu de `medium` para `high` com base explícita em `references/triage/severity.md:32`: Fricção numa jornada P0 sobe um degrau. A J-01 é P0 em `qa/test-plans/faixa-de-avisos-test-plan.md:117`. A evidência é `qa/screenshots/CH-01-08-imagem-sem-celular.png`. Por isso não rebaixo.
- **TC P0 sem veredito.** O TC-FUNC-011 está em `skip` e consta em "Fora da cobertura", como pede o `checklist.md:41`. O veredito já é `fail`, então esse `skip` não o altera.

**Próximo passo**
1. Gravar o Gate 3 como manda `references/setup/gates.md:103-111`, nos passos 2 a 4:
   - No `qa-result.md`, trocar "**Gate 3:** pendente" por "confirmado em 2026-11-13".
   - No `item.md`, preencher a linha `QA · Gate 3 — veredito`.
   - Não há bug descartado nem transição a registrar.
2. Abrir as fix tasks na ordem BUG-002 e BUG-001. Cada uma leva o bug inteiro como critério.
3. Incluir na fix task do BUG-002 o caso simétrico que está nos riscos: com a faixa desligada e a página marcada `"1"`, a vaga tem de sumir na troca de rota. É a mesma regra H-03.
4. Na rodada de confirmação, fazer o reteste e retomar os TC que ficaram em `skip`:
   - o checkout do TC-FUNC-011;
   - TC-FUNC-009, TC-UI-003, UC-04 e CA-05, com a faixa desligada;
   - TC-CFR-003 e TC-CFR-004, do CH-07.

**Pendência do humano, que não bloqueia este gate:** o CH-06 (design-check) só roda depois de `/design-login`, que exige o acesso dele. Peça esse login antes da rodada de confirmação.

## G7 — Gate 3 — confirmação do veredito de QA

- Etapa: Execução de QA · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

> **Os casos que entraram nesta rodada:**
> 
> | Caso | Resultado | O que se viu |
> | --- | --- | --- |
> | TC-FUNC-002 (BUG-001) | pass | Com uma arte só e o texto alternativo vazio, o painel mostra as duas pendências juntas. Visto no reteste e no CH-01 |
> | TC-FUNC-010 (BUG-002) | pass | Com a página marcada "sem faixa" e a faixa ligada, a faixa aparece depois da troca de rota. Visto 5 de 5 vezes no reteste, no build servido e no dev server |
> | Caso simétrico do BUG-002 | pass | Com a faixa desligada e a página marcada "com faixa", a faixa some depois da troca de rota e não volta |
> | TC-FUNC-005 | pass | Subir e descer reordenam a lista, aparece "5 de 5" e o botão de acrescentar some no teto |
> | TC-FUNC-009 | pass | Desligar a faixa devolve a loja de sempre, e religar devolve a campanha |
> | TC-CFR-003 | pass | Com movimento reduzido, a faixa não gira |
> | TC-CFR-004 | pass | Com a fonte a 130 % e a 200 % em 390, o link não é cortado |
> | TC-FUNC-011 (P0) | blocked | O checkout não foi alcançado porque a sacola não aceita a peça. Foram 4 peças e 6 toques |
> | TC-UI-003 | skip | A comparação com a loja de hoje (:8092) não coube no orçamento |
> 
> **O que recomendo confirmar:**
> 
> - **BUG-001 → `resolved`.** A T06 mudou o código, e o reteste o viu corrigido duas vezes.
> - **BUG-002 → `resolved`, como o triager propõe.** A T05 só acrescentou testes, sem mudar código de produção. Ainda assim o comportamento esperado apareceu nos dois servidores, e o caso simétrico também está certo. Prefiro `resolved` a `cannot-reproduce` porque a regra está coberta por teste e por navegador. O Histórico do bug vai dizer que não houve mudança de produção.
> - **A sacola não vira bug do WI 101.** O diff do WI só acrescenta `<AnnouncementBar />` ao `StoreLayout`, e a loja de hoje também não reagiu ao toque. Não sabemos ainda se é defeito da loja ou do ambiente local: as rotas `*.supabase.co` estavam bloqueadas e ninguém leu o console nem a rede. Se reproduzir fora do ambiente local, cabe um WI próprio, porque afeta a compra pelo celular. O TC-FUNC-011 segue `blocked` e entra nos riscos residuais.
> - **Zoom a 200 % em 1440 está conforme a costura**, que mostra as setas só a partir de 768 px. O custo para quem usa movimento reduzido vai para o backlog.
> - **CH-06 (design-check) segue `not-run`** até alguém rodar `/design-login`.
> 
> Se confirmar, gravo o status e o Histórico dos dois bugs, o `**Gate 3:** confirmado em 2026-11-13` no `qa-result.md` e a linha `QA · Gate 3 — veredito` no `item.md`. Com isso não sobra bug aberto.
> 
> [[WI:QA_EXEC:ASK:Gate 3 — confirmação do veredito de QA]]

**Resposta:**

Decidiu: confirmo o Gate 3 do WI 101, rodada 2. O veredito é `partial`, sem bug novo, com BUG-001 → `resolved` e BUG-002 → `resolved`. A decisão foi delegada pela política do humano: o item "QA local" permite confirmar o Gate 3 quando ele bate com o relatório e com `qa/`. Ela segue também o precedente do WI 92 ("Siga") e o G6 desta etapa. Pode gravar o que propôs: o status e o Histórico dos dois bugs, `**Gate 3:** confirmado em 2026-11-13` no `qa-result.md` e a linha `QA · Gate 3 — veredito` no `item.md`.

**O que conferi:**
- **`qa/qa-result.md`:**
  - Os números batem com o resumo: verdict `partial`, pass 20, fail 0, blocked 1, skip 6.
  - A cobertura é de 10 de 19 critérios, com 9 parciais e `missing: []`.
  - `issues.total: 0`.
  - O `**Gate 3:** pendente` ainda está lá, à espera da gravação.
- **`qa/retest.md`:** "resolved 2 · still-open 0 · cannot-reproduce 0 · blocked 0". A transição que você propõe é a mesma do retester.
  - BUG-001: 2 de 2 tentativas a partir de um estado limpo, com evidência em `screenshots/retest-BUG-001*.png`.
  - BUG-002: 5 tentativas em :4173 e :8082, pelo mesmo caminho do bug e também a 1440 px.
- **BUG-002 como `resolved` em vez de `cannot-reproduce`:** aceito. É o veredito do retester, e o comportamento esperado foi visto. O Histórico do bug precisa dizer que a T05 só acrescentou testes, sem mudar código de produção, e que a causa da rodada 1 foi o método de interceptação, não o produto.
- **`qa/issues/BUG-001.md` e `BUG-002.md`:** os dois estão `status: open` e `severity: high`. É o que a gravação vai mudar.
- **Sacola e TC-FUNC-011 `blocked`:** concordo que não vira bug do WI 101. `git diff --name-only master...HEAD` não toca nenhum arquivo de cart, sacola, checkout, product-buy nem ProductInfo, e a loja de hoje (:8092) também não reagiu.
  - Ajuste a frase do relatório: o diff não "só acrescenta `<AnnouncementBar />` ao `StoreLayout`". Ele mexe também em `shared/lib/useScrollDirection.ts`, `shared/lib/storeChrome.ts`, `server/page.ts` e `scripts/shell.mjs`. Nenhum desses é da sacola.
  - O TC-FUNC-011 (P0) fica `blocked` nos Riscos residuais, com o próximo passo escrito: reproduzir com o console e a rede lidos e sem as rotas `*.supabase.co` abortadas. Se reproduzir fora do ambiente local, abre-se um WI próprio.
- **CH-06 `not-run`** e as 3 sugestões de backlog estão de acordo com a skill: na confirmação, spec-gap vai para o backlog. Não há pergunta ao produto com destino `escopo deste WI`.
