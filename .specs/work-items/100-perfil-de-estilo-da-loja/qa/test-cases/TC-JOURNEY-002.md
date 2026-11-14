## TC-JOURNEY-002: Bia vai da Home ao checkout pelo celular com a loja de Black Friday

**Tipo:** journey
**Prioridade:** P0
**Origem:** RN-01, RN-03, RN-08
**Autor:** dev
**Persona:** PER-02 Bia
**Jornada:** J-03, passos 1 a 5
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** para antes de pagar; o veredito de cor sai das cores computadas

### Objetivo

A campanha existe para vender. Se o perfil novo atrapalhar a compra no celular, ele custa mais do que rende.

### Pré-condições

- Conta: `anonima`
- Massa: perfil salvo = Black Friday; produto com "de/por"; frete grátis ligado
- Estado de partida: `http://localhost:8082/`, sacola vazia

### Condições reais

As da persona (390 × 844, toque).

### Entrada

Direta, na Home.

### Passos com tempo

| # | A persona…                | Deve ver                                                   | Em até |
| - | ------------------------- | ---------------------------------------------------------- | ------ |
| 1 | abre a Home               | preto e ouro, os blocos de sempre                          | 4 s    |
| 2 | entra numa categoria      | cartões legíveis, "-X%" em ouro                            | 4 s    |
| 3 | abre o produto em oferta  | preço, parcelas e selo legíveis                            | 4 s    |
| 4 | põe na sacola             | a peça na sacola; barra do frete em ouro forte             | 3 s    |
| 5 | vai ao checkout           | os blocos do checkout legíveis; a peça no resumo           | 4 s    |

### Objetivo e efeitos

- **Objetivo:** Bia chega ao checkout com a peça, tudo legível no perfil Black Friday
- **Efeitos:** nenhum (não paga, não cria pedido)

### Caminho de abandono

J-03a — a loja estava aberta de antes da troca (TC-FUNC-007/008, CH-03).

### Passos

1. Percorre a tabela acima
   - **Esperado:** cada linha dentro do tempo e em preto e ouro

### Esperado e fonte

As telas da cliente no perfil Black Friday, legíveis, até o checkout — fonte: PRD RN-01, RN-03, RN-08.

### Variações

| Variação  | Ação                     | Esperado        |
| --------- | ------------------------ | --------------- |
| 1440      | a mesma jornada          | o mesmo         |
