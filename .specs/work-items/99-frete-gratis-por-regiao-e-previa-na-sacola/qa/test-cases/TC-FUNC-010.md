## TC-FUNC-010: Quando a consulta do frete falha ou não traz opção, a sacola avisa e deixa seguir, sem inventar frete

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-11 (PRD 97 UC-06)
**Autor:** dev
**Persona:** PER-01 Luana
**Jornada:** J-01, ramo J-01b
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a falha se provoca abortando a rota da cotação; determinístico

### Objetivo

Com a rede ruim, Luana precisa entender que a falha é passageira, poder tentar de novo, e seguir comprando — sem a
sacola mostrar um número de frete que não é o dela.

### Pré-condições

- Conta: anonima
- Massa: uma peça
- Estado de partida: gaveta aberta, sem CEP; a rota `**/functions/v1/melhor-envio*` abortada

### Condições reais

Rede instável.

### Passos

1. Calcula com 01310-100
   - **Esperado:** "Não consegui consultar o frete agora. Tente de novo — ou siga para o checkout, onde ele é calculado
     outra vez." com "Tentar de novo"; o Total sem frete; nenhuma opção "Frete padrão"
2. Toca "Finalizar Pedido"
   - **Esperado:** o checkout abre normalmente
3. Volta, libera a rota (fixture A) e toca "Tentar de novo"
   - **Esperado:** as opções aparecem e a mais barata é marcada
4. Responde a cotação com `[]` e calcula com outro CEP (90010-000)
   - **Esperado:** "Nenhuma opção de frete disponível para este CEP. No checkout, você pode tentar outro endereço."

### Esperado e fonte

Mensagem de falha com "Tentar de novo", Total sem frete, "Finalizar Pedido" funcionando, nenhum "Frete padrão" na
gaveta; e a mensagem do CEP sem opção — fonte: PRD 97 CA-11, UC-06.

### Variações

| Variação                         | Ação                                             | Esperado                                         |
| -------------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| Offline no meio                  | `set offline on` durante o cálculo, depois `off` | a mesma mensagem de falha; "Tentar de novo" funciona |
| Falha com escolha anterior       | com o frete escolhido, aborta a rota e muda a quantidade | a escolha vinda de antes não é apagada (D-21) |
| Duplo toque em "Tentar de novo"  | dois toques seguidos                              | uma consulta; nada duplicado                     |
