# Contexto — decisões do usuário (feature 39)

Registrado em 2026-09-05, antes da spec. Cada linha aqui é resposta a uma pergunta feita com as
alternativas na mesa, e é o que a spec passa a assumir.

## Q1 — Ordem por dispositivo

**Pergunta**: a ordem do menu hoje é a `sort_order` da árvore de Categorias — a mesma que ordena a
grade da home e o rodapé. Computador e celular devem poder ter ordens diferentes?

**Resposta**: **uma ordem só, a da árvore.**

**Consequência**: arrastar em `/admin/menu` continua reordenando a **categoria**, e isso vale para os
dois dispositivos, para a grade da home e para o rodapé. Duas colunas de ordenação novas (uma por
dispositivo) fariam três donos da mesma pergunta — "em que ordem as categorias aparecem?" —, e a
regra 2 do *defeito 01* (`CLAUDE.md`) recusa exatamente isso. O preço, aceito: não há como pôr
"Correntes" em primeiro só no celular.

## Q2 — A faixa "Em destaque" do painel

**Pergunta**: o painel do mega menu mostra hoje 3 produtos escolhidos automaticamente (`is_featured`
da categoria). Com os banners curados entrando, ela sai, fica, ou fica com interruptor?

**Resposta**: **sai.** O painel passa a ser lista de subcategorias + até 2 banners.

**Consequência**: `TrendingLane` (e a chamada `useProducts(slug)` que ela faz a cada painel aberto)
some do `MegaMenu`. O que aparece no painel passa a ser 100% escolha da Adri — hoje ela não controla
aqueles 3 produtos e não tem tela onde soubesse que existem. **É uma remoção de superfície da loja,
declarada aqui para não parecer perda acidental na medição de testes.**

## Q3 — Destino do banner

**Pergunta**: para onde um banner de destaque pode levar?

**Resposta**: **categoria, produto ou URL digitada.**

**Consequência, e ela é o risco declarado desta feature**: a `AD-014` fechou o card promocional em
"aponta para uma coleção de verdade, nunca para uma URL digitada", justamente para eliminar link com
typo. A URL livre reabre essa porta — e reabre num lugar visível, o menu. A spec responde com o que
dá para responder sem tirar a liberdade pedida:

- endereço interno digitado é **normalizado e conferido contra as rotas declaradas** (`ROUTE_SLUGS`
  de `@estrelinha/core/routes`) antes de gravar, com recusa legível quando não resolve;
- endereço externo exige `https://`, abre em nova aba e leva `rel="noopener noreferrer"`;
- destino de categoria e de produto continuam sendo **referência**, validada na leitura: apagou ou
  desativou, o banner não renderiza (é a regra do `resolvePromo` de hoje, estendida).

Não há como impedir que uma URL digitada certa hoje vire 404 amanhã. Isso fica registrado como
limitação conhecida, não como defeito a corrigir depois.

## Q4 — Botão "todos os departamentos"

**Pergunta**: a barra da americanas tem, à esquerda, um gatilho que abre a lista inteira de
departamentos. Entra?

**Resposta**: **fica de fora.**

**Consequência**: nesta loja quem é departamento são as próprias entradas da barra, cada uma já com
o seu painel — é o que o comentário do `Header.tsx` registra desde a feature 16, quando o bloco
"DEPARTAMENTOS" do board `5N8-0` foi deliberadamente deixado de fora. Um quinto gatilho ao lado
delas seria um botão sem destino próprio, e precisaria de curadoria própria das 37 categorias.

## Q5 — "Sobre" deixa de ser item fixo

**Pergunta**: tirando o "Sobre" fixo do código, o que sobra no menu? Hoje `/sobre` só é alcançável
pela barra do topo, pela folha do celular e pelo rodapé — as duas primeiras somem com essa mudança.

**Resposta**: **só categorias — e a Adri põe links quando quiser.** O menu aceita dois tipos de item:
**categoria** (com ícone, painel e banners) e **link** (rótulo + destino + ícone, sem painel).

**Consequência**: o conceito de "entrada fixa" **deixa de existir**. `FIXED_ENTRIES` é apagada, e com
ela o defeito do `/crie-seu-botton` — não pela correção da lista, mas por não haver mais lista. O
`Header` e o `MobileMenu` param de ter item de menu em JSX, e um guarda passa a recusar a volta
(`menuSemItemFixo.test.ts`).

Os links moram em `store_settings.menu_links` (jsonb), e não numa tabela nova: link não tem produto,
filha nem página própria — pô-lo em `categories` o transformaria em categoria vazia, que apareceria
na grade da home, no rodapé e na busca. A ordem passa a ser a **fusão de duas fontes** — categorias
pela `sort_order` da árvore, links pela posição deles — com o comparador em `core`, um dono só.

A migration **semeia o "Sobre"** como item de link ligado nos dois dispositivos: sem isso, a página
institucional sairia da barra num deploy sem ninguém ter decidido isso.

## Q6 — Sem teto de itens

**Pedido**: "não limitar a quantidade de itens em 5 no menu".

**Resposta**: **não há teto**, em nenhuma das duas superfícies. `MENU_SLOT_LIMIT` e `menuSlotRefusal`
são **removidos** de `@estrelinha/core/menu`, junto dos testes deles.

**Consequência**: some a recusa, mas não some o fato de a barra do desktop ser **uma linha só**. A
resposta ao estouro passa a ser a que o próprio repositório já deu duas vezes: **rolar na horizontal
dentro da própria faixa**. O `MenuBarPreview` já usava `overflow-x-auto` "porque embrulhar em duas
linhas ESCONDERIA o estouro", e a regra de mobile do `CLAUDE.md` manda conteúdo largo rolar dentro do
próprio container, nunca no `body`. Quem mostra o estouro para a Adri é a **prévia**, não um erro na
hora de ligar a próxima categoria.

O contador da tela deixa de ser "4 de 5 vagas" e passa a ser "5 itens" — informação, não cota.

---

## Decisões técnicas que NÃO foram perguntadas (o agente decidiu, com o motivo)

| Decisão | Motivo |
| --- | --- |
| A biblioteca de ícones **muda de casa**: `apps/store/src/shared/ui/icons/**` → `@estrelinha/ui/icons` | O seletor do painel precisa desenhar o ícone de verdade, e `apps/backoffice` não importa de `apps/store` (fronteira que `previaUnica.test.ts` guarda). Para o mesmo glifo aparecer nos dois apps, ele tem de morar num pacote. Custo medido: **15 arquivos da loja** trocam o caminho de import, 30 arquivos mudam de pasta, e o guarda `icons.test.ts` muda junto. |
| O **catálogo de chaves** de ícone mora em `@estrelinha/core/menu`, os componentes em `@estrelinha/ui/icons` | `core` é puro (sem React) porque os guardas o importam de dentro de teste que lê arquivo do disco. A chave é dado; o desenho é componente. |
| **Sem `check` no banco** para `menu_icon` | Repetir as chaves em SQL criaria a cópia deliberada que o projeto só aceita com guarda comparando os dois lados. Chave inválida degrada para "sem ícone" — não é dinheiro nem segurança, e o custo do erro é um item sem ícone. |
| O item de link é **link direto**: sem painel, sem subcategoria, sem banner | Dar painel a um link o transformaria numa categoria sem produtos — a "segunda árvore" que a `16` recusou. O que tem painel é categoria, e categoria já tem tela própria. |
| O validador de destino é **um só**, usado pelo item de link e pelo banner | São a mesma pergunta ("este endereço leva a algum lugar da loja?"). Dois validadores divergiriam no primeiro ajuste, e um deles aceitaria o que o outro recusa. |
| `show_in_menu` vira **coluna gerada** (`menu_desktop or menu_mobile`) em vez de sumir | Sumir quebraria a loja publicada na janela entre o `db push` e o deploy da Vercel, que rodam em paralelo. Gerada, ela não pode divergir das duas booleanas — quem deriva é o banco — e continua servindo o índice parcial. Nenhuma tela pode lê-la (guarda). |
