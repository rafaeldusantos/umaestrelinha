## TC-INT-003: Pedido que ficou mais caro é recusado antes de qualquer cobrança no Mercado Pago

**Tipo:** integration
**Prioridade:** P0
**Origem:** CA-04.3, RNF-03
**Autor:** dev
**Persona:** PER-04 Helena
**Jornada:** J-04, passo 3
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `integration` — status `missing`
**Spec:** —
**Nota:** a tela se confere na sessão (TC-JOURNEY-005); a ausência de cobrança no Mercado Pago é do probe `probes/03-cobranca-no-runtime.sh` (4 `ok`), que também prova o boot do `create-payment` no runtime local

### Objetivo

Helena nunca é cobrada por um valor maior do que o que viu sem antes ser avisada.

### Pré-condições

- Conta: `cliente-loja`
- Massa: M-01 a 15 %; `mercado-pago` servida no local com chaves externas inválidas
- Estado de partida: pedido criado a 15 %; percentual baixado para 5 %

### Condições reais

As da persona.

### Passos

1. Confirmar o pagamento pela loja
   - **Esperado:** na tela, "O valor do seu pedido mudou" e "Nada foi cobrado."; na rede do navegador, a resposta 422 com o código `buy_together_price_changed`
2. Conferir (Dev, probe) o Mercado Pago
   - **Esperado:** nenhuma order criada

### Esperado e fonte

Fonte: `prd.md` CA-04.3, RNF-03; D-32; `probes/03-cobranca-no-runtime.saida.txt`.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| o motivo é a promoção | a promoção sai entre a criação e o pagamento | 422 `promotion_no_longer_valid` e "Um desconto deste pedido mudou. Nada foi cobrado." |
