## TC-UI-002: A linha mista e a linha do desconto cabem na gaveta e no checkout em 390 × 844 a 100 %, 130 % e 200 %

**Tipo:** ui
**Prioridade:** P1
**Origem:** RNF-05
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, passos 4–5 e ramo J-01b
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** —

### Objetivo

No dinheiro, no celular, nada se esconde nem se encavala.

### Pré-condições

- Conta: `anonima`
- Massa: M-01; a linha mista de TC-FUNC-013
- Estado de partida: gaveta aberta

### Condições reais

| Dimensão    | Valor                                            |
| ----------- | ------------------------------------------------ |
| Dispositivo | celular (390 × 844)                              |
| Rede        | rápida                                           |
| Locale      | pt-BR                                            |
| Modalidade  | toque                                            |

### Protótipo e tela

`Produto - Compre Junto com desconto.html` (sacola) e `Pedido - Desconto do Compre Junto.html` (Checkout · resumo) ·
gaveta, `/carrinho`, `/checkout`.

### Propriedades a comparar

`scrollWidth` do `body` ≤ 390; "Acompanha o … · 15% a menos" e "1 com desconto, 1 a preço cheio" sem sobrepor o
valor; o "de/por" à direita sem cortar; o CTA fixo do checkout sem cobrir o Total; os controles de quantidade e de
remover com alvo ≥ 44 px.

### Passos

1. Medir a gaveta e `/carrinho` a 100 %, 130 % e 200 %
   - **Esperado:** sem rolagem horizontal; textos inteiros
2. Medir o resumo do checkout nas três fontes
   - **Esperado:** o mesmo; o Total visível acima do CTA

### Esperado e fonte

Fonte: `prd.md` RNF-05.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| nome de joia longo | "Acompanha o {nome longo}" | quebra em linhas dentro da coluna, sem estourar |
