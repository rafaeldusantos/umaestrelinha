## TC-FUNC-018: O bloco "Joias em oferta" da Home leva à vitrine já filtrada pelo percentual

**Tipo:** functional
**Prioridade:** P1
**Origem:** R-04 — PRD UC-07
**Autor:** dev
**Persona:** PER-02 Marina
**Jornada:** J-03, passos 1–2
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** pedido de automação E2E

### Objetivo

A cliente que entra pela Home descobre a campanha e chega às peças do percentual que lhe interessa num toque.

### Pré-condições

- Conta: `anonima`
- Massa: Black Friday em vigência com 10/15/20 %; o bloco "Joias em oferta" ligado na Home (CH-01)
- Estado de partida: `http://localhost:8082/`

### Condições reais

as da persona

### Passos

1. Rola até o bloco
   - **Esperado:** rótulo com o nome da campanha, título "Joias em oferta", "Peças selecionadas com 10%, 15% e 20% de desconto. O valor de cada joia já aparece com o desconto."; um cartão por percentual (número grande, "de desconto", "Ver as peças →"), em uma coluna no celular
2. Toca no cartão "15%"
   - **Esperado:** `/ofertas?percentual=15` com o chip 15 % pressionado
3. Volta à Home e olha a fileira "Algumas das peças em oferta"
   - **Esperado:** cartões com a faixa da campanha, rolando de lado; "Ver todas" leva a `/ofertas`

### Esperado e fonte

Um cartão por percentual levando à vitrine filtrada; título e percentuais vindos da campanha — fonte: PRD UC-07;
`spec.md` › Home · "Joias em oferta", H-10.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| "Ver todas" no celular | procura o "Ver todas" em 390 × 844 | presente e alcançável (🟡 do plano: se faltar, é achado) |
| computador | 1440 × 900 | três cartões lado a lado |
| leitor de tela | lê o nome dos cartões | "Ver as peças com 15% de desconto" |
