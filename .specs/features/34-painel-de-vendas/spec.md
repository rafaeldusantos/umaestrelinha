# Painel de vendas — Pedidos e Clientes

> Artboards: arquivo Paper **Uma Estrelinha**, página **`34 · Pedidos e Clientes`** (7 pranchas).
> Esta spec nasceu de uma validação das duas telas contra o padrão que `/admin/produtos` já pratica.

## Problem Statement

O grupo **Vendas** é o primeiro da sidebar porque é o único eixo que **acumula** — e é o único cujas
telas nunca receberam o tratamento que `Produtos` recebeu nas `PLS-*`/`RFN-*`. A assimetria é
medível em linhas de código: `AdminProductsPage.tsx` tem **699 linhas**, com visões, chips de filtro,
edição em linha, colunas configuráveis, seleção em massa e seis ações de lote; `AdminOrdersPage.tsx`
tem **232**; `AdminClientsPage.tsx` tem **54**.

Isso não seria problema se as telas menores fizessem menos porque há menos a fazer. Não é o caso.

**Quatro defeitos que a validação encontrou, e que nada no repositório acusa:**

1. **Dois dos quatro selos de material renderizam sem cor nenhuma.**
   [`MaterialStatusBadge.tsx:15-19`](../../../apps/backoffice/src/entities/order/ui/MaterialStatusBadge.tsx#L15-L19)
   usa `estrelinha-admin-amber` e `estrelinha-admin-emerald`. **Nenhum dos dois existe** — nem em
   `packages/ui/src/styles.css`, nem em `packages/ui/tailwind.preset.ts` (o preset tem `violet`,
   `pop`, `pink`, `sakura`, `cyan`, `yellow`, `dark`, e mais nada). O Tailwind não emite classe para
   token inexistente, então `Aguardando material` e `Material recebido` saem transparentes, sem borda
   e com a cor herdada. O comentário do próprio arquivo declara que "as cores separam remédios
   diferentes" — e as duas pontas da régua são justamente as que perderam a cor. **É o defeito da
   identidade em estado puro** (`CLAUDE.md`, *Os guardas*): build, `tsc` e teste de componente passam
   com ele.
2. **"Limpar filtros" não limpa o que a Adri mais usa.** O botão zera `dateFrom`, `dateTo`,
   `paymentFilter` e `searchQuery`; **não zera `statusFilter` nem `materialFilter`**. E a condição
   que o exibe também os ignora — com só a fila de material filtrada, o botão **não aparece**. Lista
   filtrada sem caminho de volta visível.
3. **"Exportar CSV" exporta a página, não o filtro.** `exportOrdersCsv(orders)` recebe as ≤20 linhas
   já carregadas. O rodapé ao lado diz "148 pedido(s)". Ninguém é avisado. `Produtos` já resolveu
   isso com `fetchAllFiltered`.
4. **As contagens das abas de status ignoram os filtros ativos.** `fetchStatusCounts` lê `orders`
   sem nenhum `where`. Com "Material: aguardando" ligado, a aba diz `Pago (12)` e a lista mostra 3.

**E três buracos de dado:**

- **`orders.notes` existe na migration e não existe em `DbOrder`.** A observação que a cliente
  escreveu no checkout não chega à Adri em tela nenhuma.
- **A tabela `addresses` nunca é lida pelo painel.** Só a loja lê (`useDefaultAddress`,
  `useSaveAddress`). A ficha do cliente não mostra endereço.
- **`customers.email` não tem índice único** — só `customers.user_id` tem
  (`20260415094131_create_profiles_and_customer_trigger.sql:34`). A mesma pessoa comprando como
  convidada duas vezes vira duas linhas, e nada na tela diz isso.

**O que está fraco, comparado ao padrão de `Produtos`:** sem seleção múltipla e ações em lote, sem
ordenação em coluna nenhuma, sem colunas configuráveis nem densidade, sem visões salvas, sem chips
de filtro, sem tamanho de página, busca sem debounce, erro de leitura engolido e exibido como
"Nenhum pedido encontrado", data absoluta enquanto a irmã `Carrinhos abandonados` usa relativa.

**O que falta como comportamento:** o detalhe do pedido é **modal**, contra a regra escrita deste
repositório ("Editor é TELA, não modal", `apps/backoffice/CLAUDE.md`) — e é o registro mais complexo
do painel, com cinco abas, que não sobrevive ao F5 e não vira link. **A fila de material não mostra
idade**: parado há 40 dias parece igual a parado há 2, no único eixo que acumula. `window.print()`
imprime a página inteira, não existe folha de separação. Nada liga pedido → cliente.

**Clientes não responde nenhuma das três perguntas que fazem alguém abri-la**: quanto essa pessoa já
gastou, quando comprou pela última vez, e se ela já confiou um material. E `useAdminCustomers` traz
a base inteira numa leitura só — herda o teto de 1.000 do PostgREST em silêncio, e o rodapé exibe
`customers.length`, que é o número truncado (mesma classe da `BL-008`).

**Zero teste de página nas duas.** Não existe `AdminOrdersPage.test.tsx` nem
`AdminClientsPage.test.tsx`; só `OrderDetailDialog.test.tsx` e `OrderMaterialCard.test.tsx`.

## Goals

- [ ] **Os dois selos sem cor voltarem a ter cor**, com os tokens definidos nos dois lugares e um
      guarda que reprove classe `estrelinha-admin-*` inexistente — porque acrescentar os dois tokens
      não impede o terceiro erro igual.
- [ ] **A fila mostrar idade.** Quem está parado há mais de uma semana precisa parecer diferente de
      quem chegou ontem, na listagem e no pedido.
- [ ] **O pedido virar rota** (`/admin/pedidos/:id`), compartilhável e sobrevivente ao F5, com a
      máquina do material como o primeiro bloco da tela.
- [ ] **Seleção em massa em Pedidos**, com as ações que a operação repete: marcar material recebido,
      avançar status, gerar folhas de separação, cobrar material, exportar.
- [ ] **Filtro, busca, ordenação, paginação e contagem serem todos do servidor e concordarem entre
      si** — inclusive as contagens das abas.
- [ ] **Clientes responder as três perguntas** (gastou, última compra, confiou material) na listagem,
      e ganhar ficha em rota própria com endereços, notas e o caminho de LGPD.
- [ ] **Nenhuma das duas telas seguir sem teste de página.**

## Out of Scope

| Item | Motivo |
| --- | --- |
| Re-skin do painel | `C-05` continua valendo. Tudo aqui usa os tokens `--estrelinha-admin-*` que já existem, mais os **dois que faltavam** e a correção de contraste do `text-muted`. |
| Tirar o prefixo `/admin/*` das rotas | Trabalho independente, registrado em `apps/backoffice/CLAUDE.md`. As rotas novas nascem com o prefixo. |
| Mexer em `packages/core/src/payment/**` | Nenhuma decisão de dinheiro muda. Pedido e cliente **leem** valores congelados. Conferido por `git diff --name-only` no gate. |
| Reescrever a aba Melhor Envio | `MelhorEnvioTab` migra de aba de modal para bloco de rota **sem alteração interna**. Refazer a integração é outra feature. |
| Unificar clientes duplicadas automaticamente | A feature **detecta e mostra** (`CLI-14`); fundir dois cadastros é escrita destrutiva sobre pedido pago, e é decisão da dona. Índice único em `customers.email` também fica fora: pode haver duplicata **já gravada**, e a migration falharia na aplicação. |
| E-mail de cobrança de material automático | A tela oferece **um clique que abre o WhatsApp com texto pronto**. Régua automática de cobrança é política de relacionamento num negócio memorial — decisão da Adri, não do código. |
| Corrigir a `BL-008` inteira | `fetchStatusCounts` é reescrito aqui (`PED-09`); as outras leituras sem paginação do painel continuam na `BL-008`. |
| Avaliações / prova social na ficha do cliente | `CLAUDE.md`: avaliações não existem, e a régua é ética, não técnica. |

---

## Assumptions & Open Questions

| Assunção / decisão | Default escolhido | Racional | Confirmado? |
| --- | --- | --- | --- |
| Qual âmbar e qual esmeralda | `#B45309` e `#047857` | Os dois passam 4,5:1 sobre branco **e** sobre o próprio fundo de 10% do selo. Âmbar já é a cor que a tela usa para "atenção" em outros pontos. | Assumido |
| O corte de "parado" | **8 dias** | O ciclo de envio dos Correios (PAC nacional) é de 4 a 7 dias úteis; abaixo disso a espera é normal e alarmar seria ruído. | **Confirmar com a Adri** |
| A Adri usa o painel no celular | Sim, para a fila | ~90% dos acessos da **loja** são móveis; o painel não tem medição. Desenhar a fila em 390px custa pouco e o custo de não desenhar é ela não conseguir marcar "recebi" com o envelope na mão. | **Confirmar com a Adri** |
| Gasto conta só pedido aprovado | Sim | Contar `pending` inflaria o LTV com Pix que expira sozinho. A tela **declara** o critério em texto, para o número não ter dois donos silenciosos. | Assumido |
| Anonimizar preserva os pedidos | Sim, sem dono | Pedido é registro fiscal. Apagar a linha do pedido quebraria o faturamento; apagar só o vínculo atende o pedido de exclusão. | **Confirmar** (é decisão jurídica, não técnica) |
| Onde mora a idade da fila | `@estrelinha/core` | Loja e painel **vão** ler a mesma régua: a página "meu pedido" da cliente também precisa dizer há quanto tempo espera. Segundo consumidor previsível ⇒ `core` (defeito 01, consequência 1). | Assumido |

---

## Requisitos

### Correções — o que está quebrado hoje

| ID | Requisito | Aceite |
| --- | --- | --- |
| `PED-01` | Os quatro estados do material têm cor distinta em produção | `--estrelinha-admin-amber: #B45309` e `--estrelinha-admin-emerald: #047857` existem em `styles.css` **e** no preset; os quatro selos renderizam com fundo, borda e texto ≥ 4,5:1 |
| `PED-02` | Classe `estrelinha-admin-*` inexistente **reprova a suíte** | Guarda no molde de `palette.test.ts`: lê preset e `styles.css` do disco, varre `apps/backoffice/**` atrás de `estrelinha-admin-[a-z-]+`, e reprova a que não existir. **Âncora dupla**: nº de arquivos varridos **e** nº de classes encontradas |
| `PED-03` | `--estrelinha-admin-text-muted` passa 4,5:1 sobre `card` | `#9B8EC4` (2,9:1) → `#726591` (5,2:1). Teste de contraste no molde de `contrast.test.ts`, agora também para os tokens admin |
| `PED-04` | "Limpar filtros" limpa **tudo** e aparece sempre que há filtro | Inclui `statusFilter` e `materialFilter` na limpeza **e** na condição de exibição; o rótulo diz quantos filtros serão limpos |
| `PED-05` | Exportar CSV exporta **o filtro inteiro**, não a página | Botão rotulado com o total (`Exportar 148 do filtro`); usa leitura paginada completa; nunca trunca em silêncio |
| `PED-06` | O CSV carrega material e estado de pagamento | Colunas novas: `payment_status`, `material_status`, `material_tracking_code`, `material_received_at`, `dias_parado` |
| `PED-07` | As contagens das abas respeitam os filtros ativos | Um `count` por aba, com os mesmos `where` da listagem menos o próprio eixo da aba |
| `PED-08` | Erro de leitura aparece como erro | Faixa no molde da de `AdminProductsPage`; **nunca** cai no estado vazio |
| `PED-09` | Contagem não herda o teto de 1.000 do PostgREST | `select('id', { count: 'exact', head: true })` por aba — o servidor conta, o cliente não carrega linha |
| `PED-10` | A busca alcança e-mail e rastreio | `or(order_number.ilike, customer_name.ilike, customer_email.ilike, tracking_code.ilike, material_tracking_code.ilike)`; debounce de 300 ms |
| `PED-11` | `orders.notes` chega à tela | Coluna entra em `DbOrder` e aparece no pedido, rotulada como **recado da cliente** — nunca confundida com nota interna |

### Fila e listagem de pedidos

| ID | Requisito | Aceite |
| --- | --- | --- |
| `PED-12` | O topo da tela diz **o que cobra**, não o que existe | Quatro contadores clicáveis: aguardando material (com a idade do mais antigo), pago a separar, enviado sem rastreio, Pix aguardando. Cada um aplica um filtro |
| `PED-13` | A idade tem **três degraus**, não um gradiente | ≤3 dias neutro · 4–7 dias em `foreground` semibold · ≥8 dias em âmbar com o prefixo `parado há` |
| `PED-14` | Visões cobrem as perguntas reais | `Precisa de ação` (padrão) · `Tudo` · `Fila de material` · `A separar` · `Em trânsito` · `Concluídos`, mais visões salvas, no molde de `savedViews.ts` |
| `PED-15` | Chips mostram e desfazem cada filtro ativo | Um chip por filtro, com `×`; molde de `FilterChips.tsx` |
| `PED-16` | Seleção múltipla com ações de lote | Marcar material recebido · avançar status · folhas de separação · cobrar material · exportar. Selecionar a página **e** os N do filtro; a seleção guarda a **linha**, não o id (`PLS-06`) |
| `PED-17` | Toda transição de material em lote passa pela RPC, uma por pedido | `set_material_status` por linha; transição inválida **não** aborta o lote, e o resumo diz quantas passaram e quantas não |
| `PED-18` | Ordenação por coluna, no servidor | Data, valor, idade na fila. Estado na URL |
| `PED-19` | Colunas configuráveis e densidade | Molde de `columns.ts` (`useColumnPrefs`), persistido em `estrelinha.admin.*` |
| `PED-20` | Tamanho de página escolhível, e o rodapé diz o intervalo | 10/25/50; `rangeLabel(page, pageSize, total)` |
| `PED-21` | A linha liga ao cliente | Nome é link para `/admin/clientes/:id`, com "3ª compra" ao lado |
| `PED-22` | Data relativa, como na tela irmã | `formatRelativeDate` de `@estrelinha/core/formatters`, com a data absoluta no `title` |
| `PED-23` | A tela funciona em 390px | Cartões, não tabela; strips de fila e visões rolam **dentro do próprio container**; nenhum alvo abaixo de 44px; body nunca rola na horizontal |

### O pedido como rota

| ID | Requisito | Aceite |
| --- | --- | --- |
| `PED-24` | `/admin/pedidos/:id` é rota própria | Compartilhável, sobrevive ao F5, `ROUTE_SLUGS` e `navItems.test.ts` continuam verdes. **Não** entra em `navGroups` (mesma régua da grade rápida) |
| `PED-25` | O primeiro bloco é o material | Trilha dos quatro estados, o que o pedido espera, há quanto tempo, e a ação primária do estado atual |
| `PED-26` | As duas remessas nunca se confundem | Rastreio **de entrada** só no bloco de material; rastreio **de saída** só no bloco de entrega, cada um com rótulo que diz a direção |
| `PED-27` | Histórico é **um** fluxo | Status, e-mails enviados e notas internas na mesma linha do tempo, filtrável por tipo. As abas `Timeline` e `Notas` deixam de existir separadas |
| `PED-28` | E-mail que não saiu pode ser reenviado | Cada evento de e-mail mostra se saiu; falha oferece reenviar. O envio continua contido — nunca reverte estado (`AD-008`) |
| `PED-29` | Avançar status diz o que falta, e não bloqueia | "Próximo passo: X", com o motivo quando há pendência, e `Avançar mesmo assim` (`UX-01`) |
| `PED-30` | Folha de separação é documento próprio | Rota de impressão com itens, gravação, material esperado e endereço — nunca `window.print()` na página |
| `PED-31` | Cancelar diz o que **não** faz | O diálogo declara em texto que cancelar não estorna no Mercado Pago nem repõe estoque |

### Clientes

| ID | Requisito | Aceite |
| --- | --- | --- |
| `CLI-01` | Busca, filtro, ordenação e paginação do servidor | Nome, e-mail, telefone, CPF; filtros por material, última compra e conta/convidada |
| `CLI-02` | A leitura nunca é truncada em silêncio | `range` + `count: 'exact'`; o rodapé mostra `1–25 de 324`, nunca `rows.length` |
| `CLI-03` | A listagem responde as três perguntas | Colunas **Gastou**, **Ticket**, **Última compra** e **Material** |
| `CLI-04` | Dinheiro só conta pedido que virou dinheiro | Gasto e ticket somam apenas `payment_status = 'approved'`; a tela declara isso em texto |
| `CLI-05` | Contagem de pedidos deixa de misturar abandono com compra | Coluna **Pedidos** conta pagos; o não pago aparece na última compra como "em aberto" |
| `CLI-06` | Retrato da base no topo | Voltaram a comprar (nº e %), confiaram material, gasto médio, novas no mês |
| `CLI-07` | Visões | Todas · Voltaram · Confiaram material · Compraram uma vez só · Cadastro sem compra · **Possíveis duplicadas** |
| `CLI-08` | `/admin/clientes/:id` é rota própria | Mesma régua do pedido |
| `CLI-09` | A ficha mostra endereços | Lê `addresses`, marca o padrão, e cada um tem **copiar** |
| `CLI-10` | A ficha tem notas internas | `customer_notes`, mesmo molde de `order_notes`. A tela declara que a cliente nunca vê |
| `CLI-11` | A ficha liga aos pedidos | Cada linha abre `/admin/pedidos/:id`; a que está em aberto mostra o que a segura |
| `CLI-12` | Exportar CSV do filtro | Mesma régua de `PED-05` |
| `CLI-13` | LGPD tem caminho | Exportar tudo o que a loja tem da pessoa; **anonimizar** apaga nome, e-mail, telefone, CPF e endereços, e preserva os pedidos sem dono (registro fiscal). O diálogo escreve exatamente isso |
| `CLI-14` | Duplicata por e-mail é **mostrada**, não resolvida | Visão que lista e-mails com mais de um cadastro. Fundir fica fora (`Out of Scope`) |
| `CLI-15` | A tela funciona em 390px | Mesma régua de `PED-23` |

### Testes

| ID | Requisito | Aceite |
| --- | --- | --- |
| `TST-01` | `AdminOrdersPage.test.tsx` existe | Filtros, chips, limpeza total, seleção, contagem coerente, estado de erro |
| `TST-02` | `AdminClientsPage.test.tsx` existe | Busca, paginação, agregados, visões |
| `TST-03` | `AdminOrderPage.test.tsx` (rota) existe | Blocos, ordem, e a asserção de que rastreio de entrada e de saída não se cruzam |
| `TST-04` | `adminTokens.test.ts` existe | O guarda de `PED-02`, com **sensor embutido**: uma classe sabidamente inexistente reprova na mesma régua |
| `TST-05` | Payload de gravação em igualdade exata | Como `CategoryInspector.test.tsx`. Campo novo não entra na escrita sem decisão |
| `TST-06` | Prova de gravação por probe HTTP (`AD-012`) | `customer_notes`, a RPC de anonimização e a coluna `orders.notes` provadas contra o banco local, não por inspeção de tipo |
