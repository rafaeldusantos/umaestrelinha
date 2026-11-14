```json
{
  "schema": "qa-plan/v1",
  "title": "Plano de QA — Frete grátis por região (Sul e Sudeste) e a prévia de frete na sacola",
  "summary": {
    "total_cases": 30,
    "by_priority": { "P0": 12, "P1": 17, "P2": 1, "P3": 0 }
  },
  "acceptance_criteria_covered": 26,
  "strategy": [
    "Exploração por charter no browser real (agent-browser, playwright-cli ou Playwright MCP), uma persona por sessão, 390×844 primeiro e 1440×900 depois",
    "Cotação do Melhor Envio interceptada com corpo fixo (as functions locais rodam com chaves externas inválidas)",
    "E2E (Playwright) pedido à automação p/ fluxos P0/P1 determinísticos da sacola, do checkout e do painel",
    "Manual p/ medidas de layout (rodapé, alvos, fonte a 200 %), acessibilidade do ⓘ e conferência contra o protótipo v2"
  ],
  "cases": [
    { "id": "TC-FUNC-001", "title": "A sacola com peças oferece o CEP para calcular o frete e recusa CEP incompleto sem consultar", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-002", "title": "A sacola mostra as mesmas opções, preços e prazos que o checkout, sem nova consulta", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-003", "title": "A mais barata já vem escolhida e o Total da sacola é o mesmo do checkout", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-004", "title": "Escolher uma opção recolhe a lista numa linha, e tocar na linha reabre as opções", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-005", "title": "Sem CEP e abaixo da faixa, a faixa diz quanto falta e o ⓘ explica para onde o frete grátis vale", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-006", "title": "Com CEP de São Paulo ou do Rio Grande do Sul e a faixa alcançada, o frete grátis é liberado na sacola e no checkout com o mesmo Total", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-007", "title": "Finalizar Pedido abre a Entrega com o CEP, o endereço e a opção da sacola, esperando só o número", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-008", "title": "Com endereço salvo, o checkout respeita o CEP calculado na sacola", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-009", "title": "Mudar a sacola depois do cálculo refaz a cotação com o mesmo CEP e mantém a escolha com o preço novo", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-010", "title": "Quando a consulta do frete falha ou não traz opção, a sacola avisa e deixa seguir, sem inventar frete", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-011", "title": "Com CEP do Rio Grande do Sul, a sacola oferece a retirada no escritório sem marcá-la", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-012", "title": "Sem CEP e acima da faixa, a sacola diz \"Frete grátis para Sul e Sudeste\" e nunca \"liberado\"", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-013", "title": "Com CEP da Bahia e a faixa alcançada, a sacola informa que o frete grátis é só para Sul e Sudeste e soma o frete, como o checkout", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-014", "title": "Trocar o CEP de São Paulo para a Bahia no checkout desfaz o frete grátis e o Total sobe, sem recarregar", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-015", "title": "Com o cupom de frete grátis, toda opção sai grátis em qualquer região, e a faixa da região some", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-016", "title": "Com CEP fora da região, a sacola não sugere peças para \"completar o frete grátis\"", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-017", "title": "Pagar um pedido montado não lê nem apaga o CEP da sacola", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-018", "title": "O painel recusa o frete grátis ligado sem região, e Sul + Sudeste salvo vale na loja sem deploy", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-019", "title": "Com as cinco regiões marcadas o frete grátis funciona como antes, e com o interruptor desligado nada sai grátis", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-020", "title": "A barra de confiança, o aviso de entrada e a página do produto dizem a região do frete grátis, e a página do produto não zera frete", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-INT-001", "title": "O pedido montado com entrega na Bahia e a faixa alcançada nasce com o frete cobrado", "priority": "P0", "type": "integration", "automation": { "target": "integration", "status": "missing" } },
    { "id": "TC-JOURNEY-001", "title": "Luana calcula o frete na sacola pelo celular e chega ao checkout com o frete grátis e o mesmo Total", "priority": "P0", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-002", "title": "Cida, de Salvador, descobre na sacola que o frete grátis não vale para ela e paga o mesmo frete no checkout", "priority": "P0", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-003", "title": "Teresa, com a fonte grande, escolhe entre entrega e retirada indo e voltando da sacola, e o checkout guarda a escolha", "priority": "P1", "type": "journey", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-UI-001", "title": "A faixa do frete grátis segue a v2 nos quatro desenhos, com o ⓘ", "priority": "P1", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-UI-002", "title": "O rodapé da sacola segue a v2 compacta: CEP numa linha, opções, linha recolhida, cupom, totais sem nota e botão de 48 px", "priority": "P1", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-UI-003", "title": "A Entrega do checkout recebendo o CEP da sacola segue o protótipo", "priority": "P2", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-CFR-001", "title": "No celular, o rodapé da sacola com o frete escolhido cabe em até 270 px sem nota abaixo do Total, e a 200 % rola por dentro sem cortar o CEP nem o valor", "priority": "P1", "type": "cfr", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-CFR-002", "title": "Em 390 e em 1440, a sacola com o frete não rola de lado, todo alvo tem 44 px e o rodapé fica na tela", "priority": "P1", "type": "cfr", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-CFR-003", "title": "O ⓘ do frete grátis abre com o ponteiro, o toque e o teclado, fecha com Esc e com toque fora, e o balão não passa da largura da gaveta", "priority": "P1", "type": "cfr", "automation": { "target": "manual", "status": "na" } }
  ]
}
```

# Plano de QA — 99 · Frete grátis por região (Sul e Sudeste) e a prévia de frete na sacola

**Work Item:** 99 (feature; absorve o WI 97) · **Escopo:** completo · **Foco:** —
**Versão do plano:** 1 · **Escrito em:** 2026-11-14 · **Modo:** criar
**Gate 1:** aprovado em 2026-11-14 (árbitro, política do humano)

## Resumo

- **Valor para o usuário:** a cliente calcula o frete na própria sacola, vê o Total com a entrega e chega ao checkout
  com o CEP, o endereço e a forma de envio já preenchidos. Na Black Friday, o frete grátis a partir de R$ 450 vale só
  para Sul e Sudeste: a sacola diz, antes do checkout, se ele vale para o CEP dela — e nunca promete o que o checkout
  desfaz. A dona escolhe as regiões no painel, e a loja obedece sem deploy.
- **Maior risco para o usuário:** uma superfície dizer "liberado" ou zerar o frete para um CEP fora da região (ou sem
  CEP) e o checkout cobrar — ou o contrário, a sacola e o checkout mostrarem Totais diferentes.
- **Contagens:** personas 4 · jornadas 5 · charters 8 (CFR 1 · design-check 1) · TC 30 (P0 12 · P1 17 · P2 1 · P3 0)
- **Automação:** e2e 22 (missing 22 · existing 0 · blocked 0) · integration 1 · manual 7

**Tamanho:** grande — 26 critérios de aceite (CA-01..CA-13 do PRD 97, CA-14..CA-26 do PRD 99) e 7 telas na fonte
(gaveta da sacola, checkout › Entrega e Resumo, página do produto, Home/barra de confiança, aviso de login, pedido
montado, painel › Frete e Material), em três áreas (loja, painel, edge functions). Teto: 3–5 personas, 3–7 jornadas,
até 6 exploratórios + `cfr` + `design-check`, 35 TC. O plano usa 4 · 5 · 6 + 2 · 30. **Os seis exploratórios** saem de
seis áreas de risco distintas (prévia dentro da região, fora da região, ida e volta com conta, falha da cotação,
painel, pedido montado no servidor); o CH-04 tem 30 minutos porque a área é estreita.

## Escopo

**Dentro:** a gaveta da sacola (faixa v2, ⓘ, CEP, opções, linha recolhida, cupom, totais, botão), o checkout recebendo
da sacola (Entrega e Resumo) e com a região, a página do produto, a barra de confiança e o aviso de login quando
anunciam o frete grátis, o pedido montado (`/pedido-montado`) com a região, e o painel › Configurações › Frete e
Material (regiões do frete grátis). Todos os CA-01..CA-26.

**Fora:** (da costura) frete grátis por estado ou faixa escolhida à mão; faixa de valor por região; o desconto de
campanha (WI 102), o perfil de cores (WI 100) e a faixa de avisos (WI 101); mudar a cotação do Melhor Envio; levar o
CEP da página do produto à sacola; lembrar o CEP entre visitas; estimativa de frete sem CEP; `payment/**`. Também fora,
como dívida registrada: a conferência do frete no servidor no pedido comum (Pergunta 2 do PRD 99) e o pedido montado
zerar qualquer opção escolhida (PR-11). Pagar de verdade (PIX ou cartão) está fora da rodada inteira.

## Fontes

| Fonte      | Caminho                             | Uso                                        |
| ---------- | ----------------------------------- | ------------------------------------------ |
| PRD        | `prd.md` (99, r1) e `../97-previa-de-frete-na-sacola/prd.md` (absorvido) | critérios de aceite — a régua da cobertura (CA-01..CA-26) |
| Costura    | `spec.md` (Decisões D-01..D-23)     | o que o Dev entendeu e o que ficou fora; D-11, D-12, D-13, D-17, D-21 decidem esperados |
| Fontes de design | `claude_design` · https://claude.ai/design/p/4abe021d-d77e-4fe7-affd-524180315fa3?file=Black+Friday+-+Sacola+v2.html · `link` · https://claude.ai/artifact/2yUJyqwYr6tipVWQEh8xdd · `link` · https://claude.ai/code/artifact/41e4046b-6433-4e30-9670-f714f2dc2b75 | telas da gaveta v2 e do checkout; charter `design-check` (CH-07) |
| Insumos    | `item.md` › Insumos (medidas do protótipo em 390 × 844; arquivos das superfícies) | régua de apoio do rodapé (CA-23) e as superfícies que anunciam |
| Validation | `qa-report.md` (PASS)               | CA-13, CA-22 e CA-23 deixados para o navegador — o CFR os mede |
| Projeto    | `PROJECT.md`; `CLAUDE.md` raiz, `apps/store`, `apps/backoffice`, `supabase` | ambiente e regras da execução |

## Personas

Detalhe em [personas.md](personas.md).

| ID     | Nome   | Arquétipo   | Objetivo    | Conta                      | Jornadas   |
| ------ | ------ | ----------- | ----------- | -------------------------- | ---------- |
| PER-01 | Luana  | mobile (novo usuário) | saber o frete e o frete grátis na sacola e chegar ao checkout sem redigitar | `anonima` | J-01 |
| PER-02 | Cida   | ocasional, fora da região | entender antes de pagar que o frete grátis não vale para Salvador | `cliente-salvador` | J-02, J-04 |
| PER-03 | Adri   | avançado (a dona) | configurar R$ 450 só para Sul e Sudeste e ver valendo na loja | `admin-loja` | J-03 |
| PER-04 | Teresa | tecnologia assistiva (fonte 200 %, teclado) | escolher entrega ou retirada sem perder nada entre sacola e checkout | `cliente-com-endereco` | J-05 |

**Não cobertas:** usuário em recuperação (feature nova, sem falha anterior a reconferir); leitor de tela real.

## Jornadas

| ID   | Jornada (pelo valor) | Persona principal · secundária | Prioridade | Abandono/erro | Cruza fronteira      | Arquivo                         |
| ---- | -------------------- | ------------------------------ | ---------- | ------------- | -------------------- | ------------------------------- |
| J-01 | Ver o frete na sacola, com o frete grátis liberado, e seguir sem redigitar o CEP | PER-01 · PER-04 | P0 | J-01a, J-01b, J-01c | sim: cotação (Melhor Envio), ViaCEP | [J-01](journeys/J-01-ver-o-frete-na-sacola-e-seguir-sem-redigitar-o-cep.md) |
| J-02 | Saber antes de pagar que o frete grátis não vale para Salvador, e pagar o frete certo | PER-02 · PER-01 | P0 | J-02a, J-02b, J-02c | sim: cotação, ViaCEP | [J-02](journeys/J-02-saber-que-o-frete-gratis-nao-vale-fora-da-regiao.md) |
| J-03 | Ligar o frete grátis só para Sul e Sudeste e ver valendo na loja | PER-03 · — | P0 | J-03a, J-03b | não | [J-03](journeys/J-03-configurar-a-campanha-sul-e-sudeste-no-painel.md) |
| J-04 | Pagar o pedido montado pela Adri, com entrega em Salvador | PER-02 · — | P0 | J-04a, J-04b | sim: functions `checkout`, `mercado-pago` | [J-04](journeys/J-04-pagar-o-pedido-montado-com-entrega-fora-da-regiao.md) |
| J-05 | Escolher entre entrega e retirada com a fonte grande, indo e voltando da sacola | PER-04 · PER-02 | P1 | J-05a, J-05b | sim: cotação, ViaCEP, login (Mailpit) | [J-05](journeys/J-05-escolher-entre-entrega-e-retirada-com-fonte-grande.md) |

## Charters

Ordem de execução — a Fase 2 despacha nesta ordem e, com o `agent-browser` ou o `playwright-cli`, por **Lote**: no
máximo 3 charters, nunca dois da mesma conta ou da mesma massa, e o CFR sozinho, por último. Charter com outro
**Driver** roda sozinho. Cada charter com no máximo um TC a cada 5 ações do time-box.

| Ordem | Lote | ID    | Missão                               | Persona   | Conta   | Massa                    | Driver | Tour   | Time-box | Prioridade | TC             | Arquivo                           |
| ----- | ---- | ----- | ------------------------------------ | --------- | ------- | ------------------------ | ------ | ------ | -------- | ---------- | -------------- | --------------------------------- |
| 1 | L1 | CH-05 | configurar as regiões no painel e ver cada salvar valendo na loja, deixando ligado · R$ 450 · Sul + Sudeste | PER-03 | `admin-loja` | **altera** `store_settings.shipping` (massa de toda a rodada) | — | Multi-Tab | 60 min | P0 | TC-FUNC-018, TC-FUNC-019 | [CH-05](charters/CH-05-regioes-do-frete-gratis-no-painel.md) |
| 2 | L2 | CH-01 | a prévia de frete dentro da região: frete, "liberado" e o checkout recebendo o CEP | PER-01 | `anonima` | só lê settings e catálogo; sacola própria | — | Feature | 60 min | P0 | TC-FUNC-001..007, TC-JOURNEY-001 | [CH-01](charters/CH-01-previa-de-frete-na-sacola-dentro-da-regiao.md) |
| 3 | L2 | CH-02 | achar jeito de prometer ou conceder frete grátis fora do Sul e do Sudeste | PER-02 | `cliente-salvador` | só lê settings, cupom `QAFRETE`, catálogo; sacola própria | — | Money | 60 min | P0 | TC-FUNC-012..016, TC-JOURNEY-002 | [CH-02](charters/CH-02-frete-gratis-fora-da-regiao.md) |
| 4 | L2 | CH-03 | ida e volta entre sacola e checkout com conta, retirada e fonte a 200 % | PER-04 | `cliente-com-endereco` | só lê settings e o endereço salvo; sacola própria | — | Back-Button | 60 min | P1 | TC-FUNC-008, TC-FUNC-009, TC-FUNC-011, TC-FUNC-020, TC-JOURNEY-003 | [CH-03](charters/CH-03-ida-e-volta-entre-sacola-e-checkout-com-conta.md) |
| 5 | L3 | CH-06 | o pedido montado para Salvador nasce com o frete, e não mexe na sacola | PER-02 | `cliente-salvador` | **consome** o link de pedido montado; cria um pedido `pending` | — | Money | 60 min | P0 | TC-INT-001, TC-FUNC-017 | [CH-06](charters/CH-06-pedido-montado-fora-da-regiao.md) |
| 6 | L3 | CH-04 | a cotação que falha ou não traz opção, sem frete inventado | PER-01 | `anonima` | só lê; sacola própria | — | Network | 30 min | P1 | TC-FUNC-010 | [CH-04](charters/CH-04-cotacao-que-nao-responde.md) |
| 7 | L4 | CH-07 | design-check — gaveta v2 (faixa e rodapé) e checkout › Entrega · `Black Friday - Sacola v2.html` e `Sacola - Prévia de frete.html` | PER-01 | `anonima` | só lê | — | — | 60 min | P1 | TC-UI-001, TC-UI-002, TC-UI-003 | [CH-07](charters/CH-07-design-check-gaveta-v2-e-checkout.md) |
| 8 | L5 | CH-08 | CFR — J-01, J-02 (rodapé, alvos, fonte a 200 %, ⓘ) | PER-01 | `anonima` | só lê | — | — | 45 min | P1 | TC-CFR-001, TC-CFR-002, TC-CFR-003 | [CH-08](charters/CH-08-cfr-sacola-e-checkout.md) |

**Por que os lotes ficam assim:** o CH-05 altera a configuração que toda sessão da loja lê, então roda sozinho e
primeiro, e termina com ligado · R$ 450,00 · Sul + Sudeste — a configuração que os outros sete charters esperam. Ele
não pode rodar de novo durante a rodada sem parar os demais. O CH-07 não divide lote com o CH-04 por serem os dois
`anonima`. O CH-08 roda sozinho, por último.

## Ambiente da execução

O que vale para toda sessão da Fase 2 — vai no campo `ambiente` do briefing, porque o explorer e o retester rodam sem
as instruções do projeto. Fontes: `PROJECT.md` › Ambiente local, `CLAUDE.md` (raiz), `apps/store/CLAUDE.md`,
`apps/backoffice/CLAUDE.md`, `supabase/CLAUDE.md`.

- **App:** servido do worktree `/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-99` —
  loja em `http://localhost:8082` (`pnpm dev:store`), painel em `http://localhost:8083` (`pnpm dev:backoffice`). O
  worktree **não tem** `apps/*/.env`: o dev server sobe com `VITE_SUPABASE_URL=http://127.0.0.1:54441` e a chave
  publicável do Supabase local na env (sem elas a página não abre). Supabase local na faixa 54440–54449: API **54441**,
  Postgres 54442, Studio 54443, **Mailpit 54444**. As edge functions (`checkout`, `mercado-pago`, `melhor-envio`) são
  servidas com `supabase functions serve --env-file <arquivo>` em que **toda chave externa tem valor inválido**
  (Melhor Envio, Mercado Pago, Resend, Anthropic) — o `config.toml` completa com o `.env` da raiz o que o arquivo não
  traz; nunca use o `.env` da raiz.
- **Cotação do frete:** com a chave do Melhor Envio inválida, a function não cota. Toda sessão que calcula frete
  intercepta `**/functions/v1/melhor-envio*` com `network route` respondendo um corpo fixo (status 200,
  `Content-Type: application/json`):
  - **fixture A** — `[{"id":1,"name":"PAC","company":"Correios","price":"21.40","delivery_time":8,"delivery_range":{"min":6,"max":8}},{"id":2,"name":"SEDEX","company":"Correios","price":"38.90","delivery_time":3,"delivery_range":{"min":2,"max":3}}]`
  - **fixture B** (o preço novo depois de mudar a sacola) — `[{"id":1,"name":"PAC","company":"Correios","price":"24.70","delivery_time":8,"delivery_range":{"min":6,"max":8}},{"id":2,"name":"SEDEX","company":"Correios","price":"44.10","delivery_time":3,"delivery_range":{"min":2,"max":3}}]`
  - **sem opção** — `[]`; **falha** — `network route … --abort`
  - A resposta é a mesma para qualquer CEP: o que muda por CEP é a região e a retirada, não o preço. Preço e prazo da
    fixture não são achado. O "calculando" (resposta lenta) não se provoca com `network route` — vai a Fora da
    cobertura.
- **A interceptação precisa do CORS (achado do CH-05):** no `agent-browser`, a resposta do `network route` sai sem
  `Access-Control-Allow-Origin`, e a loja (8082 → 54441) a recusa ("Não consegui consultar o frete agora…"). Toda
  sessão que calcula frete usa `playwright-cli -s=<CH-NN>` com
  `route "**/functions/v1/melhor-envio*" --body <fixture> --content-type application/json --header "Access-Control-Allow-Origin: *" --header "Access-Control-Allow-Headers: *"`
  (a pré-requisição `OPTIONS` também precisa das mesmas linhas). Sem esse cabeçalho, a falha de cotação é do
  ambiente, não achado.
- **Bloquear:** `https://*.supabase.co/**` (o projeto hospedado — o banco local tem imagens apontando para lá; imagem
  quebrada não é achado) e `**/g/collect*` (GA4, por caminho, nunca por domínio). Permitido: `viacep.com.br` (a busca
  pública do endereço pelo CEP; sem rede, a cidade não aparece — comportamento previsto).
- **E-mail de dev:** Mailpit em `http://127.0.0.1:54444` — o login da loja é por código de 6 dígitos, lido ali.
- **Viewport alvo:** 390 × 844 primeiro (o mobile é o caso principal da loja); depois 1440 × 900. Fonte a 130 % e
  200 % onde o caso pede, simulada pela fonte da raiz do documento (`document.documentElement.style.fontSize`); o que
  é `px` fixo não cresce — limitação conhecida.
- **Nunca:** nada em produção (nenhum comando `--linked`, nenhum host hospedado, nenhum push); `supabase stop --all`
  (derruba as instâncias de outros projetos); `supabase db reset` (apaga o catálogo local); digitar cartão ou concluir
  pagamento — a única sessão que segue ao pagamento é o CH-06, com o Mercado Pago de chave inválida; mudar
  `store_settings` fora do CH-05; mudar cupom, produto ou pedido pelo painel fora do que o charter diz.
- **De pé nesta rodada (Fase 2, 2026-11-14):** loja `http://localhost:8082` e painel `http://localhost:8083`
  servidos do worktree; functions servidas do worktree com `--env-file` de chaves externas inválidas
  (`/Users/rafael.santos/.claude/jobs/cb4d7b5a/tmp/qa99/functions.env`). Credenciais e o link do pedido montado:
  `source /Users/rafael.santos/.claude/jobs/cb4d7b5a/tmp/qa99/credenciais.env` (define `QA_ADMIN_LOJA_USUARIO`,
  `QA_ADMIN_LOJA_SENHA`, `QA_CLIENTE_SALVADOR_USUARIO`, `QA_CLIENTE_COM_ENDERECO_USUARIO` e `QA_PEDIDO_MONTADO_LINK`);
  nunca escreva os valores no log. Contas: `qa99.salvador@…` (Marina Salvador, sem endereço salvo) e
  `qa99.portoalegre@…` (Helena Porto, endereço salvo Rua dos Andradas, 1234, apto 501, Centro Histórico, Porto
  Alegre/RS, 90010-000). O pedido montado é a proposta P-0046 (1 peça de R$ 490,00), para a conta de Salvador.
- **De pé na rodada 2 (confirmação, 2026-11-14):** as portas 8082 e 8083 estão ocupadas por servidores de **outro
  checkout** (não são o código do WI e não podem ser derrubados). A loja do worktree está em
  **`http://localhost:8092`** (use esta URL; `8082` serve outro código); o painel não sobe nesta rodada (nenhum charter
  de confirmação o usa). Functions servidas do worktree com o mesmo `--env-file`. Credenciais: o mesmo `source` acima.
  A configuração segue ligada · R$ 450,00 · Sul + Sudeste (conferida no banco). A **falha** da cotação no
  `playwright-cli` não tem `--abort`: use `playwright-cli -s=<sessão> run-code` com
  `await page.context().route('**/functions/v1/melhor-envio*', r => r.abort())`.
- **Uploads:** não há.
- **Massa:**
  - `store_settings.shipping` — **o CH-05 altera**; ao terminar: interruptor ligado, faixa R$ 450,00, regiões Sul e
    Sudeste. Todos os outros só leem e esperam essa configuração. Ao fim da rodada, a thread decide se volta às cinco.
  - `store_settings.material` — retirada ligada e endereço do escritório completo (rua, bairro, cidade, UF): só leitura
    (CH-03).
  - Catálogo local — peças ativas com estoque para montar sacolas abaixo e acima de R$ 450: só leitura.
  - Cupom `QAFRETE` (frete grátis, sem pedido mínimo, ativo e sem validade, já no banco local — o cupom de frete grátis do `seed.sql` não existe no banco local; troca registrada na Fase 2): só leitura (CH-02).
  - Contas: `admin-loja` (o admin de desenvolvimento do `supabase/seed.sql`, seção 5 — `QA_ADMIN_LOJA_USUARIO` /
    `QA_ADMIN_LOJA_SENHA`); `cliente-salvador` e `cliente-com-endereco` (login por código no Mailpit —
    `QA_CLIENTE_SALVADOR_USUARIO`, `QA_CLIENTE_COM_ENDERECO_USUARIO`; não há senha). A `cliente-com-endereco` tem
    endereço salvo em Porto Alegre/RS, 90010-000, com número.
  - Um link de `/pedido-montado` com peças ≥ R$ 450, criado pela thread antes da rodada (P-0046, pela function `order-proposals`) — **consumido pelo CH-06**.
  - Sacola e rascunho do checkout vivem no `sessionStorage` da sessão de cada charter: nenhum charter lê o de outro.

## Estratégia

- **Como se exercitam as jornadas:** um charter por área de risco, uma persona por sessão, no browser real
  (`agent-browser`, ou `playwright-cli` / Playwright MCP como fallback); os `TC-*` são conferidos dentro do charter
  que os cita.
- **CFR:** usabilidade, acessibilidade, performance percebida (só o retorno visual), compatibilidade e recuperação de
  erro, sobre J-01 e J-02 — a gaveta e o checkout são a superfície inteira da mudança. As medidas que a Validation não
  pôde fazer (CA-13, CA-22, CA-23) estão no CFR.
- **Conferência visual:** gaveta v2 (faixa nos quatro desenhos, ⓘ, rodapé) contra `Black Friday - Sacola v2.html`, e o
  checkout › Entrega contra `Sacola - Prévia de frete.html`, só em 390 (a largura dos frames).
- **Onde termina o simulado:** a cotação do Melhor Envio é interceptada (preços e prazos fixos); o Mercado Pago está
  com chave inválida (nenhum pagamento conclui); a prova de que o **servidor** cobra o frete no pedido montado é dos
  testes de handler do Dev — a sessão confere o pedido que nasce. A conferência do frete no servidor no pedido comum
  não existe (dívida, fora). Leitor de tela real e celular Android real ficam fora.
- **Automação:** 22 casos `e2e` + `missing` ficam como pedido de automação E2E (exigem a mesma interceptação da
  cotação e restaurar `store_settings` depois dos casos do painel); 1 `integration` fica com o Dev; nenhum `blocked`.

### Suíte smoke

| Ordem | TC   | Jornada | O que prova                            |
| ----- | ---- | ------- | -------------------------------------- |
| 1 | TC-FUNC-018 | J-03 | a campanha se configura no painel e vale na loja |
| 2 | TC-FUNC-005 | J-01 | a faixa sem CEP diz quanto falta e para onde vale |
| 3 | TC-FUNC-006 | J-01 | CEP da região com a faixa alcançada: liberado, com o mesmo Total no checkout |
| 4 | TC-FUNC-013 | J-02 | CEP fora da região: frete cobrado na sacola e no checkout |

## Critérios de entrada

- [ ] Validation do Dev com `Status: PASS` no `qa-report.md` — ok (2026-11-14)
- [ ] Loja e painel do worktree rodando em 8082 e 8083, com as `VITE_*` do Supabase local na env
- [ ] Supabase local de pé (`supabase status`), com a migration `20261130150000_99-frete-gratis-por-regiao.sql`
      aplicada (só no local)
- [ ] Edge functions servidas com `--env-file` de chaves externas inválidas (`POST /functions/v1/<nome>` com corpo
      vazio responde 400)
- [ ] App acessível num ambiente com paridade de produção (auth real por código, cookies habilitados) — o dev server
      não é o build; registrado como desvio
- [ ] Credencial para cada persona que precisa de conta — `admin-loja` no `seed.sql`; as duas clientes por e-mail e
      código no Mailpit; a thread confere onde estão os e-mails
- [ ] Massa: endereço salvo da `cliente-com-endereco`; endereço do escritório e retirada ligada; cupom `QAFRETE`
      ativo; peças com estoque para sacolas abaixo e acima de R$ 450; o link de pedido montado para o CH-06
- [ ] Driver de browser disponível — `agent-browser` 0.39+ (com `network route`), ou `playwright-cli` / Playwright MCP
      headless como fallback
- [ ] Com charter `design-check`: o MCP do Claude Design com acesso ao projeto `4abe021d-…` (e ao `69224d8a-…`)

## Critérios de saída

- **`pass`** — toda jornada `P0` chega ao objetivo, nenhum bug `critical`/`high` aberto, todos os charters rodaram
- **`partial`** — caso `P0`/`P1` `blocked` ou charter que não rodou
- **`fail`** — caso `P0` falhou, ou bug `critical`/`high` aberto
- Todo caso `e2e` + `missing`/`blocked` com o pedido de automação registrado

## Cobertura

| Critério | Fonte      | Resumo do critério | TC                          |
| -------- | ---------- | ------------------ | --------------------------- |
| CA-01 | prd (97) | campo de CEP e "Calcular" com peças; sem, com a sacola vazia | TC-FUNC-001, TC-UI-002 |
| CA-02 | prd (97) | CEP com menos de 8 dígitos: "CEP inválido", sem consulta | TC-FUNC-001 |
| CA-03 | prd (97) | mesmas opções, preços e prazos que o checkout; sem nova consulta | TC-FUNC-002 |
| CA-04 | prd (97) | a mais barata marcada; Total da gaveta = Total do checkout | TC-FUNC-003, TC-JOURNEY-001 |
| CA-05 | prd (97) | escolher recolhe numa linha; tocar reabre | TC-FUNC-004, TC-UI-002 |
| CA-06 | prd (97) | faixa alcançada: só a mais barata grátis; desligado: nenhuma; cupom: todas | TC-FUNC-006, TC-FUNC-015, TC-FUNC-019 |
| CA-07 | prd (97) | CEP do RS: "Envio a domicílio" e "Retirar em"; retirada nunca marcada | TC-FUNC-011, TC-JOURNEY-003 |
| CA-08 | prd (97, com M-06 do 99) | nenhuma nota abaixo do Total, em nenhum estado | TC-CFR-001, TC-UI-002 |
| CA-09 | prd (97) | o checkout abre com CEP, endereço, opção, "Trazido da sua sacola" e foco no Número | TC-FUNC-007, TC-FUNC-008, TC-JOURNEY-001, TC-UI-003 |
| CA-10 | prd (97) | mudar a quantidade recota com o mesmo CEP e mantém a opção | TC-FUNC-009 |
| CA-11 | prd (97) | falha: mensagem, "Tentar de novo", Total sem frete, sem "Frete padrão" | TC-FUNC-010 |
| CA-12 | prd (97) | o pedido montado não lê nem apaga o CEP da sacola | TC-FUNC-017 |
| CA-13 | prd (97) | 390 e 1440: sem rolagem horizontal, alvos de 44 px, rodapé na tela | TC-CFR-002 |
| CA-14 | prd (99) | sem CEP, abaixo: "Faltam R$ X", barra, ⓘ com a regra; nenhum "liberado" | TC-FUNC-005, TC-UI-001 |
| CA-15 | prd (99) | sem CEP, acima: destaque em ouro "Frete grátis para Sul e Sudeste", nenhum "liberado" | TC-FUNC-012, TC-JOURNEY-002, TC-UI-001 |
| CA-16 | prd (99) | SP ou RS acima: "liberado", a mais barata "Grátis" riscada, mesmo Total no checkout | TC-FUNC-006, TC-JOURNEY-001, TC-UI-001 |
| CA-17 | prd (99) | BA acima: "só para Sul e Sudeste", sem barra, frete somado na gaveta e no checkout | TC-FUNC-013, TC-JOURNEY-002, TC-UI-001 |
| CA-18 | prd (99) | trocar SP → BA no checkout: deixa de ser grátis, Total sobe, sem recarregar | TC-FUNC-014 |
| CA-19 | prd (99) | com as cinco regiões, comportamento idêntico ao de hoje | TC-FUNC-019 |
| CA-20 | prd (99) | painel recusa ligado sem região; Sul + Sudeste vale sem deploy | TC-FUNC-018 |
| CA-21 | prd (99) | pedido montado fora da região com faixa alcançada: o servidor cobra o frete | TC-INT-001 |
| CA-22 | prd (99) | o ⓘ: ponteiro, toque, toque fora, Esc, rótulo, 44 px, balão dentro da gaveta em 390 | TC-CFR-003 |
| CA-23 | prd (99) | 390 × 844: rodapé ≤ 270 px a 100 %, sem nota, sem rolagem; a 200 % rola sem cortar | TC-CFR-001 |
| CA-24 | prd (99) | barra de confiança, página do produto e aviso de login com a região; produto sem zerar | TC-FUNC-020 |
| CA-25 | prd (99) | cupom de frete grátis fora da região: todas "Grátis", sem a faixa da região | TC-FUNC-015 |
| CA-26 | prd (99) | CEP fora da região: sem "Complete o frete grátis" | TC-FUNC-016 |

**Sem cobertura:** nada.

## Riscos

| Risco (para o usuário)  | Probabilidade        | Impacto na persona                                                   | Mitigação no plano                 |
| ----------------------- | -------------------- | -------------------------------------------------------------------- | ---------------------------------- |
| Uma superfície diz "liberado" ou zera o frete sem CEP ou fora da região, e o checkout cobra | média | abala confiança | CH-02 (TC-FUNC-012, 013, 014), TC-FUNC-020 |
| Total da sacola diferente do checkout | média | abala confiança | TC-FUNC-003, TC-FUNC-006, TC-FUNC-013, as duas jornadas P0 |
| O pedido montado concede frete grátis para fora da região | baixa | perde dinheiro da dona | CH-06, TC-INT-001 (e os testes de handler do Dev) |
| A dona grava "ligado sem região" ou a loja não reflete o salvar | baixa | impede concluir (campanha sem efeito) | CH-05, TC-FUNC-018 |
| O rodapé da gaveta toma a tela, ou corta o valor a 200 % | média | fricção | CH-08 (TC-CFR-001, 002), CH-03 |
| O balão do ⓘ estoura a gaveta no celular (portal sobre diálogo modal) | média | fricção | TC-CFR-003 |
| O checkout troca o CEP da sacola pelo endereço salvo | baixa | fricção | TC-FUNC-008 |
| A cotação real do Melhor Envio não é exercitada (interceptada) | alta | — (limite da rodada) | declarado em Onde termina o simulado; a prova da cotação real é do probe do Dev |

Persona não coberta: usuário em recuperação (feature nova).

## Perguntas

- 🔴 nada.
- 🟡 A cotação do Melhor Envio é obtida por interceptação com corpo fixo (fixtures A e B), porque as functions locais
  rodam com chave inválida. Se houver um arquivo de env com token **sandbox** do Melhor Envio só para o local, os
  charters podem usá-lo — nenhum TC muda.
- 🟡 A massa que nenhum charter cria fica com a thread antes da Fase 2: o endereço salvo da `cliente-com-endereco`
  (Porto Alegre/RS, 90010-000), o link de pedido montado (≥ R$ 450) para o CH-06, e o cupom `QAFRETE` ativo. Sem
  eles, TC-FUNC-008, TC-INT-001/TC-FUNC-017 e TC-FUNC-015 ficam `blocked`.
- 🟡 CA-08 se lê com a M-06 do PRD 99: "nenhuma nota abaixo do Total" em qualquer estado (a nota "Frete calculado com
  o seu CEP — aqui ou no checkout." do PRD 97 saiu).
- 🟡 CA-18 se cumpre como a D-12: trocar o CEP desfaz a escolha; a mais barata deixa de ser grátis e, escolhida, o
  Total sobe.
- 🟡 CA-21 ("provado no servidor") fica, nesta rodada, como o pedido que nasce com o frete no Total; a prova no
  servidor é a dos testes de handler do Dev (`proposal.test.ts`, `proposalCharge.test.ts`). O PIX não conclui no
  local (chave inválida) e isso não é achado.
- 🟡 O texto da barra de confiança é o entregue ("… grátis acima de R$ 450 · para Sul e Sudeste", premissa da T07); o
  caso confere a região lida da configuração, não o literal "R$ 450,00" do exemplo do PRD.
- 🟡 O cabeçalho das opções segue a v2 ("Frete para 01310-100 · São Paulo/SP"), não o PRD 97 (sem cidade) — decisão da
  costura.
- 🟡 A fonte do sistema a 200 % é simulada pela fonte da raiz do documento; elementos em `px` fixo não crescem.
- 🟢 O nome do serviço está escrito de dois jeitos no checkout ("PAC · Correios" no cartão, "Correios PAC" no resumo) —
  dívida registrada na Validation; os charters não abrem achado.
- 🟢 O pedido comum ainda aceita o frete que o navegador manda (Pergunta 2 do PRD 99): com a região, alguém fora do Sul
  e do Sudeste poderia forjar frete zero. Fora deste item, família da `BL-030`.
- 🟢 A faixa de CEP 78900–78999 foi atribuída ao Norte sem fonte dos Correios no repositório; não toca a campanha.
- 🟢 As regiões nascem com as cinco marcadas: Sul + Sudeste é passo de operação da dona em Frete e Material antes da
  Black Friday.
