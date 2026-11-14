## TC-FUNC-008: Com endereço salvo, o checkout respeita o CEP calculado na sacola

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-09 (PRD 97 pergunta 1, decidida em `spec.md` D-11 item 1)
**Autor:** dev
**Persona:** PER-04 Teresa
**Jornada:** J-05, passo 5 (ramo J-05a)
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** precisa da conta com endereço salvo; determinístico com a fixture

### Objetivo

Teresa acabou de digitar um CEP na sacola: o checkout não pode trocá-lo pelo endereço salvo sem ela pedir — e, quando
os dois são o mesmo, não pode obrigá-la a digitar o número de novo.

### Pré-condições

- Conta: cliente-com-endereco (endereço salvo em Porto Alegre/RS, 90010-000, com número)
- Massa: uma peça; fixture A
- Estado de partida: logada, sacola com a peça, rascunho do checkout vazio

### Condições reais

Fonte da raiz a 200 %.

### Passos

1. Na gaveta, calcula com 01310-100 (diferente do salvo) e segue ao checkout
   - **Esperado:** a Entrega com 01310-100, o endereço da busca, "Trazido da sua sacola · … — São Paulo/SP", a opção
     da gaveta marcada, o foco no Número; o endereço salvo de Porto Alegre **não** entra
2. Volta à sacola, toca "Trocar CEP", calcula com 90010-000 (igual ao salvo) e segue ao checkout
   - **Esperado:** o endereço salvo inteiro entra (rua, número, complemento) e o bloco abre recolhido como hoje, com a
     opção da gaveta

### Esperado e fonte

Vale o CEP da gaveta; se igual ao do endereço salvo, entra o endereço salvo inteiro e o bloco abre recolhido — fonte:
`spec.md` D-11 (1), sobre a pergunta 1 do PRD 97; PRD 97 CA-09.

### Variações

| Variação                     | Ação                                            | Esperado                                         |
| ---------------------------- | ----------------------------------------------- | ------------------------------------------------ |
| CEP digitado com hífen × sem | 90010000 na gaveta                              | conta como o mesmo CEP do salvo                  |
| Recarregar o checkout        | recarrega com o CEP da gaveta (mesma aba)        | o CEP e a escolha continuam; o salvo não entra   |
