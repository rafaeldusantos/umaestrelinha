## TC-JOURNEY-001: Adri registra pelo celular um pagamento feito por fora, com foto do comprovante, e vê o pedido pago

**Tipo:** journey
**Prioridade:** P0
**Origem:** CA-03.1, CA-03.2, CA-03.3, CA-03.6, CA-03.8, RNF-01, RNF-04
**Autor:** dev
**Persona:** PER-01 Adri no celular
**Jornada:** J-01, passos 1–7
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** caminho principal de UC-03, determinístico contra o banco local; pedido de automação E2E (o anexo pode ser um JPG fixo)

### Objetivo

A dona registra, do celular, o PIX que a cliente pagou direto, com a prova, e o pedido passa a valer como pago — é o que destrava a peça para produção.

### Pré-condições

- Conta: `admin`
- Massa: pedido M6 (Pendente, pagamento pendente, não cancelado, sem material); um JPG e um PDF de comprovante (M16); "Pagamento confirmado" ligado em Notificações (M17)
- Estado de partida: `/admin/pedidos/:id` do pedido, logada

### Condições reais

As da persona (celular 390 × 844, toque).

### Entrada

`http://localhost:8083/admin/pedidos/:id`, por navegação interna a partir da lista.

### Passos com tempo

1. Procura a ação de registrar no pedido — **Esperado:** "Registrar pagamento" visível sem rolagem lateral (10 s)
2. Toca em "Registrar pagamento" — **Esperado:** abre `/admin/pedidos/:id/pagamento`, tela própria (não modal), com meio, data e hora preenchidas com agora, observação e comprovantes (5 s)
3. Escolhe "PIX direto", anexa o JPG e o PDF, escreve a observação — **Esperado:** os dois arquivos listados, removíveis (40 s)
4. Confirma — **Esperado:** o portão de aviso pergunta se a cliente recebe o e-mail (5 s)
5. Mantém o e-mail marcado e confirma — **Esperado:** volta ao pedido; status "Pago"; pagamento aprovado; bloco Pagamento com "PIX direto", a data e hora informadas (Brasília), "registrado por" com o nome dela, a observação e os dois comprovantes; histórico com "Pagamento registrado manualmente", o nome dela e a hora (10 s)

### Objetivo e efeitos

- Pedido em "Pago", pagamento aprovado com a data informada (o mesmo estado de um pagamento aprovado pela loja — RNF-01)
- Mailpit (:54444): um e-mail de pagamento confirmado para a cliente; nenhum aviso interno "pedido pago" para a dona

### Caminho de abandono

Rede cai no passo 5: ver TC-FUNC-005 e TC-CFR-001 — um registro só, retorno claro.

### Esperado e fonte

Pedido pago com registro, histórico e e-mail escolhido — fonte: PRD CA-03.1, CA-03.2, CA-03.3, CA-03.6, CA-03.8; costura Decisão 15 (tela própria).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Pedido que espera material | registrar num pedido M6 que espera material | o e-mail é o de instruções de envio do material, não o de pagamento confirmado |
| Sem anexo | registrar sem comprovante | grava do mesmo jeito; bloco sem comprovantes |
