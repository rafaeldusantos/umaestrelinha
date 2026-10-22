# 71 · Visitas únicas no Dashboard — prova de ponta a ponta (banco local + navegador)

Medida em **2026-10-22**, entre 08:35 e 08:50 UTC (05:35–05:50 em Brasília, quinta-feira). Autor =
quem conduziu a prova; não é verificação independente. Complementa a `prova-em-navegador.md` (task
29): aquela provou o contador e o bloco com a RPC **interceptada**; esta lê o **banco real** pelo
caminho real, com números esperados calculados à mão, e o Dashboard mostrando esses mesmos números.

Nada aqui usou `--linked`. Nenhuma escrita no projeto hospedado.

## Montagem

| Peça | Como | Observação |
| --- | --- | --- |
| Banco | Supabase **local** (API 54441, Postgres 54442), já de pé | As 9 funções da migration da `71` conferidas **iguais** ao arquivo do disco (`prosrc` comparado) antes de medir |
| Function `visit` | `supabase functions serve` | O edge runtime estava parado na entrada (como na baseline); parado de novo no fim. 12 containers de pé na entrada e na saída |
| Loja | `vite build` de produção + `vite preview --port 8082` | **Não** `pnpm dev:store`: o contador só chama com `import.meta.env.PROD` (`VIS-22`); em dev ele recusa por `ambiente` e a prova mediria o nada |
| Painel | `pnpm dev:backoffice` (8083), login do admin do `seed.sql` | `VITE_STORE_URL=http://localhost:8082` |
| Navegador | `playwright-core` 1.61.1 (Chromium 149), roteiros em `prova/roteiros/` | Saídas brutas em `prova/roteiros/*.saida.txt` |

**Rede cercada em todo contexto**: GA interceptado **por caminho** (`/g/collect`, `/gtag/js`,
respondido vazio) e qualquer host que não fosse a loja, o painel ou o Supabase local **abortado e
contado**. Resultado: `/gtag/js` interceptado 2× na loja (o GA4 ficou **ligado**, como no banco);
`g/collect` **0**; abortados `hgkrsfpupypxtygjgthf.supabase.co` ×10 (imagens públicas da Home, cujo
`image_url` no banco local aponta para o Storage hospedado — dado, não código), `i.ytimg.com` ×10 e
`fonts.googleapis.com` ×1. Nenhuma requisição saiu para fora da máquina.

**Estado semeado só no banco local, e restaurado**: `store_settings.analytics.production_host` =
`localhost` (era `umaestrelinha.com.br`; `enabled` e `measurement_id` **não** foram tocados). O valor
de entrada foi salvo e restaurado; `diff` vazio no fim.

**O bundle servido foi conferido antes de medir**: o script de entrada (`index-liIhNGTS.js`) contém
`functions/v1/visit`, `nao-contar`, `estrelinha-visitor` e `127.0.0.1:54441`, e **nenhum**
`*.supabase.co`.

## (a) Banco — `probes/ponta-a-ponta.sh`

Diferente dos outros probes (todos em `begin … rollback`), este **grava de verdade** e lê pelo
caminho do painel: login do admin no GoTrue local → JWT → `POST /rest/v1/rpc/store_movement` pelo
gateway. Subcomandos `semear · ler · papeis · limpar`; o estado de entrada é salvo em `semear` e
`limpar` volta a ele, conferindo.

Entrada: `store_visits` 0 linhas, `store_visit_counter` ausente, **nenhum** pedido pago desde 12/10.

### As fixturas

Visitas (direto na tabela, dias fixos): o **mesmo** id A na segunda 19/10, terça 20/10 e quarta
21/10; um segundo id B só na quarta.

Pedidos (`PROBE-71-E2E-*`), nas bordas — **21h30 de Brasília é 00h30 do dia seguinte em UTC**:

| # | Situação | `paid_at` (UTC) | Em Brasília | Em UTC | Total |
| --- | --- | --- | --- | --- | --- |
| 1 | pago | 22/10 00:30 | **qua** 21/10 21h30 | qui | 100,00 |
| 2 | criado e **não** pago | — | qua 21h30 | — | 999,00 |
| 3 | pago | 21/10 00:30 | **ter** 20/10 21h30 | qua | 50,00 |
| 4 | pago | 19/10 00:30 | **domingo** 18/10 21h30 | **segunda** | 30,00 |
| 5 | pago e **cancelado** | 21/10 13:00 | qua 10h | qua | 70,00 |
| 6 | pago | 22/10 02:30 | qua 23h30 (depois da leitura A) | qui | 20,00 |

### Leitura A — `p_agora` = quarta 21/10 23h de Brasília, como admin, pelo gateway

| | Hoje (21/10) | Ontem (20/10) | Esta semana (19–21/10) |
| --- | --- | --- | --- |
| Visitas | **2** (A, B) | **1** (A) | **2** — A conta **uma** vez; a soma dos dias seria 4 |
| Vendas | **1** (#1) | **1** (#3) | **2** (#1, #3) — #4 é do domingo, fora |
| Faturamento | **R$ 100,00** | **R$ 50,00** | **R$ 150,00** |
| Ticket | **R$ 100,00** | **R$ 50,00** | **R$ 75,00** |

Os 7 `ok` estão em `probes/ponta-a-ponta.sh ler`. `hoje`/`ontem`/`inicio_semana` vieram
`2026-10-21`/`2026-10-20`/`2026-10-19`. **Contraste**: pela régua em UTC, a "quarta" teria 1 pedido
de R$ 50,00 (o #3, que é de terça) e a "semana" desde segunda 00:00Z teria 3 pedidos e R$ 180,00 (o
#4 de domingo entrando).

### Leitura B — sem `p_agora` (o instante real; hoje = quinta 22/10), como o Dashboard lê

Antes do navegador: Visitas 0 / 2 / 2; Vendas 0 / 2 / 3; Faturamento 0 / R$ 120,00 / R$ 170,00;
Ticket `null` / R$ 60,00 / R$ 56,67. Depois do navegador (A visitou de novo na quinta, e mais um
navegador novo):

| | Hoje (22/10) | Ontem (21/10) | Esta semana (19–22/10) |
| --- | --- | --- | --- |
| Visitas | **2** | **2** | **3** — distintos {A, B, C}; a **soma dos dias** no banco era **6** |
| Vendas | 0 | 2 (#1, #6) | 3 (#1, #3, #6) |
| Faturamento | R$ 0,00 | R$ 120,00 | R$ 170,00 |
| Ticket | `null` | R$ 60,00 | R$ 56,67 |

O esperado de visitas foi **derivado do banco** (`count(distinct …)`), nunca cravado.

### Papéis — ninguém lê nem grava direto

| Quem | Tentativa | Resposta |
| --- | --- | --- |
| anon (chave publicável) | `GET store_visits` · `POST store_visits` · `GET store_visit_counter` | **401 42501** nos três |
| anon | RPC `store_movement` · `record_store_visit` · `store_clock` · `prune_store_visits('2099-01-01')` | **401 42501** nas quatro |
| cliente autenticado sem papel de admin (JWT local) | RPC `store_movement` | **403 42501 "acesso restrito ao painel"** |
| cliente | `GET` e `POST store_visits` | **403 42501** |
| **admin** | `GET store_visits` | **403 42501** — nem o admin lê a tabela; só a função |

E nenhuma tentativa passou: as 3 fixturas de A continuaram intactas (a poda com 2099 não rodou) e
nenhuma linha de A em 22/10 apareceu por gravação direta.

### Limpeza

`limpar`: 6 pedidos `PROBE-71-E2E-*` e 5 visitas de fixtura apagados; as 2 visitas de hoje gravadas
pelo navegador e o contador criado por ele apagados (a entrada era tabela vazia e contador ausente).
Conferido: 0 pedidos `PROBE%`, 0 visitas, 0 contador. A sequência de `order_number` não foi
consumida (números explícitos).

## (b) Navegador

### Loja — `roteiros/loja.cjs`

| Cenário | Medida | Resultado |
| --- | --- | --- |
| **S0** — Chromium sem neutralizar o robô, `/` + 3 rotas | `navigator.webdriver` / POSTs à `visit` | `true` / **0** (o filtro recusa no cliente) |
| **S1** — 390×844, UA de Android, `webdriver` neutralizado, marcador semeado com o id **A** | `/` + 5 rotas pelo router (`/sobre`, `/perguntas-frequentes`, `/politica-de-privacidade`, `/politicas-de-trocas-e-devolucoes`, `/como-enviar-seu-material-de-dna`) | **1** POST |
| | recarregar + mais 1 página | ainda **1** POST |
| | o POST | corpo **exatamente** `{"id":"<A>"}`, **sem** `Authorization`, `apikey` publicável; resposta `200 {"desfecho":"gravada","dia":"2026-10-22",…}` com `ate`/`agora` inteiros |
| | banco | **1** linha de A em 22/10; **1** linha no dia ao todo |
| | marcador | `{ v: 1, id: A, ate, em }` com `ate` no relógio local |
| | rolagem | `scrollWidth` 390 / 390 / 390 |
| **S2** — recusa no aviso | primeira carga | 1 POST `gravada` (id C novo, 1 linha) |
| | "Preferências" → Estatísticas (`aria-checked` true → false) → "Salvar escolhas" | marcador vira `{ v: 1, id: **null**, … }` — **o id foi apagado** |
| | prazo vencido à mão (`ate: 1`) + 3 rotas + recarregar | **0** POSTs novos — **parou** |
| **S3** — `?preview=1` dentro de iframe (página de outra origem, o painel, com a loja num `<iframe>`) | 9 s, armazenamento limpo, `webdriver` neutralizado | a loja renderiza no quadro; **0** POSTs; marcador **ausente** no frame — não gravou nem criou id |

Log da function: 4 linhas `{"fn":"visit","desfecho":"gravada"}` (as duas rodadas de S1 e S2 — a
primeira rodada parou num seletor do roteiro, e as linhas de hoje foram apagadas antes da segunda);
**nenhuma** carrega id, IP ou user agent.

Screenshots: `prova/loja-390-contada.png`, `loja-390-aviso.png`, `loja-390-preferencias-recusa.png`.

### Painel — `roteiros/painel.cjs` (56 conferências, 0 falhas na rodada final)

Com as fixturas e as visitas do navegador no banco, o Dashboard real (sem interceptação da leitura):

| | 390 × 844 | 1440 × 900 |
| --- | --- | --- |
| "Pedidos Hoje" / "Fat. Hoje" | ausentes | ausentes |
| Hoje — linha / valores | "Hoje, 22/10" · `2` · `0` · `R$ 0,00` · `—` (+ `sr-only` "sem vendas no período") | idem |
| Ontem | "Ontem, 21/10" · `2` · `2` · `R$ 120,00` · `R$ 60,00` | idem |
| Esta semana | "De 19/10 a 22/10" · **`3`** · `3` · `R$ 170,00` · `R$ 56,67` | idem |
| subtítulo de Visitas | "Contando desde 22/10 às 05h41" nas três abas | idem |
| rodapé | "Última visita registrada: hoje às 05h41" · "Atualizado às 05h45" | idem |
| colunas da grade | 2 | 4 |
| rolagem horizontal (`html`, `body`, viewport) | 390 / 390 / 390 em todas as abas | 1440 / 1440 / 1440 |
| alvos do bloco | abas 61·74·114 × **44**; ⓘ **44 × 44** | idem |
| ⓘ | **toque** a 6px da borda direita do alvo abre (ver defeito 1); toque fora fecha; balão com o texto inteiro de `VISIT_INFO_TEXT`, de x=86 a x=**374** | **Enter** abre, **Esc** fecha e devolve o foco, **Espaço** abre; seta → leva de Hoje a Ontem |
| erro (RPC respondendo 500, interceptada só nesse cenário) | "Não foi possível carregar os números do período." + "Tentar de novo" **127 × 44**; nenhum card; sem rolagem horizontal | idem |
| "Tentar de novo" com a leitura atrasada 4 s | esqueleto nos **4** cards; depois, os valores de Hoje certos | idem |

Screenshots em `prova/`: `painel-390-{hoje,ontem,semana,info,erro,carregando,pagina-inteira}.png` e
`painel-1440-{hoje,ontem,semana,info-teclado,erro,carregando}.png`.

## Defeitos achados — e consertados pela causa

### 1. O ícone do olho roubava a borda direita do alvo do ⓘ

A primeira rodada do painel **reprovou**: o toque não abria o balão. Diagnóstico por
`elementFromPoint` + toque em seis pontos do alvo de 44×44 (`roteiros/alvo-do-info.cjs`), em 390 e em
1440:

| Ponto do alvo | antes | depois |
| --- | --- | --- |
| centro, topo, esquerda, baixo | `BUTTON` · abre | `BUTTON` · abre |
| **direita (x+38, meio)** | **`svg.lucide-eye` · não abre** | `BUTTON` · abre |
| canto (4, 4) | `DIV` do card · não abre | `DIV` do card · não abre (ver abaixo) |

**Causa**: o alvo do ⓘ tem 44×44 por margem negativa (`-m-3.5`, 14px de cada lado), mas o `StatCard`
põe o ícone decorativo logo depois com `gap-2` (8px). O ícone começa, portanto, **6px dentro** da
borda direita do alvo e, pintado depois, recebe o toque. A `prova-em-navegador.md` tocou só "5px fora
do desenho" de um lado e não viu.

**Conserto**: no ramo `info` do `StatCard` o ícone decorativo é `pointer-events-none` — o toque cai no
botão que está por baixo. O ramo sem `info` não mudou (a suíte compara o HTML dele com o desenho
anterior). **Teste**: `StatCard.test.tsx` +1 (o `svg` do ramo `info` tem `pointer-events-none`, por
token exato). **Sensor**: a classe removida do arquivo real derruba exatamente esse caso (1 falha,
por asserção); restaurado com SHA-1 conferido.

O **canto** fora do círculo não abre porque o botão é `rounded-full` e o Chromium respeita o raio no
hit test: o alvo efetivo é um círculo de **44px de diâmetro**, que atende os 44 nos dois eixos. Não
foi tratado como defeito.

### 2. O balão do ⓘ encostava na borda da tela em 390

Medido na rodada com o defeito 1 já consertado: balão de x=102 a x=**390**. O Radix só desloca o
conteúdo até **encostar** na borda, a menos que receba `collisionPadding` — o mesmo achado da `67`
(D4, `MarkPopover`).

**Conserto**: `collisionPadding={16}` e teto `w-[min(18rem,calc(100vw-32px))]` no `PopoverContent`
do ⓘ (`StoreMovement.tsx`). Depois: x=86 a x=**374** — 16px de folga. **Teste**:
`widgets/store-movement/ui/__tests__/infoGutter.test.tsx` (2 casos, molde de
`stripEPopover.test.tsx`: o prop entregue ao Radix e o teto por token exato, com sensor de régua).
**Sensores**: tirar o `collisionPadding` e tirar o teto, cada um no arquivo real, derrubam o caso
(por asserção); restaurado com SHA-1 conferido.

### Gates depois dos consertos (um workspace por vez, exit code fora de pipe)

| Medida | Resultado |
| --- | --- |
| backoffice | **3648 / 207**, exit 0 (era 3645/206: +1 `StatCard`, +2 `infoGutter`) |
| store (os guardas varrem os dois apps) | **5726 / 312**, exit 0 — idêntico |
| `tsc` backoffice | 0 erros |
| lint backoffice | 23 erros / 5 warnings — a baseline, nada novo |

`packages/core/src/payment/**` não foi tocado. As tabelas do `CLAUDE.md` da raiz e do painel foram
atualizadas.

## O que NÃO foi medido

- **Aparelho real**: o toque é o `touchscreen.tap` do Playwright num contexto `hasTouch`; nem
  Safari de iPhone, nem o navegador interno do Instagram/WhatsApp (já declarados na
  `prova-em-navegador.md`).
- **WebKit e Firefox** não rodaram nesta prova (o WebKit rodou na anterior, para o contador).
- **O parâmetro "não contar" e as duas abas simultâneas** não foram refeitos aqui — estão na
  `prova-em-navegador.md` e na suíte.
- **O tempo real de `orders`** (o bloco relendo quando chega um pedido pago) e **a virada do dia** não
  foram exercitados em navegador; estão na suíte (`AdminDashboard.test.tsx`, `useStoreMovement.test.ts`).
- **Gateway hospedado** (`verify_jwt = false` com só `apikey`) e o **teto de 5.000**: fora — o
  primeiro só depois do deploy, o segundo está no probe `teto.sql`.
- O texto do Apêndice A (o ⓘ e a política) segue **aguardando a Adri**; a decisão de remover
  "Pedidos Hoje"/"Fat. Hoje" segue **assunção pendente** do usuário — a prova só confirma que hoje
  eles estão fora.

## Lições candidatas

1. **Alvo de toque por margem negativa se prova nas quatro bordas, não num ponto.** O alvo de 44 do ⓘ
   passava "5px fora do desenho" de um lado e falhava do outro, porque o vizinho do flex (8px de
   `gap` contra 14px de margem) ocupava a borda. `elementFromPoint` em centro + 4 bordas é a régua
   barata; jsdom não alcança nenhuma delas.
2. **Popover do Radix sem `collisionPadding` encosta na tela.** Segunda ocorrência no painel (`67` D4
   e esta). Vale como padrão para todo `PopoverContent` novo, e talvez como default do componente em
   `packages/ui` — decisão que mexe em todas as telas, e por isso ficou fora daqui.
3. **Prova de ponta a ponta pede o servidor de PRODUÇÃO da loja**, não `pnpm dev:store`: o contador
   recusa por `ambiente` em dev, e um roteiro que "navega e confere zero linhas" passaria medindo a
   recusa errada.
