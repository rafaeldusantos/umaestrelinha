## TC-JOURNEY-002: A cliente no celular reconhece o item pelo ícone e pela cor e chega à página dele

**Tipo:** journey
**Prioridade:** P0
**Origem:** C-03, C-06
**Autor:** dev
**Persona:** PER-02 Cliente no celular
**Jornada:** J-02, passos 1–3
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** jornada P0 pública e determinística (depende da massa gravada pelo painel); pedido de automação E2E

### Objetivo

No celular — ≈90% dos acessos — a cliente vê o destaque que a dona fez e chega aonde queria com um toque.

### Pré-condições

- Conta: `anonima`
- Massa: item A com Etiqueta e lista `#8A5A2B` (CH-01)
- Estado de partida: `/` na loja, 390 × 844

### Condições reais

as da persona.

### Entrada

`http://localhost:8082/`, direta.

### Passos

| # | A persona… | Deve ver | Em até |
| - | ---------- | -------- | ------ |
| 1 | toca no menu | a folha aberta com os itens principais | 3 s |
| 2 | procura o item A | a Etiqueta ao lado do rótulo; rótulo com cor computada `rgb(138, 90, 43)` | 5 s |
| 3 | toca no item A | a página do item A | 5 s |

### Objetivo e efeitos

A página do item A aberta a partir da folha. Efeitos: —

### Caminho de abandono

J-02a — abre o acordeão de B e fecha pelo voltar do navegador (TC-FUNC-010, variação).

### Esperado e fonte

A folha do celular desenha o ícone do sistema e o rótulo na cor da lista — fonte: `plan.md` C-03, C-06, Design › Loja.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| alvo de toque | medir a linha do item A | altura ≥ 44 px, ícone não encolhe o alvo |
| viewport mínima | 320 × 568 | ícone e rótulo sem corte, sem rolagem horizontal |
| girar | 844 × 390 com a folha aberta | a cor e o ícone continuam |
