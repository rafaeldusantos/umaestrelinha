## TC-FUNC-009: Com a loja no perfil Black Friday, a cor aceita para a barra continua legível

**Tipo:** functional
**Prioridade:** P2
**Origem:** C-07
**Autor:** dev
**Persona:** PER-01 Adri, a dona
**Jornada:** n/a
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** exige trocar o perfil de estilo da loja inteira e restaurar; a régua do Black Friday na recusa é de `labelColor.test.ts` (Validation)

### Objetivo

A dona que liga o perfil Black Friday na campanha não descobre depois que o item colorido sumiu na barra preta.

### Pré-condições

- Conta: `admin`
- Massa: item A com barra `#E8C77A` (CH-01); perfil Padrão
- Estado de partida: Configurações › Dados da loja, card "Perfil de estilo da loja"

### Condições reais

as da persona; a loja a 1440 × 900.

### Passos

1. Troca o perfil para Black Friday e salva
   - **Esperado:** perfil gravado
2. Abre a loja a 1440
   - **Esperado:** barra com o fundo do Black Friday (`#1C1A18`); o rótulo de A em `#E8C77A`, com contraste computado ≥ 4,5:1 contra a barra
3. Volta o perfil para Padrão e salva
   - **Esperado:** a loja volta ao fundo `#34495E`

### Esperado e fonte

A cor da barra tem de passar no Padrão e no Black Friday — fonte: `plan.md` C-07, Riscos ("Perfil Black Friday troca o fundo da barra").

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| folha no Black Friday | a loja a 390 no Black Friday | rótulo de A em `#8A5A2B` sobre branco, como no Padrão |
| recusa com o Black Friday ativo | no editor, barra `#8A5A2B` | recusada como no Padrão |
