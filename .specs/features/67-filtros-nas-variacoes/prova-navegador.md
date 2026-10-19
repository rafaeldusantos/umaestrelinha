# 67 — Prova em navegador (T16)

2026-10-18 · Chromium 149 (Playwright 1.58, Chrome for Testing local) · dev servers da loja (:8082)
e do painel (:8083), que já estavam de pé quando a prova começou (14:53) · **Supabase local de pé**
(:54441 / :54442), com a migration da `67` aplicada e os dados da `66` intactos (3 grupos, 13
valores, 970 marcações na peça toda).

**Bundle servido conferido antes de medir**: `mapProduct.ts` servido cita
`product_option_filter_values` (2×), `ProductCard.tsx` cita `matchedVariant` (7×),
`packages/core/src/filters/match.ts` é servido com `matchProduct`, e
`AdminFilterSuggestionsPage.tsx` é servido pelo painel.

**Método de conferência da loja**: cada card colhido do DOM (`main a[href^="/produtos/"]`, com a
rolagem infinita esgotada pelo botão "Carregar mais joias") foi cruzado com um despejo do banco
(`db.json`: peças ativas, marcações na peça toda, marcações por opção e variações com
`nuvemshop_id`, `option_values`, preço, foto, estoque e posição) por uma **reimplementação
independente** da regra (grupos satisfeitos na peça toda saem; os outros exigem uma mesma variação
ativa carregando todos; menor `position`, preferindo estoque). Nenhum número abaixo foi lido da
própria tela para provar a própria tela.

## Curadoria de prova (por SQL) — criada e REMOVIDA

`product_option_filter_values` e `filter_suggestion_dismissals` estavam **vazias** antes da prova
(0 e 0) e voltaram a 0 e 0 ao fim (`DELETE 382`, `DELETE 2`). `product_filter_values` foi
fotografada antes (970 linhas) e conferida depois por `diff`: **idêntica**.

| O que | Linhas |
| --- | --- |
| Toda opção ativa com texto exato `Prata 925` (qualquer eixo) ⇒ *Acabamento › Prata 925*, peças ativas | 226 |
| Toda opção ativa `Chaveiro` em eixo de elo (`t%elo`: as cinco grafias) ⇒ *Tipo de joia › Chaveiro* | 145 |
| Caso construído Prata + Chaveiro: `joia-afetiva-mini-coracao-com-leite-materno1`, opção `Tipos de elo = Chaveiro` ⇒ *Prata 925* (o chaveiro dessa peça passa a ser "de prata") | 1 |
| Caso de preço/foto divergentes: `joia-afetiva-borboleta-com-leite-materno-prata-925`, `Cor = Folheado a Ouro` ⇒ *Folheado a ouro* (padrão é Prata 925 a R$ 325,00; a folheada é R$ 234,90, foto própria) | 1 |
| Seção "Pelas variações" com 5 cores e 3 grupos: `berloque-afetivo-coracao-com-pelo-de-pet-em-prata-925`, 6 marcações em 3 opções de Cor, nos 3 grupos | 6 |
| Gravadas pelo painel durante a prova (aprovação de 2, "Salvar" do produto de 1) | 3 |
| Recusas gravadas pelo painel (fila 1, produto 1) | 2 |

O "Salvar" do produto `colar-com-letra-coracao` regravou a peça (o `updated_at` mudou); as 144
variações foram comparadas com o despejo de antes e estão **iguais** em id, `nuvemshop_id`,
`option_values`, preço, foto, estoque, posição e estado.

## Loja

Universo: `/joias-afetivas` (516 peças ativas na árvore, roll-up da descendência).

| # | Medida | 390 × 844 | 1440 × 900 | |
| --- | --- | --- | --- | --- |
| — | rolagem horizontal do body (`documentElement.scrollWidth`) em **todos** os cenários abaixo | 390/390 | 1440/1440 | PASS |
| 1 | `?acabamento=prata-925`: cards / esperado pela regra independente | 354 / 354 ("354 produtos de 516") | 354 / 354 | PASS |
| 1 | cards com `?variant=` / esperado por opção | **171 / 171** | 171 / 171 | PASS |
| 1 | `?variant=` apontando para a variação errada, ou para variação que não carrega a marcação | **0** | 0 | PASS |
| 1 | peça que não devia passar aparecendo | 0 | 0 | PASS |
| 2 | preço do card = `price ?? base_price` da variação escolhida | 171 / 171 | 171 / 171 | PASS |
| 2 | foto do card = foto da variação (as 169 que têm; 2 sem foto caem na da peça) | 169 / 169 | 169 / 169 | PASS |
| 2 | card de peça marcada na peça toda **sem** `?variant=` | 183 / 183 | 183 / 183 | PASS |
| 4 | `?tipo-de-joia=chaveiro&acabamento=prata-925`: cards | **2** — `mini-coracao…1?variant=1256499495` (o construído) e `patinha-com-tecido-do-pet?variant=1354802071` (Prata na peça toda + Chaveiro por opção) | idem | PASS |
| 4 | peças que vendem Prata 925 **e** Chaveiro como opções do MESMO eixo (nenhuma variação é as duas coisas) e ficaram de fora | **143 de 145** fora; as 2 que entram são as duas acima, pela regra | idem | PASS |
| — | `?tipo-de-joia=chaveiro` sozinho | 145 / 145, todos com `?variant=` na variação Chaveiro | idem | PASS |
| 6 | sem filtro | 516 cards, **0** com `?variant=` | idem | PASS |
| 3 | clicar no card `pingente-afetivo-gota-com-leite-materno-e-cabelo?variant=1549815195` (padrão: Folheado, R$ 209,90) | página abre com `Tipos de elo: Prata 925` marcado (`role=radio aria-checked=true`) e **R$ 209,99** | idem | PASS |
| 3 | clicar no card `joia-afetiva-borboleta…?variant=1537827166` sob `?acabamento=folheado-a-ouro` (padrão: Prata 925, R$ 325,00) | página abre com **Folheado a Ouro** marcado e **R$ 234,90** | idem | PASS |
| 5 | busca `/busca?q=pingente&acabamento=prata-925` | 267 resultados / 267 esperados no universo da busca; 169 com `?variant=`, 0 errados | idem | PASS |
| 5 | busca `/busca?q=leite&acabamento=prata-925` | 150 / 150; 59 com `?variant=`, 0 errados | idem | PASS |
| 5 | busca `q=pingente` + Prata + Chaveiro | 2 (os mesmos da categoria) | idem | PASS |
| 5 | busca `q=leite` + Prata + Chaveiro | 1 (`mini-coracao…1`; a patinha não casa "leite") | idem | PASS |
| 6 | desmarcar o chip pela UI (sidebar em 1440, sheet "Filtros" em 390), sem recarregar | URL vira `/joias-afetivas`; **0** cards com `?variant=`; o card da borboleta volta de `…?variant=1537827166`, R$ 234,90, foto `1215680649` para `/produtos/joia-afetiva-borboleta…`, **R$ 325,00**, foto `1217436576` | idem | PASS |
| — | erros de página (`pageerror`) | nenhum | nenhum | |

**Success Criterion "nenhum card de Prata 925 abre numa variação que não é Prata 925"**: verdadeiro
para os **171** cards que passam por opção — todo `?variant=` aponta para uma variação com o texto
marcado. Os **183** cards sem `?variant=` passam pela marcação **na peça toda** da curadoria da
`66` (por nome e tag), e por decisão da spec ("a da peça toda vence") abrem na variação padrão:
**128** deles abrem numa variação cujo texto não é "Prata 925" puro (ex.: `Prata 925 Folheado a
Ouro Branco`, e `anel-afetivo-cinzas-cremacao-coracoes-aco-inoxidavel` abre em `Aço Inoxidável
Folheado a Ouro Branco` com a peça toda marcada Prata 925). Isso é **curadoria**, não código: é
exatamente o que a troca peça toda → opção da fila (`VFL-27`) existe para corrigir. O critério está
medido no recorte que a `67` controla.

## Painel

| # | Medida | 1440 × 900 | 390 × 844 | |
| --- | --- | --- | --- | --- |
| — | rolagem horizontal do body (fila, motivo aberto, formulário do produto, popover aberto, marcação em massa) | 1440/1440 | 390/390 | PASS |
| 7 | `/admin/filtros/sugestoes`: total | "1844 pendentes" (com a curadoria de prova no banco) | idem | |
| 7 | lista de motivos | busca, grupo, fonte Todas/Opção/Nome/Tag, "N peças"; motivo aberto ao lado | lista em coluna; tocar abre o motivo em tela própria (`?motivo=`), voltar de 44px | PASS |
| 7 | motivo aberto | cabeçalho `Cor = "Folheado a Ouro" ⇒ Acabamento › Folheado a ouro`, colunas **Variações que casam** ("2 de 4") e **Hoje** ("Sem marcação") | as duas colunas viram uma linha sob o nome ("2 de 4 variações · sem marcação") | PASS |
| 7 | alvos | "Aprovar"/"Recusar" **48px**; caixas de seleção de 20px dentro de `<label>` de 44–140px | idem | PASS |
| 7 | **a barra "Recusar N / Aprovar N" fica à vista?** | **não**: `barTop` = **13.993** numa viewport de 900 (documento de 14.099) | **não**: `barTop` = **22.977** numa de 844 (documento de 23.207) | **FAIL — D1** |
| 7 | aprovar `Opção Tipos de elo = Chaveiro Inox ⇒ Chaveiro` (2 peças, "Sem marcação") | **uma** requisição (`POST product_option_filter_values?on_conflict=…`); 1844 → **1842**; o motivo sai da lista; `performance.getEntriesByType('navigation')` continua 1 (sem recarga); 2 linhas no banco | — | PASS |
| 7 | "Sugestões (N)" em `/admin/filtros` | 1844 → 1841 depois de aprovar e recusar | — | PASS |
| 7 | recusar `Opção Cor = Aço Inoxidavel Preto ⇒ Aço inoxidável` (1 peça) | **uma** requisição (`POST filter_suggestion_dismissals`); 1842 → **1841**; F5: continua 1841 e o motivo **não volta** | — | PASS |
| 7 | contagens do valor em `/admin/filtros` depois de aprovar por opção | "Chaveiro · **0 peças marcadas**" antes e depois | — | **D2** |
| 8 | `/admin/produtos/:id/editar` de `colar-com-letra-coracao` (Tamanho × Cor × Letra, 144 variações) | "Pelas variações": cartões por eixo, Cor aberto com 3 linhas ("48 variações ativas"), Tamanho e Letra recolhidos ("nenhuma marcada"); seção de 710px | seção de 292px, sem nada fora da caixa | PASS |
| 8 | sugestão na linha | `Folheado a Ouro`: "Aceitar" marca o chip; **zero** requisições de escrita depois de "Aceitar" (provado também em `berloque-…-pet`, com "Alterações não salvas" acendendo) | — | PASS |
| 8 | "Recusar" na linha `Folheado a Ouro Branco` | grava a recusa na hora (`filter_suggestion_dismissals`) e a faixa some | — | PASS |
| 8 | "Salvar" + reabrir a URL | `Cor = Folheado a Ouro ⇒ Acabamento › Folheado a ouro` gravado (1 linha) e mostrado; o "Salvar" volta para `/admin/produtos`, a marcação aparece ao reabrir | idem | PASS |
| 8 | popover "Marcar Cor = Folheado a Ródio" | busca, os 13 valores agrupados por grupo, alvos de 44px, **"Colar — Já vale para a peça toda"** desabilitado (52px) | 358px de largura em `x = 32`: **encosta na borda direita** (32 + 358 = 390) e cobre a linha que o abriu | PASS · D4 |
| 8 | 5 cores × 3 grupos (`berloque-…-pet`) | chips e faixas embrulham dentro da coluna de 710; "Já vale para a peça toda" sob os chips desabilitados | sem rolagem horizontal, **mas a faixa de sugestão quebra palavra no meio** ("Sugest/ão", "Pingen/te", "Model/o"), coluna de texto de ~55px | **FAIL — D3** |
| 9 | marcação em massa de *Prata 925* | coluna **Hoje**: **171** "Por opção: …" e **183** "Peça toda" — os mesmos 171 e 183 que a loja mediu | idem, "Por opção: Cor = Prata 925" à direita da linha | PASS |
| 9 | "Ver N sugestões deste valor" | "Ver 554 sugestões deste valor" → `/admin/filtros/sugestoes?valor=2f2acdff…`, só motivos de Prata 925 | idem | PASS |
| 9 | "Remover de 1 produto" (sem confirmar) | a confirmação diz "Saem as duas formas de marcação: na peça toda e por opção (1 peça marcada por opção)"; "Manter" — nenhuma escrita | — | PASS |
| — | erros de página | nenhum | nenhum | |

Tempo até a fila aparecer: 8,4 s na primeira abertura (1440, dev server frio) e 1,7 s na seguinte
(390). Não é medida de produção.

## Defeitos achados

**D1 — a barra de ação da fila não é fixa (alto).** `ReasonDetail.tsx`: a barra é
`sticky bottom-0`, mas o ancestral `<section aria-label="Motivo aberto">` tem `overflow-hidden`, e
`overflow` diferente de `visible` faz do `section` o contêiner de rolagem do `sticky` — que então
gruda no fim do próprio `section`, e não na viewport. Medido: em 1440 a barra começa em **13.993px**
(viewport 900) com o motivo de 224 peças; em 390, em **22.977px** (viewport 844). Rolar 1.500px não
a aproxima (`barTop` 12.493 / 21.477). Para aprovar um motivo grande a Adri precisa rolar a lista
inteira, e o "Aprovar 224" nunca está ao lado da seleção que ela está conferindo. Como não há barra
inferior no painel, a pergunta "briga com a barra do sistema?" não chegou a ser testável. Evidência:
`sugestoes-motivo-1440.png`, `sugestoes-motivo-390.png`, `sugestoes-motivo-rolado-*.png`.

**D2 — as contagens de `/admin/filtros` ignoram a marcação por opção (médio).** A linha do valor
diz "Chaveiro · 0 peças marcadas" com **145** peças marcadas por opção (147 depois da aprovação, e a linha continuou em 0), e o grupo "Tipo de joia ·
452 marcações" idem. A leitura já traz `option_marked_count` (`useAdminFilterCatalog.ts:92`), mas só
a confirmação de remover (`ValueList.tsx:104`/`:245`) o usa. Consequência: aprovar um motivo por
opção não muda nenhum número de `/admin/filtros` além de "Sugestões (N)", e `VFL-24` ("as
contagens do valor e as de `/admin/filtros` SHALL atualizar") fica verdadeira só pela metade. O
mesmo no cabeçalho da marcação em massa ("183 peças marcadas" ao lado de 171 linhas "Por opção").
Evidência: `filtros-1440.png`.

**D3 — a faixa de sugestão quebra palavras em 390 (médio).** `SuggestionStrip.tsx`: o texto é
`min-w-0 flex-1` (base 0) e os botões são `shrink-0`; o `flex-wrap` nunca dispara porque o texto
encolhe até ~55px antes. "Sugestão: Pingente — Opção Modelo = Pingente" sai em oito linhas,
partindo palavras. Em 1440 está correto. Evidência: `produto5cores-recorte-390.png`.

**D4 — o popover de "Marcar" encosta na borda direita em 390 (baixo).** 358px a partir de `x = 32`,
sem gutter à direita, e cobre a própria linha. Evidência: `produto-popover-390.png`.

**Observação (curadoria, não código)** — 128 dos 183 cards de Prata 925 marcados na peça toda pela
`66` abrem numa variação que não é Prata 925 pura (ver acima); a fila mostra os "Peça toda → troca"
que corrigem isso.

## O que ficou fora da medição

A troca peça toda → opção (`VFL-27`) **não foi aprovada** em navegador — apagaria marcações da `66`;
só o aviso dela foi visto ("Aceitar troca a marcação da peça toda por esta opção" no produto). A
falha de gravação (`VFL-08`, `VFL-23`), renomear e remover eixo (`VFL-05`/`06`), "Sem variação
ativa" (`VFL-07`), os termos de sugestão (`VFL-35..37`), filtro de preço e "Disponível" com
casamento por opção (`VFL-10` — as peças de prova têm estoque 0 e `stock_policy` sem rastreio),
leitor de tela, LCP/CLS da vitrine com o embed novo, e o arrasto/toque real.

Screenshots em
`/private/tmp/claude-503/-Users-rafael-santos-Projetos-uma-estrelinha-store/3d9b3994-b082-440a-805a-dde985643eff/scratchpad/shots/`.

## Reprova depois do conserto

2026-10-18 · mesmo Chromium e o mesmo dev server do painel (:8083, já de pé — não foi iniciado nem
parado por esta rodada) · Supabase local de pé. **Bundle servido conferido antes de medir**: os seis
arquivos consertados servidos pelo Vite citam a forma nova (`flex-1 min-w-0 p-6`, `barra-do-motivo`,
`sm:w-auto sm:flex-1`, `collisionPadding: 16`, `pecasDoValor`, `option_marked_count ??`).

**Curadoria de prova (SQL), criada e REMOVIDA**: 145 marcações por opção `Tipos de elo = Chaveiro` ⇒
*Tipo de joia › Chaveiro* e 226 `… = Prata 925` (qualquer eixo) ⇒ *Acabamento › Prata 925*. Ao fim
`DELETE 371`; `product_option_filter_values` e `filter_suggestion_dismissals` voltaram a **0 / 0**, e
`product_filter_values` (970 linhas) foi comparada por `diff` com a foto de antes: **idêntica**. O
motivo grande não precisou de curadoria: `Opção Cor = Folheado a Ouro ⇒ Folheado a ouro`, **225
peças**.

### A causa de D1 era DUPLA, e a segunda era do painel inteiro

O `section` do motivo tinha `overflow-hidden`, **e o `<main>` do `AdminLayout` era `overflow-auto`**.
Medido trocando só a classe no navegador: sem o do `section` a barra ainda ficava a 12.635px; sem os
dois, em 900/900. Qualquer `overflow` ≠ `visible` faz do ancestral o contêiner do `sticky`, e como
quem rola é o body, **nenhum `sticky` de dentro do `main` grudava** — nem os cabeçalhos de salvar
(`FormPageHeader`, `ProductFormHeader`), nem a barra da marcação em massa.

Tirar o `overflow` do `main` expôs três estouros horizontais que ele escondia numa rolagem do próprio
`main`, todos em 390 e anteriores à 67: o grupo de ações do `ProductFormHeader` (453px numa coluna de
342), o do `RecordPageHeader` do pedido (469) e o do `DescriptionFaqNotice` (389 em 292). Os três
ganharam `flex-wrap`/`max-w-full`. E duas consequências do `sticky` passar a funcionar foram tratadas:

- o `FormPageHeader` gruda em `top-14 md:top-0` — em `top-0` ficaria embaixo da barra `sticky h-14`
  do celular do painel (medido: topo em 56 em 390, em 0 em 1440, cupons e promoções);
- o `ProductFormHeader` gruda **só a partir de `md`** — no celular ele tem três linhas, 165px de 844;
- a coluna lateral do formulário de produto **perdeu** o `lg:sticky lg:top-6`: ela mede 1.299px numa
  janela de 900, e grudada esconderia o fim dela até o fim do formulário (e passaria por baixo do
  cabeçalho, que agora gruda). Ela nunca tinha grudado; o comportamento visível é o de sempre.

Varredura de `documentElement.scrollWidth` depois disso, em **390 e 1440**, nas 23 rotas fixas do
painel e em 15 dinâmicas (dois produtos, dois pedidos, cliente, grupo, valor, seção da Home, cupom,
promoção, quatro seções de Configurações, Google): **igual à janela em todas**.

| # | Medida | 1440 × 900 | 390 × 844 | |
| --- | --- | --- | --- | --- |
| D1 | barra do motivo de 225 peças, no topo da página | `top` 819 · `bottom` **900** / 900 | `top` 639 · `bottom` **844** / 844 | PASS |
| D1 | com a lista rolada no MEIO (`scrollY` 6.630 / 11.234 de 14.160 / 23.312) | `bottom` **900** / 900; "Aprovar 225 nesta opção" 836–884 | `bottom` **844** / 844; botões 720–768 e 780–828 | PASS |
| D1 | no fim da página | 875 (fim natural do `section`) | 819 | PASS |
| D2 | linha do grupo / banco (soma das duas formas) | Tipo de joia **597** · Acabamento **465** · Para quem **279** = banco | idem | PASS |
| D2 | linha do valor | `prata-925 · 183 peças na peça toda · 226 marcações por opção`; `chaveiro · 145 marcações por opção` = banco (183 / 226 / 145) | idem, sem o endereço; nenhuma linha cortada (`scrollWidth ≤ clientWidth`) | PASS |
| D2 | cabeçalho da marcação em massa de Prata 925 | `354 peças marcadas · 183 na peça toda · 226 por opção` — 354 = união distinta no banco (55 peças têm as duas formas) | idem | PASS |
| D3 | faixas de sugestão (2 em `colar-com-letra-coracao`, 7 em `berloque-…-pet`) | texto 233px ao lado dos botões, 2–3 linhas, **nenhuma palavra partida** (`Range.getClientRects` por palavra) | texto **234px** (linha inteira da faixa de 258), botões **abaixo**, 2–3 linhas, **nenhuma palavra partida**; maior palavra 63px | PASS |
| D4 | popover "Marcar" | 360px, de 778 a 1138 | 358px, de **16** a **374**: folga **16 / 16** | PASS |
| — | `scrollWidth` do documento em todas as telas acima | 1440 | 390 | PASS |
| — | erros de página | nenhum | nenhum | |

Copy de D2, e por que ela não soma as duas formas na linha do valor: `marked_count` conta **peças**
(a chave é peça × valor) e `option_marked_count` conta **marcações** (uma peça pode ter o valor em
duas opções). Peças distintas exigiriam uma leitura nova, então a linha diz as duas, cada uma na
própria unidade. No GRUPO a unidade já era "marcações" (`FLT-01`), e a soma passou a incluir as duas
formas — é também o que `perdaDoGrupo` diz ao remover o grupo, porque a cascata leva as duas. Na
marcação em massa as duas formas chegam por peça, e ali o total é a **união**.

Screenshots `fix-*.png` em
`/private/tmp/claude-503/-Users-rafael-santos-Projetos-uma-estrelinha-store/3d9b3994-b082-440a-805a-dde985643eff/scratchpad/shots/`.
