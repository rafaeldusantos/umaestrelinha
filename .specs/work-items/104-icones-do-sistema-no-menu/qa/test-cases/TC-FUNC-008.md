## TC-FUNC-008: A cor do texto só aparece no item principal, nunca no item do submenu

**Tipo:** functional
**Prioridade:** P2
**Origem:** C-06
**Autor:** dev
**Persona:** PER-01 Adri, a dona
**Jornada:** n/a
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** presença/ausência do bloco por tipo de item; pedido de automação E2E

### Objetivo

A dona não perde tempo colorindo um filho que a loja nunca vai desenhar colorido.

### Pré-condições

- Conta: `admin`
- Massa: item B, com submenu
- Estado de partida: `/admin/menu` aberta

### Condições reais

as da persona.

### Passos

1. Abre o editor de um item do submenu de B
   - **Esperado:** sem o bloco "Cor do texto"
2. Abre o editor do item B
   - **Esperado:** com o bloco "Cor do texto" abaixo do ícone

### Esperado e fonte

A cor vale por item principal; submenu e "ver tudo em X" ficam no padrão — fonte: `plan.md` C-06 (P-04), Fora do escopo.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| item de link sem submenu | editor do item A | com o bloco "Cor do texto" |
