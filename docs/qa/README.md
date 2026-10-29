# QA — Uma Estrelinha (living docs)

Árvore viva de QA do monorepo, no formato das skills `qa-report` (planeja) e `qa-execution` (executa).
Cada ciclo **acrescenta** a esta árvore; nada é recriado por rodada.

## Códigos de área (ids de cenário)

| Código | Superfície |
| --- | --- |
| `MAD` | `apps/mobile-adm` — o painel do ateliê no celular (programa `72`–`79`, `AD-056`) |
| `LOJA` | `apps/store` — a loja pública |
| `PNL` | `apps/backoffice` — o painel desktop |

Área nova entra aqui antes do primeiro cenário dela.

## Entradas e como subir

| App | Dev | Build servido (prova de PWA) |
| --- | --- | --- |
| loja | `pnpm dev:store` → http://localhost:8082 | `pnpm --filter @estrelinha/store build && … preview` |
| painel | `pnpm dev:backoffice` → http://localhost:8083/admin | — |
| ateliê (mobile-adm) | `pnpm dev:mobile-adm` → http://localhost:8084 | `pnpm --filter @estrelinha/mobile-adm build && pnpm --filter @estrelinha/mobile-adm preview` (o service worker só existe no build) |

Supabase local na faixa 54440–54449 (API :54441, Mailpit :54444). Sem Docker, a sessão intercepta
`**/auth/v1/**` e `**/rest/v1/**` no Playwright (rotas avaliadas em ordem **inversa** de registro).

**O mobile-adm é só Android.** A instalação, o `standalone` e os gestos do sistema só se provam num
aparelho: esses cenários ficam `blocked-verify` até a dona (ou quem tiver o aparelho) andar por eles.

## Política de evidência

Padrão das skills: `evidence/` e `state.csv` são **gitignored** (bloco já no `.gitignore` da raiz).
Screenshots só de checkpoint e de falha; o relatório datado é o registro durável.

## Adotado de

- `reports/2026-10-10-checkout-frete-parcelas.md` e `reports/2026-10-17-retirada-no-escritorio.md`:
  ciclos anteriores ao bootstrap completo desta árvore. Os charters citados neles (`CH-ativar-painel`,
  `CH-checkout-rs-mobile`…) nunca viraram arquivo e não foram migrados: ficam como histórico, indexados
  por aqui.
- `bugs/BUG-20260809-…` e `bugs/BUG-20260829-…`: já corrigidos, mantidos com o id original.
- Provas em navegador por feature continuam em `.specs/features/<nn>-*/prova-*.md`; esta árvore é a
  camada de jornada por persona por cima delas.

## Ciclo planejado — feature `75` (ações no pedido), nível *targeted*

Planejado em 2026-10-24 (`qa-report`), não executado. Jornada nova `J-registrar-material-e-envio`
(20 cenários `MAD-acao-*`, todos `untested`). Ordem por risco, do mais caro ao mais barato:

| # | Charter | Tour | Caixa |
| --- | --- | --- | --- |
| 1 | `CH-acoes-registrar-o-dia-no-celular` | Money | 90 |
| 2 | `CH-acoes-toque-duplo-e-corrida` | Multi-Tab | 60 |
| 3 | `CH-acoes-com-rede-ruim` | Network | 60 |
| 4 | `CH-acoes-conta-sem-acesso` | Garbage | 30 |
| 5 | `CH-acoes-voltar-do-android-na-folha` | Back-Button | 30 |
| 6 | `CH-acoes-com-fonte-grande` | Feature | 30 |
| 7 | `CH-acoes-com-leitor-de-tela` | Feature | 60 |
| canário | `CH-pedidos-achar-o-pedido-da-cliente` e `CH-pedidos-com-leitor-de-tela-e-fonte-grande` (re-run) | — | — |

Reabertos (`untested`) porque a superfície mudou: `MAD-pedido-abrir-e-entender`,
`MAD-pedido-retirada-no-escritorio`, `MAD-pedidos-fonte-grande-e-telas-estreitas`,
`MAD-pedidos-com-leitor-de-tela`. Fixturas e restauração: `.specs/features/75-mobile-adm-acoes-do-pedido/prova/`.
Sem bug aberto da `75` no registro na hora do planejamento.

## Ciclo planejado — feature `76` (Clientes), nível *targeted*

Planejado em 2026-10-24 (`qa-report`), não executado. Duas jornadas novas, `J-achar-uma-cliente` e
`J-ver-uma-cliente` (31 cenários `MAD-cliente*`, todos `untested`), mais quatro cenários da `74`/`72`
reabertos (`MAD-pedido-whatsapp-da-cliente`, `MAD-pedido-abrir-e-entender`, `MAD-pedido-voltar-mantem-recorte`,
`MAD-navegar-pelas-quatro-abas`). Banco local com as fixturas de `.specs/features/76-mobile-adm-clientes/prova/`
(ids `-d076-`, e-mails `@exemplo.invalid`); **não capturar tela com e-mail ou telefone de cliente real**.
Ordem por risco:

| # | Charter | Tour | Caixa |
| --- | --- | --- | --- |
| 1 | `CH-clientes-achar-quem-me-escreveu` | Paste | 60 |
| 2 | `CH-clientes-conta-sem-acesso` | Garbage | 30 |
| 3 | `CH-clientes-numeros-batem-com-o-painel` | Money | 60 |
| 4 | `CH-clientes-do-pedido-a-ficha-e-voltar` | Back-Button | 60 |
| 5 | `CH-clientes-com-rede-ruim` | Network | 60 |
| 6 | `CH-clientes-privacidade-no-aparelho` | Garbage | 30 |
| 7 | `CH-clientes-com-fonte-grande` | Feature | 60 |
| 8 | `CH-clientes-com-leitor-de-tela` | Feature | 60 |
| 9 | `CH-clientes-ficha-ao-vivo-e-troca-de-conta` | Multi-Tab | 30 |
| canário | `CH-pedidos-achar-o-pedido-da-cliente` (WhatsApp do pedido) e `CH-pedidos-voltar-do-android` (re-run) | — | — |

## Ciclo planejado — feature `79` (avisos no celular), nível *targeted*

Planejado em 2026-10-25 (`qa-report`) e **executado no mesmo dia** (`reports/2026-10-25-mobile-adm-avisos-no-celular.md`: 12 pass, 1 consertado, 1 decisão humana, 2 blocked-verify; canários pass). Jornada nova `J-receber-aviso-de-pedido` (16
cenários `MAD-avisos-*`; dois `blocked-verify` — a chegada do aviso e o toque — porque só um Chrome com
FCM ou o Android real os provam). No Playwright o push é dublado (`serviceWorker`, `PushManager` e
`Notification` por `addInitScript`, como em `.specs/features/79-mobile-adm-aviso-de-pedido/probes/04-layout.mjs`);
a porta `atelie-avisos` pode ser interceptada ou servida por `supabase functions serve --env-file .env`.
**Nenhum e-mail real**: a fixtura marca os e-mails do pedido como `sent` antes de disparar. Ordem por risco:

| # | Charter | Tour | Caixa |
| --- | --- | --- | --- |
| 1 | `CH-avisos-ligar-e-receber-o-pedido` | Money | 60 |
| 2 | `CH-avisos-estados-e-falhas` | Network | 60 |
| 3 | `CH-avisos-sair-e-conta-sem-acesso` | Garbage | 30 |
| 4 | `CH-avisos-com-fonte-grande-e-leitor-de-tela` | Feature | 45 |
| canário | `CH-entrar-no-atelie-pelo-celular` (o login agora volta ao destino) e `CH-acoes-registrar-o-dia-no-celular` (`gravarAcao` mudou a tradução da recusa) — re-run | — | — |

Reabertos (`untested`) porque a superfície mudou: nenhum cenário antigo muda de resultado esperado; os
dois canários cobrem `RequireAdmin`/`LoginPage` e `gravarAcao`. Sem bug aberto da `79` na hora do
planejamento.

## Ciclo — feature `82` (Envelope da cliente), nível *targeted*

Planejado e **executado** em 2026-10-26 (`reports/2026-10-26-mobile-adm-envelope-da-cliente.md`: 6 pass, 1
consertado, 9 decisão humana; canário pass). Jornada nova `J-registrar-envelope-da-cliente` (16 cenários
`MAD-envelope-*`). Fixturas: `.specs/features/82-envelope-da-cliente/prova/fixturas.sql` (P82-A..E) mais P82-F
(nome vazio, material sem tipo) e P82-G (três itens), com os mesmos prefixos de id, apagadas por `limpa.sql`. A
perda da resposta de rede se reproduz com `route.fetch()` + `context.setOffline(true)` antes de responder.

**Reteste em 2026-10-27** (mesmo relatório, seção *Reteste*): os seis bugs consertados na Fase 5 passam no
build servido; um achado novo (o foco no `<body>` depois do "Tentar de novo" do bloco do envelope) foi
consertado e retestado. Erro guardado em módulo só se reteste navegando DENTRO do app — `page.goto` recarrega e
o apaga.

| # | Charter | Tour | Caixa |
| --- | --- | --- | --- |
| 1 | `CH-envelope-registrar-o-codigo-da-cliente` | Paste | 60 |
| 2 | `CH-envelope-com-rede-ruim` | Network | 60 |
| 3 | `CH-envelope-voltar-e-outra-aba` | Back-Button | 30 |
| 4 | `CH-envelope-conta-sem-acesso` | Garbage | 30 |
| 5 | `CH-envelope-com-leitor-de-tela` | Feature | 45 |
| canário | folha do rastreio de saída (`J-registrar-material-e-envio`) — `normalizeTrackingCode` mudou | — | — |

## Ciclo planejado — feature `83` (Loja ao vivo, Fase 1: Acessos), nível *targeted*

Planejado em 2026-10-27 (`qa-report`), não executado. Duas jornadas novas, `J-ver-a-loja-ao-vivo` (14
cenários `MAD-aovivo-*`) e `J-ler-a-politica-de-privacidade` (`LOJA-politica-hora-cheia`), mais
`MAD-inicio-cartao-visitas-hoje` em `J-acompanhar-a-loja`; os 16 nascem `untested`. Subir o build servido
do mobile-adm (`vite preview` numa porta livre — 8082–8084 são de outras sessões) contra o banco local
com a migration `20261029120000_83-loja-ao-vivo.sql`, login com o admin do seed. Fixturas em
`.specs/features/83-loja-ao-vivo/prova/` (`fixtura.sql` → sessão → `limpa.sql`; conferir contra
`le-movimento.sql`); o banco local é **compartilhado**: nada de `db reset`/`migration up`, e o que não
couber na fixtura (teto do dia, visitas sem hora, resposta sem `acessos`, `42501`) é interceptado no
Playwright. Fonte por `html { font-size }` a 100/130/200 %, em 360/390/412 e 1440. Ordem por risco:

| # | Charter | Tour | Caixa |
| --- | --- | --- | --- |
| 1 | `CH-aovivo-numeros-certos-do-dia` | Money | 90 |
| 2 | `CH-aovivo-conta-sem-acesso` | Garbage | 30 |
| 3 | `CH-aovivo-com-rede-ruim` | Network | 45 |
| 4 | `CH-aovivo-ligada-enquanto-trabalho` | Interrupt | 60 |
| 5 | `CH-aovivo-do-inicio-e-voltar` | Back-Button | 30 |
| 6 | `CH-aovivo-com-fonte-grande` | Feature | 45 |
| 7 | `CH-aovivo-com-leitor-de-tela` | Feature | 45 |
| 8 | `CH-loja-politica-hora-cheia` | Feature | 15 |
| canário | `CH-inicio-numeros-certos-do-dia` e `CH-inicio-ao-vivo-e-atualizado` (re-run: a Início ganhou o cartão, o período controlado e a releitura de 30 s) | — | — |

Reabertos (`untested`) porque a superfície mudou: `MAD-inicio-abrir-e-entender-o-dia`,
`MAD-inicio-trocar-periodo`, `MAD-inicio-numeros-grandes`, `MAD-inicio-com-leitor-de-tela`.
Ficam `blocked-verify` até o Android real: o Chrome em segundo plano de verdade, o gesto de voltar, o
puxar com o dedo e a escala de texto do sistema (a prova T13 escalou pela raiz). Fora do ciclo: a
aprovação do texto da política pela Adri (pré-condição do deploy, não de QA) e `BL-059` (Descontos na
barra de abas a 200 %, anterior à `83`). Sem bug aberto da `83` no registro na hora do planejamento.

**Executado em 2026-10-27** (`reports/2026-10-27-mobile-adm-loja-ao-vivo.md`): 5 Pass, 2 `blocked-verify` (Android e TalkBack reais), 3 esperando decisão. Três bugs de atrito: `BUG-20261027-tentar-de-novo-da-loja-ao-vivo-solta-o-foco`, `BUG-20261027-f5-desfaz-o-periodo-escolhido-na-loja-ao-vivo` e `BUG-20261027-rodape-da-loja-rola-de-lado-com-fonte-200` (anterior à `83`).

**Reteste em 2026-10-27** (`reports/2026-10-27-mobile-adm-loja-ao-vivo-reteste.md`): o foco do "Tentar de novo" consertado (`5b23601d`) passa em 390 e 1440 a 100 e 200 %; o arroba do rodapé (`49f8bbb5`) não passa mais da borda, mas a loja ainda rola de lado a 390/200 % pelo **cabeçalho** (`scrollWidth` 434, decisão pendente). O F5 que desfaz o período segue aberto, esperando decisão.

## Ciclo — feature `84` (SEO do produto com IA), nível *targeted*

Planejado em 2026-10-27 (`qa-report`). Duas jornadas novas, `J-publicar-peca-sem-escrever-seo` e
`J-curar-seo-com-ia` (9 cenários `PNL-seo-*`), e a persona `Adri cadastrando peças` entrou em
`personas.md`. Só ambiente local: painel em :8083 contra o banco local; o 503 é real
(`supabase functions serve seo-suggest` sem a chave), 200/429/502/422 interceptados; `*.supabase.co` e
`**/g/collect*` bloqueados. Produtos de teste `TESTE-84-QA-`, apagados no fim. Reteste de D1/D2 da
`prova-navegador.md` dentro de `CH-seo-fonte-grande-teclado-e-leitor`.

| # | Charter | Tour | Caixa |
| --- | --- | --- | --- |
| 1 | `CH-seo-publicar-peca-sem-escrever-seo` | Money | 45 |
| 2 | `CH-seo-falhas-sem-perder-trabalho` | Network | 30 |
| 3 | `CH-seo-sugerir-revisar-desfazer` | Feature | 45 |
| 4 | `CH-seo-sugestao-no-ar` | Interrupt | 30 |
| 5 | `CH-seo-fonte-grande-teclado-e-leitor` | Feature | 45 |

Fora do ciclo: o probe contra a Claude API real (sem chave), Android e leitor de tela reais. Anteriores à
`84`, não registrados como bug dela: rolagem lateral pelo `SlugField` a 200 %, preço 0 travando o
publicar com a frase do checklist, parágrafos sem pontuação na descrição derivada, título derivado de nome
longo passando de 60.

**Executado em 2026-10-27** (`reports/2026-10-27-backoffice-seo-com-ia.md`): 3 Pass, 2 esperando decisão. D2 passa; D1
passa em parte (selo consertado, título da prévia ainda truncado a 200 %). Cinco bugs: um Trust-Damage (a segunda
sugestão perde o texto escrito à mão) e quatro Friction (foco no body, sucesso não anunciado, prévia a 200 %, frase
velha de falha).

## Ciclo planejado — feature `85` (o Resumo com as imagens do produto), nível *targeted*

Planejado em 2026-10-28 (`qa-report`), não executado. Jornada nova `J-ver-e-cuidar-das-fotos-da-peca` (12 cenários
`PNL-midia-*`, todos `untested`), personas Adri cadastrando peças e Equipe com TalkBack. Reaberto (`untested`)
`PNL-variacoes-imagem-na-linha-e-envio` (o envio da variação entra agora no Resumo e no modal Mídia). Só ambiente
local: painel do worktree num Vite em porta livre (a T12 usou :8093) contra o Supabase local :54441;
`*.supabase.co` e `**/g/collect*` bloqueados; peças `TESTE-85-QA-` e os objetos que elas enviarem ao bucket
`product-images` apagados no fim. Produtos de leitura: `fdc81401-…` (28 fotos), `ff520070-…` (9), `eb0d919d-…` (6) —
**não salvar**. A re-medida de MOD-07 em 390 (consertado depois da prova, só provado por token) está em
`CH-midia-celular-e-fonte-grande`. Ordem por risco:

| # | Charter | Tour | Caixa |
| --- | --- | --- | --- |
| 1 | `CH-midia-ver-e-cuidar-da-peca-no-celular` | Money | 60 |
| 2 | `CH-midia-regressoes-da-pagina` | Back-Button | 45 |
| 3 | `CH-midia-falhas-de-envio` | Network | 45 |
| 4 | `CH-midia-muitas-fotos` | Feature | 45 |
| 5 | `CH-midia-celular-e-fonte-grande` | Feature | 45 |
| 6 | `CH-midia-teclado-e-leitor` | Feature | 45 |
| 7 | `CH-midia-produto-sem-imagem` | Feature | 30 |
| 8 | `CH-midia-arrastar-arquivo` | Feature | 30 |
| canário | `CH-variacoes-cadastrar-pecas-repetidas` — só o modal de imagem da variação (envio e 28 fotos) | — | — |

Bug conhecido, anterior à `85` e já com evidência: `BUG-20261028-produto-abre-com-alteracoes-nao-salvas` (abrir a
peça sem editar já diz "Alterações não salvas" e grava rascunho; reproduzido na `master`; na `85` o aviso de rascunho
empurra a foto principal 10px abaixo da dobra em 390). Ficam `blocked-verify` (só humano): o arrasto nativo de
arquivo do sistema operacional, o gesto com dedo real no Android e o TalkBack real. Fora do ciclo: a dobra de
1024/1440 é Goal e não AC (medir e relatar, não reprovar).

**Executado em 2026-10-28** (`reports/2026-10-28-backoffice-resumo-com-imagens.md`): 8 charters + canário; 9 cenários
pass, 3 fail, 1 blocked-verify. MOD-07 re-medido em 390: remover 44×44, Gerar 81×44, alt 328×44 — passa. Sete
bugs Friction novos (três anteriores à 85: ordem só por arrasto, foco do modal da variação, e o lote de falhas
provavelmente) e dois re-found (abrir sujo; "Close"). Da própria 85: o Resumo corta texto a 200 %, o foco cai no
body ao resolver a pendência de imagem, o envio não é anunciado ao leitor e as linhas "enviada" ficam na tela.
Peças `TESTE-85-QA-` e os 14 objetos enviados foram apagados.

## Ciclo planejado — feature `86` (o menu montado pela dona), nível *targeted*

Planejado em 2026-10-28 (`qa-report`) e **executado no mesmo dia** (`qa-execution`): `reports/2026-10-28-backoffice-menu-montado-pela-dona.md` — 19 pass, 8 fail, 11 bugs novos (8 da 86, 3 anteriores) e 2 re-found. **Reteste (rodada 2) em 2026-10-29**: `reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste.md` — as 10 correções verified, 3 bugs novos das correções (1 Medium, 2 Low), not ready. **Reteste (rodada 3) em 2026-10-29**: `reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r3.md` — os 3 bugs do r2 verified, R05 verified, 2 bugs novos Low (filha num segmento recusada; foco na reabertura do seletor), not ready. Duas jornadas novas, `J-montar-o-menu-da-loja` (22
cenários `PNL-menu-*`) e `J-navegar-pelo-menu-da-loja` (5 cenários `LOJA-menu-*`); os 27 nascem `untested`.
Duas personas novas em `personas.md`: **Adri montando o menu** (pouco técnica, 390 e toque) e **Cliente
navegando pelo menu** (contexto memorial, celular); a terceira é a Equipe com TalkBack.

**Ambiente — só local.** Supabase local (API `127.0.0.1:54441`), loja dev em :8082 e painel dev em :8083
(os dois com `VITE_SUPABASE_URL` local), admin do `supabase/seed.sql`. No contexto do Playwright: abortar
`*.supabase.co` e o GA **por host** (`google-analytics.com`, `googletagmanager.com`, `analytics.google.com`)
mais `**/g/collect*` — nunca por substring da URL (o regex casou `src/features/google-analytics` do painel
e o deixou em branco, `prova-navegador.md`). **Antes da sessão** guardar `store_settings.menu` (hoje
legado, sem `version`) e o retrato de `categories` (`id, name, slug, parent_id, sort_order, active, icon,
menu_desktop, menu_mobile, menu_banners`); **no fim** restaurar e conferir com `diff`/`cmp`. Categorias de
teste com prefixo `TESTE-86-QA-` (inativa, apagada, renomeada, com > 24 filhas), apagadas no fim; arte de
banner só no Storage local (`home-images/menu`), objetos de teste apagados. Fixturas de documento (v2
vazio, 20 itens, link externo legado) por `update` no banco local, restauradas. Falhas de gravação e
leitura por interceptação de `**/rest/v1/store_settings*`; a resposta perdida por `route.fetch()` +
`context.setOffline(true)`. Fonte por `html { font-size }` a 100/130/200 % em 360/390/1024/1440;
movimento por `emulateMedia({ reducedMotion: 'reduce' })`. Nada de produção.

Ordem por risco:

| # | Charter | Persona | Tour | Caixa |
| --- | --- | --- | --- | --- |
| 1 | `CH-menu-montar-do-zero-no-celular` | Adri montando o menu (390) | Money | 90 |
| 2 | `CH-menu-primeiro-acesso-loja-igual` | Adri montando o menu (1440) | Feature | 45 |
| 3 | `CH-menu-gravacao-com-rede-ruim` | Adri montando o menu (390, 4g) | Network | 45 |
| 4 | `CH-menu-duas-janelas-e-toque-duplo` | Adri montando o menu (1440) | Multi-Tab | 45 |
| 5 | `CH-menu-loja-depois-de-gravar` | Cliente navegando pelo menu (390 e 1440) | Back-Button | 45 |
| 6 | `CH-menu-limites-e-enderecos-invalidos` | Adri montando o menu (390) | Garbage | 60 |
| 7 | `CH-menu-editar-nome-icone-banners` | Adri montando o menu (1440) | Interrupt | 45 |
| 8 | `CH-menu-celular-fonte-grande-e-movimento` | Adri montando o menu / Cliente | Feature | 45 |
| 9 | `CH-menu-teclado-e-leitor` | Equipe com TalkBack | Feature | 45 |
| canário | `/admin/home`: a prévia ainda abre e acompanha (o `StoreLayout` mudou para a folha da prévia abrir no quadro de 390, e `previaUnica` foi tocado); loja: a folha do celular abre e fecha fora da prévia | — | — | 15 |

O que a `prova-navegador.md` deixou sem medir e este ciclo cobre: o conflito entre janelas em navegador
(#4), os banners do nó em navegador (#7), a fonte grande e o movimento reduzido (#8), o teclado/leitor
(#9). Ficam `blocked-verify` (só humano): o arraste com o dedo no Android/iOS real (o caminho de toque é
"Mover…"), o TalkBack real e a escala de texto do sistema.

**Registro de bugs para este ciclo.** Nenhum bug da `86` aberto na hora do planejamento. Antes de abrir
um bug novo, procurar em `bugs/` — candidatos a **re-found** (atualizar o arquivo existente e acrescentar
o cenário em `Scenarios`, não duplicar): `BUG-20261026-fechar-do-modal-em-ingles` (o X do `Dialog`
anuncia "Close", 16 × 16, no seletor e no editor do menu) e
`BUG-20261027-rodape-da-loja-rola-de-lado-com-fonte-200` (o cabeçalho da loja ainda rola a 390/200 %).
Achados da prova, anteriores à `86` e **ainda não registrados** (registrar só se um persona os encontrar
na sessão, com cenário ligado): "Ver na loja" de `/admin/home` abre a raiz do painel
(`AdminHomePage.tsx:254`, o mesmo defeito consertado no menu); campo de busca do `MenuIconPicker` (36 px)
e a barra do palco da prévia (36 px, compartilhada com `/admin/home`). Bug de cenário `PNL-menu-*`/`LOJA-menu-*`
leva o id no `bug_ids` do cenário; impacto pela régua de `bug-registry.md` — gravar o que não salvou ou
sobrescrever a outra janela é Data-Loss; item que leva a cliente a 404 é Trust-Damage.

Taxonomia por jornada: as cinco dimensões estão no rodapé de cada `J-*.md`. Em `J-navegar-pelo-menu-da-loja`
a concorrência é N/A declarada (só leitura).
