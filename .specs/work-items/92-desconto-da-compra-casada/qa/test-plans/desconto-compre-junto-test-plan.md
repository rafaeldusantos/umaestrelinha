```json
{
  "schema": "qa-plan/v1",
  "title": "Plano de QA — Desconto da compra casada (Compre Junto)",
  "summary": {
    "total_cases": 60,
    "by_priority": { "P0": 24, "P1": 31, "P2": 5, "P3": 0 }
  },
  "acceptance_criteria_covered": 37,
  "strategy": [
    "Exploração por charter no browser real (Playwright MCP ou playwright-cli), uma persona por sessão, no ambiente local (Supabase :54441, loja :8082, painel :8083, ateliê :8084), bloqueando *.supabase.co",
    "Celular primeiro: toda tela da loja e do ateliê em 390 × 844 antes de 1440 × 900, com fonte a 100 %, 130 % e 200 % nas telas novas",
    "O 'cobrado' é o valor do pedido gravado depois do create-payment (tela de pagamento, confirmação, painel); o QR do PIX e o Brick do cartão não são condição de caso",
    "A ordem das linhas do resumo do pedido é a do painel (descontos e PIX antes do Frete) — decisão Q-01 de 2026-11-04; loja e app que divergirem na ordem são bug; as linhas dos itens seguem a Design de cada ponta",
    "E2E (Playwright) pedido à automação p/ fluxos P0/P1 determinísticos",
    "Integration com o Dev p/ gravação direta no banco, corpo forjado, 422 antes do Mercado Pago, e-mail e feed (probes e testes já existentes)",
    "Manual p/ usabilidade, acessibilidade, layout por viewport e fonte, relatório com massa paga e conferência contra os protótipos do Claude Design"
  ],
  "cases": [
    { "id": "TC-SMOKE-001", "title": "A página do pingente mostra a corrente com \"de/por\" e \"10% a menos levando junto\"", "priority": "P0", "type": "smoke", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-SMOKE-002", "title": "Levar o conjunto põe a corrente na sacola com a linha \"Desconto do Compre Junto\" e o total do bloco", "priority": "P0", "type": "smoke", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-SMOKE-003", "title": "A dona grava 10% num adicional e a prévia diz por quanto a peça sai com a joia", "priority": "P0", "type": "smoke", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-001", "title": "No celular, a cliente leva pingente e corrente com desconto e fecha o pedido como convidada pelo valor do bloco", "priority": "P0", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-002", "title": "Tirar a joia da sacola devolve a corrente ao preço cheio e a linha diz que o desconto volta com ela", "priority": "P0", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-003", "title": "A dona dá 10% às correntes de um pingente e a loja mostra o mesmo valor da prévia", "priority": "P0", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-004", "title": "Com cupom de 15% e o desconto do Compre Junto, a conta fecha no checkout e na confirmação", "priority": "P0", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-005", "title": "A dona baixa o percentual com a sacola montada e a cliente confirma o novo total no checkout sem ser cobrada antes", "priority": "P0", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-006", "title": "Pagar depois, por Minha conta, um pedido cujo desconto mudou mostra o aviso e o contato da loja", "priority": "P1", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-007", "title": "A dona confere no painel e na Adesão quanto um pedido teve de desconto", "priority": "P1", "type": "journey", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-JOURNEY-008", "title": "No app do ateliê, a Adri vê o desconto do Compre Junto do pedido antes de separar", "priority": "P1", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-001", "title": "Adicional sem percentual continua oferecido como antes, sem \"de/por\"", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-002", "title": "Percentual 0, 51, 10,5 ou com letras é recusado com a frase do motivo e nada é gravado", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-003", "title": "Mudar só o percentual conta como alteração e grava; sem mudança, salvar não escreve", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-004", "title": "Gravar o desconto de um pingente não muda o Compre Junto de outro", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-005", "title": "A prévia fala da faixa \"de R$ X a R$ Y\" quando as variações ou as peças da lista têm preços diferentes", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-006", "title": "No bloco, cada peça com desconto mostra o preço da variação escolhida riscado e o preço levando junto, também nas peças de uma lista", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-007", "title": "Com peças marcadas, o bloco mostra \"Desconto do Compre Junto\" acima do total já descontado e o PIX sobre esse total", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-008", "title": "A nota do bloco diz que o desconto vale com a joia no mesmo pedido só quando há peça com desconto marcada", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-009", "title": "Sem promoção nem cupom, o total do bloco é o mesmo da sacola com só a joia e as peças marcadas", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-010", "title": "Com promoção que dá preço menor que o desconto casado, a sacola mostra o menor e a diferença aparece só ali", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-011", "title": "A barra fixa do celular mostra o mesmo total descontado do bloco", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-012", "title": "A peça sai com o percentual sobre o preço da variação escolhida, arredondado a centavo, igual em todas as telas", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-013", "title": "Uma joia com duas correntes na mesma linha: uma com desconto e uma a preço cheio, dito na linha", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-014", "title": "Duas joias somam unidades de desconto, o maior percentual vale primeiro e a linha de maior preço recebe antes", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-015", "title": "A corrente acrescentada pelo catálogo recebe o desconto com a joia na sacola, sem a frase de que o desconto volta", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-016", "title": "Peça em promoção ou marcada como oferta do checkout sai pelo menor preço da linha, sem somar descontos", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-017", "title": "O cupom acumula com o desconto casado e só se diz que algo ficou de fora quando ele de fato descontaria", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-018", "title": "O desconto PIX incide sobre o valor já com o desconto do Compre Junto", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-019", "title": "A gaveta e o checkout mostram \"de/por\" na peça e a mesma linha \"Desconto do Compre Junto\" com o mesmo valor", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-020", "title": "Duas joias com percentuais diferentes para a mesma corrente dão o maior; na mesma joia, a peça avulsa vem antes da lista", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-021", "title": "No par recíproco recebe desconto a peça levada pelo bloco; sem marca, só a de menor preço cheio", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-022", "title": "Variação da joia que esconde as correntes, ou variação da peça que a dona não liberou, não recebe desconto", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-023", "title": "Com a sacola montada, a dona muda o percentual e a sacola mostra o valor novo ao ser reaberta", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-024", "title": "O valor do pedido gravado é o total que o checkout mostrou, ao centavo, no PIX e no cartão", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-025", "title": "Se o desconto aumentou ou outro desconto passou a valer, o pagamento segue pelo valor igual ou menor, sem aviso", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-026", "title": "Na confirmação e em Minha conta, a linha mista vira duas, a peça com desconto mostra \"de/por\" e o resumo fecha", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-027", "title": "Pedido com oferta do checkout e promoção: as linhas somam o subtotal e cada desconto tem a sua linha", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-028", "title": "Pedido feito antes deste WI continua aparecendo como antes na loja, no painel e no app", "priority": "P1", "type": "functional", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-FUNC-029", "title": "Mudar ou apagar o desconto do adicional depois não muda um pedido já feito", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-030", "title": "No painel do pedido, a dona vê o desconto do Compre Junto com as mesmas linhas e valores da loja, na ordem do painel", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-031", "title": "No app do ateliê, o detalhe do pedido mostra o desconto do Compre Junto na ordem do painel, com descontos e PIX antes do Frete", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-032", "title": "A Adesão segue contando só as peças levadas pelo bloco", "priority": "P1", "type": "functional", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-FUNC-033", "title": "A Adesão mostra o valor pago líquido e o \"desconto concedido\" de cada peça", "priority": "P1", "type": "functional", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-INT-001", "title": "Gravação direta no banco de percentual fora de 1 a 50 é recusada", "priority": "P1", "type": "integration", "automation": { "target": "integration", "status": "missing" } },
    { "id": "TC-INT-002", "title": "O pagamento ignora preço e marca forjados no pedido e recalcula pelo banco", "priority": "P0", "type": "integration", "automation": { "target": "integration", "status": "missing" } },
    { "id": "TC-INT-003", "title": "Pedido que ficou mais caro é recusado antes de qualquer cobrança no Mercado Pago", "priority": "P0", "type": "integration", "automation": { "target": "integration", "status": "missing" } },
    { "id": "TC-INT-004", "title": "O e-mail do pedido traz a peça com \"Compre Junto · N% a menos\", o preço cheio riscado e uma linha por desconto", "priority": "P1", "type": "integration", "automation": { "target": "integration", "status": "missing" } },
    { "id": "TC-INT-005", "title": "O preço da corrente no feed do Google e no JSON-LD da página não muda", "priority": "P2", "type": "integration", "automation": { "target": "integration", "status": "missing" } },
    { "id": "TC-REG-001", "title": "Sem nenhum percentual configurado, a sacola, o checkout e o pedido ficam como antes", "priority": "P0", "type": "regression", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-REG-002", "title": "O pedido montado pelo painel com joia e corrente segue sem desconto do Compre Junto", "priority": "P1", "type": "regression", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-UI-001", "title": "O bloco com \"de/por\" cabe em 390 × 844 a 100 %, 130 % e 200 % de fonte, sem rolagem horizontal nem pílula quebrada", "priority": "P1", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-UI-002", "title": "A linha mista e a linha do desconto cabem na gaveta e no checkout em 390 × 844 a 100 %, 130 % e 200 %", "priority": "P1", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-UI-003", "title": "Confirmação, Minha conta, painel do pedido e app do ateliê mostram o desconto em 390 sem rolagem horizontal", "priority": "P2", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-UI-004", "title": "O bloco e a sacola com desconto conferem com o protótipo \"Produto - Compre Junto com desconto\"", "priority": "P2", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-UI-005", "title": "Checkout, \"o valor mudou\", confirmação e e-mail conferem com o protótipo \"Pedido - Desconto do Compre Junto\"", "priority": "P2", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-UI-006", "title": "O campo \"Desconto ao levar junto\" da aba Compre junto confere com o protótipo do painel", "priority": "P2", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-CFR-001", "title": "As frases novas do desconto seguem o tom memorial: sem exclamação, sem \"economize\", sem urgência", "priority": "P1", "type": "cfr", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-CFR-002", "title": "Só pelo teclado, a peça anuncia o desconto e o aviso de valor mudado é anunciado como alerta", "priority": "P1", "type": "cfr", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-CFR-003", "title": "Toda falha do caminho de dinheiro diz que nada foi cobrado e dá um próximo passo", "priority": "P1", "type": "cfr", "automation": { "target": "manual", "status": "na" } }
  ]
}
```

# Plano de QA — 92 · Desconto da compra casada (Compre Junto)

**Work Item:** 92 (feature) · **Escopo:** completo · **Foco:** —
**Versão do plano:** 2 · **Escrito em:** 2026-11-03 · **Revisado em:** 2026-11-04 · **Modo:** revisar
**Gate 1:** aprovado em 2026-11-04 (Têmis, decisão delegada pela política do humano)

## Resumo

- **Valor para o usuário:** quem leva a joia com a peça que a acompanha (a corrente do pingente, por exemplo)
  passa a pagar menos por essa peça, e vê o mesmo valor do bloco da página até o pedido gravado, no PIX e no
  cartão. A dona (Adri) dá o percentual a cada adicional no painel, com uma prévia do preço, e confere depois
  quanto cada pedido teve de desconto no painel, no app do ateliê e no relatório de Adesão.
- **Maior risco para o usuário:** a cliente ver um valor e ser cobrada por outro — desconto somado com promoção
  ou cupom, desconto que fica depois de a joia sair da sacola, ou o pagamento cobrar mais do que a tela mostrou.
- **Contagens:** personas 5 · jornadas 6 · charters 9 (CFR 1 · design-check 1) · TC 60 (P0 24 · P1 31 · P2 5 · P3 0)
- **Automação:** e2e 41 (missing 41 · existing 0 · blocked 0) · integration 5 · manual 14

## Escopo

**Dentro:** UC-01 (o campo, a recusa, a prévia na aba Compre junto do produto), UC-02 (o bloco da página do
produto, com a faixa que rola dentro das peças de uma lista, e a barra fixa), UC-03 (gaveta da sacola, `/carrinho`,
`/checkout`: presença, quantidade, concorrência com promoção, oferta do checkout, cupom e PIX, releitura), UC-04 (o
pagamento cobra o que a tela mostrou e as duas telas de "o valor mudou"), UC-05 (confirmação, Minha conta, e-mail,
painel do pedido e app do ateliê, todos na ordem do resumo do painel — Q-01), UC-06 (a Adesão) e os RNF-01..07,
todos no ambiente local.

**Fora:** o que o `prd.md` deixa fora — preço de conjunto fixo e desconto em valor fixo; o desconto no feed e no
JSON-LD (só se confere que não muda, TC-INT-005); o pedido montado pelo painel (só se confere que segue sem
desconto, TC-REG-002); percentual por peça dentro de uma lista; os diferenciais (a), (b) e (e); a sacola guardar o
percentual do momento em que a peça entrou. Fora também: o Compre Junto sem desconto do WI-01 (estados, formas do
bloco, listas) — o que a sessão vir ali é sugestão de backlog —, o relatório de promoções (`usePromotions`, cujo
número muda por D-22, sem critério neste WI), o "Economize" do `compare_price` na página do produto (anterior ao
WI, D-09), o artigo fixo "o" em "Acompanha o …" (D-24), a cobrança real no Mercado Pago, leitor de tela real,
Safari/iOS, Chrome Android e o Android real do ateliê.

## Fontes

| Fonte      | Caminho                             | Uso                                        |
| ---------- | ----------------------------------- | ------------------------------------------ |
| PRD        | `.specs/work-items/92-desconto-da-compra-casada/prd.md` | critérios de aceite CA-01.1..CA-06.2 e RNF-01..07 — a régua da cobertura |
| Costura    | `spec.md` (D-01..D-38), `tasks/01..08`, `session-summary.md`, `orquestrador-decisoes.md`, `prd-review.md` | o que o Dev entendeu, as frases das telas, os desvios declarados |
| Decisões do Gate 1 | respostas do humano às 🔴 (página, 2026-11-04) | Q-01 → C (a ordem do painel vale); Q-02 → B (a faixa da lista é exigida) |
| Fontes de design | `claude_design` · projeto `69224d8a-17ae-4b1f-a251-a8105b41edc2` · `Produto - Compre Junto com desconto.html`, `Pedido - Desconto do Compre Junto.html`, `Produto - Compre Junto.html` · projeto `e3957c10-bd49-4f3d-9256-04d72a7d0f41` · `Produto - Compre Junto.html` — de `item.md` › Insumos e `prd.md` › Expectativas de UI/UX | charter `design-check` (CH-09). **Não lidos nesta fase**: o MCP do Claude Design não estava na sessão do planner; as telas e os textos vêm da seção Design do `spec.md` |
| Insumos    | `.specs/work-items/91-compre-junto/discovery.md`, `.../91-compre-junto/prd.md`, `probes/01..05` | decisões Q-04..Q-06 de origem; o que os probes já provaram contra o banco local |
| Validation | `qa-report.md` (Status PASS, 38/38, layout em navegador para a QA) | gate técnico antes da execução; observações para a QA (ordem das linhas no painel, "Desconto da oferta", preço da unidade no painel) |
| Projeto    | `.specs/project/PROJECT.md`; `CLAUDE.md` da raiz do worktree | ambiente local (Supabase :54441, Mailpit :54444), regras de mobile, tom e dinheiro |

## Personas

Detalhe em [personas.md](personas.md).

| ID     | Nome   | Arquétipo   | Objetivo    | Conta                      | Jornadas   |
| ------ | ------ | ----------- | ----------- | -------------------------- | ---------- |
| PER-01 | Marina | Usuário mobile (primeira compra) | levar o pingente com a corrente pelo celular, pagando menos pela corrente, sem criar conta | `anonima` | J-01 |
| PER-02 | Adri (painel) | Usuário avançado | dar um desconto às correntes de um pingente e conferir depois quanto cada pedido teve de desconto | `admin-painel` | J-02, J-05 |
| PER-03 | Adri (ateliê) | Usuário mobile | ver no celular, antes de separar, que o pedido teve desconto e quanto | `admin-painel` | J-06 |
| PER-04 | Helena | Usuário em recuperação | comprar com cupom e, quando o valor mudar, entender o que aconteceu e terminar a compra | `cliente-loja` | J-03, J-04 |
| PER-05 | Sônia | Usuário de tecnologia assistiva | montar o conjunto e chegar ao checkout só pelo teclado, com fonte grande, sabendo quanto vai pagar | `anonima` | J-01 (secundária), J-03 (CFR) |

**Não cobertas:** usuário novo em desktop (a loja é ~90 % celular; o desktop entra como segunda medida em toda
sessão da loja); locale diferente de pt-BR (a loja só vende no Brasil, em reais).

## Jornadas

| ID   | Jornada (pelo valor) | Persona principal · secundária | Prioridade | Abandono/erro | Cruza fronteira      | Arquivo                         |
| ---- | -------------------- | ------------------------------ | ---------- | ------------- | -------------------- | ------------------------------- |
| J-01 | Levar o pingente com a corrente pelo celular, pagando menos pela corrente, até o pedido gravado | PER-01 · PER-05 | P0 | J-01a, J-01b, J-01c | sim: edge functions `checkout` e `mercado-pago` | [J-01](journeys/J-01-levar-pingente-e-corrente-com-desconto.md) |
| J-02 | Dar um desconto às correntes de um pingente e ver a loja mostrar o mesmo valor | PER-02 · — | P0 | J-02a, J-02b | não | [J-02](journeys/J-02-dar-desconto-ao-adicional.md) |
| J-03 | Comprar com cupom, promoção e duas joias e ver a conta fechar até Minha conta e o e-mail | PER-04 · PER-05 | P0 | J-03a, J-03b | sim: `checkout`, `mercado-pago`, `send-notification` | [J-03](journeys/J-03-comprar-com-cupom-e-a-conta-fechar.md) |
| J-04 | Terminar a compra quando o desconto mudou no caminho | PER-04 · PER-01 | P0 | J-04a, J-04b | sim: `mercado-pago` (422) | [J-04](journeys/J-04-terminar-a-compra-quando-o-valor-mudou.md) |
| J-05 | Conferir no painel e na Adesão quanto os pedidos tiveram de desconto | PER-02 · — | P1 | J-05a | sim: RPC `buy_together_adoption` | [J-05](journeys/J-05-conferir-o-desconto-no-painel-e-na-adesao.md) |
| J-06 | Ver no app do ateliê o desconto do pedido antes de separar | PER-03 · — | P1 | J-06a | sim: view `order_list` | [J-06](journeys/J-06-ver-o-desconto-no-app-do-atelie.md) |

## Charters

Ordem de execução — a Fase 2 despacha nesta sequência.

| Ordem | ID    | Missão                               | Persona   | Tour   | Time-box | Prioridade | TC             | Arquivo                           |
| ----- | ----- | ------------------------------------ | --------- | ------ | -------- | ---------- | -------------- | --------------------------------- |
| 1     | CH-05 | a dona grava, recusa e pré-visualiza o desconto de cada adicional sem perder o que digitou nem mexer em outra joia | PER-02 | Garbage | 60 min | P0 | TC-SMOKE-003, TC-JOURNEY-003, TC-FUNC-001..005 | [CH-05](charters/CH-05-painel-desconto-do-adicional.md) |
| 2     | CH-01 | no celular, o bloco diz quanto cada peça custa levando junto e o total que vai para a sacola | PER-01 | Feature | 60 min | P0 | TC-SMOKE-001, TC-FUNC-006..009, TC-FUNC-011, TC-UI-001 | [CH-01](charters/CH-01-bloco-com-desconto-no-celular.md) |
| 3     | CH-02 | achar um jeito de a corrente sair com desconto sem a joia, com desconto a mais ou com um valor diferente do bloco até o pedido gravado | PER-01 | Money | 90 min | P0 | TC-SMOKE-002, TC-JOURNEY-001, TC-JOURNEY-002, TC-FUNC-012, 013, 015, 018, 019, 022, 024, 026, TC-REG-001, TC-UI-002 | [CH-02](charters/CH-02-sacola-e-checkout-presenca-e-quantidade.md) |
| 4     | CH-03 | com cupom, promoção, oferta do checkout e duas joias, nenhum desconto se soma onde não devia e a conta fecha até o e-mail | PER-04 | Money | 90 min | P0 | TC-JOURNEY-004, TC-FUNC-010, 014, 016, 017, 020, 021, 027, TC-INT-004 | [CH-03](charters/CH-03-concorrencia-de-descontos.md) |
| 5     | CH-04 | quando o desconto muda no caminho, a cliente nunca é cobrada a mais e sabe como seguir | PER-04 | Interrupt | 60 min | P0 | TC-JOURNEY-005, TC-JOURNEY-006, TC-FUNC-023, 025, 029, TC-INT-003 | [CH-04](charters/CH-04-o-valor-mudou.md) |
| 6     | CH-06 | a dona confere, no painel do pedido e na Adesão, quanto cada pedido teve de desconto, sem conta que não fecha | PER-02 | Feature (por cenário) | 60 min | P1 | TC-JOURNEY-007, TC-FUNC-028, 030, 032, 033, TC-REG-002 | [CH-06](charters/CH-06-pedido-no-painel-e-adesao.md) |
| 7     | CH-07 | no app do ateliê, o detalhe do pedido diz que houve desconto do Compre Junto e quanto, na ordem do painel | PER-03 | Feature | 30 min | P1 | TC-JOURNEY-008, TC-FUNC-031 | [CH-07](charters/CH-07-app-do-atelie.md) |
| 8     | CH-08 | CFR — J-01 e J-03 | PER-05 | — | 45 min | P1 | TC-CFR-001..003, TC-UI-003 | [CH-08](charters/CH-08-cfr-desconto.md) |
| 9     | CH-09 | design-check — bloco (com a faixa da lista), sacola, checkout, "o valor mudou", confirmação, e-mail, aba do painel · Claude Design | PER-01 | — | 60 min | P2 | TC-UI-004..006 | [CH-09](charters/CH-09-design-check.md) |

**O teto foi passado em 1 exploratório (7 em vez de 6), e o motivo é a regra "uma persona por charter":** o app do
ateliê é um terceiro app, com outro dispositivo e outra persona (PER-03), e não cabe no CH-06 (painel em 1440, PER-02)
sem trocar de persona no meio da sessão. Ele é curto (30 min). O painel abre a ordem porque a massa da loja depende
do percentual gravado por ele.

## Estratégia

- **Como se exercitam as jornadas:** um charter por área de risco, uma persona por sessão, no browser real pelo
  Playwright (MCP ou CLI), contra o ambiente local; os `TC-*` são conferidos dentro do charter que os cita. Toda tela
  da loja e do ateliê é vista em 390 × 844 antes de 1440 × 900 (medidas do projeto, não 375/1280); as telas novas
  também a 130 % e 200 % de fonte. A conta de cada caso de dinheiro se confere somando os números que a tela mostra.
- **A ordem do resumo do pedido (decisão Q-01, 2026-11-04):** a régua é a ordem das linhas do painel do pedido —
  Subtotal · Desconto do Compre Junto · (Desconto progressivo · Desconto da oferta, quando houver) · Cupom · Desconto
  PIX · Frete · Total. O resumo do checkout, da confirmação, de Minha conta, do e-mail e o detalhe do app do ateliê
  são conferidos contra essa ordem; onde divergirem, é bug. A régua é só a ordem: as linhas dos itens seguem a Design
  de cada ponta no `spec.md` (D-38: o preço por item não muda), e o "de/por" da linha continua cobrado por CA-03.8 e
  CA-05.2 — a loja e o app mostrarem o total da linha não é bug. A gaveta da sacola não
  tem a linha do Frete ("frete calculado no checkout") e segue o rodapé do protótipo.
- **CFR:** as seis categorias entram no CH-08, sobre J-01 e J-03 — o WI muda texto, layout e o caminho de dinheiro da
  loja. Acessibilidade por teclado e pela árvore de acessibilidade (snapshot), com fonte a 200 %. CFR do painel e do
  app não entram: uso de uma pessoa só, e o painel ganha só um campo.
- **Conferência visual:** CH-09 confere o bloco — **com a faixa que rola dentro das peças de uma lista, exigida neste
  WI (decisão Q-02, 2026-11-04)** — e a sacola contra `Produto - Compre Junto com desconto.html`, as cinco telas de
  `Pedido - Desconto do Compre Junto.html` (a ordem do resumo pela régua do painel, Q-01: a ordem do protótipo não é
  régua onde diverge dela) e o campo da aba contra o `Produto - Compre Junto.html` do Backoffice. Sem frame (registrar,
  não comparar): a recusa e a prévia no painel, o painel do pedido, a Adesão e o app do ateliê. O MCP do Claude
  Design é pré-requisito: sem ele, a sessão é `not-run`.
- **Onde termina o simulado:** tudo roda no Supabase local (:54441); `*.supabase.co` bloqueado por rota. A `checkout`
  e a `mercado-pago` locais sobem (o probe `03` provou o boot depois de D-12) com valores inválidos para as chaves
  externas: o `create-payment` recalcula, regrava o pedido e dá o 422 **antes** de chamar o Mercado Pago, e a chamada
  ao Mercado Pago falha depois disso. Por isso o "cobrado" é o **valor do pedido gravado** (tela
  `/pedido/:id/pagamento`, `/pedido/:id`, painel) e o QR do PIX não é condição de caso. O cartão não é alcançável na
  tela (o Brick precisa do SDK e da chave): no cartão se confere o total mostrado no checkout, e o cobrado fica no
  teste de paridade do Dev (`displayedEqualsCharged.test.ts`). Pedidos pagos (Adesão, "concedido") vêm da massa
  M-07, gravada pela thread no banco local. E-mails caem no Mailpit (:54444) e a prévia sai pela aba Notificações
  do painel com o `order_id`. Leitor de tela real, Safari/iOS, Chrome Android e o Android real ficam fora.
- **Automação:** 41 casos `e2e` + `missing` ficam como pedido de automação E2E; 5 `integration` ficam com o Dev (já
  cobertos por probes e testes citados em cada caso); `blocked`: nenhum no planejamento.

### Massa de dados

A thread prepara antes da Fase 2, no banco local; o CH-05 cria parte dela pelo painel e a confere.

| ID | O que é |
| --- | --- |
| M-01 | Pingente principal "P" com variações, uma delas escondendo as correntes ("Chaveiro" ou equivalente), e três adicionais: a lista "Correntes" (3 ou mais correntes de preços diferentes, para a faixa rolar em 390; uma variação não liberada) a **10 %**; uma corrente avulsa de preço com centavos (ex.: R$ 79,90) a **15 %**, que também está na lista; e um adicional **sem** percentual |
| M-02 | Segunda joia "Q" que oferece a mesma corrente avulsa a **20 %** |
| M-03 | Par recíproco: joias "A" e "B", cada uma adicional da outra, com percentual |
| M-04 | Promoção progressiva ativa sobre uma corrente de M-01 que dê preço menor que o desconto casado; oferta do checkout (order bump) com uma corrente de M-01; cupom percentual de 15 % e cupom de frete grátis (o `seed.sql` tem cupons) |
| M-05 | Peça com variações liberadas de preços diferentes e lista com peças de preços diferentes (faixa da prévia) |
| M-06 | Pedido anterior ao WI, sem preço cheio nas linhas (qualquer pedido antigo do banco local) |
| M-07 | Pedidos com desconto casado, marcados como pagos pela thread no banco local (Adesão) — inclusive um com a corrente comprada pelo catálogo, sem a marca "acompanha" |
| M-08 | Contato da loja (WhatsApp e e-mail) em `store_settings`, para a tela "o valor deste pedido mudou" |
| M-09 | Uma proposta montada pelo painel com joia e corrente (feature 89), se a `order-proposals` subir no local |
| M-10 | Uma joia e uma peça sem nenhum percentual (RNF-02) |

### Suíte smoke

| Ordem | TC   | Jornada | O que prova                            |
| ----- | ---- | ------- | -------------------------------------- |
| 1     | TC-SMOKE-003 | J-02 | o painel grava o percentual e mostra a prévia |
| 2     | TC-SMOKE-001 | J-01 | a página do pingente mostra o "de/por" no bloco |
| 3     | TC-SMOKE-002 | J-01 | o conjunto entra na sacola com a linha do desconto e o total do bloco |

## Critérios de entrada

- [ ] Validation do Dev com `Status: PASS` no `qa-report.md` — feito (2026-11-03)
- [ ] App do branch `feature/92` rodando no ambiente local: loja :8082, painel :8083, ateliê :8084, Supabase :54441 com as migrations `20261107130000`..`20261107160000` aplicadas só no local
- [ ] `checkout`, `mercado-pago` e `send-notification` servidas localmente (`supabase functions serve` com `--env-file` de valores inválidos para as chaves externas, como o probe `03`)
- [ ] `*.supabase.co` bloqueado por rota no driver; GA4 interceptado por caminho (`**/g/collect*`)
- [ ] Credencial `admin-painel` (`QA_ADMIN_PAINEL_USUARIO` / `QA_ADMIN_PAINEL_SENHA`, o usuário de desenvolvimento do `supabase/seed.sql`) e `cliente-loja` (o e-mail em `QA_CLIENTE_LOJA_USUARIO`; entra por código no Mailpit) — a thread confere onde estão
- [ ] Massa M-01..M-10 preparada
- [ ] Driver de browser disponível — Playwright MCP headless, ou `playwright-cli` como fallback
- [ ] Para o CH-09: MCP do Claude Design (`claude-design`, `read_file`) acessível

## Critérios de saída

- **`pass`** — toda jornada `P0` chega ao objetivo, nenhum bug `critical`/`high` aberto, todos os charters rodaram
- **`partial`** — caso `P0`/`P1` `blocked` ou charter que não rodou
- **`fail`** — caso `P0` falhou, ou bug `critical`/`high` aberto
- Todo caso `e2e` + `missing`/`blocked` com o pedido de automação registrado

## Cobertura

| Critério | Fonte      | Resumo do critério | TC                          |
| -------- | ---------- | ------------------ | --------------------------- |
| CA-01.1 | prd | campo por adicional; vazio = sem desconto | TC-SMOKE-003, TC-JOURNEY-003, TC-FUNC-001 |
| CA-01.2 | prd | fora de 1–50 ou não inteiro recusado, também no banco | TC-FUNC-002, TC-INT-001 |
| CA-01.3 | prd | mudar só o percentual grava; sem mudança não escreve | TC-FUNC-003 |
| CA-01.4 | prd | gravar uma joia não muda outra | TC-FUNC-004 |
| CA-01.5 | prd | prévia do preço e faixa | TC-SMOKE-003, TC-JOURNEY-003, TC-FUNC-005 |
| CA-02.1 | prd | "de/por" e "N% a menos levando junto", também na lista | TC-SMOKE-001, TC-JOURNEY-003, TC-FUNC-006, TC-CFR-002 |
| CA-02.2 | prd | linha do desconto, total descontado, PIX sobre ele | TC-JOURNEY-001, TC-FUNC-007 |
| CA-02.3 | prd | a nota de que o desconto vale com a joia no pedido | TC-FUNC-008 |
| CA-02.4 | prd | bloco = sacola sem promoção nem cupom; com elas, o menor só na sacola | TC-SMOKE-002, TC-FUNC-009, TC-FUNC-010 |
| CA-02.5 | prd | barra fixa com o total descontado | TC-FUNC-011 |
| CA-03.1 | prd | percentual sobre a variação, a centavo por item | TC-JOURNEY-001, TC-FUNC-012 |
| CA-03.2 | prd | uma unidade de desconto por unidade da joia; linha mista | TC-FUNC-013, TC-FUNC-014 |
| CA-03.3 | prd | tirar a joia tira o desconto; frase da volta | TC-JOURNEY-002, TC-FUNC-015 |
| CA-03.4 | prd | peça pelo catálogo ganha o desconto | TC-FUNC-015 |
| CA-03.5 | prd | promoção ou bump: o menor da linha, sem somar | TC-FUNC-010, TC-FUNC-016 |
| CA-03.6 | prd | cupom acumula; o descartado só quando desconta | TC-JOURNEY-004, TC-FUNC-017 |
| CA-03.7 | prd | PIX depois do desconto casado | TC-JOURNEY-001, TC-FUNC-018 |
| CA-03.8 | prd | "de/por" e a mesma linha na gaveta e no checkout | TC-SMOKE-002, TC-FUNC-019 |
| CA-03.9 | prd | maior percentual entre joias; avulsa antes da lista | TC-FUNC-020 |
| CA-03.10 | prd | par recíproco pela marca; sem marca, a de menor preço | TC-FUNC-021 |
| CA-03.11 | prd | variação escondida ou não liberada sem desconto | TC-FUNC-022 |
| CA-03.12 | prd | a sacola relê o percentual | TC-JOURNEY-005, TC-FUNC-023 |
| CA-04.1 | prd | o pagamento recalcula pelo banco, ignora o navegador | TC-INT-002 |
| CA-04.2 | prd | sacola = checkout = cobrança, ao centavo, nos dois meios | TC-JOURNEY-001, TC-FUNC-024 |
| CA-04.3 | prd | coluna do teto; recusa só quando mais caro; as duas telas | TC-JOURNEY-005, TC-JOURNEY-006, TC-FUNC-025, TC-INT-003, TC-CFR-003 |
| CA-05.1 | prd | a linha guarda o cheio e o cobrado | TC-JOURNEY-001, TC-FUNC-026, TC-FUNC-027 |
| CA-05.2 | prd | confirmação, Minha conta e e-mail com o resumo que fecha; pedido antigo como está | TC-JOURNEY-004, TC-FUNC-026, TC-FUNC-027, TC-FUNC-028, TC-INT-004 |
| CA-05.3 | prd | painel e app com a mesma composição (a ordem do painel, Q-01) | TC-JOURNEY-007, TC-JOURNEY-008, TC-FUNC-030, TC-FUNC-031 |
| CA-05.4 | prd | mudar o desconto depois não muda o pedido feito | TC-FUNC-028, TC-FUNC-029 |
| CA-06.1 | prd | a Adesão conta pela marca "acompanha" | TC-FUNC-032 |
| CA-06.2 | prd | valor pago líquido e "desconto concedido" | TC-JOURNEY-007, TC-FUNC-033 |
| RNF-01 | prd | exibido = cobrado | TC-JOURNEY-001, TC-FUNC-009, TC-FUNC-024 |
| RNF-02 | prd | sem a configuração, tudo idêntico a hoje | TC-REG-001 |
| RNF-03 | prd | regra alcançável pelo Deno | TC-INT-003 (o `create-payment` sobe no runtime local) |
| RNF-04 | prd | feed e JSON-LD sem mudança | TC-INT-005 |
| RNF-05 | prd | 390 × 844 sem rolagem horizontal nem pílula quebrada | TC-UI-001, TC-UI-002, TC-UI-003 |
| RNF-06 | prd | tom memorial | TC-CFR-001 |
| RNF-07 | prd | migration aditiva, só local | — |

**Sem cobertura:**
- RNF-07 — não é comportamento que uma persona veja: é condição do ambiente (as migrations aplicadas só no local é
  critério de entrada) e o caráter aditivo está provado pela Validation (`compreJuntoDescontoSchema.test.ts`,
  `compreJuntoAdesaoSchema.test.ts`).

## Riscos

| Risco (para o usuário)  | Probabilidade        | Impacto na persona                                                   | Mitigação no plano                 |
| ----------------------- | -------------------- | -------------------------------------------------------------------- | ---------------------------------- |
| o bloco, a sacola e o pedido gravado dão valores diferentes | média | abala confiança · perde dado (cobrança errada) | CH-01, CH-02; TC-FUNC-009, TC-FUNC-024, TC-JOURNEY-001 |
| o desconto casado se soma à promoção ou ao bump | média | abala confiança (cobra menos que a regra) | CH-03; TC-FUNC-016, TC-FUNC-010 |
| o desconto fica depois de a joia sair da sacola | média | abala confiança | CH-02; TC-JOURNEY-002 |
| a cliente é cobrada a mais quando a dona baixa o percentual | baixa | perde dado (cobrança a mais) | CH-04; TC-JOURNEY-005, TC-INT-003 |
| a tela "o valor mudou" deixa a cliente sem saída | média | impede concluir | CH-04; TC-JOURNEY-005, TC-JOURNEY-006 |
| o resumo do pedido não fecha (Subtotal − descontos + frete ≠ Total) | média | abala confiança | CH-02, CH-03, CH-06; TC-FUNC-026, TC-FUNC-027 |
| o resumo da loja e do app em ordem diferente da do painel (a loja e o app hoje põem o Frete antes — `qa-report.md`) | alta | fricção · abala confiança (da dona, ao comparar) | Q-01; TC-JOURNEY-001, TC-JOURNEY-004, TC-FUNC-026, TC-FUNC-031, TC-INT-004 |
| a faixa que rola dentro das peças da lista não existe (desvio declarado da T02) | alta | fricção | Q-02; TC-FUNC-006, TC-UI-004 |
| o "de/por" e a linha mista quebram em 390 ou com fonte grande | alta | fricção | CH-01, CH-02, CH-08; TC-UI-001, TC-UI-002 |
| pedido antigo muda de cara no painel e no app | baixa | abala confiança (da dona) | CH-06; TC-FUNC-028 |
| cobrança real e cartão não alcançáveis no local | certa | — (limite da rodada) | o cobrado é o pedido gravado; cartão pelo teste de paridade do Dev |

## Perguntas

- 🔴 **Q-01** — **respondida em 2026-11-04 (página): C.** A ordem das linhas do resumo do **painel** do pedido vale:
  descontos e PIX antes do Frete. A loja (resumo do checkout, da confirmação, de Minha conta e do e-mail) e o app do
  ateliê passam a segui-la; a diferença de ordem nessas duas pontas vira bug; o painel passa como está. A régua é só
  a ordem: as linhas dos itens seguem a Design de cada ponta (D-38), e a loja e o app mostrarem o total da linha não
  é bug. Aplicado em: TC-FUNC-030, TC-FUNC-031, TC-JOURNEY-001, TC-JOURNEY-004, TC-JOURNEY-007, TC-JOURNEY-008,
  TC-FUNC-018, TC-FUNC-026, TC-INT-004, TC-UI-003, TC-UI-005; J-01, J-03, J-05, J-06; CH-02, CH-03, CH-06, CH-07,
  CH-09.
- 🔴 **Q-02** — **respondida em 2026-11-04 (página): B.** A faixa que rola dentro das peças de uma lista, do
  protótipo `Produto - Compre Junto com desconto.html`, é exigida neste WI; a diferença vira bug. Aplicado em:
  TC-FUNC-006, TC-UI-004, CH-01, CH-09 e na massa M-01 (3 ou mais correntes na lista, para a faixa rolar em 390).
- 🟡 O "cobrado" é o valor do pedido gravado depois do `create-payment` local (que recalcula e regrava antes de
  chamar o Mercado Pago); o QR do PIX não é condição de caso. Precedente: D-02 do QA do WI-01.
- 🟡 O cartão não é alcançável na tela local (Brick sem SDK e sem chave): no cartão se confere o total mostrado no
  checkout, e o "cobrado" do cartão fica com o teste de paridade do Dev. CA-04.2 fica coberto pela metade na tela.
- 🟡 Pedidos pagos para a Adesão (M-07) são gravados pela thread no banco local, como no QA do WI-01; nenhum caso
  depende de um pagamento aprovado de verdade.
- 🟡 A tela "o valor deste pedido mudou" só mostra os botões de contato se `store_settings` tiver WhatsApp e e-mail
  (o portão de `PolicyContact`); a massa M-08 os preenche.
- 🟡 Os protótipos do Claude Design não foram lidos pelo planner (o MCP não estava na sessão); textos e telas dos
  casos vêm da seção Design do `spec.md`, que os transcreve. O CH-09 lê a fonte; sem o MCP, ele é `not-run`.
- 🟡 Antes de a cliente escolher a variação de uma peça, o bloco aplica o percentual ao preço que ele já mostra hoje
  (a regra do WI-01); o "de/por" de CA-02.1 se confere com uma variação escolhida.
- 🟡 Numa lista com duas peças diferentes na sacola, só a de maior preço recebe o desconto (D-28), e no par
  recíproco com as duas marcadas recebe a de menor preço cheio (D-29): o plano usa essas decisões da corrida como
  esperado.
- 🟡 "Relê a configuração" (CA-03.12) se confere reabrindo a gaveta ou recarregando a página da sacola (D-30,
  `staleTime: 0`); não se espera atualização com a gaveta aberta.
- ✅ **Decidida no Gate 1 (2026-11-04):** a ordem da Q-01 vale para os resumos que têm a linha do Frete (checkout,
  confirmação, Minha conta, e-mail, app). A gaveta da sacola, sem o Frete, segue o rodapé do protótipo e mostra o
  valor da linha.
- 🟢 A peça acrescentada pelo catálogo, sem a marca "acompanha", mostra "N% a menos" sem o "Acompanha o …"; nenhuma
  fonte fixa essa frase, e o plano não a cobra literalmente.
- 🟢 O relatório de promoções passa a medir só o que a promoção desconta além do casado e da oferta (D-22): o número
  muda para pedidos novos sem critério deste WI que o diga à dona.
- 🟢 O rótulo do desconto do order bump no resumo virou "Desconto da oferta" (D-35), escolha da corrida; o protótipo
  não o desenha.
