# 71 · Visitas únicas no Dashboard — prova em navegador (task 29)

Medida em **2026-10-22**, entre 05:07 e 05:15 UTC (02:07–02:15 em Brasília), por roteiro Playwright
escrito para esta prova (fora do repositório). Autor = quem implementou o lote L5; o Verifier
independente roda depois da task 32.

## Montagem

| Peça | Como | Observação |
| --- | --- | --- |
| Banco | Supabase **local** (54441/54442), `supabase status` sem `--all` | Nada com `--linked`. Nenhuma escrita no hospedado |
| Function `visit` | `supabase functions serve` (o container do edge runtime estava parado na entrada, como na baseline) | Parado no fim; o ambiente voltou ao estado de entrada (12 containers de pé) |
| Loja | `pnpm --filter @estrelinha/store build` + `vite preview --port 8082` | Build de **produção**: o contador só chama com `import.meta.env.PROD` (`VIS-22`) |
| Painel | `vite` na 8083, `.env` local (`VITE_STORE_URL=http://localhost:8082`) | Login com o admin do `seed.sql` |
| Navegadores | Playwright **1.61.1** (o módulo que casa com os navegadores instalados: Chromium 1228, WebKit 2311) | O 1.64 do cache do `npx` pedia Chromium 1247, não instalado |

**Estado semeado SÓ no banco local, e restaurado no fim** (conferido por `diff` contra o JSON lido na
entrada):

- `store_settings.analytics.production_host` = `localhost` (era `umaestrelinha.com.br`);
- `store_settings.analytics.enabled` = `false` (era `true`, com o `measurement_id` real). Desligar o
  GA4 durante a prova faz duas coisas: impede qualquer hit à propriedade real (a lição da `68`) **e**
  prova o Success Criterion "com o GA4 desligado no painel, o contador conta".
- `store_visits` tinha **0** linhas e `store_visit_counter` **não existia**. A prova gravou 4 linhas
  (uma por navegador novo: ponta a ponta, WebKit, duas abas, recusa) e criou o contador; os dois
  voltaram a 0 linhas / ausente.

## O bundle servido foi conferido antes de medir

`GET /` da 8082 → o único script de entrada (`/assets/index-Bure0fsn.js`) contém
`/functions/v1/visit` **e** o nome do parâmetro de "não contar", e nenhum endereço do projeto
hospedado; o `.js` do build cita `127.0.0.1:54441` e mais nada do Supabase.

## A neutralização do robô, e o par sem ela

O Chromium do Playwright é recusado pelo próprio filtro, e isso foi provado antes de neutralizar:

| Contexto | `navigator.webdriver` | UA | POSTs à `visit` | Linhas gravadas |
| --- | --- | --- | --- | --- |
| **sem** neutralização, `/` + 3 rotas, 4 s de espera | `true` | `…HeadlessChrome/149…` | **0** | 0 |
| chamada direta à function com UA `HeadlessChrome` e `Origin` casando | — | `HeadlessChrome/131` | — | 0, resposta `200 {"desfecho":"robô"}` |

Nos demais cenários: `Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false })`
por script de inicialização (vale para todos os frames) e UA comum (Chrome de Android em 390, Chrome
de Mac em 1440, Safari de iPhone no WebKit).

## Ponta a ponta (Chromium, 390×844)

| Passo | POSTs acumulados | Resposta |
| --- | --- | --- |
| abrir `/` e navegar 5 rotas pelo router (`/sobre`, `/perguntas-frequentes`, `/politica-de-privacidade`, `/politicas-de-trocas-e-devolucoes`, `/como-enviar-seu-material-de-dna`) | **1** | `200 gravada`, dia `2026-10-22`, `ate` e `agora` inteiros |
| recarregar a página | **1** (zero novos) | — |
| relógio do navegador 26 h adiante (`clock.setFixedTime`), nova página | **2** | `200 repetida` (o servidor está no mesmo dia e deduplica) |

- O corpo enviado é **exatamente** `{"id":"<uuid>"}`; nenhum cabeçalho `Authorization`; o `apikey` é
  a chave **publicável** (`VIS-13`, pelo gateway real).
- O marcador gravado é `{ v: 1, id, ate, em }` com `ate` no relógio local (`VIS-16`).
- O banco ficou com **1** linha para aquele id.
- **O Dashboard real mostra 1** em Visitas únicas, em 390 e em 1440, com "Contando desde 22/10 às
  02h07" (o `started_at` gravado pela primeira visita da prova — e Hoje começa às 00:00, antes dele,
  então a linha aparece em Hoje, como `VIS-38` manda), Vendas `0`, Faturamento `R$ 0,00` e Ticket
  `—` com "sem vendas no período".

## WebKit (Safari), sem `requestIdleCallback`

`typeof requestIdleCallback === 'undefined'` e `navigator.locks` presente. A carga gerou **1** POST
(`gravada`). Depois, com `document.readyState === 'complete'`, o prazo do marcador foi vencido à mão
e uma navegação de SPA gerou **mais 1** (`repetida`) — o ramo do `setTimeout` direto, que um ouvinte
de `load` nunca alcançaria depois da troca de rota (`VIS-17`).

## Duas abas, recusa e "não contar"

| Cenário | Resultado |
| --- | --- |
| duas abas abertas **juntas** (`Promise.all` dos dois `goto`) | o **mesmo** id nas duas; 2 POSTs com **1** id distinto; **1** linha no banco (`VIS-20`) |
| recusa na aba A ("Preferências" → Estatísticas desligada → "Salvar escolhas"), depois a aba B com o prazo vencido navega duas vezes | o marcador fica `{ id: null, ate, em }`; a aba B faz **0** POSTs (`VIS-24`, `VIS-25`). Controle: a mesma manipulação do prazo sem recusa gera a chamada (cenário WebKit acima) |
| `/sobre?nao-contar=1&utm_source=teste` | URL vira `/sobre?utm_source=teste`; o aviso "Este navegador não é mais contado nas visitas da loja." aparece; a marca fica `'1'`; `history.length` = 2 (a troca é `replace`); 2 navegações depois, **0** POSTs; voltar duas vezes termina em `/sobre?utm_source=teste`, nunca no endereço com o parâmetro (`VIS-42`) |
| a loja dentro do iframe de `/admin/home` (`http://localhost:8082/?preview=1`), 9 s, contexto neutralizado e armazenamento limpo | **0** POSTs (`VIS-17`: o contador só monta fora da prévia) |

## O bloco "Movimento da loja" — `VIS-11`, `VIS-08`, `VIS-39`

A RPC `store_movement` foi **interceptada** com três respostas: valores máximos (`9.999` e
`R$ 99.999,99` nos quatro cards, com a linha do teto), contador vazio com um host de 80 caracteres
sem espaço, e erro 500.

| Medida | 390 × 844 | 1440 × 900 |
| --- | --- | --- |
| `scrollWidth` do documento e do `body` = viewport, nos três estados | **390 / 390** | **1440 / 1440** |
| colunas da grade | 2 (cards de 165px) | 4 (cards de 279px) |
| valor em uma linha e dentro do card, nos 4 cards | sim (`R$ 99.999,99` cabe em 165px) | sim |
| rótulo com mais de 2 linhas | nenhum ("Visitas únicas" usa 2 ao lado do ⓘ e do ícone) | nenhum (todos em 1) |
| abas | 44px de altura cada (Hoje 62 · Ontem 77 · Esta semana 116 de largura) | 44px |
| ⓘ | **44 × 44**, ícone desenhado de 16 × 16 | **44 × 44** |
| "Tentar de novo" (erro) | 44px de altura | 44px |
| texto do `VIS-39` com host sem espaço | quebra dentro da largura (3 linhas em 342px), sem empurrar a página | 1 linha |

**ⓘ em navegador** (o que o jsdom não sintetiza): toque/clique **5px fora do desenho do ícone**,
ainda dentro do alvo, abre o Popover com o texto de `VISIT_INFO_TEXT` e `aria-expanded="true"`; toque
fora (no título da página) fecha; **Enter** abre; **Esc** fecha e devolve o foco ao botão; **Espaço**
abre. Em 390 o contexto tem `hasTouch` e o toque é `touchscreen.tap`.

## O que saiu do navegador para fora

- **GA4**: zero requisições — nem `gtag/js` nem `g/collect` (interceptados **por caminho**, e
  contados: 0), porque o interruptor estava desligado no banco local.
- **Supabase hospedado**: na **primeira rodada** (bundle, par sem neutralização e ponta a ponta) a
  Home fez **GETs públicos de imagem** no Storage hospedado (`…supabase.co/storage/v1/render/image/
  public/home-images/…`). A causa é **dado**, não código desta feature: as seções da Home no banco
  local guardam `image_url` do Storage hospedado. Foram leituras anônimas de arquivo público, sem
  credencial e sem escrita. A partir da segunda rodada todo `*.supabase.co` foi **bloqueado por rota**
  e contado. Nenhuma requisição às APIs do hospedado (REST, RPC, functions, auth) aconteceu em
  momento nenhum: o bundle só conhece `127.0.0.1:54441`.
- Miniaturas do YouTube (`i.ytimg.com`) do guia de material, também por dado da página.

## O log da function

As 9 linhas de `visit` no log do `functions serve` têm a forma `{"fn":"visit","desfecho":"…"}` —
`robô`, `gravada`, `repetida` — e **nenhuma** carrega id, IP ou user agent (`VIS-29`).

## O que ficou fora (declarado)

- **Navegador interno do Instagram e do WhatsApp em aparelho real** — se apagam o armazenamento entre
  sessões. Exige aparelho; a spec já marca a assunção como "n — medir".
- **Gateway hospedado** com só `apikey` e `verify_jwt = false`: só depois do deploy, conferindo a
  "Última visita registrada" no bloco.
- **Safari de iPhone real**: o WebKit do Playwright cobre a ausência de `requestIdleCallback`, não o
  ITP nem o armazenamento particionado.
- **Recusa + reaceite no mesmo dia** e **teto de 5.000** não foram refeitos em navegador: estão
  provados por unidade (L3) e por probe no banco (L1, `teto.sql`).
- A suíte de store e backoffice é remedida depois da restauração do banco no gate de fecho (task 32).
