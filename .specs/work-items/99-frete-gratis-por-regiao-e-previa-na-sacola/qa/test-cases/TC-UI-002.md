## TC-UI-002: O rodapé da sacola segue a v2 compacta: CEP numa linha, opções, linha recolhida, cupom, totais sem nota e botão de 48 px

**Tipo:** ui
**Prioridade:** P1
**Origem:** CA-01, CA-05, CA-08 (PRD 99 M-04, M-05, M-06, M-07)
**Autor:** dev
**Persona:** PER-01 Luana
**Jornada:** J-01, passos 1, 3 e 4
**Charter:** CH-07
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** conferência visual contra o protótipo

### Objetivo

O rodapé foi compactado para devolver espaço às peças; cada estado tem de seguir o desenho que fez essa economia.

### Pré-condições

- Conta: anonima
- Massa: uma peça; fixture A
- Estado de partida: gaveta aberta, sem CEP

### Condições reais

390 × 844.

### Passos

1. Confere o rodapé sem CEP, com "CEP inválido", com as opções abertas, com o frete recolhido, com o cupom recolhido
   - **Esperado:** cada estado como a v2

### Protótipo e tela

`Black Friday - Sacola v2.html` › rodapé × a gaveta sobre `/`.

### Propriedades a comparar

- Frete sem CEP: sem título; linha com 8px de intervalo, padding 10px 20px, borda inferior `line`; campo de 44px,
  borda `field`, raio sm, ícone de 18px `primary` a 12px da esquerda, placeholder "CEP para calcular o frete"; botão
  "Calcular" de 44px, contorno 2px `primary`, 13px 600; erro: borda `alert` e "CEP inválido" 12px `alert`
- Opções: cabeçalho 12,5px `ink-soft` "Frete para **01310-100** · São Paulo/SP" e "Trocar CEP" 13px 600 `primary`
  sublinhado; cartões de 52px de altura mínima, padding 8px 12px, borda 2px `line`, raio md; escolhido borda `ink`,
  fundo `ground`; valor 15px 700 `primary`; "Grátis" com o preço riscado 12px `ink-soft`
- Recolhido: 52px mínimo, padding 7px 20px; título 13,5/18 600; prazo + CEP 12/16 `ink-soft`; valor 14px 700 `primary`;
  chevron `ink-soft`
- Cupom recolhido: 44px, "Tem um cupom?" 13,5px 500 e chevron
- Totais: 12,5px/18, 3px entre linhas; "Total" 16px 700 e valor 18px 700; **nenhuma nota abaixo do Total**
- Botão "Finalizar Pedido": 48px, raio md, `primary`, 15px 700, ícone de sacola de 20px
- Rodapé ~244 px sem CEP e ~265 px com CEP (medidas do `item.md`)

### Esperado e fonte

Os valores acima — fonte: `spec.md` › Design › "O bloco do frete no rodapé", "Cupom recolhido", "Totais", "Finalizar
Pedido"; PRD 99 M-04..M-07.

### Variações

| Variação               | Ação                             | Esperado                                          |
| ---------------------- | -------------------------------- | ------------------------------------------------- |
| Linhas de desconto     | com um cupom de valor aplicado    | as linhas de desconto de hoje continuam — não é diferença (a v2 não as desenha) |
