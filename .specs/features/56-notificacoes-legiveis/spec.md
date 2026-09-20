# 56 — Notificações legíveis, e o padrão das Configurações

**Status**: em execução
**Escopo**: Large (core + backoffice, 4 seções, 3 guardas novos)
**Origem**: pedido do usuário — *"Melhorar UI da tela de Configurações > Notificações do Backoffice,
conforme artboard criadas no PAPER. Ajustar as outras telas dentro de configurações para seguir o
mesmo padrão."*
**Artboards**: Paper, arquivo `Uma Estrelinha`, página *Configurações — proposta de reorganização*
— `Configurações — 1440 (Notificações)`, `Configurações — 1440 (Frete e Material)`,
`Configurações — 390 (lista de seções)`, `Configurações — 390 (Frete e Material aberta)`.

---

## A história

A Adri precisa abrir **Configurações → Notificações** e ler o texto dos 11 avisos que a feature `42`
criou **antes** de a primeira cliente recebê-los — é a pendência que o `CLAUDE.md` registra em *O que
espera decisão da dona*. A feature `53` tornou os 15 eventos alcançáveis; ela não os tornou legíveis.

**Medido em navegador real em 2026-09-20, no Chromium, com o banco local:**

| Onde | `document.scrollHeight` |
| --- | --- |
| `/admin/configuracoes/notificacoes` em **1440×1000** | **13.292px** |
| a mesma tela em **390×844** | **13.592px** |

São ~16 telas de rolagem para uma decisão que é, em essência, *"quais destes 15 avisos eu quero
ligar?"*. Os 15 cards nascem **todos abertos**, com 5 campos cada, e não há nenhuma visão em que os
15 eventos caibam juntos.

E há um defeito de conteúdo junto: **o título de cada card é a frase do HISTÓRICO do pedido.**
`NOTIFICATION_EVENT_LABELS` responde *"o que aconteceu com este pedido"* e está no passado —
"Confirmação do pedido enviada", "Aviso de pagamento aprovado enviado". Numa tela onde se configura
o que **vai** ser enviado, ela se lê como registro de log. O artboard chama o mesmo evento de
**"Pedido recebido"**.

---

## Critérios de aceitação

### A — o catálogo de apresentação dos eventos (em `core`)

- **`LEG-01`** Cada um dos 15 eventos SHALL ter um **nome curto** próprio da tela de configuração,
  e o card SHALL exibir esse nome. Ele é **distinto** do rótulo de histórico: nenhum dos 15 nomes
  pode ser igual ao `NOTIFICATION_EVENT_LABELS` do mesmo evento.
  *Ex.: `order_received` → `Pedido recebido` (hoje: "Confirmação do pedido enviada").*
- **`LEG-02`** Cada um dos 15 eventos SHALL ter uma **descrição de uma linha** dizendo QUANDO ele
  dispara, exibida abaixo do nome no card **aberto**.
  *Ex.: `Enviado assim que o pedido é registrado`.*
- **`LEG-03`** Cada um dos 15 eventos SHALL ter uma **chave de ícone** de um vocabulário fechado.
  `packages/core` SHALL continuar sem importar React, Supabase ou Deno — a chave é `string`, e quem
  a traduz em componente é o painel.
- **`LEG-04`** Os três mapas novos SHALL morar em `packages/core/src/notifications/`. Nenhum arquivo
  de `apps/**` SHALL escrever nome de evento como literal — a regra já existe
  (`notificationSingleOwner.test.ts`, feature `42`) e esta feature não abre exceção a ela.

### B — o card recolhível

- **`LEG-05`** Os 15 cards SHALL nascer **recolhidos**. O card recolhido SHALL mostrar o ícone, o
  nome e o interruptor — e nenhum campo de texto.
- **`LEG-06`** Abrir um card SHALL fechar o que estava aberto: **no máximo um aberto por vez**.
- **`LEG-07`** Fechar um card **NÃO** SHALL descartar a edição não salva daquele evento — reabrir
  mostra o texto como estava. (O rascunho é de `useNotificationsDraft`, não do card; este AC existe
  para que isso seja **medido** em vez de suposto.)
- **`LEG-08`** O interruptor SHALL continuar acionável no card recolhido, e acioná-lo **NÃO** SHALL
  abrir nem fechar o card.
- **`LEG-09`** O cabeçalho do card SHALL ser um controle com `aria-expanded` refletindo o estado, e
  SHALL abrir/fechar por clique, Enter e Espaço.
- **`LEG-10`** Fechar um card SHALL fechar a prévia dele — reabrir mostra o card sem prévia.
- **`LEG-11`** Um card **recolhido** cujo texto está recusado (`refusalFor`) ou que carrega aviso
  SHALL sinalizar isso na linha, com nome acessível que carregue o motivo.
  *Consequência direta de `LEG-05`: hoje a recusa e o aviso moram dentro do card. Sem este AC,
  recolher esconde a única pista de que um evento está travado, e a Adri teria de abrir os 15 para
  descobrir qual.*
- **`LEG-12`** Com todos os cards recolhidos, `document.scrollHeight` da seção SHALL ficar **abaixo
  de 2.500px** em 1440×1000 **e** em 390×844. *(Entrada medida: 13.292 / 13.592.)*

### C — o desenho do card (artboard)

- **`LEG-13`** O card SHALL ter o ícone numa caixa de **34×34px** à esquerda do nome. A caixa SHALL
  usar o tom de **destaque** quando o card está aberto e o tom **neutro** quando recolhido.
- **`LEG-14`** O contador de caracteres SHALL ficar na **mesma linha do rótulo do campo, alinhado à
  direita** — nunca abaixo do campo. O denominador SHALL vir de `COPY_LIMITS`.
- **`LEG-15`** O cabeçalho do card aberto SHALL ser separado dos campos por um divisor, e o card
  SHALL deixar de aninhar caixa com borda dentro de caixa com borda (hoje o `ToggleField` desenha a
  própria moldura dentro da moldura do card).
- **`LEG-16`** A prévia SHALL ser **emoldurada**, com uma barra de título que a nomeie —
  `Prévia — o mesmo e-mail que a cliente recebe` — e os controles de largura (390/600) e o selo
  `Prévia de exemplo` SHALL ficar **dentro** da moldura.

### D — o cabeçalho da seção e os três grupos

- **`LEG-17`** Cada um dos três grupos SHALL ter cabeçalho com o rótulo em caixa alta espaçada e a
  **contagem de eventos do grupo** à direita (`5 eventos`), **derivada da lista** — nunca escrita à
  mão.
- **`LEG-18`** O campo `Pedido para a prévia (opcional)` SHALL ficar na **linha do título da seção,
  à direita**, a partir de `lg`; abaixo de `lg` ele SHALL empilhar sob o título.

### E — o mesmo padrão nas outras três seções

- **`LEG-19`** O contador de caracteres SHALL ser **uma peça compartilhada**, e todo campo de
  Configurações com limite SHALL usá-la. O limite SHALL sair do **rótulo**:
  - `Título padrão (até 60 caracteres)` → `Título padrão` + contador `n/60`
  - `Descrição padrão (até 160 caracteres)` → `Descrição padrão` + contador `n/160`
  - `Mensagem padrão do WhatsApp` → contador `n/300`
  - `Observação para quem envia` → contador `n/400`
- **`LEG-20`** O botão de salvar SHALL ocupar a **largura inteira abaixo de `sm`** e a largura do
  conteúdo a partir de `sm`, nas **quatro** seções — e SHALL ter **um dono só**: a mesma string de
  classes está escrita hoje em três arquivos de Configurações.
- **`LEG-21`** SHALL continuar com ao menos **44px** de altura, nas quatro seções: o cabeçalho do
  card de evento, o interruptor, o botão de prévia, o botão de remover observação e o de salvar.
  *(Recorte deliberado — `L-019`: a AC nomeia os controles, em vez de dizer "todo alvo de toque".)*

---

## Success criteria

1. Nenhum campo, limite ou comportamento de gravação removido — os 24 rótulos que
   `AdminSettingsPage.test.tsx` inventaria continuam alcançáveis (dois deles com o texto novo de
   `LEG-19`).
2. Os 15 eventos cabem numa visão só, e os três grupos são legíveis sem rolar.
3. `packages/core/src/payment/**` sem uma linha alterada.
4. Sem migration: nada de schema muda.
5. Sem regressão de lint, tipos e testes contra as baselines do `CLAUDE.md`.

---

## Out of scope

| O que | Por quê |
| --- | --- |
| Unificar o **salvamento** das quatro seções | Tabela *Out of Scope* da `55` continua valendo: cada card tem recusa própria, e dois deles são adjacentes a dinheiro. Esta feature unifica o **botão** (apresentação), nunca o `save()`. |
| Mudar o texto padrão de qualquer evento | `DEFAULT_*` de `core` é conteúdo; mexer nele é decisão da dona, não de UI. |
| Mexer em `COPY_LIMITS` | O artboard desenha `38/70`, `21/60`, `96/400` — números **ilustrativos**. O dono dos limites é `core` (120/80/600/160/40), e ele vence. |
| Ligar qualquer evento | `PNL-06` da `42`: os 11 novos nascem desligados, e continuam. |
| Canal WhatsApp | Feature `43`. |
| Migration | Nenhuma coluna, nenhum `check`, nenhuma policy muda. |
| Ampliar `animacaoRespeitaMovimento.test.ts` ao painel inteiro | Dívida registrada no `CLAUDE.md`; os arquivos desta feature entram no escopo literal dele, o resto do painel não. |
| O bloco "Ver na loja" do artboard | Já declarado fora de escopo pela `55`; nenhuma AC o pede. |

---

## Edge cases

- **Nome longo em 390.** "Instruções de envio do material" ao lado de um interruptor de 44px: o nome
  embrulha, o interruptor **não** encolhe.
- **Trocar de seção com um card aberto.** O painel remonta (`AD-038`), o rascunho volta ao servidor,
  e nenhum card fica aberto — comportamento herdado, não novo.
- **Prévia carregando quando o card fecha.** A resposta pode chegar depois; ela já é descartada
  quando não é mais do evento pedido, e fechar o card zera a prévia.
- **Grupo com um evento só.** Hoje são 5/4/6, mas a contagem é derivada: `1 evento`, no singular.
- **`extra` com 5 linhas.** O card aberto cresce; o recolhido não muda de altura.
