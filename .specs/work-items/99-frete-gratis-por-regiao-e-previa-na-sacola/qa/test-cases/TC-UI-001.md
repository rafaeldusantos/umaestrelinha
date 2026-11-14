## TC-UI-001: A faixa do frete grátis segue a v2 nos quatro desenhos, com o ⓘ

**Tipo:** ui
**Prioridade:** P1
**Origem:** CA-14, CA-15, CA-16, CA-17 (PRD 99 M-01, M-02, M-03)
**Autor:** dev
**Persona:** PER-01 Luana
**Jornada:** J-01, passos 1 a 5; J-02, passos 1 e 2
**Charter:** CH-07
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** conferência visual contra o protótipo

### Objetivo

A faixa é a primeira coisa que Luana lê na gaveta; ela tem de ocupar o que a v2 desenhou e diferenciar os estados como
o protótipo.

### Pré-condições

- Conta: anonima
- Massa: Sul + Sudeste, R$ 450; fixture A
- Estado de partida: gaveta aberta

### Condições reais

390 × 844.

### Passos

1. Provoca os quatro desenhos (abaixo sem CEP; acima sem CEP; acima com 01310-100; com 40020-000) e abre o ⓘ num deles
   - **Esperado:** cada um como o frame da v2

### Protótipo e tela

`Black Friday - Sacola v2.html` (Claude Design, projeto `4abe021d-d77e-4fe7-affd-524180315fa3`) × a gaveta sobre `/`.

### Propriedades a comparar

- Abaixo da faixa: fundo `ground-deep`, padding 9px 20px 11px, 7px entre linha e barra; texto 12,5px/18, 600, `primary`;
  valor/faixa 11px, 500, `ink-soft`; barra de 5px, trilho branco, preenchimento `primary`, raio 999
- Alcançada (sem CEP e liberado): fundo `accent`, padding 10px 20px, sem barra; selo de 20px (`ink` com ✓ `accent`);
  texto 13px, 700, `ink`
- Fora: fundo `ground-deep`, padding 10px 20px, sem barra, texto 12,5px, 500, `ink-soft`
- ⓘ: círculo de 17px, contorno 1,5px na cor do texto, "i" 10,5px 700, 6px depois do texto; balão `ink` com texto
  `on-primary`, 12,5px/18, raio md, padding 10px 12px, a 12px de cada borda da gaveta
- Altura da faixa ~55 px (medida do `item.md`, régua de apoio)

### Esperado e fonte

Os valores acima — fonte: `spec.md` › Design › "A faixa do frete grátis" e "O ⓘ", lidos do protótipo v2.

### Variações

| Variação          | Ação                          | Esperado                                   |
| ----------------- | ----------------------------- | ------------------------------------------ |
| Sem frame 1440    | em 1440 × 900                 | registrar "sem frame para 1440", não comparar |
