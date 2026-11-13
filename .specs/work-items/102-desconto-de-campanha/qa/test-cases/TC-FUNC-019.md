## TC-FUNC-019: No pedido montado pela dona, a peça em oferta entra com o preço da campanha e o cupom não vale nela

**Tipo:** functional
**Prioridade:** P1
**Origem:** R-05 — PRD RN-04
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-05, passos 1–4 (e J-05a)
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** cruza a function `order-proposals` e dois apps; pedido de automação E2E

### Objetivo

O pedido que a dona monta para uma cliente cobra o mesmo que a loja cobraria, e ela não aplica, por engano, cupom
em peça de campanha.

### Pré-condições

- Conta: `admin-loja`
- Massa: Black Friday em vigência; M-A (20 %), M-B (15 %), M-E comum; cupom `QA10`
- Estado de partida: `/admin/pedidos/montar`

### Condições reais

painel em 1440 × 900; app do ateliê em 390 × 844, toque

### Passos

1. Escolhe uma cliente e acrescenta M-A e M-E
   - **Esperado:** M-A com o preço da campanha (o mesmo da página da loja) e M-E com o preço de sempre
2. Aplica `QA10`
   - **Esperado:** o desconto só sobre M-E (10 % do preço dele)
3. Tira M-E e tenta `QA10` de novo
   - **Esperado:** recusado com "Este cupom não vale para peças da Black Friday."
4. Dá um desconto combinado (em R$ ou %) e salva a proposta
   - **Esperado:** aceito por cima do preço da campanha; a proposta salva com o total
5. Abre o link de checkout da proposta na loja
   - **Esperado:** o mesmo total do painel, travado
6. No app do ateliê (`http://localhost:8084/pedidos/montar`), monta outra com M-B escolhendo a variação mais cara
   - **Esperado:** o preço da variação com 15 % sobre o próprio preço

### Esperado e fonte

Durante a vigência, a peça marcada entra com o preço da campanha, o cupom não vale nela e o preço fica travado —
fonte: PRD RN-04, RN-16, CA-16; `spec.md` I-02, I-04, I-11.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| recarregar o link | recarrega o checkout da proposta | o mesmo total |
| duplo clique em salvar | dois cliques | uma proposta só |
| voltar no app | gesto de voltar no passo Peças e retorna | M-B continua com o preço da campanha |
| leitura falhou | (se acontecer) a campanha não carregar | a montagem recusa salvar com motivo; nunca vira "sem campanha" (I-08) |
