## TC-FUNC-017: Quando a campanha acaba com o checkout aberto, a loja mostra o total novo e não cobra o valor antigo

**Tipo:** functional
**Prioridade:** P1
**Origem:** R-02 — PRD UC-05
**Autor:** dev
**Persona:** PER-01 Adri (no painel) — a aba da loja faz o papel da PER-03 Helena
**Jornada:** J-06, passos 4–5 (e J-04c, J-06b)
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** precisa de duas abas (painel e loja); determinístico com "Encerrar agora"; pedido de automação E2E

### Objetivo

A cliente que estava no checkout quando a campanha acabou nunca paga um valor que não viu: a loja mostra o total
novo e pede que ela confirme de novo.

### Pré-condições

- Conta: `admin-loja` (aba A, painel); aba B, a loja sem login
- Massa: Black Friday em vigência (religada no TC-FUNC-009); M-A em 20 %
- Estado de partida: aba B com M-A na sacola e o checkout preenchido como convidada, sem finalizar

### Condições reais

aba B em 390 × 844

### Passos

1. Na aba A, abre a Black Friday e toca em "Encerrar agora", confirmando
   - **Esperado:** "Encerrada" na lista
2. Volta à aba B (o foco volta para a página)
   - **Esperado:** o checkout relê: M-A com o preço de sempre, sem o riscado de campanha, e o total novo
3. Toca em finalizar
   - **Esperado:** pede confirmação do total novo; ou, se a tela ainda mostrava o total antigo, recusa com "Um desconto deste pedido mudou. Nada foi cobrado." e mostra o total novo — em nenhum caso grava o pedido pelo valor com desconto
4. Confirma o total novo e finaliza
   - **Esperado:** o pedido criado sem campanha, com o preço de sempre

### Esperado e fonte

Se a campanha acabar enquanto a cliente está na sacola ou no checkout, a loja mostra o total novo e pede que ela
confirme de novo; nunca é cobrado um valor maior que o mostrado — fonte: PRD UC-05; `spec.md` T4, H-05, I-05.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| recarregar | recarrega o checkout em vez de finalizar | o preço de sempre, sem selo; a sacola mantida |
| sacola | abre a sacola em vez do checkout | o preço de sempre |
| começou no meio | (com a "Dia das Mães" criada) M-A já na sacola antes de ela começar | a sacola passa a mostrar o preço com desconto na próxima vez que for aberta |
