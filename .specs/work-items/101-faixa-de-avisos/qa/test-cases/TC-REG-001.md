## TC-REG-001: O Banner principal da Home continua trocando a cada 6 s e pausando como antes

**Tipo:** regression
**Prioridade:** P2
**Origem:** RN-06
**Autor:** dev
**Persona:** PER-04 Rodrigo
**Jornada:** J-03, passo 1
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** depende de a Home local ter o Banner principal ligado; sem ele, `blocked` (não montar o banner para o teste)

### Objetivo

O giro da faixa é o mesmo do Banner principal, e o código dele mudou de lugar. O Rodrigo que chega na Home não pode ver o banner de campanha parado ou girando torto.

### Pré-condições

- Conta: `anonima`
- Massa: a Home local como está (só leitura); a faixa do manifesto
- Estado de partida: na Home, 1440 × 900

### Condições reais

as da persona

### O que mudou

O hook do giro (`useHeroCarousel`) desceu de `widgets/hero-carousel` para `shared/lib`, com o intervalo por parâmetro (spec PR-8, RN-06)

### Pontos de contato com outras jornadas

A faixa (acima do cabeçalho) e o Banner principal (no corpo da Home) giram na mesma página

### Passos

1. Observa o Banner principal por 20 s
   - **Esperado:** troca a cada ~6 s
2. Deixa o ponteiro sobre o banner por 10 s
   - **Esperado:** o banner para enquanto o ponteiro está lá; registrar o que a faixa faz ao mesmo tempo (a fonte não decide)
3. Usa as setas do banner
   - **Esperado:** trocam o slide

### Esperado e fonte

Fonte: PRD RN-06 ("o mesmo hook do Banner principal"); spec PR-8 ("o Banner principal ficou igual")

### Variações

| Variação | Ação | Esperado |
| --- | --- | --- |
| sem Banner principal na Home local | — | `blocked` com o motivo; não criar seção |
