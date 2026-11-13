# Campanhas de desconto — cadastro no painel, percentual por produto, a vitrine e o selo

**Protótipo:** `Black Friday - Selo v2.html` (o selo) e `Black Friday - Home.html` (o bloco de ofertas), projeto
"Uma Estrelinha - Black Friday" no Claude Design
(https://claude.ai/design/p/4abe021d-d77e-4fe7-affd-524180315fa3?file=Black+Friday+-+Selo+v2.html).
**Protótipos da campanha dinâmica:** a vitrine `/ofertas`
(https://claude.ai/design/p/4abe021d-d77e-4fe7-affd-524180315fa3?file=Black+Friday+-+Vitrine+ofertas.html) e as
telas do painel — Campanhas (lista, editar, nova) e o campo no produto
(https://claude.ai/design/p/4abe021d-d77e-4fe7-affd-524180315fa3?file=Painel+-+Campanhas%2C+faixa+e+perfil.html).
**Estado:** planejamento e protótipo. Nada implementado.
**Revisão de 2026-11-13:** a campanha deixou de ser "Black Friday" fixa. Ela é cadastrada no painel (nome, vigência e
percentuais), e o produto escolhe entre os percentuais dela. O selo e a vitrine leem o nome da campanha.

## O problema

A loja quer dar **descontos de campanha** — agora a Black Friday, com 10, 15 e 20% em peças escolhidas; depois,
outras datas — e quer que as peças da campanha se reúnam numa vitrine e se destaquem nas listagens. Hoje o único
jeito de dar desconto numa peça é editar o preço e o "de" (`compare_price`) à mão, peça por peça e variação por
variação, e desfazer tudo à mão depois. Não há como saber quais peças estão numa campanha, quando ela acaba, nem
página que as reúna.

## O que a dona e a cliente ganham

1. **Descontos → Campanhas** no painel: a dona cadastra a campanha com **nome** ("Black Friday"), **vigência** (de e
   até, horário de Brasília) e os **percentuais** que a campanha oferece (10, 15, 20).
2. **No cadastro da peça**, aparecem os percentuais da campanha: "Black Friday: Nenhum · 10% · 15% · 20%".
3. **Na loja, durante a vigência**: a peça com o preço já descontado, o preço cheio riscado e o **selo da campanha**
   ("BLACK FRIDAY · −20%") no cartão, na página do produto e na sacola.
4. **Uma vitrine que se monta sozinha** com as peças da campanha, com filtro por percentual.
5. **A campanha acaba sozinha** no fim da vigência: o selo some, o preço volta, a vitrine esvazia. Nenhum preço
   cadastrado foi alterado em momento nenhum. A próxima campanha ("Dia das Mães") é outro cadastro, sem código.

## Vocabulário

- **Campanha**: nome, texto do selo, vigência (início e fim), percentuais e um interruptor.
- **Em vigência**: interruptor ligado **e** agora (horário de Brasília) entre o início e o fim. É a única condição
  que faz desconto valer na loja.
- **Agendada**: ligada, com início no futuro. Os percentuais já aparecem no cadastro da peça, para a dona preparar
  antes; a loja ainda não mostra nada.
- **Encerrada**: fim no passado. **Desligada**: interruptor desligado com o fim ainda no futuro; pode ser religada. As duas
  ficam no histórico, com as marcações das peças, sem efeito.

## Casos de uso

### UC-01 · Cadastrar a campanha
- Novo item **Campanhas** no grupo **Descontos** do menu do painel, ao lado de Cupons e Promoções.
- A lista mostra cada campanha com nome, vigência, percentuais, quantas peças estão marcadas e o estado (Agendada,
  Em vigência, Encerrada, Desligada).
- **Nova campanha**: nome (até 40 caracteres), texto do selo (até 14 caracteres, preenchido com o nome quando cabe —
  ver RN-11), as **duas cores do selo** (RN-12; nasce com o preto e ouro do protótipo), início e fim (data e hora,
  Brasília), percentuais (até 5 valores inteiros entre 1 e 70, sem repetir) e o interruptor "Campanha ligada".
- A tela mostra a **prévia do selo** num cartão de 173 px, com o texto, as cores e o maior percentual, enquanto a
  dona digita.
- Recusas com o motivo, antes de gravar: fim antes do início; nenhum percentual; percentual fora da faixa ou
  repetido; vigência que se sobrepõe à de outra campanha ligada (RN-02); par de cores sem contraste (RN-12).

### UC-02 · Editar e encerrar
- Nome, texto do selo e fim podem mudar a qualquer momento; mudar vale na próxima página que a cliente abrir.
- **Tirar um percentual em uso é recusado**, com a contagem ("12 peças usam 15%. Mude essas peças antes de tirar o
  percentual."). Acrescentar percentual é livre.
- "Encerrar agora" põe o fim no instante atual. A campanha não é apagada se algum pedido a usou (RN-09); sem pedido,
  pode ser apagada, e as marcações saem junto.

### UC-03 · Marcar a peça
- Em `/admin/produtos`, na aba de preço da peça, aparece um campo por campanha **agendada ou em vigência**, na ordem do
  início, cada um com a sua vigência no rótulo: "Black Friday (13/11 a 30/11): Nenhum · 10% · 15% · 20%", com a prévia do preço
  ("R$ 209,90 → R$ 167,92").
- Vale para todas as variações da peça, cada uma sobre o próprio preço.
- Sem campanha agendada ou em vigência, o campo não aparece.

### UC-04 · Marcar várias de uma vez
- Na lista de produtos, selecionar várias e aplicar "Black Friday: X%" ou "Tirar da Black Friday" pela edição em
  massa que já existe; os percentuais oferecidos são os da campanha. Na edição em massa, a dona escolhe primeiro a campanha e depois o percentual;
  o filtro da lista também começa pela campanha.
- A lista ganha o filtro pela campanha (todas, ou um percentual) e o percentual na linha.
- Na tela da campanha, "Ver as peças" leva à lista já filtrada.

### UC-05 · A peça na loja, durante a vigência
- Cartão: o selo, o preço com desconto e o preço cheio riscado ("De R$ 209,90" para leitor de tela).
- Página do produto: o selo em linha acima do nome, o preço com desconto, o cheio riscado, as parcelas e o PIX
  calculados sobre o preço com desconto.
- Sacola e checkout: o item com o preço com desconto e o cheio riscado; o Total igual ao que o servidor cobra.
- Fora da vigência, nada disso aparece, mesmo com a peça marcada.
- Se a campanha acabar enquanto a cliente está na sacola ou no checkout, a loja mostra o total novo e pede que ela
  confirme de novo; nunca é cobrado um valor maior que o mostrado. Se a campanha começar nesse meio-tempo, a sacola
  passa a mostrar o preço com desconto na próxima vez que for aberta.

### UC-06 · A vitrine da campanha
- Uma página só, no endereço fixo **`/ofertas`** (Decisão D-01), com o nome da campanha no título ("Black Friday"), a linha "Peças
  com 10%, 15% e 20% de desconto até 30 de novembro." (percentuais e data lidos da campanha), a grade das peças
  marcadas e os chips "Todas · 10% · 15% · 20%" com a contagem.
- Filtros, ordenação e rolagem infinita são os da categoria (`CategoryPage`).
- A dona põe o link no menu pelo editor de menu (item de link). O menu não ganha item fixo.
- Durante a vigência, a página aparece no Google com o nome da campanha no título. Fora dela, diz que não há ofertas
  agora, leva às coleções e deixa de ser indexada — a troca acontece em até 5 minutos depois do início ou do fim.
- A categoria antiga "Black Friday", que veio da loja anterior e está desligada, continua desligada; o endereço
  /black-friday leva para /ofertas.

### UC-07 · O bloco "Joias em oferta" na Home
- Os cartões de percentual da campanha (um por percentual, levando à vitrine com o filtro) e uma fileira de peças em
  oferta. O título e os percentuais vêm da campanha em vigência; sem campanha em vigência, o bloco não aparece.
- É um bloco da Home que a dona acrescenta pela bandeja e liga. Entra neste item (Decisão D-04).

## Regras

- **RN-01 · A campanha é um cadastro, e a peça aponta para ela.** Uma tabela de campanhas (nome, texto do selo,
  início, fim, interruptor, percentuais) e a marcação da peça (peça, campanha, percentual), com chave por peça e
  campanha. O percentual marcado tem de ser um dos da campanha (conferido no banco, não só na tela). O preço
  cadastrado (`price`, `compare_price`) **nunca** é alterado pela campanha.
- **RN-02 · Uma campanha em vigência por vez.** Duas campanhas ligadas com vigências que se cruzam são recusadas no
  cadastro (e no banco). Assim a pergunta "qual o desconto desta peça agora?" tem uma resposta só. Campanhas
  encerradas e agendadas sem cruzamento convivem.
- **RN-03 · "Em vigência" tem um dono, em `core`, no horário de Brasília.** A mesma função decide para a loja, o
  checkout, as functions, o feed e o painel, com o relógio do servidor onde houver servidor e `STORE_TIME_ZONE`
  (`core/time/zone.ts`). O navegador da cliente nunca decide se a campanha está valendo.
- **RN-04 · Um dono do preço de campanha, em `core`.** A mesma função responde "quanto custa esta peça/variação
  agora" para o cartão, a página do produto, a sacola, o checkout, a function `checkout` (`unit_price`,
  `full_unit_price`), a function `mercado-pago` (que reprecifica pelo banco), o feed do Google e o JSON-LD. Uma tela
  calculando à parte daria um preço exibido e outro cobrado — o "defeito 01" no caminho do dinheiro. A função é
  alcançável pelo Deno (arquivo com `.ts` explícito, sem import de pacote). O pedido montado pela dona, no painel ou
  no app do ateliê, segue a mesma regra: durante a vigência, a peça marcada entra com o preço da campanha (a dona ainda
  pode dar um desconto combinado por cima), o cupom não vale para ela, e o preço fica travado na proposta como hoje.
- **RN-05 · O servidor cobra o desconto, e só em vigência.** O `mercado-pago` recalcula o preço pelo banco
  (`handlers.ts` ~578) e passa a aplicar a campanha pela função de RN-04, com o relógio dele. Pedido criado durante a
  vigência e pago depois do fim: vale o preço gravado no pedido (Decisão D-05); o `mercado-pago` não reprecifica um
  pedido já criado com campanha.
- **RN-06 · Desconto não soma com o "de/por".** Peça com `compare_price` maior que o preço: o preço cheio é o
  `compare_price`; o cobrado é o **menor** entre o preço de hoje e o cheio com o desconto da campanha. Nunca os dois
  descontos multiplicados. O preço com desconto é arredondado para o centavo mais próximo (meio centavo para cima), por unidade: 15%
  sobre R$ 199,90 é R$ 169,92. A loja, o servidor e o Google mostram o mesmo centavo.
- **RN-07 · O feed do Google acompanha.** `<g:price>` = o cheio, `<g:sale_price>` = o com desconto e
  `<g:sale_price_effective_date>` = a vigência, pela mesma regra de `offerPricing`. A página de destino mostra o
  mesmo número (preço divergente é motivo de reprovação no Merchant Center). `shoppingParity.test.ts` continua
  valendo.
- **RN-08 · A vitrine é derivada, nunca vinculada.** Ela lista as peças marcadas na campanha em vigência; não é uma
  linha em `categories` com vínculos gravados. O endereço é `/ofertas` (D-01), o mesmo para toda campanha, e entra
  nas listas de rotas
  (`ROUTE_SLUGS`, `NON_INDEXABLE_PATHS`/`SITEMAP_STATIC_PATHS`, `usePageMeta`, `api/page`, `reservedSlugRefusal`).
- **RN-09 · O pedido guarda o que foi cobrado.** `order_items.unit_price` (cobrado) e `full_unit_price` (cheio) já
  existem; a campanha e o percentual da linha são gravados junto. Campanha usada em pedido não é apagada.
- **RN-10 · Os filtros e a ordenação contam o preço com desconto.** Durante a vigência, a peça de campanha aparece em
  "Com desconto", entra na faixa de preço pelo preço com desconto e é ordenada por ele.
- **RN-11 · O texto do selo é o da campanha, e cabe.** O selo do cartão mostra o **texto do selo** em versalete e o
  percentual ("BLACK FRIDAY · −20%"). Medido no protótipo: "BLACK FRIDAY" (12 caracteres) cabe no cartão de 173 px ao
  lado do bloco do percentual; o teto de **14 caracteres** é o que cabe com folga. Nome maior que isso exige um
  texto do selo mais curto, e o painel mostra a prévia do selo em 173 px enquanto a dona digita.
- **RN-12 · As cores do selo são da campanha** (Decisão D-02). Duas cores, escolhidas no cadastro: a **cor da
  faixa** e a **cor de destaque**. O selo as usa cruzadas, como no protótipo: o texto da campanha sai na cor de
  destaque sobre a faixa, e o percentual sai na cor da faixa sobre o bloco de destaque. Por isso **um** número decide
  se o par serve: o contraste entre as duas cores, que tem de ser **≥ 4,5:1** (texto de 11–13 px). Par abaixo disso é
  recusado no cadastro com a razão medida ("3,2:1 — escolha cores com mais diferença"). A medida é a de
  `@estrelinha/core/color` (feature `34`), a mesma dos guardas. A campanha nasce com o preto #161514 e o ouro
  #C2A063 do protótipo (7,4:1). As cores do selo **não** dependem do perfil de estilo (WI 100).
- **RN-13 · O selo é a faixa do protótipo v2.** No pé da foto, 30 px; substitui o selo "−X%" de hoje (nunca dois
  selos na mesma foto); as miniaturas de cor (`ColorPreview`) sobem para 10–12 px acima da faixa, sem mudar de tamanho
  nem de quantidade por largura (1 + "+N" em 173 px, 2 + "+N" em 220). Em linha (página do produto, acima do nome;
  sacola, no lugar do chip de desconto): a mesma faixa em 26 px, cantos de 6 px. `alvoDeToqueNaoRoubaPosicao`,
  `cardSkeletonBox` e `accentText` continuam valendo. Durante a vigência, a peça de campanha mostra só a faixa da campanha: os selos do
  canto (desconto de hoje, Novo, Últimas, Destaque) não aparecem nela. Fora da campanha, o cartão volta a ser o de hoje.
- **RN-16 · Cupom não vale em peça de campanha** (Decisão D-03). Durante a vigência, a linha da sacola com peça
  marcada fica **fora da base do cupom**: o cupom de percentual ou de valor desconta só das outras linhas. Sacola só
  com peças de campanha ⇒ o cupom é recusado com o motivo ("Este cupom não vale para peças da Black Friday."; o nome
  vem da campanha). A regra mora em `resolveOrderPricing` (`packages/core/src/payment/pricing.ts`), que a loja e o
  `mercado-pago` chamam — é a primeira mudança desta campanha no código de dinheiro, e a suíte de `payment` ganha os
  casos sem perder nenhum. O que acompanha a regra (D-06):
  - o **PIX** continua valendo sobre o total, com peça de campanha ou não;
  - o **cupom de frete grátis** continua valendo: ele zera o frete, não desconta a peça;
  - o **valor mínimo** do cupom é conferido sobre as linhas que entram na base (sem as peças de campanha).
  - o **frete grátis por valor** conta a soma do que a cliente paga pelas peças, já com o desconto da campanha.
- **RN-17 · Promoção progressiva e Compre Junto também não descontam peça de campanha** (D-07). Durante a vigência,
  a peça marcada não conta para a faixa da promoção progressiva por quantidade (feature 17) e não recebe o desconto
  da compra casada (WI 92) — nem como principal, nem como adicional. As duas regras moram no mesmo código de preço
  (`resolveOrderPricing` e `core/buy-together`) e ganham o mesmo recorte do cupom. Na sacola, a frase da próxima faixa
  da promoção ("Falta 1 para…") e o desconto do conjunto passam a ignorar as peças de campanha, para a tela não
  prometer o que o servidor não dá. A oferta do checkout ("leve também") numa peça de campanha cobra o menor preço entre o da campanha e o da
  oferta, nunca os dois descontos somados.
- **RN-14 · Tom.** O selo diz o texto da campanha e o percentual; a vitrine diz até quando vale, por data ("até 30 de
  novembro"). Nada de contagem regressiva, "últimas horas" ou escassez — em nenhuma superfície da campanha.
- **RN-15 · Celular primeiro.** Selo inteiro no cartão de 173 px; fonte do sistema a 200 % sem cortar o percentual;
  nenhuma rolagem horizontal; a tela de campanhas do painel em 390 sem rolagem lateral.

## Fora

- Desconto por variação diferente do da peça.
- Desconto em valor (R$) em vez de percentual.
- Mudar como cupom, promoção progressiva e Compre Junto funcionam fora das peças de campanha (RN-16 e RN-17 só tiram
  as peças de campanha da base deles).
- Campanha por categoria inteira (marcar a categoria em vez das peças).
- O perfil de cores (WI 100) e a faixa de avisos (WI 101) ligarem sozinhos com a campanha (podem seguir a vigência
  depois).

## Critérios de aceite

- **CA-01** Cadastrar "Black Friday", 13/11 00:00 a 30/11 23:59, percentuais 10, 15, 20, ligada ⇒ a lista mostra
  "Em vigência"; o cadastro da peça mostra "Black Friday: Nenhum · 10% · 15% · 20%".
- **CA-02** Recusas do cadastro: fim antes do início, percentual 0 ou 80, percentual repetido, nenhum percentual,
  vigência cruzando outra campanha ligada, texto do selo acima de 14 caracteres — cada uma com o motivo, nada gravado.
- **CA-03** Marcar 20% numa peça de R$ 209,90, em vigência ⇒ cartão, página do produto, sacola e checkout mostram
  R$ 167,92 com R$ 209,90 riscado e o selo "BLACK FRIDAY · −20%"; o servidor cobra R$ 167,92 (antes de PIX, cupom e
  frete).
- **CA-04** A mesma peça antes do início e depois do fim: preço de sempre, sem selo, fora da vitrine — na loja e no
  servidor.
- **CA-05** Peça com variações de preços diferentes: cada variação aparece e é cobrada com o percentual sobre o
  próprio preço.
- **CA-06** Peça com `compare_price` R$ 259,90 e preço R$ 239,90, marcada com 10%: cobra R$ 233,91 (o menor), "de"
  R$ 259,90; nunca R$ 215,91.
- **CA-07** Tirar da campanha (ou encerrar a campanha) devolve o preço de sempre em todas as superfícies, e
  `price`/`compare_price` no banco são os mesmos de antes.
- **CA-08** Tirar o percentual 15% da campanha com peças marcadas em 15% é recusado com a contagem.
- **CA-09** A vitrine lista exatamente as peças marcadas e ativas da campanha em vigência, com os chips de cada
  percentual e a contagem; sem campanha em vigência, diz que não há ofertas, tem `noindex` e não entra no sitemap.
- **CA-10** O feed traz `sale_price` igual ao preço da página e `sale_price_effective_date` igual à vigência, para cada
  variação de peça marcada.
- **CA-11** Cartão com miniaturas de cor e selo: as miniaturas ficam acima da faixa, sem sobrepor; tocar numa
  miniatura continua trocando a foto sem navegar.
- **CA-12** Uma campanha com outro nome ("Dia das Mães", texto do selo "DIA DAS MÃES") mostra esse texto no selo, na
  vitrine e no bloco da Home, sem mudança de código.
- **CA-13** Um pedido feito com a peça marcada guarda o preço cobrado, o cheio, a campanha e o percentual; encerrar
  a campanha depois não muda o pedido.
- **CA-14** O selo usa as duas cores da campanha (cruzadas: texto na cor de destaque sobre a faixa, percentual na
  cor da faixa sobre o destaque); um par abaixo de 4,5:1 é recusado no cadastro com a razão medida; sem escolha, sai
  preto #161514 e ouro #C2A063. O selo não usa nenhuma cor da paleta da loja: muda a paleta, o selo continua igual.
- **CA-16** Sacola com uma peça de campanha (R$ 167,92) e uma peça comum (R$ 100,00), cupom de 10%: o cupom desconta
  R$ 10,00 (só da comum); a loja e o servidor dão o mesmo total. Sacola só com peças de campanha: o cupom é recusado
  com o motivo. Cupom de frete grátis continua zerando o frete. O PIX de 5% vale sobre o total.
- **CA-17** Promoção progressiva "3 peças da categoria por R$ X" com duas peças comuns e uma de campanha na sacola: a
  faixa não é alcançada (a de campanha não conta) e a sacola não promete o preço da faixa. Conjunto do Compre Junto
  com uma peça de campanha: o desconto do conjunto não vale para ela, na sacola e no servidor.
- **CA-15** Em 390×844 e 1440×900: o selo inteiro nos cartões de 173 e 220 px, sem rolagem horizontal; fonte a 200 %
  sem cortar o percentual; a tela de campanhas do painel sem rolagem lateral em 390.

## Plano técnico (para a spec)

| Peça | Onde | Nota |
| --- | --- | --- |
| Campanhas e marcações | duas tabelas novas (campanhas; peça × campanha × percentual) | `check` dos tetos, recusa de vigência cruzada no banco, RLS de admin para escrita e leitura pública só do que a loja precisa; tipos provados por probe (`AD-012`) |
| A regra | `packages/core/src/campaigns/` (novo) | "em vigência", preço de campanha, recusas do cadastro; folhas alcançáveis pelo Deno |
| Preço | `payment/pricing.ts`, `shopping/pricing.ts` | chamam a regra; `resolveOrderPricing` tira as linhas de campanha da base do cupom (RN-16); a suíte de `payment` ganha casos e não perde nenhum |
| Cores do selo | `@estrelinha/core/color` | a recusa do par sem contraste, chamada pelo painel e por um `check`/teste de schema |
| O servidor | `supabase/functions/checkout`, `supabase/functions/mercado-pago` | `wiringResolve` e os testes de handler |
| Cartão e selo | `entities/product/ui/ProductCard.tsx`, `ColorPreview.tsx` | o selo do protótipo com o texto e as duas cores da campanha |
| Página do produto e sacola | `ProductInfo`, `widgets/product-buy-bar`, `widgets/cart-drawer` | o selo em linha |
| Vitrine | rota fixa + a mesma `CategoryPage` alimentada pela regra | guardas de rota e de sitemap |
| Painel | `/admin/campanhas` (grupo Descontos); aba de preço do produto; `features/bulk-edit`; lista de produtos | `navItems`, `focusRoutes`, `rotasSobGuarda`, `animacaoRespeitaMovimento` |
| Home | bloco "Joias em oferta" | tipo novo no catálogo da Home (D-04) |

## Decisões

Respondidas pelo usuário no chat, em 2026-11-13.

- **D-01 · A vitrine mora em `/ofertas`**, fixo, mostrando a campanha em vigência com o nome dela no título. Um
  endereço por campanha disputaria o espaço de nomes das categorias, que moram na raiz.
- **D-02 · As cores do selo são personalizáveis por campanha** ("Podemos personalizar cores"). Desenho em RN-12:
  duas cores, contraste ≥ 4,5:1 entre elas, preto e ouro como padrão.
- **D-03 · Cupom não vale em peça de campanha** ("em peças de campanha não aplica cupom"). Regra em RN-16.
- **D-04 · O bloco "Joias em oferta" da Home entra neste item** (UC-07).
- **D-05 · PIX gerado na vigência e pago depois do fim: vale o preço gravado no pedido** (RN-05).
- **D-06 · O que acompanha a regra do cupom** (usuário, 2026-11-13, pela recomendação): o PIX continua valendo sobre
  o total; o cupom de frete grátis continua zerando o frete; o valor mínimo do cupom conta só as peças comuns (RN-16).
- **D-07 · Promoção progressiva e Compre Junto seguem a regra do cupom** (usuário, 2026-11-13, pela recomendação): a
  peça de campanha fica fora da base dos dois descontos (RN-17).

## Perguntas em aberto

Nenhuma.

---
Fonte: escrito na sessão de 2026-11-13 a partir do pedido do usuário e da decisão sobre o cadastro de campanhas, dos
protótipos `Black Friday - Selo.html`, `Black Friday - Selo v2.html` e `Black Friday - Home.html`, e da leitura de
`navItems.ts`, `ProductCard.tsx`, `ColorPreview.tsx`, `shopping/pricing.ts`, `payment/pricing.ts`, `promotion.ts`,
`time/zone.ts`, `checkout/handlers.ts` e `mercado-pago/handlers.ts`.

## Histórico de revisões

- r1 · 2026-11-13 · arredondamento-do-preco-de-campanha, ca-14-depende-do-wi-100, campanha-acaba-entre-a-sacola-e-o-pagamento, categoria-black-friday-da-nuvemshop, estado-desligada-e-encerrada, faixa-de-preco-e-ordenacao-pelo-preco-de-campanha, frete-gratis-pela-soma-com-desconto, mais-de-uma-campanha-no-cadastro-da-peca, ofertas-titulo-e-indexacao-mudam-com-a-campanha, order-bump-em-peca-de-campanha, pedido-montado-pelo-painel-e-a-campanha, selo-da-campanha-e-os-selos-do-topo
