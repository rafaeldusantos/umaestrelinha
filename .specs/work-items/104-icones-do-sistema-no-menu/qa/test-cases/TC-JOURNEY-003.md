## TC-JOURNEY-003: A cliente no computador acha o item destacado na barra e abre o painel dele sem perder a cor

**Tipo:** journey
**Prioridade:** P1
**Origem:** C-03, C-06
**Autor:** dev
**Persona:** PER-03 Cliente no computador
**Jornada:** J-03, passos 1–4
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** jornada pública determinística; pedido de automação E2E

### Objetivo

Na primeira visita pelo computador, a cliente acha o item destacado na barra e chega à página dele, sabendo o tempo todo onde está.

### Pré-condições

- Conta: `anonima`
- Massa: item A (Etiqueta, barra `#E8C77A`); item B (Presente, sem cor de barra, com submenu)
- Estado de partida: `/` na loja, 1440 × 900

### Condições reais

as da persona.

### Entrada

`http://localhost:8082/`, direta.

### Passos

| # | A persona… | Deve ver | Em até |
| - | ---------- | -------- | ------ |
| 1 | olha a barra | item A com a Etiqueta e rótulo `rgb(232, 199, 122)` | 3 s |
| 2 | passa o mouse em B | o painel abre; a régua de 2 px marca B | 5 s |
| 3 | passa o mouse em A | rótulo de A continua `rgb(232, 199, 122)` | 3 s |
| 4 | clica em A | a página do item A | 5 s |

### Objetivo e efeitos

A página do item A aberta pela barra. Efeitos: —

### Caminho de abandono

J-03a — abre o painel de B e sai por Tab (TC-FUNC-011, variação).

### Esperado e fonte

A barra desenha o ícone do sistema e o rótulo na cor da barra — fonte: `plan.md` C-03, C-06, Design › Loja.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| viewport enorme | 2560 × 1440 | ícone e rótulo alinhados |
| voltar | voltar do navegador depois do passo 4 | barra igual, sem painel preso aberto |
