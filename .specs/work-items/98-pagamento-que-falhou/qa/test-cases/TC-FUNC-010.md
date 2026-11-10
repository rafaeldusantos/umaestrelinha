## TC-FUNC-010: "Avançar mesmo assim" e "Outro status" levam um pedido não pago à tela de registrar

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-03.9
**Autor:** dev
**Persona:** PER-02 Adri no computador
**Jornada:** J-03, passos 2–3, ramo J-03a
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** quatro destinos do "Outro status" mais o próximo passo

### Objetivo

Nenhum atalho de status transforma um pedido não pago em venda sem o pagamento registrado.

### Pré-condições

- Conta: `admin`
- Massa: M6 (Pendente, não pago)
- Estado de partida: `/admin/pedidos/<M6>`

### Condições reais

As da persona.

### Passos

1. Usa "Avançar mesmo assim" no próximo passo
   - **Esperado:** abre `/admin/pedidos/<M6>/pagamento`; o status continua Pendente
2. Usa o voltar do navegador
   - **Esperado:** de volta ao pedido, ainda Pendente, nada gravado
3. Em "Outro status", escolhe Pago; depois Separando; depois Enviado; depois Entregue (voltando entre cada)
   - **Esperado:** cada um abre a tela de registrar; nenhum muda o status sozinho
4. Registra a partir de um desses caminhos
   - **Esperado:** pedido em Pago, com registro

### Esperado e fonte

Os caminhos até Pago (e além) abrem o registro — fonte: PRD CA-03.9; costura Decisões 7 e 15.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Destino além de Pago | registrar vindo de "Outro status → Enviado" | registra; o que acontece com o destino pedido não está na fonte — registrar o que a tela faz |
| Cancelado | "Outro status" num pedido cancelado | sem caminho para Pago |
