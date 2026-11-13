# Sessão CH-05 · A dona encerra a campanha

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-05-dona-desliga-a-faixa.md` · exploratório · P1 |
| Status      | done (parcial: o orçamento acabou antes de desligar a faixa; ver Fora da cobertura) |
| Persona     | PER-01 Adri · conta: `admin-loja` — `QA_ADMIN_LOJA_*` |
| Tour · modo | Back-Button · por cenário (J-05) |
| Rodada      | exploração |
| Orçamento   | 51 ações de browser de 50 (1 a mais: um `click` com ref velha no logout e um `get url` que relançou a sessão vazia, fechada em seguida) |
| Ambiente    | loja `http://localhost:8082` · painel `http://localhost:8083/admin` · referência `:8092` (não chegou a ser aberta) · build não exposto · Chromium (agent-browser 0.39.1, headless) · viewports 390 × 844 (loja) · 1440 × 900 (painel) |
| Paridade    | sem a função `api/page` da Vercel: o documento marcado (`data-faixa`) é servido por `network route` da URL exata com o HTML de `scratchpad/wi/101/doc/home-0.html` / `home-1.html`; sem cache (`HIT`) nem prazo real de 5 min / 1 h; Supabase local; `*.supabase.co` e `**/g/collect*` abortados por rota |

## Missão

Confirmar que, ao desligar a faixa, a Adri vê a loja de sempre (sem vão, sem vaga ouro), que voltar e avançar entre páginas abertas antes e depois da troca nunca faz a página pular, e que religar devolve a campanha inteira.

## Passos

Leitura de cada passo por uma `eval` só (atributo `data-faixa`, topo do `<header>`, elemento no ponto (195, 4) e entradas de `layout-shift` com `buffered: true`, `[valor, startTime ms]`).

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 00 | Sonda: Home com o documento marcado `"0"` (rota da URL exata `http://localhost:8082/`) | abre como página (`contentType` `text/html`), `dataset.faixa` = `"0"` — sonda passou | — |
| 01 | Com a faixa **ligada** (config), abrir a Home marcada `"0"` em 390 × 844 | nenhuma faixa; `<header>` em y = 0; uma entrada de `layout-shift` 0,0995 em 1521 ms (não atribuída — ver Debrief) | `screenshots/CH-05-01-home-marcada-0-ligada.png` |
| 02 | Tocar num link interno ("Novidades" → `/busca`), depois "Início" (→ `/`) | nas duas páginas novas, **nenhuma faixa**; `<header>` em y = 0; mesma entrada de `layout-shift` (1521 ms) — prova de que foi troca de rota no mesmo documento, sem recarga | `screenshots/CH-05-02-nav-interna-faixa-aparece.png` |
| 03 | Controle: tirar a rota e recarregar a Home (sem atributo) | a faixa aparece com o A1 "Black Friday · novembro inteiro com joias em oferta"; `<header>` em y = 52 — a configuração está ligada e chega em < 0,5 s. `layout-shift` 0,0561 (371 ms) e 0,0749 (403 ms): o estado "não sei" do dev, não conta como falha | — |
| 04 | Reproduzir: Home marcada `"0"` de novo, link interno "Coleções" (→ `/busca`) | de novo **nenhuma faixa** na página nova; `<header>` em y = 0 | `screenshots/CH-05-03-nav-interna-sem-faixa-repro.png` |
| 05 | Home marcada `"1"` com a faixa ligada | vaga presente (`SECTION` com altura `--faixa-celular`) e `<header>` em y = 52 na primeira leitura (~0,4 s); o texto do A1 ainda não estava na vaga nessa leitura; `layout-shift` 0,0749 (355 ms), a mesma entrada que aparece sem atributo — não atribuída à faixa. (Primeira tentativa deste passo serviu ainda o `"0"`: uma segunda `network route` na mesma URL não substitui a primeira; refeita com `unroute` antes) | `screenshots/CH-05-04-home-marcada-1-ligada.png` |
| 06 | Entrar no painel por `/admin/faixa-de-avisos` (1440 × 900) como `admin-loja` | o login leva ao Dashboard, não à tela pedida | — |
| 07 | Abrir `/admin/faixa-de-avisos` e conferir o estado | "Faixa ligada" marcado; 4 de 5 avisos: 1 Black Friday · novembro inteiro com joias em oferta · /joias-afetivas; 2 10%, 15% e 20% de desconto · em anéis, colares e pingentes selecionados no ateliê · /amuletos; 3 Frete grátis · acima de R$ 450,00 para Sul e Sudeste · sem link; 4 Imagem · /joias-afetivas — igual ao manifesto | — |
| 08 | Sair da conta e fechar | o clique no menu da conta falhou (ref velha); o browser da sessão foi fechado sem o "Sair" — a sessão é só em memória, sem perfil | — |

**Edge cases tentados:**

- Voltar à primeira página por troca de rota (`/` → `/busca` → `/` via "Início"): a decisão continuou presa ao atributo `"0"`
- Recarregar a primeira página depois de navegar (passo 03, sem atributo): a configuração decide
- Não tentados (orçamento): voltar/avançar do navegador repetido, deep link de categoria marcado, `/checkout` marcado `"1"`, duas abas antes e depois de salvar

**Estado final da massa:** a faixa **não foi alterada** nesta sessão (o orçamento acabou antes de desligar). Conferido no painel (passo 07), depois de recarregar a tela: ligada, com A1, A2, A3 e A4 do manifesto, nessa ordem.

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-FUNC-010 | fail | 01–05 | `screenshots/CH-05-02-nav-interna-faixa-aparece.png` · `screenshots/CH-05-03-nav-interna-sem-faixa-repro.png` | A-1: passo 4 (ligada, documento `"0"`, link interno ⇒ a faixa deveria aparecer) falha. Passo 3 pass; passo 5 pass parcial (vaga e cabeçalho em 52 na primeira leitura, o A1 dentro dela não confirmado). Passos 1–2 e as variações "voltar", "checkout `"1"`" não rodaram (dependem da faixa desligada — orçamento) |
| TC-FUNC-009 | skip | — | — | orçamento esgotado antes de desligar a faixa; não desligar foi escolha para não deixar a massa fora do manifesto |
| TC-UI-003 | skip | — | — | depende da faixa desligada (TC-FUNC-009 passo 1) — orçamento |

Contagem: pass 0 · fail 1 · blocked 0 · skip 2

## Achados

### A-1 · [Loja · troca de rota] Página aberta com `data-faixa="0"` nunca mostra a faixa ligada, nem depois de navegar — a campanha some para quem chegou pela página antiga

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri (e a cliente da loja que chega por uma página do cache antigo) |
| Jornada e passo     | J-05, ramo J-05a (religar com páginas antigas em cache) · passos 01–02 e 04 do log |
| TC                  | TC-FUNC-010 (passo 4) |
| Gravidade proposta  | high — a Adri liga a campanha e, enquanto a página de entrada vier do cache antigo, a cliente navega a visita inteira sem a faixa; quem confere a loja acha que não funcionou (hipótese de fricção 2 da persona: liga e desliga de novo) |
| Reproduziu          | sim (2 de 2) |
| Viewport            | 390 × 844 |

**Passos para reproduzir** — de um estado limpo:

1. Sem login na loja; a faixa ligada no painel com o manifesto. Interceptar o documento de `http://localhost:8082/` e responder com o HTML da Home com `<html ... data-faixa="0">` (`home-0.html`)
2. Abrir `http://localhost:8082/` — nenhuma faixa (correto: o atributo decide a carga)
3. Tocar em "Novidades" (ou "Coleções") no rodapé → `/busca`, troca de rota sem recarga; depois "Início" → `/`

**Esperado:** na página nova a faixa aparece acima do cabeçalho — "na carga, o atributo decide; depois da primeira troca de rota, decide a configuração" — **fonte:** PRD RN-02, CA-08; spec H-02, H-03, I-09; TC-FUNC-010 passo 4

**Observado:** em `/busca` e de volta em `/`, nenhuma faixa; `<header>` em y = 0; `document.documentElement.dataset.faixa` continua `"0"`. Controle: o mesmo browser, sem o atributo, recarregando `/` mostra a faixa com o A1 em < 0,5 s (`<header>` em y = 52) — a configuração está ligada e chega.

**Evidência:**

- `screenshots/CH-05-01-home-marcada-0-ligada.png` — Home marcada `"0"`, sem faixa (estado de partida correto)
- `screenshots/CH-05-02-nav-interna-faixa-aparece.png` — depois da troca de rota para `/busca`: sem faixa (o nome do arquivo descreve o esperado; a imagem prova o observado)
- `screenshots/CH-05-03-nav-interna-sem-faixa-repro.png` — segunda reprodução, via "Coleções"
- console: não lido
- rede: nada (troca de rota sem requisição de documento: a mesma entrada de `layout-shift` de 1521 ms aparece antes e depois)

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| Entrar pelo link direto `/admin/faixa-de-avisos` sem sessão: depois do login o painel abre o Dashboard, não a tela pedida — a Adri precisa achar a Faixa de avisos de novo no menu | 06 | pré-existente |

## Fora da cobertura

- TC-FUNC-009 inteiro (desligar e salvar, frase do salvo, prévia "A faixa está desligada…", loja em três rotas, cabeçalho recolhendo no produto, religar e F5) — orçamento de 50 ações esgotado; a faixa não foi desligada para não arriscar terminar fora do manifesto
- TC-UI-003 (comparação com a referência `:8092` em 390 e 1440) — depende da faixa desligada; orçamento
- TC-FUNC-010 passos 1–2 (desligada + documento `"1"`: vaga ouro sem texto, some na página seguinte), variação "voltar com o botão do navegador", variação `/checkout` marcado `"1"` (H-02) — dependem da faixa desligada / orçamento
- Edge cases do charter: voltar/avançar repetido do navegador, deep link de categoria marcado (`c1-*.html`), duas abas antes e depois de salvar — orçamento
- Atribuição das entradas de `layout-shift` (0,0995 com `"0"`; 0,0749 com `"1"` e sem atributo): não comparadas com a referência `:8092` — fica para CH-07, que mede CLS
- O prazo real de 5 min / 1 h, o `HIT` do cache e a Home servida pela função — só no preview da Vercel
- Logout pela tela: o clique no menu da conta falhou por ref velha; a sessão do browser (só em memória) foi fechada sem o "Sair"

## Debrief

- **Surpresas:** a decisão pelo atributo `"0"` não passa à configuração depois da troca de rota (A-1). E, no `agent-browser`, uma segunda `network route` na mesma URL não substitui a primeira — o documento antigo continua sendo servido até um `unroute`; custou 5 ações
- **Próximo charter:** uma continuação do CH-05 só com a faixa desligada (TC-FUNC-009, TC-UI-003, TC-FUNC-010 passos 1–2 e variações), com orçamento próprio; e conferir se A-1 também vale com `"1"` + desligada (a vaga ficaria depois da troca de rota?)
- **Padrão novo:** ler `layout-shift` com `buffered: true` antes e depois do clique prova que a troca foi de rota (mesma entrada, mesmo `startTime`) e não recarga — útil para todo teste de "decide depois da primeira troca de rota"
