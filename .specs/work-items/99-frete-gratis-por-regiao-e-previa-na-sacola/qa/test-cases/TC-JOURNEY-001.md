## TC-JOURNEY-001: Luana calcula o frete na sacola pelo celular e chega ao checkout com o frete grátis e o mesmo Total

**Tipo:** journey
**Prioridade:** P0
**Origem:** CA-04, CA-09, CA-16 (jornada J-01)
**Autor:** dev
**Persona:** PER-01 Luana
**Jornada:** J-01, passos 1 a 7
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** caminho feliz da prévia de ponta a ponta; P0 e determinístico com a fixture

### Objetivo

A jornada inteira da prévia: ver o frete, ganhar o frete grátis dentro da região e chegar ao checkout sem redigitar e
com o mesmo Total.

### Pré-condições

- Conta: anonima
- Massa: Sul + Sudeste, R$ 450; peças para somar abaixo e acima de R$ 450; fixture A
- Estado de partida: aba nova, sacola vazia

### Condições reais

As da persona (390 × 844, toque).

### Entrada

`/` (loja), navegação interna até um produto.

### Passos com tempo

| # | A persona…                                      | Deve ver                                                    | Em até |
| - | ----------------------------------------------- | ----------------------------------------------------------- | ------ |
| 1 | põe uma peça abaixo da faixa e abre a gaveta     | "Faltam R$ X para o frete grátis", ⓘ, barra, campo de CEP   | 5 s    |
| 2 | calcula com 01310-100                           | opções, a mais barata marcada, Total com frete              | 5 s    |
| 3 | sobe a quantidade além de R$ 450                | "Frete grátis liberado"; PAC "Grátis" riscado; Total sem frete | 5 s |
| 4 | "Finalizar Pedido", Contato                      | Entrega com CEP, endereço, PAC marcado, "Trazido da sua sacola", foco no Número | 8 s |
| 5 | preenche o número e confere o Resumo             | "Frete · PAC" Grátis e o mesmo Total da gaveta              | 5 s    |

### Objetivo e efeitos

O Resumo do checkout com o frete grátis e o mesmo Total; nenhum pedido criado (para antes de pagar).

### Caminho de abandono

No passo 3 ela fecha a gaveta, navega pela loja e reabre: o CEP, a escolha e a faixa continuam como estavam (mesma
aba). Fechando a aba, o rascunho é esquecido (consequência aceita, PRD 97 RN-05).

### Esperado e fonte

PRD 97 UC-01..UC-04; PRD 99 UC-08, CA-16.

### Variações

| Variação         | Ação                       | Esperado                         |
| ---------------- | -------------------------- | -------------------------------- |
| 1440 × 900       | repete a jornada           | mesmo resultado, nada cortado    |

**Ajuste da rodada 1 (decisoes-produto.md, pergunta 1):** o "mesmo Total" entre a gaveta e o checkout é com o mesmo meio de pagamento — a gaveta não aplica desconto de meio; compare com o cartão escolhido no checkout (com o PIX pré-marcado, o checkout mostra o desconto PIX de 7 