> Gerado pela descoberta e ratificado no gate em 2026-11-02.

# Compre junto na página do produto

## Problema
A cliente que compra um pingente afetivo muitas vezes precisa de uma corrente para usá-lo, ou quer
uma segunda peça. Hoje a página do produto não oferece nada disso: a única sugestão é "Você também
vai curtir", tirada da mesma coleção. A curadoria "Compre junto" que a dona já preenche no painel não
aparece em lugar nenhum da loja.

## Objetivo
Aumentar o ticket médio com a oferta, na página do produto, de até três peças que completam a
principal (por exemplo, a corrente para o pingente). A cliente escolhe modelo e variação de cada uma
sem sair da página e leva tudo à sacola num gesto só. O tom é de cuidado: sem pressa nem pressão.

## Usuários e papéis
- **Cliente da loja** (visitante, convidada ou com conta): vê o bloco, monta o conjunto, adiciona à sacola.
- **Dona do ateliê** (admin do painel): monta listas reutilizáveis de peças, define por produto quais adicionais aparecem, em que ordem e com quais opções, e acompanha a adesão.

## Escopo
### Dentro
- **Listas do Compre Junto**: a dona cria listas nomeadas e reutilizáveis de peças (ex.: "Correntes", "Pingentes adicionais"), ordena as peças uma vez e escolhe, por peça, quais variações valem.
- Configurar no painel, por produto principal, até 3 adicionais.
- Cada adicional pode ser:
  - (a) um produto só, com as variações que a dona libera;
  - (b) uma lista do Compre Junto, da qual a cliente escolhe uma peça, e a variação dela.
- O adicional não tem título próprio: a loja mostra o nome da lista (num adicional do tipo lista) ou o nome do produto (num adicional do tipo produto). O nome da lista é, portanto, visto pela cliente.
- O "Compre junto" que o painel já grava hoje é substituído pelo modelo novo, com o que estiver gravado convertido.
- Mostrar o bloco na página do produto, no celular e no computador. A página tem um único botão de compra. Sem adicional marcado, ele diz "Adicionar à sacola" e leva só o principal, como hoje. Com adicionais marcados, o mesmo botão passa a dizer "Levar o conjunto" e leva o principal e os adicionais marcados. No celular esse botão é o da barra fixa do rodapé, que reflete o que está marcado no bloco; no computador, o da coluna de informação. O bloco fica na coluna de informação, entre a escolha da variação do principal e o botão de compra.
- A cliente marca ou desmarca cada adicional, escolhe a peça (no caso b), a variação e, se a peça tiver, a gravação, e vê o total do conjunto, com o preço no PIX ao lado.
- Um gesto adiciona o principal e os adicionais marcados à sacola, cada um como linha própria.
- A sacola e o pedido mostram que a peça acompanha o principal ("acompanha o Pingente X").
- Relatório de adesão ao Compre Junto no painel.
- Produto, variação ou lista indisponível some do bloco sem quebrar a página.
- Medir exibição, escolha e adição do bloco no GA4.
### Fora
- **Desconto da compra casada**: vai ao Work Item 92 ("Desconto da compra casada"). Decidido no gate da descoberta, para o 92: percentual por adicional, sobre o preço da peça adicional quando o principal está no mesmo pedido; segue `AD-015` (concorre por item com order bump e promoção progressiva — vence o menor preço —, concorre com o cupom pelo menor total, e o PIX incide depois); vale pela presença do principal e do adicional no mesmo pedido, decidida pelo servidor, nunca pela marca de origem.
- Compre junto no card da vitrine, na gaveta da sacola e no checkout (o bloco mora só na página do produto).
- O pedido montado pelo painel (feature 89).
- Recomendação automática ("quem comprou também levou").
- **Combinar o acabamento** (sugerir no adicional o mesmo acabamento do principal): vai a um Work Item próprio (93), decidido no PRD Tech Review r1. O catálogo guarda o acabamento em eixos e grafias diferentes, e as correntes são peças separadas por acabamento; a regra de "mesmo acabamento" é decisão de produto que ainda não existe.
- Aviso no painel quando o produto principal já tem a corrente como variação: fica por curadoria da dona, sem aviso.
- O order bump do checkout e o "Complete o frete grátis" seguem como estão, convivendo com o Compre Junto.

## Casos de uso
### UC-01 · A dona monta as listas do Compre Junto
Numa tela própria do painel, a dona cria uma lista com um nome (ex.: "Correntes"), acrescenta peças, ordena-as e, em cada peça, escolhe quais variações valem.
**Critérios de aceite**
- CA-01.1 A lista tem nome obrigatório e pelo menos uma peça para ser usada por um adicional. O nome da lista é o que a cliente lê no bloco da loja [pedido; conhecimento; ajuste do usuário em 2026-11-02]
- CA-01.2 A dona reordena as peças da lista arrastando ou com "mover para cima/baixo", e a loja mostra a nova ordem [pedido; código: editor de Produtos em destaque, `apps/backoffice/CLAUDE.md` › feature 50]
- CA-01.3 Em cada peça da lista, a dona escolhe quais variações valem; nenhuma marcada vale todas as ativas [pedido ("e suas variantes"); gate Q-07]
- CA-01.4 Uma lista mostra em quantos produtos ela está em uso; editar a lista muda o bloco de todos eles [conhecimento]
- CA-01.5 Uma peça da lista que saiu do ar aparece marcada no painel ("saiu do ar") e é pulada pela loja [código: `apps/backoffice/CLAUDE.md` › "A vaga que sobra fica VAZIA, e o painel AVISA"]
- CA-01.7 Uma lista em uso não pode ser apagada. O painel diz em quais produtos ela está, e a dona a tira desses produtos antes de apagar. [PRD Tech Review r1]
- CA-01.6 A lista não vira vitrine nem página da loja: ela só existe dentro do Compre Junto [código: `AD-014`, `apps/store/CLAUDE.md:204-207`]

### UC-02 · A dona monta o Compre Junto de um produto
Na tela do produto no painel, a dona acrescenta até três adicionais. Para cada um ela escolhe um produto (e quais variações dele valem) ou uma lista do Compre Junto e grava.
**Critérios de aceite**
- CA-02.1 O painel permite no máximo 3 adicionais por produto. A 4ª tentativa é recusada com o motivo escrito, não com um botão apagado [pedido; código: `packages/core/src/home/featured.ts:46-62` como molde de recusa]
- CA-02.2 Um adicional do tipo "produto" guarda um produto e as variações dele que a dona liberou; nenhuma marcada vale todas as ativas [pedido; gate Q-07]
- CA-02.3 Um adicional do tipo "lista" aponta para uma lista do Compre Junto [gate Q-02]
- CA-02.4 A dona ordena os adicionais do produto [pedido]
- CA-02.5 O próprio produto principal não pode ser escolhido como adicional; um produto já escolhido aparece desabilitado com o motivo [código: `apps/backoffice/src/features/product-form/ui/RelatedProductsSelect.tsx:42-46`]
- CA-02.6 Gravar o produto não apaga nem altera o Compre Junto de outro produto [conhecimento]
- CA-02.7 Um adicional que aponta para produto inativo ou apagado aparece marcado no painel ("saiu do ar") e é pulado pela loja [código: `apps/backoffice/CLAUDE.md` › "A vaga que sobra fica VAZIA, e o painel AVISA"]
- CA-02.9 Em cada adicional, a dona pode marcar em quais variações do principal ele some (ex.: some quando a cliente escolhe "Chaveiro") [PRD Tech Review r1]
- CA-02.8 O Compre Junto antigo do produto (a lista simples que o painel grava hoje) é convertido: cada peça vira um adicional do tipo "produto", até 3, antes de a forma antiga deixar de existir [gate Q-03; código: `AdminProductFormPage.tsx:1052-1054`]

### UC-03 · A cliente vê e monta o conjunto na página do produto
Na coluna de informação, entre a escolha da variação do principal e o botão de compra, a cliente vê os adicionais com foto, o nome da lista ou do produto, e o preço. Ela marca os que quer e, num adicional do tipo lista, escolhe qual peça. Em peça com variações, escolhe a variação. O total do conjunto acompanha cada escolha.
**Critérios de aceite**
- CA-03.1 O bloco só aparece quando o produto tem ao menos um adicional disponível para a variação escolhida do principal [conhecimento; PRD Tech Review r1]
- CA-03.2 Nenhum adicional vem marcado ao abrir a página [gate P-03]
- CA-03.3 O conjunto usa a variação do principal já escolhida na página; o bloco não repete o seletor do principal [gate P-07; código: `useProductPurchase.tsx:55-62`]
- CA-03.4 O total mostra o preço do principal (da variação escolhida) somado ao dos adicionais marcados, cada um pelo preço da variação escolhida, nunca pelo "a partir de". O total do conjunto conta o principal na quantidade escolhida e cada adicional marcado uma vez. [código: `apps/store/src/entities/product/model/useProductPurchase.tsx:90-92`; PRD Tech Review r1]
- CA-03.5 Ao lado do total, o preço do conjunto no PIX, pela mesma regra de desconto PIX da página [gate Q-12; código: `@estrelinha/core/payment/pix`]
- CA-03.6 Um adicional com variações não pode ser incluído sem a variação escolhida; o bloco diz qual escolha falta [código: `apps/store/src/widgets/cart-drawer/ui/CrossSell.tsx:18-24`]
- CA-03.7 Num adicional do tipo lista, as peças aparecem na ordem da dona e a cliente escolhe exatamente uma. Na página de um produto, uma lista nunca oferece o próprio produto principal, nem uma peça que já aparece em outro adicional desse produto. Essas peças são puladas só ali; a lista continua igual nos outros produtos. [pedido; gate P-08; PRD Tech Review r1]
- CA-03.8 Variação esgotada não pode ser escolhida; peça sem nenhuma variação vendável não aparece na lista [código: `useProductPurchase.tsx:101-105`]
- CA-03.10 Adicional com gravação pede o texto dentro do bloco, com o mesmo campo e o mesmo limite da página; adicional que exige material entra normalmente, e o material segue o pós-compra de hoje [gate Q-11]
- CA-03.11 Em 390px o bloco não cria rolagem horizontal da página, e cada controle tem alvo de toque de pelo menos 44px [código: `CLAUDE.md:306-321`; `apps/store/CLAUDE.md:43-50`]
- CA-03.12 Os textos do bloco não usam urgência, contagem, escassez nem prova social [código: `CLAUDE.md:8`, `CLAUDE.md:365`]
- CA-03.13 Se o adicional exige material da cliente, o bloco não diz qual material [código: `semMaterialNaPaginaDoProduto.test.ts`, `apps/store/CLAUDE.md:848-866`]

### UC-04 · A cliente leva o conjunto à sacola
Com adicionais marcados, o botão de compra da página — a barra fixa no celular, o da coluna de informação no computador — diz "Levar o conjunto" e adiciona o principal e os adicionais marcados; a gaveta da sacola abre mostrando as linhas.
**Critérios de aceite**
- CA-04.1 Cada peça entra como linha própria, com a sua variação e a sua gravação, e cada adicional entra com quantidade 1, qualquer que seja a quantidade do principal; a cliente ajusta na sacola. Uma peça levada pelo conjunto que já estiver na sacola, na mesma variação e gravação, soma à linha existente, e essa linha passa a dizer que acompanha o principal. Se acompanhar mais de um principal, a linha diz "acompanha o Pingente X e o Pingente Y". [código: `apps/store/src/entities/cart/model/cartStore.ts:104-134`; gate Q-08; PRD Tech Review r1]
- CA-04.2 A sacola abre depois de adicionar, como já acontece com o botão da página [código: `useProductPurchase.tsx:152-156`]
- CA-04.3 Se a gravação do principal ou de um adicional for recusada (limite de caracteres), nada é adicionado e a recusa é mostrada junto do campo [código: `useProductPurchase.tsx:116-122`]
- CA-04.4 Uma linha do conjunto removida da sacola não remove as outras [conhecimento]
- CA-04.5 O pedido feito com o conjunto entra na fila de material se qualquer peça exige material [código: `packages/core/src/material/material.ts:251-254`]
- CA-04.6 O valor cobrado no pagamento é igual ao total mostrado na sacola e no checkout [código: `apps/store/src/features/checkout/model/useCheckoutTotals.ts:1-26`]
- CA-04.8 Enquanto o principal não pode ser comprado (combinação indisponível), o bloco continua visível, mas o botão do conjunto fica bloqueado com o mesmo aviso da página. Se o produto inteiro estiver esgotado, o bloco não aparece. O bloco nunca leva adicionais sem o principal. [PRD Tech Review r1]
- CA-04.7 A sacola de quem já tinha peças antes desta mudança continua intacta [código: `cartStore.ts:169-190` (`version` + `migrate`); `CLAUDE.md` › chaves de `localStorage`]

### UC-05 · A sacola e o pedido mostram o que foi comprado junto
**Critérios de aceite**
- CA-05.1 Na sacola, a linha do adicional diz "acompanha o <nome do principal>" [gate Q-09]
- CA-05.2 No pedido (confirmação, Minha Conta e painel), o item adicional diz que acompanha o principal [gate Q-09]
- CA-05.3 Removido o principal da sacola, os adicionais continuam na sacola como peças comuns, sem a frase "acompanha" [conhecimento]
- CA-05.4 A marca "acompanha" é informativa: ela não muda preço nem desconto [código: `supabase/functions/checkout/handlers.ts:432-435` — a linha do pedido vem do navegador]

### UC-06 · A dona acompanha a adesão ao Compre Junto
Uma tela do painel mostra como o Compre Junto está sendo usado.
**Critérios de aceite**
- CA-06.1 Num período escolhido, o relatório mostra quantos pedidos tiveram peças compradas junto, quantas peças adicionais foram vendidas e o valor delas. Uma peça conta como "comprada junto" quando entrou na sacola pelo bloco do Compre Junto e o principal dela está no mesmo pedido. O pedido guarda, no momento da compra, de qual principal e de qual lista a peça veio, e editar a lista depois não muda o relatório. [gate Q-09; conhecimento; PRD Tech Review r1]
- CA-06.2 O relatório abre por produto principal e por lista, mostrando quais adicionais mais saem [gate Q-09; conhecimento]
- CA-06.3 Conta só pedidos pagos e não cancelados, pela mesma régua de venda do Dashboard [código: `AD-055`]

### UC-07 · O bloco se adapta à indisponibilidade
**Critérios de aceite**
- CA-07.1 Adicional cuja peça saiu do ar ou esgotou some do bloco; os outros continuam. Numa lista, só a peça indisponível some [conhecimento]
- CA-07.2 Se nenhum adicional estiver disponível, o bloco inteiro some e a página fica como hoje [conhecimento]
- CA-07.3 Se a leitura dos adicionais falhar, o bloco não aparece e o resto da página continua de pé [código: `apps/store/CLAUDE.md:635-638`, DST-17]

### UC-08 · Medição
**Critérios de aceite**
- CA-08.1 Ver o bloco gera uma exibição de lista própria e escolher um adicional gera seleção de item, com um identificador de lista do Compre Junto [código: `packages/core/src/analytics/events.ts:76-99`]
- CA-08.2 Adicionar o conjunto conta cada peça com a quantidade certa, sem contar o principal duas vezes [código: `useProductPurchase.tsx:144-150`]

## Requisitos não-funcionais
- RNF-01 Mobile primeiro: prova em 390×844 antes de 1440, sem rolagem horizontal do body [código: `CLAUDE.md:306-321`]
- RNF-02 Os produtos dos adicionais chegam numa consulta só e não atrasam a primeira pintura da página; enquanto carregam, o espaço do bloco fica reservado (sem salto) [código: `apps/store/CLAUDE.md` › "A home não salta" (feature 40); conhecimento]
- RNF-03 O preço anunciado ao Google (feed e JSON-LD) não muda por causa do Compre Junto [código: `packages/core/CLAUDE.md:119-121`]
- RNF-04 Exibido = cobrado: o total do bloco é a soma dos preços que cada peça terá na sacola, e o preço no PIX segue a mesma conta de exibição da página. Os descontos do pedido (promoção, cupom, frete) só aparecem na sacola e no checkout, e o valor cobrado é o total mostrado ali. [código: `packages/core/src/payment/pix.ts`; PRD Tech Review r1]
- RNF-05 Movimento do bloco respeita `prefers-reduced-motion` [código: `apps/backoffice/CLAUDE.md` › "O movimento do painel"; conhecimento]
- RNF-06 Acessível por teclado e leitor de tela: cada adicional é um controle marcável com nome que inclui a peça e a variação [conhecimento]
- RNF-07 Configuração gravável só pela dona; leitura pública só do que está ativo [código: `supabase/CLAUDE.md:113-135`]

## Expectativas de UI/UX
- Claude Design, projeto "Uma Estrelinha - Backoffice" (`e3957c10-bd49-4f3d-9256-04d72a7d0f41`): as listas do Compre Junto, o Compre Junto no formulário do produto e o relatório de adesão — a desenhar.
- Claude Design, projeto novo da loja, a criar: o bloco na página do produto (390 e 1440) e a frase "acompanha" na sacola.

## Cenários preliminares
| Cenário | Tipo | Risco |
| --- | --- | --- |
| Pingente com corrente escolhida da lista, numa variação, adicionado à sacola em 390px | happy_path | P0 |
| Total mostrado na sacola e no checkout igual ao cobrado pelo Mercado Pago, com PIX | happy_path | P0 |
| Adicional com variações sem variação escolhida | erro | P0 |
| Cliente forja no corpo do pedido a marca "acompanha" ou um preço | seguranca | P0 |
| Sacola de antes da mudança abre intacta depois do deploy | borda | P0 |
| Adicional esgotado ou inativo some; todos indisponíveis, o bloco some | borda | P1 |
| Principal com gravação recusada impede o conjunto | erro | P1 |
| Adicional com gravação: o texto vai à linha certa da sacola | happy_path | P1 |
| Celular: a cliente marca a corrente e toca a barra fixa; a sacola recebe o que o botão promete | happy_path | P0 |
| Principal com "Chaveiro" escolhido: o adicional de corrente marcado para sumir não aparece | alternativo | P1 |
| Combinação do principal indisponível: o bloco aparece e o botão fica bloqueado com o aviso da página | erro | P1 |
| Corrente já na sacola avulsa e a mesma corrente levada pelo conjunto: uma linha, "acompanha" | borda | P1 |
| Lista que contém o próprio principal, aberta na página dele: a peça é pulada | borda | P1 |
| Apagar uma lista em uso é recusado com os produtos nomeados | erro | P2 |
| Adicional que exige material + principal que exige material: pedido na fila, confirmação clara | borda | P1 |
| Produto principal com quantidade > 1 e o conjunto | borda | P1 |
| Lista reordenada no painel aparece na nova ordem em todos os produtos que a usam | alternativo | P1 |
| Removido o principal da sacola, o adicional fica sem a frase "acompanha" | borda | P1 |
| Leitura dos adicionais falha: página de pé, sem bloco | erro | P1 |
| Bloco com 3 adicionais e nomes longos em 390px e fonte a 200 % | borda | P1 |
| Relatório de adesão conta só pedidos pagos e não cancelados | happy_path | P1 |
| Página do produto não salta enquanto os adicionais carregam | performance | P2 |
| Eventos do GA4 do bloco sem duplicar `add_to_cart` | alternativo | P2 |

## Histórico de revisões
| Data | O quê |
| ---- | ----- |
| 2026-11-02 | Rascunho da descoberta (`wi-discovery`) |
| 2026-11-02 | Gate da descoberta: 14 perguntas e 5 premissas aplicadas (Q-01 corta o desconto para o WI 92; Q-02 listas reutilizáveis; Q-09 marca "acompanha" e relatório de adesão; Q-12 os três diferenciais — combinar o acabamento saiu no r1) |
| 2026-11-02 | r1 · PRD Tech Review · cta-do-conjunto-x-barra-fixa-do-celular, combinar-acabamento-sem-base-no-catalogo, botao-do-conjunto-com-principal-indisponivel, lista-oferece-o-proprio-principal, identidade-da-linha-acompanha-na-sacola, definicao-de-comprado-junto-no-relatorio, adicional-irrelevante-para-variacao-chaveiro, total-do-conjunto-com-quantidade-do-principal, apagar-lista-em-uso, rnf-04-promete-mais-que-o-bloco-calcula |
| 2026-11-02 | Ajuste do usuário (pós-r1): o adicional não tem título próprio; a loja mostra o nome da lista ou o nome do produto |
