## TC-FUNC-002: A busca do seletor acha ícones dos dois grupos por nome ou chave e esconde o grupo sem resultado

**Tipo:** functional
**Prioridade:** P1
**Origem:** C-04
**Autor:** dev
**Persona:** PER-01 Adri, a dona
**Jornada:** J-01, passo 3
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** filtro determinístico; pedido de automação E2E

### Objetivo

A dona que sabe o que quer ("etiqueta") chega direto ao ícone, venha ele da marca ou do sistema, sem rolar a grade inteira.

### Pré-condições

- Conta: `admin`
- Massa: item A; ao menos um ícone da marca conhecido pela chave (ex.: `gota-afetiva`)
- Estado de partida: seletor de ícone aberto

### Condições reais

as da persona.

### Passos

1. Busca "etiqueta"
   - **Esperado:** só o grupo "Do sistema", com a Etiqueta; o título "Da Uma Estrelinha" some com a grade dele; "Sem ícone" continua
2. Busca pela chave de um ícone da marca (ex.: `gota-afetiva`)
   - **Esperado:** só o grupo "Da Uma Estrelinha", com esse ícone; "Do sistema" some com o título
3. Busca um termo que casa com os dois grupos, ou limpa a busca
   - **Esperado:** os dois grupos com os títulos
4. Busca um termo sem resultado (ex.: "xyzw")
   - **Esperado:** a mensagem de nenhum resultado que já existia; "Sem ícone" continua

### Esperado e fonte

A busca por nome ou chave alcança os dois grupos; grupo sem resultado some; nenhum resultado mostra a mensagem existente; "Sem ícone" fora do filtro — fonte: `plan.md` C-04, Design › Seletor de ícone; `apps/backoffice/CLAUDE.md` › busca sem acento e sem caixa (`NAV-48`).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| sem acento | "coracao", "calendario", "duvida", "informacao" | acha Coração, Calendário, Dúvida, Informação |
| caixa trocada | "PORCENTAGEM" | acha Porcentagem |
| chave do sistema | `inicio`, `frete` | acha Início, Frete |
