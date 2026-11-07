## TC-FUNC-030: No painel do pedido, a dona vê o desconto do Compre Junto com as mesmas linhas e valores da loja, na ordem do painel

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-05.3
**Autor:** dev
**Persona:** PER-02 Adri (painel)
**Jornada:** J-05, passo 1
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** decisão Q-01 (2026-11-04): a ordem das linhas do painel é a régua e o painel passa como está; a loja e o app que divergirem na ordem são bug nos casos deles (TC-FUNC-026, TC-FUNC-031, TC-INT-004). O preço do item no painel (o da unidade, D-36) é a Design do painel, não régua para as outras pontas

### Objetivo

A dona vê no painel o mesmo desconto e a mesma conta que a cliente viu.

### Pré-condições

- Conta: `admin-painel`
- Massa: o pedido de TC-FUNC-013 (linha mista) e o de TC-JOURNEY-004 (cupom)
- Estado de partida: `/admin/pedidos`

### Condições reais

As da persona (1440; repetir em 390).

### Passos

1. Abrir o pedido com linha mista
   - **Esperado:** a corrente em duas linhas, a com desconto com "de/por" (no painel, o preço da unidade — D-36); no cartão de valores, na ordem Subtotal · Desconto do Compre Junto − R$ 11,98 · Desconto PIX · Frete · Total
2. Comparar com `/pedido/:id` da loja
   - **Esperado:** as mesmas linhas de desconto com os mesmos valores, o mesmo Subtotal, Frete e Total; se a loja estiver em outra ordem, o achado é da loja (TC-FUNC-026), não do painel; a loja mostrar o total da linha não é achado
3. Abrir o pedido com cupom
   - **Esperado:** a linha do cupom entre o Compre Junto e o PIX, com o mesmo valor da loja

### Esperado e fonte

Fonte: `prd.md` CA-05.3; D-36 (a Design do painel) e a decisão Q-01 do Gate 1 (a ordem: descontos e PIX antes do
Frete); D-38 (o preço por item de cada ponta não muda).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| pedido sem desconto casado | um pedido só com bump | sem linha do Compre Junto; "Desconto da oferta" antes do Frete |
