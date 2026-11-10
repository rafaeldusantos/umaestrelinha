## TC-JOURNEY-002: Cliente abre o link de cartão no celular, sem login, e chega ao pagamento do mesmo pedido pelo valor da compra

**Tipo:** journey
**Prioridade:** P0
**Origem:** CA-05.2, CA-05.3
**Autor:** dev
**Persona:** PER-04 Cliente que recebeu o link pelo WhatsApp
**Jornada:** J-04, passos 1–4
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a abertura e o resumo são determinísticos; o pagamento pelo Brick depende do Mercado Pago (no local, os passos 3–4 ficam `blocked` — TC-INT-005)

### Objetivo

A cliente cujo cartão falhou paga o mesmo pedido com outro cartão sem criar conta nem refazer a compra — o caminho que a Adri passa a oferecer pelo WhatsApp.

### Pré-condições

- Conta: `anonima`
- Massa: M14, link vivo de um pedido de cartão recusado (o código entregue pela thread); o valor da primeira cobrança do pedido anotado
- Estado de partida: navegador sem sessão da loja

### Condições reais

As da persona (celular 390 × 844, rede lenta).

### Entrada

`http://localhost:8082/pagar-com-cartao#<código>`, como deep link de mensagem.

### Passos com tempo

1. Abre o link — **Esperado:** a tela de pagamento por cartão, sem pedido de login nem cadastro; depois de carregar, o `#<código>` sai da barra de endereço (5 s)
2. Confere o pedido — **Esperado:** o número do pedido e o valor igual ao da compra (o da primeira cobrança); nenhum dado pessoal além do necessário para reconhecer (10 s)
3. Preenche o cartão no formulário do meio de pagamento — **Esperado:** o Brick do cartão (no local: `blocked`) (30 s)
4. Paga — **Esperado:** espera e aprovado (no local: `blocked`) (15 s)

### Objetivo e efeitos

- A tela do pedido certo, com o valor certo, pronta para o cartão
- Aprovado: ver TC-INT-005

### Caminho de abandono

Link substituído (TC-FUNC-016), pedido pago ou cancelado (TC-FUNC-017), link adulterado (TC-SEC-002).

### Esperado e fonte

Tela do mesmo pedido, sem login, valor travado — fonte: PRD CA-05.2, CA-05.3; costura Decisão 5.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Com sessão de outra cliente | abrir o link logada como `cliente` (outra conta) | mostra o pedido do link, sem misturar com a conta aberta |
| Recarregar | recarregar depois de o código sair da barra | volta à mesma tela, ou diz o que fazer — nunca um erro técnico |
