## TC-CFR-002: Na loja, o rótulo colorido mantém o contraste e nada rola na horizontal a 390, 768 e 1440

**Tipo:** cfr
**Prioridade:** P1
**Origem:** C-07 · exploratório — compatibilidade e contraste do rótulo colorido
**Autor:** dev
**Persona:** PER-01 Adri, a dona
**Jornada:** J-01, passo 8; J-02, passos 1–2
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** contraste pelas cores computadas e layout em três viewports — auditoria manual

### Objetivo

O que a régua do editor aceitou é, de fato, legível na loja e cabe na tela em qualquer largura.

### Pré-condições

- Conta: `admin` (a loja é pública; a dona confere a vitrine dela)
- Massa: itens A e B como CH-01 deixou
- Estado de partida: `/` na loja

### Condições reais

| Dimensão    | Valor                                            |
| ----------- | ------------------------------------------------ |
| Dispositivo | 390 × 844 · 768 × 1024 · 1440 × 900             |

### Categoria

Acessibilidade (contraste) · Compatibilidade · Performance percebida

### Metas (observável · alvo · aceitável)

| Observável | Alvo | Aceitável |
| ---------- | ---- | --------- |
| contraste computado do rótulo de A e B contra o fundo da superfície | ≥ 4,5:1 | — |
| `scrollWidth` da página = largura da janela | igual nos três | — |
| ícone e rótulo sem corte nem sobreposição | sim | — |
| primeira pintura útil da loja | < 2 s | < 4 s |

### Passos

1. A 390, abre a folha e mede o rótulo de A e de B contra o branco
   - **Esperado:** ≥ 4,5:1; sem rolagem horizontal
2. A 768 e a 1440, mede o rótulo de A contra a barra
   - **Esperado:** ≥ 4,5:1; sem rolagem horizontal; ícone alinhado
3. Movimento reduzido ligado
   - **Esperado:** nada essencial depende de animação

### Esperado e fonte

Rótulo acima de 4,5:1 no fundo da superfície — fonte: `plan.md` C-07; `PROJECT.md` › viewport alvo.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| viewport mínima | 320 × 568 | sem rolagem horizontal |
| zoom 200% | 1440 a 200% | barra rola como antes, sem vazar |
