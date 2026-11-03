## TC-CFR-003: Enquanto os adicionais carregam, o espaço do bloco fica reservado e a página não salta

**Tipo:** cfr
**Prioridade:** P1
**Origem:** RNF-02
**Autor:** dev
**Persona:** PER-03 Helena
**Jornada:** J-01, passo 1
**Charter:** CH-07
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** performance percebida; rede lenta simulada

### Objetivo

A página não pula embaixo do dedo (ou do foco) quando o bloco chega.

### Pré-condições

- Conta: anonima
- Massa: M-01
- Estado de partida: rede lenta (Slow 4G ou equivalente)

### Condições reais

390 × 844, rede lenta.

### Categoria

Performance percebida.

### Metas

| Observável | Alvo | Aceitável |
| ---------- | ---- | --------- |
| primeira pintura útil da página | < 2 s | < 4 s |
| deslocamento do botão de compra quando o bloco chega | nenhum | nenhum |
| esqueleto do bloco | visível enquanto carrega (`aria-busy`), altura mínima reservada | idem |

### Passos

1. Abrir M-01 com rede lenta e observar a coluna de informação
   - **Esperado:** esqueleto no lugar do bloco; o botão e a linha de estoque não mudam de posição quando o bloco chega
2. Abrir M-04 (sem Compre Junto) com rede lenta
   - **Esperado:** nenhum esqueleto aparece

### Esperado e fonte

Fonte: PRD RNF-02; protótipo (carregando: `aria-busy`, altura mínima reservada).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| — | — | — |
