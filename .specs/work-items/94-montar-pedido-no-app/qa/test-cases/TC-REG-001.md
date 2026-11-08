## TC-REG-001: A lista de Pedidos e os recortes de antes seguem iguais, e a barra de abas some só nas telas novas

**Tipo:** regression
**Prioridade:** P1
**Origem:** UC-01 (D-06, D-23)
**Autor:** dev
**Persona:** PER-02 Adri interrompida
**Jornada:** n/a (canário de J-04)
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a visão Montados entrou no mesmo endereço de Pedidos (`pedidosHref`)

### Objetivo

Acrescentar Montados não muda o que a Adri já usava em Pedidos.

### Pré-condições

- Conta: `admin-atelie`
- Massa: pedidos em "Precisa de ação" e na fila de material
- Estado de partida: `/pedidos`

### Condições reais

As da persona.

### O que mudou

O chip "Montados" ao fim, a busca que some nessa visão, as rotas `/pedidos/montar` e `/pedidos/montados/:id` sem a barra de abas.

### Pontos de contato com outras jornadas

A lista de pedidos (feature 74), o detalhe (`/pedidos/:id`) e o selo da aba.

### Passos

1. Troca entre os chips de antes
   - **Esperado:** as mesmas listas e a mesma busca de antes; a URL `?visao=` de cada um
2. Vai a Montados e volta a "Precisa de ação"
   - **Esperado:** a busca volta; a lista de pedidos volta
3. Abre `/pedidos/montar` e `/pedidos/montados/<id>`
   - **Esperado:** sem barra de abas; em `/pedidos` e `/pedidos/:id`, a barra como antes

### Esperado e fonte

Fonte: spec D-06 (Montados fora de `ORDER_VIEWS`), D-23 ("sem tirar nenhum chip de hoje"); `apps/mobile-adm/CLAUDE.md` › rotas.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| voltar de Montados | `history.back` | o chip anterior |
