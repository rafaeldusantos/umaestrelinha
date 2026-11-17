## TC-CFR-001: O editor de cor e o seletor de ícone funcionam só com teclado, a 200% de fonte e com alvos de 44 px

**Tipo:** cfr
**Prioridade:** P1
**Origem:** C-04, C-06 · exploratório — acessibilidade e usabilidade das telas alteradas
**Autor:** dev
**Persona:** PER-01 Adri, a dona
**Jornada:** J-01, passos 2–6
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** auditoria de teclado, árvore de acessibilidade e fonte grande — julgamento manual

### Objetivo

A dona consegue montar o destaque com a fonte do sistema aumentada ou só com teclado, e a recusa não depende de enxergar vermelho.

### Pré-condições

- Conta: `admin`
- Massa: item C (devolvido sem cor no fim)
- Estado de partida: editor do item C aberto

### Condições reais

| Dimensão    | Valor                                            |
| ----------- | ------------------------------------------------ |
| Dispositivo | desktop 1440 × 900; também 390 × 844            |
| Modalidade  | só-teclado                                       |

### Categoria

Acessibilidade · Usabilidade · Recuperação de erro

### Metas (observável · alvo · aceitável)

| Observável | Alvo | Aceitável |
| ---------- | ---- | --------- |
| seletor de ícone, campos de cor, hex, "Usar a cor padrão" e Salvar alcançáveis por Tab, com foco visível | todos | — |
| cada campo de cor com rótulo associado ("Na barra do computador…", "Na lista do celular…") na árvore | todos | — |
| a medida e a recusa em texto (não só cor), recusa anunciada (`alert`/`status`) | sim | texto presente, sem anúncio = `friction` |
| alvos do seletor de cor, hex e botões | ≥ 44 px | — |
| a 130% e 200% de fonte | nada cortado, sem rolagem horizontal | — |
| depois da recusa | o código digitado preservado | — |

### Passos

1. Só com teclado, escolhe um ícone do sistema pela busca e chega aos dois campos de cor
   - **Esperado:** tudo alcançável, foco visível, títulos dos grupos lidos na árvore
2. Digita uma cor ilegível e tenta salvar
   - **Esperado:** recusa em texto com a medida, anunciada; código preservado
3. Repete a 200% de fonte e a 390 × 844 (abas "Itens do menu" / "Prévia")
   - **Esperado:** metas acima atendidas

### Esperado e fonte

Controles de 44 px, `h-11`, `<Label htmlFor>`, medida "verde ≥ 4,5:1, vermelha abaixo, com a frase" — fonte: `plan.md` Design › Editor do item; `tasks/02` › Obrigações; `PROJECT.md` › 130% e 200% de fonte.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Esc no seletor | abrir o seletor e Esc | fecha; foco volta ao gatilho |
