# Montar pedido no app do ateliê — planejamento do protótipo

**Protótipo:** `Montar Pedido.dc.html` (este projeto). **Base:** a feature `89` (pedido montado pelo painel,
`AD-070`/`AD-071`) e o desenho `Pedido - Montar.html` do projeto *Uma Estrelinha - Backoffice*.
**Estado:** só planejamento e protótipo. Nada implementado.

## O que muda em relação à 89

A spec da `89` deixou "Proposta pelo app do ateliê" fora de escopo ("montar sacola é tela de
computador"). Este planejamento revoga essa linha: a venda nasce no WhatsApp, no celular, e a Adri quer
montar ali mesmo. O que **não** muda — e o app herda sem reescrever:

- A montagem cria uma **proposta**, não um pedido (`A-01`). O pedido nasce quando a cliente conclui no
  link, pela function `checkout` — o dono único do pedido continua um só.
- A conta é `resolveOrderPricing` (promoção → cupom → desconto combinado → PIX informativo), o cupom é
  `validateCoupon`, o preço é travado ao gravar e o servidor recalcula (`PRC-01`/`PRC-02`).
- A gravação é pela function de admin `order-proposals` — nunca escrita PostgREST do app
  (`escritaSoPelaPorta`).
- Link de 7 dias, token no fragmento, WhatsApp pelo `whatsappChatUrl`, a mensagem da `LNK-02` emendada.
- A aba "Montados" e os estados (Aberta, Vista pela cliente, Concluída, Expirada, Cancelada).

## O que é novo

1. **Montar pedido no app** — botão no topo de Pedidos, montagem em tela cheia em 4 passos (Cliente ·
   Peças · Descontos · Revisar), barra de baixo com o total e o botão, motivo escrito quando ele está
   bloqueado (`MON-12`).
2. **Visão "Montados" em Pedidos** e a **tela do pedido montado** (link, WhatsApp, copiar, histórico,
   editar, renovar, cancelar).
3. **Ler os dados de uma mensagem** — a Adri cola a conversa; um agente com `claude-haiku-5-5` extrai
   nome, e-mail, telefone, CPF e endereço, e preenche os campos. O resto da montagem fica igual.
4. **A foto de cada peça** onde a Adri escolhe e confere: o catálogo, a sacola, a folha da variação,
   a revisão e o pedido montado.

## Comportamentos (o protótipo mostra cada um)

### Pedidos · Montados
- "Montar pedido" ao lado do título. A visão "Montados · N abertos" entra nos chips de Pedidos.
- Cartão: número `P-0000`, estado, cliente, "Montado há 2 dias · vale até 05/11" (ou "Virou o pedido
  #0262" / "Venceu em…"), total dos itens e as peças.

### Passo 1 · Cliente
- Segmento **Cliente cadastrada | Cliente nova**.
- Cadastrada: busca por nome, e-mail ou telefone (inclui convidadas). Escolhida, a entrega vem no
  endereço padrão; opções: outro salvo, **Outro endereço** (digitar ou "Colar de uma mensagem") ou **A
  cliente preenche no link**.
- Nova: cartão escuro "Tem os dados numa mensagem?" → **Colar texto da conversa**. Campos de contato
  (nome, e-mail, WhatsApp, CPF opcional) e de entrega; "Salvar no cadastro da cliente".
- E-mail que já tem ficha (digitado ou lido) → "já é de Juliana Prates · 2 pedidos" com **Usar a ficha
  dela** / **Corrigir o e-mail** (`MON-03`). Usar a ficha guarda o endereço lido como "Outro endereço".
- CEP com 8 dígitos completa rua, bairro, cidade e UF pelo serviço da loja; CEP desconhecido diz isso.

### Ler os dados de uma mensagem (IA)
- Folha com a área de texto (até 2.000 caracteres, "O texto não fica guardado.") e **Ler o texto**.
- Escopo: em Cliente nova, lê contato + endereço; em "Outro endereço" de cliente cadastrada, lê **só o
  endereço** — nunca troca dados de uma ficha que existe.
- Durante a leitura: botão "Lendo o texto…" desligado. Depois: a folha fecha, os campos se preenchem e
  cada um diz **"Lido do texto — confira."**; editar o campo tira a marca.
- Aviso no topo: "Preenchi 7 de 11 campos. Confira antes de seguir. Não achei: e-mail, CPF,
  complemento. O CEP conferiu rua, bairro e cidade." com **Ler outro texto** e **Desfazer** (volta
  exatamente ao estado anterior).
- O CEP manda: quando o serviço conhece o CEP, rua/bairro/cidade/UF vêm dele, não do texto.
- Texto sem dados: a folha fica aberta — "Não encontrei nome, contato nem endereço neste texto…" e o
  botão secundário vira **Preencher à mão**.
- Leitura fora do ar (timeout, 5xx, sem chave): "A leitura está fora do ar agora. Feche e preencha à
  mão — nada do que você já fez se perde." A montagem nunca depende da IA.
- Nada é gravado pela leitura: a ficha e o endereço só nascem ao **Criar link**.

### Passo 2 · Peças
- Busca do dono único (`AD-036`). Cada linha: a **foto de capa** (retrato 4:5) e "a partir de R$ … · N
  em estoque · pede material".
- Folha da variação: **foto grande da variação escolhida**, que troca a cada toque (imagem por
  variação, feature `81`; sem foto própria, usa a capa); chips com **miniatura** e estoque (esgotada
  desligada), promoção vigente, quantidade (acima do estoque → "Só há 3 em estoque." e botão
  desligado), gravação só se a peça aceita (mesmo teto), aviso de material, botão "Acrescentar · R$
  378,00". Editar reabre a mesma folha com "Salvar".
- Na sacola, cada linha mostra a foto da variação escolhida — a mesma que a cliente verá no link.
- Peça sem foto cadastrada: o quadro fica no fundo areia (`ground-deep`), como o card da loja — nunca um
  ícone no lugar.

### Passo 3 · Descontos
- Cupom com a regra e os textos da loja, considerando a cliente (`first_order_only`).
- Desconto combinado (R$ ou %) com motivo obrigatório (120, interno). Itens abaixo de R$ 1,00 → "O
  desconto não pode zerar o pedido." e o desconto não entra na conta (o total nunca fica negativo).
- Resumo vivo + "No PIX: … nos itens".

### Passo 4 · Revisar
- As **peças vêm primeiro**, cada uma com a foto da variação: a conferência final é visual. Depois,
  cliente ("Ficha nova · criada com o link") e entrega + prévia da cotação ("A cliente escolhe a entrega
  no link"), cada bloco com "Alterar".
- **Criar link** → "Criando o link…". Preço que mudou no servidor → recusa com o texto da `PRC-02` e o
  resumo relido.

### Pedido montado
- Cartão escuro com o link, **Enviar pelo WhatsApp** (só com telefone) e **Copiar link**; sem telefone,
  "Sem telefone — copie o link." A mensagem do WhatsApp aparece escrita.
- As peças aparecem com a foto, como na revisão.
- Copiar/WhatsApp registram "Link enviado · canal" no histórico.
- Aberta: Editar, Renovar prazo (folha de confirmação; o link antigo morre), Cancelar (folha, `inkSolid`).
  Expirada: Renovar. Concluída: "Ver o pedido #0262".
- Fechar a montagem com algo preenchido pede confirmação ("Nada foi gravado ainda").

## Plano técnico (para a spec)

| Peça | Onde | Nota |
| --- | --- | --- |
| Leitura do texto | edge function nova `customer-parse` | `_shared/claude*.ts` da `84`, `claude-haiku-5-5`, saída por *tool use* com esquema fixo, `has_role` antes de tudo, limite por conta, texto nunca em log. Mesmo molde de `seo-suggest`. Nasce já pronta para um segundo consumidor (o Backoffice, depois) |
| Conferência da saída | `packages/core/src/customers/parse.ts` (novo) | máscaras (`maskPhone`, `maskCep`), dígito do CPF, e-mail; o que não passa vira vazio. Dono único, lido pela function e testado sem IA |
| Fotos das peças | a mesma leitura de capas da montagem do Backoffice (`useProductCovers`, `AD-071`) e a imagem por variação da `81` | URL pela rendição de `core/media/rendition.ts` no tamanho da vaga (nunca montada à mão, `renditionSingleOwner`); a sacola e a revisão usam a foto da variação com recuo para a capa |
| Regras da montagem | `core/proposals`, `core/coupons/rules`, `payment/pricing` | já existem pela `89`; o app só chama |
| Gravação | function `order-proposals` | já existe; o app passa pela porta `gravarAcao`/`conferirPapel` (molde da `75`) |
| Telas | `apps/mobile-adm` — `features/order-proposal`, `pages/MontarPedidoPage`, `pages/PropostaPage`, visão em `PedidosPage` | o desenho e os guardas do app (tom memorial, `motion-reduce`, 44px, sem dado de cliente no aparelho) |

## Decisões (2026-11-02)

- **Política de Privacidade:** não entra nesta feature.
- **"Colar texto" no Backoffice:** sim, numa feature seguinte. Esta entrega é só o app; a function e a
  regra de `core` já nascem compartilháveis para o painel não precisar de uma segunda escrita.
- **Fotos das peças:** na seleção (catálogo, folha da variação, sacola) e na revisão, para a Adri
  conferir visualmente; também no pedido montado.

## Pergunta em aberto

1. **"Pedido manual" é a proposta com link, ou também um pedido já pago fora do Mercado Pago?** O
   protótipo assume a proposta (a `89` deixou "pagamento registrado pelo painel" fora, por conciliar
   de outro jeito). Se for o segundo, é outra feature.

---
Fonte: Claude Design, projeto "Uma Estrelinha - Mobile Admin" (`a780eec8-8aba-4d6e-8b4c-2c485e2750c7`), arquivo `prompts/PRD - Montar pedido no app.md`, etag `1793640158134118`, copiado em 2026-11-02.
