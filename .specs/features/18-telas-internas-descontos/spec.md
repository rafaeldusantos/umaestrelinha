# 18 — Telas internas de Descontos

Converte os dois editores do grupo **Descontos** de modal para **tela em rota própria**, padroniza a
listagem de cupons com a de promoções, e dá ao cupom as duas ações de linha que a promoção já tem
(pausar e duplicar).

Boards do Paper (arquivo `Nanita`, página `Backoffice`):
`Promoção — tela interna (/admin/promocoes/nova)` · `Cupom — tela interna (/admin/cupons/novo)` ·
`Cupons — listagem padronizada (/admin/cupons)`.

## Por quê

**A modal de promoção não cabia mais.** Nome, tipo, escopo com chips de categoria, repetidor de
faixas com prévia por linha, vigência e três chaves — dentro de um `DialogContent max-w-3xl` que
rola por dentro. Duas consequências mediram isso na tela rodando: a vigência e as chaves brigaram
por espaço em duas colunas que se sobrepunham, e o repetidor de faixas — a parte que exige
comparar linhas — ficou com menos altura útil que a lista de categorias.

**Cupom e promoção são as duas metades do mesmo grupo, e não se pareciam.** Mesmo dado (desconto
com vigência e status), duas linguagens: "Validade / Sem prazo" contra "Vigência / Sem fim",
`Expirado` e `Esgotado` no mesmo vermelho, três métricas calculadas e nunca renderizadas
(`AdminCouponsPage`, `stats`), e nenhuma forma de pausar um cupom sem abrir o formulário.

**Data no backoffice era `<input type="date">`.** O calendário nativo muda de forma, de idioma e de
ordem de campos entre navegadores; `AdminOrdersPage` já usava `Popover` + `Calendar` desde a feature
07, e as telas de Descontos não.

## Escopo

Dentro: as duas telas de formulário, a listagem de cupons, o campo de data compartilhado, e as ações
de pausar/duplicar cupom. Fora: qualquer mudança na regra de preço (`@nanapin/core/payment/pricing`),
no `create-payment`, ou na loja. Nenhuma migration nova — as duas tabelas já têm todas as colunas
usadas aqui.

## Requisitos

### DSC-01 — A promoção é uma tela, não uma modal

**User Story:** Como dona da loja, quero cadastrar e editar promoção numa tela inteira, para
enxergar as faixas e a vigência ao mesmo tempo sem rolar dentro de uma janela.

#### Acceptance Criteria

1. WHEN acesso `/admin/promocoes/nova` THEN o sistema SHALL renderizar o formulário de promoção em
   tela cheia (sem `Dialog`), com o cabeçalho de DSC-03 e o corpo de DSC-04.
2. WHEN acesso `/admin/promocoes/:id/editar` de uma promoção existente THEN o sistema SHALL carregar
   nome, escopo, categorias, faixas, vigência e as três chaves da promoção daquele `id`.
3. WHEN acesso `/admin/promocoes/:id/editar` com um `id` que não existe THEN o sistema SHALL mostrar
   "Promoção não encontrada" com um caminho de volta à listagem — e NÃO SHALL renderizar um
   formulário vazio (que salvaria como promoção nova).
4. WHEN clico em `Nova promoção` ou em `Editar` na listagem THEN o sistema SHALL navegar para a rota
   correspondente — nenhuma modal de promoção SHALL sobrar no código.
5. WHEN o save é confirmado pelo banco THEN o sistema SHALL navegar de volta para
   `/admin/promocoes`; WHEN o save falha THEN SHALL permanecer na tela com o que foi digitado.
6. AS ACs de PRM-02 a PRM-08 (escopo, faixas, prévia, chaves, vigência, save por uma RPC) SHALL
   continuar valendo palavra por palavra — a conversão é de moldura, não de regra.

### DSC-02 — O cupom é uma tela, não uma modal

**User Story:** Como dona da loja, quero cadastrar cupom na mesma moldura da promoção, para não
aprender duas telas para a mesma decisão.

#### Acceptance Criteria

1. WHEN acesso `/admin/cupons/novo` THEN o sistema SHALL renderizar o formulário de cupom em tela
   cheia, com o mesmo cabeçalho e a mesma divisão de corpo da tela de promoção.
2. WHEN acesso `/admin/cupons/:id/editar` THEN o sistema SHALL carregar os campos gravados daquele
   cupom; `id` inexistente SHALL mostrar "Cupom não encontrado" com volta à listagem.
3. THE tela SHALL organizar os campos em cards nomeados: `Identidade` (código, descrição) e
   `Desconto` (tipo, valor, pedido mínimo) na coluna principal; `Vigência`, `Uso` (limite de usos,
   `Ativo`, `Apenas primeiro pedido`) e `A cliente vê` no aside.
4. WHEN o tipo é `Frete grátis` THEN o campo de valor SHALL ficar desabilitado e o payload SHALL
   gravar `value: 0`.
5. WHEN o código digitado tem menos de 2 caracteres THEN o save SHALL ser recusado no campo, sem
   chamar o banco.
6. THE campo de código SHALL gravar sempre em maiúsculas.
7. WHEN o save é confirmado THEN SHALL navegar para `/admin/cupons`; WHEN falha, SHALL permanecer na
   tela avisando o erro.

### DSC-03 — Um cabeçalho, duas telas

**User Story:** Como dona da loja, quero saber onde estou, se tenho alteração pendente e como salvo
— igual nas duas telas.

#### Acceptance Criteria

1. THE cabeçalho SHALL mostrar a trilha `Descontos / <listagem> / <registro>`, em que o segmento da
   listagem é um link de volta.
2. THE título SHALL ser o nome do registro em edição, ou `Nova promoção` / `Novo cupom` na criação.
3. WHEN há alteração não salva THEN o cabeçalho SHALL mostrar o selo `Alterações não salvas`; sem
   alteração, o selo NÃO SHALL aparecer.
4. THE cabeçalho SHALL oferecer `Cancelar` (volta à listagem) e o botão primário de salvar, com o
   atalho `⌘S` / `Ctrl+S` anunciado no botão.
5. WHEN pressiono `⌘S` / `Ctrl+S` THEN o sistema SHALL submeter o formulário e SHALL impedir o
   "salvar página" do navegador.
6. WHILE o save está em curso THEN os dois botões SHALL ficar desabilitados.

### DSC-04 — Duas faixas de corpo

#### Acceptance Criteria

1. THE corpo SHALL ter uma coluna principal (cards de decisão) e um aside de largura fixa (contexto
   e chaves), lado a lado a partir de `lg` e empilhados abaixo disso.
2. THE tela de promoção SHALL organizar a coluna principal em `Identidade`, `Vale para` e `Faixas`,
   e o aside em `Vigência`, `Comportamento` (as três chaves) e `Na loja vai aparecer`.
3. THE card `Na loja vai aparecer` SHALL exibir a frase que a loja mostraria para a faixa de **maior
   quantidade** entre as válidas (`"Escolha 5, pague R$ 23"`), o preço por unidade e quanto a cliente
   economiza; sem faixa válida ou sem escopo, SHALL dizer o que falta em vez de inventar número.
   A faixa é escolhida pela quantidade e não pela posição da linha: é a maior promessa da regra, e o
   repetidor não obriga a preencher em ordem.
4. THE aside SHALL informar para quantos produtos a regra passa a valer ao salvar.

### DSC-05 — Data no backoffice é calendário

**User Story:** Como dona da loja, quero escolher data num calendário em português, para não digitar
no formato que cada navegador resolveu pedir.

#### Acceptance Criteria

1. THE quatro campos de data das telas de Descontos SHALL usar um seletor de calendário
   (`Popover` + `Calendar`), e NÃO `<input type="date">`.
2. THE calendário SHALL estar em pt-BR (nomes de mês e de dia em português) e o campo SHALL exibir a
   data escolhida como `dd/MM/yyyy`.
3. WHEN nenhuma data está escolhida THEN o campo SHALL mostrar o texto de vazio informado
   (`Vale desde já` / `Sem fim`), e NÃO uma data de hoje implícita.
4. WHEN há data escolhida THEN o campo SHALL oferecer limpar, e limpar SHALL gravar nulo.
5. THE ida e a volta entre o dia escolhido e o ISO gravado SHALL usar a MESMA referência (meia-noite
   local), em **um** módulo só: uma vigência escolhida como `30/09` SHALL ser lida e exibida como
   `30/09` em qualquer fuso. Hoje há dois leitores divergentes do mesmo dado — a promoção usa os
   componentes locais e o cupom corta a string ISO (`slice(0,10)`, componentes UTC), o que mostra o
   dia anterior em qualquer fuso positivo.

   > Emenda registrada durante o T1. A AC dizia "preservar o dia em qualquer fuso negativo, inclusive
   > quando o valor foi gravado como meia-noite UTC". Não há nenhum valor assim: nem seed nem
   > migration escrevem vigência, e um `timestamptz` em `00:00Z` **é** 21:00 do dia anterior em São
   > Paulo — exibir o dia anterior seria correto para o tipo da coluna. O defeito real é a divergência
   > entre os dois leitores, e é isso que a AC passa a exigir.

### DSC-06 — A listagem de cupons fala a língua da de promoções

**User Story:** Como dona da loja, quero ler as duas listagens do grupo Descontos sem traduzir
vocabulário.

#### Acceptance Criteria

1. THE coluna de datas SHALL se chamar `Vigência` e SHALL usar o mesmo vocabulário da listagem de
   promoções: `Sem fim`, `até 30/09`, `01/08 – 31/08`, `a partir de 01/08`.
2. THE listagem SHALL renderizar os três cartões de número do board: cupons ativos (com o total
   cadastrado como legenda), total de usos, e a contagem de esgotados/expirados; nenhuma métrica
   SHALL ser calculada sem ser exibida.
3. THE cartão de "cupons ativos" SHALL contar o mesmo veredito da coluna Status — `active` **e**
   dentro da vigência **e** com uso disponível —, não a coluna `active` crua.
4. THE coluna Status SHALL distinguir quatro estados com paletas diferentes: `Ativo` (verde),
   `Inativo` (neutro), `Expirado` (vermelho) e `Esgotado` (âmbar). `Expirado` e `Esgotado` NÃO SHALL
   compartilhar a mesma cor — a ação para cada um é diferente (prorrogar vs. subir o limite).
5. WHEN um cupom bateu o limite de usos THEN a coluna `Usos` SHALL marcar isso no próprio valor
   (`40 / 40` em âmbar).
6. THE ordem das ações de linha SHALL ser a mesma das promoções: pausar/reativar, duplicar, editar,
   excluir.

### DSC-07 — Pausar cupom sem abrir o formulário

**User Story:** Como dona da loja, quero desligar um cupom que vazou num grupo de WhatsApp em um
clique, sem abrir tela nenhuma.

#### Acceptance Criteria

1. THE cada linha SHALL ter um botão que pausa quando o cupom está ativo e reativa quando está
   pausado, com rótulo acessível nomeando o cupom.
2. WHEN pauso um cupom THEN o sistema SHALL gravar `active: false` daquele `id` e SHALL avisar que o
   checkout deixa de aceitar o código e que pedidos já feitos não mudam.
3. THE patch SHALL conter apenas `id` e `active` — nenhum outro campo do cupom SHALL ser reescrito
   por uma pausa.
4. WHEN a gravação falha THEN o sistema SHALL avisar do erro e a linha SHALL continuar mostrando o
   estado que está no banco.

### DSC-08 — Duplicar cupom abre uma cópia para batizar

**User Story:** Como dona da loja, quero partir de um cupom que já funcionou para criar o próximo,
sem reconfigurar tipo, valor, mínimo e vigência.

#### Acceptance Criteria

1. WHEN clico em duplicar THEN o sistema SHALL abrir `/admin/cupons/novo?from=<id>` com tipo, valor,
   pedido mínimo, limite de usos, vigência, descrição e `Apenas primeiro pedido` copiados do
   original.
2. THE código NÃO SHALL ser copiado: o campo SHALL chegar vazio e focado. `coupons.code` é `UNIQUE`
   e é o texto que a cliente digita — inventar `NANA10-COPIA` publicaria um código que ninguém
   escolheu.
3. THE cópia SHALL chegar com `Ativo` desligado, e o contador de usos do original NÃO SHALL ser
   copiado.
4. WHILE a cópia não é salva, o cupom original NÃO SHALL sofrer nenhuma escrita.
5. WHEN salvo a cópia com um código que já existe THEN o sistema SHALL avisar do conflito sem perder
   o que foi preenchido.

## Premissas

- **A1** — O primário do backoffice segue `gradient-cta`. Os boards desenharam o CTA em violeta
  chapado; adotar isso só no grupo Descontos deixaria as duas telas como as únicas sem o gradiente
  em oito telas de admin. A padronização escolhida é para a casa, não para o board.
- **A2** — A promoção continua sendo duplicada com escrita imediata (`PRM-22`), e o cupom não. O
  nome da promoção é decorativo; o código do cupom é identificador único e é o que a cliente digita.
- **A3** — Nenhuma coluna nova. Pausa de cupom usa `coupons.active`; a cópia é estado de formulário.
- **A4** — `/admin/cupons` e `/admin/promocoes` seguem os únicos destinos de sidebar do grupo. As
  rotas de formulário são alcançadas de dentro da listagem, como `/admin/produtos/novo`.
- **A5** — `useAdminPromotions` / `useAdminCoupons` já trazem a lista inteira; a tela de edição acha
  o registro nela, como `AdminProductFormPage` faz com `useAdminProducts`. Sem hook novo de
  registro único.

## Fora de escopo (registrado)

- **A vigência termina à meia-noite do dia informado.** `valid_until` é gravado como meia-noite
  local, e os dois leitores comparam `new Date(valid_until) < now` — então "válido até 30/09" para
  de valer às 00:00 de 30/09, e o dia prometido na tela não vale. Corrigir é mudar a semântica de
  gravação **e** os dois leitores (`validateCoupon` e o filtro de vigência de
  `mercado-pago/handlers.ts`), com AC e teste nas duas pontas — caminho de dinheiro, não de UI.
  Registrado no `BACKLOG.md` como `BL-004`.
- Ações de pausar/duplicar **em lote**, e `⋯` no lugar da fila de quatro ícones.
- `useSetKitShowcase` continua sem consumidor de UI (trocar a vitrine do kit sem abrir o editor).

## Coverage

8 requisitos (DSC-01..DSC-08), 44 critérios de aceite.
