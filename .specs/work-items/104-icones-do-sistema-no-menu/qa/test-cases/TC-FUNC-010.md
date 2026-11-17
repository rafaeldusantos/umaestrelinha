## TC-FUNC-010: Na lista do celular, o rótulo do item principal sai na cor da lista, no link direto e no acordeão

**Tipo:** functional
**Prioridade:** P1
**Origem:** C-03, C-06
**Autor:** dev
**Persona:** PER-02 Cliente no celular
**Jornada:** J-02, passo 4 e ramo J-02a
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** cor computada e ícone por item, determinísticos; pedido de automação E2E

### Objetivo

O destaque vale nos dois tipos de item da folha, e o que a dona não coloriu (os filhos) continua sóbrio — senão a lista vira uma colcha.

### Pré-condições

- Conta: `anonima`
- Massa: item A (Etiqueta, lista `#8A5A2B`, link direto); item B (Presente, lista `#8A5A2B`, com submenu)
- Estado de partida: `/` na loja, 390 × 844, folha aberta

### Condições reais

as da persona.

### Passos

1. Olha o item A (link direto)
   - **Esperado:** rótulo `rgb(138, 90, 43)`, Etiqueta ao lado; o ícone no tom dele (não herda a cor do rótulo — 🟡 do plano)
2. Olha o item B fechado e abre o acordeão
   - **Esperado:** rótulo `rgb(138, 90, 43)` fechado e aberto; o Presente ao lado; o chevron marca o aberto
3. Olha os filhos de B e o "ver tudo"
   - **Esperado:** na cor de hoje, sem ícone e sem a cor da dona

### Esperado e fonte

A loja desenha o rótulo na cor da superfície, no link direto e no acordeão; a pista de aberto é o chevron; submenu e "ver tudo" no padrão — fonte: `plan.md` C-06 (P-04, P-05), Design › Loja; `tasks/02` › Testes.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| J-02a | abrir o acordeão de B, voltar pelo navegador, reabrir a folha | folha coerente, rótulo de B na cor da lista |
| superfície certa | item A tem barra `#E8C77A` também | a folha usa `#8A5A2B`, nunca a cor da barra |
