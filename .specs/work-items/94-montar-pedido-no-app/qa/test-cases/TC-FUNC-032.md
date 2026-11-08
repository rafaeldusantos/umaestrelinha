## TC-FUNC-032: No painel, o pedido montado reaberto mostra o link para copiar e só oferece renovar depois de vencer

**Tipo:** functional
**Prioridade:** P1
**Origem:** UC-10 (D-14, D-17, D-28)
**Autor:** dev
**Persona:** PER-04 Adri no computador
**Jornada:** J-05, passos 1–4
**Charter:** CH-07
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** exige `PROPOSAL_TOKEN_KEY` local

### Objetivo

No computador, a Adri reenvia o mesmo link e não mata, sem querer, o link em uso.

### Pré-condições

- Conta: `admin-atelie`
- Massa: pedido montado aberto (criado pelo app, link anotado); um expirado; um cancelado
- Estado de partida: painel › Pedidos montados

### Condições reais

As da persona.

### Passos

1. Abre o aberto
   - **Esperado:** "Link para a cliente" com "Vale até {validade}", o campo só leitura com o link (focar seleciona), "Copiar link", "Enviar pelo WhatsApp" ou "Sem telefone — copie o link", a prévia da mensagem; nenhum "Renovar" nem "Gerar link novo"
2. Copia
   - **Esperado:** o mesmo link do app
3. Abre o expirado
   - **Esperado:** "Venceu em {validade}"; o link morto; só "Renovar prazo"
4. Renova
   - **Esperado:** o diálogo com a frase de D-17; "Gerando…"; o link novo
5. Abre o cancelado
   - **Esperado:** "Link encerrado", sem ação

### Esperado e fonte

Fonte: PRD › Pedido montado ("no app e no painel"; Renovar só depois de expirar); spec UC-10, Design › Pedido montado (painel), D-17.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| origem do pedido | abre um pedido nascido de proposta | a origem "Pedido montado" (D-25) |
