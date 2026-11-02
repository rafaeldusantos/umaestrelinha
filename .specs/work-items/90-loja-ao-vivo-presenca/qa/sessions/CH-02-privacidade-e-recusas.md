# Sessão CH-02 · Quem recusou não aparece em número nenhum

| Campo       | Valor |
| ----------- | ----- |
| Charter     | `test-plans/charters/CH-02-privacidade-e-recusas.md` · exploratório · P0 |
| Status      | done |
| Persona     | PER-04 Helena · conta: `anonima` (loja sem login) · oráculo: `admin-atelie` (credencial do arquivo de credenciais do QA local, nunca o valor) num contexto separado |
| Tour · modo | Multi-Tab · com tour |
| Rodada      | exploração |
| Orçamento   | 49 ações de browser de 50 |
| Ambiente    | loja http://localhost:8082 (build, `vite preview`) e http://127.0.0.1:8082 · app http://localhost:8084/ao-vivo (dev) · build não exposto · Chromium headless (Playwright MCP) · viewport 390 × 844 (a leitura da Política também a 1280) |
| Paridade    | banco local com `production_host = localhost`; contextos da cliente com `navigator.webdriver` neutralizado e UA de iPhone (cabeçalho e `navigator`); `*.supabase.co` e `**/g/collect*` bloqueados. Além do oráculo (número no app), as chamadas da loja à function `visit` foram observadas pela rede do próprio contexto da cliente (corpo com o código trocado por `<id>`), porque o oráculo tem atraso e havia três clientes do CH-01 saindo da contagem durante a sessão. O "200 % de fonte" foi emulado com `font-size: 200%` na raiz (não é a fonte do sistema). Vários cliques no rodapé e na barra de compra só funcionaram por `dispatchEvent`: o Playwright acusava "element is outside of the viewport" mesmo depois de rolar (ver Fora da cobertura) |

## Missão

Achar qualquer caminho em que uma cliente que recusou estatística, abriu um link de "não contar", ou não é a
loja de produção apareça em "Agora na loja" — principalmente com duas abas abertas.

## Passos

| #  | A persona tentou | Viu | Evidência |
| -- | ---------------- | --- | --------- |
| 00 | (oráculo) a Adri entra no app e abre a Loja ao vivo antes de Helena | 3 pessoas (Olhando 1 · Sacola 2 · Checkout 0), joias "Joia Afetiva Árvore da Vida com Sangue e Cabelo" e "Placa Afetiva Árvore da Vida com Cabelo"; Acessos hoje: Visitas 3 · Com sacola 2 — as três clientes do CH-01 ainda dentro da janela de 5 min | — |
| 01 | Helena (contexto 1, navegador novo) abre a Home; aparece o aviso "A loja usa cookies para melhorar a sua experiência. Ao continuar navegando, você concorda com a Política de Privacidade." com "Preferências" e "Aceitar". Abre "Preferências" | folha "Preferências de cookies" com "Necessários" (Sempre ativos) e "Estatísticas" — o interruptor de Estatísticas já vem **ligado** antes de qualquer escolha. Desliga e toca "Salvar escolhas"; a loja segue normal | `screenshots/CH-02-01-estatisticas-recusada.png` |
| 02 | Helena abre o "Berloque Afetivo Separador com Dente de Leite em Prata 925", põe na sacola (gaveta "Sua sacola", 1 item), vai ao `/checkout` e fica ~75 s | nenhuma chamada à function `visit` saiu do contexto dela depois da recusa (lista vazia em ~2 min); o armazenamento guarda a escolha `statistics:false` | — |
| 03 | (oráculo) a Adri olha a Loja ao vivo | 1 pessoa, Olhando joias 1, Sacola 0, Checkout 0, "Ninguém olhando uma joia agora." — e **Visitas subiu de 3 para 4**. Helena estava no checkout, então a pessoa "olhando" fora de uma joia é a carga da Home de antes da escolha (passo 01), ainda dentro dos 5 min; ver A-1 | — |
| 04 | (reprodução de A-1) navegador novo (contexto 2), abre a Home e **não toca** no aviso por 8 s | o aviso continua na tela, nenhuma escolha gravada, e a loja já enviou `POST /visit` duas vezes: um aviso de presença (`page:"outra", cart:0, source:"direto"`) e a contagem de visita | — |
| 05 | Contexto 2 aceita; abre uma segunda aba (B) na "Joia Afetiva Árvore da Vida Primavera com Cabelo e Leite Materno" e espera 65 s | as duas abas avisam a cada minuto (A como "outra", B como "joia" com o slug) | — |
| 06 | Na aba A (Home), abre "Preferências de cookies" no rodapé, desliga Estatísticas e salva; espera 140 s | nenhuma das duas abas avisou mais (a B, que continuava aberta na joia, parou também); o código da presença sumiu do armazenamento, o código da contagem de visitas ficou | `screenshots/CH-02-04-aba-a-recusou.png` |
| 07 | Na aba B, navega para outra joia (Verão) e espera 25 s; depois reaceita Estatísticas na B | nada enviado enquanto recusada; após reaceitar, as duas abas voltaram a avisar no ciclo seguinte (~34 s), já com a joia Verão | — |
| 08 | Na aba B, abre `/?nao-contar=1&utm_source=instagram` | aviso "Este navegador não é mais contado nas visitas da loja."; a barra ficou `/?utm_source=instagram` (o `nao-contar` sumiu, o `utm_source` ficou) | `screenshots/CH-02-06-nao-contar.png` |
| 09 | Navega por uma joia por 70 s | nenhum aviso de presença de nenhuma das duas abas | — |
| 10 | Abre `/?nao-contar=0` e uma joia, espera 65 s | aviso "Este navegador voltou a ser contado nas visitas da loja."; os avisos voltaram na hora (as duas abas, a B com a joia Verão) | — |
| 11 | (oráculo) a Adri olha a Loja ao vivo | 1 pessoa, Olhando 1, Checkout 0, "Joia Afetiva Árvore da Vida Verão com Cabelo e Leite Materno · 1 pessoa", Direto 1, No celular 1 de 1 — a Helena do contexto 1 (recusada, ainda no checkout) não aparece; **Com sacola continua 2** (a sacola dela não contou); Visitas 5 (as duas cargas de antes da escolha, contextos 1 e 2) | `screenshots/CH-02-08-oraculo-helena-recusada-fora.png` |
| 12 | Contexto "robô" (sem neutralização própria) abre uma joia, toca "Aceitar", espera 65 s | nenhuma chamada à `visit`. Mas o contexto padrão do MCP já devolvia `navigator.webdriver = false` e UA de Chrome de Mac (sem "HeadlessChrome"): o robô do TC não pôde ser reproduzido; ver Fora da cobertura | — |
| 13 | Contexto 2 (neutralizado) abre a joia por `http://127.0.0.1:8082`, aceita (o aviso volta, armazenamento é por origem), espera 62 s | nenhuma chamada saiu da aba em 127.0.0.1 (a única no período foi a da aba A em localhost, respondida `200 {"desfecho":"gravada"}`) | — |
| 14 | Lê a Política de Privacidade, parte "Medição de audiência" | o parágrafo novo diz cada ponto do §7 (ver TC-FUNC-017); o parágrafo da contagem de visitas diz que desligar Estatísticas "apaga o código do seu navegador" | `screenshots/CH-02-10-politica-200.png` |
| 15 | Lê a Política em 390 com a fonte a 200 % | a página rola de lado: `scrollWidth` 434 em 390 | `screenshots/CH-02-10-politica-390-200.png` |

**Edge cases tentados:**

- Fechar/ignorar o aviso sem escolher (variação de TC-SEC-001): a loja conta e avisa presença antes de qualquer resposta — A-1
- Duas abas no mesmo navegador, recusa numa: a outra para no ciclo seguinte e não volta enquanto recusada — ok
- Recusar e reaceitar no mesmo dia: volta a contar no ciclo seguinte — ok
- Navegar para outra joia na aba que não recusou, depois da recusa: não conta — ok
- `?nao-contar=1` com `utm_source`: parâmetro some, `utm_source` fica, não conta — ok; `?nao-contar=0` devolve — ok
- Loja aberta por `127.0.0.1`: não conta — ok
- Robô (Playwright sem neutralização): não reproduzível neste MCP (ver Fora da cobertura)
- Política a 200 % em 390: rola de lado — spec-gap pré-existente

## Casos

| TC | Veredito | Passo | Evidência | Nota |
| -- | -------- | ----- | --------- | ---- |
| TC-SEC-001 | fail | 01–04, 11 | `screenshots/CH-02-01-estatisticas-recusada.png` · `CH-02-08-oraculo-helena-recusada-fora.png` | passos 1–3 depois da recusa ok (nada enviado; a sacola e o checkout dela não aparecem); passo 4 ok (Com sacola não subiu). Mas a carga da primeira página, antes da escolha, já a conta em Visitas e a põe em "Agora na loja" por até 5 min, e a variação "fecha a folha sem escolher ⇒ não aparece" falha ⇒ A-1 |
| TC-SEC-002 | pass | 05–07 | `screenshots/CH-02-04-aba-a-recusou.png` | a aba B parou no ciclo seguinte à recusa na A, não voltou em 140 s + navegação, e voltou ao reaceitar. Variação "B em segundo plano" não diferenciável: no headless as duas abas ficam `visible` |
| TC-SEC-003 | pass | 08–10 | `screenshots/CH-02-06-nao-contar.png` | aviso e limpeza da URL ok; a variação com `utm_source` ok. Prova pela rede (nenhum aviso de presença por 70 s), não pelo oráculo após 5 min — orçamento |
| TC-SEC-004 | pass | 12–13 | — | 127.0.0.1 não envia nada (passo 2 ok); passo 3 ok (localhost conta, passos 05/10/13). Passo 1 só parcialmente: o contexto "robô" não pôde ser criado com `webdriver` verdadeiro/UA headless; também não contou. Variação Googlebot não feita — orçamento |
| TC-FUNC-017 | fail | 14–15 | `screenshots/CH-02-10-politica-390-200.png` | passos 1–5 ok, literais (aviso a cada minuto; 30 min: tipo de página, qual joia, itens na sacola, tipo de origem, aparelho; nunca IP/endereço da página/de onde veio; 1 h e 14 dias ligados a código diário não ligado ao da visita; visitas apagadas em 14 dias). Passo 6 falha: `scrollWidth` 434 em 390 a 200 % — é o cabeçalho da loja, defeito já conhecido e anterior (ver Spec-gaps), não o texto novo. Variação da folha: "Estatísticas" presente e recusável (passo 01) |

Contagem: pass 3 · fail 2 · blocked 0 · skip 0

## Achados

### A-1 · [Loja] A cliente é contada e aparece em "Agora na loja" antes de responder ao aviso de cookies — para quem recusa na primeira visita

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-04 Helena |
| Jornada e passo     | J-04, passo 1 (abrir a loja e recusar) · passos 01–04 do log |
| TC                  | TC-SEC-001 (variação "fecha a folha sem escolher") |
| Gravidade proposta  | high — Helena, que recusou estatística logo ao chegar, já entrou na contagem do dia e fica visível como "gente na loja" para a Adri por até 5 min; a recusa só vale da escolha em diante |
| Reproduziu          | sim (2 de 2) |
| Viewport            | 390 × 844 |

**Passos para reproduzir** — de um estado limpo:

1. Navegador novo (sem armazenamento da loja), UA de iPhone, `webdriver` neutralizado; a Adri com `http://localhost:8084/ao-vivo` aberta noutro navegador e os números anotados
2. Abrir `http://localhost:8082/` e não tocar no aviso "A loja usa cookies… Ao continuar navegando, você concorda…"
3. Observar as requisições da página por ~8 s; depois, opcionalmente, abrir "Preferências", desligar "Estatísticas" e salvar
4. Em até 75 s, a Adri recarrega a Loja ao vivo

**Esperado:** sem consentimento de estatística, nenhum aviso de presença e nenhum número — **fonte:** TC-SEC-001 (variação "fecha a folha sem escolher ⇒ não aparece"), PRD §7, §10.3; charter CH-02 "Recusar Estatísticas na primeira visita… os números não mudam"

**Observado:** com o aviso ainda na tela e nenhuma escolha gravada, a loja envia `POST /visit` duas vezes na carga (um aviso de presença `{"page":"outra","cart":0,"source":"direto"}` e a contagem da visita). Na Loja ao vivo apareceu 1 pessoa "Olhando joias" com "Ninguém olhando uma joia agora." enquanto Helena já estava (recusada) no checkout, e Visitas de hoje subiu 3 → 4 (e 4 → 5 com o segundo navegador). A folha de preferências abre com "Estatísticas" já ligado. Depois de recusar, nada mais é enviado. Nota para a triagem: pode ser o modelo de consentimento herdado do contador de visitas (aviso de "ao continuar navegando, você concorda", feature 61) — o PRD pede "o mesmo consentimento do VisitCounter", e o contador faz o mesmo; o conflito é com o TC e com a missão do charter.

**Evidência:**

- `screenshots/CH-02-01-estatisticas-recusada.png` — a folha com "Estatísticas" (ligado de fábrica, desligado aqui)
- `screenshots/CH-02-08-oraculo-helena-recusada-fora.png` — Visitas 5 na Loja ao vivo depois de dois navegadores que viram o aviso
- console: nada relevante (erros só das imagens do Storage bloqueado)
- rede: `POST /functions/v1/visit` × 2 na carga, antes de qualquer escolha (passo 04)

### A-2 · [Loja] Depois de desligar "Estatísticas", o código da contagem de visitas continua guardado no navegador, embora a Política diga que é apagado

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-04 Helena |
| Jornada e passo     | J-04, passos 2–3 (recusar e conferir a Política) · passos 02, 06, 14 do log |
| TC                  | — (TC-FUNC-017 confere o texto; o comportamento é do contador) |
| Gravidade proposta  | low — nada é enviado depois da recusa, mas a Política afirma algo que a loja não faz |
| Reproduziu          | sim (2 de 2) |
| Viewport            | 390 × 844 |

**Passos para reproduzir** — de um estado limpo:

1. Navegador novo; abrir `http://localhost:8082/` (a carga já grava os códigos, ver A-1)
2. "Preferências" → desligar "Estatísticas" → "Salvar escolhas"
3. Ler o armazenamento local da página (DevTools → Application → Local Storage)

**Esperado:** "Desligar 'Estatísticas' também desliga essa contagem e apaga o código do seu navegador" — **fonte:** texto da própria Política de Privacidade, parágrafo da contagem de visitas

**Observado:** depois da recusa ficam `estrelinha-cookie-consent`, `estrelinha-visitor` e `estrelinha-instagram-invite`; o código da presença (`estrelinha-presenca`) foi apagado, como pede a Mudança, mas `estrelinha-visitor` (dono: o contador de visitas) continua. Observado nos dois navegadores que recusaram. Não foi verificado se o valor guardado ainda contém o código ou só o prazo.

**Evidência:**

- leitura do armazenamento local (não há screenshot; a persona não vê o armazenamento sem DevTools)
- console: nada
- rede: nada (nenhum envio depois da recusa)

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta |
| ----------------------- | ------------ | --------------- |
| A Política de Privacidade rola de lado em 390 com a fonte a 200 % (`scrollWidth` 434); a parte do texto em si é `17px` fixo e não cresce com a fonte da raiz. Coincide com o defeito já registrado do cabeçalho da loja a 390/200 % (feature 83, decisão pendente) | 15 | pré-existente |
| Na página da joia em 390 × 844, o botão "Adicionar à sacola" e o "Preferências de cookies" do rodapé não recebem clique do Playwright ("element is outside of the viewport" mesmo depois de rolar); por `dispatchEvent` funcionam. Não deu para saber se um toque real alcança — pode ser só do headless | 02, 06 | polimento |

## Fora da cobertura

- Robô de verdade (TC-SEC-004 passo 1 e a variação Googlebot): o contexto padrão deste Playwright MCP já sai com `navigator.webdriver = false` e UA de Chrome de Mac sem "HeadlessChrome"; não houve como recriar o robô sem `run-code` que mudasse o contexto para pior. O contexto também não contou, mas a causa não ficou provada
- "Não mudou" medido pelo oráculo depois de 5 min de espera em cada recusa: a sessão provou pela rede do contexto da cliente (nenhum aviso saindo) e pelo oráculo só nos passos 03 e 11 — orçamento de 50 ações
- Aba em segundo plano de verdade (variação de TC-SEC-002 e edge case "recusar com a aba da joia em segundo plano"): no headless as abas ficam `visible`
- Armazenamento bloqueado / aba privada: não há como bloquear o armazenamento nesta sessão sem script
- Fonte do sistema a 200 % real (só emulada pela raiz)
- Sair da conta da Adri no app: o contexto era isolado e em memória e foi fechado com o browser; o "Sair" não foi tocado (orçamento)
- Restaurar `store_settings.analytics.production_host` — é do orquestrador

## Debrief

- **Surpresas:** a primeira carga, antes de qualquer resposta ao aviso, já conta e avisa presença — o interruptor de Estatísticas nasce ligado; e a Loja ao vivo mostrou "1 olhando" com "Ninguém olhando uma joia agora", o que ajudou a separar a carga da Home da navegação recusada
- **Próximo charter:** decidir A-1 (opt-in × "ao continuar navegando") antes de retestar; uma sessão com o robô real via `playwright-cli` (que sai com `webdriver` verdadeiro) para TC-SEC-004 passo 1
- **Padrão novo:** observar a rede do próprio contexto da cliente (só a rota `/functions/v1/visit`, corpo com o código mascarado) como oráculo imediato, ao lado do número do app que tem atraso — dispensa as esperas de 75 s/5 min para "não mudou"
