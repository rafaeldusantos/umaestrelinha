## TC-CFR-001: Em 390, o bloco não cria rolagem lateral e cada controle tem pelo menos 44px, mesmo com nomes longos e fonte a 200%

**Tipo:** cfr
**Prioridade:** P1
**Origem:** CA-03.11, RNF-01
**Autor:** dev
**Persona:** PER-03 Helena
**Jornada:** J-01
**Charter:** CH-07
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** a única prova que a Validation deixou para o navegador (jsdom devolve 0 para layout)

### Objetivo

No celular, que é ~90% dos acessos, o bloco cabe na tela e é tocável.

### Pré-condições

- Conta: anonima
- Massa: M-06 (três adicionais de nome longo)
- Estado de partida: sacola vazia

### Condições reais

390 × 844 a 100%, 130% e 200% de fonte; 320 × 568; 768 × 1024; 1440 × 900.

### Categoria

Compatibilidade (viewport) e acessibilidade (alvo de toque).

### Metas

| Observável | Alvo | Aceitável |
| ---------- | ---- | --------- |
| `scrollWidth` do body em 390 | = 390 | = 390 |
| altura e largura de toque de cada caixa, link de opções, cartão de peça, variação e botão do bloco e da barra | ≥ 44 px | ≥ 44 px |
| texto do bloco com fonte a 200% | quebra de linha sem corte nem sobreposição | idem |

### Passos

1. Abrir M-06, marcar os três adicionais e abrir as escolhas, a 100%, 130% e 200%
   - **Esperado:** sem rolagem horizontal do body; nada sobreposto; botão alcançável
2. Medir os alvos de toque
   - **Esperado:** todos ≥ 44 px

### Esperado e fonte

Fonte: PRD CA-03.11, RNF-01.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| girar para 844 × 390 | gira com escolhas abertas | sem rolagem lateral; estado mantido |
