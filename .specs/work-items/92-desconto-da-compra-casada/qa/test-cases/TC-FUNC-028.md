## TC-FUNC-028: Pedido feito antes deste WI continua aparecendo como antes na loja, no painel e no app

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-05.2, CA-05.4
**Autor:** dev
**Persona:** PER-02 Adri (painel)
**Jornada:** J-05, passo 2
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** depende de um pedido antigo do banco local (M-06); os rótulos de `core` ("Desconto PIX") e a saída da linha "Promoção" do app são mudanças declaradas, não achados

### Objetivo

A dona e a cliente não veem um pedido antigo mudar de valor nem ganhar linhas que ele não teve.

### Pré-condições

- Conta: `admin-painel`
- Massa: M-06 (pedido sem preço cheio nas linhas)
- Estado de partida: `/admin/pedidos`

### Condições reais

As da persona.

### Passos

1. Abrir o pedido antigo no painel
   - **Esperado:** o mesmo Total e os mesmos itens de antes; nenhuma linha "Desconto do Compre Junto"; "Qtd: N" nas linhas
2. Abrir o mesmo pedido no app do ateliê
   - **Esperado:** o mesmo Total; sem linha nova
3. Se o pedido tiver cliente com conta, abri-lo na loja
   - **Esperado:** o formato de antes

### Esperado e fonte

Fonte: `prd.md` CA-05.2 ("Pedido feito antes deste WI continua como está"); D-35 (formato novo só quando todas as
linhas têm o preço cheio); `qa-report.md` › Observações (rótulos de `core`).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| pedido montado pelo painel | uma proposta paga | o formato antigo (D-35) |
