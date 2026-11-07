## TC-FUNC-032: A Adesão segue contando só as peças levadas pelo bloco

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-06.1
**Autor:** dev
**Persona:** PER-02 Adri (painel)
**Jornada:** J-05, passo 3
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** depende de M-07 (pedidos pagos gravados pela thread)

### Objetivo

O relatório continua medindo o Compre Junto, não toda venda de corrente com desconto.

### Pré-condições

- Conta: `admin-painel`
- Massa: M-07 — um pedido pago com a corrente levada pelo bloco (com a marca) e outro com a corrente comprada pelo catálogo com P na sacola (com desconto, sem a marca)
- Estado de partida: `/admin/compre-junto/adesao`, 30 dias

### Condições reais

As da persona.

### Passos

1. Ler as peças levadas junto do período
   - **Esperado:** conta a corrente do primeiro pedido; não conta a do segundo

### Esperado e fonte

Fonte: `prd.md` CA-06.1 (Q-08; `AD-072`).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| pedido cancelado com a marca | incluir na massa | não conta |
