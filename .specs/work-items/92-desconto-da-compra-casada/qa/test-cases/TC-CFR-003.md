## TC-CFR-003: Toda falha do caminho de dinheiro diz que nada foi cobrado e dá um próximo passo

**Tipo:** cfr
**Prioridade:** P1
**Origem:** CA-04.3
**Autor:** dev
**Persona:** PER-05 Sônia
**Jornada:** J-01, passo 6; J-03, passo 5
**Charter:** CH-08
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** a leitura da configuração falhando no pagamento dá 500 "Não foi possível calcular o pedido. Tente de novo." antes do Mercado Pago (D-33); provoca-se cortando a rede no confirmar

### Objetivo

Quando algo falha no pagamento, a cliente sabe que não foi cobrada e o que fazer.

### Pré-condições

- Conta: `anonima`
- Massa: M-01
- Estado de partida: checkout com P e a corrente

### Condições reais

As da persona (390, fonte 200 %).

### Categoria

Recuperação de erro.

### Metas (observável · alvo · aceitável)

| Observável | Alvo | Aceitável |
| --- | --- | --- |
| aviso de valor mudado | diz "Nada foi cobrado." e dá dois caminhos | — |
| falha ao calcular | linguagem simples e "Tente de novo"; nada do que ela preencheu se perde | — |
| rede caindo no confirmar | aviso de falha, sem pedido duplicado ao repetir | — |

### Passos

1. Provocar o 422 do valor mudado (TC-JOURNEY-005)
   - **Esperado:** a explicação, "Nada foi cobrado." e os dois botões
2. Cortar a rede no confirmar e voltar
   - **Esperado:** a falha dita em linguagem simples, o checkout preenchido, e repetir não cria dois pedidos

### Esperado e fonte

Fonte: `prd.md` CA-04.3; `spec.md` D-13, D-33; `cfr.md` › Recuperação de erro.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| pelo link do pedido | o aviso de TC-JOURNEY-006 | "Nada foi cobrado." e o contato |
