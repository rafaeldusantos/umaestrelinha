## TC-CFR-004: Com "reduzir movimento" ligado, o bloco abre e fecha as escolhas sem animação decorativa

**Tipo:** cfr
**Prioridade:** P1
**Origem:** RNF-05
**Autor:** dev
**Persona:** PER-03 Helena
**Jornada:** J-01, passo 3
**Charter:** CH-07
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** `reducedMotion: reduce` no browser da sessão

### Objetivo

Quem pede menos movimento não é incomodado pelo bloco, e nada some sem retorno visual.

### Pré-condições

- Conta: anonima
- Massa: M-01
- Estado de partida: `reducedMotion: reduce`

### Condições reais

As da persona; forma "Na linha" e "Em folha".

### Categoria

Acessibilidade (movimento).

### Metas

| Observável | Alvo | Aceitável |
| ---------- | ---- | --------- |
| transição ao abrir/fechar escolhas e folha | sem movimento decorativo | troca instantânea |
| estados | os mesmos estados com e sem redução | idem |

### Passos

1. Marcar e desmarcar adicionais e abrir a folha com e sem redução
   - **Esperado:** com redução, sem animação; os mesmos estados finais nos dois casos

### Esperado e fonte

Fonte: PRD RNF-05.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| — | — | — |
