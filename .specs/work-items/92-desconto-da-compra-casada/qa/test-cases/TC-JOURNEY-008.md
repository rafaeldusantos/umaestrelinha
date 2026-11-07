## TC-JOURNEY-008: No app do ateliê, a Adri vê o desconto do Compre Junto do pedido antes de separar

**Tipo:** journey
**Prioridade:** P1
**Origem:** CA-05.3
**Autor:** dev
**Persona:** PER-03 Adri (ateliê)
**Jornada:** J-06, passos 1–3
**Charter:** CH-07
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** determinística com o pedido de TC-JOURNEY-001; a ordem do app é a do painel (decisão Q-01, 2026-11-04)

### Objetivo

Provar que, no celular, a Adri chega ao pedido e vê o desconto e o Total iguais aos do painel, na mesma ordem.

### Pré-condições

- Conta: `admin-painel`
- Massa: o pedido de TC-JOURNEY-001 (ou um de M-07)
- Estado de partida: app do ateliê logado, aba Pedidos

### Condições reais

As da persona (390, toque, rede instável).

### Entrada

`http://localhost:8084/pedidos`.

### Passos com tempo

| # | A persona… | Deve ver | Em até |
| - | --- | --- | --- |
| 1 | toca no pedido | o detalhe | 5 s |
| 2 | lê o bloco de valores | na ordem Subtotal · "Desconto do Compre Junto − R$ X" · Desconto PIX · Frete · Total | 5 s |
| 3 | compara com o painel | o mesmo X, a mesma ordem e o mesmo Total | 20 s |

### Objetivo e efeitos

- O desconto e o Total do app = os do painel e da loja, na ordem do painel.

### Caminho de abandono

J-06a: a rede cai ao abrir; ao voltar, o detalhe com os mesmos valores.

### Esperado e fonte

Fonte: `prd.md` CA-05.3; `spec.md` › Design › App do ateliê (o padrão de `BlocoValores`/`BlocoItens`); decisão
Q-01 do Gate 1 (o Frete antes dos descontos no app é bug).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| fonte a 200 % | repetir | nenhuma linha cortada nem rolagem horizontal |
