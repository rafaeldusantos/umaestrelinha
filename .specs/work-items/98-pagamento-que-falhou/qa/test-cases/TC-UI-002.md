## TC-UI-002: Telas novas da cliente cabem em 390 px, inclusive com a fonte a 130 % e 200 %

**Tipo:** ui
**Prioridade:** P2
**Origem:** exploratório — mudança toca layout da loja (cartões novos do pedido e `/pagar-com-cartao`); `CLAUDE.md` pede 390 e fonte 130/200 % em toda tela nova
**Autor:** dev
**Persona:** PER-03 Cliente que voltou ao pedido
**Jornada:** J-05, ramo J-05b
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** medição de layout no browser

### Objetivo

A cliente lê e toca o que importa no celular dela, com a fonte que ela usa.

### Pré-condições

- Conta: `cliente` (e sem sessão para `/pagar-com-cartao`)
- Massa: M3, M4, M13, M7 e um link vivo M14
- Estado de partida: `/conta`

### Condições reais

| Dimensão    | Valor                                            |
| ----------- | ------------------------------------------------ |
| Dispositivo | celular 390 × 844                                |
| Rede        | lenta                                            |
| Locale      | pt-BR                                            |
| Modalidade  | toque; fonte raiz a 100 %, 130 % e 200 %         |

### Protótipo e tela

Sem protótipo. Régua: o cartão do topo do pedido (`OrderActionPanel`) e o bloco "Pagamento e entrega" como já são; `/pagar-com-cartao` no molde de `/pedido-montado`.

### Propriedades a comparar

- `scrollWidth` igual à viewport em `/pedido/:id` (cartão recusado, pendente, cancelado por falta de pagamento, pago por fora), `/conta` e `/pagar-com-cartao` (pendente e as situações)
- "Conversar no WhatsApp" com alvo ≥ 44 px e o texto sem cortar
- Título do cartão embrulhando sem sobrepor

### Passos

1. Percorre as telas a 100 %
   - **Esperado:** sem rolagem lateral; alvos ≥ 44 px
2. Repete a 130 % e 200 %
   - **Esperado:** sem rolagem lateral; nada sobreposto nem cortado

### Esperado e fonte

Mobile primeiro, prova a 100–200 % — fonte: costura › Obrigações transversais; `CLAUDE.md`.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| 320 × 568 | viewport mínima | sem rolagem lateral |
