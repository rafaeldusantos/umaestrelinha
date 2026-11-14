```json
{
  "schema": "qa-plan/v1",
  "title": "Plano de QA — Perfil de estilo da loja (Padrão e Black Friday), com a chave no painel",
  "summary": {
    "total_cases": 24,
    "by_priority": { "P0": 8, "P1": 13, "P2": 3, "P3": 0 }
  },
  "acceptance_criteria_covered": 18,
  "strategy": [
    "Exploração por charter no browser real (agent-browser; playwright-cli no CFR), uma persona por sessão, 390x844 antes de 1440x900",
    "E2E (Playwright) pedido à automação p/ fluxos P0/P1 determinísticos (salvar, voltar, prévia, regra da carga, cores computadas)",
    "Manual p/ legibilidade em sete telas, acessibilidade e conferência contra o protótipo do Claude Design"
  ],
  "cases": [
    { "id": "TC-FUNC-001", "title": "Salvar Black Friday no painel faz a próxima página aberta da loja vir em preto e ouro", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-002", "title": "Voltar ao Padrão pela mesma escolha devolve a loja de sempre sem perder conteúdo", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-003", "title": "O card explica o que muda e quanto tempo leva, mostra o perfil em uso e só deixa salvar quando há mudança", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-004", "title": "Com Black Friday ligado, o painel e o app do ateliê continuam com as cores de sempre", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-005", "title": "\"Ver a loja com este perfil\" mostra a loja no perfil marcado, sem salvar", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-006", "title": "Fechar a prévia por qualquer caminho não muda o perfil marcado, o salvo nem a loja publicada", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-007", "title": "A loja aberta com o perfil anterior não muda de cor enquanto a página está parada", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-008", "title": "Ao trocar de página, a loja aberta passa ao perfil salvo e não volta ao anterior", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-009", "title": "No Black Friday o selo de desconto do cartão e da página do produto fica em ouro, e os outros selos não mudam de papel", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-010", "title": "No Black Friday a barra do frete grátis da sacola é preenchida em ouro forte", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-011", "title": "A marca desenhada acompanha o tom escuro do perfil, e o ícone, a cor do navegador e a imagem de compartilhamento não mudam", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-012", "title": "Com um valor de perfil que a loja não conhece, a loja abre no Padrão e o card mostra o Padrão em uso", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-013", "title": "Salvar o perfil sem conexão não diz que salvou, mantém o perfil em uso e salva na nova tentativa", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-001", "title": "Adri veste a loja de Black Friday pelo painel e depois devolve ao Padrão", "priority": "P0", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-002", "title": "Bia vai da Home ao checkout pelo celular com a loja de Black Friday", "priority": "P0", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-PERSONA-001", "title": "Bia lê todas as telas da cliente no Black Friday, no celular e no computador, sem texto sumindo no fundo", "priority": "P0", "type": "persona", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-REG-001", "title": "Com o perfil Padrão, as telas da cliente ficam idênticas às de antes do Work Item", "priority": "P0", "type": "regression", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-SMOKE-001", "title": "A loja abre com a Home de sempre no perfil Padrão", "priority": "P0", "type": "smoke", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-SMOKE-002", "title": "O card do perfil de estilo aparece em Configurações → Dados da loja com as duas opções", "priority": "P0", "type": "smoke", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-UI-001", "title": "O card do perfil e o modal da prévia seguem o protótipo do painel", "priority": "P2", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-UI-002", "title": "A Home no perfil Black Friday segue o protótipo no computador e no celular", "priority": "P2", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-CFR-001", "title": "Com Black Friday salvo, a primeira pintura já é preto e ouro mesmo em rede lenta, sem passar pela ardósia", "priority": "P1", "type": "cfr", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-CFR-002", "title": "No Black Friday os textos das telas da cliente continuam legíveis, inclusive com a fonte grande", "priority": "P1", "type": "cfr", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-CFR-003", "title": "O card do perfil e a prévia se usam só pelo teclado, com foco visível, e o Esc devolve o foco", "priority": "P2", "type": "cfr", "automation": { "target": "manual", "status": "na" } }
  ]
}
```

# Plano de QA — 100 · Perfil de estilo da loja (Padrão e Black Friday), com a chave no painel

**Work Item:** 100 (feature) · **Escopo:** completo · **Foco:** —
**Versão do plano:** 2 · **Escrito em:** 2026-11-14 · **Modo:** revisar (resposta da Q-01 aplicada)
**Gate 1:** aprovado em 2026-11-14

## Resumo

- **Valor para o usuário:** a dona da loja passa a vestir a vitrine de Black Friday — preto e ouro — por uma escolha em
  Configurações → Dados da loja, confere antes numa prévia sem salvar, e volta à cara de sempre pela mesma escolha, sem
  deploy. A cliente vê a loja de campanha com o desconto em ouro e tudo legível; o painel e o app do ateliê não mudam.
- **Maior risco para o usuário:** o Padrão deixar de ser idêntico ao de hoje (a loja do ano inteiro muda um tom sem
  ninguém pedir), ou o Black Friday esconder texto no checkout / trocar de cor diante da cliente.
- **Contagens:** personas 5 · jornadas 4 · charters 8 (CFR 1 · design-check 1) · TC 24 (P0 8 · P1 13 · P2 3 · P3 0)
- **Automação:** e2e 19 (missing 19 · existing 0 · blocked 0) · integration 0 · manual 5

**Tamanho:** grande — 18 critérios na fonte (UC-01..03, RN-01..08, CA-01..07) e 9 telas (o card e o modal no painel;
Home, categoria, produto, sacola, checkout, confirmação e conta na loja), em dois apps mais o ateliê como "não muda".
Teto do tamanho: personas 3–5, jornadas 3–7, exploratórios até 6, TC até 35. Este plano: 5 · 4 · 6 · 24. Os seis
exploratórios são seis áreas de risco distintas (salvar/voltar, prévia, regra da carga, o perfil nas telas da cliente,
valor desconhecido e falha, o Padrão idêntico) — nenhuma cabe em outra sem passar do orçamento de ações.

**Mudança da versão 2:** a resposta da Q-01 (A). A thread cria, antes do L1, o pedido PIX pendente M1 da `cliente-qa`
pelo checkout local; a confirmação `/pedido/:id` entra no CH-04 (TC-PERSONA-001, passo 3) e no CH-06 (TC-REG-001); RN-08
e CA-01 deixam de ter a cobertura parcial pela confirmação. Nenhum TC novo, nenhum ID mudou.

## Escopo

**Dentro:** o card "Perfil de estilo da loja" e o modal da prévia em `/admin/configuracoes/dados-da-loja`; a loja nas
telas de RN-08 nos dois perfis (390 × 844 e 1440 × 900), inclusive a conta e a confirmação de um pedido; a regra da
carga (atributo `data-perfil` × perfil salvo) com o documento interceptado; o painel e o ateliê como "não muda"; os 18
critérios do PRD.

**Fora:**

- O que o PRD deixa fora (verbatim na costura): perfis criados pela dona; trocar fonte, raio ou imagens; ligar por
  data (WI 102 depois); a faixa de avisos (WI 101), que muda de cor com o perfil sem trabalho próprio; o selo da campanha
  (WI 102), com cores cadastradas na campanha
- A Vercel servindo o HTML pela função `api/page`, o cache de borda real (`HIT`, 5 min / 1 hora): só existem na
  produção. Localmente o documento é interceptado no navegador (ver Ambiente). Os prazos de RN-05 ficam provados pela
  Validation (`serve.test.ts`) e, no navegador, só pelo texto do card
- A metade de CA-04 "um valor reprovado reprova a suíte": é dos sensores da Validation (`contrast`, `accentText`,
  `palette`, `perfilDeEstiloComDonoUnico`)
- Os e-mails (RN-02): não mudam e nenhuma sessão envia e-mail de pedido
- O pagamento do pedido M1 e o conteúdo dele (itens, valores, situação): é massa, não objeto deste WI
- Outras seções de Configurações e as telas do painel além de "não mudou de cor"

## Fontes

| Fonte            | Caminho                                                                    | Uso                                        |
| ---------------- | -------------------------------------------------------------------------- | ------------------------------------------ |
| PRD              | `prd.md` (e `prd-review.md`)                                               | critérios de aceite — a régua da cobertura |
| Costura          | `spec.md` · os "Pronto quando" de `tasks/01..07-*.md`                      | o que o Dev entendeu (R1..R12, H1..H13, C1, C2) e o que ficou fora |
| Fontes de design | `claude_design` · projeto `4abe021d-d77e-4fe7-affd-524180315fa3`: `Black Friday - Home.html` (`bf.css`, `.palco[data-tema="bf"]`) e `Painel - Campanhas, faixa e perfil.html` › "Configurações · perfil de estilo" (`adm-faixa-perfil.jsx`); `link` · https://claude.ai/artifact/2yUJyqwYr6tipVWQEh8xdd | telas existentes; charter `design-check` CH-07 |
| Insumos          | `item.md` › Insumos                                                        | os tokens de hoje (valores do Padrão), os guardas da paleta, o HTML servido e a configuração lida — para saber o que muda e o que é "não sei" no local |
| Validation       | `qa-report.md` (PASS, rodada 1)                                            | gate técnico; RN-08 e as metades de navegador de CA-01, CA-02 e RN-04 vieram para cá |
| Projeto          | `.specs/project/PROJECT.md` · `CLAUDE.md` (raiz), `apps/store/CLAUDE.md`, `apps/backoffice/CLAUDE.md` | ambiente e comandos |

## Personas

Detalhe em [personas.md](personas.md).

| ID     | Nome    | Arquétipo                                  | Objetivo                                                            | Conta        | Jornadas               |
| ------ | ------- | ------------------------------------------ | ------------------------------------------------------------------- | ------------ | ---------------------- |
| PER-01 | Adri    | usuário ocasional (a dona)                 | ligar a Black Friday e voltar ao Padrão sem deploy                  | `admin-loja` | J-01, J-02             |
| PER-02 | Bia     | usuário mobile                             | comprar pelo celular na loja de Black Friday lendo tudo             | `cliente-qa` | J-03                   |
| PER-03 | Rodrigo | usuário ocasional com a loja aberta        | voltar à aba aberta antes da troca sem a cor mudar diante dele      | `anonima`    | J-03 (J-03a)           |
| PER-04 | Lúcia   | usuário ocasional (cliente que volta)      | reencontrar a loja de sempre no Padrão                              | `cliente-qa` | J-04                   |
| PER-05 | Marta   | usuário de tecnologia assistiva            | ler a loja de Black Friday com fonte grande e rede lenta            | `anonima`    | J-03 (J-03a, J-03b)    |

**Não cobertas:** usuário avançado (uso de duas vezes por ano, sem lote nem atalho — as duas abas ficam como variação
do CH-05); novo usuário (a mudança é igual para quem chega pela primeira vez e para quem volta); usuário em recuperação
(sem bug anterior); leitor de tela real (fora do browser da sessão).

## Jornadas

| ID   | Jornada (pelo valor)                                                         | Persona principal · secundária | Prioridade | Abandono/erro       | Cruza fronteira                       | Arquivo                                              |
| ---- | ---------------------------------------------------------------------------- | ------------------------------ | ---------- | ------------------- | ------------------------------------- | ---------------------------------------------------- |
| J-01 | Vestir a loja de Black Friday pelo painel e ver a loja em preto e ouro       | PER-01 · —                     | P0         | J-01a, J-01b, J-01c | não (painel → loja no mesmo monorepo) | [J-01](journeys/J-01-vestir-a-loja-de-black-friday.md) |
| J-02 | Devolver a loja ao Padrão depois da campanha, sem perder nada                | PER-01 · —                     | P0         | J-02a               | não                                   | [J-02](journeys/J-02-voltar-ao-padrao.md)            |
| J-03 | Escolher e levar uma joia ao checkout pelo celular, com a loja de Black Friday | PER-02 · PER-05              | P0         | J-03a, J-03b        | não                                   | [J-03](journeys/J-03-comprar-na-black-friday-pelo-celular.md) |
| J-04 | Reencontrar a loja de sempre quando o perfil é o Padrão                      | PER-04 · —                     | P0         | J-04a               | não                                   | [J-04](journeys/J-04-reencontrar-a-loja-de-sempre.md) |

## Charters

Ordem de execução — a Fase 2 despacha nesta ordem e, com o `agent-browser` ou o `playwright-cli`, por **Lote**: no máximo 3
charters, nunca dois da mesma conta ou da mesma massa, e o CFR sozinho, por último. Charter com outro
**Driver** roda sozinho. Cada charter com no máximo um TC a cada 5 ações do time-box.

**A massa que decide os lotes é `store_settings.appearance`**, global: quem a grava roda sozinho, e quem lê a loja
esperando um perfil roda só com quem espera o mesmo perfil. A thread põe o estado de cada lote antes de despachá-lo
(manifesto em *Ambiente da execução › Massa*). O pedido M1 é **só lido** pelo CH-06 (L1) e pelo CH-04 (L3), que já
estão em lotes diferentes pela conta `cliente-qa` — a resposta da Q-01 não mexe nos lotes.

| Ordem | Lote | ID    | Missão                                                                                              | Persona | Conta        | Massa                                                    | Driver | Tour        | Time-box | Prioridade | TC                                                       | Arquivo |
| ----- | ---- | ----- | --------------------------------------------------------------------------------------------------- | ------- | ------------ | -------------------------------------------------------- | ------ | ----------- | -------- | ---------- | -------------------------------------------------------- | ------- |
| 1     | L1   | CH-06 | achar qualquer tom, transparência, sombra ou marca do Padrão diferente da loja de antes do WI       | PER-04  | `cliente-qa` | só lê `appearance` = S0 (Padrão); só abre o pedido M1    | —      | Feature     | 90 min   | P0         | TC-SMOKE-001, TC-REG-001                                 | [CH-06](charters/CH-06-lucia-reencontra-a-loja-de-sempre.md) |
| 2     | L1   | CH-02 | a prévia mostra o perfil marcado e nenhum jeito de fechar grava ou muda a loja publicada            | PER-01  | `admin-loja` | só lê `appearance` = S0; nunca salva                     | —      | Back-Button | 60 min   | P1         | TC-SMOKE-002, TC-FUNC-005, TC-FUNC-006, TC-CFR-003       | [CH-02](charters/CH-02-adri-confere-na-previa-sem-salvar.md) |
| 3     | L2   | CH-01 | ligar a Black Friday, ver a loja em preto e ouro com painel e ateliê intocados, e voltar ao Padrão sem perder nada | PER-01 | `admin-loja` | **altera** `appearance`: S0 → S1 → S0          | —      | Feature     | 90 min   | P0         | TC-JOURNEY-001, TC-FUNC-001, TC-FUNC-002, TC-FUNC-003, TC-FUNC-004 | [CH-01](charters/CH-01-adri-liga-o-black-friday-e-volta.md) |
| 4     | L3   | CH-04 | ir da Home ao checkout no celular e no computador com a loja de Black Friday, lendo tudo e vendo o desconto em ouro | PER-02 | `cliente-qa` | só lê `appearance` = S1; frete grátis ligado; produto "de/por"; só abre o pedido M1; sacola do próprio browser | — | Feature | 90 min | P0 | TC-JOURNEY-002, TC-PERSONA-001, TC-FUNC-009, TC-FUNC-010, TC-FUNC-011 | [CH-04](charters/CH-04-bia-compra-na-loja-de-black-friday.md) |
| 5     | L3   | CH-03 | achar qualquer jeito de a loja aberta antes da troca mudar de cor sem trocar de página              | PER-03  | `anonima`    | só lê `appearance` = S1; documento interceptado com `data-perfil="padrao"` | — (sonda; `cli` se falhar) | Interrupt | 60 min | P1 | TC-FUNC-007, TC-FUNC-008                           | [CH-03](charters/CH-03-rodrigo-com-a-loja-aberta.md) |
| 6     | L3   | CH-07 | design-check — card do perfil, modal da prévia e Home de Black Friday · Claude Design `4abe021d-…`  | PER-01  | `admin-loja` | só lê `appearance` = S1; nunca salva                     | —      | —           | 60 min   | P2         | TC-UI-001, TC-UI-002                                     | [CH-07](charters/CH-07-design-check-card-do-perfil-e-home-black-friday.md) |
| 7     | L4   | CH-05 | achar jeito de o card dizer que salvou sem salvar, ou de a loja quebrar com um valor estranho       | PER-01  | `admin-loja` | **altera** `appearance`: parte de S2 (valor desconhecido) | —     | Network     | 60 min   | P1         | TC-FUNC-012, TC-FUNC-013                                 | [CH-05](charters/CH-05-adri-com-configuracao-estranha-e-rede-caida.md) |
| 8     | L5   | CH-08 | CFR — J-03, J-03a: primeira pintura em rede lenta e legibilidade do Black Friday                    | PER-05  | `anonima`    | só lê `appearance` = S1                                  | `cli` — `route.fetch`/`route.fulfill` no documento e Slow 4G + CPU 4× por CDP | — | 45 min | P1 | TC-CFR-001, TC-CFR-002 | [CH-08](charters/CH-08-cfr-primeira-pintura-e-legibilidade.md) |

Orçamento por charter (TC × ações): CH-06 2/70 · CH-02 4/50 · CH-01 5/70 · CH-04 5/70 · CH-03 2/50 · CH-07 2/50 ·
CH-05 2/50 · CH-08 2/35 — todos dentro de um TC a cada 5 ações. A confirmação entra no CH-04 e no CH-06 como mais uma
tela dos TC que eles já tinham (TC-PERSONA-001, TC-REG-001): nenhum TC a mais, nenhum orçamento passou do limite.

**Se a sonda do CH-03 falhar** (o `agent-browser` abre o documento roteado como texto, ou sem o atributo), ele vai a
`blocked` no L3 e a thread o refaz com o `cli` **sozinho**, num lote próprio entre o L3 e o L4 — ainda com S1.

## Ambiente da execução

- **App:** do **worktree** `/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100` (não do
  checkout principal):
  - loja `http://localhost:8082` (`pnpm dev:store`), painel `http://localhost:8083/admin` (`pnpm dev:backoffice`),
    ateliê `http://localhost:8084` (`pnpm dev:mobile-adm`, só para TC-FUNC-004), todos na raiz do worktree;
  - **pré-condição:** o worktree **não tem** `apps/store/.env`, `apps/backoffice/.env` nem `apps/mobile-adm/.env`. A
    thread sobe os apps com as variáveis na linha de comando, sem gravar arquivo: `VITE_SUPABASE_URL=http://127.0.0.1:54441`
    e `VITE_SUPABASE_PUBLISHABLE_KEY=<a chave publicável local, de supabase status>`; no painel, também
    `VITE_STORE_URL=http://localhost:8082` (a prévia lê essa origem). Alternativa: criar os `.env` (gitignored) com os
    mesmos valores locais. **Nunca** copiar o `.env` da raiz (tem chaves de servidor) nem URL ou chave do projeto hospedado;
  - **edge functions servidas no local** (para o pedido M1 e para as telas da conta e da confirmação): a thread roda,
    na raiz do worktree, `supabase functions serve --env-file <arquivo da thread no scratchpad>` — um arquivo com as
    chaves externas **inválidas** de propósito (Mercado Pago e Resend com valores falsos; nada sai para fora), e nunca
    o `.env` da raiz, que tem as chaves de servidor. Fica de pé do preparo do M1 até o fim da rodada;
  - **build servido para o CFR (CH-08):** `pnpm --filter @estrelinha/store build` com as mesmas duas variáveis na linha
    de comando, depois `pnpm --filter @estrelinha/store exec vite preview` (a porta que ele imprimir, em geral 4173);
  - **referência "a loja de antes" (CH-06):** o commit-base do branch `feature/100` (`git merge-base master feature/100`)
    servido em `http://localhost:8092` (`pnpm --filter @estrelinha/store exec vite --port 8092`, com as mesmas variáveis
    locais), só leitura, no mesmo banco local. Se o checkout principal `/Users/rafael.santos/Projetos/uma-estrelinha/store`
    estiver nesse commit em `apps/` e `packages/`, serve-se dele; senão, um worktree temporário no commit-base, fora do
    repositório, apagado no fim. Diferença que vier de outro WI (ex.: 102) não é achado de CA-01;
  - **o `<html>` e o perfil no local:** o dev server e o `vite preview` servem o `index.html` **sem** `data-perfil` (o
    estado "não sei" da spec R2: decide a configuração, e a primeira pintura pode ser Padrão e virar Black Friday quando
    a configuração chega — **não é achado**). A marca no `<html>` só sai da função `api/page`, que localmente não serve
    páginas ao navegador. Método (precedente Q-02 do WI 101): **interceptar o documento HTML** e escrever o atributo na
    tag `<html>`, como a função faz:
    - **CH-03 (`agent-browser`):** a thread salva, antes do L3, o documento de cada página de carga
      (`curl -s http://localhost:8082/` e `…/produtos/<slug do produto em oferta>`) com `data-perfil="padrao"`
      acrescentado à tag `<html>`, um arquivo por URL, em `<scratchpad da thread>/wi/100/doc/`; o charter registra
      `network route "<url exata da página>"` respondendo com o arquivo — **uma rota por página, nunca um padrão que
      pegue scripts e CSS** — e a remove para voltar ao documento sem atributo. Sonda no começo da sessão (no charter);
    - **CH-08 (`cli`):** `page.route` da URL da página pelo `run-code`, `route.fetch()` da resposta real e
      `route.fulfill` com o atributo no `<html>`; Slow 4G e CPU 4× por CDP (`Network.emulateNetworkConditions`,
      `Emulation.setCPUThrottlingRate`) antes do `goto`. `playwright-cli` 0.1.24 está instalado (sonda
      `playwright-cli --version`); sessão nomeada `-s=CH-08`;
  - Supabase local já de pé: API 54441, Postgres 54442, Studio 54443.
- **Bloquear:** `*.supabase.co` (abortar por rota — o banco local guarda `image_url` apontando para o Storage
  hospedado); `**/g/collect*` (GA4, por caminho, nunca por domínio — em dev a loja não mede, no `vite preview` sim).
- **E-mail de dev:** Mailpit `http://127.0.0.1:54444` — onde chega o código de entrada da conta `cliente-qa` (CH-04,
  CH-06, e o preparo do M1). Nenhuma sessão envia e-mail de pedido; o aviso do pedido M1, com o Resend inválido, não sai.
- **Viewport alvo:** 390 × 844 primeiro, depois 1440 × 900 (o projeto define; 375/1280 não são os alvos). Fonte do
  sistema a 130 % e 200 % = `document.documentElement.style.fontSize`, refeito a cada carga. Zoom do navegador é outra
  medida.
- **Nunca:**
  - pagar, digitar cartão, gerar PIX ou criar pedido **dentro de uma sessão** — o checkout é visto até antes de pagar;
    o único pedido da rodada é o M1, criado pela **thread** antes do L1. Na confirmação do M1, nenhuma sessão toca em
    "Pagar com PIX", "Gerar um código novo" ou qualquer ação de pagamento: só abre a URL e lê;
  - alterar `store_settings` pelo Studio, SQL ou API **dentro de uma sessão** — o perfil se grava só pela tela do painel;
    as trocas de estado entre lotes são da thread (manifesto abaixo);
  - clicar em Salvar no CH-02 e no CH-07;
  - `supabase stop --all`, qualquer comando `--linked`, `db push`, ou chave/URL do projeto hospedado;
  - servir as functions com o `.env` da raiz ou com chave externa válida;
  - commit, `git stash` ou mudança de branch no worktree;
  - aceitar o perfil por parâmetro de URL fora da prévia (a loja não oferece; não explorar).
- **Uploads:** não há.
- **Massa:** o manifesto. Os estados de `store_settings` `key='appearance'`:
  - **S0** — ausente ou `{ "profile": "padrao" }` (o banco local nasce sem a chave). Antes do L1 a thread confere pelo
    card (Padrão "Em uso") e anota se a chave existe
  - **S1** — `{ "profile": "black-friday" }`. A thread grava **pela tela do painel** (Black Friday → Salvar) antes do L3
    e de novo antes do L5
  - **S2** — `{ "profile": "neon" }` (valor desconhecido). Só se cria por SQL: antes do L4 a thread o grava no Postgres
    local (a URL do Postgres de `supabase status`, porta 54442) — permitido pela spec H12, restaurando depois
  - **Ao fim da rodada**, a thread devolve S0 no estado anotado antes do L1 (chave ausente ou `padrao`)
  - **M1 — o pedido PIX pendente da `cliente-qa`** (resposta da Q-01): antes do L1, com S0 e as functions servidas
    com as chaves inválidas, a **thread** entra na loja local como `cliente-qa` (código pelo Mailpit), põe uma peça na
    sacola e conclui o checkout com PIX. Com o Mercado Pago inválido o pagamento não se gera, e o pedido fica
    **pendente**, sem nada sair para fora. A thread anota no manifesto o id, o número (`#NNNN`) e a URL
    `http://localhost:8082/pedido/<id>`, e confere que a conta `cliente-qa` abre essa URL logada. Se o checkout não
    chegar a gravar o pedido, o M1 vai a `blocked` e o passo 3 do TC-PERSONA-001 e a tela da confirmação do TC-REG-001
    ficam `blocked`, sem achado do WI 100. **Fim da rodada:** o M1 **fica** no banco local (pedido de teste declarado,
    `pending`, da conta `cliente-qa`); a thread não o apaga nem o paga, e o registra no relatório com o id e o número
  - Para o L3 (CH-04): **frete grátis ligado** com uma faixa (Configurações → Frete e Material) e **um produto com preço
    "de/por"** visível (selo "-X%"). Se o local não tiver, a thread ajusta pelo painel antes do L3, anota o valor de antes
    e restaura no fim
  - Contas: `admin-loja` = a do `supabase/seed.sql` local (bloco do admin, seção 5, perto da linha 147: e-mail e senha) —
    a thread põe em `QA_ADMIN_LOJA_USUARIO` / `QA_ADMIN_LOJA_SENHA`; o valor nunca vai a log nem a arquivo. `cliente-qa` =
    um e-mail de teste em domínio inválido (ex.: `qa-cliente@exemplo.invalid` — o Mailpit local captura todo e-mail do
    auth local, de qualquer domínio), em `QA_CLIENTE_QA_USUARIO`; entra por código, sem senha. O mesmo e-mail nas duas
    lojas do CH-06 e no M1
  - **Registro da rodada 1 (2026-11-14, thread):** S0 conferido no banco — a chave `appearance` **não existe** (estado a devolver no fim: ausente). M1 criado pelo checkout local: pedido `#0613`, id `b97d49e8-f81a-4c80-8b4e-ab49981d85be`, `http://localhost:8082/pedido/b97d49e8-f81a-4c80-8b4e-ab49981d85be`, "Aguardando pagamento", 1 Pingente Olho Grego, frete padrão R$ 19,90, PIX não gerado (Mercado Pago inválido). A conta `cliente-qa` é `cliente.qa@exemplo.invalid` (já existia no banco local). As credenciais ficam num arquivo da thread fora do repositório (`source` antes de usar). Os apps sobem com `pnpm --filter <app> exec vite --port <porta>` e as variáveis exportadas (o turbo não repassa as `VITE_*`). No local não há produto ativo com preço "de/por": antes do L3 a thread põe `original_price` num produto e restaura `null` no fim. Frete grátis está desligado (faixa 150): a thread o liga antes do L3 e desliga no fim.
  - **Registro da rodada 2 (2026-11-14, confirmação, thread):** a loja sobe em **:8182** e o painel em **:8183**, porque 8082/8083 e a `functions serve` estavam ocupados por outra sessão (WI 99) sobre o mesmo Supabase local e o mesmo Mailpit; as functions servidas são as dela (o WI 100 não altera function). Nenhum dado fora de `appearance` é ajustado nesta rodada: o "de/por" do TC-FUNC-009 vem de variações que já têm `compare_price` no banco local, e o frete grátis já está ligado pela outra sessão (sul/sudeste, R$ 450), lido como está. Os logs, screenshots e o resultado da rodada 1 foram para `sessions/2026-11-14-r1/`, `screenshots/2026-11-14-r1/` e `qa-result-2026-11-14-r1.md`.
  - **Registro da rodada 3 (2026-11-14, confirmação, thread):** código em `41f85963` (T10, BUG-005). Loja em **:8182**, painel em **:8183** e a loja de antes do WI em **:8092**; a `functions serve` é desta rodada, a partir do worktree, com chaves externas inválidas (nenhuma outra sessão a servia). Só rodam o reteste do BUG-005 e os charters com TC `fail`/`blocked` na rodada 2: CH-06 (TC-REG-001, S0) e CH-07 (TC-UI-001, S1), em lotes separados por massa. Nenhum dado fora de `appearance` é ajustado. A rodada 2 foi para `sessions/2026-11-14-r2/`, `screenshots/2026-11-14-r2/`, `retest-2026-11-14-r2.md` e `qa-result-2026-11-14-r2.md`.
  - Só leitura em toda sessão: catálogo, categorias, Home, menu, faixa de avisos, pedidos (o M1 inclusive)

## Estratégia

- **Como se exercitam as jornadas:** um charter por área de risco, uma persona por sessão, no browser real
  (`agent-browser`; `playwright-cli` no CFR e como fallback do CH-03); os `TC-*` são conferidos dentro do charter que os
  cita. Cor se confere pelo **estilo computado** dos elementos de referência, não por impressão de screenshot
- **CFR:** acessibilidade (contraste do perfil novo, fonte 130/200 %, foco sobre o cabeçalho escuro — no CH-08; teclado
  no card e no modal — TC-CFR-003 no CH-02), performance percebida (primeira pintura já no perfil, CLS, em Slow 4G — CA-02),
  compatibilidade (390 e 1440, a mudança é só CSS). Fora: usabilidade da loja (a mudança é só cor; a do card está no
  CH-01/CH-02) e recuperação de erro na loja (sem caminho de falha visível; a do card está no CH-05)
- **Conferência visual:** o card e o modal contra `Painel - Campanhas, faixa e perfil.html`; a Home de Black Friday
  contra `Black Friday - Home.html` (computador e celular 390) — CH-07, com as sete divergências já decididas na
  costura listadas no charter
- **Onde termina o simulado:** a função `api/page` é substituída pela interceptação do documento (CH-03, CH-08); o cache
  de borda e os prazos reais de 5 min / 1 hora não existem no local; o pedido da confirmação é pendente e nasceu com o
  Mercado Pago inválido (a tela de um pedido pago não se vê); o ateliê é conferido no navegador de desktop, não num
  Android; leitor de tela real fica fora
- **Automação:** 19 casos `e2e` + `missing` ficam como pedido de automação E2E (TC-FUNC-012 precisa do mesmo preparo de
  massa por SQL local; TC-FUNC-007, TC-FUNC-008 e TC-CFR-001 precisam da interceptação do documento; TC-REG-001 precisa
  de um pedido da conta para a confirmação); `integration`: 0; `blocked`: 0

### Suíte smoke

| Ordem | TC           | Jornada | O que prova                                                         |
| ----- | ------------ | ------- | ------------------------------------------------------------------- |
| 1     | TC-SMOKE-001 | J-04    | a loja abre no Padrão com a Home de sempre e um produto legível     |
| 2     | TC-SMOKE-002 | J-01    | a entrada da jornada da dona existe: o card em Dados da loja, sem seção nova |

Os dois rodam no L1 (o primeiro lote). Falhou ⇒ a thread para a rodada antes do L2.

## Critérios de entrada

- [x] Validation do Dev com `Status: PASS` no `qa-report.md`
- [ ] App do branch `feature/100` rodando do worktree (loja, painel e ateliê), com as variáveis locais na linha de comando
- [ ] Edge functions servidas por `supabase functions serve --env-file` com chaves externas inválidas (nunca o `.env` da raiz)
- [ ] App acessível num ambiente com paridade de produção (auth real do Supabase local, cookies habilitados)
- [ ] `QA_ADMIN_LOJA_USUARIO` / `QA_ADMIN_LOJA_SENHA` definidas a partir do `supabase/seed.sql`; `QA_CLIENTE_QA_USUARIO`
      com um e-mail que o Mailpit capture
- [ ] Massa: S0 conferido e anotado; o pedido M1 criado pela thread, com id, número e URL no manifesto e aberto pela
      `cliente-qa`; frete grátis e produto "de/por" conferidos (ou ajustados) para o L3
- [ ] Referência do commit-base em `:8092` (CH-06) e o build servido por `vite preview` (CH-08)
- [ ] Driver de browser disponível — `agent-browser` 0.39+, e `playwright-cli` para o CH-08
- [ ] Com charter `design-check`: o MCP do Claude Design na sessão (ou a cópia publicada)

## Critérios de saída

- **`pass`** — toda jornada `P0` chega ao objetivo, nenhum bug `critical`/`high` aberto, todos os charters rodaram
- **`partial`** — caso `P0`/`P1` `blocked` ou charter que não rodou
- **`fail`** — caso `P0` falhou, ou bug `critical`/`high` aberto
- Todo caso `e2e` + `missing`/`blocked` com o pedido de automação registrado

## Cobertura

| Critério | Fonte | Resumo do critério                                                                  | TC                                                                               |
| -------- | ----- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| UC-01    | prd   | card com Padrão/Black Friday, amostras e Salvar; a próxima página já vem no perfil; quem está na loja vê ao trocar de página; o card diz o que muda e o prazo | TC-FUNC-001, TC-FUNC-003, TC-FUNC-008, TC-FUNC-013, TC-JOURNEY-001, TC-SMOKE-002 |
| UC-02    | prd   | voltar ao Padrão pela mesma chave, sem perder dado                                   | TC-FUNC-002, TC-JOURNEY-001                                                      |
| UC-03    | prd   | "Ver a loja com este perfil" abre a loja num iframe no perfil escolhido e não salvo  | TC-FUNC-005, TC-UI-001                                                           |
| RN-01    | prd   | os mesmos tokens com outros valores; exceção do desconto em ouro; opacidade preservada | TC-FUNC-001, TC-FUNC-009, TC-FUNC-010, TC-REG-001, TC-JOURNEY-002, TC-PERSONA-001, TC-UI-002 |
| RN-02    | prd   | só a loja: painel, ateliê e e-mails não mudam                                        | TC-FUNC-004                                                                      |
| RN-03    | prd   | os dois perfis passam pelos pisos de legibilidade; regras do ouro pelo uso           | TC-CFR-002, TC-PERSONA-001, TC-JOURNEY-002                                       |
| RN-04    | prd   | sem troca de cor diante da cliente; HTML do cache fica no anterior até trocar de página | TC-FUNC-001, TC-FUNC-007, TC-FUNC-008, TC-CFR-001                             |
| RN-05    | prd   | cache do HTML (5 min / 1 hora) e o card avisa                                         | TC-FUNC-003                                                                      |
| RN-06    | prd   | `theme-color`, favicon e imagem de compartilhamento fixos; a marca desenhada no tom escuro | TC-FUNC-011, TC-REG-001, TC-UI-002                                          |
| RN-07    | prd   | valor desconhecido ⇒ Padrão, sem erro                                                 | TC-FUNC-012                                                                      |
| RN-08    | prd   | prova em navegador 390 e 1440, nos dois perfis, nas telas da cliente (inclusive conta e confirmação) | TC-PERSONA-001, TC-JOURNEY-002, TC-REG-001                        |
| CA-01    | prd   | Padrão idêntico ao de hoje por captura em 390 e 1440 (inclusive a confirmação)        | TC-REG-001, TC-SMOKE-001                                                         |
| CA-02    | prd   | com Black Friday salvo, o primeiro HTML já traz o perfil, sem pintura Padrão antes (rede lenta) | TC-CFR-001                                                              |
| CA-03    | prd   | voltar ao Padrão devolve a paleta de hoje sem perder conteúdo                         | TC-FUNC-002, TC-JOURNEY-001                                                      |
| CA-04    | prd   | guardas de contraste e de ouro passam nos dois perfis; valor reprovado reprova a suíte | TC-CFR-002                                                                      |
| CA-05    | prd   | painel e ateliê não mudam de cor com o perfil ligado                                  | TC-FUNC-004                                                                      |
| CA-06    | prd   | valor desconhecido ⇒ a loja abre no Padrão                                            | TC-FUNC-012                                                                      |
| CA-07    | prd   | a prévia mostra o perfil escolhido sem salvar; fechar não muda a loja                 | TC-FUNC-005, TC-FUNC-006                                                         |

**Sem cobertura:** nada. Coberturas parciais declaradas: RN-05 (os prazos reais do cache de borda só existem na Vercel —
o navegador confere o aviso; o cache por ramo é da Validation, `serve.test.ts`); CA-04 (a metade "um valor reprovado
reprova a suíte" é dos sensores da Validation; aqui, a legibilidade medida); RN-02 (os e-mails não se conferem —
nenhuma sessão envia). RN-08 e CA-01 passaram a cobertura cheia com o pedido M1 (resposta da Q-01); só a confirmação de
um pedido **pago** fica fora, porque o M1 é pendente por construção.

## Riscos

| Risco (para o usuário)                                                              | Probabilidade | Impacto na persona | Mitigação no plano                       |
| ----------------------------------------------------------------------------------- | ------------- | ------------------ | ---------------------------------------- |
| o Padrão muda um tom, uma opacidade ou uma sombra e a loja do ano inteiro fica diferente | média     | abala confiança    | CH-06 · TC-REG-001 contra o commit-base  |
| texto ilegível no checkout ou na confirmação no Black Friday (ink-soft sobre ground-deep, texto sobre ouro) | média | impede concluir | CH-04 · TC-PERSONA-001, TC-JOURNEY-002; CH-08 · TC-CFR-002 |
| a cor muda diante da cliente (foco da janela, troca de página, voltar)               | média         | abala confiança    | CH-03 · TC-FUNC-007, TC-FUNC-008; CH-08 · TC-CFR-001 |
| salvar grava outra chave ou a prévia grava sem salvar                                | baixa         | perde dado         | CH-01 · TC-FUNC-002; CH-02 · TC-FUNC-006 |
| o card diz "salvo" numa falha                                                         | baixa         | abala confiança    | CH-05 · TC-FUNC-013                      |
| o painel ou o ateliê passam a pintar no perfil da loja                               | baixa         | fricção            | CH-01 · TC-FUNC-004                      |
| o desconto se confunde com os outros selos                                            | baixa         | fricção            | CH-04 · TC-FUNC-009                      |

Personas: 5, no teto do tamanho grande (3–5). Exploratórios: 6, no teto — ver *Tamanho* no Resumo.

## Perguntas

- ✅ **Q-01 — Como a sessão chega à confirmação de um pedido no local?** **Resposta do humano (2026-11-14): (A).**
  Aplicada na versão 2: a thread cria, antes do L1, o pedido PIX pendente M1 da `cliente-qa` pelo checkout local, com as
  functions servidas por `supabase functions serve --env-file` de chaves externas inválidas (nunca o `.env` da raiz); o
  id e a URL `/pedido/:id` entram no manifesto; a confirmação entra no CH-04 e no CH-06; o passo 3 do TC-PERSONA-001 e
  a tela da confirmação do TC-REG-001 ficam; RN-08 e CA-01 deixam a cobertura parcial; as sessões seguem proibidas de
  pagar ou criar pedido e só abrem a URL; o M1 fica no banco local no fim da rodada, declarado no relatório.
- 🟡 A "gaveta" de RN-08 é a **sacola** (a gaveta do carrinho, onde mora a barra do frete grátis); a gaveta de material
  da página do produto entra só como variação do TC-PERSONA-001
- 🟡 CA-02 e RN-04 se provam com o **documento interceptado** no navegador escrevendo `data-perfil` como a função
  `api/page` faz (precedente Q-02 do WI 101); a Vercel servindo a função e o cache real ficam fora
- 🟡 "Trocar de página" (RN-04) é troca de rota; **trocar só a query** (`/busca?q=…`) é borda que a fonte não decide —
  o TC-FUNC-008 registra o que acontece, sem achado por isso
- 🟡 O valor desconhecido de CA-06 só se cria por **SQL local** (o painel só grava os dois válidos) — a thread o grava
  antes do L4, pela permissão de H12, e restaura
- 🟡 Frete grátis ligado e um produto com "de/por" são massa do CH-04; se o banco local não os tiver, a thread os ajusta
  pelo painel antes do L3 e restaura no fim
- 🟡 A referência de CA-01 é o **commit-base** do branch; diferença vinda de outro WI (102) não é achado
- 🟡 No dev server, uma primeira pintura Padrão que vira Black Friday quando a configuração chega é o estado "não sei"
  (R2), não achado — a primeira pintura que vale é a do CH-08
- 🟡 O "em alguns minutos" de quem já tinha a configuração em memória (`staleTime` de 5 min, spec R3) não se espera em
  sessão; o CH-03 cobre a loja aberta pelo HTML do cache
- 🟡 A "confirmação" de RN-08 e CA-01 é a página `/pedido/:id` de um pedido **pendente** (o M1); a confirmação de um
  pedido pago não se vê no local, e a fonte não pede os dois estados
- 🟢 Na produção, quando a leitura de `store_settings` falha, a página sai sem `data-perfil` e `no-store`, e a cor pode
  trocar diante da cliente quando a configuração chega — aceito por R2; vale o produto saber que a garantia de RN-04 tem
  essa exceção
- 🟢 RN-01 cita o "chip de desconto da sacola", e a T06 não encontrou elemento com fundo `primary` (H4): no Black Friday
  só dois dos três elementos ficam em ouro. O PRD pode ser ajustado para não prometer o terceiro
- 🟢 O botão do card é "Salvar alterações" (o `SettingsSaveButton` do painel), não "Salvar" como no protótipo — decisão
  da T07, registrada no CH-07 como não-diferença
