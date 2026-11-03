## TC-UI-002: A barra fixa com o conjunto e a linha "Acompanha o …" da gaveta conferem com o protótipo

**Tipo:** ui
**Prioridade:** P2
**Origem:** CA-04.9, CA-05.1
**Autor:** dev
**Persona:** PER-02 Adri
**Jornada:** n/a
**Charter:** CH-08
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** conferência visual; o comportamento já está em TC-FUNC-017 e TC-FUNC-018

### Objetivo

A barra e a sacola falam como o desenho aprovado.

### Pré-condições

- Conta: anonima
- Massa: M-01
- Estado de partida: 390 × 844

### Condições reais

390 × 844.

### Protótipo e tela

Claude Design, "Uma Estrelinha - Loja", `Produto - Compre Junto.html` (barra fixa e gaveta) × `/produtos/<slug de M-01>` e a gaveta.

### Propriedades a comparar

Barra sem e com conjunto (total, "Conjunto · N peças", sem PIX); gaveta: cabeçalho "Sacola · N peça(s)", linha com foto, nome, preço × quantidade, "Acompanha o <nomes>" (vírgulas e "e"), chips, `Gravação: “X”`, quantidade, "Remover"; rodapé "ou X no PIX · frete calculado no checkout".

### Passos

1. Conferir a barra sem e com conjunto
   - **Esperado:** igual ao protótipo
2. Levar o conjunto e conferir a gaveta
   - **Esperado:** igual ao protótipo; o nome do principal é o completo (CA-05.1 prevalece sobre o nome curto do protótipo)

### Esperado e fonte

Fonte: protótipo da loja; PRD CA-04.9, CA-05.1.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| sacola vazia | remove tudo | "Sua sacola está vazia" |
