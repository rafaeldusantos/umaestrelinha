```json
{
  "schema": "qa-plan/v1",
  "title": "Plano de QA — O pagamento que falhou: pagar de novo na loja, e o pago por fora registrado no painel",
  "summary": {
    "total_cases": 48,
    "by_priority": { "P0": 6, "P1": 36, "P2": 6, "P3": 0 }
  },
  "acceptance_criteria_covered": 55,
  "strategy": [
    "Exploração por charter no browser real (Playwright MCP ou playwright-cli), uma persona por sessão, 390x844 antes de 1440",
    "E2E (Playwright) pedido à automação p/ fluxos P0/P1 determinísticos da loja, do painel e do app do ateliê",
    "Integração (Dev/thread) p/ o que depende do Mercado Pago, do job agendado e do Mailpit",
    "Manual p/ layout no celular, fonte 130/200 %, tom memorial e acessibilidade"
  ],
  "cases": [
    { "id": "TC-JOURNEY-001", "title": "Adri registra pelo celular um pagamento feito por fora, com foto do comprovante, e vê o pedido pago", "priority": "P0", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-002", "title": "Cliente abre o link de cartão no celular, sem login, e chega ao pagamento do mesmo pedido pelo valor da compra", "priority": "P0", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-003", "title": "Cliente com PIX vencido gera um código novo pela conta e chega ao pagamento do mesmo pedido", "priority": "P1", "type": "journey", "automation": { "target": "integration", "status": "missing" } },
    { "id": "TC-FUNC-001", "title": "\"Registrar pagamento\" aparece só em pedido não pago e não cancelado", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-002", "title": "Registrar sem preencher nada é aceito; o meio sai de uma lista fixa de cinco; a data e a hora já vêm com agora, no horário de Brasília", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-003", "title": "Data do pagamento no futuro ou anterior ao pedido é recusada com o motivo", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-004", "title": "Comprovante fora da regra (tipo, tamanho, mais de três) é recusado antes de gravar, com o motivo", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-005", "title": "Confirmar o registro duas vezes não registra nem baixa nada duas vezes", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-006", "title": "Formulário aberto quando o pedido é pago em outra aba diz isso e não grava", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-007", "title": "Bloco Pagamento mostra meio pelo nome, data, quem registrou, observação e comprovantes, e o histórico registra o gesto", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-008", "title": "Desfazer com motivo devolve o pedido a Pendente, sem e-mail, e guarda observação e comprovantes no histórico", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-009", "title": "\"Desfazer\" só aparece com o pedido em Pago e só em pagamento registrado à mão", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-010", "title": "\"Avançar mesmo assim\" e \"Outro status\" levam um pedido não pago à tela de registrar", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-011", "title": "\"Avançar status\" em lote deixa de fora os pedidos não pagos e diz quantos ficaram", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-012", "title": "Pedido avançado à mão sem pagamento mostra \"Pagamento não registrado\" com a ação de registrar", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-013", "title": "Bloco Pagamento avisa \"Pago duas vezes\" e \"Pago depois de cancelado\"", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-014", "title": "\"Gerar link de cartão\" aparece só em pedido de cartão não pago e não cancelado", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-015", "title": "Adri gera o link de cartão e o copia para mandar pelo WhatsApp", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-016", "title": "Link de cartão substituído por um novo deixa de abrir o pagamento", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-017", "title": "Link de cartão aberto com o pedido pago ou cancelado mostra a situação e não oferece pagar", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-018", "title": "Pedido PIX pendente oferece \"Pagar com PIX\"; vencido nos 7 dias oferece \"Gerar novo PIX\" com a data-limite", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-019", "title": "Cartão recusado ou sem resposta mostra o convite para falar pelo WhatsApp, sem oferecer outro pagamento", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-020", "title": "Pedido de cartão nunca cobrado não aparece nas pendências da conta", "priority": "P2", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-021", "title": "Pedido cancelado não oferece pagamento em nenhuma tela da cliente", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-022", "title": "Pedido pago por fora aparece pago para a cliente, com o meio informado e o mesmo total, sem observação nem comprovante", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-023", "title": "Pedido avançado à mão sem pagamento não oferece à cliente pagar de novo", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-024", "title": "Pedido cancelado por falta de pagamento diz a razão e oferece o WhatsApp no pedido e na conta", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-025", "title": "O e-mail \"cancelado por falta de pagamento\" aparece em Notificações, desligado", "priority": "P2", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-026", "title": "App do ateliê mostra o pagamento registrado à mão, sem comprovante e sem ação de registrar", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-027", "title": "Os textos novos para a cliente não têm urgência, exclamação nem emoji", "priority": "P1", "type": "functional", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-SEC-001", "title": "Comprovante só abre para quem é admin, e o link dele expira", "priority": "P0", "type": "security", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-SEC-002", "title": "Link de cartão adulterado ou incompleto não mostra o pedido, e o código some da barra de endereço", "priority": "P1", "type": "security", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-SEC-003", "title": "O servidor recusa cobrar pedido cancelado ou já pago", "priority": "P0", "type": "security", "automation": { "target": "integration", "status": "missing" } },
    { "id": "TC-INT-001", "title": "E-mail à cliente ao registrar segue a escolha do portão, e a dona não recebe o aviso interno", "priority": "P1", "type": "integration", "automation": { "target": "integration", "status": "missing" } },
    { "id": "TC-INT-002", "title": "Pedido registrado entra na venda do Dashboard e da Início pela data informada, e sai ao desfazer", "priority": "P1", "type": "integration", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-INT-003", "title": "Estoque e uso do cupom baixam uma vez ao registrar e voltam ao desfazer", "priority": "P1", "type": "integration", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-INT-004", "title": "Cancelar pelo painel fecha a cobrança aberta, mantém a escolha do aviso e não manda o e-mail de falta de pagamento", "priority": "P1", "type": "integration", "automation": { "target": "integration", "status": "missing" } },
    { "id": "TC-INT-005", "title": "Pagamento aprovado pelo link de cartão tem o mesmo efeito de um pagamento no checkout", "priority": "P0", "type": "integration", "automation": { "target": "integration", "status": "missing" } },
    { "id": "TC-INT-006", "title": "Pagar de novo cobra o valor da primeira cobrança; pedido montado cobra o da proposta", "priority": "P1", "type": "integration", "automation": { "target": "integration", "status": "missing" } },
    { "id": "TC-INT-007", "title": "Código PIX novo, registro à mão e cancelamento fecham a cobrança anterior no meio de pagamento", "priority": "P1", "type": "integration", "automation": { "target": "integration", "status": "missing" } },
    { "id": "TC-INT-008", "title": "O cancelamento automático alcança só o pedido pendente não pago de 7 dias, recomeça no desfazer e não é adiado pelo link", "priority": "P1", "type": "integration", "automation": { "target": "integration", "status": "missing" } },
    { "id": "TC-INT-009", "title": "O e-mail \"cancelado por falta de pagamento\" sai só no cancelamento automático, quando ligado", "priority": "P1", "type": "integration", "automation": { "target": "integration", "status": "missing" } },
    { "id": "TC-UI-001", "title": "Tela \"Registrar pagamento\" no celular: sem rolagem lateral, alvos de 44 px, câmera e galeria", "priority": "P1", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-UI-002", "title": "Telas novas da cliente cabem em 390 px, inclusive com a fonte a 130 % e 200 %", "priority": "P2", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-REG-001", "title": "Pedido já pago avança de status como antes, sem pedir registro", "priority": "P1", "type": "regression", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-CFR-001", "title": "Registrar e desfazer dão retorno, explicam a falha e preservam o que foi digitado", "priority": "P2", "type": "cfr", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-CFR-002", "title": "Registrar e desfazer funcionam só pelo teclado, com rótulos e recusas anunciados", "priority": "P2", "type": "cfr", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-CFR-003", "title": "Formulário e bloco Pagamento se sustentam com a fonte a 130/200 % e em 1440", "priority": "P2", "type": "cfr", "automation": { "target": "manual", "status": "na" } }
  ]
}
```

# Plano de QA — 98 · O pagamento que falhou: pagar de novo na loja, e o pago por fora registrado no painel

**Work Item:** 98 (feature) · **Escopo:** completo · **Foco:** tela "Registrar pagamento" do painel (390 e 1440, câmera/galeria, comprovantes, recusas); bloco Pagamento (selos, desfazer, link de cartão); `/pagar-com-cartao`; `/pedido/:id` e `/conta` (informativo do cartão, avançado à mão sem oferta, cancelado por falta de pagamento, meio informado); app do ateliê (registro manual no detalhe)
**Versão do plano:** 1 · **Escrito em:** 2026-11-10 · **Modo:** criar
**Gate 1:** aprovado em 2026-11-10 (sob o pedido do humano de orquestrar até o QA sem parar)

## Resumo

- **Valor para o usuário:** quando o PIX vence ou o cartão é recusado, a cliente encontra no pedido o
  caminho certo — gerar um PIX novo, ou falar com a Adri pelo WhatsApp —, e pode pagar o mesmo pedido
  com outro cartão por um link que a Adri manda, sem refazer a compra nem entrar na conta. Quando a
  cliente paga por fora, a Adri registra no painel (pelo celular, com a foto do comprovante) e o pedido
  passa a se comportar como pago em todo lugar: selo da cliente, venda do Dashboard, estoque, cupom,
  e-mail e app do ateliê. Um pedido que ninguém pagou é cancelado sozinho em 7 dias, e a cliente sabe
  por quê.
- **Maior risco para o usuário:** dinheiro que entra duas vezes ou não conta — o registro à mão que
  repete estoque e cupom, o link antigo que ainda cobra, o pedido cancelado que ainda aceita pagamento —,
  e o comprovante (dado financeiro e pessoal) aberto para quem não é admin.
- **Contagens:** personas 4 · jornadas 7 · charters 7 (CFR 1 · design-check 0) · TC 48 (P0 6 · P1 36 · P2 6 · P3 0)
- **Automação:** e2e 33 (missing 33 · existing 0 · blocked 0) · integration 9 · manual 6

## Escopo

**Dentro:** UC-01 (pagar de novo um PIX), UC-02 (cartão não concluído: o informativo), UC-03 (registrar e
desfazer no painel, os caminhos até Pago, o lote), UC-04 (conferir o registro), UC-05 (link de cartão do
painel e a tela `/pagar-com-cartao`), UC-06 (cancelamento automático, o que a cliente vê e o e-mail); os
RNF-01, 03, 04, 06, 08 e 09. Superfícies: `/admin/pedidos/:id` (bloco Pagamento, próximo passo, "Outro
status", histórico), `/admin/pedidos/:id/pagamento` (tela nova), `/admin/pedidos` (lote "Avançar
status"), Dashboard (venda), `/admin/configuracoes/notificacoes` (evento novo); loja `/pedido/:id`,
`/conta`, `/pedido/:id/pagamento` (só a oferta), `/pagar-com-cartao`; app do ateliê `/pedidos/:id` e
Início (venda).

**Fora:** o que a costura exclui — estorno e reembolso pelo painel, conciliação com o extrato, registrar
pelo app do ateliê. O checkout da primeira compra (a mudança só toca a cobrança de novo), o cancelamento
pela admin além de "fecha a cobrança e não manda o e-mail novo", o resto das telas do pedido que a mudança
não toca. O Brick real do Mercado Pago e a cobrança real não estão no ambiente (chaves externas
inválidas): o que depende deles é integração e, na execução, fica `blocked` — não é bug. Leitor de tela
real (VoiceOver/TalkBack) e Android/iPhone real ficam fora; a câmera é conferida pelo `accept` do campo e
pelo seletor do sistema, não por uma foto tirada.

## Fontes

| Fonte      | Caminho                             | Uso                                        |
| ---------- | ----------------------------------- | ------------------------------------------ |
| PRD        | `.specs/work-items/98-pagamento-que-falhou/prd.md` (r1 + handoff) | critérios de aceite — a régua da cobertura |
| Costura    | `.specs/work-items/98-pagamento-que-falhou/spec.md` | o que o Dev entendeu (Decisões 1–24) e o que ficou fora |
| Fontes de design | `ausente` — decisão do humano: seguir sem design; as telas seguem o desenho da loja e do painel | sem charter `design-check` |
| Insumos    | `ausente` (`item.md` › Insumos vazio) | —                               |
| Validation | `qa-report.md` (rodada 2, PASS, 57/58; RNF-04 deixado ao QA) | gate técnico antes da execução; probes 01–10 dizem o que já foi provado contra o banco |
| Projeto    | `.specs/project/PROJECT.md`; `CLAUDE.md` (mobile primeiro, tom memorial); `tasks/01..09` (rotas e textos) | ambiente e comandos |

## Personas

Detalhe em [personas.md](personas.md).

| ID     | Nome   | Arquétipo   | Objetivo    | Conta                      | Jornadas   |
| ------ | ------ | ----------- | ----------- | -------------------------- | ---------- |
| PER-01 | Adri no celular | usuário mobile | registrar, de onde estiver, o PIX que a cliente mandou direto, com a foto do comprovante | `admin` | J-01, J-07 (e J-06, secundária) |
| PER-02 | Adri no computador | usuário avançado | conferir, corrigir e destravar pedidos de pagamento falho, em várias abas e em lote | `admin` | J-02, J-03, J-04 (gera o link) |
| PER-03 | Cliente que voltou ao pedido | usuário em recuperação | pagar o pedido que falhou, ou saber o que aconteceu com ele | `cliente` | J-05, J-06 |
| PER-04 | Cliente que recebeu o link pelo WhatsApp | novo usuário | pagar com outro cartão o pedido que a Adri mandou, sem conta | `anonima` | J-04 |

**Não cobertas:** usuário de tecnologia assistiva como persona própria — a tela nova é de uso da dona;
a checagem de teclado e de nomes acessíveis vai no CFR (TC-CFR-002), sem leitor de tela real. Usuário
ocasional — a dona usa o painel todo dia; a cliente que volta de vez em quando é a PER-03.

## Jornadas

| ID   | Jornada (pelo valor) | Persona principal · secundária | Prioridade | Abandono/erro | Cruza fronteira      | Arquivo                         |
| ---- | -------------------- | ------------------------------ | ---------- | ------------- | -------------------- | ------------------------------- |
| J-01 | Registrar pelo celular o pagamento que a cliente fez por fora, com o comprovante | PER-01 · — | P0 | J-01a, J-01b, J-01c, J-01d | sim: Storage privado, motor de e-mail, Mercado Pago (fechar cobrança) | [J-01](journeys/J-01-registrar-pagamento-no-celular.md) |
| J-02 | Conferir um pagamento registrado e desfazer o que foi registrado por engano | PER-02 · PER-01 | P1 | J-02a, J-02b, J-02c | sim: Storage (URL assinada) | [J-02](journeys/J-02-conferir-e-desfazer-registro.md) |
| J-03 | Destravar pedidos não pagos sem marcá-los como pagos por engano | PER-02 · — | P1 | J-03a, J-03b | não | [J-03](journeys/J-03-levar-nao-pago-a-pago.md) |
| J-04 | Receber o link de cartão e pagar o mesmo pedido com outro cartão | PER-04 · PER-02 | P0 | J-04a, J-04b, J-04c | sim: Mercado Pago (Brick, cobrança) | [J-04](journeys/J-04-pagar-pelo-link-de-cartao.md) |
| J-05 | Voltar ao pedido que falhou e encontrar o caminho para pagar ou falar com a loja | PER-03 · — | P1 | J-05a, J-05b | sim: Mercado Pago (PIX novo) | [J-05](journeys/J-05-cliente-paga-de-novo-ou-fala-com-a-loja.md) |
| J-06 | Entender que o pedido foi cancelado por falta de pagamento e retomar com a Adri | PER-03 · PER-01 | P1 | J-06a | sim: job agendado, motor de e-mail, Mercado Pago | [J-06](journeys/J-06-cancelado-por-falta-de-pagamento.md) |
| J-07 | Ver no app do ateliê que o pagamento foi registrado à mão | PER-01 · — | P2 | J-07a | não | [J-07](journeys/J-07-ver-registro-no-app-do-atelie.md) |

## Charters

Ordem de execução — a Fase 2 despacha nesta sequência.

| Ordem | ID    | Missão                               | Persona   | Tour   | Time-box | Prioridade | TC             | Arquivo                           |
| ----- | ----- | ------------------------------------ | --------- | ------ | -------- | ---------- | -------------- | --------------------------------- |
| 1     | CH-01 | No celular, registrar pagamento com comprovantes reais e maltratados sem gravar pela metade nem aceitar o que devia recusar | PER-01 | Garbage | 60 min | P0 | TC-JOURNEY-001, TC-FUNC-001..005, TC-INT-001, TC-UI-001 | [CH-01](charters/CH-01-registrar-no-celular.md) |
| 2     | CH-02 | Pelo link do WhatsApp, achar qualquer jeito de pagar o pedido errado, pagar duas vezes, ou pagar um pedido que já não aceita pagamento | PER-04 | Money | 60 min | P0 | TC-JOURNEY-002, TC-FUNC-016, TC-FUNC-017, TC-SEC-002, TC-SEC-003, TC-INT-005, TC-INT-006 | [CH-02](charters/CH-02-link-de-cartao.md) |
| 3     | CH-03 | Em duas abas, conferir e desfazer registros sem que um pagamento conte duas vezes ou suma da conta da loja | PER-02 | Multi-Tab | 60 min | P0 | TC-FUNC-006..009, TC-FUNC-013, TC-SEC-001, TC-INT-002, TC-INT-003 | [CH-03](charters/CH-03-conferir-e-desfazer.md) |
| 4     | CH-04 | Como cliente, voltar a cada pedido que falhou e encontrar a ação certa, sem oferta errada nem tom de cobrança | PER-03 | Feature (por cenário) | 60 min | P0 | TC-JOURNEY-003, TC-FUNC-018..024, TC-FUNC-027, TC-UI-002, TC-INT-007 | [CH-04](charters/CH-04-cliente-encontra-o-caminho.md) |
| 5     | CH-05 | Levar pedidos não pagos adiante por todo caminho do painel sem nenhum virar "Pago" sem registro | PER-02 | Back-Button | 60 min | P1 | TC-FUNC-010..012, TC-FUNC-014, TC-FUNC-015, TC-REG-001, TC-INT-004 | [CH-05](charters/CH-05-caminhos-ate-pago.md) |
| 6     | CH-06 | No celular, ver no app do ateliê e em Notificações o que o registro e o cancelamento automático deixaram | PER-01 | Feature | 30 min | P1 | TC-FUNC-025, TC-FUNC-026, TC-INT-008, TC-INT-009 | [CH-06](charters/CH-06-atelie-e-cancelamento.md) |
| 7     | CH-07 | CFR — J-01 e J-02 (registrar e conferir/desfazer no painel) | PER-01 | — | 45 min | P1 | TC-CFR-001..003 | [CH-07](charters/CH-07-cfr-registrar-e-conferir.md) |

Teto: Work Item grande (6 UCs, 58 critérios, telas em três apps) ⇒ até 6 exploratórios + CFR. Sem
fonte de design ⇒ sem `design-check`.

## Estratégia

- **Como se exercitam as jornadas:** um charter por área de risco, uma persona por sessão, no browser real
  pelo Playwright (MCP ou CLI); os `TC-*` são conferidos dentro do charter que os cita. 390×844 primeiro,
  1440 depois. A massa (pedidos em cada estado) é preparada pela thread antes da rodada, contra o banco
  local — a persona nunca mexe no banco.
- **CFR:** usabilidade, acessibilidade (teclado e nomes pelo snapshot), compatibilidade (390 · 1440, fonte
  130/200 %, movimento reduzido) e recuperação de erro nas duas jornadas do painel, que são a maior
  superfície nova; performance percebida só no envio dos comprovantes (spinner e trava do botão). As
  telas da cliente têm 390 e fonte grande conferidos em TC-UI-002, dentro do CH-04.
- **Conferência visual:** sem protótipo — fora. Telas novas comparadas com o desenho já existente da loja
  e do painel só por consistência, sem design-check.
- **Onde termina o simulado:** edge functions servidas localmente com chaves externas inválidas — o
  Brick do Mercado Pago não carrega, a cobrança (PIX novo, cartão) não se cria e o fechamento da cobrança
  no Mercado Pago responde "não fechada". Casos que dependem disso são `integration` e, na execução,
  `blocked` com o motivo; o que já foi provado está nos probes 06, 07, 09 e 10 da Validation. E-mail se
  confere no Mailpit (:54444). O job do cancelamento automático é executado pela thread (function
  `cancel-unpaid-orders` servida), e a persona confere o efeito na tela.
- **Automação:** 33 casos `e2e` + `missing` ficam como pedido de automação E2E; 9 `integration` ficam com
  o Dev (probes); `blocked`: nenhum no plano — Brick e cobrança real bloqueiam na execução.

### Suíte smoke

| Ordem | TC   | Jornada | O que prova                            |
| ----- | ---- | ------- | -------------------------------------- |
| 1     | TC-JOURNEY-001 | J-01 | a tela "Registrar pagamento" abre, grava e o pedido fica pago |
| 2     | TC-FUNC-022 | J-05 | a cliente vê o pedido registrado como pago, com o meio informado |
| 3     | TC-JOURNEY-002 | J-04 | o link de cartão abre `/pagar-com-cartao` do pedido, sem login |
| 4     | TC-SEC-001 | J-02 | o comprovante não abre sem sessão de admin |

## Critérios de entrada

- [x] Validation do Dev com `Status: PASS` no `qa-report.md` (rodada 2, 2026-11-10)
- [ ] App do branch rodando no ambiente local: loja :8082, painel :8083, app do ateliê :8084, Supabase API :54441, Mailpit :54444, migrations `20261112120000`…`20261118120000` aplicadas
- [ ] Edge functions servidas localmente (`mercado-pago`, `checkout`, `send-notification`, `cancel-unpaid-orders`)
- [ ] Credencial para cada persona que precisa de conta — `QA_ADMIN_USUARIO`/`QA_ADMIN_SENHA`, `QA_CLIENTE_USUARIO`/`QA_CLIENTE_SENHA`; a thread confere onde estão
- [ ] Massa de dados (banco local, preparada pela thread; os pedidos da cliente ligados à conta `cliente`):
  - M1 pedido PIX pendente, código ainda válido · M2 pedido PIX vencido e um recusado, dentro de 7 dias · M2b um PIX vencido com mais de 7 dias, ainda pendente (anterior ao corte)
  - M3 cartão recusado com tentativa · M4 cartão pendente com tentativa sem resposta · M5 cartão criado e nunca cobrado
  - M6 três ou mais pedidos pendentes não pagos para registrar — um com cupom de uso contado e estoque conhecido, um que espera material; M6b um pedido criado há poucos minutos (para o limite de data)
  - M7 pedido registrado à mão em Pago, com "Transferência", observação com o marcador `NOTA-INTERNA-QA` e três comprovantes (JPG, PDF, HEIC), da conta `cliente` · M8 registrado à mão e já em Separando · M9 pago pela loja (Mercado Pago) em Pago
  - M10 pedido em Separando sem pagamento registrado (avançado à mão), da conta `cliente`
  - M11 um pedido "pago duas vezes" e um "pago depois de cancelado" (molde do probe 05)
  - M12 pedido cancelado pela admin · M13 pedido cancelado pelo job (por falta de pagamento), com o WhatsApp da loja configurado
  - M14 links de cartão: um vivo (pedido de cartão recusado), um substituído por outro, um de pedido pago, um de pedido cancelado
  - M15 pedido montado com pagamento vencido; pedido de catálogo cuja promoção acabou depois da primeira cobrança; pedido gravado fora da loja
  - M16 arquivos de comprovante: JPG, PNG, WebP, HEIC e PDF de até 10 MB; um de exatamente 10 MB; um de mais de 10 MB; um GIF ou TXT; quatro arquivos válidos
  - M17 em Notificações, "Pagamento confirmado", "Instruções do material" e o aviso interno de pedido pago ligados (TC-INT-001); "Pedido cancelado por falta de pagamento" ligado só nas rodadas do TC-INT-004 e TC-INT-009
  - M18 os pedidos A–H do TC-INT-008 (datas de criação, registro, desfazer, material e link) e o job executável pela thread
- [ ] Driver de browser disponível — Playwright MCP headless, ou `playwright-cli` como fallback; interceptar `*.supabase.co` e `**/g/collect*`
- [ ] Com charter `design-check`: não se aplica (sem fonte de design)

## Critérios de saída

- **`pass`** — toda jornada `P0` chega ao objetivo, nenhum bug `critical`/`high` aberto, todos os charters rodaram
- **`partial`** — caso `P0`/`P1` `blocked` ou charter que não rodou (esperado: TC-INT-005 e o pagamento real do TC-JOURNEY-002 ficam `blocked` pelo Mercado Pago; o humano decide se isso fecha a rodada)
- **`fail`** — caso `P0` falhou, ou bug `critical`/`high` aberto
- Todo caso `e2e` + `missing`/`blocked` com o pedido de automação registrado

## Cobertura

| Critério | Fonte      | Resumo do critério | TC                          |
| -------- | ---------- | ------------------ | --------------------------- |
| CA-01.1 | prd | PIX pendente mostra "Pagar com PIX" | TC-FUNC-018, TC-JOURNEY-003 |
| CA-01.2 | prd | PIX vencido/recusado em 7 dias mostra "Gerar novo PIX" com data-limite | TC-FUNC-018, TC-JOURNEY-003 |
| CA-01.3 | prd | passados 7 dias, o pedido está cancelado e mostra CA-06.5 | TC-FUNC-024 |
| CA-01.4 | prd | código novo invalida o anterior no meio de pagamento | TC-INT-007 |
| CA-01.5 | prd | pagar de novo cobra o valor da primeira cobrança; montado, a proposta | TC-INT-006 |
| CA-01.6 | prd | pedido gravado fora da loja nunca cobrado pelo valor gravado | TC-INT-006 |
| CA-02.1 | prd | cartão recusado/pendente mostra informativo do WhatsApp | TC-FUNC-019 |
| CA-02.2 | prd | a loja não oferece pagar de novo por cartão nem trocar para PIX | TC-FUNC-019 |
| CA-02.3 | prd | tentativa sem resposta mostra o informativo; nunca cobrado não aparece | TC-FUNC-019, TC-FUNC-020 |
| CA-02.4 | prd | cancelado não oferece pagamento; servidor recusa | TC-FUNC-021, TC-FUNC-017, TC-SEC-003 |
| CA-05.1 | prd | link de cartão só para cartão não pago e não cancelado; não para PIX | TC-FUNC-014 |
| CA-05.2 | prd | link abre tela de cartão do mesmo pedido, sem refazer compra nem login | TC-JOURNEY-002, TC-SEC-002 |
| CA-05.3 | prd | valor travado da compra | TC-JOURNEY-002, TC-INT-006 |
| CA-05.4 | prd | a Adri copia o link | TC-FUNC-015 |
| CA-05.5 | prd | aprovado pelo link = aprovado no checkout | TC-INT-005 |
| CA-05.6 | prd | link vale até pago/cancelado/novo; novo invalida o anterior | TC-FUNC-016, TC-SEC-002 |
| CA-05.7 | prd | link com pedido pago/cancelado mostra a situação, sem pagamento | TC-FUNC-017 |
| CA-05.8 | prd | gerar link não adia o cancelamento automático | TC-INT-008 |
| CA-03.1 | prd | ação existe para pendente/recusado/vencido não cancelado | TC-FUNC-001 |
| CA-03.2 | prd | meio, data, observação, comprovantes opcionais; 3 × 10 MB; formatos | TC-FUNC-002, TC-FUNC-004, TC-JOURNEY-001 |
| CA-03.2a | prd | meio numa lista fixa de cinco | TC-FUNC-002 |
| CA-03.2b | prd | data e hora de Brasília, pré-preenchida, nem futura nem antes do pedido | TC-FUNC-002, TC-FUNC-003 |
| CA-03.3 | prd | confirmar deixa pago com a data; pendente avança a Pago | TC-JOURNEY-001 |
| CA-03.3a | prd | aprovado/registrado com o formulário aberto: diz e não grava | TC-FUNC-006 |
| CA-03.4 | prd | estoque baixa e cupom conta | TC-INT-003 |
| CA-03.5 | prd | registrar duas vezes não repete efeito | TC-FUNC-005 |
| CA-03.5a | prd | registrar fecha o PIX ou link em aberto | TC-INT-007 |
| CA-03.5b | prd | aprovação em pedido já pago: sem efeitos e "Pago duas vezes" | TC-FUNC-013 |
| CA-03.6 | prd | histórico "Pagamento registrado manualmente", quem e quando | TC-FUNC-007, TC-JOURNEY-001 |
| CA-03.7 | prd | venda do Dashboard e da Início pela data do pagamento | TC-INT-002 |
| CA-03.8 | prd | admin escolhe o e-mail da cliente; sem aviso interno | TC-INT-001, TC-JOURNEY-001 |
| CA-03.9 | prd | os três caminhos até Pago abrem o registro; lote exclui e conta | TC-FUNC-010, TC-FUNC-011, TC-REG-001 |
| CA-03.16 | prd | avançado à mão sem pagamento: "Pagamento não registrado"; cliente sem oferta | TC-FUNC-012, TC-FUNC-023 |
| CA-03.10 | prd | recusa de arquivo antes de gravar, com motivo | TC-FUNC-004 |
| CA-03.11 | prd | desfazer com motivo e os efeitos de volta | TC-FUNC-008, TC-INT-002, TC-INT-003 |
| CA-03.12 | prd | pagamento da loja não tem "Desfazer" | TC-FUNC-009 |
| CA-03.13 | prd | desfazer só em Pago | TC-FUNC-009 |
| CA-03.14 | prd | desfazer não manda e-mail | TC-FUNC-008 |
| CA-03.15 | prd | desfeito volta a contar o prazo do cancelamento | TC-INT-008 |
| CA-04.1 | prd | bloco mostra meio pelo nome, data, autor, observação, comprovantes | TC-FUNC-007 |
| CA-04.2 | prd | comprovante só para admin; link expira | TC-SEC-001 |
| CA-04.3 | prd | cliente vê pago, o meio informado, o mesmo total; nunca observação nem comprovante | TC-FUNC-022 |
| CA-06.1 | prd | pendente não pago cancelado em 7 dias | TC-INT-008 |
| CA-06.1a | prd | não cancela avançado, com material enviado/recebido, anterior à publicação | TC-INT-008 |
| CA-06.2 | prd | registrado ou aprovado nunca é cancelado pelo prazo | TC-INT-008 |
| CA-06.3 | prd | cancelar fecha a cobrança aberta | TC-INT-004, TC-INT-007 |
| CA-06.4 | prd | aprovado depois de cancelado: continua cancelado, sem efeitos, selo no painel | TC-FUNC-013 |
| CA-06.5 | prd | cancelado por falta de pagamento diz isso e mostra o WhatsApp | TC-FUNC-024 |
| CA-06.6 | prd | e-mail próprio só no automático; nasce desligado | TC-INT-009, TC-FUNC-025, TC-INT-004 |
| RNF-01 | prd | registro produz o mesmo "pago" do webhook | TC-FUNC-022, TC-JOURNEY-001, TC-INT-002 |
| RNF-03 | prd | comprovante privado, só admin | TC-SEC-001 |
| RNF-04 | prd | envio em 390, câmera/galeria, 44 px, sem rolagem lateral | TC-UI-001, TC-JOURNEY-001, TC-CFR-003 |
| RNF-06 | prd | tom memorial na cópia para a cliente | TC-FUNC-027 |
| RNF-08 | prd | registro estruturado (origem, meio, autor, data, observação, comprovantes) | TC-FUNC-007, TC-FUNC-026 |
| RNF-09 | prd | app mostra registro, meio, data e observação; sem comprovante; não registra | TC-FUNC-026 |

**Sem cobertura:**
- RNF-02 — "toda escrita do pedido passa pelo dono" é arquitetura, sem efeito que a persona veja; provado pelos guardas (`pedidoGravadoSoPeloDono`) na Validation
- RNF-05 — "migration só no banco local" é obrigação de processo do Dev, não comportamento do produto
- RNF-07 — o registro não dispara o `purchase` do GA4: a ação acontece no painel, onde não há GA4 a observar, e em desenvolvimento a loja não mede; provado pelo probe `01-registrar.sql` › 1i

## Riscos

| Risco (para o usuário)  | Probabilidade        | Impacto na persona                                                   | Mitigação no plano                 |
| ----------------------- | -------------------- | -------------------------------------------------------------------- | ---------------------------------- |
| Registro gravado pela metade (comprovante perdido, ou pedido pago sem o registro) quando a rede cai no celular | média | perde dado | J-01c, CH-01, TC-CFR-001 |
| Estoque ou cupom baixados duas vezes, ou não devolvidos no desfazer | baixa | perde dado (estoque errado) | TC-FUNC-005, TC-INT-003, CH-03 |
| Pedido levado a Pago por um caminho que pula o registro | média | abala confiança (venda que não existe) | CH-05, TC-FUNC-010, TC-FUNC-011 |
| Comprovante aberto por quem não é admin, ou link que não expira | baixa | perde dado (pessoal/financeiro) | TC-SEC-001 |
| Link de cartão antigo ou de pedido cancelado ainda oferece pagar | média | abala confiança; cobrança indevida | TC-FUNC-016, TC-FUNC-017, TC-SEC-003 |
| Cliente sem caminho, ou com oferta errada (trocar meio, pagar pedido já avançado) | média | impede concluir / abala confiança | CH-04 |
| Formulário inutilizável em 390 ou com fonte grande (botão fora da tela, rolagem lateral) | média | impede concluir | TC-UI-001, TC-CFR-003 |
| Tom de cobrança com cliente enlutada | baixa | abala confiança | TC-FUNC-027 |
| Brick e cobrança real fora do ambiente: o pagamento pelo link não é provado na tela | alta (certa) | — (limite da rodada) | TC-INT-005 `blocked` na execução; probe 09 da Validation |

## Perguntas

- 🔴 nada
- 🟡 O motivo do desfazer é obrigatório ("informando o motivo", CA-03.11): o plano assume que desfazer sem motivo é recusado (TC-FUNC-008)
- 🟡 Com a data e a hora apagadas no formulário (todos os campos são opcionais, CA-03.2, mas a data vem preenchida, CA-03.2b), nenhuma fonte diz qual data vale: o TC-FUNC-002 não afirma o resultado; o explorer registra o que a tela faz como pergunta, não como bug
- 🟡 Pelo "Outro status → Separando/Enviado/Entregue" de um não pago, a costura (Decisão 7) leva ao registro, mas não diz se, depois de registrar, o pedido fica em Pago ou segue ao destino escolhido: o TC-FUNC-010 cobra só a chegada ao registro e o pedido pago; o explorer registra o destino observado
- 🟡 Depois do desfazer, o app do ateliê não mostra mais o registro (o vivo é só o não desfeito) — o plano não cobra a exibição do desfeito no app (TC-FUNC-026)
- 🟡 Na voz da cliente, o meio "Outro" (e o meio não informado) aparece como "Combinado com a loja" e "Cartão de crédito (…maquininha)" como "Cartão de crédito" — o plano usa esses rótulos do código como esperado de CA-04.3 (TC-FUNC-022)
- 🟢 A cliente de um pedido "pago depois de cancelado" não recebe nenhuma palavra sobre a devolução: o painel avisa a Adri (CA-06.4), a loja segue mostrando cancelado. Vale decidir se ela deve saber
- 🟢 A convidada cujo acesso de 7 dias venceu só sabe do cancelamento automático pelo e-mail, que nasce desligado (limitação aceita na costura)
