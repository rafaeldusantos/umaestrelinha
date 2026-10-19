# 67 — Os filtros enxergam as variações

## Problem Statement

A `66` marca o valor de filtro na **peça**, mas acabamento e formato moram nas **variações**. Medido
no banco local (2026-10-18): 3.380 variações em 702 peças. 575 peças têm mais de uma, e
"Colar coração com letra" tem 144 (Cor × Letra × gravação). Há peças vendidas como pingente **e**
como chaveiro, e outras em prata 925 **e** folheadas. Marcar "Prata 925" na peça faz o filtro
acertar a peça e errar a página: o card abre na variação padrão, que pode ser a folheada. Marcar
variação por variação, por outro lado, seriam 144 cliques numa peça só.

O texto das variações também não serve de fonte automática (`AD-050`). O mesmo acabamento aparece
com grafias diferentes ("Folheado a Ouro" × "Prata 925 folheado a ouro" × "Folheado a ouro (Prata
925)"), a chave de elo tem cinco grafias, e "Tipos de elo" carrega ora formato (Chaveiro, Pingente),
ora acabamento (Prata 925). Ainda assim é o melhor **ponto de partida** para a curadoria: são só
**233 pares distintos (chave, texto)** no catálogo inteiro.

## Goals

- [ ] A Adri marca um valor de filtro numa **opção da peça** ("nesta peça, Cor = Prata 925 ⇒
      Acabamento: Prata 925"), e a marcação vale para todas as variações com aquele texto.
- [ ] O painel **sugere** marcações a partir do nome, das tags e das opções, cada sugestão com o
      motivo, e a Adri aprova ou recusa em lote. Sugestão nunca vira marcação sozinha.
- [ ] Na loja, com o filtro casando por opção, só passa a peça que **vende** a combinação pedida, e
      o card abre e mostra a variação que casou (foto, preço e `?variant=`).
- [ ] A marcação por opção fica no formato que a `68` (SEO por variação) vai ler, sem migração nova.

## Out of Scope

| Item | Razão |
| --- | --- |
| Título, canônica, sitemap e JSON-LD `ProductGroup` por variação | **feature `68`**, por decisão do usuário (2026-10-18): página própria no Google só para as opções marcadas. A `67` não muda `<head>`, canônica nem edge function |
| Dicionário global "texto ⇒ valor" aplicado a toda peça, inclusive às novas | decisão do usuário: a marcação é por peça. Uma regra global marcaria peça nova sem ninguém ter olhado |
| Marcação por **linha** de variação | decisão do usuário: 3.380 linhas, 144 numa peça, e a marcação sumiria ao sair da grade |
| Limpar, unificar ou renomear o texto das opções (`options`, `option_values`) | é cadastro da dona; a sugestão existe justamente para conviver com o texto sujo |
| Sugestão por IA ou por similaridade difusa | `BL-014`. A sugestão desta feature é casamento de texto, explicável e com o motivo |
| O botão de compra rápida do card adicionar a variação que casou | o card da loja não tem compra rápida (só favoritos); nada a mudar |
| As miniaturas de cor do card nascerem na cor que casou | a foto principal já muda (VFL-12). A fileira de cor continua com o comportamento de hoje |
| Contar variações nos `(N)` dos filtros | o número é de **peças**, como na `66` |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Granularidade | **opção da peça**: (peça, nome do eixo, texto da opção, valor de filtro) | decisão do usuário | y |
| Dois grupos casando por opção | uma **mesma** variação ativa tem de satisfazer todos os grupos que não estão satisfeitos na peça toda | decisão do usuário | y |
| Card com casamento por opção | foto da variação (a da peça quando ela não tem), preço e preço-de os dela, link com `?variant=` | decisão do usuário | y |
| Sugestão recusada | gravada (peça × valor × alvo) e não volta a ser sugerida | decisão do usuário | y |
| SEO por variação | **fora**: feature `68`, só opções marcadas | decisão do usuário | y |
| A identidade da opção é o **texto** (nome do eixo + texto do valor, exatos, como em `products.options`) | sem id de opção no schema | `options` é jsonb sem id; o texto é o que `option_values` usa para casar a linha | y (2026-10-18, "siga a 67") |
| Renomear um eixo no formulário do produto | as marcações daquele eixo **acompanham** o nome novo ao salvar | sem isso, renomear "Tpos de elo" para "Tipo de elo" apagaria a curadoria em silêncio | y (2026-10-18, "siga a 67") |
| Remover um valor de eixo (ou o eixo) no formulário | as marcações daquele texto saem ao salvar | marcação de texto que não existe mais não casa nada e só confunde | y (2026-10-18, "siga a 67") |
| Marcação por opção sem nenhuma variação **ativa** com aquele texto | não casa nada na loja; no painel aparece como "Sem variação ativa" | variação inativa não é vendida (`representativeVariant` já pula) | y (2026-10-18, "siga a 67") |
| Peça marcada na peça toda **e** por opção, no mesmo valor | a da peça toda vence: a peça passa sem restringir variação, e o card abre como hoje | "a peça toda é Prata 925" é a afirmação mais forte | y (2026-10-18, "siga a 67") |
| Aprovar a sugestão por opção de um valor que já está marcado na peça toda | **troca**: tira a marcação da peça toda e grava a da opção, avisando antes | se só algumas opções são Prata 925, a marcação da peça toda está errada, e é ela que a sugestão corrige | y (2026-10-18, "siga a 67") |
| Várias variações satisfazem a seleção | o card abre na de menor `position` entre as que passam, preferindo a com estoque | é a ordem que o painel já mostra e que a página usa como padrão | y (2026-10-18, "siga a 67") |
| Filtro de preço com casamento por opção | o preço testado é o da variação candidata (`price` ?? preço base) | o card mostra o preço da variação (VFL-12). Testar o da peça mostraria R$ 95 sob "até R$ 80" | y (2026-10-18, "siga a 67") |
| Filtro "Disponível" com casamento por opção | a variação candidata precisa ter estoque | idem: o card abriria numa variação esgotada | y (2026-10-18, "siga a 67") |
| Casamento de texto da sugestão | dobra de acento e caixa, tokens alfanuméricos, os tokens do termo **contíguos** no texto; para tag, também com os espaços removidos (`Prata925` casa "Prata 925") | explicável em uma frase e testável por exemplo; "Ouro" casar "Folheado a Ouro Branco" é aceito, porque a Adri aprova | y (2026-10-18, "siga a 67") |
| Termos de sugestão por valor | o nome do valor sempre; até **10** termos extras, ≤ 40 caracteres cada (P2) | "Folheado a ouro" precisa casar "Dourado"; sem termos, a sugestão perde as grafias que não contêm o nome | y (2026-10-18, "siga a 67") |
| Fontes da sugestão | opção ⇒ marcação **por opção**; nome e tags ⇒ marcação **na peça toda** | o nome e a tag falam da peça, a opção fala da variação | y (2026-10-18, "siga a 67") |
| Só variações **ativas** geram sugestão | idem à loja | sugerir texto que a loja não vende é ruído | y (2026-10-18, "siga a 67") |
| Onde a sugestão é calculada | no navegador do painel, regra pura em `core/filters` | 702 peças × 3.380 linhas é desprezível; uma regra pura é testável e é a mesma que o formulário do produto usa | y (2026-10-18, "siga a 67") |
| `(N)` dos filtros | peças que passam; a peça conta uma vez mesmo com várias variações que casam | coerente com a `66` | y (2026-10-18, "siga a 67") |

**Open questions:** nenhuma. As decisões estruturais foram respondidas, e o resto está acima com
`Confirmed? n` para a revisão da spec.

---

## User Stories

### P1: Marcar uma opção da peça no formulário do produto ⭐ MVP

**User Story**: Como a Adri, quero dizer que "Cor = Prata 925" desta peça é *Acabamento: Prata 925*,
uma vez, e que isso valha para todas as letras e gravações daquela cor.

**Acceptance Criteria**:

1. WHEN a peça tem ao menos um eixo de opção THEN o bloco "Filtros da loja" SHALL ganhar a seção
   "Pelas variações", com uma linha por **texto de opção** (eixo + valor, na ordem de `options`), e
   em cada linha os valores de filtro como chips de seleção múltipla, agrupados por grupo.
2. WHEN a peça não tem eixo nenhum THEN a seção "Pelas variações" SHALL não aparecer, e a marcação
   na peça toda continua como na `66`.
3. WHEN ela marca um chip numa linha e salva THEN o sistema SHALL gravar (peça, eixo, texto, valor),
   depois de o produto existir, e um F5 SHALL mostrá-lo marcado.
4. WHEN um valor já está marcado na peça toda THEN o chip dele nas linhas SHALL aparecer como
   "já vale para a peça toda", desabilitado, com o motivo em texto.
5. WHEN ela renomeia um eixo e salva THEN as marcações daquele eixo SHALL passar a usar o nome novo.
6. WHEN ela remove um texto de opção (ou o eixo inteiro) e salva THEN as marcações daquele texto
   SHALL ser apagadas junto.
7. WHEN uma marcação gravada não tem variação ativa com aquele texto THEN a linha SHALL mostrar
   "Sem variação ativa" e continuar removível.
8. WHEN a gravação das marcações falha THEN o formulário SHALL manter a seleção e mostrar o erro, e
   nada SHALL aparecer como salvo (molde da `66`, `persistProduct` por etapa).

**Independent Test**: em "Colar coração com letra", marcar "Cor = Prata 925 ⇒ Prata 925", salvar,
recarregar e ver a marcação. Renomear o eixo "Cor" para "Acabamento", salvar e ver a marcação
continuar.

---

### P1: A loja filtra pela variação e abre nela ⭐ MVP

**User Story**: Como cliente, quero filtrar por "Prata 925" e cair na página já na versão em prata.

**Acceptance Criteria**:

1. WHEN a cliente seleciona valores THEN a peça SHALL passar se, para cada grupo com seleção, ela
   tem o valor marcado na **peça toda** **ou** existe uma variação ativa cujo texto de opção está
   marcado com aquele valor. Os grupos que só se satisfazem por opção SHALL ser satisfeitos pela
   **mesma** variação.
2. WHEN a peça só passa por opção THEN a variação candidata SHALL também passar pelo preço (o dela)
   e, com "Disponível" ligado, ter estoque.
3. WHEN a peça passa por opção THEN o card SHALL linkar `productPath(slug)?variant=<publicVariantId>`
   da variação escolhida (menor `position` entre as candidatas, preferindo a com estoque).
4. WHEN a peça passa por opção THEN o card SHALL mostrar a foto da variação escolhida (a da peça se
   ela não tem foto), o preço dela (`price` ?? preço base) e o preço-de dela, se houver.
5. WHEN a peça passa pela marcação na peça toda, ou não há seleção nenhuma THEN o card SHALL ser
   idêntico ao de hoje, sem `?variant=`.
6. WHEN a página do produto abre com esse `?variant=` THEN ela SHALL abrir na variação escolhida
   (comportamento que `findVariantByPublicId` já tem; provar de ponta a ponta).
7. As contagens `(N)` SHALL contar **peças** pela mesma regra (faceta disjuntiva da `66`, agora com
   as opções e a exigência da mesma variação).
8. WHEN a cliente remove o último valor selecionado THEN os cards SHALL voltar ao estado de hoje
   (foto, preço e link da peça).
9. A regra SHALL valer igual na **categoria** e na **busca**.

**Independent Test**: com uma peça vendida em "Prata 925" e em "Folheado a Ouro", só a opção de
prata marcada, filtrar por Prata 925 e ver o card com a foto e o preço da prata. Tocar e cair na
página com a prata selecionada. Filtrar Prata 925 + Chaveiro numa peça que tem Prata 925 pingente e
Folheado chaveiro, e ver que ela **não** passa.

---

### P1: A fila de sugestões para a curadoria inicial ⭐ MVP

**User Story**: Como a Adri, quero ver o que o catálogo já diz (nome, tags, opções) transformado em
sugestões com o motivo, e aprovar em lote.

**Acceptance Criteria**:

1. WHEN ela abre `/admin/filtros/sugestoes` THEN o painel SHALL listar as sugestões **agrupadas por
   motivo**, cada grupo com: o valor sugerido (grupo › valor), o motivo em texto ("Opção Cor =
   Folheado a Ouro Rosé", "Nome contém 'pingente'", "Tag 'Prata925'"), o alvo (peça toda / esta
   opção) e quantas peças.
2. WHEN ela expande um grupo de motivo THEN o painel SHALL listar as peças, com foto, nome e caixa
   de seleção, todas selecionadas por padrão.
3. WHEN ela toca "Aprovar N" THEN o sistema SHALL gravar as N marcações numa requisição por tipo de
   alvo; marcação que já existe SHALL ser no-op.
4. WHEN ela toca "Recusar N" THEN o sistema SHALL gravar as N recusas, e elas SHALL sair da fila e
   não voltar.
5. Uma sugestão SHALL não aparecer quando a marcação equivalente já existe, ou quando foi recusada.
6. WHEN a aprovação ou a recusa falha THEN a seleção SHALL continuar como estava, e nada SHALL
   aparecer como marcado ou recusado.
7. WHEN dá certo THEN a fila, as contagens do valor e as de `/admin/filtros` SHALL atualizar sem
   recarregar.
8. A fila SHALL ter recorte por **grupo de filtro** e por **fonte** (opção, nome, tag), e uma busca
   pelo texto do motivo, com a dobra da `51` (`dobrarTexto`).
9. WHEN não existe grupo de filtro nenhum THEN a tela SHALL dizer isso e linkar para
   `/admin/filtros`. WHEN não sobra sugestão nenhuma THEN SHALL dizer "Nenhuma sugestão pendente".
10. WHEN ela aprova uma sugestão por opção de um valor que já está marcado na peça toda THEN o painel
    SHALL avisar antes, na própria linha, que "a marcação da peça toda será trocada por esta opção",
    e a aprovação SHALL fazer as duas coisas.
11. `/admin/filtros` SHALL linkar para a fila mostrando o total de sugestões pendentes.

**Independent Test**: criar "Acabamento › Prata 925", abrir a fila, achar "Opção Cor = Prata 925 ·
73 peças", desmarcar duas, aprovar 71, e ver o grupo sumir. Recusar "Tag 'Prata925'" de uma peça,
recarregar, e ela não voltar.

---

### P1: Sugestões no formulário do produto ⭐ MVP

**User Story**: Como a Adri, quero ver no próprio produto o que o painel sugere para ele.

**Acceptance Criteria**:

1. WHEN o produto tem sugestões pendentes THEN o bloco "Filtros da loja" SHALL mostrá-las **ao lado
   do chip** (peça toda ou linha da opção), com o motivo, e as ações "Aceitar" e "Recusar".
2. "Aceitar" SHALL só marcar o chip no formulário; a gravação acontece no "Salvar" do produto, como
   qualquer marcação. "Recusar" SHALL gravar a recusa na hora.
3. A regra de sugestão SHALL ser a **mesma** da fila (uma função de `core`, chamada pelas duas
   telas).

---

### P2: Opção na marcação em massa

**User Story**: Como a Adri, dentro de um valor, quero marcar as peças pela opção, não só a peça
toda.

**Acceptance Criteria**:

1. WHEN ela abre a marcação em massa de um valor THEN cada linha SHALL mostrar como a peça está
   marcada: "Peça toda", "Por opção: Cor = Prata 925" ou nada.
2. WHEN o valor tem sugestões pendentes THEN a tela SHALL ter o atalho "Ver N sugestões deste
   valor", que abre a fila recortada por ele.
3. "Remover de N" SHALL remover **as duas** formas de marcação daquele valor nas peças selecionadas,
   e a confirmação SHALL dizer isso.

---

### P2: Termos de sugestão por valor

**User Story**: Como a Adri, quero dizer que "Dourado" também sugere *Folheado a ouro*.

**Acceptance Criteria**:

1. WHEN ela edita um valor em `/admin/filtros` THEN SHALL haver o campo "Também sugerir quando o
   texto tiver…", com até 10 termos de até 40 caracteres, e o banco SHALL recusar o mesmo limite.
2. WHEN um termo é acrescentado THEN a fila SHALL passar a considerá-lo, sem recarregar.
3. Termo vazio, repetido (sem diferenciar maiúscula e acento) ou igual ao nome SHALL ser recusado
   com o motivo.

---

## Edge Cases

- WHEN a peça é apagada THEN as marcações por opção e as recusas dela SHALL sair junto (cascata).
- WHEN o valor de filtro é apagado THEN as marcações por opção e as recusas SHALL sair junto, e a
  confirmação da `66` SHALL somar as marcações por opção ao número que ela mostra.
- WHEN o grupo é desligado THEN as marcações por opção SHALL continuar no banco e não chegar à loja
  (RLS, molde da `66`).
- WHEN a peça é inativa THEN as marcações por opção dela SHALL não chegar à loja.
- WHEN o mesmo texto aparece em dois eixos da mesma peça ("Prata 925" em "Cor" e em "Tipos de elo")
  THEN são duas opções distintas, com marcação e sugestão próprias.
- WHEN uma variação tem `option_values` sem a chave de um eixo de `options` THEN ela SHALL não casar
  a marcação daquele eixo.
- WHEN o `?variant=` do card aponta para uma variação que deixou de ser elegível (desativada entre a
  listagem e o clique) THEN a página SHALL abrir na variação padrão (comportamento atual).
- WHEN a variação escolhida não tem `nuvemshop_id` THEN o `?variant=` SHALL usar o UUID
  (`publicVariantId`, regra da `30`).

---

## Implicit-requirement sweep

| Dimensão | Resolução |
| --- | --- |
| Validação e limites | termos: 10 × 40, com `check` no banco e guarda que compara com `core`; texto de opção e eixo exatos, sem teto próprio (vêm de `options`) |
| Falha / falha parcial | formulário: VFL-08 (etapa própria em `persistProduct`); fila: VFL-23; a falha do catálogo na loja continua sendo ausência (`FLT-26`) |
| Idempotência / repetição | PK composta + `on conflict do nothing` nas marcações por opção e nas recusas; aprovar duas vezes é no-op |
| Auth e limites de taxa | leitura pública só das marcações por opção de grupo ativo **e** peça ativa; recusas **sem** leitura pública; escrita só `has_role` com `with check`; nada a `anon`. Taxa N/A: PostgREST com RLS, sem endpoint novo |
| Concorrência / ordem | N/A because o painel tem uma ou duas pessoas; a troca peça toda → opção (VFL-27) grava a opção **antes** de apagar a da peça toda, para uma falha no meio deixar a peça marcada em dobro (inofensivo) e nunca sem marcação |
| Ciclo de vida | cascatas peça → marcações por opção e recusas; valor → idem; renomear eixo → acompanha (VFL-05); remover texto → apaga (VFL-06) |
| Observabilidade | N/A because o clique no card já chega ao GA4 (`select_item`, com a URL nova no `page_view` da página); evento próprio está fora |
| Dependência externa | N/A because não há serviço externo |
| Integridade de estado | sugestão: pendente → marcada **ou** recusada, e nenhuma das duas volta a pendente sozinha (desfazer = remover a marcação ou, para a recusa, fora de escopo — ver *Assumptions*) |

> **Desfazer uma recusa** não tem tela nesta feature. A recusa é gravada e só sai junto com a peça
> ou com o valor. Se fizer falta, é uma lista "Recusadas" na fila, uma P3 que não foi pedida.

---

## Requirement Traceability

| ID | Story | Status |
| --- | --- | --- |
| VFL-01..08 | P1: Marcar opção no produto (AC 1–8) | Verified |
| VFL-09..17 | P1: Loja filtra e abre na variação (AC 1–9) | Verified |
| VFL-18..28 | P1: Fila de sugestões (AC 1–11) | Verified |
| VFL-29..31 | P1: Sugestões no produto (AC 1–3) | Verified |
| VFL-32..34 | P2: Opção na marcação em massa (AC 1–3) | Verified |
| VFL-35..37 | P2: Termos de sugestão (AC 1–3) | Verified |
| VFL-38 | Meta: a marcação por opção é lida pela loja **só** através de `core/filters` (guarda de dono único) | Verified |

**Coverage:** 38 total, 0 mapeados a tasks (o `tasks.md` mapeia).

---

## Success Criteria

- [ ] Na fila, a Adri cura um acabamento em ~70 peças com **um** "Aprovar".
- [ ] Filtrando "Prata 925" na categoria, **nenhum** card abre numa variação que não é Prata 925.
      Medido no banco local, com a curadoria de prova.
- [ ] Prata 925 + Chaveiro não mostra peça que não vende chaveiro em prata.
- [ ] Em 390×844, a seção "Pelas variações" de uma peça com 5 cores e 3 grupos não rola na
      horizontal, e a fila de sugestões cabe sem rolagem horizontal do body.
- [ ] Nenhuma sugestão vira marcação sem um toque da Adri (guarda: o painel não grava marcação fora
      de "Aprovar" e de "Salvar").
