# Configurações por Seções Specification

## Problem Statement

`/admin/configuracoes` cresceu para 8 abas horizontais heterogêneas dentro de um único `<Tabs>`
(Geral, Frete, Material, Pagamento, Checkout, Notificações, SEO, Carrinho Abandonado). O `TabsList`
já precisou de um remendo de CSS (`h-auto grid-cols-3 sm:grid-cols-8`), documentado no próprio código
como conserto local — não padrão — para não quebrar em 390px. A aba mais recente (Notificações,
feature `53`, 15 eventos) tornou o formato insustentável: nenhuma aba nova cabe sem repetir o
remendo, e a tela não segue o padrão "rail + palco" já estabelecido nos editores de Home e Menu
(features `24`/`47`/`48`), o que a deixa inconsistente com o resto do painel.

## Goals

- [ ] Reduzir de 8 abas para **4 seções** nomeadas com o vocabulário que a sidebar do painel já usa,
      sem alterar nenhum campo, tipo, coluna de banco ou fluxo de salvamento existente.
- [ ] Substituir o `<Tabs>` horizontal por um rail de navegação + painel de conteúdo, reaproveitando
      o padrão visual dos editores de Home e Menu (mockups em Paper, arquivo "Uma Estrelinha",
      página "Configurações — proposta de reorganização", `pageId p-9-0`).
- [ ] Tornar a navegação sustentável para crescer: uma 5ª seção não deve exigir remendo de CSS.
- [ ] Dar **endereço próprio a cada seção**, para que links vindos de outras telas do painel
      cheguem ao lugar certo em vez de cair numa aba arbitrária.
- [ ] No celular, navegar por lista → tela cheia com seta de voltar, preservando o botão voltar do
      navegador.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Mudar campos, validações, tipos ou colunas de banco de qualquer aba atual | É reorganização de NAVEGAÇÃO/IA e de COMPONENTE VISUAL, nunca de dado |
| Unificar os botões de salvar num save por seção (`FormPageHeader` com `⌘S`) | Checkout e Notificações têm save e recusa próprios; unificar exigiria refatorar código adjacente a dinheiro. Registrado como follow-up explícito — ver Assumptions |
| Promover Notificações a página própria do painel (`/admin/notificacoes`) | Decidido nesta sessão: fica dentro de Configurações |
| Mover o limiar de carrinho abandonado para a tela `/admin/carrinhos-abandonados` | Provavelmente a casa certa dele (é lá que o número é usado), mas é mudança em outra tela — feature própria |
| Adicionar seção/conteúdo de configuração que não existe hoje | Só reorganiza o que já existe |
| Aviso de "alterações não salvas" ao trocar de seção | Nenhuma das 8 abas de hoje avisa; manter paridade — ver Edge Cases |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Onde a seção Notificações mora | Dentro de Configurações, como seção do rail | Decisão do usuário via pergunta direta | y |
| Padrão de navegação no celular | Lista de seções → rota própria em tela cheia com seta de voltar | Decisão do usuário via pergunta direta; preserva back button | y |
| Agrupamento das 8 abas | 4 seções: Dados da loja · Vendas · Frete e Material · Notificações | Espelha os eixos que a sidebar já usa (`navItems.ts`), em vez de criar um segundo vocabulário. A versão anterior tinha uma 5ª seção ("Marketing" = SEO + Carrinho abandonado) que existia só para abrigar o que não coube — categoria-depósito, não domínio | n — revisão desta sessão |
| Rótulo da seção de dinheiro | "Vendas" | Mesma palavra que o eixo da sidebar que contém Pedidos/Carrinhos/Clientes. Alternativa literal descartada: "Pagamento e carrinho" | n |
| Esquema de URL | `/admin/configuracoes` (índice) + `/admin/configuracoes/:secao`, slugs `dados-da-loja`, `vendas`, `frete-e-material`, `notificacoes` | UMA fonte de verdade para "qual seção está ativa" (a URL), lida igual por desktop e celular | n |
| O que a rota-mãe renderiza | A **primeira seção** (desktop, com o rail ao lado) ou a **lista** (celular) — sem redirect e **sem painel de índice** | Um índice no painel repetiria, ao lado do rail, exatamente as mesmas 4 entradas: a mesma lista duas vezes na mesma tela. Quem resolve o link de `TextSectionEditor.tsx:73` é `CFG-19` (links internos apontam para a seção que contém o ajuste), não um índice. Sem redirect porque `/admin/configuracoes` é o endereço que vive em `footerNavItems` | n |
| Modo de foco | `/admin/configuracoes` entra em `FOCUS_ROUTES` | Sem isso são duas colunas de navegação empilhadas (sidebar de 14 itens + rail de 4). O princípio escrito em `focusRoutes.ts` é de intenção ("veio compor, não navegar"), e vale aqui. Custo: `focusRoutes.test.ts:29` assere hoje `isFocusRoute('/admin/configuracoes') === false` e precisa ser **invertido, nunca removido** | n |
| Breakpoint mobile ↔ desktop | `lg` (1024px), o mesmo de `AdminMenuPage` | Único precedente confirmado de layout de duas colunas alternando para uma | n |
| Slug de seção inválido | Tratado como a rota-mãe | Mantém a lojista num estado funcional, sem inventar tela de erro para um caso que só acontece por URL digitada à mão | n |
| Estado não salvo ao trocar de seção | Descartado sem aviso, igual ao comportamento atual ao trocar de aba | Nenhuma das 8 abas avisa hoje; um guard cross-seção é decisão de produto nova | y (paridade) |

**Open questions:** nenhuma sem marcação acima.

---

## User Stories

### P1: Navegação por seções no desktop ⭐ MVP

**User Story**: Como Adri, quero ver as configurações agrupadas em poucas seções nomeadas como o
resto do painel, para não procurar em 8 abas apertadas qual contém o que preciso mudar.

**Why P1**: É o problema que motivou a feature.

**Acceptance Criteria**:

1. WHEN a Adri abre `/admin/configuracoes` em viewport ≥ `lg` THEN o sistema SHALL mostrar um rail
   de navegação à esquerda com exatamente 4 seções, nesta ordem: Dados da loja, Vendas, Frete e
   Material, Notificações.
2. WHEN a Adri abre `/admin/configuracoes` sem seção THEN o sistema SHALL mostrar a primeira seção
   ("Dados da loja") no painel, com ela marcada no rail — **nunca um índice de seções no painel**: o
   rail já é a lista, e repeti-la ao lado seria a mesma lista duas vezes na mesma tela.
3. WHEN a Adri escolhe uma seção (pelo rail ou pelo índice) THEN o sistema SHALL exibir o conteúdo
   daquela seção no painel e marcar a seção ativa no rail.
4. WHEN a seção "Dados da loja" está ativa THEN o painel SHALL mostrar os cards "Geral" e "SEO"
   empilhados, com os MESMOS campos, rótulos e botões de salvar de hoje.
5. WHEN a seção "Vendas" está ativa THEN o painel SHALL mostrar os cards "Pagamento", "Checkout" e
   "Carrinho abandonado" empilhados, preservando o comportamento autocontido (hook e save próprios)
   do Checkout.
6. WHEN a seção "Frete e Material" está ativa THEN o painel SHALL mostrar os cards "Frete" e
   "Material" empilhados, com os mesmos campos de hoje.
7. WHEN a seção "Notificações" está ativa THEN o painel SHALL renderizar o componente
   `NotificationsTab` existente, sem alteração de comportamento interno.
8. WHEN a Adri troca de seção THEN o cabeçalho da página (`PageHeader` "Configurações") SHALL
   permanecer fixo, trocando apenas o conteúdo do painel.
9. WHEN qualquer tela de `/admin/configuracoes` é renderizada THEN a navegação principal do painel
   SHALL estar no modo de foco (trilho de ícones), com o controle de expandir disponível.

**Independent Test**: Abrir em 1440px, ver o índice, clicar em cada uma das 4 seções e confirmar que
os campos certos aparecem, idênticos aos de antes.

---

### P1: Navegação em tela cheia no celular ⭐ MVP

**User Story**: Como Adri no celular, quero abrir uma seção de cada vez em tela cheia com botão de
voltar, para não lidar com uma barra de abas apertada.

**Why P1**: Segunda metade do mesmo problema — o `TabsList` quebrando em 390px foi o gatilho do
remendo de CSS.

**Acceptance Criteria**:

1. WHEN a Adri abre `/admin/configuracoes` em viewport < `lg` THEN o sistema SHALL mostrar SOMENTE a
   lista das 4 seções (sem rail e sem painel ao lado).
2. WHEN a Adri toca numa seção THEN o sistema SHALL navegar para a rota daquela seção, mostrando um
   cabeçalho com seta de voltar + nome da seção e o conteúdo em largura cheia.
3. WHEN a Adri toca a seta de voltar OU aciona o voltar do navegador THEN o sistema SHALL retornar à
   lista das 4 seções.
4. WHEN campos hoje dispostos em grade de 2-3 colunas no desktop são exibidos no celular THEN eles
   SHALL empilhar em coluna única.
5. WHEN qualquer alvo de toque da lista, do botão de voltar ou dos controles de uma seção é medido
   THEN sua área clicável SHALL ser de pelo menos 44×44px.

**Independent Test**: Em 390×844, ver só a lista, tocar "Frete e Material", ver a tela cheia com seta
de voltar e campos em coluna única, voltar e conferir que a lista reaparece.

---

### P1: Endereço próprio por seção ⭐ MVP

**User Story**: Como Adri, quero que cada seção tenha seu endereço, para que links de outras telas do
painel me levem direto ao ajuste certo — e para poder voltar a ele pelo histórico.

**Why P1**: Deixou de ser conveniência e virou requisito: o regrupamento espalha por duas seções os
três valores que o editor da faixa de vantagens hoje cita num link só. Sem endereço por seção, aquele
link fica pior do que é hoje.

**Acceptance Criteria**:

1. WHEN a Adri navega para uma seção (desktop ou celular) THEN a URL SHALL refletir a seção ativa
   (ex.: `/admin/configuracoes/frete-e-material`).
2. WHEN a Adri acessa diretamente a URL de uma seção válida THEN o sistema SHALL abrir aquela seção —
   no desktop com o rail e o painel correspondente, no celular direto na tela cheia da seção.
3. WHEN a Adri acessa `/admin/configuracoes` THEN o sistema SHALL renderizar a tela sem redirect —
   no desktop a primeira seção com o rail ao lado, no celular a lista das 4 seções. A rota-mãe
   continua sendo endereço válido, porque é ela que está em `footerNavItems`.
4. WHEN a Adri acessa uma URL com slug de seção inexistente THEN o sistema SHALL tratá-la como a
   rota-mãe (primeira seção no desktop, lista no celular).
5. WHEN uma tela do painel precisa apontar para uma configuração específica THEN ela SHALL linkar
   para a rota da seção que a contém, e não para a rota-mãe.

**Independent Test**: Colar `/admin/configuracoes/notificacoes` na barra de endereço e confirmar que
abre com Notificações ativa, sem passo intermediário.

---

### P2: A loja para de falar em "abas"

**User Story**: Como Adri, quero que as mensagens do painel nomeiem as seções como elas aparecem na
tela, para não procurar uma "aba Material" que não existe mais.

**Why P2**: Não bloqueia a reorganização, mas sem isso a feature entrega um painel que se contradiz —
e duas dessas mensagens são recusas de gravação, lidas exatamente quando a Adri está travada.

**Acceptance Criteria**:

1. WHEN uma mensagem do painel se refere ao endereço do ateliê THEN ela SHALL nomear a seção
   ("Frete e Material") e não "aba Material" — hoje em `NotificationsTab.tsx` e
   `useNotificationsDraft.ts`.
2. WHEN essa mensagem é exibida numa superfície que comporta link THEN ela SHALL oferecer link para
   `/admin/configuracoes/frete-e-material`.
3. WHEN qualquer arquivo de `apps/backoffice/src/**` for varrido THEN não SHALL restar referência a
   "aba" apontando para uma seção de Configurações.

**Independent Test**: Ligar `material_instructions` com o endereço vazio e ler a recusa: ela nomeia a
seção e oferece o caminho.

---

### P2: Campos de dinheiro usam o input mascarado do painel

**User Story**: Como Adri, quero que os campos em reais das Configurações se comportem como os do
resto do painel, para não ter que adivinhar se digito "150" ou "150,00".

**Why P2**: `MoneyInput` (`shared/ui/inputs/`) já é o padrão em 6 telas — formulário de produto,
grade rápida, edição inline, edição em massa. Configurações ficou de fora e usa `<Input
type="number">` cru. Os cards estão sendo reescritos de qualquer forma.

**Acceptance Criteria**:

1. WHEN a Adri edita "Frete grátis a partir de", "Custo de frete padrão" ou "Valor mínimo da
   parcela" THEN o campo SHALL usar `MoneyInput`, com máscara pt-BR e prefixo `R$`.
2. WHEN o valor é salvo THEN o valor gravado SHALL ser o mesmo número que o campo cru gravava antes
   (sem mudança de unidade ou de precisão).
3. WHEN campos que NÃO são dinheiro são exibidos (desconto no Pix em %, máximo de parcelas, horas do
   carrinho abandonado) THEN eles SHALL permanecer como estão — `MoneyInput` não se aplica.

**Independent Test**: Digitar `150` em "Frete grátis a partir de" e conferir que a tela mostra
`R$ 150,00` e que o payload de gravação continua `150`.

---

### P3: `InfoBanner` compartilhado

**User Story**: Como desenvolvedora que vai mexer nestes arquivos, quero um único componente de aviso
informativo, para não perpetuar 4 implementações ad hoc divergentes.

**Why P3**: Baixo custo incremental (os 4 banners já serão tocados), mas nada quebra sem ele.

**Acceptance Criteria**:

1. WHEN um card de Configurações precisa mostrar aviso informativo (hoje: Material, Checkout,
   Carrinho abandonado, `EventCard`) THEN ele SHALL usar `shared/ui/InfoBanner`, com a cor semântica
   `--estrelinha-admin-amber`.
2. WHEN o `InfoBanner` substitui um banner ad hoc THEN o resultado visual SHALL ser equivalente ao
   atual daquele lugar (extração, não redesenho).

---

## Edge Cases

- WHEN a Adri edita um campo e troca de seção sem salvar THEN o sistema SHALL descartar a edição —
  mesmo comportamento de hoje ao trocar de aba (paridade declarada, não regressão).
- WHEN a seção "Notificações" está com uma prévia de e-mail aberta e a Adri troca de seção THEN a
  prévia SHALL fechar (não vazar estado entre seções).
- WHEN o rail é percorrido por teclado THEN cada item SHALL ser alcançável por Tab e ativável por
  Enter/Espaço, com foco visível.
- WHEN a Adri está numa seção e recolhe/expande a navegação principal THEN a preferência SHALL seguir
  a mesma regra das outras rotas de foco (`estrelinha.admin.nav-rail`), sem dono novo.
- WHEN as configurações ainda estão carregando THEN o sistema SHALL mostrar o estado de carga antes
  de desenhar os cards, como hoje.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| CFG-01 | P1: Navegação desktop | Execute | Verified |
| CFG-02 | P1: Navegação desktop | Execute | Verified |
| CFG-03 | P1: Navegação desktop | Execute | Verified |
| CFG-04 | P1: Navegação desktop | Execute | Verified |
| CFG-05 | P1: Navegação desktop | Execute | Verified |
| CFG-06 | P1: Navegação desktop | Execute | Verified |
| CFG-07 | P1: Navegação desktop | Execute | Verified |
| CFG-08 | P1: Navegação desktop | Execute | Verified |
| CFG-09 | P1: Navegação desktop (modo de foco) | Execute | Verified |
| CFG-10 | P1: Navegação mobile | Execute | Verified |
| CFG-11 | P1: Navegação mobile | Execute | Verified |
| CFG-12 | P1: Navegação mobile | Execute | Verified |
| CFG-13 | P1: Navegação mobile | Execute | Verified |
| CFG-14 | P1: Navegação mobile | Execute | Verified |
| CFG-15 | P1: Endereço por seção | Execute | Verified |
| CFG-16 | P1: Endereço por seção | Execute | Verified |
| CFG-17 | P1: Endereço por seção (rota-mãe sem redirect) | Execute | Verified |
| CFG-18 | P1: Endereço por seção (slug inválido) | Execute | Verified |
| CFG-19 | P1: Endereço por seção (links internos) | Execute | Verified |
| CFG-20 | P2: Fim das "abas" na copy | Execute | Verified |
| CFG-21 | P2: Fim das "abas" na copy | Execute | Verified |
| CFG-22 | P2: Fim das "abas" na copy | Execute | Verified |
| CFG-23 | P2: MoneyInput | Execute | Verified |
| CFG-24 | P2: MoneyInput | Execute | Verified |
| CFG-25 | P2: MoneyInput | Execute | Verified |
| CFG-26 | P3: InfoBanner | Execute | Verified |
| CFG-27 | P3: InfoBanner | Execute | Verified |

**ID format:** `CFG-[NUMBER]` · **Status:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 27 total, 27 mapeados a tasks, 0 sem mapeamento ✓ (ver a *Test Coverage Matrix* em
`tasks.md` e a tabela de evidência em `validation.md`)

---

## Implicit-Requirement Dimensions Sweep

| Dimension | Coverage |
| --- | --- |
| Input validation & bounds | Coberto por CFG-24 (o valor gravado pelo `MoneyInput` é o mesmo do campo cru). Os demais campos não mudam — validações existentes permanecem intactas |
| Failure / partial-failure states | N/A porque nenhum fluxo de rede novo é introduzido — cada card salva isoladamente como hoje |
| Idempotency / retry / duplicate handling | N/A porque não há escrita nova |
| Auth boundaries & rate limits | As rotas de seção herdam o `RequireAdmin` que guarda `/admin/configuracoes` hoje. **Restrição de implementação**: `rotasSobGuarda.test.ts` exige exatamente um `</Route>` no `App.tsx`, logo as rotas novas têm de ser irmãs auto-fechadas, nunca um `<Route>` aninhado com filhos |
| Concurrency / ordering | N/A porque não há estado concorrente novo |
| Data lifecycle / expiry | N/A |
| Observability | N/A — nenhum log/métrica novo é pedido por este escopo |
| External-dependency failure | N/A |
| State-transition integrity | Coberto por P1 (seção ativa ↔ URL, índice ↔ seção, lista ↔ detalhe no celular, prévia fechando ao trocar de seção, slug inválido caindo no índice) |

---

## Success Criteria

- [ ] `/admin/configuracoes` mostra 4 seções em vez de 8 abas, sem nenhum campo removido ou alterado.
- [ ] Nenhuma regressão na suíte do backoffice — os 21 casos de `AdminSettingsPage.test.tsx` (hoje
      navegando por `getByRole('tab')`) migram para a navegação nova sem perder asserção.
- [ ] A suíte da **loja** também passa: os guardas de varredura moram lá e varrem `apps/**`
      (lição das features `51` e `53`).
- [ ] Em 390×844, nenhuma seção produz rolagem horizontal do body nem alvo de toque abaixo de 44px.
- [ ] `rotasSobGuarda.test.ts`, `navItems.test.ts` e `focusRoutes.test.ts` verdes — o último com a
      asserção de `/admin/configuracoes` **invertida**, com o motivo escrito ao lado.
- [ ] Prova em navegador real em 390 e 1440, cobrindo o que jsdom não mede: layout, rolagem, troca de
      seção sem recarregar a página, e o modo de foco recolhendo a navegação.
