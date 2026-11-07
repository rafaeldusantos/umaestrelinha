## TC-UI-004: O bloco e a sacola com desconto conferem com o protótipo "Produto - Compre Junto com desconto"

**Tipo:** ui
**Prioridade:** P2
**Origem:** exploratório — conferência contra o protótipo do `prd.md` › Expectativas de UI/UX (CA-02.1..02.3, CA-03.3, CA-03.8)
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** n/a
**Charter:** CH-09
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** sem o MCP do Claude Design, `not-run`; a faixa que rola dentro das peças da lista é exigida (decisão Q-02, 2026-11-04) — a ausência dela é bug, não desvio declarado

### Objetivo

O que Marina vê no bloco e na sacola é o que foi desenhado e aprovado.

### Pré-condições

- Conta: `anonima`
- Massa: M-01 (lista com 3 ou mais correntes)
- Estado de partida: página de P

### Condições reais

Os viewports dos frames (390 e 1440).

### Protótipo e tela

Claude Design, projeto `69224d8a-17ae-4b1f-a251-a8105b41edc2`, `Produto - Compre Junto com desconto.html` ·
`/produtos/:slug` (bloco, a faixa da lista, barra fixa) e a gaveta.

### Propriedades a comparar

Estrutura e texto literal ("{N}% a menos levando junto", "Desconto do Compre Junto", a nota), tipografia e cor do
riscado e do preço levando junto, espaço da linha da peça (foto 64 × 80, caixa 44); **a faixa das peças da lista**:
rola dentro dela, tamanho e espaço dos cartões, o "de/por" em cada cartão, sem a frase; o rodapé da sacola (Subtotal ·
Desconto do Compre Junto · Total · "ou R$ Z no PIX · frete calculado no checkout"), a frase da volta.

### Passos

1. Ler o frame do bloco e comparar com a página em 390 e 1440
   - **Esperado:** igual, ou cada diferença registrada com design × observado
2. Ler o frame da faixa da lista e comparar com a escolha da lista na página
   - **Esperado:** a faixa existe e rola dentro dela; cada diferença registrada; a grade no lugar da faixa é achado
3. Ler o frame da sacola e comparar com a gaveta
   - **Esperado:** igual, ou diferenças registradas

### Esperado e fonte

Fonte: o protótipo; decisão Q-02 do Gate 1 (a faixa é exigida); o PRD prevalece onde os dois divergem (o "Selo"
descartado, as frases tiradas em H-03, o artifício do percentual guardado na linha).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| "Chaveiro" | a variação que tira as correntes | o estado do frame, se desenhado |
