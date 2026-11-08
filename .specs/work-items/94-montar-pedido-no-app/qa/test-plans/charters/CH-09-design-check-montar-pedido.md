# CH-09 · design-check — a montagem e o pedido montado contra `Montar Pedido.dc.html`

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | design-check                                                                  |
| Prioridade   | P1                                                                            |
| Persona      | PER-01 Adri no WhatsApp                                                       |
| Tour         | —                                                                             |
| Modo         | —                                                                             |
| Time-box     | 60 min · orçamento: 50 ações                                                  |
| Mudança      | as telas do app desenhadas no protótipo (UC-01..UC-09)                        |
| Viewport     | 390 × 844 (o frame do protótipo é celular)                                    |
| Entrada      | `/pedidos` · logada como `admin-atelie`                                       |
| Jornadas     | —                                                                             |
| TC           | TC-UI-001, TC-UI-002                                                          |

## Missão

Conferir, tela a tela, estrutura, texto, tipografia, cor, espaço e estados das telas novas do app contra o
protótipo `Montar Pedido.dc.html`, com o PRD e as Decisões da costura vencendo o protótipo onde divergem.

## Deve tentar

1. Listar os arquivos do projeto no MCP `claude-design` e ler `Montar Pedido.dc.html` (+ `montado-dados.js`) por partes, só as telas abaixo
2. Provocar os estados desenhados: barra com motivo, folha "Colar texto" com erro, CEP não achado, quantidade acima do estoque, cupom recusado, preço que mudou
3. Comparar o pedido montado nos estados Aberta, Expirada, Concluída e Cancelada

**Não são diferença** (decididos na costura — não registrar como achado): o rótulo "Aberta — vista pela
cliente" (D-35); a busca "Nome da joia" sem SKU (D-37); os textos do cupom "Cupom inválido." e "Cupom
válido apenas no primeiro pedido." (D-38); Renovar só na expirada, com a frase nova da folha (D-17); peça sem
foto no fundo areia com a estrela, não listrada (Divergências da costura); a folha de sair com "Guardar
rascunho" (D-18); a observação interna no Revisar e no pedido montado (D-30, D-36); artifícios do protótipo
(link constante, validade fixa, dados fictícios, leitura por regex).

## Edge cases sugeridos

- Estados vazios que o protótipo não desenha (Montados vazio, carregando): sem régua — registre "sem frame"
- 130 % de fonte só se o orçamento couber (o protótipo não tem frame para isso)

## Fora do escopo

- O painel (`Pedido - Montar.html` do projeto Backoffice): o WI mudou só o cartão do link e a caixa de endereço, cobertos funcionalmente no CH-07
- Telas pré-existentes do app (`Ateliê Admin.dc.html` é a base, não régua desta sessão)
- A loja (`/pedido-montado`, feature 89)

## Design

**Fonte de design:** Uma Estrelinha - Mobile Admin · `claude_design` · projeto `a780eec8-8aba-4d6e-8b4c-2c485e2750c7`, arquivo `Montar Pedido.dc.html` (+ `montado-dados.js`), no desenho de `Ateliê Admin.dc.html` — https://claude.ai/design/p/a780eec8-8aba-4d6e-8b4c-2c485e2750c7?file=Montar+Pedido.dc.html · de item.md › Insumos e prd.md. Sem o MCP `claude-design` na sessão ⇒ `not-run` por `design`.

| Tela do app (rota)                          | No design (frame, nó ou arquivo)                  | Viewports com frame | Estados a conferir                                              |
| ------------------------------------------- | ------------------------------------------------- | ------------------- | --------------------------------------------------------------- |
| `/pedidos?visao=montados`                   | `Montar Pedido.dc.html` › Pedidos · Montados       | 390                 | padrão · cada estado de cartão                                   |
| `/pedidos/montar` passo 1 (cadastrada e nova) | › Montar pedido — casca · Passo 1 · Cliente      | 390                 | padrão · busca sem resultado · e-mail com ficha · CEP não achado · barra com motivo |
| folha "Colar texto"                          | › Folha · Colar texto                             | 390                 | padrão · lendo · sem dados · fora do ar · aviso "Preenchi N de M" |
| `/pedidos/montar` passo 2 + folha da variação | › Passo 2 · Peças e folha da variação            | 390                 | padrão · esgotada · acima do estoque · gravação · material · sem foto |
| `/pedidos/montar` passo 3                     | › Passo 3 · Descontos                             | 390                 | padrão · cupom aplicado · cupom recusado · combinado · zera o pedido |
| `/pedidos/montar` passo 4                     | › Passo 4 · Revisar                               | 390                 | padrão · criando · preço que mudou                               |
| `/pedidos/montados/:id`                       | › Pedido montado (app) + folhas Descartar/Cancelar/Renovar | 390        | Aberta · Expirada · Concluída · Cancelada · sem telefone          |
