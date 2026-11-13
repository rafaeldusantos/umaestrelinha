```json
{
  "schema": "qa-plan/v1",
  "title": "Plano de QA — Faixa de avisos no topo da loja (textos ou imagens que se alternam)",
  "summary": {
    "total_cases": 27,
    "by_priority": { "P0": 3, "P1": 21, "P2": 3, "P3": 0 }
  },
  "acceptance_criteria_covered": 19,
  "strategy": [
    "Exploração por charter no browser real (agent-browser, playwright-cli ou Playwright MCP), uma persona por sessão, contra o app do worktree e o Supabase local",
    "E2E (Playwright) pedido à automação p/ fluxos P0/P1 determinísticos: a gravação no painel, as recusas, a presença por rota, o giro e a pausa, o movimento reduzido",
    "Manual p/ layout (390 e 1440, fonte a 130/200 %), CLS em build servido com o documento marcado, acessibilidade e conferência contra o protótipo"
  ],
  "cases": [
    { "id": "TC-FUNC-001", "title": "A dona monta três avisos de texto e um de imagem, liga a faixa, salva, e a tela volta igual depois de recarregar", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-002", "title": "O aviso de imagem só é aceito com as duas artes e o texto alternativo", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-003", "title": "Endereço de fora colado no Destino é recusado no campo, com o motivo, e o Salvar fica desabilitado", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-004", "title": "Rótulo do link sem destino é recusado, com o motivo", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-005", "title": "A dona reordena os avisos e a ordem vale na prévia; com cinco avisos o \"+ Adicionar aviso\" some", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-006", "title": "A prévia mostra a faixa como a cliente vê, no celular e no computador, e anda de aviso em aviso pelos botões sem girar sozinha", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-007", "title": "A tela lembra o tom da loja e avisa que a faixa pode levar até uma hora para mudar", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-008", "title": "O texto do aviso tem contador por campo e é recusado acima de 90 caracteres no total", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-009", "title": "Desligada, a faixa some das páginas da loja e o cabeçalho volta para o topo; religada, volta com os mesmos avisos", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-010", "title": "Página aberta antes da troca não empurra o conteúdo: a vaga fica, ou falta, até a próxima página", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-011", "title": "A faixa aparece acima do cabeçalho na Home, numa categoria e num produto, e some no checkout e no pedido montado", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-012", "title": "Os avisos trocam sozinhos a cada 6 segundos e param enquanto o dedo está na faixa", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-013", "title": "No celular não há setas, o aviso inteiro é o link, e o aviso sem destino é só texto", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-014", "title": "A faixa rola com a página e o cabeçalho só se recolhe depois que ela sai da tela", "priority": "P1", "type": "functional", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-FUNC-015", "title": "O aviso de imagem baixa uma arte só, a do dispositivo, inteira e com o texto alternativo", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-016", "title": "No computador, as setas trocam o aviso e o giro para com o ponteiro e com o foco", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-001", "title": "Vinda do anúncio no celular, a cliente vê a Black Friday na página do produto e chega às ofertas pela faixa", "priority": "P0", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-UI-001", "title": "Em 390 × 844 a faixa não cria rolagem lateral, e o aviso mais longo cabe em duas linhas sem corte", "priority": "P1", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-UI-002", "title": "Em 1440 × 900 a faixa tem 48 px, setas de 44 px nas pontas e nenhuma rolagem lateral", "priority": "P1", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-UI-003", "title": "Com a faixa desligada, a loja fica igual à de hoje em 390 e em 1440", "priority": "P1", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-UI-004", "title": "A faixa da loja confere com o protótipo da Black Friday", "priority": "P2", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-UI-005", "title": "A tela \"Faixa de avisos\" do painel confere com o protótipo", "priority": "P2", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-CFR-001", "title": "Com a faixa ligada, a Home e a página de produto não pulam enquanto carregam em rede lenta", "priority": "P1", "type": "cfr", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-CFR-002", "title": "A faixa é uma região com nome, não anuncia cada troca, e tem foco e contraste legíveis", "priority": "P1", "type": "cfr", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-CFR-003", "title": "Com movimento reduzido, a faixa não gira sozinha e nenhum aviso entra sumido", "priority": "P1", "type": "cfr", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-CFR-004", "title": "Com a fonte do sistema a 200 % no celular, o link do aviso continua inteiro e a página não rola para o lado", "priority": "P1", "type": "cfr", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-REG-001", "title": "O Banner principal da Home continua trocando a cada 6 s e pausando como antes", "priority": "P2", "type": "regression", "automation": { "target": "manual", "status": "na" } }
  ]
}
```

# Plano de QA — 101 · Faixa de avisos no topo da loja (textos ou imagens que se alternam)

**Work Item:** 101 (feature) · **Escopo:** completo · **Foco:** —
**Versão do plano:** 2 · **Escrito em:** 2026-11-13 · **Revisado em:** 2026-11-13 (respostas de Q-01 e Q-02) · **Modo:** revisar
**Gate 1:** aprovado em 2026-11-13

## Resumo

- **Valor para o usuário:** a dona passa a avisar uma campanha (Black Friday, desconto, frete grátis) numa faixa fina
  acima do cabeçalho, em toda a loja menos nas telas de pagamento, montada por ela no painel sem deploy — texto com
  link ou arte própria, até cinco avisos que se alternam. A cliente que cai direto num produto ou numa categoria, vinda
  de anúncio ou do Google, vê a campanha e chega a ela em um toque.
- **Maior risco para o usuário:** a faixa chegando depois da primeira pintura e empurrando a página do celular (o CLS
  que a feature `40` fechou), ou um aviso cortado/ilegível no celular com fonte grande.
- **Tamanho:** grande — 19 critérios na fonte (UC-01..04, RN-01..07, CA-01..08) · 2 telas nas fontes de design (a faixa
  da loja; a tela do painel), 6 rotas tocadas (Home, categoria, produto com a faixa; checkout e pedido montado sem ela;
  `/admin/faixa-de-avisos`)
- **Contagens:** personas 4 · jornadas 5 · charters 7 (CFR 1 · design-check 1) · lotes 6 · TC 27 (P0 3 · P1 21 · P2 3 · P3 0)
- **Automação:** e2e 17 (missing 17 · existing 0 · blocked 0) · integration 0 · manual 10

## Escopo

**Dentro:** a faixa na loja (UC-01, UC-02, UC-04: presença por rota, giro e pausa, setas, link inteiro, aviso de
imagem, altura e reserva, cabeçalho que recolhe, movimento reduzido, fonte grande); a tela `/admin/faixa-de-avisos`
(UC-03: interruptor, lista, tipos, recusas, ordem, prévia, ajuda de tom e do atraso); a regra de existência na carga
(`data-faixa`) observada pelo documento marcado; o Banner principal, cujo giro mudou de casa (RN-06).

**Fora:**
- o que a costura exclui: agendamento por data (WI 102), faixa por página/categoria, botão de fechar, contador de
  tempo; o link "Black Friday" dos departamentos (H-16);
- o que o ambiente local não alcança: a Vercel servindo `/` pela função depois de o `index.html` sair da saída
  publicada, o `HIT` do cache de borda e o prazo real de 5 min / 1 h de CA-08 — só num preview da Vercel (spec › Não
  resolvido); o tempo da Home servida pela função (H-24);
- contraste no segundo perfil de estilo (WI 100 não existe);
- o `InfoBanner` de erro de leitura do painel que nunca aparece (conhecido, `apps/backoffice/CLAUDE.md`);
- a tela do painel em 390, o app do ateliê, as outras telas do grupo Loja;
- leitor de tela real e Safari/Chrome Android reais.

## Fontes

| Fonte      | Caminho | Uso |
| ---------- | ------- | --- |
| PRD        | `[ITEM_DIR]/prd.md` | UC-01..04, RN-01..07, CA-01..08 — a régua da cobertura |
| Costura    | `[ITEM_DIR]/spec.md` | Decisões PR-1..10, H-01..24, I-01..10; Fora do escopo; Não resolvido |
| Fontes de design | `claude_design` · https://claude.ai/design/p/4abe021d-d77e-4fe7-affd-524180315fa3?file=Black+Friday+-+Home.html · https://claude.ai/design/p/4abe021d-d77e-4fe7-affd-524180315fa3?file=Painel+-+Campanhas%2C+faixa+e+perfil.html | as duas telas; charter CH-06 |
| Insumos    | `item.md` › Insumos (cromo da loja, `hero-carousel`, `ctaHrefRefusal`, `uploadImage.ts`, `server/page.ts`, `core/page/head.ts`); `tasks/01..04`; `session-summary.md` | rótulos, rotas, mensagens de recusa, o que só o navegador mede |
| Validation | `[ITEM_DIR]/qa-report.md` (Status PASS) | gate técnico; Observações para a QA real-user |
| Projeto    | `.specs/project/PROJECT.md`; `CLAUDE.md` da raiz, `apps/store/CLAUDE.md`, `apps/backoffice/CLAUDE.md`, `packages/core/CLAUDE.md` | ambiente e regras do ambiente |
| Respostas  | página de perguntas, 2026-11-13 | Q-01 (fonte a 200 %) e Q-02 (documento marcado) |

`[ITEM_DIR]` = `/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-101/.specs/work-items/101-faixa-de-avisos`

## Personas

Detalhe em [personas.md](personas.md).

| ID     | Nome    | Arquétipo | Objetivo | Conta | Jornadas |
| ------ | ------- | --------- | -------- | ----- | -------- |
| PER-01 | Adri    | usuário ocasional (a dona) | pôr e tirar a faixa da campanha sem deploy | `admin-loja` | J-01, J-05 |
| PER-02 | Bia     | usuário mobile | vinda do anúncio, descobrir a campanha e chegar às ofertas | `anonima` | J-02 |
| PER-03 | Marta   | usuário de tecnologia assistiva | ler os avisos sem mouse, com fonte grande e movimento reduzido | `anonima` | J-04 |
| PER-04 | Rodrigo | novo usuário, no computador | percorrer os avisos pelas setas e abrir a oferta | `anonima` | J-03 |

**Não cobertas:** usuário avançado (tela de uso eventual, só a dona usa); usuário em recuperação (sem bug anterior);
a dona no celular (a costura não pede o painel em 390); leitor de tela real (fora do browser da sessão).

## Jornadas

| ID   | Jornada (pelo valor) | Persona principal · secundária | Prioridade | Abandono/erro | Cruza fronteira | Arquivo |
| ---- | -------------------- | ------------------------------ | ---------- | ------------- | --------------- | ------- |
| J-01 | Montar a faixa da Black Friday e vê-la na loja | PER-01 · — | P0 | J-01a, J-01b | não (Storage local) | [J-01](journeys/J-01-montar-a-faixa-da-black-friday.md) |
| J-02 | Descobrir a campanha pelo celular, vindo do anúncio, e chegar às ofertas | PER-02 · — | P0 | J-02a, J-02b | não | [J-02](journeys/J-02-descobrir-a-campanha-pelo-celular.md) |
| J-03 | Ler os avisos no computador e abrir o que interessa | PER-04 · — | P1 | J-03a | não | [J-03](journeys/J-03-ler-os-avisos-no-computador.md) |
| J-04 | Ler os avisos pelo teclado, com fonte grande e movimento reduzido | PER-03 · — | P1 | J-04a | não | [J-04](journeys/J-04-ler-os-avisos-pelo-teclado-com-fonte-grande.md) |
| J-05 | Encerrar a campanha e ver a loja voltar ao normal | PER-01 · — | P1 | J-05a | sim: o cache da Vercel (fora do local) | [J-05](journeys/J-05-encerrar-a-campanha.md) |

## Charters

Ordem de execução — a Fase 2 despacha nesta ordem e, com o `agent-browser` ou o `playwright-cli`, por **Lote**: no
máximo 3 charters, nunca dois da mesma conta ou da mesma massa, e o CFR sozinho, por último. Charter com outro
**Driver** roda sozinho. Cada charter com no máximo um TC a cada 5 ações do time-box.

Por que tantos lotes: a configuração da faixa (`store_settings.announcements`) é **uma** massa global — o que o painel
grava, toda página da loja lê. Os charters que gravam (CH-01, CH-05) rodam sozinhos, e os três de loja são da mesma
conta (`anonima`), então não dividem lote entre si.

| Ordem | Lote | ID    | Missão | Persona | Conta | Massa | Driver | Tour | Time-box | Prioridade | TC | Arquivo |
| ----- | ---- | ----- | ------ | ------- | ----- | ----- | ------ | ---- | -------- | ---------- | -- | ------- |
| 1 | L1 | CH-01 | a dona monta sozinha os quatro avisos, confere a prévia e põe a faixa no ar; o salvo é o que a loja mostra | PER-01 | `admin-loja` | **cria** a faixa do manifesto | — | Feature | 60 min | P0 | TC-FUNC-001, 002, 005, 006, 007 | [CH-01](charters/CH-01-dona-monta-a-faixa.md) |
| 2 | L2 | CH-02 | a cliente do anúncio, no celular e em rede lenta, lê o aviso antes da troca e chega às ofertas; sem faixa no pagamento | PER-02 | `anonima` | só lê (sacola anônima, sem pedido) | — | Feature | 60 min | P0 | TC-JOURNEY-001, TC-FUNC-011, 012, 013, 014, TC-UI-001 | [CH-02](charters/CH-02-cliente-no-celular.md) |
| 3 | L2 | CH-06 | design-check — a faixa da loja e a tela do painel · `Black Friday - Home.html`, `Painel - Campanhas, faixa e perfil.html` | PER-01 | `admin-loja` | só lê | — | — | 60 min | P2 | TC-UI-004, TC-UI-005 | [CH-06](charters/CH-06-design-check.md) |
| 4 | L3 | CH-03 | no computador, as setas e o ponteiro não deixam o aviso trocar na hora errada; arte inteira; Banner principal igual | PER-04 | `anonima` | só lê | — | Feature | 60 min | P1 | TC-FUNC-015, 016, TC-UI-002, TC-REG-001 | [CH-03](charters/CH-03-cliente-no-computador.md) |
| 5 | L4 | CH-04 | texto e endereço colados de fora nunca viram aviso cortado, link externo ou rótulo sem destino; cada recusa diz o que corrigir | PER-01 | `admin-loja` | só lê (rascunho, **sem salvar**) | — | Paste | 60 min | P1 | TC-FUNC-003, 004, 008 | [CH-04](charters/CH-04-dona-cola-de-fora.md) |
| 6 | L5 | CH-05 | desligar devolve a loja de sempre, páginas da hora anterior não pulam, religar devolve a campanha | PER-01 | `admin-loja` | **altera** (desliga e religa; termina igual ao manifesto) | `agent-browser` — `network route` da URL exata de cada página respondendo com o documento servido, com `data-faixa` escrito no `<html>` (Q-02); não precisa atrasar resposta | Back-Button | 60 min | P1 | TC-FUNC-009, 010, TC-UI-003 | [CH-05](charters/CH-05-dona-desliga-a-faixa.md) |
| 7 | L6 | CH-07 | CFR — J-04 e J-02: a faixa não pula, não anuncia, não some do foco nem corta o link | PER-03 | `anonima` | só lê | `cli` — documento reescrito com `data-faixa` **e** rede/CPU limitadas antes da carga, que o `agent-browser` não faz; exige instalar `@playwright/cli` | — | 45 min | P1 | TC-CFR-001, 002, 003, 004 | [CH-07](charters/CH-07-cfr.md) |

Orçamento: CH-01 5 TC/50 ações · CH-02 6/50 · CH-06 2/50 · CH-03 4/50 · CH-04 3/50 · CH-05 3/50 · CH-07 4/35 — todos
dentro de um TC a cada 5 ações.

## Ambiente da execução

- **App:** do **worktree** `/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-101` (não do
  checkout principal):
  - loja `http://localhost:8082` (`pnpm dev:store`); painel `http://localhost:8083/admin` (`pnpm dev:backoffice`);
  - o worktree **não tem** `apps/store/.env` nem `apps/backoffice/.env`. A thread sobe os dois com as variáveis na linha
    de comando, sem gravar arquivo: `VITE_SUPABASE_URL=http://127.0.0.1:54441` e
    `VITE_SUPABASE_PUBLISHABLE_KEY=<a chave publicável local, de supabase status>`; no painel, também
    `VITE_STORE_URL=http://localhost:8082` (a prévia e "Abrir a loja" leem essa origem). Alternativa: criar os dois `.env`
    (gitignored) com esses mesmos valores locais. **Nunca** copiar o `.env` da raiz nem o do checkout principal sem
    conferir, e nunca URL ou chave do projeto hospedado;
  - **build servido para o CFR (CH-07):** `pnpm --filter @estrelinha/store build` com as mesmas duas variáveis na linha
    de comando, depois `pnpm --filter @estrelinha/store exec vite preview` (a porta que ele imprimir). Em dev o CLS não
    vale para CA-06;
  - **referência "a loja de hoje" (TC-UI-003):** o `master` (`eceb80c2`, a base do branch) servido do checkout principal
    `/Users/rafael.santos/Projetos/uma-estrelinha/store` em `http://localhost:8092`
    (`pnpm --filter @estrelinha/store exec vite --port 8092`, com as mesmas variáveis locais na linha de comando), só
    leitura;
  - **O que se observa de RN-02 localmente:** o dev server e o `vite preview` servem o `index.html` **sem** `data-faixa`
    (o estado "não sei": decide a configuração, e a faixa pode entrar depois da primeira pintura). A marca no `<html>`
    só sai da função `api/page`, que localmente não serve páginas ao navegador. **Método decidido (Q-02, respondida em
    2026-11-13):** interceptar o documento HTML no navegador e escrever `data-faixa="1"`/`"0"` no `<html>`, como a função
    faz (provado na integração da T02). Fica fora: a Vercel servindo `/` pela função, o cache (`HIT`) e o prazo real de
    5 min / 1 h. Por charter:
    - **CH-05 (`agent-browser`):** a rota do `agent-browser` responde com corpo fixo — basta, porque não há atraso a
      simular. Antes de abrir cada página, a thread (ou o charter, pelo Bash) salva o documento que o servidor devolve
      para aquela URL (`curl -s <url>`) com o atributo acrescentado à tag `<html>`, um arquivo por URL e valor, em
      `<scratchpad da thread>/wi/101/doc/`; o charter registra `network route "<url exata da página>"` respondendo com
      esse arquivo — uma rota por página (a Home, C1, `/checkout`), **nunca um padrão que pegue os scripts e o CSS** —, e
      remove a rota para voltar ao documento sem atributo. **Sonda no começo da sessão:** a página roteada abre como
      página (não como texto) e `document.documentElement.dataset.faixa` lê o valor escrito. Se abrir como texto, o
      `agent-browser` não serve para CH-05: o charter vai a `blocked` com o motivo e roda com o `cli`, como CH-07 (com a
      mesma instalação abaixo);
    - **CH-07 (`cli`):** `page.route` da URL da página pelo `run-code`, buscando a resposta real (`route.fetch()`) e
      devolvendo o corpo com o atributo no `<html>` (`route.fulfill`); Slow 4G e CPU 4× por CDP
      (`Network.emulateNetworkConditions`, `Emulation.setCPUThrottlingRate`) antes do `goto`. O `agent-browser` não limita
      rede nem CPU, e o CLS de CA-06 é em rede lenta;
  - **Instalação para CH-07:** nesta máquina só há o `agent-browser` 0.39.1 — o `playwright-cli` **não está instalado**.
    Antes da Fase 2: `npm install -g @playwright/cli@latest` (sonda `playwright-cli --version`), com uma sessão nomeada
    `-s=CH-07`. Sem ele, CH-07 não roda e a rodada fecha `partial`;
  - Supabase local já de pé: API 54441, Studio 54443, Postgres 54442.
- **Bloquear:** `*.supabase.co` (abortar por rota — o banco local guarda `image_url` apontando para o Storage
  hospedado); `**/g/collect*` (GA4, por caminho, nunca por domínio — em dev a loja não mede, no `vite preview` sim).
- **E-mail de dev:** Mailpit `http://127.0.0.1:54444` — nenhuma jornada deste plano envia e-mail.
- **Viewport alvo:** 390 × 844 primeiro, depois 1440 × 900 (o projeto define; 375/1280 não são os alvos). Fonte do
  sistema a 130 % e 200 % = `document.documentElement.style.fontSize`, refeito a cada carga (as alturas da faixa são em
  `rem`); zoom do navegador a 200 % é outra medida. A 200 % a faixa pode passar de duas linhas — a altura fixa vale só
  para a fonte padrão (Q-01).
- **Nunca:**
  - pagar, digitar cartão, gerar PIX ou criar pedido (o checkout é aberto só para ver que a faixa não está lá);
  - alterar `store_settings` ou qualquer dado pelo Studio, SQL ou API — a faixa se grava **só pela tela** do painel;
    não consertar massa à mão;
  - `supabase stop --all`, qualquer comando `--linked`, `db push`, ou chave/URL do projeto hospedado;
  - commit, `git stash` ou mudança de branch no worktree;
  - criar seção na Home (o Banner principal fica como está; sem ele, TC-REG-001 é `blocked`).
- **Uploads:** a thread gera antes da Fase 2, fora do repositório, em `<scratchpad da thread>/wi/101/uploads/`:
  `arte-1440x48.png` (1440 × 48), `arte-780x96.png` (780 × 96) — fundo liso e o texto "Arte de teste" — e
  `arte-errada.txt`. Passa o caminho no briefing.
- **Massa:** a faixa nasce desligada e sem avisos (padrão, sem migration). CH-01 cria o manifesto pela tela; os
  demais leem; CH-05 desliga e religa, terminando igual; CH-04 não salva.
  - C1, C2: os caminhos de duas categorias que existem na loja local (as duas primeiras do menu), anotados por CH-01
    no log e passados aos charters seguintes.
  - A1 · Texto · destaque `Black Friday` · texto `novembro inteiro com joias em oferta` · rótulo `Ver ofertas` · destino C1
  - A2 · Texto · destaque `10%, 15% e 20% de desconto` (26) · texto `em anéis, colares e pingentes selecionados no ateliê`
    (52) · rótulo `Ver as peças` (12) — **90 somados, o teto** · destino C2
  - A3 · Texto · destaque `Frete grátis` · texto `acima de R$ 450,00 para Sul e Sudeste` · sem rótulo · sem destino
  - A4 · Imagem · `arte-1440x48.png` e `arte-780x96.png` · alternativo
    `Black Friday na Uma Estrelinha: joias em oferta em novembro` · destino C1
  - Interruptor: ligado. Ordem: A1, A2, A3, A4.
  - Conta `admin-loja`: a do `supabase/seed.sql` local (bloco do admin, perto da linha 147: e-mail e senha) — a thread
    põe em `QA_ADMIN_LOJA_USUARIO` / `QA_ADMIN_LOJA_SENHA`; o valor nunca vai a log nem a arquivo.

## Estratégia

- **Como se exercitam as jornadas:** um charter por área de risco, uma persona por sessão, no browser real
  (`agent-browser`, ou `playwright-cli` / Playwright MCP como fallback); os `TC-*` são conferidos dentro do charter que os
  cita. CH-01 cria a massa que as outras sessões leem.
- **CFR:** acessibilidade (a faixa é região nova, gira sozinha, fica sobre ouro), performance percebida (o CLS é o
  risco central, RN-02/CA-06), compatibilidade (viewport, movimento reduzido, fonte grande) e usabilidade (tempo para
  ler). Recuperação de erro fora: a faixa não tem caminho de erro visível à cliente.
- **Conferência visual:** as duas telas × o Claude Design (CH-06); sem o MCP `claude-design`, `not-run`.
- **Onde termina o simulado:** a função `api/page` é substituída pela marcação do documento (Q-02); o cache da Vercel e
  a Home servida por ela não existem localmente; leitor de tela, Safari iOS e Chrome Android reais ficam fora.
- **Automação:** 17 casos `e2e` + `missing` ficam como pedido de automação E2E; `integration` nenhum (a gravação e a
  leitura pelo banco já têm o probe `probes/04-faixa-no-banco.sh` da Validation); `blocked` nenhum.

### Suíte smoke

| Ordem | TC | Jornada | O que prova |
| ----- | -- | ------- | ----------- |
| 1 | TC-FUNC-001 | J-01 | a dona grava a faixa e a loja a mostra |
| 2 | TC-FUNC-011 | J-02 | a faixa em Home, categoria e produto; fora do checkout e do pedido montado |
| 3 | TC-JOURNEY-001 | J-02 | do produto, pelo celular, a cliente chega às ofertas pela faixa |

## Critérios de entrada

- [ ] Validation do Dev com `Status: PASS` no `qa-report.md` (está: validation 1, 2026-11-13)
- [ ] Loja (:8082) e painel (:8083) do worktree rodando com as variáveis locais
- [ ] Supabase local de pé (`supabase status`)
- [ ] App acessível com paridade de produção onde o local alcança (auth real do Supabase local, cookies habilitados)
- [ ] `QA_ADMIN_LOJA_USUARIO` / `QA_ADMIN_LOJA_SENHA` definidas a partir do `supabase/seed.sql`
- [ ] Massa: a faixa ainda não configurada (se já houver configuração de uma rodada anterior, CH-01 parte dela e
      ajusta ao manifesto pela tela, registrando no log)
- [ ] As três artes de `Uploads` geradas
- [ ] Para CH-05: `agent-browser` com a sonda da rota de documento (Ambiente da execução) e a referência `:8092` de pé
- [ ] Para CH-07: `@playwright/cli` instalado (`playwright-cli --version`) e o build servido
- [ ] Driver de browser disponível — `agent-browser` 0.39+, ou `playwright-cli` / Playwright MCP headless como fallback
- [ ] Para CH-06: o MCP `claude-design` acessível (o Claude Design avulso sai do ar até 2026-12-14)

## Critérios de saída

- **`pass`** — toda jornada `P0` chega ao objetivo, nenhum bug `critical`/`high` aberto, todos os charters rodaram
- **`partial`** — caso `P0`/`P1` `blocked` ou charter que não rodou
- **`fail`** — caso `P0` falhou, ou bug `critical`/`high` aberto
- Todo caso `e2e` + `missing`/`blocked` com o pedido de automação registrado

## Cobertura

| Critério | Fonte | Resumo do critério | TC |
| -------- | ----- | ------------------ | -- |
| UC-01 | prd | a faixa acima do cabeçalho, giro, pausa, setas, link, movimento, rolagem | TC-FUNC-011, TC-FUNC-012, TC-FUNC-013, TC-FUNC-014, TC-FUNC-016, TC-JOURNEY-001, TC-UI-001, TC-UI-002, TC-CFR-003, TC-FUNC-008 |
| UC-02 | prd | aviso de imagem: duas artes, alternativo, destino, `<picture>` | TC-FUNC-002, TC-FUNC-015, TC-UI-004 |
| UC-03 | prd | a tela do painel: interruptor, lista até 5, tipos, destino, prévia, ajuda de tom | TC-FUNC-001, 002, 003, 004, 005, 006, 007, 008, TC-UI-005 |
| UC-04 | prd | desligada ou vazia: a faixa não existe, cabeçalho no topo | TC-FUNC-009, TC-UI-003 |
| RN-01 | prd | toda a loja menos o checkout e o pedido montado | TC-FUNC-011 |
| RN-02 | prd | sem salto: a página servida diz se a faixa existe | TC-CFR-001, TC-FUNC-010 |
| RN-03 | prd | o tom da loja; só texto e imagem | TC-FUNC-007 |
| RN-04 | prd | região rotulada, sem `aria-live`, setas rotuladas, contraste | TC-CFR-002 |
| RN-05 | prd | movimento com par reduzido; nada nasce invisível | TC-CFR-003 |
| RN-06 | prd | um dono do giro (o do Banner principal) | TC-FUNC-012, TC-REG-001 |
| RN-07 | prd | 390: sem rolagem lateral, duas linhas, 200 % sem cortar o link | TC-UI-001, TC-CFR-004 |
| CA-01 | prd | Home, categoria e produto com faixa; checkout e `/pedido-montado` sem | TC-FUNC-011, TC-JOURNEY-001, TC-FUNC-001 |
| CA-02 | prd | 6 s; para com ponteiro, foco e toque; movimento reduzido não gira | TC-FUNC-012, TC-FUNC-016, TC-CFR-003 |
| CA-03 | prd | uma arte por dispositivo, no tamanho da vaga, com o alternativo | TC-FUNC-015 |
| CA-04 | prd | destino externo recusado com o motivo; sem destino é texto | TC-FUNC-003, TC-FUNC-004, TC-FUNC-013 |
| CA-05 | prd | desligada: loja idêntica à de hoje em 390 e 1440 | TC-UI-003, TC-FUNC-009 |
| CA-06 | prd | CLS da Home e do produto não sobe, rede lenta | TC-CFR-001 |
| CA-07 | prd | 390 e 1440: sem rolagem lateral, setas de 44, duas linhas sem corte | TC-UI-001, TC-UI-002, TC-FUNC-016, TC-CFR-004 |
| CA-08 | prd | até 5 min / 1 h; nenhuma página empurra o conteúdo no meio-tempo | TC-FUNC-010, TC-FUNC-007 |

**Sem cobertura:** nada. Parciais, com o motivo: **CA-08** — o "nenhuma página empurra" é coberto; o prazo de 5 min /
1 h é do cache de borda da Vercel e só um preview responde. **CA-06** e **RN-02** — medidos com o documento marcado
como a função marca (Q-02); a Home servida pela função na Vercel fica para o deploy. **RN-04** — contraste só no perfil
atual (WI 100 não existe).

## Riscos

| Risco (para o usuário) | Probabilidade | Impacto na persona | Mitigação no plano |
| --- | --- | --- | --- |
| a faixa chega depois e empurra a página do celular | média | abala confiança | TC-CFR-001, TC-FUNC-010 (CH-07, CH-05) |
| o aviso de 90 caracteres não cabe a 390 ou a 200 % e o link some | alta a 200 % | impede concluir (não chega às ofertas) | TC-UI-001, TC-CFR-004; Pergunta Q-01 |
| o cabeçalho que recolhe cobre a faixa ou pula | média | fricção | TC-FUNC-014 |
| a faixa aparece no checkout e distrai do pagamento | baixa | fricção | TC-FUNC-011 |
| a dona salva e a loja não muda (atraso não entendido ou gravação falha) | média | abala confiança | TC-FUNC-001, TC-FUNC-007 |
| link para fora da loja na faixa | baixa | abala confiança | TC-FUNC-003 |
| o Banner principal para de girar pela mudança do hook | baixa | cosmético a fricção | TC-REG-001 |
| a medida local não representa a produção (sem função, sem cache) | alta | — (risco do resultado) | Ambiente da execução; Q-02; parciais na Cobertura |

## Perguntas

- 🔴 **Q-01** — **respondida** (humano, 2026-11-13). Com a fonte do sistema a 200 % no celular, o aviso de 90
  caracteres não cabe em duas linhas: o que é o esperado? Critério: RN-07 e UC-01 (prd), com H-04/H-05 (spec).
  **Resposta:** "A 200 % a faixa cresce além de duas linhas; a altura fixa vale só para a fonte padrão." **Aplicada:**
  passo 2 e metas de TC-CFR-004 e a variação de fonte de TC-UI-001 — a 200 %, mais de duas linhas não é bug; continua
  bug texto cortado ou sobreposto, link inalcançável, rolagem lateral e cabeçalho cobrindo a faixa.
- 🔴 **Q-02** — **respondida** (humano, 2026-11-13). Como a QA local observa a página com `data-faixa` (RN-02, CA-06,
  CA-08)? **Resposta:** "Interceptar o documento no navegador e escrever o atributo no `<html>`, como a função faz" — a
  sugestão (A), como o plano já estava escrito. **Aplicada:** CH-05 e CH-07, TC-CFR-001, TC-FUNC-010 e o Ambiente da
  execução; CH-05 passou ao `agent-browser` (corpo fixo, sem atraso), CH-07 segue no `cli` (rede e CPU limitadas) e
  exige instalar `@playwright/cli`.
- 🟡 a rota do `agent-browser` responde com corpo fixo e não diz se aceita o tipo do conteúdo: assumido que o Chromium
  abre o documento roteado como página HTML. A sonda no começo de CH-05 confirma; se abrir como texto, CH-05 roda no
  `cli`, com a mesma instalação de CH-07.
- 🟡 TC-FUNC-010 roda sem rede lenta (o `agent-browser` não limita rede): o "nada se move" é lido pelas entradas de
  `layout-shift`, não a olho; a medida de CLS em rede lenta é a de TC-CFR-001.
- 🟡 a referência "a loja de hoje" de CA-05 é o `master` (`eceb80c2`) servido do checkout principal em `:8092`; sem ela,
  a comparação é estrutural (nada antes do `<header>`, `<header>` em y = 0).
- 🟡 os destinos dos avisos são categorias reais da loja local (C1, C2), não `/ofertas` (o exemplo do protótipo, que
  pode não existir localmente).
- 🟡 os textos dos avisos são os exemplos do protótipo; o A2 foi ajustado para ter exatamente 90 caracteres somados (o
  teto) e o A3 ("Frete grátis …") é dado de teste, não uma promessa da loja local.
- 🟡 a pausa "enquanto o dedo está na faixa" é conferida com toque prolongado do driver; sem esse gesto, o passo é
  `skip` com o motivo.
- 🟡 a fonte do sistema a 130/200 % é simulada pelo tamanho da fonte da raiz (as alturas são em `rem`); a configuração
  de fonte de um Android real fica fora.
- 🟡 as artes de teste são geradas pela thread (fundo liso, texto "Arte de teste"); nitidez de arte real não é medida.
- 🟢 o subtítulo do protótipo diz 5 segundos e a tela diz 6 (H-15) — decidido, não é diferença no design-check.
- 🟢 o contraste `ink`/`accent` "nos dois perfis" (RN-04) só pode ser medido no perfil atual; quem construir o WI 100
  mede o segundo.
- 🟢 o prazo de 5 min / 1 h (CA-08) e o tempo da Home servida pela função (H-24) só se medem num preview da Vercel,
  antes do deploy.
- 🟢 o `InfoBanner` de erro de leitura do painel nunca aparece (`fetchAllSettings` cai nos padrões) — conhecido, fora
  desta rodada.
