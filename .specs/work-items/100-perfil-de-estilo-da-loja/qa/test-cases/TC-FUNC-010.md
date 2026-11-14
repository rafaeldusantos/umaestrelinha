## TC-FUNC-010: No Black Friday a barra do frete grátis da sacola é preenchida em ouro forte

**Tipo:** functional
**Prioridade:** P1
**Origem:** RN-01 (a exceção do desconto)
**Autor:** dev
**Persona:** PER-02 Bia
**Jornada:** J-03, passo 4
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** precisa do frete grátis ligado no banco local (manifesto do Ambiente)

### Objetivo

A barra mostra quanto falta para o frete grátis. Se ela some no fundo, a cliente perde o motivo para levar mais uma peça.

### Pré-condições

- Conta: `anonima`
- Massa: perfil salvo = Black Friday; frete grátis ligado com uma faixa; uma peça abaixo da faixa
- Estado de partida: página do produto

### Condições reais

As da persona.

### Passos

1. Põe a peça na sacola
   - **Esperado:** a gaveta abre; a barra parcial preenchida com `#9A7A45` (sale-bar)
2. Procura na sacola um chip ou selo de desconto
   - **Esperado:** nenhum elemento de desconto com fundo `#1C1A18` ou `#34495E` (spec H4: não há chip com fundo
     `primary`; registre o que existir)

### Esperado e fonte

Preenchimento da barra do frete grátis em `accent-strong` no Black Friday — fonte: PRD RN-01; spec H2, H4; spec ›
Design (divergência 2: barra em accent-strong).

### Variações

| Variação             | Ação                                   | Esperado                                         |
| -------------------- | -------------------------------------- | ------------------------------------------------ |
| acima da faixa       | aumenta a quantidade até passar         | a barra completa, ainda `#9A7A45`                |
| a sacola em `/carrinho` | abre a página do carrinho             | se houver barra lá, a mesma cor                  |
| 1440 × 900           | repete                                 | o mesmo                                          |
