## TC-JOURNEY-005: A dona baixa o percentual com a sacola montada e a cliente confirma o novo total no checkout sem ser cobrada antes

**Tipo:** journey
**Prioridade:** P0
**Origem:** CA-04.3, CA-03.12
**Autor:** dev
**Persona:** PER-04 Helena
**Jornada:** J-04, passos 1–4
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a mudança do percentual entre os passos é feita pela automação por fixture no banco local, ou pelo painel em outro contexto

### Objetivo

Provar que, se o desconto cai depois de a cliente ver o total, ela não é cobrada pelo valor de antes, sabe disso e
consegue terminar pelo valor novo.

### Pré-condições

- Conta: `cliente-loja`
- Massa: M-01 com a corrente avulsa a 15 %
- Estado de partida: P e a corrente na sacola; checkout aberto com PIX

### Condições reais

390 × 844.

### Entrada

`/checkout`.

### Passos com tempo

| # | A persona… | Deve ver | Em até |
| - | --- | --- | --- |
| 1 | confere o resumo | "Desconto do Compre Junto" a 15 % | 5 s |
| 2 | (a corrente cai para 5 % no painel) | — | — |
| 3 | confirma o pagamento | `role="alert"` "O valor do seu pedido mudou"; "Desde que você montou a sacola, o desconto do Compre Junto do **{corrente}** mudou. Por isso o pagamento não seguiu. Nada foi cobrado."; "Antes" (riscado) e "Agora"; "Confirmar com o novo total" e "Voltar à sacola" | 10 s |
| 4 | toca em "Confirmar com o novo total" | um pedido novo pelo total "Agora" e a tela de pagamento com esse valor | 15 s |

### Objetivo e efeitos

- O pedido pago é pelo total novo; a tentativa recusada não cobrou nada (TC-INT-003).

### Caminho de abandono

J-04a: "Voltar à sacola" mostra a sacola com 5 % (TC-FUNC-023).

### Esperado e fonte

Fonte: `prd.md` CA-04.3 (e o complemento D-13); `spec.md` › Design › Checkout · o valor mudou; D-34 (o
"Confirmar com o novo total" cria outro pedido).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| duplo clique | dois toques em "Confirmar com o novo total" | um pedido só |
| percentual apagado | a dona apaga em vez de baixar | o mesmo aviso, "Agora" a preço cheio |
