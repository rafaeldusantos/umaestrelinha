```json
{
  "schema": "qa-plan/v1",
  "title": "Plano de QA — Joias em oferta configurável — título, descrição, campanha e peças escolhidas no bloco da Home",
  "summary": {
    "total_cases": 32,
    "by_priority": { "P0": 11, "P1": 19, "P2": 2, "P3": 0 }
  },
  "acceptance_criteria_covered": 27,
  "strategy": [
    "Exploração por charter no browser real (agent-browser, playwright-cli ou Playwright MCP), uma persona por sessão",
    "E2E (Playwright) pedido à automação p/ fluxos P0/P1 determinísticos",
    "Manual p/ usabilidade, acessibilidade e conferência contra os padrões do protótipo"
  ],
  "cases": [
    { "id": "TC-JOURNEY-001", "title": "A dona põe no ar o bloco da campanha em vigência com o título, a descrição e as peças que escolheu", "priority": "P0", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-002", "title": "A cliente, pelo celular, encontra na Home as joias escolhidas e chega à peça com o preço da campanha", "priority": "P0", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-003", "title": "O bloco preparado para uma campanha agendada aparece sozinho na Home no início e sai no fim", "priority": "P0", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-001", "title": "O bloco que ainda não tem campanha não aparece na loja, mesmo ligado, e a linha e o editor pedem a escolha", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-002", "title": "A lista de campanhas do bloco oferece as em vigência e as agendadas, na ordem do início, com estado e vigência", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-003", "title": "Com título e descrição vazios, o bloco usa o nome da campanha, a frase dos percentuais e as primeiras peças dela", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-004", "title": "A busca de peças só oferece as marcadas na campanha escolhida e mostra a já escolhida como indisponível", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-005", "title": "A prévia mostra o texto e as peças do rascunho, na ordem que a dona arrumou, antes de salvar", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-006", "title": "Salvar mostra \"Salvo\" sem recarregar a prévia, e a linha do bloco diz a campanha e o estado", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-007", "title": "Título acima de 60, descrição acima de 160 ou mais de 12 peças não gravam, e a tela diz o motivo e o limite", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-008", "title": "Na Home, o bloco mostra o selo, o título, a descrição, os cartões de percentual e as peças na ordem da dona", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-009", "title": "O bloco acrescentado pela bandeja nasce desligado e sem campanha, e o editor não salva sem campanha", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-010", "title": "A campanha que já tem outro bloco aparece indisponível, dizendo a posição e o título desse bloco", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-011", "title": "Com uma campanha agendada escolhida, o editor avisa que a prévia só mostra o bloco a partir do início", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-012", "title": "A linha do bloco de campanha agendada diz que ele não vai aparecer na loja e por quê, e a loja não o mostra", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-013", "title": "Duas abas gravando a mesma campanha: a segunda é recusada com a frase do outro bloco e o rascunho fica na tela", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-014", "title": "O bloco cuja campanha foi apagada some da loja e pede a escolha com a mesma mensagem do bloco sem campanha", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-015", "title": "A peça tirada da campanha some do bloco sem substituta e sai da lista ao abrir o editor, que abre alterado", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-016", "title": "A peça escolhida despublicada ou apagada some da loja, e o painel conta e nomeia a peça", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-017", "title": "Se o editor não consegue ler as peças da campanha, nenhuma peça sai da lista e ele avisa", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-018", "title": "A peça marcada que a campanha não barateia não aparece no bloco, e o editor e a linha dizem por quê", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-019", "title": "Sem nenhuma peça escolhida valendo, o bloco mostra só os cartões de percentual", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-020", "title": "Trocar a campanha tira as peças que a nova não tem, diz quais saíram, e Cancelar desfaz a troca", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-021", "title": "Campanha desligada ou encerrada tira o bloco da loja, e a linha e o editor dizem o estado", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-UI-001", "title": "A fileira das peças escolhidas rola no celular, vira fita com setas no computador e reserva uma vaga por peça ao carregar", "priority": "P1", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-UI-002", "title": "O editor do bloco segue os padrões do protótipo: contador ao lado do rótulo, recusa abaixo do campo, lista com subir e descer", "priority": "P2", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-SEC-001", "title": "Com a sessão de admin aberta na loja, bloco, selo, preço e /ofertas mostram só a campanha em vigência", "priority": "P0", "type": "security", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-SEC-002", "title": "Na prévia do painel com a sessão de admin aberta na loja, nenhuma campanha fora de vigência aparece", "priority": "P0", "type": "security", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-REG-001", "title": "Para a visitante, o selo, o preço, a sacola e /ofertas da campanha em vigência continuam como antes", "priority": "P0", "type": "regression", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-CFR-001", "title": "O editor do bloco é usável em 390 px com a fonte a 200 % e pelo teclado, com rótulos e recusas anunciadas", "priority": "P1", "type": "cfr", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-CFR-002", "title": "O bloco na loja não reserva espaço sem campanha, não desloca a página ao carregar e não rola de lado", "priority": "P1", "type": "cfr", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-CFR-003", "title": "Os textos fixos novos do bloco e do editor seguem o tom memorial", "priority": "P2", "type": "cfr", "automation": { "target": "manual", "status": "na" } }
  ]
}
```

# Plano de QA — 103 · Joias em oferta configurável — título, descrição, campanha e peças escolhidas no bloco da Home

**Work Item:** 103 (improvement) · **Escopo:** completo · **Foco:** —
**Versão do plano:** 1 · **Escrito em:** 2026-11-16 · **Modo:** criar
**Gate 1:** aprovado em 2026-11-16 (decisão delegada pela política do humano)
**Risco:** alto — toca o desconto de campanha exibido na loja, permissão (UC-06), migration nova e contrato em packages/core

## Resumo

- **Valor para o usuário:** a dona (Adri) passa a dizer com as próprias palavras o que o bloco "Joias em oferta"
  da Home apresenta — título e descrição —, escolhe de qual campanha ele é e quais peças dela aparecem, em que
  ordem, conferindo na prévia antes de salvar. Pode deixar pronto o bloco da próxima campanha, que entra sozinho
  na Home quando ela começa e sai quando acaba. A cliente vê na Home as joias que a dona escolheu, com o desconto
  da campanha que está valendo — e só dela, inclusive quando quem abre a loja é a própria dona logada.
- **Maior risco para o usuário:** a loja mostrar desconto de uma campanha que não está valendo (agendada,
  encerrada ou desligada) — à cliente ou à dona logada —, ou o bloco sumir da Home sem a dona entender por quê.
- **Contagens:** personas 3 · jornadas 5 · charters 8 (CFR 1 · design-check 1) · TC 32 (P0 11 · P1 19 · P2 2 · P3 0)
- **Automação:** e2e 27 (missing 27 · existing 0 · blocked 0) · integration 0 · manual 5

## Escopo

**Dentro:** o editor do bloco "Joias em oferta" em `/admin/home/:sectionId` (Conteúdo, Campanha, Peças
escolhidas, avisos, recusas), a linha do bloco na lista de `/admin/home` e a bandeja que acrescenta outro bloco,
a prévia do painel com o bloco, o bloco na Home da loja (título, descrição, selo, cartões, fileira das peças
escolhidas, quando aparece e quando some) e a leitura da campanha em vigência pela loja com sessão de admin
(UC-06: bloco, selo, preço, `/ofertas`). Os 27 critérios de UC-01..UC-06 e RNF-01..RNF-08.

**Fora:**
- o cadastro de campanhas, o selo, os preços, a vitrine `/ofertas` e o cupom como comportamento (PRD › Fora).
  O cadastro de campanhas e a marcação de peças são **usados** para montar a massa, não testados; `/ofertas`, o
  selo e o preço só entram como regressão do UC-06 (D-03: para a visitante nada muda)
- escolher peça que não está marcada na campanha (PRD › Fora)
- peça despublicada visível a uma sessão de admin na loja (D-04, dívida registrada para WI próprio): o CA-04.1 se
  mede **como visitante**
- os outros blocos da Home e seus editores ("Produtos em destaque", "Lista de categorias", banners, fileiras)
- as functions de checkout e o preço cobrado (leem a campanha com service role — fora do alcance do UC-06)
- a gravação negada a quem não é admin (RLS de `home_sections`) e a leitura de campanha agendada por `anon` no
  banco: são provas de probe da implementação (`probes/`), sem tela onde a persona as veja
- o HTML servido pela Vercel e o deploy (a janela entre `db push` e deploy em que a loja publicada lê
  `campaign_id`)

## Fontes

| Fonte      | Caminho                             | Uso                                        |
| ---------- | ----------------------------------- | ------------------------------------------ |
| PRD        | `.specs/work-items/103-joias-em-oferta-configuravel/prd.md` (r1; `discovery.md` e `prd-review.md` para contexto) | critérios de aceite — a régua da cobertura |
| Costura    | `spec.md` · `tasks/01..04` · `waves.md` | o que o Dev entendeu (D-01..D-08, F1..F13) e o que ficou fora |
| Fontes de design | `link` · https://claude.ai/artifact/SQehnBNiiQmbnjkY3QQpbq (item.md › Insumos) — **não tem** as telas do bloco nem `/admin/home`, só padrões (D-01) · `claude_design` · "Black Friday - Home.html" da WI 102 — **inacessível** (login recusado), não planejado | charter `design-check` restrito aos padrões adotados em D-01 |
| Insumos    | `item.md` › Insumos — WI 102 (`prd.md`, `spec.md`, e o plano de QA dela para a massa e o cadastro); caminhos de código não lidos (implementação em curso) | referência do bloco na loja (componente da 102) e do editor (molde "Produtos em destaque") |
| Validation | `ausente` — a Validation ainda não rodou | gate técnico antes da execução |
| Projeto    | `.specs/project/PROJECT.md` (Ambiente local, No browser) e as instruções `CLAUDE.md`, `apps/backoffice/CLAUDE.md`, `apps/store/CLAUDE.md`, `supabase/CLAUDE.md` | ambiente da execução |

## Personas

Detalhe em [personas.md](personas.md).

| ID     | Nome   | Arquétipo   | Objetivo    | Conta                      | Jornadas   |
| ------ | ------ | ----------- | ----------- | -------------------------- | ---------- |
| PER-01 | Adri   | usuário avançado | montar o bloco da campanha que está valendo e deixar pronto o da próxima, com as próprias palavras e as peças que escolheu | `admin-loja` | J-01, J-03, J-04 |
| PER-02 | Marina | usuário mobile (primeira visita) | achar pelo celular uma joia em oferta na Home e entender o desconto | `anonima` | J-02 |
| PER-03 | Adri, conferindo a loja | usuário ocasional | olhar a loja logada, pelo celular, e ver o que a cliente vê antes de a próxima campanha começar | `admin-loja` | J-05 |

**Não cobertas:** usuário de tecnologia assistiva — sem persona própria; rótulos, alerta, teclado e fonte a 200 %
(RNF-04, RNF-08) entram como categorias do CFR nas duas superfícies, e o leitor de tela real fica fora (o browser
da sessão só simula pela árvore de acessibilidade). Usuário em recuperação — melhoria nova, sem falha anterior
de usuário. Novo usuário no painel — só a dona administra, e todo dia.

## Jornadas

| ID   | Jornada (pelo valor) | Persona principal · secundária | Prioridade | Abandono/erro | Cruza fronteira      | Arquivo                         |
| ---- | -------------------- | ------------------------------ | ---------- | ------------- | -------------------- | ------------------------------- |
| J-01 | Pôr no ar, com as próprias palavras, o bloco da campanha que está valendo | PER-01 · PER-02 | P0 | J-01a, J-01b | sim: painel → banco → loja | [J-01](journeys/J-01-por-no-ar-o-bloco-da-campanha-vigente.md) |
| J-02 | Achar pelo celular as joias escolhidas em oferta e chegar à peça com o preço da campanha | PER-02 · — | P0 | J-02a, J-02b | não | [J-02](journeys/J-02-achar-as-joias-escolhidas-pelo-celular.md) |
| J-03 | Deixar pronto o bloco da próxima campanha e vê-lo entrar sozinho no início | PER-01 · PER-02 | P0 | J-03a, J-03b, J-03c | sim: relógio do banco → loja | [J-03](journeys/J-03-deixar-pronto-o-bloco-da-proxima-campanha.md) |
| J-04 | Manter o bloco certo quando uma peça escolhida deixa de valer | PER-01 · PER-02 | P1 | J-04a, J-04b | sim: catálogo e marcação → bloco | [J-04](journeys/J-04-manter-o-bloco-certo-quando-a-peca-deixa-de-valer.md) |
| J-05 | Conferir a loja logada antes da próxima campanha e ver só o que vale hoje | PER-03 · — | P0 | J-05a | sim: sessão de admin → leitura da vigência | [J-05](journeys/J-05-conferir-a-loja-logada-antes-da-proxima-campanha.md) |

## Charters

Ordem de execução — a Fase 2 despacha nesta ordem e, com o `agent-browser` ou o `playwright-cli`, por **Lote**: no máximo 3
charters, nunca dois da mesma conta ou da mesma massa, e o CFR sozinho, por último. Charter com outro
**Driver** roda sozinho. Cada charter com no máximo um TC a cada 5 ações do time-box.

**Por que 7 lotes, e por que a ordem não é só "P0 primeiro":** há uma só conta de admin (`admin-loja`) e seis dos
oito charters precisam dela — eles não dividem lote. O CH-01 configura o bloco B-1, de que todos os outros
dependem, e roda sozinho. O CH-05 vem **antes** do CH-04: a troca de campanha dele (TC-FUNC-020) precisa da "Natal"
ainda sem bloco, e o CH-04 a entrega a B-2. O CH-06 (P0) desliga "Dia das Mães" por ~25 minutos para fazer a
virada de uma campanha agendada; nesse tempo a loja não tem campanha em vigência, então ele roda depois de tudo o
que lê "Dia das Mães" e religa a campanha antes do CFR. Uma segunda conta de admin juntaria lotes (ver 🟢 nas
Perguntas).

| Ordem | Lote | ID    | Missão                               | Persona   | Conta   | Massa                    | Driver | Tour   | Time-box | Prioridade | TC             | Arquivo                           |
| ----- | ---- | ----- | ------------------------------------ | --------- | ------- | ------------------------ | ------ | ------ | -------- | ---------- | -------------- | --------------------------------- |
| 1 | L1 | CH-01 | a dona escolhe a campanha, escreve título e descrição, escolhe e ordena as peças do bloco existente, confere na prévia e o vê na loja | PER-01 | `admin-loja` | **altera** B-1 (campanha C-VIG, título, descrição, P-3, P-1, P-2); só lê C-VIG, C-AGE, C-ENC e as marcações de C-VIG | — | Feature | 90 min | P0 | TC-JOURNEY-001, TC-FUNC-001, TC-FUNC-002, TC-FUNC-003, TC-FUNC-004, TC-FUNC-005, TC-FUNC-006, TC-FUNC-007 | [CH-01](charters/CH-01-por-o-bloco-da-vigente-no-ar.md) |
| 2 | L2 | CH-02 | quem chega pela primeira vez pelo celular encontra as joias escolhidas no bloco, entende o desconto e chega à peça | PER-02 | `anonima` | só lê B-1, C-VIG, P-1..P-3 | — | Feature | 60 min | P0 | TC-JOURNEY-002, TC-FUNC-008, TC-UI-001 | [CH-02](charters/CH-02-joias-escolhidas-pelo-celular.md) |
| 3 | L2 | CH-03 | logada na loja, a dona vê só a campanha em vigência — nada da agendada, da encerrada ou da desligada —, e a visitante vê o mesmo de antes | PER-03 | `admin-loja` | **cria** C-DES e **marca** P-AGE nela; só lê B-1, C-VIG, C-AGE, C-ENC, M-A; **cria** uma sacola (sem pedido) | — | Feature | 90 min | P0 | TC-SEC-001, TC-SEC-002, TC-REG-001 | [CH-03](charters/CH-03-loja-logada-so-mostra-a-vigente.md) |
| 4 | L3 | CH-08 | design-check — editor do bloco (Conteúdo, Peças escolhidas, recusa) · `link` artifact `SQehnBNiiQmbnjkY3QQpbq` (só os padrões de D-01) | PER-01 | `admin-loja` | só lê (abre o editor de B-1 e cancela) | — | — | 30 min | P2 | TC-UI-002 | [CH-08](charters/CH-08-design-check.md) |
| 5 | L4 | CH-05 | peça escolhida que sai da campanha, sai do ar, é apagada ou não fica mais barata nunca aparece no bloco nem some do painel sem aviso, e trocar a campanha não leva peça errada | PER-01 | `admin-loja` | **altera** B-1 (acrescenta e perde peças); **tira** P-TIRA de C-VIG; **despublica e republica** P-FORA; **apaga** P-APAG; só lê P-NB, P-AMBAS, C-AGE | — | Interrupt | 90 min | P1 | TC-FUNC-015, TC-FUNC-016, TC-FUNC-017, TC-FUNC-018, TC-FUNC-019, TC-FUNC-020 | [CH-05](charters/CH-05-pecas-que-deixam-de-valer.md) |
| 6 | L5 | CH-04 | a Home aceita um bloco por campanha: o novo nasce sem campanha, a campanha usada fica indisponível, a agendada é avisada, a colisão é recusada sem perder o rascunho e a campanha apagada não quebra nada | PER-01 | `admin-loja` | **cria** B-2 (C-AGE) e B-3; **cria e apaga** C-X; só lê B-1 | — | Multi-Tab | 90 min | P1 | TC-FUNC-009, TC-FUNC-010, TC-FUNC-011, TC-FUNC-012, TC-FUNC-013, TC-FUNC-014 | [CH-04](charters/CH-04-varios-blocos-e-bloco-sem-campanha.md) |
| 7 | L6 | CH-06 | o bloco preparado entra sozinho no início da campanha e sai no fim pelo relógio do banco, qualquer que seja o fuso do aparelho, e o painel diz o estado de cada bloco | PER-01 | `admin-loja` | **desliga e religa** C-VIG; **cria** C-VIR; **altera** B-3 (C-VIR); só lê B-1 | — | Locale | 90 min | P0 | TC-JOURNEY-003, TC-FUNC-021 | [CH-06](charters/CH-06-virada-da-campanha.md) |
| 8 | L7 | CH-07 | CFR — J-01 e J-02 sobre "Dia das Mães" religada | PER-01 | `admin-loja` | **altera** o título de B-1 e o devolve; o resto só lê | — | — | 45 min | P1 | TC-CFR-001, TC-CFR-002, TC-CFR-003 | [CH-07](charters/CH-07-cfr.md) |

## Ambiente da execução

O que vale para toda sessão da Fase 2 — vai no campo `ambiente` do briefing, porque o explorer e o retester
rodam sem as instruções do projeto. Fontes: `PROJECT.md` › Ambiente local e No browser; `CLAUDE.md` › Comandos e
Estado da infraestrutura; `apps/backoffice/CLAUDE.md` › `/admin/home`, A ponte da prévia; `apps/store/CLAUDE.md` ›
Modo prévia, Auth; `supabase/CLAUDE.md` › Auth.

- **App** (do worktree `/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-103`):
  - loja: `http://localhost:8082` — a Home em `/`; `/ofertas`; peça em `/produtos/<slug>`
  - painel: `http://localhost:8083` — login em `/admin/login`; a Home em `/admin/home` (lista à esquerda, prévia
    à direita; o editor de um bloco em `/admin/home/<id-do-bloco>`); Campanhas em `/admin/campanhas`; Produtos
    em `/admin/produtos` (a marcação de campanha fica na aba **Preço e estoque** da peça)
  - Supabase local: API `http://127.0.0.1:54441`
  - as portas 8082/8083 podem estar ocupadas por outro worktree (aconteceu na WI 102): a thread confirma, antes
    do L1, que elas servem **este** worktree e corrige as URLs no briefing se não
- **Bloquear** antes do primeiro `open`: `**/*.supabase.co/**` (o banco local guarda `image_url` do Storage
  hospedado — a foto pode não aparecer, e isso **não** é achado) e `**/g/collect*` (o GA4: bloqueie pelo
  caminho, nunca só pelo domínio)
- **E-mail de dev:** Mailpit em `http://localhost:54444` — o código de 6 dígitos do login da loja cai ali
- **Viewport alvo:** `390 × 844` primeiro (≈90 % dos acessos são de celular), depois `1440 × 900`. As telas
  novas — o editor do bloco e o bloco na Home — também com a fonte a **130 %** e a **200 %** (simule aumentando
  o tamanho da fonte da raiz da página, não o zoom da página inteira). Alvo de toque ≥ 44 px; nenhuma rolagem
  horizontal do corpo. A prévia do painel tem o alternador próprio: Celular `390 × 844` e Computador `1024 × 768`
- **Credenciais:** por variável — `QA_ADMIN_LOJA_USUARIO` / `QA_ADMIN_LOJA_SENHA`; nunca o valor em log, nota
  ou screenshot
- **Nunca:**
  - pagar de verdade, digitar número de cartão ou concluir um PIX; chamar serviço externo real (Mercado Pago,
    Resend, Melhor Envio, Claude API) — as functions locais rodam com chaves inválidas
  - `supabase stop --all`, migration com `--linked` ou `db push`, servir functions com o `.env` da raiz
  - abrir o Studio ou consultar o banco: a sessão é caixa-preta, pela tela
  - editar o preço cadastrado de uma peça
  - apagar produto que não seja **P-APAG** (só no CH-05) ou campanha que não seja **C-X** (só no CH-04)
  - entrar na **loja** (`:8082`) com a conta `admin-loja` fora do CH-03: com sessão de admin a loja enxerga
    peça despublicada (D-04, fora deste WI) e o que a sessão vê deixa de ser o da cliente
  - mexer em campanha, peça ou bloco fora do que a coluna **Massa** do seu charter permite
- **Tom:** registro memorial. Nenhum texto do bloco ou do editor pode ter urgência, contagem regressiva,
  escassez ou exclamação (RNF-05) — encontrar um é achado
- **Uploads:** não há
- **Datas:** hoje é **2026-11-16**, horário de Brasília. Estado esperado das campanhas no banco local (conferido
  pela Costura em 2026-11-16; a thread reconfere antes do L1): "Dia das Mães" **em vigência** até 30/11/2026 23:59;
  "Black Friday" **encerrada**; "Natal" **agendada** de 01/12/2026 00:00 a 24/12/2026 23:59. Só uma campanha
  ligada pode valer por vez: o cadastro recusa ligar duas com vigências que se cruzam
- **Massa** (manifesto — a thread escolhe as peças no banco local antes do L1 e passa os nomes e slugs no
  briefing de cada charter; as peças precisam estar ativas e com estoque):

  | ID | O que é | Quem altera | Quem só lê |
  | -- | ------- | ----------- | ---------- |
  | C-VIG | "Dia das Mães", em vigência, com **13 ou mais** peças marcadas (inclui P-1..P-10, P-TIRA, P-FORA, P-APAG, P-NB, P-AMBAS) | CH-05 tira P-TIRA · CH-06 desliga e religa | todos |
  | C-AGE | "Natal", agendada, com 3 ou mais peças marcadas (as M-G da 102) — uma delas é P-AMBAS | ninguém | CH-01, CH-03, CH-04, CH-05 |
  | C-ENC | "Black Friday", encerrada, com marcações (M-A, M-B, M-C da 102) | ninguém | CH-01, CH-03 |
  | C-DES | "QA103 Desligada" — desligada, vigência 16/11/2026 00:00 a 30/11/2026 23:59, 30 % | **CH-03 cria** e marca P-AGE | CH-04..CH-07 (não deve aparecer como opção) |
  | C-X | "QA103 Ano Novo" — agendada, 26/12/2026 00:00 a 31/12/2026 23:59, 10 %, ligada, sem peças | **CH-04 cria e apaga** | — |
  | C-VIR | "QA103 Virada" — ligada, começa em T0 = próximo minuto cheio + 8 min e termina em T0 + 10 min, 10 %, sem peças | **CH-06 cria** | CH-07 (encerrada, só como estado) |
  | B-1 | o bloco "Joias em oferta" que já está na Home (da 102), ligado; depois da migration fica **sem campanha** | CH-01 configura · CH-05 acrescenta e perde peças · CH-07 muda o título e devolve | CH-02, CH-03, CH-04, CH-06, CH-08 |
  | B-2 | bloco novo da bandeja, de "Natal" | **CH-04 cria** | — |
  | B-3 | bloco novo da bandeja; fica **sem campanha** no fim do CH-04 | **CH-04 cria** · **CH-06** aponta para C-VIR | CH-07 |
  | P-1, P-2, P-3 | peças marcadas em C-VIG que a campanha barateia; as escolhidas de B-1 (ordem P-3, P-1, P-2) | ninguém | todos |
  | P-4..P-10 | mais 7 peças marcadas em C-VIG, para chegar à 13ª | ninguém (CH-01 só as põe no rascunho e cancela) | CH-01 |
  | P-TIRA | peça marcada em C-VIG | CH-05 tira de C-VIG (não devolve) | — |
  | P-FORA | peça marcada em C-VIG | CH-05 despublica e **republica no fim** | — |
  | P-APAG | "QA103 Peça descartável" — criada pela thread, marcada em C-VIG | CH-05 apaga | — |
  | P-NB | "QA103 Peça já em promoção" — criada pela thread com "de" R$ 200,00 e "por" R$ 120,00, marcada em C-VIG com 10 % (a campanha daria R$ 180,00: não barateia) | ninguém | CH-05 |
  | P-AMBAS | peça marcada em C-VIG **e** em C-AGE | ninguém | CH-05 |
  | P-AGE | peça marcada só em C-AGE | CH-03 marca também em C-DES | CH-03 |
  | M-A | peça marcada em C-ENC e em C-VIG (da 102) | ninguém | CH-03 |

  **Preparação da Fase 2, antes do L1** (thread principal, pelo painel, com `admin-loja`): conferir os estados
  de C-VIG, C-AGE e C-ENC; marcar em C-VIG as peças até chegar a 13 ou mais (a edição em massa de
  `/admin/produtos` faz isso), incluindo P-AMBAS; criar P-APAG e P-NB e marcá-las em C-VIG; conferir que B-1
  existe e está ligado (se não existir, acrescentá-lo pela bandeja e ligá-lo); conferir que **não** há bloco
  além de B-1 apontando para campanha; nomear todas as peças no briefing. C-DES, C-X, C-VIR, B-2 e B-3 **não**
  se preparam: nascem nos charters. Charter que não conseguir criar o que lhe cabe registra, e a thread cria pelo
  painel antes do lote seguinte.
- **Pré-condições do ambiente** (preparação, não das sessões): `apps/store/.env` e `apps/backoffice/.env` com
  `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` do Supabase local, e o painel com `VITE_STORE_URL`
  apontando para a loja local (sem ela a prévia não acende — o palco mostra o passo de configuração); `supabase
  status` de pé (portas 54440–54449); as migrations do WI 103 aplicadas **só no local** (`supabase migration up
  --local`); `pnpm dev` na raiz do worktree.

## Estratégia

- **Como se exercitam as jornadas:** um charter por área de risco, uma persona por sessão, no browser real
  (`agent-browser`, ou `playwright-cli` / Playwright MCP como fallback); os `TC-*` são conferidos dentro do
  charter que os cita. Para conferir a loja como cliente, o charter de painel abre `:8082` noutra aba **sem**
  entrar na loja — a sessão do painel (`:8083`) não vale na loja
- **CFR:** acessibilidade (rótulos do título, da descrição e do seletor; recusa anunciada como alerta; subir e
  descer pelo teclado — RNF-08), compatibilidade (390 · 1440 · fonte 130 % e 200 % no editor e no bloco —
  RNF-04, RNF-06; movimento reduzido na fileira), performance percebida (o bloco sem campanha não reserva espaço;
  a fileira reserva uma vaga por peça e não desloca a Home — RNF-01), recuperação de erro (recusas com motivo e
  rascunho mantido — CA-01.5) e usabilidade (tom memorial — RNF-05; o editor não desenha vitrine — RNF-07). Tema
  escuro fica fora: a loja não tem tema escuro
- **Conferência visual:** o protótipo informado não tem as telas do bloco nem `/admin/home` (D-01). O CH-08
  compara só os três padrões que a costura adotou dele no editor (contador "n / teto" ao lado do rótulo, recusa
  com ícone abaixo do campo, lista com subir/descer/tirar). O bloco na loja não tem fonte de design nova: a
  referência é o componente da 102, conferido pelo TC-FUNC-008 e pelo TC-REG-001
- **Onde termina o simulado:**
  - a virada de campanha (CH-06) é real, pelo relógio do banco local, com uma campanha de 10 minutos — o cache de
    5 minutos da Vercel na virada não existe no servidor de dev
  - "relógio do aparelho" (RNF-03): o browser da sessão emula **fuso** diferente, não muda o relógio do sistema;
    o resto é da Validation (`campanhaNaLoja.test.ts`)
  - a gravação negada a visitante e a leitura crua de `campaigns` por admin são provadas pelos probes da
    implementação (`probes/01-campanha-vigente.sql`, `02-secao-por-campanha.sql`), não pela tela
  - pagamento: nenhuma sessão passa da sacola
  - leitor de tela real fora: acessibilidade pela árvore de acessibilidade e pelo teclado
- **Automação:** 27 casos `e2e` + `missing` ficam como pedido de automação E2E (a virada do TC-JOURNEY-003 se
  automatiza com campanha de datas controladas, não esperando o relógio); `integration` nenhum; `blocked`: nenhum

### Suíte smoke

| Ordem | TC   | Jornada | O que prova                            |
| ----- | ---- | ------- | -------------------------------------- |
| 1 | TC-JOURNEY-001 | J-01 | a dona configura e salva o bloco da campanha em vigência, e ele aparece na loja |
| 2 | TC-JOURNEY-002 | J-02 | a cliente vê o bloco com as peças escolhidas e chega à peça com o preço da campanha |
| 3 | TC-SEC-001 | J-05 | com sessão de admin, a loja não mostra campanha fora de vigência |

## Critérios de entrada

- [ ] Validation do Dev com `Status: PASS` no `qa-report.md` — ainda **não** rodou
- [ ] App do branch rodando a partir do worktree `store__feature-103`, com os `.env` dos apps (inclusive
      `VITE_STORE_URL` no painel)
- [ ] App acessível num ambiente com paridade de produção (auth real, cookies habilitados) — local, com o auth do
      Supabase local e o código pelo Mailpit
- [ ] Credencial da conta `admin-loja` — `QA_ADMIN_LOJA_USUARIO` / `QA_ADMIN_LOJA_SENHA` (a thread diz onde está;
      nunca o valor). A mesma conta entra no painel e na loja (CH-03)
- [ ] Massa do manifesto preparada e nomeada (C-VIG com 13+ marcadas, P-APAG, P-NB, P-AMBAS, B-1 ligado)
- [ ] Driver de browser disponível — `agent-browser` 0.39+, ou `playwright-cli` / Playwright MCP headless como
      fallback; o CH-05 e o CH-02 precisam de bloqueio de rota por padrão de URL, o CH-02 de rede lenta, o CH-06 de
      emulação de fuso (sem ela, só aquela variação fica `skip`)
- [ ] Para o CH-08: o link do artifact abre sem sessão que a sonda não tenha

## Critérios de saída

- **`pass`** — toda jornada `P0` chega ao objetivo, nenhum bug `critical`/`high` aberto, todos os charters rodaram
- **`partial`** — caso `P0`/`P1` `blocked` ou charter que não rodou
- **`fail`** — caso `P0` falhou, ou bug `critical`/`high` aberto
- Todo caso `e2e` + `missing`/`blocked` com o pedido de automação registrado

## Cobertura

| Critério | Fonte      | Resumo do critério | TC                          |
| -------- | ---------- | ------------------ | --------------------------- |
| CA-01.1 | prd | campos de título e descrição; a prévia mostra o digitado antes de salvar | TC-FUNC-005, TC-JOURNEY-001 |
| CA-01.2 | prd | salvar mostra "Salvo" e não desmonta a prévia | TC-FUNC-006 |
| CA-01.3 | prd | título vazio ⇒ nome da campanha; descrição vazia ⇒ frase dos percentuais | TC-FUNC-003 |
| CA-01.4 | prd | o selo da campanha continua acima do título | TC-FUNC-003, TC-FUNC-008 |
| CA-01.5 | prd | falha de gravação mantém o digitado | TC-FUNC-013 |
| CA-01.6 | prd | título até 60, descrição até 160; acima, recusa com motivo e número | TC-FUNC-007 |
| CA-02.1 | prd | lista: em vigência e agendadas, na ordem do início, com estado e vigência; a atual aparece mesmo encerrada/desligada | TC-FUNC-002, TC-FUNC-021 |
| CA-02.2 | prd | o bloco aparece só durante a vigência da campanha escolhida | TC-JOURNEY-001, TC-FUNC-008, TC-FUNC-012, TC-JOURNEY-003, TC-FUNC-021 |
| CA-02.3 | prd | a linha diz a campanha e o estado; fora de vigência, que não vai aparecer e por quê | TC-FUNC-006, TC-FUNC-012, TC-FUNC-021 |
| CA-02.4 | prd | bloco sem campanha não aparece; o da bandeja nasce desligado e sem campanha; o editor só salva com campanha | TC-FUNC-001, TC-FUNC-009 |
| CA-02.5 | prd | campanha apagada ⇒ bloco sem campanha, mesma mensagem | TC-FUNC-014 |
| CA-02.6 | prd | um bloco por campanha; a usada aparece desabilitada com posição e título; colisão recusada com a mesma frase | TC-FUNC-010, TC-FUNC-013 |
| CA-03.1 | prd | busca só com as marcadas; sem campanha, indisponível e diz por quê | TC-FUNC-004 |
| CA-03.2 | prd | lista reordenável com posição, nome e remover; a loja segue a ordem | TC-FUNC-005, TC-FUNC-008, TC-JOURNEY-002 |
| CA-03.3 | prd | teto de 12 com motivo e número; fileira rola no celular, fita com setas no computador; esqueleto por peça | TC-FUNC-007, TC-UI-001 |
| CA-03.4 | prd | peça já escolhida aparece desabilitada na busca | TC-FUNC-004 |
| CA-03.5 | prd | sem peça escolhida, as primeiras da campanha | TC-FUNC-003 |
| CA-03.6 | prd | trocar a campanha tira as não marcadas e diz quais; Cancelar desfaz | TC-FUNC-020 |
| CA-04.1 | prd | peça fora do ar não aparece; o painel conta "N das M saíram do ar" e nomeia | TC-FUNC-016 |
| CA-04.2 | prd | peça tirada da campanha não aparece; a vaga não é completada | TC-FUNC-015 |
| CA-04.3 | prd | ao abrir, as tiradas e as apagadas saem e o editor abre alterado; leitura falha ⇒ nada sai e avisa | TC-FUNC-015, TC-FUNC-016, TC-FUNC-017 |
| CA-04.4 | prd | peça que a campanha não barateia não aparece; editor e linha dizem quais | TC-FUNC-018 |
| CA-04.5 | prd | todas fora ⇒ só os cartões de percentual | TC-FUNC-019 |
| CA-04.6 | prd | os cartões de percentual continuam, com ou sem peças | TC-FUNC-003, TC-FUNC-008, TC-FUNC-019 |
| CA-05.1 | prd | com campanha em vigência, a prévia mostra o rascunho antes de salvar | TC-FUNC-005, TC-JOURNEY-001 |
| CA-05.2 | prd | com campanha agendada, o editor avisa que a prévia só mostra a partir do início | TC-FUNC-011, TC-SEC-002 |
| CA-06.1 | prd | com sessão de admin, na loja e na prévia, só a campanha em vigência | TC-SEC-001, TC-SEC-002, TC-REG-001 |
| RNF-01 | prd | sem campanha valendo (e carregando), o bloco não reserva espaço | TC-FUNC-001, TC-CFR-002 |
| RNF-02 | prd | falha da leitura das peças não derruba a Home nem os cartões | TC-FUNC-008 |
| RNF-03 | prd | vigência nunca pelo relógio do aparelho | TC-JOURNEY-003, TC-SEC-001 |
| RNF-04 | prd | 390 px sem rolagem horizontal; editor usável a 200 % | TC-UI-001, TC-CFR-001, TC-CFR-002 |
| RNF-05 | prd | tom memorial nos textos fixos novos | TC-CFR-003 |
| RNF-06 | prd | título e descrição cabem em 390 px sem cortar | TC-FUNC-007, TC-CFR-002 |
| RNF-07 | prd | o editor não desenha vitrine | TC-CFR-001 |
| RNF-08 | prd | rótulo acessível; recusa anunciada como alerta | TC-FUNC-007, TC-CFR-001 |

**Sem cobertura:** nada — os 27 critérios de aceite e os 8 RNF têm ao menos um caso.

## Riscos

| Risco (para o usuário)  | Probabilidade        | Impacto na persona                                                   | Mitigação no plano                 |
| ----------------------- | -------------------- | -------------------------------------------------------------------- | ---------------------------------- |
| a dona logada vê na loja o desconto da campanha agendada e acha que já está no ar (UC-06) | média — o defeito foi provado no banco local | abala confiança · decisão errada sobre a vitrine | CH-03, TC-SEC-001, TC-SEC-002 |
| a troca da fonte de leitura (views de vigência) muda o selo, o preço ou `/ofertas` da visitante | média | impede concluir (preço errado) | CH-03, TC-REG-001 |
| depois da migration o bloco de hoje fica sem campanha e some da Home sem a dona entender | alta — é o comportamento decidido (D-02) | abala confiança | CH-01, TC-FUNC-001 |
| o bloco de uma campanha aparece fora da vigência, ou não aparece sozinho no início | média | perde dado de vitrine · abala confiança | CH-06, TC-JOURNEY-003, TC-FUNC-012 |
| peça que deixou de valer continua no bloco, ou some sem o painel avisar | média | abala confiança (preço que não vale) | CH-05, TC-FUNC-015..019 |
| a falha de gravação (colisão) apaga o que a dona escreveu | baixa | perde dado | CH-04, TC-FUNC-013 |
| a fileira de 12 peças cria rolagem horizontal ou salto na Home do celular | média | fricção | CH-02, CH-07, TC-UI-001, TC-CFR-002 |
| só uma conta de admin: 7 lotes em série | certa | — (custo da rodada) | ordem dos lotes; 🟢 segunda conta |

## Perguntas

- 🔴 nada
- 🟡 "O bloco aparece sozinho no início" (cenário do PRD, CA-02.2): o plano assume que é sem ação da dona — a
  cliente que abre ou recarrega a Home depois do início vê o bloco. Não exige que a Home já aberta antes do
  início atualize sem recarregar
- 🟡 Teto de 12 peças (CA-03.3): se a busca já não deixar acrescentar a 13ª, dizendo o motivo e o 12, o TC-FUNC-007
  passa — a recusa ao salvar é a rede de baixo. Falha é a 13ª gravar, ou ficar fora sem motivo
- 🟡 Título acima de 60 (CA-01.6): a costura pede recusa "sem aparar". Campo que corta em silêncio no 60º
  caractere (sem dizer o motivo) é tratado como divergência do critério, não como passe
- 🟡 A linha do bloco (CA-02.3) e os avisos não têm texto literal na fonte: os casos conferem o **sentido** (qual
  campanha, qual estado, que não vai aparecer e o motivo — sem campanha, agendada, encerrada, desligada), não a
  frase exata
- 🟡 "A vaga fica vazia" (CA-04.2): o plano entende que a fileira mostra as outras peças escolhidas, na ordem, e
  nenhuma peça que a dona não escolheu ocupa o lugar — não exige um cartão em branco
- 🟡 Peça tirada da campanha (CA-04.2) na **linha** do bloco: a fonte só manda a linha contar as fora do ar
  (CA-04.1) e as que a campanha não barateia (CA-04.4). O plano não confere a peça tirada na linha — só na loja e
  no editor (CA-04.3)
- 🟡 A linha decide o estado pelo relógio do painel e a loja pelo do banco (tarefa 04): na virada, o CH-06 confere
  com 1 minuto de folga depois de T0 e de T0 + 10 antes de julgar divergência entre os dois
- 🟡 Prévia com sessão de admin (CA-06.1): o plano assume que a prévia do painel (iframe da loja `:8082`) usa a
  sessão que o browser tem na loja — por isso o CH-03 entra na loja antes de abrir a prévia
- 🟡 Design-check: o artifact informado não tem as telas do escopo (D-01). O CH-08 compara só os padrões adotados;
  as telas do bloco ficam "sem frame" e não geram diferença
- 🟡 Massa P-NB: o plano assume que "a campanha baixa o preço" se mede contra o "por" da peça (WI 102 I-02, D-06),
  e por isso pede à thread uma peça descartável com "de" R$ 200,00 / "por" R$ 120,00 marcada a 10 %
- 🟢 A frase da campanha já usada (CA-02.6) diz "a posição e o título desse bloco" — a fonte não diz o que ela
  mostra quando o outro bloco tem o título vazio (o nome da campanha? nada?). Neste plano B-1 sempre tem título,
  então o caso não aparece
- 🟢 Cliente logada sem papel de admin (conta de cliente) não é coberta pelo UC-06 nem por este plano: as policies
  dela são as públicas
- 🟢 Uma segunda conta com papel de admin (ex.: `admin-loja-2`) deixaria o CH-08 rodar ao lado de outro charter de
  painel e encurtaria a rodada em um lote
- 🟢 A dica do campo "nome" no cadastro de campanhas diz que o nome "aparece no título … do bloco de ofertas da
  Home" (protótipo, D-01): com o título configurável isso só vale quando o título está vazio. O cadastro é Fora
  deste WI — é sugestão de backlog
