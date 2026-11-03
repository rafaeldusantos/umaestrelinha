## TC-JOURNEY-001: No celular, a cliente monta pingente e corrente da lista e leva o conjunto pela barra fixa

**Tipo:** journey
**Prioridade:** P0
**Origem:** CA-03.3, CA-03.7, CA-04.1, CA-04.2, CA-04.9, RNF-01
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, passos 1–6
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** caminho feliz P0 da loja, determinístico com M-01/M-02; pedido de automação em 390 × 844

### Objetivo

A cliente sai da página com a joia e a corrente na sacola, como o bloco e a barra prometeram, sem sair da página.

### Pré-condições

- Conta: anonima
- Massa: M-01 com o adicional A1 = lista "Correntes" (M-02)
- Estado de partida: sacola vazia

### Condições reais

As da persona (390 × 844, toque).

### Entrada

Deep link `/produtos/<slug de M-01>`, anônima.

### Passos com tempo

| # | A persona… | Deve ver | Em até |
| - | ---------- | -------- | ------ |
| 1 | abre a página | bloco com nada marcado | 4 s |
| 2 | escolhe a variação do pingente | o bloco sem seletor do principal | 5 s |
| 3 | marca "Correntes" | peças na ordem da lista, nenhuma escolhida | 5 s |
| 4 | escolhe peça e comprimento | total e PIX do conjunto no bloco | 10 s |
| 5 | olha a barra fixa | total e "Conjunto · 2 peças", botão "Levar o conjunto" | 3 s |
| 6 | toca "Levar o conjunto" | gaveta aberta com as duas linhas | 4 s |

### Objetivo e efeitos

Gaveta aberta com o pingente (variação escolhida) e a corrente (peça e comprimento escolhidos, quantidade 1, "acompanha o <nome completo do pingente>"). A sacola persiste ao recarregar.

### Caminho de abandono

Marcar a corrente sem o comprimento e tocar a barra: nada entra, a página rola até o adicional e diz a escolha que falta (TC-FUNC-005).

### Esperado e fonte

O conjunto da barra = o conjunto do bloco — fonte: PRD UC-03, UC-04, CA-04.9; protótipo da loja (barra fixa).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| voltar depois do sucesso | fecha a gaveta e volta no navegador | nada duplicado; o bloco não refaz a ação |
| duplo toque | dois toques em "Levar o conjunto" | sem linhas duplicadas além do esperado da soma |
