## TC-FUNC-007: "Usar a cor padrão" devolve o rótulo ao padrão no painel e na loja

**Tipo:** functional
**Prioridade:** P1
**Origem:** C-06
**Autor:** dev
**Persona:** PER-01 Adri, a dona
**Jornada:** J-01, ramo J-01c
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** caminho de saída do destaque, determinístico; pedido de automação E2E

### Objetivo

Acabada a campanha, a dona tira a cor sem ter de lembrar qual era a de antes — e a loja volta a ser o que era.

### Pré-condições

- Conta: `admin`
- Massa: item C
- Estado de partida: item C gravado com cor válida nas duas superfícies (ex.: barra `#E8C77A`, lista `#8A5A2B`), conferida na loja

### Condições reais

as da persona; a loja a 1440 e 390.

### Passos

1. Clica "Usar a cor padrão" na barra e na lista, e salva
   - **Esperado:** os campos voltam ao estado sem cor; gravado
2. Recarrega e reabre o item C
   - **Esperado:** sem cor nas duas
3. Confere a loja a 1440 e a 390
   - **Esperado:** rótulo de C na barra com a cor de hoje (`#F7F3EC` no Padrão) e na folha com a cor de hoje (`ink`/`primary`)

### Esperado e fonte

Cor não escolhida naquela superfície = como hoje; "Usar a cor padrão" no editor — fonte: `plan.md` C-06, Design › Editor do item e › Loja ("Sem cor, as classes de hoje").

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| só uma superfície | "Usar a cor padrão" só na barra | barra como hoje; lista mantém a cor |
| sem salvar | "Usar a cor padrão" e trocar de item sem salvar | nada muda no gravado |
