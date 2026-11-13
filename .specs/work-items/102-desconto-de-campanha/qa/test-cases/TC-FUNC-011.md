## TC-FUNC-011: A vitrine /ofertas reúne as peças da campanha com os filtros por percentual

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-09, R-03 — PRD UC-06
**Autor:** dev
**Persona:** PER-02 Marina
**Jornada:** J-03, passo 3 (e J-03a)
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** P0 da vitrine; pedido de automação E2E

### Objetivo

A cliente acha num lugar só todas as peças em oferta e pode olhar só as de um percentual.

### Pré-condições

- Conta: `anonima`
- Massa: Black Friday em vigência; M-A (20 %), M-B (15 %), M-C (10 %), M-D (20 %) marcadas e ativas; M-G marcada só no Natal (agendada)
- Estado de partida: `http://localhost:8082/ofertas`

### Condições reais

as da persona

### Passos

1. Abre `/ofertas`
   - **Esperado:** trilha "Início › Black Friday", título "Black Friday", a linha "Peças com 10%, 15% e 20% de desconto até 30 de novembro."
2. Olha os chips
   - **Esperado:** "Todas · 4" (M-A..M-D), "10% · 1", "15% · 1", "20% · 2"; no celular os chips rolam de lado, com alvo ≥ 44 px
3. Toca em "20%"
   - **Esperado:** o chip pressionado, a URL com `?percentual=20`, só M-A e M-D
4. Volta a "Todas" e confere a grade
   - **Esperado:** exatamente as peças marcadas na Black Friday; nenhuma de M-G (Natal) nem peça comum
5. Abre `/black-friday`
   - **Esperado:** chega a `/ofertas`

### Esperado e fonte

A vitrine lista exatamente as peças marcadas e ativas da campanha em vigência, com chips e contagem — fonte: PRD
CA-09, UC-06, RN-08; `spec.md` › Vitrine `/ofertas`, H-03, H-10 (`?percentual=<p>`).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| deep link | abre `/ofertas?percentual=15` direto | o chip 15 % pressionado, só M-B |
| percentual inexistente | abre `/ofertas?percentual=50` | cai em "Todas" ou numa grade vazia com saída clara — nunca erro |
| computador | 1440 × 900 | chips e ordenação na mesma linha; grade de 4 colunas |
| voltar | abre M-A a partir do filtro 20 % e volta | o filtro 20 % mantido |
| título da aba | olha o título da página | contém "Black Friday" |
