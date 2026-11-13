```json
{
  "schema": "qa-plan/v1",
  "title": "Plano de QA — 102 · Campanhas de desconto: cadastro no painel, percentual por produto, a vitrine e o selo da campanha",
  "summary": {
    "total_cases": 33,
    "by_priority": { "P0": 9, "P1": 21, "P2": 3, "P3": 0 }
  },
  "acceptance_criteria_covered": 25,
  "strategy": [
    "Exploração por charter no browser real (agent-browser 0.39), uma persona por sessão, em 7 lotes ordenados pela massa (a campanha nasce no L1 e é encerrada no L6)",
    "E2E (Playwright) pedido à automação p/ os fluxos P0/P1 determinísticos de painel, loja e checkout",
    "Manual p/ medida de layout (390 · 1440 · fonte 200 %), conferência contra o protótipo do Claude Design, acessibilidade e performance percebida"
  ],
  "cases": [
    { "id": "TC-FUNC-001", "title": "A dona cadastra a Black Friday e a vê \"Em vigência\" na lista de campanhas", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-002", "title": "O cadastro da campanha recusa cada entrada inválida com o motivo, sem gravar", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-003", "title": "Na aba de preço da peça, a dona escolhe o percentual da campanha e vê o preço de cada variação", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-004", "title": "Peça em oferta aparece com o preço com desconto, o cheio riscado e a faixa da campanha no cartão e na página", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-005", "title": "A sacola e o checkout mostram o preço com desconto e o pedido gravado tem o mesmo total", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-006", "title": "Peça marcada numa campanha agendada continua com o preço de sempre e fora da vitrine", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-007", "title": "Cada variação aparece com o percentual sobre o próprio preço", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-008", "title": "Peça que já tinha \"de/por\" cobra o menor preço, nunca os dois descontos somados", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-009", "title": "Tirar a peça da campanha, desligar ou encerrar devolve o preço de sempre sem mudar o preço cadastrado", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-010", "title": "Tirar da campanha um percentual que peças usam é recusado com a contagem", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-011", "title": "A vitrine /ofertas reúne as peças da campanha com os filtros por percentual", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-012", "title": "Sem campanha em vigência, /ofertas diz que não há ofertas e o bloco da Home some", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-013", "title": "Uma campanha com outro nome mostra o texto e as cores dela no selo, na vitrine e na Home", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-014", "title": "O cupom desconta só a peça comum, e a loja e o pedido dão o mesmo total", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-015", "title": "Na sacola só com peças da campanha o cupom é recusado com o motivo, e o cupom de frete grátis continua valendo", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-016", "title": "A promoção por quantidade e o Compre Junto não descontam a peça de campanha", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-017", "title": "Quando a campanha acaba com o checkout aberto, a loja mostra o total novo e não cobra o valor antigo", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-018", "title": "O bloco \"Joias em oferta\" da Home leva à vitrine já filtrada pelo percentual", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-019", "title": "No pedido montado pela dona, a peça em oferta entra com o preço da campanha e o cupom não vale nela", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-020", "title": "Os filtros e a ordenação da vitrine usam o preço com desconto", "priority": "P2", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-021", "title": "A dona marca várias peças de uma vez e filtra a lista de produtos pela campanha", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-INT-001", "title": "O feed do Google traz o preço promocional e a vigência iguais aos da página", "priority": "P1", "type": "integration", "automation": { "target": "integration", "status": "missing" } },
    { "id": "TC-INT-002", "title": "O pedido guarda o preço cobrado, o cheio e a campanha, e encerrar a campanha não o muda", "priority": "P1", "type": "integration", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-UI-001", "title": "No cartão com cores, as miniaturas ficam acima da faixa e trocam a foto sem navegar", "priority": "P1", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-UI-002", "title": "O selo usa as duas cores da campanha cruzadas, como no protótipo", "priority": "P1", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-UI-003", "title": "O selo cabe inteiro nos cartões de 173 e 220 px no celular e no computador, também com fonte a 200 %", "priority": "P1", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-UI-004", "title": "As telas de campanhas do painel não rolam de lado no celular", "priority": "P1", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-UI-005", "title": "As telas da campanha conferem com o protótipo", "priority": "P2", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-JOURNEY-001", "title": "A cliente acha a joia em oferta pela Home no celular e chega à página com o preço da campanha", "priority": "P0", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-002", "title": "A cliente compra uma peça em oferta junto com uma comum, com cupom, até o pedido criado", "priority": "P0", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-003", "title": "A dona prepara a Black Friday do cadastro à vitrine no ar", "priority": "P0", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-CFR-001", "title": "O selo, os preços e os filtros da campanha são legíveis por teclado e leitor de tela", "priority": "P1", "type": "cfr", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-CFR-002", "title": "A Home e a vitrine com a campanha carregam sem deslocar o conteúdo", "priority": "P2", "type": "cfr", "automation": { "target": "manual", "status": "na" } }
  ]
}
```

# Plano de QA — 102 · Campanhas de desconto — cadastro no painel, percentual por produto, a vitrine e o selo da campanha

**Work Item:** 102 (feature) · **Escopo:** completo · **Foco:** —
**Versão do plano:** 2 · **Escrito em:** 2026-11-13 · **Revisado em:** 2026-11-13 (Q-01 respondida) · **Modo:** revisar
**Gate 1:** aprovado em 2026-11-13

## Resumo

- **Valor para o usuário:** a dona (Adri) cadastra uma campanha de desconto no painel — nome, vigência em horário
  de Brasília, percentuais e as cores do selo — e escolhe, peça por peça ou em lote, o percentual de cada joia.
  Durante a vigência, a cliente vê a peça com o preço já descontado, o preço cheio riscado e a faixa da campanha
  no cartão, na página do produto e na sacola; encontra as peças reunidas em `/ofertas` e num bloco da Home; e
  paga exatamente o que viu. No fim da vigência tudo volta sozinho, sem que nenhum preço cadastrado tenha mudado.
- **Maior risco para o usuário:** a cliente ver um preço e ser cobrada por outro — a loja, o servidor, o pedido
  montado e o Google discordando do centavo, um desconto somado a outro (cupom, "de/por", promoção, Compre Junto),
  ou a campanha acabando entre a sacola e o pagamento sem a loja avisar.
- **Contagens:** personas 4 · jornadas 6 · charters 8 (CFR 1 · design-check 1) · TC 33 (P0 9 · P1 21 · P2 3 · P3 0)
- **Automação:** e2e 25 (missing 25 · existing 0 · blocked 0) · integration 1 · manual 7

**Tamanho:** grande — 17 critérios de aceite (CA-01..CA-17) e 13 telas contadas nas fontes: painel (Campanhas
lista, nova, editar; aba de preço do produto; lista de produtos com edição em massa; Home do painel; montagem do
pedido), loja (Home com o bloco, cartão/listagem, página do produto, sacola, checkout, `/ofertas`) e o app do
ateliê (montar pedido), mais o feed do Google. Pela tabela de charters: 3–5 personas, 3–7 jornadas, até 6
exploratórios + cfr + design-check, até 35 TC. Este plano usa 4 · 6 · 6+1+1 · 33.

## Escopo

**Dentro:** UC-01..UC-07 do PRD e os critérios CA-01..CA-17; a máquina de estados da campanha (Agendada, Em
vigência, Encerrada, Desligada); o selo v2 (faixa no cartão, em linha na página e na sacola); `/ofertas` e o
redirect de `/black-friday`; o bloco "Joias em oferta" da Home; sacola, checkout e o pedido gravado com a
campanha; cupom, promoção progressiva e Compre Junto **só no recorte da peça de campanha** (RN-16, RN-17); o
pedido montado pelo painel e pelo app do ateliê; o feed do Google (pelo endereço local da function); o Desfazer
da edição em massa devolvendo as marcações de campanha (Q-01).

**Fora:** o que o PRD exclui (desconto por variação diferente do da peça, desconto em R$, campanha por categoria,
o perfil de cores do WI 100 e a faixa de avisos do WI 101); como cupom, promoção e Compre Junto funcionam em peças
comuns; o pagamento real (PIX e cartão não são concluídos no ambiente local — ver Estratégia); o `<head>` servido
pela Vercel e o cache de 5 minutos na virada (H-11); o sitemap servido (a função `api/page` não roda no servidor de
dev); a conferência do frete grátis por valor no servidor (H-07, pré-existente); o Merchant Center de verdade.

## Fontes

| Fonte      | Caminho                             | Uso                                        |
| ---------- | ----------------------------------- | ------------------------------------------ |
| PRD        | `.specs/work-items/102-desconto-de-campanha/prd.md` | critérios de aceite — a régua da cobertura |
| Costura    | `spec.md` (+ `tasks/01..09`, `implement-log.md`, `session-summary.md`) | o que o Dev entendeu, as decisões H-01..H-12 e I-01..I-11, e o que ficou fora |
| Fontes de design | `claude_design` · projeto `4abe021d-d77e-4fe7-affd-524180315fa3`: `Black Friday - Selo v2.html`, `Black Friday - Vitrine ofertas.html`, `Painel - Campanhas, faixa e perfil.html`, `Black Friday - Home.html` | telas existentes; charter `design-check` CH-07 |
| Insumos    | `item.md` › Insumos (código de cartão, preço, feed, edição em massa) | só para nomear superfícies; o explorer é caixa-preta |
| Validation | `qa-report.md` (Status PASS) | gate técnico; CA-11 e CA-15 só pela forma — a medida é desta QA |
| Projeto    | `.specs/project/PROJECT.md` + `CLAUDE.md` da raiz e de `apps/store`, `apps/backoffice`, `apps/mobile-adm`, `supabase`, `packages/core`, `DESIGN.md` | ambiente local, portas, regras de execução |
| Respostas  | página de perguntas, 2026-11-13 | Q-01 → (A) |

## Personas

Detalhe em [personas.md](personas.md).

| ID     | Nome    | Arquétipo                         | Objetivo                                                                 | Conta        | Jornadas               |
| ------ | ------- | --------------------------------- | ------------------------------------------------------------------------ | ------------ | ---------------------- |
| PER-01 | Adri    | usuário avançado (dona do ateliê) | pôr a Black Friday no ar, marcar as peças e encerrá-la sem mexer em preço | `admin-loja` | J-01, J-02, J-05, J-06 |
| PER-02 | Marina  | usuário mobile (primeira visita)  | achar uma joia afetiva em oferta pelo celular e entender quanto vai pagar | `anonima`    | J-03                   |
| PER-03 | Helena  | usuário ocasional                 | comprar duas peças, uma em oferta e uma comum, usando o cupom que recebeu | `anonima`    | J-04                   |
| PER-04 | Rosa    | usuário de tecnologia assistiva   | ler preço, desconto e selo com fonte grande e teclado, e chegar à compra  | `anonima`    | J-03, J-04 (no CFR)    |

**Não cobertas:** usuário em recuperação — o WI é feature nova, sem falha anterior a reencontrar; novo usuário no
painel — a única pessoa que administra é a dona, que usa o painel todo dia.

## Jornadas

| ID   | Jornada (pelo valor) | Persona principal · secundária | Prioridade | Abandono/erro | Cruza fronteira | Arquivo |
| ---- | -------------------- | ------------------------------ | ---------- | ------------- | --------------- | ------- |
| J-01 | Pôr a Black Friday no ar: cadastrar, marcar as peças e ligar o bloco da Home | PER-01 · — | P0 | J-01a, J-01b | não | [J-01](journeys/J-01-por-a-black-friday-no-ar.md) |
| J-02 | Preparar a próxima campanha marcando várias peças de uma vez | PER-01 · — | P1 | J-02a, J-02b | não | [J-02](journeys/J-02-preparar-a-proxima-campanha-em-lote.md) |
| J-03 | Achar a joia em oferta pelo celular e entender o preço | PER-02 · PER-04 | P0 | J-03a, J-03b | não | [J-03](journeys/J-03-achar-a-joia-em-oferta-pelo-celular.md) |
| J-04 | Comprar uma peça em oferta com cupom e pagar o que viu | PER-03 · PER-04 | P0 | J-04a, J-04b, J-04c | sim: edge functions `checkout` e `mercado-pago` |  [J-04](journeys/J-04-comprar-peca-em-oferta-com-cupom.md) |
| J-05 | Montar um pedido para uma cliente com uma peça em oferta | PER-01 · — | P1 | J-05a | sim: edge function `order-proposals`, app do ateliê | [J-05](journeys/J-05-montar-pedido-com-peca-em-oferta.md) |
| J-06 | Encerrar a Black Friday e ligar a campanha seguinte | PER-01 · PER-03 | P1 | J-06a, J-06b | sim: edge function `checkout` | [J-06](journeys/J-06-encerrar-e-ligar-a-proxima-campanha.md) |

## Charters

Ordem de execução — a Fase 2 despacha nesta ordem e, com o `agent-browser`, por **Lote**: no máximo 3 charters,
nunca dois da mesma conta ou da mesma massa, e o CFR sozinho, por último. Cada charter com no máximo um TC a cada
5 ações do time-box.

**Por que a ordem não é só "P0 primeiro":** a massa da rodada nasce e morre nos charters. O CH-01 cria a campanha
"Black Friday" em vigência e marca as peças do manifesto — todo charter da loja depende dela, então ele roda
sozinho no L1. O CH-06 encerra a Black Friday e liga "Dia das Mães" — por isso vem depois de tudo o que lê a Black
Friday, e o CFR roda sobre "Dia das Mães". Os charters de conta `admin-loja` não podem dividir lote, e o CH-02 roda sozinho (ele marca e desfaz uma peça na
Black Friday, e o CH-03 lê `/ofertas`: "na dúvida, lotes separados", decisão do Gate 1), o que leva a 7 lotes.

| Ordem | Lote | ID    | Missão | Persona | Conta | Massa | Driver | Tour | Time-box | Prioridade | TC | Arquivo |
| ----- | ---- | ----- | ------ | ------- | ----- | ----- | ------ | ---- | -------- | ---------- | -- | ------- |
| 1 | L1 | CH-01 | a dona põe a Black Friday no ar sozinha: cadastra, marca as quatro peças do manifesto e liga o bloco da Home | PER-01 | `admin-loja` | **cria** a campanha BF; **altera** as marcações de M-A, M-B, M-C, M-D; **cria** o bloco "Joias em oferta" | — | Feature | 60 min | P0 | TC-FUNC-001, TC-FUNC-003, TC-JOURNEY-003 | [CH-01](charters/CH-01-por-a-black-friday-no-ar.md) |
| 2 | L2 | CH-02 | nenhuma entrada errada no cadastro grava, a marcação em lote numa campanha agendada não vaza para a loja, e o Desfazer do lote devolve as marcações | PER-01 | `admin-loja` | **cria** a campanha agendada "Natal"; **altera** as marcações de M-G (inclusive uma peça marcada na BF e desfeita na hora, para o Desfazer); não edita a BF (tentativas recusadas) | — | Garbage | 60 min | P1 | TC-FUNC-002, TC-FUNC-010, TC-FUNC-021, TC-UI-004 | [CH-02](charters/CH-02-recusas-do-cadastro-e-edicao-em-massa.md) |
| 3 | L3 | CH-03 | quem chega pelo celular encontra as peças em oferta, entende o desconto e não estranha nada no cartão | PER-02 | `anonima` | só lê: a BF, M-A..M-D, o bloco da Home | — | Feature | 60 min | P0 | TC-FUNC-004, TC-FUNC-007, TC-FUNC-011, TC-FUNC-018, TC-FUNC-020, TC-UI-001, TC-JOURNEY-001 | [CH-03](charters/CH-03-achar-a-oferta-pelo-celular.md) |
| 4 | L4 | CH-04 | achar qualquer jeito de pagar diferente do que a tela mostra quando a sacola mistura oferta, peça comum e desconto | PER-03 | `anonima` | só lê a BF, M-A, M-C, M-E, M-E2, cupons, promoção e Compre Junto; **cria** pedidos de convidada | — | Money | 90 min | P0 | TC-FUNC-005, TC-FUNC-008, TC-FUNC-014, TC-FUNC-015, TC-FUNC-016, TC-JOURNEY-002 | [CH-04](charters/CH-04-sacola-e-checkout-com-oferta.md) |
| 5 | L4 | CH-05 | o pedido montado pela dona e o anúncio do Google cobram o mesmo centavo que a loja | PER-01 | `admin-loja` | só lê a BF, M-A, M-B, M-E; **cria** um pedido montado | — | Money | 60 min | P1 | TC-FUNC-019, TC-INT-001 | [CH-05](charters/CH-05-pedido-montado-e-feed.md) |
| 6 | L5 | CH-07 | design-check — Campanhas (lista, nova, editar), campo do produto, cartão, página, sacola, `/ofertas`, bloco da Home · Claude Design `4abe021d…` | PER-01 | `admin-loja` | só lê | — | — | 60 min | P1 | TC-UI-002, TC-UI-005 | [CH-07](charters/CH-07-design-check.md) |
| 7 | L6 | CH-06 | a campanha acaba (tirar, desligar, encerrar) sem cobrar o valor velho de ninguém, e a próxima entra sem código | PER-01 | `admin-loja` | **altera** a BF (desliga, religa, encerra); **altera** M-D; **cria** "Dia das Mães" e marca M-A, M-D | — | Multi-Tab | 90 min | P1 | TC-FUNC-006, TC-FUNC-009, TC-FUNC-012, TC-FUNC-013, TC-FUNC-017, TC-INT-002 | [CH-06](charters/CH-06-virada-de-campanha.md) |
| 8 | L7 | CH-08 | CFR — J-03 e J-04 sobre a campanha "Dia das Mães" | PER-04 | `anonima` | só lê; **cria** no máximo um pedido de convidada | — | — | 45 min | P1 | TC-UI-003, TC-CFR-001, TC-CFR-002 | [CH-08](charters/CH-08-cfr.md) |

## Ambiente da execução

O que vale para toda sessão da Fase 2 — vai no campo `ambiente` do briefing, porque o explorer e o retester
rodam sem as instruções do projeto.

- **App:** tudo a partir do worktree `/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102`
  - loja: `http://localhost:8092`
  - painel: `http://localhost:8093/admin` (login em `/admin/login`); Campanhas em `/admin/campanhas`
  - app do ateliê: `http://localhost:8094` (login em `/login`; montar pedido em `/pedidos/montar`)
  - **Portas da rodada 1 (corrigidas na Fase 2):** 8082/8083 estavam ocupadas pelos servidores do WI 101 (outra sessão, outro worktree, mesmo banco local); os apps do 102 sobem em **8092/8093/8094**. Qualquer `localhost:8082`/`8083`/`8084` num link é do WI 101, não deste
  - Supabase local: API `http://127.0.0.1:54441`; o feed do Google em
    `http://127.0.0.1:54441/functions/v1/google-feed`
- **Bloquear:** por rota, toda requisição a `*.supabase.co` (o banco local guarda `image_url` apontando para o
  Storage hospedado — a foto pode não aparecer; isso **não** é achado); o GA4 **por caminho**, `**/g/collect*`
  (nunca por domínio: o `gtag` envia para `analytics.google.com`). Em dev a loja não mede, mas nenhum hit pode sair
- **E-mail de dev:** Mailpit, `http://127.0.0.1:54444` — todo e-mail local cai ali (confirmação de pedido,
  código de login)
- **Viewport alvo:** celular primeiro — **390×844** antes de **1440×900**; conferir também com a **fonte a 200 %**
  (simular dobrando o tamanho da fonte da raiz da página, não o zoom da página inteira). Alvo de toque ≥ 44 px;
  nenhuma rolagem horizontal do corpo
- **Nunca:**
  - pagar de verdade, digitar número de cartão, ou tentar concluir um PIX — as functions locais rodam com chaves
    externas **inválidas** de propósito; a página de pagamento falhar ao gerar o PIX **não** é achado
  - enviar mensagem pelo WhatsApp (os links `wa.me` só se conferem pelo endereço, sem abrir a conversa)
  - aplicar migration em produção, `supabase db push --linked`, `supabase stop --all`, ou servir functions com o
    `.env` da raiz
  - abrir o Studio ou consultar o banco: a sessão é caixa-preta, pela tela
  - apagar produto, apagar campanha que tem pedido, ou editar o preço cadastrado de uma peça
  - mexer em campanha, peça ou bloco da Home fora do que a coluna **Massa** do seu charter permite
- **Uploads:** não há
- **Datas:** hoje é **2026-11-13**. A campanha "Black Friday" vale de **13/11/2026 00:00** a **30/11/2026 23:59**
  (horário de Brasília); "Natal" é **agendada**, de 01/12/2026 00:00 a 24/12/2026 23:59; "Dia das Mães" começa
  depois do encerramento da Black Friday e vai até 30/11/2026 23:59
- **Massa** (manifesto — a thread escolhe as peças no banco local antes do L1 e passa os nomes no briefing de cada
  charter; as peças precisam estar ativas e com estoque):

  | ID | O que é | Quem altera | Quem só lê |
  | -- | ------- | ----------- | ---------- |
  | M-A | peça com todas as variações no mesmo preço, sem "de" maior que o preço | CH-01 marca 20 % na BF · CH-06 marca 10 % na "Dia das Mães" | CH-03, CH-04, CH-05, CH-07, CH-08 |
  | M-B | peça com variações de preços diferentes, sem "de" | CH-01 marca 15 % na BF | CH-02 (contagem), CH-03, CH-05 |
  | M-C | peça com uma variação de "de" pouco acima do preço (diferença menor que 10 %, como "de" R$ 259,90 / por R$ 239,90) | CH-01 marca 10 % na BF | CH-03, CH-04 |
  | M-D | peça com 3 ou mais cores (miniaturas de cor no cartão) | CH-01 marca 20 % na BF · CH-06 tira da BF e marca na "Dia das Mães" | CH-03, CH-07 |
  | M-E, M-E2 | duas peças comuns, nunca marcadas, da mesma coleção de M-A | ninguém | CH-04, CH-05, CH-08 |
  | M-G | 3 a 5 peças de uma coleção, sem marcação na BF ao fim do CH-02 | CH-02 marca 15 % na "Natal" (em lote) e, para o Desfazer, marca uma delas na BF e desfaz na hora | CH-06 (confere na loja) |
  | Cupons | `QA10` (10 %, sem valor mínimo, sem limite de uso) e `QAFRETE` (frete grátis) | ninguém | CH-04, CH-05 |
  | Promoção | promoção progressiva ligada e vigente na coleção de M-A ("3 peças por R$ X") | ninguém | CH-04 |
  | Compre Junto | M-E com Compre Junto cujo adicional é M-A (peça de campanha) | ninguém | CH-04 |

  **Massa escolhida na Fase 2 (rodada 1)** — coleção `pulseiras-afetivas` (na loja, `/pulseiras-afetivas`; peça em `/produtos/<slug>`):

  | ID | Peça (slug) | Preço cadastrado |
  | -- | ----------- | ---------------- |
  | M-A | Pulseira Afetiva Lisa com Leite Materno em Prata 925 (`pulseira-afetiva-com-leite-materno-em-prata-925`) | R$ 385,00 nas 3 cores |
  | M-B | Pulseira Afetiva com Leite Materno em Prata 925 (`pulseira-afetiva-leite-materno-prata-925`) | R$ 383,00 a R$ 558,00, 12 variações |
  | M-C | Pulseira Afetiva Esferas com Leite Materno em Prata 925 (`pulseira-esferas-leite-materno-prata-925`) | de R$ 374,00 por R$ 349,90 |
  | M-D | Pulseira Afetiva Coração com Cinzas de Cremação em Prata 925 (`pulseira-afetiva-coracao-com-cinzas-de-cremacao-em-prata-925`) | R$ 340,00, 3 cores |
  | M-E | Pulseira Afetiva Oval com Leite Materno em Prata 925 (`pulseira-afetiva-oval-com-leite-materno-em-prata-925`) | R$ 340,00 |
  | M-E2 | Pulseira Afetiva Redonda com Coto Umbilical em Prata 925 (`pulseira-afetiva-redonda-com-coto-umbilical-em-prata-925`) | R$ 349,90 |
  | M-G | da coleção `colares-afetivos`: Colar Afetivo Pata com Cinzas de Cremação, Colar Afetivo Redonda com Leite Materno, Colar Afetivo Corações Gravatinha com Cinzas de Cremação, Colar Afetivo Um Círculo com Coto Umbilical (todos "em Prata 925") | — |
  | Cupons | `QA10` (10 %, sem mínimo, sem limite) e `QAFRETE` (frete grátis) — criados | — |
  | Promoção | "QA102 Progressiva Pulseiras": 3 peças ou mais da coleção `pulseiras-afetivas` ⇒ 10 % — criada | — |
  | Compre Junto | M-E com o adicional M-A — criado | — |
  | Feed do Google | interruptor ligado só no banco local para a rodada (estava desligado); restaurado ao fim | — |
  | Bloco "Joias em oferta" | o CH-01 não chegou a criá-lo (orçamento); criado pela thread antes do L2, ligado, no fim da Home (posição 16) — as 4 marcações e a campanha BF foram conferidas gravadas | — |
  | M-G na "Natal" | o CH-02 criou a "Natal" mas não chegou à edição em massa (orçamento); a thread marcou as 4 peças de M-G em 15 % na "Natal" direto no banco local antes do L3, para o CH-06 — a edição em massa, o Desfazer e TC-UI-004 ficam sem execução nesta rodada | — |

  **Estado da massa na rodada 2 (confirmação, 2026-11-13 ~17:30 de Brasília)** — o que a rodada 1 deixou no banco local:
  - "Black Friday": **encerrada** (o fim foi gravado às 16:17 de 13/11); as marcações M-A 20 %, M-B 15 % e M-C 10 % continuam gravadas, sem efeito de preço
  - "Dia das Mães": **em vigência** de 13/11/2026 16:20 a 30/11/2026 23:59, percentuais 10 % e 15 %; M-A 10 % e M-D 15 %
  - "Natal": **agendada** (01/12 a 24/12), percentuais 10 % e 15 %; as quatro peças de M-G a 15 % (marcadas pela thread na rodada 1)
  - Bloco "Joias em oferta" da Home: ligado
  - Pedidos #0603, #0604, #0605 e a proposta P-0045 da rodada 1, todos sem pagamento: são histórico, não massa
  - **Na rodada 2 a campanha vigente de referência é "Dia das Mães"** (onde os charters da rodada 1 diziam "Black Friday"). O CH-01 marca, pelo painel, **M-C com 10 %** e **M-B com 15 %** na "Dia das Mães" no L1; os charters seguintes e o reteste leem M-A, M-B, M-C e M-D na "Dia das Mães". O CH-02 só mexe na "Natal" (agendada, sem efeito na loja) e nunca na "Dia das Mães"
  - O feed do Google está ligado só no banco local durante a rodada 2 (restaurado ao fim)
  - Screenshots da rodada 2 levam `-r2-` no nome (`screenshots/CH-NN-r2-NN-*.png`, `screenshots/retest-r2-*.png`) — as da rodada 1 ficam como estão

  **Estado da massa na rodada 3 (confirmação, 2026-11-13 à noite, depois das fix tasks 16–19)** — conferido no banco local antes do L1:
  - "Black Friday" **encerrada**; "Dia das Mães" **em vigência** até 30/11/2026 23:59 com M-A 10 %, M-B 15 %, M-C 10 % e M-D 15 %; "Natal" **agendada** com as quatro peças de M-G a 15 %
  - Bloco "Joias em oferta" ligado; cupons `QA10` e `QAFRETE` ativos; promoção "QA102 Progressiva Pulseiras" e o Compre Junto M-E → M-A como na rodada 1
  - Preço esperado de M-C na "Dia das Mães" depois da T17: os 10 % sobre o "de" (R$ 374,00) ⇒ **R$ 336,60**, mostrado contra o "de" R$ 374,00
  - Pedidos #0603–#0608 e a proposta P-0045 são histórico das rodadas 1 e 2, não massa. Pedido novo da rodada 3 nasce de compra nova
  - O CH-02 só mexe na "Natal" (e no Desfazer do lote), nunca na "Dia das Mães"; nenhum charter edita preço cadastrado
  - O feed do Google está ligado só no banco local durante a rodada 3 (restaurado ao fim)
  - Screenshots da rodada 3 levam `-r3-` no nome (`screenshots/CH-NN-r3-NN-*.png`, `screenshots/retest-r3-*.png`)

  **Preparação da Fase 2, antes do L1** (thread principal, com a conta `admin-loja`): os cupons, a promoção e o
  Compre Junto acima, se não existirem; e nenhuma campanha no banco local (o probe 05 da Validation limpa as dele).
  A campanha BF e as marcações **não** são preparadas: nascem no CH-01. Se o CH-01 não conseguir criá-las, a
  thread as cria pelo painel antes do L2 e registra isso.
- **Pré-condições do ambiente** (preparação, não das sessões): o worktree não tem `apps/*/.env` (gitignored) —
  criar com `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` do Supabase local; `supabase status` de pé
  (portas 54440–54449); as migrations `20261130120000`, `20261130130000` e `20261130140000` aplicadas **só no
  local**; as functions `checkout`, `mercado-pago`, `order-proposals`, `google-feed` e `send-notification`
  servidas do worktree com `supabase functions serve --env-file <arquivo com chaves externas inválidas>`; `pnpm dev`
  na raiz do worktree (rodada 1: Vite em 8092, 8093, 8094 com as variáveis na linha de comando, sem `.env`).

## Estratégia

- **Como se exercitam as jornadas:** um charter por área de risco, uma persona por sessão, no browser real
  (`agent-browser`); os `TC-*` são conferidos dentro do charter que os cita
- **CFR:** acessibilidade (o selo tem nome para leitor de tela, "De R$" no preço riscado, chips com estado
  pressionado, fonte a 200 %), compatibilidade (390 · 1440 · fonte 200 %, cartões de 173 e 220 px — CA-15),
  performance percebida (o bloco da Home e a vitrine aparecendo sem deslocar o conteúdo — a Validation deixou o
  CLS para esta QA, I-10), recuperação de erro (o 422 da campanha que acabou) e usabilidade (tom memorial, RN-14).
  Tema escuro fica fora: a loja não tem tema escuro
- **Conferência visual:** Campanhas (lista, nova, editar), campo da campanha no produto, cartão com a faixa (173 e
  220 px, com e sem miniaturas), selo em linha na página e na sacola, `/ofertas` (com e sem campanha) e o bloco
  "Joias em oferta" contra o Claude Design (CH-07). PRD prevalece sobre o protótipo nas divergências já resolvidas
  em H-09 (cores e texto do selo vêm da campanha; selos do canto saem só na peça de campanha)
- **Onde termina o simulado:**
  - pagamento: o pedido nasce pelo `create-order` (servidor de verdade, local); o PIX e o cartão não se concluem,
    porque o Mercado Pago está com chave inválida. "O servidor cobra R$ X" se confere pelo total do pedido gravado
    (`/pedido/:id` da loja e `/admin/pedidos/:id`), não por uma cobrança. D-05 (PIX gerado na vigência e pago
    depois do fim) foi provado pelo probe 05 da Validation e não se refaz aqui
  - feed do Google: lido pelo endereço local da function, não pelo Merchant Center
  - indexação de `/ofertas`: confere-se o `noindex` que a página põe na própria cabeça; o HTML servido pela Vercel
    e o sitemap não rodam no servidor de dev (provados na Validation por `servePage` e pelo teste do sitemap)
  - leitor de tela real e Android real ficam fora: acessibilidade pela árvore de acessibilidade e pelo teclado
- **Automação:** 25 casos `e2e` + `missing` ficam como pedido de automação E2E; 1 `integration` (o feed) fica com
  o Dev; `blocked`: nenhum

### Suíte smoke

| Ordem | TC | Jornada | O que prova |
| ----- | -- | ------- | ----------- |
| 1 | TC-FUNC-001 | J-01 | a campanha se cadastra e aparece "Em vigência" |
| 2 | TC-JOURNEY-001 | J-03 | a cliente chega da Home à página da peça com o preço da campanha |
| 3 | TC-JOURNEY-002 | J-04 | a sacola com oferta chega ao pedido criado com o total que a tela mostrou |

## Critérios de entrada

- [ ] Validation do Dev com `Status: PASS` no `qa-report.md` — sim, 2026-11-13
- [ ] App do branch `feature/102` rodando a partir do worktree, com os `.env` dos apps criados
- [ ] Supabase local de pé, as três migrations do WI aplicadas no local e as cinco functions servidas com chaves
      externas inválidas
- [ ] Credencial da conta `admin-loja` — `QA_ADMIN_LOJA_USUARIO` / `QA_ADMIN_LOJA_SENHA` (a thread diz onde está;
      nunca o valor)
- [ ] Massa do manifesto escolhida e nomeada (M-A..M-G), cupons, promoção e Compre Junto prontos; nenhuma
      campanha no banco local antes do L1
- [ ] Driver de browser disponível — `agent-browser` 0.39.1 (fallback `playwright-cli` 0.1.24)
- [ ] MCP do Claude Design acessível para o CH-07 (o projeto avulso sai do ar até 2026-12-14)

## Critérios de saída

- **`pass`** — toda jornada `P0` chega ao objetivo, nenhum bug `critical`/`high` aberto, todos os charters rodaram
- **`partial`** — caso `P0`/`P1` `blocked` ou charter que não rodou
- **`fail`** — caso `P0` falhou, ou bug `critical`/`high` aberto
- Todo caso `e2e` + `missing` com o pedido de automação registrado

## Cobertura

Os critérios sem ID na fonte foram numerados `R-nn` aqui, na ordem em que aparecem no PRD.

| Critério | Fonte | Resumo do critério | TC |
| -------- | ----- | ------------------ | -- |
| CA-01 | prd | cadastrar BF 13/11–30/11, 10/15/20, ligada ⇒ "Em vigência"; o produto mostra "Black Friday: Nenhum · 10% · 15% · 20%" | TC-FUNC-001, TC-FUNC-003, TC-JOURNEY-003 |
| CA-02 | prd | recusas do cadastro com o motivo, nada gravado | TC-FUNC-002 |
| CA-03 | prd | 20 % em R$ 209,90 ⇒ R$ 167,92 com riscado e selo no cartão, página, sacola, checkout e no servidor | TC-FUNC-004, TC-FUNC-005, TC-JOURNEY-001, TC-JOURNEY-002 |
| CA-04 | prd | antes do início e depois do fim: preço de sempre, sem selo, fora da vitrine | TC-FUNC-006, TC-FUNC-009 |
| CA-05 | prd | cada variação com o percentual sobre o próprio preço | TC-FUNC-003, TC-FUNC-007 |
| CA-06 | prd | "de" R$ 259,90 / por R$ 239,90 com 10 % cobra R$ 233,91, nunca R$ 215,91 | TC-FUNC-003, TC-FUNC-008 |
| CA-07 | prd | tirar da campanha ou encerrar devolve o preço de sempre; preço cadastrado intacto | TC-FUNC-009 |
| CA-08 | prd | tirar percentual em uso é recusado com a contagem | TC-FUNC-010 |
| CA-09 | prd | a vitrine lista as peças da campanha com chips e contagem; sem campanha diz que não há ofertas e tem `noindex` | TC-FUNC-011, TC-FUNC-012 |
| CA-10 | prd | o feed traz `sale_price` = preço da página e `sale_price_effective_date` = vigência | TC-INT-001 |
| CA-11 | prd | miniaturas de cor acima da faixa, sem sobrepor; tocar troca a foto sem navegar | TC-UI-001 |
| CA-12 | prd | outra campanha ("Dia das Mães") mostra o texto dela no selo, na vitrine e na Home | TC-FUNC-013 |
| CA-13 | prd | o pedido guarda cobrado, cheio, campanha e percentual; encerrar depois não o muda | TC-INT-002, TC-FUNC-005 |
| CA-14 | prd | o selo usa as duas cores cruzadas; par abaixo de 4,5:1 recusado com a razão; padrão preto e ouro | TC-FUNC-002, TC-UI-002 |
| CA-15 | prd | 390×844 e 1440×900: selo inteiro em 173 e 220 px, fonte 200 %, sem rolagem; painel em 390 sem rolagem lateral | TC-UI-003, TC-UI-004 |
| CA-16 | prd | cupom só na peça comum, mesmo total na loja e no servidor; só campanha ⇒ cupom recusado; frete grátis e PIX valem | TC-FUNC-014, TC-FUNC-015 |
| CA-17 | prd | promoção progressiva e Compre Junto não contam a peça de campanha, na sacola e no servidor | TC-FUNC-016 |
| R-01 — PRD UC-04 | prd | marcar várias pela edição em massa, filtro da lista pela campanha e percentual, "Ver as peças"; o Desfazer devolve também as marcações (Q-01 (A)) | TC-FUNC-021 |
| R-02 — PRD UC-05 | prd | a campanha acaba com a cliente na sacola/checkout: total novo, nova confirmação, nunca cobra mais | TC-FUNC-017 |
| R-03 — PRD UC-06 | prd | `/black-friday` leva a `/ofertas` | TC-FUNC-011 |
| R-04 — PRD UC-07 | prd | o bloco da Home: um cartão por percentual levando à vitrine filtrada; sem campanha não aparece | TC-FUNC-018, TC-FUNC-012 |
| R-05 — PRD RN-04 | prd | pedido montado (painel e app): peça marcada com o preço da campanha, cupom não vale nela | TC-FUNC-019 |
| R-06 — PRD RN-10 | prd | "Com desconto", faixa de preço e ordenação pelo preço com desconto | TC-FUNC-020 |
| R-07 — PRD RN-13 | prd | peça de campanha mostra só a faixa; os selos do canto (desconto, Novo, Últimas, Destaque) não aparecem nela | TC-FUNC-004 |
| R-08 — PRD Vocabulário / UC-01 | prd | campanha desligada não vale na loja mesmo dentro da vigência; religada volta a valer | TC-FUNC-009 |

**Sem cobertura:** nada. Duas metades ficam só com a prova da Validation, e estão nos 🟡: "não entra no sitemap"
(CA-09) e "o servidor cobra" depois do pagamento (CA-03, CA-04), porque o sitemap servido e a cobrança não rodam
no ambiente local.

## Riscos

| Risco (para o usuário) | Probabilidade | Impacto na persona | Mitigação no plano |
| ---------------------- | ------------- | ------------------ | ------------------ |
| a cliente vê um preço no cartão ou na sacola e o pedido grava outro | média | abala confiança | TC-FUNC-005, TC-FUNC-014, TC-JOURNEY-002 (CH-04) |
| desconto de campanha somado com cupom, "de/por", promoção ou Compre Junto | média | perde dado (dinheiro da dona) | TC-FUNC-008, TC-FUNC-014..016 (CH-04) |
| a campanha acaba com o checkout aberto e a loja não avisa | média | abala confiança | TC-FUNC-017 (CH-06) |
| a faixa corta o percentual no cartão de 173 px ou com fonte grande | média | fricção | TC-UI-003 (CH-08), TC-UI-001 (CH-03) |
| a dona marca o percentual errado em lote e o Desfazer não devolve as marcações de campanha | média | fricção | TC-FUNC-021, variações "Desfazer" (CH-02); Q-01 respondida (A) |
| encerrar a campanha muda um pedido já feito | baixa | perde dado | TC-INT-002 (CH-06) |
| o anúncio do Google com preço diferente da página | baixa | abala confiança | TC-INT-001 (CH-05) |
| texto de urgência ou festivo numa loja memorial | baixa | abala confiança | CH-07, CH-08 (tom, RN-14) |
| a massa é única e sequencial: um CH-01 falho deixa os lotes da loja sem campanha | média | — (rodada) | Preparação: a thread cria a BF pelo painel antes do L2 |

## Perguntas

- ✅ **Q-01** (respondida em 2026-11-13, pela página) O "Desfazer" da edição em massa tem de devolver as marcações
  de campanha? — Critério R-01 (PRD UC-04). **Resposta: (A) sim, o Desfazer devolve também as marcações.**
  Aplicado: TC-FUNC-021 ganhou duas variações "Desfazer" (as peças voltam ao percentual que tinham, ou a sem
  campanha), conferidas na lista do painel e, para a Black Friday, na loja (preço, faixa e `/ofertas`); o
  comportamento registrado na implementação (desfazer só os campos do produto) passa a ser bug. CH-02 atualizado.
- 🟡 Para ver o Desfazer na loja, a campanha precisa estar em vigência: o CH-02 marca **uma** peça de M-G na Black
  Friday e desfaz na hora. O CH-02 roda sozinho no L2 (decisão do Gate 1), então nenhum outro charter vê a oscilação;
  uma peça de M-G que **fique** em `/ofertas` é o bug do Desfazer, registrado pelo CH-02.
- 🟡 Peça de R$ 209,90 do CA-03 pode não existir no banco local: os casos esperam o valor pela regra de RN-06
  (percentual sobre o preço, arredondado ao centavo, meio centavo para cima, por unidade) sobre o preço real da
  peça do manifesto, e citam o exemplo do PRD quando a peça existir.
- 🟡 "Não entra no sitemap" (CA-09) e o HTML servido com `noindex` não rodam no servidor de dev; a QA confere o
  `noindex` que a página põe na própria cabeça e deixa o sitemap com a prova da Validation.
- 🟡 "O servidor cobra" (CA-03, CA-04, CA-16) é conferido pelo total do pedido gravado pelo `create-order`; o
  pagamento não se conclui no local. A página de pagamento falhando ao gerar o PIX não é achado.
- 🟡 "Ver todas" do bloco "Joias em oferta" deve existir também no celular (o design o desenha sem restrição de
  largura; a sessão de implementação registrou que hoje ele só aparece a partir de 768 px) — a QA confere e, se
  faltar, é achado.
- 🟡 Fonte a 200 % é simulada dobrando o tamanho da fonte da raiz da página; a fonte do sistema de um Android
  real fica fora.
- 🟡 O botão "Ver as coleções" do estado vazio de `/ofertas` leva à Home (`/`), onde as coleções estão; o plano
  aceita esse destino (o design não o fixa).
- 🟡 O CLS do bloco da Home não tem alvo no PRD; o plano usa as metas de performance percebida do guia de CFR.
- 🟢 Peça marcada cujo "de/por" já é menor que o preço com a campanha continua comum, sem selo e fora da vitrine
  (I-02) — a dona pode estranhar marcar 10 % e não ver a peça na vitrine; vale ver se o cartão da campanha no
  produto explica isso.
- 🟢 A virada de 5 minutos do HTML servido (H-11) e o Merchant Center na virada não se medem localmente.
- 🟢 PIX gerado na vigência e pago depois do fim (D-05) foi provado só pelo probe 05 da Validation.
