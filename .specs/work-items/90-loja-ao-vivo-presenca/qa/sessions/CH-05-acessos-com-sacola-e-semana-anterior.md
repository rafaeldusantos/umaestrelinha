# Sessão CH-05 · Acessos: "Com sacola" e a semana anterior

| Campo       | Valor |
| ----------- | ----- |
| Charter     | `test-plans/charters/CH-05-acessos-com-sacola-e-semana-anterior.md` · exploratório · P0 |
| Status      | done |
| Persona     | PER-01 Adri · conta: `admin-atelie` (credencial do arquivo de credenciais do QA local, nunca o valor) · estímulo: duas clientes `anonima` na loja, em contextos isolados separados |
| Tour · modo | Feature · por técnica (valor limite) |
| Rodada      | exploração |
| Orçamento   | 49 ações de browser de 50 |
| Ambiente    | app http://localhost:8084 (dev) · loja http://localhost:8082 (build, `vite preview`) · painel http://localhost:8083 **fora do ar** · build não exposto · Chromium headless (Playwright MCP) · viewports 390 × 844 e 1440 × 900 uma vez |
| Paridade    | banco local com massa semeada pelo orquestrador (marco de medição em 2026-10-19; visitas e marcas de sacola de 20/10 a 01/11); `production_host = localhost`; nos contextos da loja `navigator.webdriver` neutralizado e UA de iPhone (cliente A) e de Android sem `HeadlessChrome` (cliente B); `*.supabase.co` e `**/g/collect*` bloqueados; vários passos na loja e as leituras repetidas do app feitos por `browser_run_code_unsafe` (cliques por `el.click()`, leitura dos `aria-label` dos quatro cartões) para caber no orçamento; fonte 200 % emulada pondo `font-size: 200%` no `<html>`. Relógio: a sessão começou às 01:45 de Brasília (04:45 UTC) e terminou às 02:02 — a janela "até o mesmo ponto" era de uma ou duas horas |

## Missão

Confirmar que os números de Acessos são os mesmos da faixa do Início, que "Com sacola" nunca passa de Visitas no
dia, e que a comparação com a semana anterior só aparece quando é justa.

## Passos

| #  | A persona tentou | Viu | Evidência |
| -- | ---------------- | --- | --------- |
| 01 | entra no app e lê a faixa do Início em Hoje, Ontem e Semana | Hoje: Visitas 6 · Vendas 0; Ontem: Visitas 7 · Vendas 0; Semana: Visitas 6 · Vendas 0 (a semana é só hoje, segunda) | — |
| 02 | toca no cartão "Agora na loja" e desce até Acessos (abre em Semana) | Semana: Visitas 6 · Com sacola 3 · Vendas 0 · Conversão 0,0%; nenhuma variação; a nota "Com sacola, na semana, é a soma dos dias: quem pôs joia na sacola em dois dias conta duas vezes." logo abaixo dos números | `screenshots/CH-05-02-acessos-semana.png` |
| 03 | troca para Hoje | Visitas 6 · Com sacola 3 · Vendas 0 · Conversão 0,0%; sem variação; a nota sumiu | — |
| 04 | troca para Ontem | Visitas 7 "0% vs anteontem" · Com sacola 2 "0% vs anteontem" · Vendas 0 "−100% vs anteontem" · Conversão 0,0% "−100% vs anteontem"; as quatro frases em cinza (rgb 84, 97, 107), nenhuma vermelha; sem a nota | — |
| 05 | (cliente A, iPhone, nova) aceita os cookies, abre uma joia e põe na sacola | a loja avisa `cart:1` | — |
| 06 | lê Acessos em Hoje | Visitas 6 → 7; Com sacola 3 → 4 | — |
| 07 | (cliente A) esvazia a sacola e põe de novo, duas vezes | quatro avisos alternando `cart:0` e `cart:1` | — |
| 08 | (cliente B, Android, nova) aceita os cookies e abre uma joia, sem pôr nada na sacola | — | — |
| 09 | lê Acessos em Hoje, ~30 s depois | Visitas 8; Com sacola 4 (não subiu com as duas voltas da A nem com a B) | `screenshots/CH-05-09-hoje-8-visitas-4-sacola.png` |
| 10 | (cliente B) recarrega a loja e abre mais 5 joias e a Home (7 páginas, cada uma com aviso de presença) | Acessos em Hoje continua Visitas 8 · Com sacola 4 | — |
| 11 | troca de período 7 vezes seguidas (Semana, Ontem, Hoje, Semana, Hoje, Ontem, Semana) | cada troca mostra o número na hora (Semana 8/4/0/0,0%, Ontem 7/2/0/0,0%, Hoje 8/4/0/0,0%), nenhum traço, **nenhuma requisição** a `/rest/v1/` durante as trocas | — |
| 12 | volta ao Início e lê a faixa em Hoje, Ontem e Semana | Hoje Visitas 8 · Vendas 0; Ontem 7 · 0; Semana 8 · 0 — iguais aos de Acessos | — |
| 13 | tenta abrir o Dashboard do painel em :8083 | `net::ERR_CONNECTION_REFUSED` — o painel não estava servido | — |
| 14 | Acessos em Semana com a fonte a 200 % | os quatro cartões em uma coluna (326 px cada, sem rolagem interna), a nota inteira abaixo do último, `scrollWidth` 390 | `screenshots/CH-05-13-acessos-semana-fonte-200.png` |
| 15 | Acessos em Ontem a 1440 | os quatro cartões numa linha (343 px cada), com as variações; sem rolagem lateral | `screenshots/CH-05-14-acessos-ontem-1440.png` |
| 16 | deixa a tela aberta e cruza as 02:00 de Brasília; lê Hoje e Semana sem recarregar e depois recarregando | Hoje: Visitas 8 "+700% vs ontem até as 2h" (verde, rgb 63, 90, 59); Com sacola, Vendas, Conversão sem variação. Semana: Visitas 8 "+700% vs semana anterior"; os outros três sem variação. Igual com e sem recarregar. Antes das 02:00 (passos 02–03) nenhum número tinha variação | `screenshots/CH-05-15-acessos-hoje-0200.png` |

**Edge cases tentados:**

- Trocar de período várias vezes rápido (passo 11): números na hora, sem nova leitura — ok
- Virada de hora com a tela aberta (passo 16, 01:59 → 02:01): a variação de Visitas apareceu sem recarregar — ok. A virada do dia (meia-noite) não foi feita: a sessão começou às 01:45
- Fonte 200 % com quatro números (passo 14): uma coluna, nada sobreposto — ok
- 1440 (passo 15): quatro cartões numa linha — ok
- Mesma cliente pondo na sacola três vezes no dia (passos 05–09): conta uma — ok
- Muitos avisos de presença do mesmo navegador (passo 10): Visitas não sobe — ok
- Teto de 5.000 visitas e zero visitas num período: não feitos — sem massa (ver Fora da cobertura)

## Casos

| TC | Veredito | Passo | Evidência | Nota |
| -- | -------- | ----- | --------- | ---- |
| TC-FUNC-025 | pass | 01–03, 11–12 | `screenshots/CH-05-02-acessos-semana.png` | Visitas e Vendas idênticos à faixa nos três períodos, antes (6/7/6) e depois (8/7/8) das duas clientes novas; trocas sem nova leitura e sem traços; rótulos Visitas · Com sacola · Vendas · Conversão, sem "Visitantes únicos". Os dois números de Vendas eram 0 nos três períodos, então a comparação de Vendas é fraca |
| TC-FUNC-026 | pass | 05–09 | `screenshots/CH-05-09-hoje-8-visitas-4-sacola.png` | +1/+1 com a cliente A; as duas voltas à sacola não somam; a cliente B soma só em Visitas; Com sacola ≤ Visitas em Hoje (4 ≤ 8) e Ontem (2 ≤ 7). A variação da cliente que recusou estatística não foi feita (coberta no CH-02) |
| TC-FUNC-027 | blocked | 02–04, 14 | `screenshots/CH-05-02-acessos-semana.png` · `CH-05-13-acessos-semana-fonte-200.png` | massa: a semana em curso é só hoje (segunda), então "soma dos dias" com um navegador em dois dias desta semana não é observável. A nota aparece só em Semana, some em Hoje e Ontem, com o sentido certo, e a 200 % fica inteira sem sobrepor — ok |
| TC-FUNC-028 | blocked | 04, 16 | `screenshots/CH-05-15-acessos-hoje-0200.png` | massa/horário: às 02:00 a janela "até o mesmo ponto" tinha só Visitas com base diferente de zero (ontem e a segunda passada com 1 visita até as 2h), então a variação só aparece em Visitas (+700%, verde); Com sacola, Vendas e Conversão sem variação — consistente com base zero, mas não dá para provar "nos quatro números". Em Ontem, os quatro com variação; queda e empate em cinza, nunca vermelho — ok |
| TC-FUNC-029 | blocked | — | — | massa: o segundo estado (marco de medição depois do início da semana anterior) não foi semeado para esta sessão |
| TC-FUNC-030 | blocked | 14–15 | — | massa: nenhum período com zero visitas (para "—") nem com 3 vendas em 70 visitas; só se viu "0,0%" com 0 vendas. A 200 %, uma coluna — ok; a 1440, quatro numa linha — ok |
| TC-REG-001 | pass | 08–10 | `screenshots/CH-05-09-hoje-8-visitas-4-sacola.png` | a cliente B subiu Visitas exatamente 1 (7 → 8) e, depois de recarregar e navegar 7 páginas, continuou 8 — na faixa do Início e em Acessos. "Voltar mais tarde no mesmo dia" não feito |
| TC-REG-002 | blocked | 13 | — | ambiente: o painel em :8083 não estava servido (`ERR_CONNECTION_REFUSED`) |

Contagem: pass 3 · fail 0 · blocked 5 · skip 0

## Achados

nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta |
| ----------------------- | ------------ | --------------- |
| Em Hoje a variação diz "vs ontem até as 2h", mas em Semana diz só "vs semana anterior", sem dizer até que ponto; com a semana em curso de duas horas, "+700% vs semana anterior" se lê como a semana inteira contra a semana inteira | 16 | polimento |
| Com o período anterior medido mas com zero até o mesmo ponto (Com sacola, Vendas, Conversão às 02:00; os quatro antes das 02:00), a variação simplesmente não aparece, sem nenhuma frase; a fonte não diz o que mostrar quando a base é zero | 02–03, 16 | polimento |

## Fora da cobertura

- TC-FUNC-028 nos quatro números, em alta e em queda na Semana — a massa só dá base diferente de zero em Visitas até as 2h; precisa ser lido mais tarde no dia (ou com massa de sacola e vendas na madrugada da segunda passada e de ontem)
- TC-FUNC-029 — o estado com o marco de medição depois do início da semana anterior não foi semeado
- TC-FUNC-030 "—" com zero visitas e o 4,3 % de 3/70 — sem período com essa massa
- TC-FUNC-027 com um navegador em dois dias desta semana — a semana em curso é só hoje
- TC-REG-002 — o painel :8083 não estava no ar; não subi o servidor (fora do papel da sessão)
- Virada do dia (meia-noite de Brasília) com a tela aberta — a sessão começou às 01:45
- Teto de 5.000 visitas no dia — sem massa
- Acessos a 390 com fonte 100 % não medido por caixa (só visto pelo snapshot); medido a 200 % e a 1440

## Debrief

- **Surpresas:** a variação depende da hora do dia de forma forte: às 01:45 nenhum número tinha variação, às 02:01 só Visitas. A massa semeada "de 20/10 a 01/11" não garante comparação até o mesmo ponto numa leitura de madrugada. A cliente B, ao abrir a loja, avisou presença antes de aceitar os cookies — já registrado no CH-02 (A-1), não repetido aqui
- **Próximo charter:** reler CH-05 depois do meio-dia, com o painel em :8083 no ar e o segundo estado do marco semeado, para fechar TC-FUNC-028/029/030 e TC-REG-002
- **Padrão novo:** cruzar a virada de hora com a tela aberta (passo 16) mostrou a régua "até o mesmo ponto" funcionando sem recarregar — candidato a variação fixa dos charters de comparação
