## TC-FUNC-011: A barra fixa do celular mostra o mesmo total descontado do bloco

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-02.5
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, passo 3
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** —

### Objetivo

O botão que Marina toca no fim da tela promete o mesmo valor do bloco.

### Pré-condições

- Conta: `anonima`
- Massa: M-01
- Estado de partida: página de P em 390 × 844

### Condições reais

As da persona.

### Passos

1. Marcar a corrente avulsa e rolar até o bloco sair da tela
   - **Esperado:** a barra fixa com o total descontado e "Conjunto · 2 peças"
2. Comparar com o total do bloco
   - **Esperado:** o mesmo valor
3. Em 1440, olhar a nota do computador
   - **Esperado:** "A joia e 1 peça marcada · R$ X" com o total descontado

### Esperado e fonte

Fonte: `prd.md` CA-02.5; `spec.md` › Design › Loja — Bloco (barra fixa).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| desmarcar | desmarcar a corrente | a barra volta ao preço só da joia |
