## TC-UI-003: Confirmação, Minha conta, painel do pedido e app do ateliê mostram o desconto em 390 sem rolagem horizontal

**Tipo:** ui
**Prioridade:** P2
**Origem:** RNF-05
**Autor:** dev
**Persona:** PER-05 Sônia
**Jornada:** J-01, passo 7; J-03, passo 6
**Charter:** CH-08
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** o painel do pedido e o app são abertos com `admin-painel` só para a medida; a régua da ordem das linhas do resumo é o painel (decisão Q-01, 2026-11-04)

### Objetivo

As telas do pedido que ganharam linhas novas continuam legíveis no celular com fonte grande, todas na mesma ordem.

### Pré-condições

- Conta: `anonima`, `cliente-loja` e `admin-painel` (só leitura)
- Massa: o pedido de TC-FUNC-013 (linha mista) e o de TC-JOURNEY-004 (cupom)
- Estado de partida: pedidos gravados

### Condições reais

| Dimensão    | Valor                                            |
| ----------- | ------------------------------------------------ |
| Dispositivo | celular (390 × 844), fonte 100 % e 200 %         |
| Rede        | rápida                                           |
| Locale      | pt-BR                                            |
| Modalidade  | toque                                            |

### Protótipo e tela

`Pedido - Desconto do Compre Junto.html` (Confirmação · Minha conta) · `/pedido/:id`, `/conta`; painel do pedido e
app do ateliê sem frame. A ordem das linhas do resumo segue o painel, não o protótipo.

### Propriedades a comparar

`scrollWidth` ≤ 390; a linha "Desconto do Compre Junto − R$ X", as duas linhas da peça e o "de/por" de cada uma
inteiros; nas quatro telas, a ordem Subtotal · descontos · Desconto PIX · Frete · Total.

### Passos

1. Medir `/pedido/:id` e `/conta` a 100 % e 200 %
   - **Esperado:** sem rolagem horizontal; a ordem do painel
2. Medir o painel do pedido e o detalhe no app a 100 % e 200 %
   - **Esperado:** sem rolagem horizontal; a mesma ordem nas quatro telas

### Esperado e fonte

Fonte: `prd.md` RNF-05; decisão Q-01 do Gate 1.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| 130 % | medir | o mesmo |
