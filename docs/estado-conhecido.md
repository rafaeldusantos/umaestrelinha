# Estado conhecido e dívidas

Saiu do `CLAUDE.md` da raiz em 2026-11-14 (~57 KB relidos em toda chamada de todo agente). É o estado de
cada frente — o que está em branch sem merge, a ordem de publicação, o que falta provar — e o que espera
decisão da dona. **Registro novo entra aqui, no topo**, não no `CLAUDE.md`.

Abaixo, o conteúdo da seção como estava em 2026-11-14, sem edição.


- **O WI-01 (Compre Junto) está IMPLEMENTADO na branch `feature/WI-01`, sem push**, com quatro migrations
  aplicadas **só no banco local** (`AD-072`). **Ordem de publicação**: a migration das tabelas
  (`20261105120000`) → a de conversão (`20261105130000`, que copia `products.buy_together_ids` para os
  adicionais) → a da marca no pedido e a do relatório (`20261106120000`, `20261107120000`) → o painel →
  a loja e a function `checkout` → e o `drop column` de `products.buy_together_ids` **só depois do painel
  publicado** (migration futura; `compreJuntoSemColunaAntiga.test.ts` garante que o painel não a manda).
  **Antes do deploy, o usuário confere a contagem de `buy_together_ids` preenchido em produção** — é o
  que a conversão vai levar. ⚠️ **Migration nova nunca vai à `master` sem pergunta**: o push aplica as
  quatro no banco hospedado. A aba **Adesão** (`/admin/compre-junto/adesao`) conta só pedidos com a
  marca, então nasce vazia — o histórico começa no primeiro pedido feito depois do deploy da loja e da
  `checkout`. **Falta a prova em navegador** do relatório (tabela em 1440, cartões em 390 sem rolagem
  horizontal) — jsdom não mede layout, e a medida é da Validation/QA.

- **A `83` (Loja ao vivo, Fase 1) está IMPLEMENTADA e commitada na branch `feature/83-loja-ao-vivo`,
  sem push e sem merge**, verificada (três rodadas, lacunas fechadas), com QA e reteste. Falta o
  **Android real** (fonte do sistema, gesto de voltar, puxar com o dedo, aba em segundo plano de
  verdade) e o TalkBack real. O F5 que desfazia o período escolhido em `/ao-vivo`
  (`BUG-20261027-f5-desfaz-o-periodo-escolhido-na-loja-ao-vivo`) foi consertado por decisão do usuário
  (`gravarPeriodoNaEntrada` a cada troca; mobile-adm **2168/137**). Espera decisão o cabeçalho da loja rolando de lado a 390/200 %
  (`scrollWidth` 434; qual parte cede, logo, recuo ou ícones). **Ordem de publicação:
  migration → bundle** (o app lê a chave `acessos`; com o banco antigo, a seção desenha os números e a
  frase estática do gráfico). **A aprovação da Adri é pré-condição do deploy** (o parágrafo novo da
  Política; a emenda à `VIS-28` foi confirmada pelo usuário em 2026-10-27). Os probes da `83` entram no gate de quem recriar `store_movement` ou
  `record_store_visit` (`BL-057`). Achados da prova em navegador, fora do escopo: `BL-059` (o rótulo
  "Descontos" da barra de abas a 200 %) e a fonte escalada pela raiz não crescendo o que é `px` fixo.
- **A `80` (o fornecedor da peça) está IMPLEMENTADA, sem commit.** Ordem de publicação: a migration
  `20261022150000_80-fornecedor-da-peca.sql` num push sozinho, depois o painel — a listagem e o
  formulário embutem `product_suppliers` no `select`, e sem a tabela a leitura inteira falharia. Duas
  dívidas achadas por ela e **não** consertadas: `products.cost_price` é legível pela chave pública (a
  mesma causa do `AD-064`; o conserto é mover o custo para uma tabela de admin, ou trocar a policy
  pública por uma view sem a coluna), e a página do produto no painel rola na horizontal em 390 por
  causa da tabela de Variações (825px).
- **A `79` (avisos no celular) está implementada, sem commit, com pendências declaradas.** Falta a
  chegada do aviso **num Chrome real** (o usuário mandou seguir sem ela, 2026-10-25) e **no Android
  real** (permissão, tela de bloqueio, toque abrindo o pedido, "Não perturbe"; TQ6) — o roteiro está em
  `.specs/features/79-mobile-adm-aviso-de-pedido/prova-navegador.md`. **Ordem de publicação: migration →
  secrets → functions → bundle** (`supabase/CLAUDE.md`, *As chaves do aviso no celular*). ⚠️ **As chaves
  VAPID de dev estão no `.env` da raiz**: um `supabase secrets set` rodado de lá as gravaria em produção
  (`BL-044`); as de produção são geradas à parte e gravadas de um diretório sem `.env`, conferindo
  `{"count":2}`. Sem as chaves o canal simplesmente não existe e o e-mail segue igual (`MAN-37`).
- **A `76` (Clientes no app do ateliê) está pronta para merge, com pendências declaradas.** Falta o
  **Android real** (teclado, gesto de voltar com o campo focado, área segura, fonte do aparelho; TQ10) e o
  reteste em navegador com toque de bug-16/18 e a 130 %/200 % de bug-17/B13 — jsdom não mede layout. Dois
  bugs do QA esperam decisão humana: **B03** (a busca não acha nome com acento digitado sem acento; a saída é
  `unaccent` no banco) e **B12** (`MAC-18` × `MAC-35`: o nome do item da ficha traz o material). `BL-052`
  (o painel sem o escape de `ilike`) e `BL-053` (custo de `customer_stats`, ~7,9 s com 3.000 pessoas). **Ordem
  de publicação: migration → bundle** (o `select` pede `orders_open`).
- **A `71` está IMPLEMENTADA e provada no banco local e em navegador** (`prova-em-navegador.md`, com
  a leitura interceptada, e `prova-navegador.md`, de ponta a ponta contra o banco local), e foi
  **verificada em três rodadas**: r1 FAIL (cobertura e um defeito raro, G4 — consertado), r2 FAIL
  (cobertura, G7/G8 — consertados), **r3 FAIL por uma lacuna de cobertura nova, G9, NÃO consertada**:
  o prazo `ate` que `store_clock` devolve nas respostas `robô`, `interno` e `limite` não tem régua nem
  probe — só o do outro produtor (`record_store_visit`) é provado, e o teste do handler dubla o valor.
  O código de hoje devolve o prazo certo (a fixtura do verificador passa nele); o conserto é só de
  prova e está escrito no apêndice da r3 do `validation.md`. Os dois consertos do ⓘ (`StatCard` e
  `StoreMovement.tsx`) vieram **depois** da r3 e não passaram por verificador independente. Antes do deploy: (1) o usuário confirma as cinco
  assunções `n — confirmar` da spec — entre elas a **saída dos cards "Pedidos Hoje" e "Fat. Hoje"**
  (só a task 27; revertê-la os devolve); (2) a Adri aprova o texto do Apêndice A; (3) **a ordem de publicação é
  migration → function → bundles**: a migration num push sozinha (sem as tabelas e as RPCs, o bloco
  do painel cai em erro e a function `visit` responde 500), e o `notice` do `db push` diz se o job de
  poda foi agendado; depois a function `visit` (nova, `verify_jwt = false` pelo `config.toml`) — o
  mesmo deploy republica a `checkout`, que passou a reexportar o limitador de `_shared/rateLimit.ts`;
  por último os dois apps. (4) Antes de cada deploy que mexa na migration ou nas RPCs, rodar os
  probes de `.specs/features/71-visitas-unicas-no-dashboard/probes/` contra o banco local — a metade
  semântica do SQL só é provada por eles, e eles não rodam no CI. O handoff no `STATE.md` lista quem
  decide cada uma.
- **A `69` está PROVADA em plataforma** (2026-10-20): preview com `X-Vercel-Cache: HIT` e `pdx1`;
  produção com produto 200 (`MISS` 0,9 s, `HIT` 0,25 s), 404 com `noindex`, 301 de categoria inativa
  e 308 da barra final, por `curl`. A function `product-page` hospedada foi apagada.
  - **O Dia do DNS está FEITO**: a env da Vercel, o secret da Supabase e a variável do GitHub
    apontam para `https://umaestrelinha.com.br`, e o `robots.txt` servido anuncia o sitemap no
    domínio próprio (conferido em 2026-11-01, com o `Sitemap check` verde de novo).
  - **A `70` está em produção**: `/sitemap.xml` é servido pela função `api/page` (`server: Vercel`,
    `pdx1`), com `X-Vercel-Cache: HIT` na segunda batida (medido em 2026-11-01). Falta conferir se a
    edge function `sitemap` foi apagada do hospedado.
  - **O feed do Google chega como `text/plain`** (medido em 2026-11-01 em
    `/feeds/google-shopping.xml`): ele ainda passa pelo gateway `*.supabase.co`, que reescreve o tipo
    (`BUG-20260829`), e o `vercel.json` não tem header para essa rota. O corpo é RSS válido.
  - **Um `seo_title` curado já com a marca dentro sai com a marca duas vezes** ("…| Uma… | Uma
    Estrelinha"), medido na prova local da `69` num produto. É dado, não código da `69`: a régua de
    `core/seo` corta o título curado e acrescenta a marca. Curadoria em `/admin/produtos`.
  - **Categoria inativa aberta por link interno continua 404 no cliente** (o servidor dá 301): o
    cliente não vê a RPC (`L-027`). Só acontece por link interno, e o menu só lista ativas.

- **A régua da `68` é uma só, mas a ENTRADA dela não é** (achado da verificação, rodada 1). A loja
  passa `options` já normalizado por `normalizeOptions` (`@estrelinha/core/product`: apara o nome do
  eixo, descarta eixo sem `values`); a função `api/page` (antes a `product-page`) e o `sitemap` passam o `options` **cru** do
  banco, porque `core/product/index.ts` importa tipos de `@estrelinha/supabase/types` e **não é
  alcançável pelo Deno**. Com um eixo `" Cor "`, loja e servidor responderiam diferente sobre a mesma
  URL. **Medido em 2026-10-19: zero** eixos com nome mal aparado e zero sem `values`, em 707 eixos,
  no banco local **e** em produção — por isso não foi consertado dentro da `68`. O conserto é levar
  `normalizeOptions` para um arquivo-folha alcançável (molde de `shipping/pickup.ts`) e chamá-la
  dentro de `indexableOptions`.
- **A `64` (lista de categorias) TEM prova no banco local, em navegador e verificação independente
  (PASS, 42 mutantes).** A prova achou um defeito e ele foi consertado na mesma tarefa (o recuo final do
  rolador fora da área rolável — `apps/store/CLAUDE.md`). O que ficou fora da medição: o arrasto
  com o dedo em 390 (medido só o `scroll-snap-type`), leitor de tela, LCP em Slow 4G, o aviso de
  proporção e a falha de envio em navegador, e o painel em 390. Dívidas declaradas pela feature:
  - **O `cruzar` de quatro estados do `CategoryListEditor` é cópia do de `CollectionRowsEditor`**
    (`design-r2` R3). Dois editores dizendo "a coleção saiu do ar" com duas escritas divergem sem
    nada quebrar.
  - **O arrasto `soltar` ganhou a SEXTA cópia** no painel. Cada editor de lista reordena à mão.
  - **`config.limit` corta qualquer tipo** em `resolveHomeSections`, e a `64` (como a `50`) não o
    usa: o teto é recusa. Uma escrita direta de `limit` num `category_grid` cortaria a fileira sem a
    dona ver o porquê.
  - **`widgets/category-grid` está morto no repositório** e tem o nome do tipo que agora é desenhado
    por `widgets/category-list`.
  - **`ProductPicker.tsx` foi tocado fora do *Where* planejado** (`title: null` no item de peça) —
    sem isso o `tsc` do painel recusava.
- **A `59` TEM prova em navegador e verificação independente (rodada 2 PASS).** O que ficou fora:
  - **`MAT-05` de ponta a ponta não foi caminhado em navegador** (enviar o código e ver a pendência
    sumir). A releitura está provada pelo estado do cache; o percurso, não.
  - **A bolha do WhatsApp cobre 64px do cartão de pedidos em 1024** enquanto se rola — a folga
    (`WHATSAPP_FLOAT_CLEARANCE`) protege o FIM da página, não o meio. Em 1440 há 144px livres.
    Observação, não defeito: é o comportamento de toda bolha flutuante da loja.
  - **O link do Melhor Rastreio foi conferido** (`/rastreio/{código}` → 301 → página do pacote com a
    transportadora detectada), com código sintético.
  - **A renumeração dos `NP-` roda no `db push` de produção** — ver o handoff da `59` no `STATE.md`.
  - **As oito escritas antigas de `wa.me` continuam à mão**; só as peças novas usam `whatsappHref`.
  - **"Fale comigo pelo WhatsApp — eu respondo pessoalmente"** (bloco de ajuda da coluna
    lateral) é afirmação de operação escrita sem a dona confirmar. Desde 2026-10-17 a copy da loja
    fala na primeira pessoa da Adri ("fale comigo", "eu aviso"), nunca "a gente"/"nós": ela atende
    sozinha. Mensagem técnica ("Não foi possível…") fica impessoal.

- **A `58` TEM prova em navegador (os cinco estados e o percurso inteiro, em 390 e 1440), e NÃO tem
  verificação independente.** Autor = verificador; nove mutantes foram reinjetados nos arquivos
  reais e os nove morreram por asserção. O que ficou fora da medição, e é o que a próxima sessão
  deve fechar:
  - **O caminho do CARTÃO não foi caminhado em navegador** — o Brick precisa do SDK do Mercado
    Pago, que não sobe sem chave e sem rede. O que a feature garante sobre ele é **ausência de
    mudança**: um mutante prova que a tela de progresso não o alcança, e os casos de `PGM-06 …
    PGM-08` seguem verdes sem uma asserção tocada.
  - **A escrita no banco não foi remedida na fase 4** (o Docker estava fora). A numeração `0170` /
    `0171` foi provada na fase 1, com dois `insert` reais no Postgres local.
  - **O QR não foi escaneado por um celular de verdade** — a string medida é sintética. O tamanho
    (174×176 dentro de uma caixa de 200, em 390) está medido; a legibilidade por câmera não.
  - **Rede lenta, LCP e CLS da rota nova** não foram medidos, e a rota é uma página `lazy` a mais.
  - **`prefers-reduced-motion` não foi conferido.** O único movimento das telas novas é o
    `animate-spin` do anel de progresso — indicador, não enfeite —, e ele não tem par
    `motion-reduce:`.
  - **O WhatsApp da tela de falha não foi visto renderizado**: as medições rodaram com
    `store_settings` vazio, e o portão de 10 dígitos (mesma régua de `PolicyContact`) o esconde.
    Em produção o número está configurado, mas isso não foi conferido nesta rodada.

- **A prova em navegador do esqueleto da Home FOI FEITA** (2026-09-21) e está na seção de baselines:
  o defeito foi reproduzido A/B com o mutante reinjetado, e o hero desligado deixou de aparecer nos
  dois viewports, com o CLS caindo ~60% e o `<footer>` como única fonte. **O que ficou de fora**, e
  é o que a próxima sessão deve fechar:
  - **A medição não usou o banco local** — o Docker não estava de pé, `supabase start` falhou, e a
    leitura de `home_sections` foi interceptada com 4 seções sintéticas. Com o catálogo real (680
    produtos, categorias com arte, 7 seções) a Home é bem mais alta e o CLS deve cair mais ainda —
    mas **isso é previsão, não medida**.
  - **O LCP não foi medido**, e é a métrica que esta mudança piora de propósito: hoje ele é quase o
    FCP porque o parágrafo do hero vem do bundle; depois ele espera a resposta real. Um `<div>` com
    cor de fundo não é candidato a LCP, então o esqueleto não assume a métrica. Trocou-se **uma
    pintura rápida do conteúdo errado** por uma pintura do conteúdo certo — medir antes de reagir
    ao Lighthouse.
  - **A prévia de `/admin/home` não foi conferida em navegador** (o painel não foi subido). A suíte
    prova que ela não passa pelo esqueleto (`homePreview.test.tsx` segue verde **sem uma edição**),
    e o ramo da prévia devolve antes de o esqueleto ser alcançado.
  - **A altura do esqueleto continua sem teste automatizado** — jsdom devolve 0 para layout, e o
    mutante que a reduz sobrevive à suíte. Hoje ela está provada por navegador; se alguém a mudar,
    nada acusa até a próxima auditoria.
- **SETE contadores de caracteres do painel continuam escritos à mão, fora de Configurações**
  (achado da `56`, ao escrever `contadorComDonoUnico.test.ts`). São cinco arquivos:
  `FaqEditorDialog.tsx` (×2), `HeroEditor.tsx`, `SeoPreview.tsx` (×2) e `AdminProductFormPage.tsx`.
  **Não são a mesma função que o `CharCounter`**: duas aparam o texto antes de contar
  (`.trim().length`), duas escrevem o sufixo "caracteres", e o espaçamento em volta da barra difere.
  Trocá-las mudaria texto visível em telas que a `56` não foi pedida para tocar, e quebraria as
  asserções delas. O guarda nasceu com **escopo literal de quatro pastas** por isso, com o motivo
  escrito no arquivo — um que nascesse reprovando sete vezes seria desligado no primeiro gate. O
  risco aberto é o de sempre: o número do limite fica cravado na frase, longe da constante, e a
  feature `46` já mediu o custo disso (subir `FAQ_ANSWER_MAX` em `core` deixou o contador do painel
  dizendo "0 / 600").
- **Os TRÊS grupos de Notificações continuam sendo os da `53`, e "Pedido e pagamento" ficou com
  NOVE eventos** — inclusive "Pedido postado", "Pedido entregue" e "Cuidados com a joia", que não são
  pagamento. A `56` tornou a contagem visível (`LEG-17`) e foi ela que expôs o desequilíbrio; mudar o
  agrupamento é mexer em `sectionFor` (`model/sections.ts`), que é regra da `53`, e ficou fora de
  escopo por decisão. O artboard desenhava "5 eventos" naquele grupo — número ilustrativo, não medida.
- **A `56` não ampliou `animacaoRespeitaMovimento.test.ts` ao painel inteiro.** Os quatro arquivos de
  UI que ela tocou entraram no escopo literal (9 → 13 arquivos, âncoras 14/7 → **38/18**), no molde
  do que a `51` fez na task em que o arquivo dela nasceu. O resto do painel continua com ~50 classes
  de `transition-*` sem par, e a dívida de decidir classe a classe o que é movimento decorativo segue
  aberta.
- **A `55` NÃO tem prova em navegador**, e ela entra na fila de `32`…`51`. O que a feature entrega é
  **largura, coluna e alternância por breakpoint**, e jsdom devolve 0 para toda medida de layout:
  cada asserção da suíte é proxy de forma (classe declarada, atributo, presença de nó). Falta medir
  em **390×844, 1024 e 1440**:
  - o rail de 296px ao lado do painel em 1440 **com o trilho de ícones do modo de foco à esquerda**,
    e o mesmo em **1024**, onde o `lg:` acabou de ligar e as duas colunas são as mais apertadas;
  - a lista das 4 seções em 390, sem rolagem horizontal do body, com os 60px de linha sob o dedo;
  - a seção aberta em 390: o cabeçalho de voltar, os campos em coluna única, e o card Material
    **inteiro** — os 9 campos, incluindo os dois que o artboard abrevia;
  - **Notificações em 390** — 15 cards, cada um com 5 campos e uma prévia: é a seção que mais pesa e
    a única em que o painel rola muito;
  - trocar de seção **sem recarregar a página**, e o modo de foco recolhendo a navegação ao entrar;
  - abrir uma prévia de e-mail, trocar de seção, voltar — e ela estar fechada.
- **O bloco "Ver na loja" do artboard NÃO foi implementado**, e é decisão declarada: nenhuma AC o
  pede, e a tabela *Out of Scope* da `55` diz que a feature só reorganiza o que já existe. Se a dona
  sentir falta do atalho (ele existe em `/admin/menu`), é uma linha — mas é conteúdo novo.
- **Os `<Label>` do painel quase nunca têm `htmlFor`, e a `55` só consertou os das três seções que
  reescreveu.** `FieldGroup` aceita o prop desde sempre e a maioria dos chamadores não o passa: o
  rótulo não foca o campo ao ser clicado e não é anunciado por leitor de tela. Corrigir o resto é
  trabalho de uma feature própria — ela teria de tocar quase toda tela de formulário do painel.

- **A DÍVIDA DE AUTH DA `52` ESTÁ FECHADA** (2026-09-20, informado pelo usuário). O SMTP foi ativado
  no dashboard em 2026-09-19 e os **três templates foram colados** em `/auth/templates`. O bloco
  abaixo fica como registro do que era e de como se conferiu — não como pendência.
  - ⚠️ **O fecho é por relato, não por medição, e isso é do assunto e não do zelo de quem fechou**:
    não existe comando que leia o `[auth]` do projeto hospedado (a CLI não tem `config pull`), o
    `Email check` declara essa cegueira por escrito, e `authEmailTemplates.test.ts` prova o conteúdo
    do **repositório**, nunca o que está colado no dashboard. A prova de verdade é um login: pedir um
    código na loja e vê-lo chegar com a cara da marca e seis dígitos.
  - **O que era**: antes de ativar o SMTP, o GoTrue caía no compartilhado da Supabase (~2 e-mails por
    hora) e simplesmente não entregava. Ativado e **sem** os templates, ele passou a entregar o
    e-mail **padrão**, em inglês, com um **link** — enquanto a loja chama `verifyOtp` e pede um
    código de 6 dígitos que aquele e-mail não traz. A cliente recebia algo, tentava e não entrava.
    *Parecia* funcionar, e era o pior dos três estados possíveis.
  - **Antes** de ativar o SMTP, o GoTrue caía no compartilhado da Supabase (~2 e-mails/hora) e
    simplesmente não entregava. **Agora ele entrega** — o e-mail **padrão**, em inglês, com um
    **link** —, enquanto a loja chama `verifyOtp` e pede um código de 6 dígitos que aquele e-mail
    não traz. A cliente recebe algo, tenta e não entra. *Parece* funcionar, e é o pior dos três
    estados possíveis.
  - **Não foi preciso escrever nada.** Os três existiam desde a feature `20`, em `supabase/templates/`,
    com a identidade da loja, tudo inline, sem webfont e com `{{ .Token }}` nos três. A `54` auditou
    os três contra `DESIGN.md`, fechou a única lacuna concreta (preheader ausente — a caixa de
    entrada mostrava o começo do wordmark em vez de uma frase) e acrescentou
    `authEmailTemplates.test.ts`, que os compara entre si e contra a paleta de `layout.ts` — hoje
    nenhum outro comando lê `supabase/templates/`. É colar em `/auth/templates` **sem o bloco de
    comentário do topo** (documentação para quem edita o arquivo, não serve ao dashboard), mais o
    **assunto** de cada um — que vive no `config.toml` e, como ele não é empurrado, precisa ser
    digitado no dashboard (foi o que se fez):

    | Tela | Arquivo | Assunto |
    | --- | --- | --- |
    | Magic Link | `magic_link.html` | `Seu código de acesso — Uma Estrelinha` |
    | Confirm signup | `confirmation.html` | `Seu código de acesso — Uma Estrelinha` |
    | Reset password | `recovery.html` | `Redefinir sua senha — Uma Estrelinha` |

  - **Três bastam, e é medido**: a loja dispara `signInWithOtp` (que vira *Magic Link* para e-mail
    existente e *Confirm signup* para novo) e `resetPasswordForEmail`. Não há `updateUser` nem
    convite, então *Change Email Address* e *Invite user* são inalcançáveis.
  - **A prova de fecho é um login de verdade** — pedir um código na loja e vê-lo chegar com a cara
    da marca e seis dígitos. Quem for mexer em auth de novo faz esse percurso antes de dar por
    certo: nenhum comando deste repositório sabe dizer o que está no dashboard.
  - O que **já** foi feito da `52`, para esta lista não envelhecer de novo: o remetente transacional
    corrigido e medido (`config-check` em produção), os dois secrets novos gravados e o
    `RESEND_FROM` apagado, o `RESEND_API_KEY` criado no cofre do **GitHub**, a function zumbi
    `send-email` removida (`functions list` devolve **oito**, todas do repositório) e a migration da
    RLS aplicada.
- **O `.env` LOCAL É UM SEGUNDO DONO DOS SECRETS DE PRODUÇÃO** (`BL-044`, medido em 2026-09-19).
  `supabase secrets set UMA_CHAVE=valor` rodado da raiz do projeto grava **oito** — a CLI mescla o
  `.env` do diretório atual, sem avisar e sem criar chave nova (então não aparece na contagem).
  Controle: o mesmo comando devolve `{"count":8}` da raiz e `{"count":1}` de um diretório sem `.env`.
  Custou sete secrets de produção sobrescritos com valores de dev, dos quais **um não foi
  restaurado por treze dias**: `MELHOR_ENVIO_SENDER_JSON`. **Restaurado em 2026-09-20**, com o valor
  do `.env` da raiz (conferido antes de subir: é o endereço real do ateliê em Porto Alegre, não um
  placeholder de dev), pelo procedimento seguro — arquivo com **só** as chaves pretendidas, e
  `secrets set --env-file` rodado de um diretório **sem `.env`**. O retorno da CLI disse
  `{"count":2}`, que é a prova de que a mescla não aconteceu: da raiz teriam sido oito.
  A **criação de etiqueta** continua sem ninguém ter exercitado depois da restauração. Procedimento seguro e
  o contrato do digest estão em `supabase/CLAUDE.md` e no `.env.example`.

- **AS TRÊS CÓPIAS DE `slugify` DO PAINEL CONTINUAM TRÊS, e a `51` não as unificou de propósito.**
  Ela levou a **dobra de busca** para `shared/lib/texto.ts` e deixou lá as sete outras ocorrências de
  `normalize('NFD')`: os três `slugify` (`CategoryFormDialog`, `CsvImportDialog`,
  `AdminProductFormPage` — e mais dois quase iguais em `quickGrid` e `buildDuplicates`),
  `normalizeTag` e o gerador de id do `AdminLayout`. **Não são a mesma função**: elas dobram o
  acento **e continuam** — juntam por hífen, recortam o que não é letra —, e o que produzem é
  **endereço**, não termo de busca. Endereço que muda quebra link, então unificá-las é decisão sobre
  geração de slug e merece a própria feature. O guarda da `51` **distingue as duas por construção**
  (ele acusa a cadeia que *termina* no acento) e tem sensor provando que um `slugify` que perdesse a
  junção por hífen voltaria a ser acusado — ou seja, a fronteira está medida, não suposta. O risco
  aberto é o de sempre: cinco escritas do mesmo recorte divergem sem nada quebrar, e a divergência
  aparece como dois slugs diferentes para o mesmo nome.
- **`AdminQuickGridPage.tsx:127` lê `products` SEM `range` e SEM `count`**, e ficou **fora** da `51`
  por decisão de escopo — é caminho de importação de CSV, não de seletor, e é da família `BL-008`. O
  modo de falha está medido e é silencioso: a checagem de slug duplicado monta um `Set` com
  `select('slug')`, e passando de **1.000 produtos** o PostgREST corta sem avisar. A partir dali a
  tela deixa de enxergar parte do catálogo, conclui que o slug está livre e **cria duplicata** — sem
  erro em lugar nenhum. São 702 produtos hoje, 298 de distância. `AdminProductsPage.tsx:173` tem a
  mesma leitura e o mesmo teto. O conserto é `readAllPages`, que já existe e já é o dono desta regra.
- **A `51` NÃO tem prova em navegador**, e ela entra na fila de `32`…`50`. O que a feature entrega é
  **campo, lista e largura** — e jsdom devolve 0 para toda medida de layout, então cada asserção da
  suíte é proxy de forma (classe declarada, atributo, presença de nó). A lista do que falta está em
  *O que só o navegador prova*, no `design.md` dela, e em 390×844 e 1440 é: o campo de busca dentro
  da coluna de edição de **560px** de `/admin/home`, com a lista de 20 abaixo; os chips de "Produtos
  relacionados" embrulhando com nomes longos; o `ProductSearchField` do `DestinoDoItem` **dentro** de
  um slide do carrossel, que já é um cartão aninhado; o alvo de 44px sob o dedo em cada linha de
  resultado; a ausência de rolagem horizontal do corpo nas cinco telas; e — que é o percurso que
  motivou a feature — acrescentar 12 peças ao bloco **Produtos em destaque** **sem a prévia
  recarregar**, que é o que a `50` entregou e que a troca do seletor não pode devolver.
- **O BLOCO "PRODUTOS EM DESTAQUE" NASCE INEXISTENTE, e montá-lo é passo de operação** (feature
  `50`). **Não há migration**: nada foi semeado, nenhuma Home muda no deploy. Para a vitrine de
  campanha existir, a Adri precisa, em `/admin/home`: acrescentar o bloco **"Produtos em destaque"**
  pela bandeja, dar um **título** (obrigatório), escolher as peças no seletor (até **12**, na ordem
  dela), decidir entre **Slider** e **Grade**, **ligar a seção** — todo bloco novo nasce desligado
  (`HOME-10`) — e arrastá-la para onde ela quer na Home. São seis passos, e nenhum acontece sozinho.
  É o mesmo formato de dívida do interruptor do frete grátis (`37`), do menu vazio (`39`) e do Banner
  principal (`41`): sem este registro, a loja fica meses sem o bloco porque ninguém soube que havia
  uma tela.
- **A `50` NÃO tem prova em navegador**, e ela entra na fila de `32`…`49`. O que a feature entrega é
  **largura, coluna e ausência de piscada**, e jsdom devolve 0 para toda medida de layout — toda
  asserção da suíte é proxy de forma (classe declarada, atributo, presença de nó, ordem de chamada).
  A lista do que falta está escrita em *O que só o navegador prova*, no `design.md` dela, e em
  390×844 e 1440 é: a grade de 2 colunas com nome de produto de duas linhas (o par card ×
  esqueleto); a fita do `slider` com 12 itens **sem rolagem horizontal do body** (o defeito que a
  auditoria da `27` mediu, `scrollWidth` 634 numa viewport de 390); o CLS do bloco enquanto os
  produtos chegam; o editor na coluna de 560 com a lista de 12 e o `ProductPicker` aberto; e —
  **que é o olho do pedido** — a prévia **não recarregando** ao salvar, que nenhum teste de jsdom vê.
  Falta também o par de `ANI-05` em navegador: os mesmos percursos com `prefers-reduced-motion`
  ligado e desligado, conferindo que os dois mostram os mesmos estados e só um se move.
- **O guarda do movimento alcança OITO arquivos, e o resto do painel continua sem par.** Medido em
  2026-09-14: `apps/backoffice/src/**` declara **60** classes de `transition-*`/`animate-*` e só as
  desta feature têm `motion-reduce:`. Ampliar `animacaoRespeitaMovimento.test.ts` para o app inteiro
  é trabalho de uma feature própria — ela teria de decidir, classe a classe, o que é movimento
  decorativo (ganha par) e o que é indicador de progresso (não ganha, como `animate-spin`). O guarda
  nasceu estreito de propósito: um que nascesse reprovando cinquenta vezes seria desligado no
  primeiro gate.
- **A `50` não tem `validation.md` nem verificador independente no momento em que este parágrafo foi
  escrito** — os commits e o Verifier vêm depois dela. Os três guardas novos tiveram a sensibilidade
  provada por **injeção real no arquivo real** (o par `motion-reduce:` removido de
  `HomeSectionRow.tsx`, a remoção posta atrás de um `setTimeout` em `HomeSectionList.tsx`, e o
  otimismo e a volta apagados de `useAdminHomeSections.ts`, um de cada vez), e cada mutação derruba
  pelo menos um caso nomeando arquivo e linha.
- **A saída da linha é de OPACIDADE, e a altura não é animada** (`ANI-04`). Animar a altura exigiria
  medi-la — e medida é exatamente o que jsdom não dá —, então a lista "acomoda o espaço" pelo fluxo
  normal do CSS quando a linha sai do DOM. Se em navegador o salto incomodar, a saída pedirá um
  `grid-template-rows: 0fr` ou uma biblioteca de layout; o `design.md` recusa `framer-motion` por uma
  transição, e essa recusa continua valendo até alguém medir.

- **O PAINEL CONTINUA COM UM ACESSO SÓ ATÉ A ADRI CRIAR O SEGUNDO** (feature `48`). A migration
  **não semeia conta nenhuma** — semear criaria uma credencial que ninguém pediu e que ninguém sabe
  a senha. Depois do deploy, `/admin/usuarios` mostra **uma** linha (a do `seed.sql`), e o ponto
  único de falha humano que a feature existe para remover **só some quando ela criar o segundo
  acesso**. É o mesmo formato de dívida do interruptor do frete grátis e do menu vazio: sem este
  registro, a loja fica meses assim porque ninguém soube que havia uma tela.
- **A `48` TEM `validation.md`, com autor ≠ verificador e DUAS rodadas** — a primeira reprovou com 3 mutantes sobreviventes, a segunda passou. O que falta é **prova em navegador**. Os 324 casos foram medidos por
  workspace com exit code fora de pipe, os guardas novos tiveram a sensibilidade provada por
  **injeção real no arquivo real**, a invariante do banco foi provada por **6 probes SQL contra o
  Postgres local**, e o grafo de módulo da edge function foi provado por **`deno check` de verdade**
  (não pela inferência do guarda). **O que falta é exatamente o que jsdom não mede**: em 390×844, a
  tabela de acessos com **quatro** botões de ação na linha (ela vai estourar), os dois diálogos de
  confirmação, e os três campos de senha empilhados com o botão de mostrar/ocultar em cada. Entra na
  fila da `32`, `33`, `34`, `35`, `37`, `39`, `41`, `45` e `47`.
- **Revogar o acesso NÃO derruba a sessão ativa da pessoa** (`A-06` da `48`). Medido nos typings
  (`@supabase/auth-js@2.110.7`): `signOut(jwt, scope?)` exige o JWT dela, e **não existe logout por
  id**. O casco do painel pode seguir na tela até ela recarregar — mas **nada que ela faça grava**,
  porque toda policy de escrita chama `has_role`, avaliado por requisição. Para expulsar de imediato
  seria preciso banir a conta (`ban_duration`), que é mais pesado que tirar o acesso ao painel.
  Limitação declarada, não escondida.
- **Um admin que trabalhou NÃO PODE ser apagado, e isso é do schema** (feature `48`). Quatro FKs
  apontam para `auth.users` sem `ON DELETE`: `orders.customer_id` (via o `CASCADE` de
  `customers.user_id`), `order_notes.created_by`, `order_status_history.created_by` e
  `customer_notes.created_by`. A tela recusa **antes**, nomeando o que bloqueia e com quantos
  registros, e oferece `Remover do painel` como saída. Não é bug: apagar destruiria o histórico da
  loja junto. Mudar isso exigiria `ON DELETE SET NULL` nas três colunas `created_by` — migration
  própria, e uma decisão sobre o que "nota sem autor" significa.
- **Criar um admin cria também uma linha em `customers`, e ADOTA os pedidos órfãos do mesmo e-mail.**
  É o trigger `handle_new_customer` (`ESP-22`) fazendo o trabalho dele. Consequências: a pessoa
  aparece em `/admin/clientes` com zero pedidos, e — se aquele e-mail já comprou como convidada — os
  pedidos passam a ser dela. As duas são corretas; a segunda torna a conta indelével dali em diante.
  **Filtrar admins da listagem de clientes seria criar um segundo dono de "quem é cliente"**, e por
  isso não foi feito.
- **A CONTA DA CONVIDADA NASCE SEM SENHA, e da 2ª compra em diante ela cai no desafio de código**
  (feature `49`, `AD-035`). É consequência direta da decisão do usuário, apresentada com o custo e
  aceita: o e-mail passa a existir em `auth.users` no fecho da primeira compra, então a consulta de
  `identify` responde "tem conta" na seguinte. **A primeira compra fica sem parede nenhuma**; da
  segunda em diante são 6 dígitos. Se o atrito se mostrar caro, a saída seria distinguir "conta que
  já entrou" de "conta criada por compra" — um segundo dono de "tem conta?", e por isso fora de
  escopo agora.
- **A `49` NÃO tem prova em navegador**, e ela entra na fila de `32`…`47`. Falta medir em 390×844 e
  1440: o convite `SignInInvite` embrulhando (é `flex-wrap`, e jsdom devolve 0 para toda medida de
  layout), o alvo de 44px sob o dedo, o desafio de código dentro do bloco Contato sem empurrar o CTA
  para fora da dobra, e o percurso inteiro em aba anônima — `/carrinho` → `/pedido/:id` aprovado.
  **O que jsdom alcançou está provado**; o que ele não mede é proxy de forma.
- **A `49` também não tem `validation.md` nem verificador independente.** Os guardas novos tiveram a
  sensibilidade provada por injeção real (inclusive um que reprovou o próprio arquivo certo, e foi
  consertado por isso), e a migration foi provada por **probe contra o banco local** — sete
  comportamentos de `account_exists`, as três colunas e o índice parcial. Mas ninguém conferiu a
  feature contra a spec com olhos frescos.
- **A enumeração de e-mail é risco aceito e declarado** (`IDN-09`). A ação `identify` responde "este
  e-mail tem conta?" com teto de 20 por IP em 5 minutos, e `account_exists` é fechada a `anon`. O
  risco **já existia**: com a anon key publicada no bundle,
  `signInWithOtp({ shouldCreateUser: false })` do navegador responde a mesma pergunta. O que muda é
  que agora fica barato — e a agravante é que, com a conta de convidada, a resposta passa a
  significar "este e-mail já comprou aqui".
- **`BL-030`, `BL-031` e `BL-032` nasceram da `49`**, todas fora do escopo por decisão: as policies
  de `INSERT` em `orders` continuam abertas no banco (a janela de deploy custaria venda),
  `order_number` segue com prefixo da marca anterior e sem índice único, e os dois hooks de gravação
  client-side ficaram sem consumidor.

- **A `47` NÃO tem prova em navegador, e nela isso pesa mais que a média**: o que a feature entrega é
  **largura** (440 × 872), **escala** (81% e 100%) e **altura de corpo**, e jsdom devolve 0 para toda
  medida de layout — toda asserção da suíte é proxy de forma (classe declarada, atributo, presença de
  nó). Falta medir em 390 · 768 · 1024 · 1440:
  - o `11rem` de `/admin/menu` é **suposição** de altura de cabeçalho copiada da Home, e os dois
    `PageHeader` têm subtítulos de comprimentos diferentes — um que embrulhe em duas linhas estoura a
    viewport;
  - a grade do `MenuIconPicker` (célula fixa de 100px) dentro de um card de 440, que antes vivia numa
    coluna de ~712;
  - o trilho de 56px sob o dedo em 768–1023, que é território de toque;
  - a tela cheia em monitor menor que 1064px de largura, onde o quadro de 1024 não cabe inteiro.
- **O estado de FALHA do iframe da prévia continua sem existir** — e a `47` **não criou** esse modo de
  falha, só ampliou a superfície dele: em tela cheia, um iframe que não carrega ocupa a tela inteira
  em branco. Ficou fora de escopo **por decisão** (`AD-020` proíbe o painel desenhar um fallback da
  loja), não por esquecimento. É dívida registrada.
- **`/politicas` FOI REMOVIDA, e levou Envio e Pagamento com ela** (2026-09-12, decisão do usuário).
  A loja tem três páginas institucionais de texto — `/politicas-de-trocas-e-devolucoes`,
  `/politica-de-privacidade` e `/cuidados-com-sua-joia-afetiva` — e **nenhuma delas diz por onde a
  loja envia, em quanto tempo posta, que aceita Pix e cartão, nem a partir de quanto o frete é
  grátis**. Esses quatro blocos liam `store_settings` (`usePaymentSettings`, `useFreeShipping`) e só
  existiam na `/politicas`. É dívida de conteúdo, não de código: some uma página, some a informação.
  - **A rota saiu SEM 301, estando em `SITEMAP_STATIC_PATHS`** — ou seja, foi anunciada para
    indexação, e está commitada desde `12c8ab7` ("baseline herdada da Nanita"). É exatamente o
    tradeoff que `AD-018` e `LEGACY_REDIRECTS` existem para não deixar acontecer por acidente com
    outros slugs. O conserto, se a decisão mudar, é **uma entrada** em `LEGACY_REDIRECTS`.
- **As duas páginas de política NÃO têm prova em navegador** (feature `45`). Os endereços, o texto, o
  portão do WhatsApp e os guardas estão medidos; o que falta é o que **jsdom não mede**: a medida de
  leitura de 720px, os botões de contato empilhando em 390, o alvo de 44px e a ausência de rolagem
  horizontal do body. Entra na fila da `32`, `33`, `34`, `35`, `37`, `39` e `41`.
  - **O texto jurídico não passou por advogado.** Ele é da dona e foi transportado sem reescrita; o
    que a `45` acrescentou (LGPD, compartilhamento, consentimento) foi conferido contra **o que o
    código faz**, não contra a lei. A `PrivacyPolicyPage` recusa por teste afirmar encarregado de
    dados, perfilamento publicitário ou remarketing — a loja não faz nenhum dos três, e declarar o
    contrário seria assinar documento falso em nome da Adri.

- **O BANNER PRINCIPAL NÃO EXISTE ATÉ A ADRI CRIAR UM, e o hero deixou de ser obrigatório** (feature
  `41`). A migration **não semeia seção nenhuma** — de propósito, porque semear mudaria a Home de
  quem já a tem. Depois do deploy, a Home continua **idêntica**: quem quiser o carrossel no topo
  precisa, em `/admin/home`, acrescentar o bloco **"Banner principal"**, subir as duas artes de cada
  banner, escolher os destinos, **ligar a seção** (todo bloco novo nasce desligado) e arrastá-la para
  cima da "Chamada principal" — que agora pode ser desligada ou removida. São cinco passos, e nenhum
  deles acontece sozinho.
  - **O que a `41` ainda NÃO tem é `validation.md` nem prova em navegador**, e nela a segunda pesa
    mais que a média: o bloco entrega **largura, deslocamento e rotação**, que é exatamente o que
    jsdom não mede (ele devolve 0 para toda medida de layout, e a suíte inteira do widget é proxy de
    forma — atributo, classe e presença). Falta medir em 390×844 e 1440: o CLS da faixa enquanto a
    arte carrega, o LCP do primeiro slide em Slow 4G, o arrasto do dedo sem sequestrar a rolagem
    vertical, e as setas do computador. Entra na mesma fila da `32`, `33`, `34`, `35`, `37` e `39`.
  - **O primeiro olhar de navegador já cobrou o preço, em 2026-09-11**: as duas vagas eram
    **suposição** (a `spec.md` as marcava "confirmar com uma arte real da Adri") e a arte real é
    `1680 × 560` e `720 × 720`. Com as vagas erradas, `object-cover` cortava **90px de cada lado** no
    computador e **~25% da largura** no celular, comendo a primeira letra da frase desenhada dentro
    da arte — e os **83 testes do widget seguiam verdes**, porque todos leem a constante em vez de
    conferi-la contra um arquivo. Medida suposta é afirmação; o arquivo da dona é a verificação
    (`AD-012` noutra roupa). Corrigido em `HERO_CAROUSEL_SLOTS`, com a régua de `BNR-26` **invertida**
    em vez de descartada: ela dizia "o celular é retrato" e teria reprovado a arte real.
- **O MENU NASCE VAZIO NOS DOIS DISPOSITIVOS, e montá-lo é passo de operação** (feature `39`). As 37
  categorias têm `menu_desktop` e `menu_mobile` em `false`, e o único item semeado é o link "Sobre".
  Depois do deploy, a barra do topo mostra **um** item e a folha do celular também — até a Adri
  ligar as coleções em `/admin/menu`, **uma aba por vez**: ligar no computador **não** liga no
  celular. É o mesmo formato de dívida do interruptor do frete grátis: sem este registro, a loja fica
  meses com o menu quase vazio porque ninguém soube que havia uma tela.
- **A `40` é a PRIMEIRA feature com autor ≠ verificador**, e o retorno pagou na primeira execução:
  três mutantes sobreviventes, os três em cima de um AC (ver `validation.md` dela). **A fila de
  pendências de verificação independente parou de crescer aqui** — `32`, `33`, `34`, `35`, `37` e
  `39` continuam abertas.
  - **O que a `40` ainda NÃO tem é prova em navegador**, e nela isso pesa mais que a média: tudo o
    que a feature entrega — deslocamento, tempo de pintura, cascata de rede — é exatamente o que
    jsdom não mede. Toda asserção da suíte é **proxy de forma**. Falta medir em 390×844, Slow 4G e
    4× CPU: o CLS da home, a cascata (uma linha `categories`, quatro `products` juntas), o LCP do
    `<p>` do hero e a bolha do WhatsApp entrando sem mover o botão.
- **O peso do JS inicial continua aberto** (`BL-029`, aberto pela `40`). São 141 KB de `index.js` e
  57 KB de `supabase-js` com **107 KB não usados** — o `realtime-js` é a maior parte do que a home
  não toca. Vale ~3,5 pontos de FCP e mexe no client de dados, então ficou fora do escopo da `40` de
  propósito.
- **A `39` NÃO tem `validation.md`.** Os cinco lotes foram medidos por workspace, com exit code
  capturado, e os guardas novos tiveram a sensibilidade provada por injeção real de falha — mas
  ninguém conferiu a feature contra a spec com olhos frescos, e **a prova em navegador não foi
  feita**. Ela importa mais que o normal aqui: o que a feature entrega é **largura** (a barra que
  rola em vez de recusar) e **prévia** (o iframe em 390 e em 1024), e **jsdom devolve 0 para toda
  medida de layout**. A fila de pendências de verificação independente ganhou mais uma.
- **O FRETE GRÁTIS NASCE DESLIGADO, e ligar é passo de operação** (feature `37`, `AD-027`). Depois do
  deploy desta feature a loja **não anuncia nem concede** frete grátis até alguém ligar em
  `/admin/configuracoes` → aba Frete. Decisão do usuário, com o custo declarado e aceito — mas sem
  este registro a loja fica meses assim porque ninguém soube que havia um interruptor.
- **A `37` tem `validation.md`, e o autor também é o verificador.** Quarta seguida. A evidência é
  medida e os guardas novos tiveram a sensibilidade provada por injeção de falha; o que falta é a
  prova em navegador real, em 390 e 1440, com o interruptor nos dois estados — e ela importa mais
  que o normal, porque o que muda ao desligar é **presença de bloco** (a faixa some do topo da gaveta
  e do resumo), e jsdom devolve 0 para toda medida de layout.
- **A `36` tem só `spec.md`** (metadados e dados estruturados): não foi implementada, e o número
  segue consumido.
- **A feature `31` não tem spec.** O guia de material foi implementado no commit `fcd3942` e está
  documentado em `apps/store/CLAUDE.md`, mas não existe `.specs/features/31-*` nem handoff na
  `STATE.md`. O número segue consumido.
- **A `32` não tem `validation.md`** e não passou por Verifier independente. Os 24 testes cobrem os
  requisitos que jsdom alcança e carregam o sensor da cicatriz da chave (`LST-04`), mas ninguém
  conferiu a feature contra a spec com olhos frescos. Mesma pendência da `22` e da `28`.
- **A `35` tem `validation.md`, e o autor também é o verificador.** Terceira seguida. A evidência é
  toda medida — 3 execuções reais do importador contra os arquivos da loja, 9 blocos de probe SQL, e
  navegador em 390 e 1440, onde saiu **um defeito que teste nenhum pegaria**: a coluna
  `orders.customer_phone` estava gravada em 35/35 pedidos, o teste dela passava, e **todo** link de
  cobrança por WhatsApp saía sem número — porque a view `order_list` enumera colunas uma a uma e os
  três chamadores da tela ignoravam o telefone. Três peças certas, resultado errado.
- **A `34` tem `validation.md`, e o autor também é o verificador.** Segunda seguida. A evidência é
  toda medida — probes HTTP, injeção de falha nos guardas novos, e navegador real em 390 e 1440, onde
  saíram três defeitos que teste nenhum pegaria (números que se contradiziam na mesma tela). Ainda
  assim, ninguém de fora conferiu contra a spec.
- **A `33` tem `validation.md`, mas o autor é o verificador.** A execução foi inline, e o relatório
  declara isso no topo. A evidência é toda medida e os dois guardas novos tiveram a sensibilidade
  provada por injeção de falha — o que reduz o viés, não o elimina. Entra na mesma fila acima.
- **A `33` está implementada e o `rewrite` ainda não foi publicado.** A edge function `sitemap` **já
  está no ar** no projeto hospedado (deploy aditivo, feito para medir o `Content-Type`), mas até o
  push da loja `/sitemap.xml` continua devolvendo o shell da SPA. A prova de fecho é o `curl` do
  `validation.md`, nunca o status code.
- **`STATE.md` e `BACKLOG.md` discordam sobre a `BL-016`.** O `BACKLOG.md` a dá como fechada com o
  ref real; a `AD-020` e o handoff da `30` ainda dizem "o host é marcador, bloqueado por `C-08`".
  Vale o `BACKLOG.md` — mas com a ressalva das functions não implantadas, acima.
- **`BL-013` está FECHADO** (2026-08-16). A loja passou a mandar `Content-Security-Policy:
  frame-ancestors 'self' https://umaestrelinha-backoffice.vercel.app`, **no lugar** do
  `X-Frame-Options: SAMEORIGIN` — aquele header não tem sintaxe para autorizar outra origem, e manter
  os dois deixaria a política com dois donos. `vercelRedirects.test.ts` ganhou três asserções: origem
  exata, ausência de `X-Frame-Options`, e recusa de curinga. **A origem é literal nos dois lados**, e
  trocar o domínio do painel exige mexer no `vercel.json` e no teste — sob pena de a prévia voltar a
  ser quadro branco sem erro.
- **`BL-007`** — sitemap. A `30` levou a metade do dado estruturado; a do sitemap segue aberta.
- **`BL-008` foi REDUZIDA, não fechada** (feature `34`). `fetchStatusCounts` deixou de existir: as
  contagens de aba e de tile agora são `select('id', { count: 'exact', head: true })`, então **o
  servidor conta e nenhuma linha atravessa a rede** — não há teto a herdar. As outras leituras sem
  paginação do painel continuam abertas.
- **`BL-009` está FECHADO** (feature `39`, T19). `uploadImageBlob` saiu de `features/product-form/lib`
  para `shared/lib/uploadImage.ts` — o editor de banner do menu precisava dela, e `features/` não
  importa de `features/` —, e o `||` com o `SUPABASE_URL` de **outro projeto** foi apagado no mesmo
  movimento: o client já lança sem a env, então o fallback era inalcançável e mentiroso.
  `BL-010`/`BL-011` seguem abertas.
- **`BL-027` está FECHADO** (2026-09-06). O removedor de comentário de
  `freeShippingSingleOwner.test.ts` passou a fazer linha e bloco na **mesma** varredura, e três
  sensores provam o CRLF, o LF e o glob de dois asteriscos que o cegava. **Nenhuma asserção de regra
  passou a reprovar** — o ponto cego não escondia leitura nenhuma; escondia a *possibilidade* de
  esconder. Achado ao fechar, e **não consertado**: `previaUnica.test.ts` (backoffice) ainda faz
  duas passadas, embora o `BACKLOG.md` o listasse como exemplo da forma correta.
  *(Registrado como `023` e não `018` porque o `018` já estava ocupado.)*
- **`BL-028` está FECHADO** (2026-09-06). A faixa de departamentos ganhou degradê nas bordas e setas
  nas pontas, presentes **só** do lado em que há conteúdo além da dobra — e nenhum quando ela cabe,
  que é o caso normal (3 itens). O estado vem da posição real de rolagem
  (`shared/lib/useOverflowAffordance`), não de contagem de itens. A **roda vertical não foi
  sequestrada** e o teclado continua sendo do navegador. Fica aberto só o item (4) da entrada: avisar
  em `/admin/menu` quando a curadoria não couber em 1440.
- **`BL-014`** — geração de pergunta por IA, adiada por decisão do usuário em 2026-08-16. Irmã da
  `BL-001`, e as duas devem ser resolvidas juntas (a resposta de infraestrutura é a mesma).
- **`BL-015`** — **`material_kinds` diz menos que a descrição.** Há produto com `material_kinds =
  {cinzas}` cuja descrição enumera cinco materiais, produto com `requires_material = false` cuja
  descrição manda enviar coto e cabelo, e um material (`sangue`) fora de `MATERIAL_KINDS`. É curadoria
  da `22`, e por isso a `28` **proíbe** derivar a resposta "Quais materiais posso usar?" da coluna.
  - **Em 2026-09-11 a coluna saiu das duas telas onde ela DECIDIA compra** (decisão do usuário): o
    card "Esta joia é feita com material seu" e a linha da barra fixa sumiram da página do produto, e
    a lista "Quais materiais" saiu do formulário do painel. Sobrou o **interruptor**
    `requires_material`, que é o que põe o pedido na fila. A coluna continua no banco, continua sendo
    congelada em `order_items` pelo checkout e continua sendo lida pela confirmação e pela fila do
    painel — a dívida de curadoria **não** foi fechada, só deixou de ser anunciada à cliente. Guardas:
    `semMaterialNaPaginaDoProduto.test.ts` (loja) e `MaterialCard.test.tsx` (painel).
  - **A feature `44` devolveu o ASSUNTO à página sem devolver a AFIRMAÇÃO.** A linha "Como enviar seu
    material de DNA" acende pelo interruptor e abre uma gaveta onde **a cliente escolhe** o material
    dela. A loja pergunta; não responde por ela. É por isso que o guarda foi *estreitado* e não
    revogado.
  - **A dívida de `requires_material` continua aberta, e agora ela ESCONDE uma tela.** Peça com
    `requires_material = false` cuja descrição manda enviar coto e cabelo **não ganha a linha** — a
    cliente não descobre a gaveta e não tem como saber que precisa enviar algo. Antes da `44` a
    consequência era só um pedido fora da fila; agora é também informação que não chega. O conserto é
    curadoria da dona em `/admin/produtos`, não código.
- **Fronteiras FSD em `warn`**: 2 violações conhecidas no store, as duas em
  `entities/product/ProductInfo` — importa `features/share-product` e, desde 2026-09-11,
  `features/shipping-calc` (a caixa de frete que substituiu `ProductTrustBadges` na coluna de
  informação). Corrigir extraindo a interação para uma feature.
- **Imports profundos** (pré-barrel) em muitos lugares. Migrar para os barrels de slice
  incrementalmente.
- **O `seed.sql` não tem mais catálogo.** Depois de `supabase db reset` a loja fica **sem produto e
  sem categoria** até o importador rodar. Cupons e usuário admin continuam no seed. Ver
  `tools/catalog-import/CLAUDE.md`.

### O que espera decisão da dona, não código

Quatro curadorias estão semeadas e esperando a Adri. Nenhuma é bug, e nenhuma se resolve escrevendo
código — mas todas explicam por que uma tela parece vazia:

| O que | Onde ela decide | Por que a tela parece vazia hoje |
| --- | --- | --- |
| Material de cada produto | `/admin/produtos`, aba Geral | a `22` semeou 689 produtos por inferência do nome |
| **As listas e os adicionais do Compre Junto** | `/admin/compre-junto` e a aba **Compre junto** do produto | o WI-01 **não semeia lista nenhuma**; a conversão leva só o que havia em `products.buy_together_ids` (até 3 peças, tipo produto). Listas ("Correntes", "Embalagens") e a forma do bloco na loja ("Na linha", padrão) esperam a Adri |
| O menu de cada dispositivo | `/admin/menu` | `menu_desktop` e `menu_mobile` nascem `false` nas 37 categorias ⇒ barra do topo e folha do celular vazias. **São duas curadorias**, e ligar numa não liga na outra (feature `39`). O único item semeado é o link "Sobre", em `store_settings.menu` |
| Arte da vitrine | `/admin/categorias` | nenhuma das 37 categorias tem `banner_url` ⇒ a grade de banners não aparece |
| O banner de campanha | `/admin/home`, bloco **Banner principal** | a `41` **não semeia nenhum** ⇒ a Home abre com a "Chamada principal" de sempre. O bloco existe na bandeja e espera arte, destino e o interruptor |
| Perguntas frequentes | `/admin/perguntas` e a aba `Perguntas` do produto | a `28` semeou 67 entradas e 3.475 vínculos das descrições |
| **As peças em destaque** | `/admin/home`, bloco **Produtos em destaque** | a `50` **não semeia nada** ⇒ o bloco nem existe na Home. Ele espera ser acrescentado pela bandeja, ganhar título, receber as peças (até 12, na ordem dela), a escolha Slider/Grade e o interruptor |
| **A lista de categorias** | `/admin/home`, bloco **Lista de categorias** | a `64` **não semeia nada** ⇒ o bloco nem existe na Home. Ele espera ser acrescentado pela bandeja, receber as categorias (até 24) — cada uma com a **arte circular em PNG de cantos transparentes**, a coleção de destino e, se quiser, um título curto —, e o interruptor. Nasce desligado, como todo bloco novo |
| **Quem mais entra no painel** | `/admin/usuarios` | a `48` **não semeia conta nenhuma** ⇒ a lista mostra só a do `seed.sql`. Enquanto for uma linha, o painel segue com um ponto único de falha humano — e o próprio guarda do banco recusa remover o último acesso |
| **Os 11 avisos novos de e-mail** | `/admin/configuracoes` → aba **Notificações** | a `53` tornou os 15 eventos legíveis, editáveis e com prévia — mas **não ligou nenhum**: os 11 novos nascem desligados por decisão da `42` (`PNL-06`), e a Adri precisa ler o texto de cada um antes da primeira cliente recebê-lo. Duas pendências ficam de fora desta tela e são operação, não curadoria: o **endereço do ateliê** (aba Material — sem ele, `material_instructions` é recusado ao tentar ligar) e o **`ADMIN_PUBLIC_URL` de produção** (secret de servidor — sem ele, os dois avisos "para você" mostram o aviso de link fora de produção) |
| **Os filtros da loja** | `/admin/filtros`, a aba Geral do produto e o inspetor de categoria | a `66` **não semeia nada** ⇒ a categoria e a busca mostram só preço, estoque, desconto e novidade. A Adri precisa criar os grupos (ex.: Tipo de joia, Acabamento, Para quem), os valores, e marcar as peças — a marcação em massa tem o recorte "Com a tag…" para aproveitar as tags que já existem |
| **O endereço do escritório (retirada)** | `/admin/configuracoes` → **Frete e Material**, card Material | medido em 2026-10-11: o banco de **produção não tem a linha `material`** em `store_settings`. A retirada (feature `63`) nasce **ligada**, mas só aparece com rua, bairro e cidade preenchidos — até lá nenhuma cliente do RS a vê, e o painel avisa (`RET-21`). Preencher também a **UF**: sem ela a linha sai `…, Porto Alegre` sem o `/RS` |
| **O texto da Política sobre o contador de visitas** | o Apêndice A de `.specs/features/71-visitas-unicas-no-dashboard/spec.md` (o quarto parágrafo de "Medição de audiência" e a frase da categoria "Estatísticas") — **e, desde a `83`, o Apêndice A de `.specs/features/83-loja-ao-vivo/spec.md`**, que acrescenta a hora cheia da primeira visita do dia | a `71` escreveu o texto palavra por palavra e o pôs na loja; **a aprovação da Adri é pré-condição do DEPLOY** — o contador começa a contar no primeiro acesso depois da publicação. Até o dia do DNS ele não conta nada (o host de produção gravado é o domínio próprio), e o painel diz isso |
| **As parcelas sem juros** | painel do **Mercado Pago** → "Oferecer parcelamento sem juros", e `/admin/configuracoes` → Vendas → *Parcelas sem juros*, **com o mesmo número** | medido em 2026-10-04: a conta do Mercado Pago **não tem nenhuma** parcela sem juros (2x já a 9,64%), e a loja anuncia "até 4x sem juros" na vitrine e no produto. Desde 2026-10-04 o caixa mostra a tabela real do Mercado Pago (`InstallmentPicker`, até 10x) — então, até a conta ser configurada, **o caixa mostra juros desde 2x enquanto a vitrine promete sem juros**. Nada no código sincroniza os dois números (`apps/store/CLAUDE.md`, *As parcelas do cartão*) |
