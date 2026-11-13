## TC-UI-001: No cartão com cores, as miniaturas ficam acima da faixa e trocam a foto sem navegar

**Tipo:** ui
**Prioridade:** P1
**Origem:** CA-11
**Autor:** dev
**Persona:** PER-02 Marina
**Jornada:** J-03, passo 4
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** medida de layout e toque — a Validation provou só a forma (jsdom não mede layout)

### Objetivo

A faixa da campanha não tira da cliente a escolha de cor no cartão, que é o que ela toca primeiro.

### Pré-condições

- Conta: `anonima`
- Massa: M-D (3+ cores) marcada em 20 % na Black Friday
- Estado de partida: `/ofertas`

### Condições reais

| Dimensão    | Valor |
| ----------- | ----- |
| Dispositivo | celular (390 × 844); computador (1440 × 900) |
| Modalidade  | toque; mouse |

### Passos

1. Acha o cartão de M-D
   - **Esperado:** as miniaturas no canto inferior esquerdo, **acima** da faixa (10 px de folga no celular, 12 px a partir de 768), sem sobrepor; 1 miniatura + "+N" no cartão de ~173 px
2. Toca numa miniatura de outra cor
   - **Esperado:** a foto do cartão troca; a página **não** navega
3. Repete em 1440 × 900
   - **Esperado:** 2 miniaturas + "+N" no cartão de ~220 px, acima da faixa; o clique troca a foto

### Esperado e fonte

As miniaturas sobem para cima da faixa, sem mudar tamanho nem quantidade, e continuam trocando a foto — fonte: PRD
CA-11, RN-13; `spec.md` › Cartão com miniaturas de cor.

### Protótipo e tela

`Black Friday - Selo v2.html` › `Cartao`, `Cores` · a grade de `/ofertas`

### Propriedades a comparar

distância das miniaturas ao pé da foto (40 px celular, 42 px ≥ 768), tamanho (40/45 px), espaçamento (6 px),
14 px da esquerda, a faixa com 30 px

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| peça comum com cores | um cartão de peça não marcada | miniaturas a 14 px do pé, como antes |
| alvo de toque | toca no "+N" | comportamento de antes (não navega por engano) |
| 768 × 1024 | cartão no tablet | miniaturas de 45 px acima da faixa |
