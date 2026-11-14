## TC-FUNC-001: A sacola com peças oferece o CEP para calcular o frete e recusa CEP incompleto sem consultar

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-01, CA-02 (PRD 97, com M-04 do PRD 99)
**Autor:** dev
**Persona:** PER-01 Luana
**Jornada:** J-01, passos 1 e 3 (ramo J-01a)
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** fluxo público e determinístico com a cotação interceptada; pedido de automação E2E

### Objetivo

Luana precisa achar onde calcular o frete na sacola sem procurar, e não pode receber uma resposta de frete para um
CEP que ela digitou pela metade.

### Pré-condições

- Conta: anonima
- Massa: uma peça ativa no catálogo; cotação interceptada com a fixture A
- Estado de partida: sacola vazia, gaveta fechada

### Condições reais

As da persona.

### Passos

1. Abre a gaveta com a sacola vazia
   - **Esperado:** a gaveta vazia; nenhum campo de CEP
2. Põe uma peça na sacola e abre a gaveta
   - **Esperado:** no rodapé, acima do cupom, uma linha com o campo "CEP para calcular o frete" (com o ícone de envio
     dentro, teclado numérico) e o botão "Calcular" ao lado, sem título acima
3. Digita 0131010 (7 dígitos) e toca "Calcular"
   - Entrada: `0131010`
   - **Esperado:** "CEP inválido" junto do campo, o campo marcado como erro; na rede, nenhuma chamada a
     `melhor-envio`
4. Digita mais um dígito
   - **Esperado:** o erro some ao digitar

### Esperado e fonte

Campo de CEP com "Calcular" só com peças; CEP com menos de 8 dígitos dá "CEP inválido" sem chamar a cotação — fonte:
PRD 97 CA-01, CA-02, UC-01; PRD 99 M-04; `spec.md` › Design › "O bloco do frete no rodapé".

### Variações

| Variação                     | Ação                                    | Esperado                                         |
| ---------------------------- | --------------------------------------- | ------------------------------------------------ |
| Enter no campo               | digita 8 dígitos e tecla Enter          | calcula, como o botão                            |
| CEP colado com espaço        | cola "01310 100"                        | a máscara vira 01310-100 e calcula               |
| Remove a última peça         | com o campo visível, esvazia a sacola   | o campo some; a gaveta vazia de hoje             |
